/**
 * Dialog Terminal Error Component
 *
 * Displays an error dialog when terminal launch fails, showing:
 * - Terminal name and error message
 * - Suggestion to edit config file
 * - Attach command for manual copy
 *
 * Uses the Dialog component for consistent styling.
 */

import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"
import { getConfigPath } from "../lib/config"

/**
 * Props for the DialogTerminalError component
 */
export interface DialogTerminalErrorProps {
  /** Name of the terminal that failed to launch */
  terminalName: string
  /** Error message from the launch attempt */
  errorMessage: string
  /** The attach command for manual use */
  attachCommand: string
  /** Callback when copy command is requested */
  onCopy: () => void
  /** Callback when dialog should close */
  onClose: () => void
}

/**
 * DialogTerminalError Component
 *
 * Shows an error dialog when terminal launch fails,
 * suggesting fixes and providing the attach command.
 *
 * @example
 * ```tsx
 * <DialogTerminalError
 *   terminalName="alacritty"
 *   errorMessage="Command not found: alacritty"
 *   attachCommand="opencode attach http://localhost:3000 --session abc123"
 *   onCopy={() => copyToClipboard()}
 *   onClose={() => closeDialog()}
 * />
 * ```
 */
export function DialogTerminalError(props: DialogTerminalErrorProps) {
  const { theme } = useTheme()

  // Calculate dialog height based on content
  const dialogHeight = () => {
    // Base: title + error line + config hint + command + footer + padding
    let height = 10

    // Add extra height for longer error messages
    const messageLines = Math.ceil(props.errorMessage.length / 50)
    if (messageLines > 1) {
      height += messageLines - 1
    }

    return Math.max(10, height)
  }

  const configPath = getConfigPath()

  return (
    <Dialog onClose={props.onClose} title="" width={60} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        {/* Title */}
        <text>
          <span style={{ fg: theme().error, bold: true }}>Terminal Launch Failed</span>
        </text>

        {/* Terminal name and error */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().backgroundElement, bg: theme().error }}> {props.terminalName} </span>
          <span style={{ fg: theme().text }}> {props.errorMessage}</span>
        </text>

        {/* Config hint */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().textMuted }}>Edit config: </span>
          <span style={{ fg: theme().accent }}>{configPath}</span>
        </text>

        {/* Attach command */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().textMuted }}>Attach command:</span>
        </text>
        <text>
          <span style={{ fg: theme().text }}>{props.attachCommand}</span>
        </text>

        {/* Footer */}
        <text style={{ marginTop: 2 }}>
          <span style={{ fg: theme().text }}>[C]</span>
          <span style={{ fg: theme().textMuted }}> copy command  </span>
          <span style={{ fg: theme().text }}>[Esc]</span>
          <span style={{ fg: theme().textMuted }}> close</span>
        </text>
      </box>
    </Dialog>
  )
}
