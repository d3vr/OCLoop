import { createSignal, createMemo } from "solid-js"
import type { LoopState, LoopAction } from "../types"

/**
 * Return type for the useLoopState hook
 */
export interface UseLoopStateReturn {
  state: () => LoopState
  dispatch: (action: LoopAction) => void

  // Derived state
  isReady: () => boolean
  isRunning: () => boolean
  isPaused: () => boolean
  isPausing: () => boolean
  isError: () => boolean
  isDebug: () => boolean
  canStart: () => boolean
  canPause: () => boolean
  canQuit: () => boolean
  canRetry: () => boolean
  iteration: () => number

  // Quit confirmation modal
  showingQuitConfirmation: () => boolean
  showQuitConfirmation: () => void
  hideQuitConfirmation: () => void
}

/**
 * Reducer function that handles state transitions.
 * Implements the state machine defined in PLAN.md.
 */
export function loopReducer(state: LoopState, action: LoopAction): LoopState {
  switch (action.type) {
    case "server_ready": {
      // Only transition from starting to ready (waiting for user to start)
      if (state.type === "starting") {
        return { type: "ready" }
      }
      return state
    }

    case "server_ready_debug": {
      // Transition from starting to debug mode
      if (state.type === "starting") {
        return { type: "debug", sessionId: "" }
      }
      return state
    }

    case "new_session": {
      // Set session ID in debug mode
      if (state.type === "debug") {
        return { type: "debug", sessionId: action.sessionId }
      }
      return state
    }

    case "start": {
      // User initiates iterations from ready state
      if (state.type === "ready") {
        return { type: "running", iteration: 0, sessionId: "" }
      }
      return state
    }

    case "iteration_started": {
      // Set the session ID when an iteration starts
      if (state.type === "running") {
        return {
          type: "running",
          iteration: state.iteration + 1,
          sessionId: action.sessionId,
        }
      }
      // Can also start iteration from paused state (resume)
      if (state.type === "paused") {
        return {
          type: "running",
          iteration: state.iteration + 1,
          sessionId: action.sessionId,
        }
      }
      return state
    }

    case "toggle_pause": {
      // Toggle pause/resume
      if (state.type === "running") {
        // Transition to pausing - will complete when session becomes idle
        return {
          type: "pausing",
          iteration: state.iteration,
          sessionId: state.sessionId,
        }
      }
      if (state.type === "paused") {
        // Resume - will need iteration_started to set sessionId
        return {
          type: "running",
          iteration: state.iteration,
          sessionId: "",
        }
      }
      return state
    }

    case "session_idle": {
      // Handle session completion
      if (state.type === "running") {
        // Stay in running with empty sessionId, ready for next iteration
        return {
          type: "running",
          iteration: state.iteration,
          sessionId: "",
        }
      }
      if (state.type === "pausing") {
        // Complete the pause transition
        return {
          type: "paused",
          iteration: state.iteration,
        }
      }
      if (state.type === "debug") {
        // In debug mode, clear sessionId and stay in debug (ready for new session)
        return {
          type: "debug",
          sessionId: "",
        }
      }
      return state
    }

    case "quit": {
      // Transition to stopping from any active state
      if (
        state.type === "ready" ||
        state.type === "running" ||
        state.type === "paused" ||
        state.type === "pausing" ||
        state.type === "debug"
      ) {
        return { type: "stopping" }
      }
      return state
    }

    case "plan_complete": {
      // Transition to complete state with summary
      if (state.type === "ready" || state.type === "running" || state.type === "paused") {
        const iterations =
          state.type === "running" ? state.iteration : 
          state.type === "paused" ? state.iteration : 0
        return { type: "complete", iterations, summary: action.summary }
      }
      return state
    }

    case "error": {
      // Transition to error state from most states
      if (
        state.type === "starting" ||
        state.type === "ready" ||
        state.type === "running" ||
        state.type === "pausing" ||
        state.type === "paused" ||
        state.type === "debug"
      ) {
        return {
          type: "error",
          source: action.source,
          message: action.message,
          recoverable: action.recoverable,
        }
      }
      return state
    }

    case "retry": {
      // Retry from error state - go back to starting
      if (state.type === "error" && state.recoverable) {
        return { type: "starting" }
      }
      return state
    }

    default:
      return state
  }
}

/**
 * Hook to manage the OCLoop state machine.
 *
 * Provides reactive state, dispatch function, and derived state helpers
 * for the main loop lifecycle.
 *
 * @example
 * ```tsx
 * const loop = useLoopState()
 *
 * createEffect(() => {
 *   if (loop.isRunning()) {
 *     console.log("Loop is running, iteration:", loop.iteration())
 *   }
 * })
 *
 * // Handle events
 * loop.dispatch({ type: "server_ready" })
 * loop.dispatch({ type: "toggle_pause" })
 * ```
 */
export function useLoopState(): UseLoopStateReturn {
  const [state, setState] = createSignal<LoopState>({ type: "starting" })
  const [showingQuitConfirmation, setShowingQuitConfirmation] =
    createSignal(false)

  /**
   * Dispatch an action to the state machine
   */
  function dispatch(action: LoopAction): void {
    setState((current) => loopReducer(current, action))
  }

  // Derived state helpers using memos for efficiency
  const isReady = createMemo(() => {
    return state().type === "ready"
  })

  const isRunning = createMemo(() => {
    const s = state()
    return s.type === "running" || s.type === "pausing"
  })

  const isPaused = createMemo(() => {
    return state().type === "paused"
  })

  const isPausing = createMemo(() => {
    return state().type === "pausing"
  })

  const isError = createMemo(() => {
    return state().type === "error"
  })

  const isDebug = createMemo(() => {
    return state().type === "debug"
  })

  const canPause = createMemo(() => {
    const s = state()
    // Can pause when running
    if (s.type === "running") return true
    // Can resume when paused
    if (s.type === "paused") return true
    return false
  })

  const canStart = createMemo(() => {
    return state().type === "ready"
  })

  const canQuit = createMemo(() => {
    const s = state()
    // Can quit from ready state (before iterations start)
    if (s.type === "ready") return true
    // Can quit from running or paused states
    if (s.type === "running") return true
    if (s.type === "paused") return true
    // Can quit from debug state
    if (s.type === "debug") return true
    // Can quit from error state
    if (s.type === "error") return true
    return false
  })

  const canRetry = createMemo(() => {
    const s = state()
    return s.type === "error" && s.recoverable
  })

  const iteration = createMemo(() => {
    const s = state()
    if (s.type === "running") return s.iteration
    if (s.type === "pausing") return s.iteration
    if (s.type === "paused") return s.iteration
    if (s.type === "complete") return s.iterations
    return 0
  })

  /**
   * Show the quit confirmation modal
   */
  function showQuitConfirmation(): void {
    if (canQuit()) {
      setShowingQuitConfirmation(true)
    }
  }

  /**
   * Hide the quit confirmation modal
   */
  function hideQuitConfirmation(): void {
    setShowingQuitConfirmation(false)
  }

  return {
    state,
    dispatch,
    isReady,
    isRunning,
    isPaused,
    isPausing,
    isError,
    isDebug,
    canStart,
    canPause,
    canQuit,
    canRetry,
    iteration,
    showingQuitConfirmation,
    showQuitConfirmation,
    hideQuitConfirmation,
  }
}
