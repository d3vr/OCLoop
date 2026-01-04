/**
 * Dialog Error Component
 *
 * Displays an error dialog with:
 * - Error source and message
 * - Retry option (if error is recoverable)
 * - Quit option
 *
 * Uses the Dialog component for consistent styling.
 */

import { Show } from "solid-js"
import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"

/**
 * Props for the DialogError component
 */
export interface DialogErrorProps {
  /** Source of the error (e.g., "Server", "OpenCode", "Network") */
  source: string
  /** Error message to display */
  message: string
  /** Whether the error can be retried */
  recoverable: boolean
  /** Callback when retry is selected (only if recoverable) */
  onRetry?: () => void
  /** Callback when quit is selected */
  onQuit: () => void
}

/**
 * DialogError Component
 *
 * Shows an error dialog with the error source, message,
 * and appropriate action buttons based on recoverability.
 *
 * @example
 * ```tsx
 * <DialogError
 *   source="Server"
 *   message="Connection refused"
 *   recoverable={true}
 *   onRetry={() => retryConnection()}
 *   onQuit={() => process.exit(1)}
 * />
 * ```
 */
export function DialogError(props: DialogErrorProps) {
  const { theme } = useTheme()

  // Calculate dialog height based on content
  const dialogHeight = () => {
    // Base: title + source badge + message + actions + padding
    let height = 7

    // Add extra height for longer messages (rough estimate)
    const messageLines = Math.ceil(props.message.length / 50)
    if (messageLines > 1) {
      height += messageLines - 1
    }

    return Math.max(8, height)
  }

  return (
    <Dialog onClose={props.onQuit} title="" width={60} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        {/* Title */}
        <text>
          <span style={{ fg: theme().error, bold: true }}>Error</span>
        </text>

        {/* Source badge and message */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().backgroundElement, bg: theme().error }}> {props.source} </span>
          <span style={{ fg: theme().text }}> {props.message}</span>
        </text>

        {/* Actions */}
        <text style={{ marginTop: 2 }}>
          <Show when={props.recoverable}>
            <span style={{ fg: theme().text }}>[R]</span>
            <span style={{ fg: theme().textMuted }}> Retry  </span>
          </Show>
          <span style={{ fg: theme().text }}>[Q]</span>
          <span style={{ fg: theme().textMuted }}> Quit</span>
        </text>
      </box>
    </Dialog>
  )
}
