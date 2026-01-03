import { createMemo, Show } from "solid-js"
import type { LoopState, PlanProgress } from "../types"
import { ProgressIndicator } from "./ProgressIndicator"

/**
 * Props for the StatusBar component
 */
export interface StatusBarProps {
  state: () => LoopState
  planProgress: () => PlanProgress | null
  currentTask?: () => string | undefined
  isAttached: () => boolean
}

/**
 * Get the state indicator icon and text based on loop state
 */
function getStateDisplay(state: LoopState): { icon: string; text: string; color: string } {
  switch (state.type) {
    case "starting":
      return { icon: "◐", text: "STARTING", color: "yellow" }
    case "running":
      return { icon: "▶", text: "RUNNING", color: "green" }
    case "pausing":
      return { icon: "◑", text: "PAUSING...", color: "yellow" }
    case "paused":
      return { icon: "⏸", text: "PAUSED", color: "yellow" }
    case "stopping":
      return { icon: "◌", text: "STOPPING", color: "red" }
    case "stopped":
      return { icon: "⏹", text: "STOPPED", color: "red" }
    case "complete":
      return { icon: "✓", text: "COMPLETE", color: "cyan" }
    default:
      return { icon: "?", text: "UNKNOWN", color: "gray" }
  }
}

/**
 * StatusBar component
 *
 * Displays the current state of the OCLoop harness including:
 * - State indicator (▶ RUNNING, ⏸ PAUSED, ✓ COMPLETE)
 * - Iteration number
 * - Plan progress (e.g., [4/12] with progress bar)
 * - Current task description (truncated)
 * - Keybinding hints (context-sensitive)
 *
 * @example
 * ```tsx
 * <StatusBar
 *   state={loopState.state}
 *   planProgress={planProgress}
 *   currentTask={() => "Implement StatusBar"}
 *   isAttached={loopState.isAttached}
 * />
 * ```
 */
export function StatusBar(props: StatusBarProps) {
  // Derive state display info
  const stateDisplay = createMemo(() => getStateDisplay(props.state()))

  // Get iteration number from state
  const iteration = createMemo(() => {
    const state = props.state()
    if (state.type === "running") return state.iteration
    if (state.type === "pausing") return state.iteration
    if (state.type === "paused") return state.iteration
    if (state.type === "complete") return state.iterations
    return 0
  })

  // Determine which keybindings to show
  const keybindingHints = createMemo(() => {
    const state = props.state()
    const attached = props.isAttached()

    if (attached) {
      return "[Ctrl+\\] Detach"
    }

    switch (state.type) {
      case "running":
        return "[Ctrl+\\] Attach  [Space] Pause  [Q] Quit"
      case "paused":
        return "[Ctrl+\\] Attach  [Space] Resume  [Q] Quit"
      case "pausing":
        return "Waiting for current task to complete..."
      case "complete":
        return "Press any key to exit"
      default:
        return ""
    }
  })

  // Progress display
  const progressText = createMemo(() => {
    const progress = props.planProgress()
    if (!progress) return null
    return `[${progress.completed}/${progress.total - progress.manual}]`
  })

  return (
    <box style={{ flexDirection: "column" }}>
      {/* Main status line */}
      <box style={{ flexDirection: "row" }}>
        {/* State indicator */}
        <text>
          <span style={{ fg: stateDisplay().color }}>
            [{stateDisplay().icon} {stateDisplay().text}]
          </span>
        </text>

        {/* Iteration counter */}
        <Show when={iteration() > 0}>
          <text style={{ marginLeft: 1 }}>
            <span style={{ fg: "white" }}>Iter {iteration()}</span>
          </text>
        </Show>

        {/* Plan progress */}
        <Show when={props.planProgress()}>
          <text style={{ marginLeft: 1 }}>
            <span style={{ fg: "white" }}>| Plan: </span>
            <span style={{ fg: "cyan" }}>{progressText()}</span>
          </text>
          <box style={{ marginLeft: 1 }}>
            <ProgressIndicator
              completed={props.planProgress()!.completed}
              total={props.planProgress()!.total - props.planProgress()!.manual}
              width={10}
            />
          </box>
        </Show>
      </box>

      {/* Keybinding hints line */}
      <box style={{ flexDirection: "row" }}>
        <text>
          <span style={{ fg: props.isAttached() ? "gray" : "white" }}>
            {keybindingHints()}
          </span>
        </text>
      </box>

      {/* Current task (optional, truncated) */}
      <Show when={props.currentTask?.()}>
        <box style={{ flexDirection: "row" }}>
          <text>
            <span style={{ fg: "gray" }}>Current: </span>
            <span style={{ fg: "white" }}>{props.currentTask!()}</span>
          </text>
        </box>
      </Show>
    </box>
  )
}
