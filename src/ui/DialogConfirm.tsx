import { createSignal } from "solid-js"
import { useInput } from "../hooks/useInput"
import { Dialog } from "./Dialog"
import { useTheme, selectedForeground } from "../context/ThemeContext"
import { DialogContextValue } from "../context/DialogContext"

export interface DialogConfirmProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export function DialogConfirm(props: DialogConfirmProps) {
  const { theme } = useTheme()
  const [activeButton, setActiveButton] = createSignal<"cancel" | "confirm">("confirm")

  // Handle keyboard input
  useInput((input, key) => {
    // Escape handled by Dialog backdrop/onClose
    if (key.name === "escape") {
      if (props.onCancel) props.onCancel()
      return
    }

    if (key.name === "return" || key.name === "enter") {
      if (activeButton() === "confirm") {
        if (props.onConfirm) props.onConfirm()
      } else {
        if (props.onCancel) props.onCancel()
      }
      return
    }

    if (key.name === "left" || key.name === "right") {
      setActiveButton(prev => prev === "confirm" ? "cancel" : "confirm")
    }
  })

  return (
    <Dialog 
      onClose={() => props.onCancel && props.onCancel()} 
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

      {/* Buttons */}
      <box style={{ width: "100%", justifyContent: "flex-end", gap: 2 }}>
        {/* Cancel Button */}
        <box
          style={{
            paddingLeft: 1,
            paddingRight: 1,
            backgroundColor: activeButton() === "cancel" ? theme().primary : undefined,
          }}
          onMouseUp={() => {
            setActiveButton("cancel")
            if (props.onCancel) props.onCancel()
          }}
        >
          <text>
            <span style={{ 
              fg: activeButton() === "cancel" ? selectedForeground(theme()) : theme().textMuted 
            }}>
              {props.cancelLabel || "Cancel"}
            </span>
          </text>
        </box>

        {/* Confirm Button */}
        <box
          style={{
            paddingLeft: 1,
            paddingRight: 1,
            backgroundColor: activeButton() === "confirm" ? theme().primary : undefined,
          }}
          onMouseUp={() => {
            setActiveButton("confirm")
            if (props.onConfirm) props.onConfirm()
          }}
        >
          <text>
            <span style={{ 
              fg: activeButton() === "confirm" ? selectedForeground(theme()) : theme().textMuted 
            }}>
              {props.confirmLabel || "Confirm"}
            </span>
          </text>
        </box>
      </box>
    </Dialog>
  )
}

/**
 * Static helper to show a confirmation dialog
 */
DialogConfirm.show = (
  dialog: DialogContextValue, 
  title: string, 
  message: string, 
  options: Partial<Omit<DialogConfirmProps, "title" | "message" | "onConfirm" | "onCancel">> = {}
): Promise<boolean> => {
  return new Promise((resolve) => {
    dialog.show(() => (
      <DialogConfirm
        title={title}
        message={message}
        {...options}
        onConfirm={() => {
          dialog.pop()
          resolve(true)
        }}
        onCancel={() => {
          dialog.pop()
          resolve(false)
        }}
      />
    ))
  })
}
