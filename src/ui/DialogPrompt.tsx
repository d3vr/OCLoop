import { createSignal, onMount } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { InputRenderable } from "@opentui/core"
import { Dialog } from "./Dialog"
import { useTheme } from "../context/ThemeContext"

export interface DialogPromptProps {
  onSubmit: (text: string) => void
  onCancel: () => void
}

export function DialogPrompt(props: DialogPromptProps) {
  const { theme } = useTheme()
  const [value, setValue] = createSignal("")
  let inputRef: InputRenderable | undefined

  onMount(() => {
    setTimeout(() => {
      if (inputRef) {
        inputRef.focus()
      }
    }, 10)
  })

  // Handle keyboard input
  useKeyboard((key) => {
    // Escape handled by Dialog backdrop/onClose
    if (key.name === "escape") {
      props.onCancel()
      return true
    }

    if (key.name === "return") {
      props.onSubmit(value())
      return true
    }
  })

  return (
    <Dialog
      onClose={props.onCancel}
      width={60}
      height={8}
    >
      {/* Header */}
      <box style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
        <text>
          <span style={{ bold: true, fg: theme().text }}>Send Prompt</span>
        </text>
      </box>

      {/* Input */}
      <box style={{ flexGrow: 1, marginBottom: 1 }}>
        <input
          ref={inputRef}
          value={value()}
          onInput={setValue}
          focusedBackgroundColor={theme().backgroundElement}
          cursorColor={theme().primary}
          focusedTextColor={theme().text}
          width={58}
        />
      </box>

      {/* Footer hint */}
      <box style={{ width: "100%", flexDirection: "row", justifyContent: "flex-end" }}>
        <text>
          <span style={{ fg: theme().textMuted }}>Enter send  Esc cancel</span>
        </text>
      </box>
    </Dialog>
  )
}
