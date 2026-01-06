import { createSignal } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { Dialog } from "./Dialog"
import { useTheme, selectedForeground } from "../context/ThemeContext"
import { DialogContextValue } from "../context/DialogContext"

export interface DialogAlertProps {
  title: string
  message: string
  onConfirm?: () => void
}

export function DialogAlert(props: DialogAlertProps) {
  const { theme } = useTheme()

  // Handle keyboard input
  useKeyboard((key) => {
    // Escape handled by Dialog backdrop/onClose
    if (key.name === "escape") {
      if (props.onConfirm) props.onConfirm()
      return
    }

    if (key.name === "return") {
      if (props.onConfirm) props.onConfirm()
      return
    }
  })

  return (
    <Dialog 
      onClose={() => props.onConfirm && props.onConfirm()} 
      width={50} 
      height={10}
    >
      {/* Header */}
      <box style={{ width: "100%", justifyContent: "space-between", marginBottom: 1 }}>
        <text>
          <span style={{ bold: true, fg: theme().text }}>{props.title}</span>
        </text>
        <text>
          <span style={{ fg: theme().textMuted }}>esc</span>
        </text>
      </box>

      {/* Message */}
      <box style={{ flexGrow: 1, marginBottom: 1 }}>
        <text>
          <span style={{ fg: theme().textMuted }}>{props.message}</span>
        </text>
      </box>

      {/* Button */}
      <box style={{ width: "100%", justifyContent: "flex-end" }}>
        <box
          style={{
            paddingLeft: 1,
            paddingRight: 1,
            backgroundColor: theme().primary,
          }}
          onMouseUp={() => {
            if (props.onConfirm) props.onConfirm()
          }}
        >
          <text>
            <span style={{ 
              fg: selectedForeground(theme())
            }}>
              OK
            </span>
          </text>
        </box>
      </box>
    </Dialog>
  )
}

/**
 * Static helper to show an alert dialog
 */
DialogAlert.show = (
  dialog: DialogContextValue, 
  title: string, 
  message: string
): Promise<void> => {
  return new Promise((resolve) => {
    dialog.show(() => (
      <DialogAlert
        title={title}
        message={message}
        onConfirm={() => {
          dialog.pop()
          resolve()
        }}
      />
    ))
  })
}
