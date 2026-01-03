import { createSignal, createMemo } from "solid-js"
import type { LoopState, LoopAction } from "../types"

/**
 * Return type for the useLoopState hook
 */
export interface UseLoopStateReturn {
  state: () => LoopState
  dispatch: (action: LoopAction) => void

  // Derived state
  isAttached: () => boolean
  isRunning: () => boolean
  isPaused: () => boolean
  isPausing: () => boolean
  canPause: () => boolean
  canQuit: () => boolean
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
      // Only transition from starting to running
      if (state.type === "starting") {
        return { type: "running", attached: false, iteration: 0, sessionId: "" }
      }
      return state
    }

    case "iteration_started": {
      // Set the session ID when an iteration starts
      if (state.type === "running") {
        return {
          type: "running",
          attached: state.attached,
          iteration: state.iteration + 1,
          sessionId: action.sessionId,
        }
      }
      // Can also start iteration from paused state (resume)
      if (state.type === "paused") {
        return {
          type: "running",
          attached: false,
          iteration: state.iteration + 1,
          sessionId: action.sessionId,
        }
      }
      return state
    }

    case "toggle_attach": {
      // Toggle attach/detach in running or paused states
      if (state.type === "running") {
        return {
          type: "running",
          attached: !state.attached,
          iteration: state.iteration,
          sessionId: state.sessionId,
        }
      }
      if (state.type === "paused") {
        return {
          type: "paused",
          attached: !state.attached,
          iteration: state.iteration,
        }
      }
      return state
    }

    case "toggle_pause": {
      // Only allow pause toggle when detached
      if (state.type === "running" && !state.attached) {
        // Transition to pausing - will complete when session becomes idle
        return {
          type: "pausing",
          iteration: state.iteration,
          sessionId: state.sessionId,
        }
      }
      if (state.type === "paused" && !state.attached) {
        // Resume - will need iteration_started to set sessionId
        return {
          type: "running",
          attached: false,
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
          attached: false,
          iteration: state.iteration,
          sessionId: "",
        }
      }
      if (state.type === "pausing") {
        // Complete the pause transition
        return {
          type: "paused",
          attached: false,
          iteration: state.iteration,
        }
      }
      return state
    }

    case "quit": {
      // Transition to stopping from any active state
      if (
        state.type === "running" ||
        state.type === "paused" ||
        state.type === "pausing"
      ) {
        return { type: "stopping" }
      }
      return state
    }

    case "plan_complete": {
      // Transition to complete state
      if (state.type === "running" || state.type === "paused") {
        const iterations =
          state.type === "running" ? state.iteration : state.iteration
        return { type: "complete", iterations }
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
 * loop.dispatch({ type: "toggle_attach" })
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
  const isAttached = createMemo(() => {
    const s = state()
    if (s.type === "running") return s.attached
    if (s.type === "paused") return s.attached
    return false
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

  const canPause = createMemo(() => {
    const s = state()
    // Can only pause when running and detached
    if (s.type === "running" && !s.attached) return true
    // Can resume when paused and detached
    if (s.type === "paused" && !s.attached) return true
    return false
  })

  const canQuit = createMemo(() => {
    const s = state()
    // Can quit when detached in running or paused states
    if (s.type === "running" && !s.attached) return true
    if (s.type === "paused" && !s.attached) return true
    return false
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
    isAttached,
    isRunning,
    isPaused,
    isPausing,
    canPause,
    canQuit,
    iteration,
    showingQuitConfirmation,
    showQuitConfirmation,
    hideQuitConfirmation,
  }
}
