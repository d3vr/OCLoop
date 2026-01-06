import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"
import { getConfigPath } from "../lib/config"
import { useKeyboard } from "@opentui/solid"

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
 */
export function DialogTerminalError(props: DialogTerminalErrorProps) {
  const { theme } = useTheme()

  useKeyboard((key) => {
    // C - copy
    if (key.name === "c" || key.sequence === "C") {
      props.onCopy()
      return
    }
    // Escape or Enter - close
    if (key.name === "escape" || key.name === "return") {
      props.onClose()
      return
    }
  })

  // Calculate dialog height based on content
  const dialogHeight = () => {
    // Base: header + error line + config hint + command + footer + padding
    let height = 11

    // Add extra height for longer error messages
    const messageLines = Math.ceil(props.errorMessage.length / 50)
    if (messageLines > 1) {
      height += messageLines - 1
    }

    return Math.max(11, height)
  }

  const configPath = getConfigPath()

  return (
    <Dialog onClose={props.onClose} width={60} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        {/* Header */}
        <box style={{ width: "100%", justifyContent: "space-between", marginBottom: 1 }}>
          <text>
            <span style={{ fg: theme().error, bold: true }}>Terminal Launch Failed</span>
          </text>
          <text>
            <span style={{ fg: theme().textMuted }}>esc</span>
          </text>
        </box>

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
          <span style={{ bold: true }}>Copy</span> C
          <span style={{ fg: theme().textMuted }}>  </span>
          <span style={{ bold: true }}>Close</span> esc
        </text>
      </box>
    </Dialog>
  )
}
