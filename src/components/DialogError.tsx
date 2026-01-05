import { Show } from "solid-js"
import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"

export interface DialogErrorProps {
  source: string
  message: string
  recoverable: boolean
  onRetry?: () => void
  onQuit: () => void
}

export function DialogError(props: DialogErrorProps) {
  const { theme } = useTheme()

  // Calculate dialog height based on content
  const dialogHeight = () => {
    // Base: header + source badge + message + actions + padding
    let height = 8

    // Add extra height for longer messages (rough estimate)
    const messageLines = Math.ceil(props.message.length / 50)
    if (messageLines > 1) {
      height += messageLines - 1
    }

    return Math.max(9, height)
  }

  return (
    <Dialog onClose={props.onQuit} width={60} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        {/* Header */}
        <box style={{ width: "100%", justifyContent: "space-between", marginBottom: 1 }}>
          <text>
            <span style={{ fg: theme().error, bold: true }}>Error</span>
          </text>
          <text>
            <span style={{ fg: theme().textMuted }}>esc</span>
          </text>
        </box>

        {/* Source badge and message */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().backgroundElement, bg: theme().error }}> {props.source} </span>
          <span style={{ fg: theme().text }}> {props.message}</span>
        </text>

        {/* Actions */}
        <text style={{ marginTop: 2 }}>
          <Show when={props.recoverable}>
            <span style={{ bold: true }}>Retry</span> R
            <span style={{ fg: theme().textMuted }}>  </span>
          </Show>
          <span style={{ bold: true }}>Quit</span> Q
        </text>
      </box>
    </Dialog>
  )
}
