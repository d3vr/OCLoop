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
import { usePTY } from "./hooks/usePTY"
import { parsePlanFile, parseCompletionFile, parseRemainingTasksFile } from "./lib/plan-parser"
import { KEYS, DEFAULTS } from "./lib/constants"
import {
  StatusBar,
  TerminalPanel,
  QuitConfirmation,
} from "./components"
import type { CLIArgs, PlanProgress } from "./types"

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
 * Composes all hooks and components to create the loop harness:
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
export function App(props: AppProps) {
  const renderer = useRenderer()
  const dimensions = useTerminalDimensions()

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
      console.error("Failed to start iteration:", err)
      // TODO: Handle error state properly
    }
  }

  /**
   * Handle quit - abort session and cleanup
   */
  async function handleQuit(): Promise<void> {
    loop.dispatch({ type: "quit" })

    // Kill PTY
    pty.kill()

    // Disconnect SSE
    sse.disconnect()

    // Stop server
    await server.stop()

    // Exit process
    process.exit(0)
  }

  // Server ready effect - transition to running and connect SSE
  createEffect(() => {
    if (server.status() === "ready" && loop.state().type === "starting") {
      // Server is ready, transition to running state
      loop.dispatch({ type: "server_ready" })

      // Connect SSE
      sse.reconnect()

      // Start first iteration
      startIteration()
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

      // Let opentui handle other input (scrolling, etc.)
      return false
    }

    // Prepend our input handler to process before opentui
    renderer.prependInputHandler(inputHandler)

    // Initial plan parsing
    refreshPlan()

    // Cleanup on unmount
    onCleanup(() => {
      renderer.removeInputHandler(inputHandler)
      pty.kill()
    })
  })

  // Determine if terminal should be dimmed (detached)
  const terminalDimmed = createMemo(() => {
    return !loop.isAttached()
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

      {/* Terminal panel takes remaining space */}
      <TerminalPanel
        terminalRef={(el) => {
          terminalRef.current = el
        }}
        cols={terminalCols()}
        rows={terminalRows()}
        dimmed={terminalDimmed()}
      />

      {/* Quit confirmation modal (overlay) */}
      <QuitConfirmation
        visible={loop.showingQuitConfirmation()}
        onConfirm={handleQuit}
        onCancel={() => loop.hideQuitConfirmation()}
      />
    </box>
  )
}
