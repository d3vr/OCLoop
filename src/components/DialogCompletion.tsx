/**
 * Dialog Completion Component
 *
 * Displays a summary dialog when a plan completes, showing:
 * - Total iterations and time
 * - Manual tasks that need human attention
 * - Blocked tasks that couldn't be completed
 *
 * Uses the Dialog component for consistent styling.
 */

import { For, Show } from "solid-js"
import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"
import { formatDuration } from "../hooks/useLoopStats"

/**
 * Props for the DialogCompletion component
 */
export interface DialogCompletionProps {
  /** Number of iterations completed */
  iterations: number
  /** Total time in milliseconds */
  totalTime: number
  /** List of tasks marked as [MANUAL] */
  manualTasks: string[]
  /** List of tasks marked as [BLOCKED: reason] */
  blockedTasks: string[]
  /** Callback when dialog should close */
  onClose: () => void
}

/**
 * DialogCompletion Component
 *
 * Shows a completion summary with iteration count, total time,
 * and any remaining manual or blocked tasks.
 *
 * @example
 * ```tsx
 * <DialogCompletion
 *   iterations={5}
 *   totalTime={300000}
 *   manualTasks={["Test the UI manually"]}
 *   blockedTasks={["Deploy to prod - needs CI token"]}
 *   onClose={() => dialog.clear()}
 * />
 * ```
 */
export function DialogCompletion(props: DialogCompletionProps) {
  const { theme } = useTheme()

  const hasRemainingTasks = () =>
    props.manualTasks.length > 0 || props.blockedTasks.length > 0

  // Calculate dialog height based on content
  const dialogHeight = () => {
    let height = 6 // Base: title + summary + footer + padding
    if (props.manualTasks.length > 0) {
      height += 1 + props.manualTasks.length // Header + items
    }
    if (props.blockedTasks.length > 0) {
      height += 1 + props.blockedTasks.length // Header + items
    }
    if (!hasRemainingTasks()) {
      height += 1 // "All automatable tasks finished" message
    }
    return Math.max(8, height)
  }

  return (
    <Dialog onClose={props.onClose} title="" width={60} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        {/* Title with checkmark */}
        <text>
          <span style={{ fg: theme().success, bold: true }}>✓</span>
          <span style={{ fg: theme().primary, bold: true }}> Plan Complete</span>
        </text>

        {/* Summary line */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().textMuted }}>Completed in </span>
          <span style={{ fg: theme().text }}>{props.iterations}</span>
          <span style={{ fg: theme().textMuted }}> iteration{props.iterations !== 1 ? "s" : ""} (</span>
          <span style={{ fg: theme().text }}>{formatDuration(props.totalTime)}</span>
          <span style={{ fg: theme().textMuted }}>)</span>
        </text>

        {/* Manual tasks section */}
        <Show when={props.manualTasks.length > 0}>
          <text style={{ marginTop: 1 }}>
            <span style={{ fg: theme().warning, bold: true }}>Manual Tasks</span>
          </text>
          <For each={props.manualTasks}>
            {(task) => (
              <text>
                <span style={{ fg: theme().textMuted }}>  • </span>
                <span style={{ fg: theme().text }}>{task}</span>
              </text>
            )}
          </For>
        </Show>

        {/* Blocked tasks section */}
        <Show when={props.blockedTasks.length > 0}>
          <text style={{ marginTop: 1 }}>
            <span style={{ fg: theme().error, bold: true }}>Blocked Tasks</span>
          </text>
          <For each={props.blockedTasks}>
            {(task) => (
              <text>
                <span style={{ fg: theme().textMuted }}>  • </span>
                <span style={{ fg: theme().text }}>{task}</span>
              </text>
            )}
          </For>
        </Show>

        {/* No remaining tasks message */}
        <Show when={!hasRemainingTasks()}>
          <text style={{ marginTop: 1 }}>
            <span style={{ fg: theme().success }}>All automatable tasks finished.</span>
          </text>
        </Show>

        {/* Footer */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().textMuted }}>Press Q to exit</span>
        </text>
      </box>
    </Dialog>
  )
}
