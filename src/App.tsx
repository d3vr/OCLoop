import {
  createSignal,
  createEffect,
  createMemo,
  onMount,
  onCleanup,
} from "solid-js"
import {
  useRenderer,
  useTerminalDimensions,
  onResize,
} from "@opentui/solid"
import type { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"

import { useServer } from "./hooks/useServer"
import { useSSE } from "./hooks/useSSE"
import { useLoopState } from "./hooks/useLoopState"
import { useLoopStats } from "./hooks/useLoopStats"
import { usePTY } from "./hooks/usePTY"
import { parsePlanFile, parseCompletionFile, parseRemainingTasksFile, getCurrentTask } from "./lib/plan-parser"
import { KEYS, DEFAULTS } from "./lib/constants"
import { shutdownManager } from "./lib/shutdown"
import {
  loadLoopState,
  saveLoopState,
  deleteLoopState,
  ensureGitignore,
  createLoopState,
  type LoopStateFile,
} from "./lib/loop-state"
import { ThemeProvider } from "./context/ThemeContext"
import { DialogProvider, DialogStack, useDialog } from "./context/DialogContext"
import {
  StatusBar,
  TerminalPanel,
  QuitConfirmation,
  ErrorDisplay,
  DialogResume,
} from "./components"
import type { CLIArgs, PlanProgress, LoopState } from "./types"

// UI layout constants
// Status bar takes 3 lines: status line + keybindings + current task (optional)
const STATUS_BAR_HEIGHT = 3
// Terminal panel has 2 lines for borders
const TERMINAL_BORDER_HEIGHT = 2

/**
 * Props for the App component
 */
export interface AppProps extends CLIArgs {}

/**
 * Main OCLoop application component
 *
 * Wraps AppContent with ThemeProvider and DialogProvider
 * for consistent theming and modal dialog support.
 */
export function App(props: AppProps) {
  return (
    <ThemeProvider>
      <DialogProvider>
        <AppContent {...props} />
        <DialogStack />
      </DialogProvider>
    </ThemeProvider>
  )
}

/**
 * Internal App content component
 *
 * Contains all the application logic:
 * - Server management (useServer)
 * - SSE event subscription (useSSE)
 * - State machine (useLoopState)
 * - PTY management (usePTY)
 *
 * Manages keybindings:
 * - Ctrl+\ to toggle attach/detach
 * - Space to pause/resume (when detached)
 * - Q to quit (when detached)
 * - Y/N for quit confirmation
 */
function AppContent(props: AppProps) {
  const renderer = useRenderer()
  const dimensions = useTerminalDimensions()
  const dialog = useDialog()

  // Terminal ref for ghostty-terminal
  const terminalRef: { current: GhosttyTerminalRenderable | null } = {
    current: null,
  }

  // Server management
  const server = useServer({
    port: props.port,
    autoStart: true,
  })

  // Loop state machine
  const loop = useLoopState()

  // Loop timing statistics
  const stats = useLoopStats()

  // Persisted loop state (loaded on startup)
  const [persistedState, setPersistedState] = createSignal<LoopStateFile | null>(null)
  const [showingResumeDialog, setShowingResumeDialog] = createSignal(false)

  // Track if we've initialized (to prevent double initialization)
  let sessionInitialized = false

  // Track previous state for detecting transitions
  let prevState: LoopState | null = null

  // Wire stats hook to loop state transitions
  createEffect(() => {
    const state = loop.state()
    const prev = prevState
    prevState = state

    // Skip initial render (no previous state)
    if (prev === null) {
      return
    }

    // Detect iteration_started: transitioning from running with no sessionId to running with sessionId
    // OR from paused to running with a new session
    if (
      state.type === "running" &&
      state.sessionId &&
      ((prev.type === "running" && !prev.sessionId) ||
        prev.type === "paused" ||
        prev.type === "ready")
    ) {
      stats.startIteration()
      // Refresh current task from plan file as fallback for SSE todo updates
      refreshCurrentTask()
    }

    // Detect pause: transitioning from running to pausing
    if (state.type === "pausing" && prev.type === "running") {
      stats.pause()
    }

    // Detect resume: transitioning from paused to running
    if (state.type === "running" && prev.type === "paused") {
      stats.resume()
    }

    // Detect session_idle: transitioning from running/pausing with sessionId to running without
    // or from pausing to paused
    if (
      (state.type === "running" && !state.sessionId && prev.type === "running" && prev.sessionId) ||
      (state.type === "paused" && prev.type === "pausing")
    ) {
      stats.endIteration()
      
      // Save state after iteration completes
      const iterationCount = state.type === "running" ? state.iteration : 
        state.type === "paused" ? state.iteration : 0
      persistLoopState(iterationCount)
    }
  })

  // Plan progress tracking
  const [planProgress, setPlanProgress] = createSignal<PlanProgress | null>(
    null,
  )
  const [planError, setPlanError] = createSignal<Error | undefined>(undefined)
  const [currentTask, setCurrentTask] = createSignal<string | undefined>(
    undefined,
  )

  // Current session ID (for SSE filtering and PTY)
  const sessionId = createMemo(() => {
    const state = loop.state()
    if (state.type === "running" && state.sessionId) {
      return state.sessionId
    }
    if (state.type === "pausing" && state.sessionId) {
      return state.sessionId
    }
    return undefined
  })

  // Calculate terminal dimensions
  const terminalCols = createMemo(() => {
    // Full width minus border (2 chars)
    return Math.max(40, dimensions().width - TERMINAL_BORDER_HEIGHT)
  })

  const terminalRows = createMemo(() => {
    // Full height minus status bar and terminal border
    return Math.max(10, dimensions().height - STATUS_BAR_HEIGHT - TERMINAL_BORDER_HEIGHT)
  })

  // PTY management
  const pty = usePTY({
    serverUrl: server.url,
    terminalRef,
    cols: terminalCols,
    rows: terminalRows,
    onExit: (_exitCode) => {
      // PTY exited - could be normal completion or error
      // The session.idle event will handle state transition
    },
  })

  // Handle PTY resize when terminal dimensions change
  onResize((width, height) => {
    const newCols = Math.max(40, width - TERMINAL_BORDER_HEIGHT)
    const newRows = Math.max(10, height - STATUS_BAR_HEIGHT - TERMINAL_BORDER_HEIGHT)
    pty.resize(newCols, newRows)
  })

  // SSE subscription (only when server is ready)
  const sse = useSSE({
    url: server.url() || "",
    sessionId: sessionId,
    autoConnect: false, // We'll connect when server is ready
    handlers: {
      onSessionIdle: (eventSessionId) => {
        // Only handle if it's our current session
        if (eventSessionId === sessionId()) {
          loop.dispatch({ type: "session_idle" })
          // Kill PTY when session becomes idle
          pty.kill()
        }
      },
      onTodoUpdated: (_eventSessionId, todos) => {
        // Update current task display from todos
        const inProgress = todos.find((t) => t.status === "in_progress")
        if (inProgress) {
          setCurrentTask(inProgress.content)
        }
      },
      onFileEdited: (file) => {
        // Re-parse plan if PLAN.md was edited
        if (file.endsWith(props.planFile || DEFAULTS.PLAN_FILE)) {
          refreshPlan()
          // Also refresh current task as fallback for SSE todo updates
          refreshCurrentTask()
        }
      },
    },
  })

  /**
   * Parse the plan file and update progress
   */
  async function refreshPlan(): Promise<void> {
    try {
      const progress = await parsePlanFile(props.planFile || DEFAULTS.PLAN_FILE)
      setPlanProgress(progress)
      setPlanError(undefined)
    } catch (err) {
      setPlanError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  /**
   * Refresh current task from plan file (fallback when SSE doesn't provide todo update)
   */
  async function refreshCurrentTask(): Promise<void> {
    try {
      const task = await getCurrentTask(props.planFile || DEFAULTS.PLAN_FILE)
      if (task) {
        setCurrentTask(task)
      }
    } catch {
      // Silently ignore errors - current task display is non-critical
    }
  }

  /**
   * Save loop state to disk after each iteration
   * Creates new state if none exists, otherwise updates existing
   */
  async function persistLoopState(iteration: number): Promise<void> {
    try {
      const existing = persistedState()
      const history = stats.getHistory()
      
      if (existing) {
        // Update existing state
        await saveLoopState({
          ...existing,
          iteration,
          iterationHistory: history,
        })
      } else {
        // Create new state
        const newState = createLoopState()
        newState.iteration = iteration
        newState.iterationHistory = history
        await saveLoopState(newState)
        setPersistedState(newState)
      }
    } catch (err) {
      // Log error but don't interrupt the loop
      console.error("Failed to save loop state:", err)
    }
  }

  /**
   * Check if .PLAN_COMPLETE file exists
   */
  async function checkPlanComplete(): Promise<boolean> {
    try {
      const file = Bun.file(DEFAULTS.COMPLETE_FILE)
      return await file.exists()
    } catch {
      return false
    }
  }

  /**
   * Create a new session and start an iteration
   */
  async function startIteration(): Promise<void> {
    const url = server.url()
    if (!url) {
      console.error("Cannot start iteration: server not ready")
      return
    }

    // Check for plan completion first
    if (await checkPlanComplete()) {
      // Parse remaining tasks from the plan file and .PLAN_COMPLETE file
      const planPath = props.planFile || DEFAULTS.PLAN_FILE
      let summary = await parseRemainingTasksFile(planPath)
      
      // Also check .PLAN_COMPLETE for any additional info
      const completeSummary = await parseCompletionFile(DEFAULTS.COMPLETE_FILE)
      
      // Merge summaries (prefer the plan file data, but add any unique items from .PLAN_COMPLETE)
      summary = {
        manualTasks: [...new Set([...summary.manualTasks, ...completeSummary.manualTasks])],
        blockedTasks: [...new Set([...summary.blockedTasks, ...completeSummary.blockedTasks])],
      }
      
      // Delete persisted loop state on completion
      await deleteLoopState()
      setPersistedState(null)
      
      loop.dispatch({ type: "plan_complete", summary })
      return
    }

    try {
      // Create SDK client
      const client = createOpencodeClient({ baseUrl: url })

      // Create a new session
      const result = await client.session.create({})

      if (!result.response.ok || !result.data) {
        throw new Error("Failed to create session")
      }

      const newSessionId = result.data.id

      // Dispatch iteration started
      loop.dispatch({ type: "iteration_started", sessionId: newSessionId })

      // Read the prompt file
      const promptFile = Bun.file(props.promptFile || DEFAULTS.PROMPT_FILE)
      const promptExists = await promptFile.exists()

      if (!promptExists) {
        throw new Error(
          `Prompt file not found: ${props.promptFile || DEFAULTS.PROMPT_FILE}`,
        )
      }

      const prompt = await promptFile.text()

      // Spawn PTY for this session
      pty.spawn(newSessionId)

      // Send the prompt asynchronously
      await client.session.promptAsync({
        path: { id: newSessionId },
        body: {
          parts: [{ type: "text", text: prompt }],
        },
      })

      // Refresh plan progress
      await refreshPlan()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      loop.dispatch({
        type: "error",
        source: "api",
        message: `Failed to start iteration: ${errorMessage}`,
        recoverable: true,
      })
    }
  }

  /**
   * Handle quit - abort session and cleanup gracefully
   */
  async function handleQuit(): Promise<void> {
    // Save state before quitting so user can resume
    const iteration = loop.iteration()
    if (iteration > 0) {
      await persistLoopState(iteration)
    }
    
    loop.dispatch({ type: "quit" })

    // Abort current session if running
    const currentSessionId = sessionId()
    if (currentSessionId) {
      try {
        const url = server.url()
        if (url) {
          const client = createOpencodeClient({ baseUrl: url })
          await client.session.abort({ sessionID: currentSessionId })
        }
      } catch {
        // Ignore errors when aborting - we're shutting down anyway
      }
    }

    // Kill PTY
    pty.kill()

    // Disconnect SSE
    sse.disconnect()

    // Stop server
    await server.stop()

    // Exit process
    process.exit(0)
  }

  // Server ready effect - transition to ready state and connect SSE
  createEffect(() => {
    if (server.status() === "ready" && loop.state().type === "starting") {
      // Server is ready, transition to ready state (waiting for user to start)
      loop.dispatch({ type: "server_ready" })

      // Connect SSE
      sse.reconnect()

      // Initialize session persistence (only once)
      if (!sessionInitialized) {
        sessionInitialized = true
        initializeSession()
      }
    }
  })

  /**
   * Initialize session persistence on startup
   * - Ensures .loop-state.json is in .gitignore
   * - Loads any existing persisted state
   * - Shows resume dialog if previous state exists
   */
  async function initializeSession(): Promise<void> {
    try {
      // Ensure .loop-state.json is in .gitignore
      await ensureGitignore()

      // Load any persisted state from previous run
      const loadedState = await loadLoopState()

      if (loadedState) {
        // Previous state found - show resume dialog
        setPersistedState(loadedState)
        setShowingResumeDialog(true)
        dialog.show(() => (
          <DialogResume
            iteration={loadedState.iteration}
            onResume={handleResume}
            onStartFresh={handleStartFresh}
          />
        ))
      } else if (props.run) {
        // No previous state and --run flag set, start immediately
        loop.dispatch({ type: "start" })
        startIteration()
      }
    } catch (err) {
      // Log error but don't block startup
      console.error("Failed to initialize session persistence:", err)
      
      // If --run flag set, start anyway
      if (props.run) {
        loop.dispatch({ type: "start" })
        startIteration()
      }
    }
  }

  /**
   * Handle resume from previous session
   * - Load history into stats
   * - Set iteration count in state machine (via resuming with proper iteration)
   */
  function handleResume(): void {
    const loaded = persistedState()
    if (!loaded) return

    // Load history into stats
    stats.loadFromState(loaded)

    // Clear the dialog
    dialog.clear()
    setShowingResumeDialog(false)

    // Start running from the loaded iteration
    // We dispatch start to transition to running state, then the iteration
    // count will be maintained by iterating from the current position
    loop.dispatch({ type: "start" })
    
    // Start the next iteration (iteration count will increment)
    startIteration()
  }

  /**
   * Handle start fresh - delete previous state and start new
   */
  async function handleStartFresh(): Promise<void> {
    // Delete the old state file
    await deleteLoopState()
    setPersistedState(null)

    // Clear the dialog
    dialog.clear()
    setShowingResumeDialog(false)

    // If --run flag is set or user chose to start fresh, we can prompt to start
    // The user will need to press S to start (consistent with normal startup)
  }

  // Server error effect - transition to error state
  createEffect(() => {
    if (server.status() === "error" && server.error()) {
      loop.dispatch({
        type: "error",
        source: "server",
        message: server.error()?.message || "Failed to start server",
        recoverable: true,
      })
    }
  })

  // PTY error effect - transition to error state (non-recoverable for now)
  createEffect(() => {
    const ptyError = pty.error()
    const ptyStatus = pty.status()
    if (ptyStatus === "error" && ptyError) {
      loop.dispatch({
        type: "error",
        source: "pty",
        message: ptyError.message || "Terminal process failed",
        recoverable: false,
      })
    }
  })

  // Session idle effect - start next iteration if running
  createEffect(() => {
    const state = loop.state()

    // When session becomes idle and we're in running state with empty sessionId,
    // start the next iteration
    if (state.type === "running" && !state.sessionId && state.iteration > 0) {
      startIteration()
    }

    // When paused and user resumes (toggle_pause), start next iteration
    if (state.type === "running" && !state.sessionId && state.iteration > 0) {
      // This is handled by the state machine transition
    }
  })

  // Input handler for keybindings
  onMount(() => {
    const inputHandler = (sequence: string): boolean => {
      // Ctrl+\ (0x1c) - always handle, toggle attach/detach
      if (sequence === KEYS.CTRL_BACKSLASH) {
        loop.dispatch({ type: "toggle_attach" })
        return true
      }

      // If showing quit confirmation modal
      if (loop.showingQuitConfirmation()) {
        if (
          sequence === KEYS.Y_LOWER ||
          sequence === KEYS.Y_UPPER
        ) {
          handleQuit()
          return true
        }
        if (
          sequence === KEYS.N_LOWER ||
          sequence === KEYS.N_UPPER ||
          sequence === KEYS.ESCAPE
        ) {
          loop.hideQuitConfirmation()
          return true
        }
        // Consume all other input while modal is shown
        return true
      }

      // If showing resume dialog
      if (showingResumeDialog()) {
        if (
          sequence === KEYS.Y_LOWER ||
          sequence === KEYS.Y_UPPER
        ) {
          handleResume()
          return true
        }
        if (
          sequence === KEYS.N_LOWER ||
          sequence === KEYS.N_UPPER ||
          sequence === KEYS.ESCAPE
        ) {
          handleStartFresh()
          return true
        }
        // Consume all other input while dialog is shown
        return true
      }

      // Ready state - handle S to start iterations
      if (loop.canStart()) {
        if (sequence === KEYS.S_LOWER || sequence === KEYS.S_UPPER) {
          loop.dispatch({ type: "start" })
          startIteration()
          return true
        }
        if (sequence === KEYS.Q_LOWER || sequence === KEYS.Q_UPPER) {
          loop.showQuitConfirmation()
          return true
        }
        // Consume other input in ready state
        return true
      }

      // If attached, forward everything to PTY
      if (loop.isAttached()) {
        pty.write(sequence)
        return true
      }

      // Detached - handle our keybindings
      if (sequence === KEYS.SPACE) {
        if (loop.canPause()) {
          loop.dispatch({ type: "toggle_pause" })

          // If resuming from paused state, start next iteration
          if (loop.state().type === "running") {
            startIteration()
          }
        }
        return true
      }

      if (sequence === KEYS.Q_LOWER || sequence === KEYS.Q_UPPER) {
        if (loop.canQuit()) {
          loop.showQuitConfirmation()
        }
        return true
      }

      // Complete state - any key to exit
      if (loop.state().type === "complete") {
        process.exit(0)
      }

      // Error state - handle R for retry and Q for quit
      if (loop.isError()) {
        if (sequence === KEYS.R_LOWER || sequence === KEYS.R_UPPER) {
          if (loop.canRetry()) {
            loop.dispatch({ type: "retry" })
          }
          return true
        }
        if (sequence === KEYS.Q_LOWER || sequence === KEYS.Q_UPPER) {
          process.exit(1)
        }
        return true // consume other input in error state
      }

      // Let opentui handle other input (scrolling, etc.)
      return false
    }

    // Prepend our input handler to process before opentui
    renderer.prependInputHandler(inputHandler)

    // Register shutdown handler for SIGINT/SIGTERM signals
    shutdownManager.register(handleQuit)

    // Initial plan parsing
    refreshPlan()

    // Cleanup on unmount
    onCleanup(() => {
      renderer.removeInputHandler(inputHandler)
      shutdownManager.unregister()
      pty.kill()
    })
  })

  /**
   * Handle retry - restart from error state
   */
  function handleRetry(): void {
    if (loop.canRetry()) {
      loop.dispatch({ type: "retry" })
    }
  }

  // Extract error details for display
  const errorDetails = createMemo(() => {
    const state = loop.state()
    if (state.type === "error") {
      return {
        source: state.source,
        message: state.message,
        recoverable: state.recoverable,
      }
    }
    return null
  })

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      {/* Status bar at the top */}
      <StatusBar
        state={loop.state}
        planProgress={planProgress}
        currentTask={currentTask}
        isAttached={loop.isAttached}
      />

      {/* Show error display in error state, otherwise show terminal */}
      {loop.isError() && errorDetails() ? (
        <ErrorDisplay
          source={errorDetails()!.source}
          message={errorDetails()!.message}
          recoverable={errorDetails()!.recoverable}
          onRetry={handleRetry}
          onQuit={() => process.exit(1)}
        />
      ) : (
        /* Terminal panel takes remaining space */
        <TerminalPanel
          terminalRef={(el) => {
            terminalRef.current = el
          }}
          cols={terminalCols()}
          rows={terminalRows()}
          isActive={loop.isAttached()}
        />
      )}

      {/* Quit confirmation modal (overlay) */}
      <QuitConfirmation
        visible={loop.showingQuitConfirmation()}
        onConfirm={handleQuit}
        onCancel={() => loop.hideQuitConfirmation()}
      />
    </box>
  )
}
