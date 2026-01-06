import path from "path"
import {
  createSignal,
  createEffect,
  createMemo,
  onMount,
  onCleanup,
  Show,
} from "solid-js"
import {
  useRenderer,
} from "@opentui/solid"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"

import { useServer } from "./hooks/useServer"
import { useSSE, type FileDiff } from "./hooks/useSSE"
import { useLoopState } from "./hooks/useLoopState"
import { useLoopStats } from "./hooks/useLoopStats"
import { useSessionStats } from "./hooks/useSessionStats"
import { useActivityLog } from "./hooks/useActivityLog"
import { log } from "./lib/debug-logger"
import { parsePlanFile, getCurrentTask, isPlanComplete, getPlanCompleteSummary } from "./lib/plan-parser"
import { KEYS, DEFAULTS, isKeyboardInput } from "./lib/constants"
import { getToolPreview } from "./lib/format"
import { shutdownManager } from "./lib/shutdown"
import {
  ensureGitignore,
} from "./lib/project"
import { loadConfig, saveConfig, hasTerminalConfig, type OcloopConfig } from "./lib/config"
import { 
  detectInstalledTerminals, 
  getAttachCommand, 
  launchTerminal, 
  type KnownTerminal 
} from "./lib/terminal-launcher"
import { copyToClipboard } from "./lib/clipboard"
import { ThemeProvider } from "./context/ThemeContext"
import { DialogProvider, DialogStack, useDialog } from "./context/DialogContext"
import { CommandProvider, useCommand, type CommandOption } from "./context/CommandContext"
import { ToastProvider, Toast, useToast } from "./context/ToastContext"
import {
  Dashboard,
  QuitConfirmation,
  DialogCompletion,
  DialogError,
  ActivityLog,
  DialogTerminalConfig,
  createTerminalConfigState,
  DialogTerminalError,
} from "./components"
import type { CLIArgs, PlanProgress, LoopState } from "./types"

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
        <CommandProvider>
          <ToastProvider>
            <AppContent {...props} />
            <DialogStack />
            <Toast />
          </ToastProvider>
        </CommandProvider>
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
 * - Activity Log (useActivityLog)
 *
 * Manages keybindings:
 * - Ctrl+\ to launch external terminal
 * - Space to pause/resume
 * - Q to quit
 * - Y/N for quit confirmation
 */
function AppContent(props: AppProps) {
  const renderer = useRenderer()
  const dialog = useDialog()
  const toast = useToast()
  const command = useCommand()

  // Server management
  const server = useServer({
    port: props.port,
    autoStart: true,
  })

  // Loop state machine
  const loop = useLoopState()

  // Loop timing statistics
  const stats = useLoopStats()

  // Session statistics (tokens, diff)
  const sessionStats = useSessionStats()

  // Activity Log
  const activityLog = useActivityLog()

  // Configuration & Terminal State
  const [ocloopConfig, setOcloopConfig] = createSignal<OcloopConfig>({})
  const [showingTerminalConfig, setShowingTerminalConfig] = createSignal(false)
  const [terminalError, setTerminalError] = createSignal<{ name: string; error: string } | null>(null)
  const [availableTerminals, setAvailableTerminals] = createSignal<KnownTerminal[]>([])
  const [lastSessionId, setLastSessionId] = createSignal<string | undefined>(undefined)

  // Active model
  const [activeModel, setActiveModel] = createSignal<string | undefined>(props.model)

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
      log.iterationStart(state.iteration)
      log.debug("state", "Iteration started", { sessionId: state.sessionId, iteration: state.iteration })
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
      log.iterationEnd(state.iteration)
      log.debug("state", "Iteration ended", { iteration: state.iteration })
      stats.endIteration()
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

  // Current session ID (for SSE filtering)
  const sessionId = createMemo(() => {
    const state = loop.state()
    if (state.type === "running" && state.sessionId) {
      return state.sessionId
    }
    if (state.type === "pausing" && state.sessionId) {
      return state.sessionId
    }
    if (state.type === "debug" && state.sessionId) {
      return state.sessionId
    }
    return undefined
  })

  // On Mount: Load config and detect terminals
  onMount(async () => {
    const config = await loadConfig()
    setOcloopConfig(config)
    
    const terminals = await detectInstalledTerminals()
    setAvailableTerminals(terminals)
  })

  // SSE subscription (only when server is ready)
  const sse = useSSE({
    url: () => server.url() || "",
    sessionId: sessionId,
    autoConnect: false, // We'll connect when server is ready
    handlers: {
      onSessionCreated: (id) => {
        activityLog.addEvent("session_start", `Session started: ${id.substring(0, 8)}`)
        setLastSessionId(id)
        sessionStats.reset()
      },
      onSessionError: (id, error) => {
        if (error.isAborted) {
          activityLog.addEvent("task", "Session aborted by user")
          if (loop.state().type === "running") {
            loop.dispatch({ type: "toggle_pause" })
          }
        } else {
          activityLog.addEvent("error", `Session error: ${error.message}`)
        }
      },
      onSessionIdle: (eventSessionId) => {
        // Only handle if it's our current session
        const currentSession = sessionId()
        const state = loop.state()
        // Also check debug state's sessionId
        const debugSessionId = state.type === "debug" ? state.sessionId : undefined
        
        if (eventSessionId === currentSession || eventSessionId === debugSessionId) {
          loop.dispatch({ type: "session_idle" })
          activityLog.addEvent("session_idle", "Session idle")
        }
      },
      onTodoUpdated: (_eventSessionId, todos) => {
        // Update current task display from todos
        const inProgress = todos.find((t) => t.status === "in_progress")
        if (inProgress) {
          setCurrentTask(inProgress.content)
          activityLog.addEvent("task", inProgress.content)
        }
      },
      onFileEdited: (file) => {
        activityLog.addEvent("file_edit", file)
        // Re-parse plan if PLAN.md was edited
        const planFile = props.planFile || DEFAULTS.PLAN_FILE
        const absolutePlanPath = path.resolve(planFile)
        const absoluteFilePath = path.resolve(file)
        
        if (absoluteFilePath === absolutePlanPath) {
          refreshPlan()
          // Also refresh current task as fallback for SSE todo updates
          refreshCurrentTask()
        }
      },
      onStepFinish: (part) => {
        sessionStats.addTokens(part.tokens)
      },
      onSessionDiff: (diffs: FileDiff[]) => {
        // Filter out .loop.log files
        const filtered = diffs.filter(d => !d.file.endsWith('.loop.log'))
        
        // Aggregate stats
        const additions = filtered.reduce((acc, d) => acc + d.additions, 0)
        const deletions = filtered.reduce((acc, d) => acc + d.deletions, 0)
        const files = filtered.length
        
        sessionStats.setDiff({ additions, deletions, files })
      },
      onToolUse: (part) => {
        const toolName = part.tool || part.state.tool || "unknown"
        const input = part.state.input as Record<string, unknown>
        const preview = getToolPreview(toolName, input)
        
        if (toolName === "read") {
          activityLog.addEvent("file_read", preview)
        } else {
          activityLog.addEvent("tool_use", `${toolName}: ${preview}`)
        }
      },
      onMessageText: (part, role) => {
        const type = role === "user" ? "user_message" : "assistant_message"
        activityLog.addEvent(type, part.text, { dimmed: true })
      },
      onReasoning: (part) => {
        activityLog.addEvent("reasoning", part.text, { dimmed: true })
      },
    },
  })

  /**
   * Parse the plan file and update progress
   */
  async function refreshPlan(): Promise<void> {
    // Skip in debug mode - no plan file required
    if (props.debug) {
      return
    }
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
    // Skip in debug mode - no plan file required
    if (props.debug) {
      return
    }
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
   * Check if plan is marked complete
   */
  async function checkPlanComplete(): Promise<boolean> {
    // Skip check in debug mode
    if (props.debug) return false
    
    try {
      const planPath = props.planFile || DEFAULTS.PLAN_FILE
      return await isPlanComplete(planPath)
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
      const planPath = props.planFile || DEFAULTS.PLAN_FILE
      // We know it's complete, but getPlanCompleteSummary returns string | null
      const summaryContent = await getPlanCompleteSummary(planPath)
      
      loop.dispatch({ 
        type: "plan_complete", 
        summary: { summary: summaryContent || "Plan marked as complete." } 
      })
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

      const promptContent = await promptFile.text()
      // Replace {{PLAN_FILE}} placeholder with actual plan file path
      const prompt = promptContent.replaceAll("{{PLAN_FILE}}", props.planFile || DEFAULTS.PLAN_FILE)

      // Send the prompt asynchronously
      await client.session.promptAsync({
        sessionID: newSessionId,
        parts: [{ type: "text", text: prompt }],
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
   * Create a new session in debug mode (no prompt sent)
   * Just creates a session for manual interaction
   */
  async function createDebugSession(): Promise<void> {
    log.info("session", "Creating debug session...")
    const url = server.url()
    if (!url) {
      log.error("session", "Cannot create debug session: server not ready")
      console.error("Cannot create debug session: server not ready")
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
      
      log.info("session", "Debug session created", { sessionId: newSessionId })

      // Dispatch new_session to update debug state with session ID
      loop.dispatch({ type: "new_session", sessionId: newSessionId })
      setLastSessionId(newSessionId)
      
      activityLog.addEvent("session_start", `Debug session: ${newSessionId.substring(0, 8)}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      log.error("session", "Failed to create debug session", errorMessage)
      loop.dispatch({
        type: "error",
        source: "api",
        message: `Failed to create debug session: ${errorMessage}`,
        recoverable: true,
      })
    }
  }

  /**
   * Handle quit - abort session and cleanup gracefully
   * @param exitCode - Exit code to use (default: 0)
   */
  async function handleQuit(exitCode: number = 0): Promise<void> {
    log.info("app", "Quit initiated", { exitCode, currentSessionId: sessionId() })
    
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

    // Disconnect SSE
    sse.disconnect()

    // Stop server
    await server.stop()

    // Clear title and restore terminal
    renderer.setTerminalTitle("")
    renderer.destroy()

    // Exit process
    process.exit(exitCode)
  }

  // Server ready effect - transition to ready state and connect SSE
  createEffect(() => {
    if (server.status() === "ready" && loop.state().type === "starting") {
      log.info("server", "Ready", { url: server.url(), debug: props.debug })
      // Server is ready, transition to appropriate state
      if (props.debug) {
        // Debug mode - transition to debug state
        loop.dispatch({ type: "server_ready_debug" })
      } else {
        // Normal mode - transition to ready state (waiting for user to start)
        loop.dispatch({ type: "server_ready" })
      }

      // Connect SSE
      sse.reconnect()

      // Fetch active model from config if not already set via CLI
      if (!activeModel()) {
        const url = server.url()
        if (url) {
          createOpencodeClient({ baseUrl: url }).config.get()
            .then(res => {
              if (res.data?.model) {
                setActiveModel(res.data.model)
              }
            })
            .catch(err => {
              log.error("config", "Failed to fetch model from config", err)
            })
        }
      }

      // Initialize session persistence (only once)
      if (!sessionInitialized) {
        sessionInitialized = true
        initializeSession()
      }
    }
  })

  /**
   * Initialize session persistence on startup
   * - In debug mode: creates a debug session immediately
   * - In normal mode: ensures .gitignore is updated
   * - Starts immediately if --run is passed
   */
  async function initializeSession(): Promise<void> {
    // In debug mode, create a session immediately and return
    if (props.debug) {
      await createDebugSession()
      return
    }

    try {
      // Ensure .loop* is in .gitignore
      await ensureGitignore()

      if (props.run) {
        // --run flag set, start immediately
        loop.dispatch({ type: "start" })
        startIteration()
      }
    } catch (err) {
      // Log error but don't block startup
      console.error("Failed to initialize session:", err)
      
      // If --run flag is set, start anyway
      if (props.run) {
        loop.dispatch({ type: "start" })
        startIteration()
      }
    }
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

  // Session idle effect - start next iteration if running
  createEffect(() => {
    const state = loop.state()

    // When session becomes idle and we're in running state with empty sessionId,
    // start the next iteration
    if (state.type === "running" && !state.sessionId && state.iteration > 0) {
      startIteration()
    }
  })

  // Completion effect - show dialog when plan is complete
  createEffect(() => {
    const state = loop.state()
    if (state.type === "complete") {
      // Calculate total time from stats
      const totalTime = stats.totalActiveTime()
      
      dialog.show(() => (
        <DialogCompletion
          iterations={state.iterations}
          totalTime={totalTime}
          summary={state.summary.summary}
          onClose={() => handleQuit()}
        />
      ))
    }
  })

  // Error effect - show dialog when error occurs
  createEffect(() => {
    const state = loop.state()
    if (state.type === "error") {
      dialog.show(() => (
        <DialogError
          source={state.source}
          message={state.message}
          recoverable={state.recoverable}
          onRetry={() => {
            dialog.clear()
            if (loop.canRetry()) {
              loop.dispatch({ type: "retry" })
            }
          }}
          onQuit={() => handleQuit(1)}
        />
      ))
    }
  })
  

  /**
   * Execute launch and handle errors
   */
  async function launchConfiguredTerminal(sid: string, terminalConfig: OcloopConfig['terminal']) {
     if (!terminalConfig) return
     
     const url = server.url()
     if (!url) return
     
     const attachCmd = getAttachCommand(url, sid)
     log.info("terminal", "Launching", { 
        sessionId: sid, 
        terminal: terminalConfig, 
        command: attachCmd 
     })

     const result = await launchTerminal(terminalConfig, attachCmd)
     
     log.info("terminal", "Launch result", result)

     if (!result.success) {
        setTerminalError({
           name: terminalConfig.type === 'known' ? terminalConfig.name : 'Custom',
           error: result.error || "Unknown error"
        })
     }
  }
  
  // Handlers for Terminal Config Dialog
  const onConfigSelect = async (terminal: KnownTerminal) => {
     // Save config
     const newConfig: OcloopConfig = {
        ...ocloopConfig(),
        terminal: {
           type: 'known',
           name: terminal.name
        }
     }
     
     await saveConfig(newConfig)
     setOcloopConfig(newConfig)
     setShowingTerminalConfig(false)
     
     // Launch!
     const sid = sessionId() || lastSessionId()
     if (sid) {
        launchConfiguredTerminal(sid, newConfig.terminal)
     }
  }
  
  const onConfigCustom = async (command: string, args: string) => {
     // Save config
     const newConfig: OcloopConfig = {
        ...ocloopConfig(),
        terminal: {
           type: 'custom',
           command,
           args
        }
     }
     
     await saveConfig(newConfig)
     setOcloopConfig(newConfig)
     setShowingTerminalConfig(false)
     
     // Launch!
     const sid = sessionId() || lastSessionId()
     if (sid) {
        launchConfiguredTerminal(sid, newConfig.terminal)
     }
  }
  
  const onConfigCopy = () => {
     const sid = sessionId() || lastSessionId()
     const url = server.url()
     if (sid && url) {
        const cmd = getAttachCommand(url, sid)
        copyToClipboard(cmd)
        toast.show({ variant: "success", message: "Copied to clipboard" })
     }
     setShowingTerminalConfig(false)
  }
  
  const onErrorCopy = () => {
     const sid = sessionId() || lastSessionId()
     const url = server.url()
     if (sid && url) {
        const cmd = getAttachCommand(url, sid)
        copyToClipboard(cmd)
        toast.show({ variant: "success", message: "Copied to clipboard" })
     }
     setTerminalError(null)
  }

  // Create state for terminal config dialog
  const terminalConfigState = createTerminalConfigState(
    availableTerminals,
    onConfigSelect,
    onConfigCustom,
    onConfigCopy,
    () => setShowingTerminalConfig(false)
  )

  // Register commands
  createEffect(() => {
    // Re-register commands when session ID changes so we can enable/disable them
    // and provide current session ID to callbacks
    const sid = sessionId() || lastSessionId()
    const url = server.url()
    const hasSession = !!sid

    command.register(() => [
      {
        title: "Copy attach command",
        value: "copy_attach",
        category: "Terminal",
        keybind: "C",
        disabled: !hasSession,
        onSelect: () => {
          if (sid && url) {
            const cmd = getAttachCommand(url, sid)
            copyToClipboard(cmd)
            toast.show({ variant: "success", message: "Copied to clipboard" })
          }
        },
      },
      {
        title: "Choose default terminal",
        value: "terminal_config",
        category: "Terminal",
        keybind: "T",
        disabled: !hasSession,
        onSelect: () => {
          dialog.clear()
          setShowingTerminalConfig(true)
        },
      },
      {
        title: "Toggle scrollbar",
        value: "toggle_scrollbar",
        category: "View",
        onSelect: async () => {
          const current = ocloopConfig().scrollbar_visible ?? true
          const newConfig = {
            ...ocloopConfig(),
            scrollbar_visible: !current
          }
          setOcloopConfig(newConfig)
          await saveConfig(newConfig)
          dialog.clear()
        },
      },
    ])
  })

  // Input handler for keybindings
  onMount(() => {
    const inputHandler = (sequence: string): boolean => {
      // Log key press (only if verbose mode is enabled)
      if (props.verbose && isKeyboardInput(sequence)) {
        log.debug("keybinding", "Key pressed", { 
          key: sequence, 
          hex: "0x" + sequence.charCodeAt(0).toString(16).toUpperCase(),
          state: loop.state().type,
          sessionId: sessionId(),
          lastSessionId: lastSessionId()
        })
      }

      // Ctrl+P - open command palette (handle globally before state-specific handlers)
      if (sequence === KEYS.CTRL_P) {
        command.show()
        return true
      }

      // If showing modals/dialogs, don't interfere unless it's global shortcuts that override them
      // But typically we want the dialogs to handle their own input.

      // Ctrl+\ (0x1c) - always handle - REMOVED, now handling T in specific states

      // Debug mode handling
      if (loop.isDebug()) {
        // Detached in debug mode - handle our keybindings
        if (sequence === KEYS.N_LOWER || sequence === KEYS.N_UPPER) {
          // N - create new session
          createDebugSession()
          return true
        }
        
        if (sequence === KEYS.Q_LOWER || sequence === KEYS.Q_UPPER) {
          // Q - show quit confirmation
          loop.showQuitConfirmation()
          return true
        }

        if (sequence === KEYS.T_LOWER || sequence === KEYS.T_UPPER) {
           const sid = sessionId() || lastSessionId()
           if (sid) {
              const config = ocloopConfig()
              if (hasTerminalConfig(config)) {
                 launchConfiguredTerminal(sid, config.terminal)
              } else {
                 command.trigger("terminal_config")
              }
           } else {
              toast.show({ variant: "info", message: "No active session to attach to" })
           }
           return true
        }
        
        // Consume other input in debug mode when detached
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

      // Complete state - Q to exit
      if (loop.state().type === "complete") {
        if (sequence === KEYS.Q_LOWER || sequence === KEYS.Q_UPPER) {
          handleQuit()
        }
        return true
      }

      // Detached - handle our keybindings
      if (sequence === KEYS.T_LOWER || sequence === KEYS.T_UPPER) {
         const sid = sessionId() || lastSessionId()
         if (sid) {
            const config = ocloopConfig()
            if (hasTerminalConfig(config)) {
               launchConfiguredTerminal(sid, config.terminal)
            } else {
               command.trigger("terminal_config")
            }
         } else {
            toast.show({ variant: "info", message: "No active session to attach to" })
         }
         return true
      }

      if (sequence === KEYS.SPACE) {
        if (loop.canPause()) {
          loop.dispatch({ type: "toggle_pause" })
        }
        return true
      }

      if (sequence === KEYS.Q_LOWER || sequence === KEYS.Q_UPPER) {
        if (loop.canQuit()) {
          loop.showQuitConfirmation()
        }
        return true
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
          handleQuit(1)
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
    })
  })

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      {/* Dashboard at the top */}
      <Dashboard
        isActive={true}
        state={loop.state()}
        progress={planProgress()}
        stats={stats}
        currentTask={currentTask() ?? null}
        model={activeModel()}
      />

      {/* Activity Log takes remaining space */}
      <ActivityLog 
        events={activityLog.events()} 
        tokens={sessionStats.tokens()}
        diff={sessionStats.diff()}
        showScrollbar={ocloopConfig().scrollbar_visible ?? true}
      />

      {/* Overlays */}
      <Show when={showingTerminalConfig()}>
         <DialogTerminalConfig
            state={terminalConfigState}
            onCancel={() => setShowingTerminalConfig(false)}
         />
      </Show>

      <Show when={terminalError()}>
         <DialogTerminalError
            terminalName={terminalError()?.name || "Terminal"}
            errorMessage={terminalError()?.error || "Unknown error"}
            attachCommand={(sessionId() || lastSessionId()) && server.url() ? getAttachCommand(server.url()!, (sessionId() || lastSessionId())!) : ""}
            onCopy={onErrorCopy}
            onClose={() => setTerminalError(null)}
         />
      </Show>

      {/* Quit confirmation modal (overlay) */}
      <QuitConfirmation
        visible={loop.showingQuitConfirmation()}
        onConfirm={handleQuit}
        onCancel={() => loop.hideQuitConfirmation()}
      />
    </box>
  )
}
