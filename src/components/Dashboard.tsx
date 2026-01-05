import { createMemo, Show } from "solid-js"
import type { LoopState, PlanProgress } from "../types"
import type { UseLoopStatsReturn } from "../hooks/useLoopStats"
import { formatDuration } from "../hooks/useLoopStats"
import { useTheme } from "../context/ThemeContext"
import { ProgressIndicator } from "./ProgressIndicator"

/**
 * Props for the Dashboard component
 */
export interface DashboardProps {
  isActive: boolean
  state: LoopState
  progress: PlanProgress | null
  stats: UseLoopStatsReturn
  currentTask: string | null
  model?: string
}

/**
 * Get the state badge display info
 */
function getStateBadge(state: LoopState): { icon: string; text: string; colorKey: "success" | "warning" | "error" | "info" | "primary" } {
  switch (state.type) {
    case "starting":
      return { icon: "◐", text: "STARTING", colorKey: "warning" }
    case "ready":
      return { icon: "●", text: "READY", colorKey: "info" }
    case "running":
      return { icon: "▶", text: "RUNNING", colorKey: "success" }
    case "pausing":
      return { icon: "◑", text: "PAUSING", colorKey: "warning" }
    case "paused":
      return { icon: "⏸", text: "PAUSED", colorKey: "warning" }
    case "stopping":
      return { icon: "◌", text: "STOPPING", colorKey: "error" }
    case "stopped":
      return { icon: "⏹", text: "STOPPED", colorKey: "error" }
    case "complete":
      return { icon: "✓", text: "COMPLETE", colorKey: "success" }
    case "error":
      return { icon: "!", text: "ERROR", colorKey: "error" }
    case "debug":
      return { icon: "⚙", text: "DEBUG", colorKey: "info" }
    default:
      return { icon: "?", text: "UNKNOWN", colorKey: "info" }
  }
}

/**
 * Dashboard component
 *
 * Fixed 4-row header that displays:
 * - Row 1: State badge + Iteration + Tasks progress bar
 * - Row 2: Timer (current) + Average + Estimated total
 * - Row 3: Current task (truncated if needed)
 * - Row 4: Keybind hints
 *
 * Uses theme colors and indicates active/inactive state via border styling.
 *
 * @example
 * ```tsx
 * <Dashboard
 *   isActive={true}
 *   state={loop.state()}
 *   progress={planProgress()}
 *   stats={stats}
 *   currentTask={currentTask()}
 * />
 * ```
 */
export function Dashboard(props: DashboardProps) {
  const { theme } = useTheme()

  // State badge info
  const badge = createMemo(() => getStateBadge(props.state))

  // Get iteration number
  const iteration = createMemo(() => {
    const state = props.state
    if (state.type === "running") return state.iteration
    if (state.type === "pausing") return state.iteration
    if (state.type === "paused") return state.iteration
    if (state.type === "complete") return state.iterations
    if (state.type === "debug") return 0
    return 0
  })

  // Calculate remaining tasks for ETA
  const remainingTasks = createMemo(() => {
    const progress = props.progress
    if (!progress) return 0
    return progress.automatable
  })

  // Format average time or return N/A
  const averageDisplay = createMemo(() => {
    const avg = props.stats.averageTime()
    return avg !== null ? formatDuration(avg) : "N/A"
  })

  // Format estimated total time or return N/A
  const estimatedDisplay = createMemo(() => {
    const remaining = remainingTasks()
    const estimate = props.stats.estimatedTotal(remaining)
    return estimate !== null ? formatDuration(estimate) : "N/A"
  })

  // Progress text: [4/12]
  const progressText = createMemo(() => {
    const progress = props.progress
    if (!progress) return null
    return `[${progress.completed}/${progress.total - progress.manual}]`
  })

  // Keybinding hints based on state
  const keybindHints = createMemo(() => {
    const state = props.state

    switch (state.type) {
      case "ready":
        return [
          { key: "S", desc: "start" },
          { key: "Q", desc: "quit" },
        ]
      case "running":
        return [
          { key: "T", desc: "terminal" },
          { key: "Space", desc: "pause" },
          { key: "Q", desc: "quit" },
        ]
      case "paused":
        return [
          { key: "T", desc: "terminal" },
          { key: "Space", desc: "resume" },
          { key: "Q", desc: "quit" },
        ]
      case "pausing":
        return [{ key: "", desc: "Waiting for task..." }]
      case "complete":
        return [{ key: "", desc: "Press any key to exit" }]
      case "error":
        if (state.recoverable) {
          return [
            { key: "R", desc: "retry" },
            { key: "Q", desc: "quit" },
          ]
        }
        return [{ key: "Q", desc: "quit" }]
      case "debug":
        // Detached in debug mode
        if (state.sessionId) {
          return [
            { key: "T", desc: "terminal" },
            { key: "N", desc: "new session" },
            { key: "Q", desc: "quit" },
          ]
        }
        // No active session
        return [
          { key: "N", desc: "new session" },
          { key: "Q", desc: "quit" },
        ]
      default:
        return []
    }
  })

  // Truncate current task if needed (rough estimate for terminal width)
  // In debug mode, show the session ID instead
  const truncatedTask = createMemo(() => {
    const state = props.state
    
    // In debug mode, show session ID if available
    if (state.type === "debug") {
      if (state.sessionId) {
        // Truncate session ID if too long
        const maxLen = 20
        const sessionId = state.sessionId
        if (sessionId.length <= maxLen) return `Session: ${sessionId}`
        return `Session: ${sessionId.substring(0, maxLen - 3)}...`
      }
      return null
    }
    
    const task = props.currentTask
    if (!task) return null
    const maxLen = 60 // Reasonable default, could be dynamic
    if (task.length <= maxLen) return task
    return task.substring(0, maxLen - 3) + "..."
  })

  // Border color based on active state
  const borderColor = createMemo(() =>
    props.isActive ? theme().primary : theme().borderSubtle
  )

  return (
    <box
      height={6}
      border={true}
      zIndex={props.isActive ? 2 : 1}
      borderStyle="single"
      borderColor={borderColor()}
      style={{
        flexDirection: "column",
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      {/* Row 1: State badge + Iteration + Progress */}
      <box style={{ flexDirection: "row" }}>
        {/* State badge */}
        <text>
          <span style={{ fg: theme()[badge().colorKey], bold: true }}>
            [{badge().icon} {badge().text}]
          </span>
        </text>

        {/* Model display */}
        <Show when={props.model}>
          <text style={{ marginLeft: 2 }}>
            <span style={{ fg: theme().textMuted }}>Model</span>
            <span style={{ fg: theme().text }}> {props.model}</span>
          </text>
        </Show>

        {/* Iteration counter */}
        <Show when={iteration() > 0}>
          <text style={{ marginLeft: 2 }}>
            <span style={{ fg: theme().textMuted }}>Iter</span>
            <span style={{ fg: theme().text }}> {iteration()}</span>
          </text>
        </Show>

        {/* Plan progress - hide in debug mode */}
        <Show when={props.progress && props.state.type !== "debug"}>
          <text style={{ marginLeft: 2 }}>
            <span style={{ fg: theme().textMuted }}>Tasks</span>
            <span style={{ fg: theme().primary }}> {progressText()}</span>
          </text>
          <box style={{ marginLeft: 1 }}>
            <ProgressIndicator
              completed={props.progress!.completed}
              total={props.progress!.total - props.progress!.manual}
              width={10}
            />
          </box>
        </Show>
      </box>

      {/* Row 2: Timing stats */}
      <box style={{ flexDirection: "row" }}>
        <text>
          <span style={{ fg: theme().textMuted }}>Time</span>
          <span style={{ fg: theme().text }}> {formatDuration(props.stats.elapsedTime())}</span>
        </text>

        <text style={{ marginLeft: 2 }}>
          <span style={{ fg: theme().textMuted }}>Avg</span>
          <span style={{ fg: theme().text }}> {averageDisplay()}</span>
        </text>

        <text style={{ marginLeft: 2 }}>
          <span style={{ fg: theme().textMuted }}>ETA</span>
          <span style={{ fg: theme().text }}> {estimatedDisplay()}</span>
        </text>
      </box>

      {/* Row 3: Current task */}
      <box style={{ flexDirection: "row" }}>
        <Show when={truncatedTask()} fallback={
          <text>
            <span style={{ fg: theme().textMuted }}>Task: </span>
            <span style={{ fg: theme().textMuted, italic: true }}>waiting...</span>
          </text>
        }>
          <text>
            <span style={{ fg: theme().textMuted }}>Task: </span>
            <span style={{ fg: theme().text }}>{truncatedTask()}</span>
          </text>
        </Show>
      </box>

      {/* Row 4: Keybind hints */}
      <box style={{ flexDirection: "row" }}>
        {keybindHints().map((hint, i) => (
          <>
            {i > 0 && <text style={{ marginLeft: 2 }}> </text>}
            <text>
              <Show when={hint.key}>
                <span style={{ fg: theme().text }}>{hint.key}</span>
                <span style={{ fg: theme().textMuted }}> {hint.desc}</span>
              </Show>
              <Show when={!hint.key}>
                <span style={{ fg: theme().textMuted }}>{hint.desc}</span>
              </Show>
            </text>
          </>
        ))}
      </box>
    </box>
  )
}
