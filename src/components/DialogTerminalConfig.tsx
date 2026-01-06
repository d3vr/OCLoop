import { createSignal, createMemo, Show, type Accessor, onMount } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { InputRenderable } from "@opentui/core"
import { Dialog } from "../ui/Dialog"
import { DialogSelect, type DialogSelectOption } from "../ui/DialogSelect"
import { useTheme } from "../context/ThemeContext"
import type { KnownTerminal } from "../lib/terminal-launcher"

/**
 * View state for the dialog
 */
export type TerminalConfigViewState = "list" | "custom"

/**
 * State exposed by the dialog
 */
export interface TerminalConfigState {
  viewState: Accessor<TerminalConfigViewState>
  setViewState: (v: TerminalConfigViewState) => void
  
  // Custom form state
  customCommand: Accessor<string>
  setCustomCommand: (v: string) => void
  customArgs: Accessor<string>
  setCustomArgs: (v: string) => void
  activeInput: Accessor<"command" | "args">
  setActiveInput: (v: "command" | "args") => void
  
  // Actions
  onSelect: (terminal: KnownTerminal) => void
  onSaveCustom: () => void
  onCopy: () => void
  
  // Data
  availableTerminals: Accessor<KnownTerminal[]>
}

/**
 * Props for the DialogTerminalConfig component
 */
export interface DialogTerminalConfigProps {
  state: TerminalConfigState
  onCancel: () => void
}

/**
 * Create state for terminal config dialog
 */
export function createTerminalConfigState(
  availableTerminals: Accessor<KnownTerminal[]>,
  onSelect: (terminal: KnownTerminal) => void,
  onCustom: (command: string, args: string) => void,
  onCopy: () => void,
  onCancel: () => void,
): TerminalConfigState {
  const [viewState, setViewState] = createSignal<TerminalConfigViewState>("list")
  const [customCommand, setCustomCommand] = createSignal("")
  const [customArgs, setCustomArgs] = createSignal("-e {cmd}")
  const [activeInput, setActiveInput] = createSignal<"command" | "args">("command")

  const onSaveCustom = () => {
    if (customCommand().trim()) {
      onCustom(customCommand().trim(), customArgs().trim())
    }
  }

  return {
    viewState,
    setViewState,
    customCommand,
    setCustomCommand,
    customArgs,
    setCustomArgs,
    activeInput,
    setActiveInput,
    onSelect,
    onSaveCustom,
    onCopy,
    availableTerminals,
  }
}

/**
 * Internal component for Custom Terminal form
 * Handles its own input via useKeyboard
 */
function CustomTerminalForm(props: {
  state: TerminalConfigState
  onCancel: () => void
}) {
  const { theme } = useTheme()
  const s = props.state
  let commandInput: InputRenderable | undefined
  let argsInput: InputRenderable | undefined

  onMount(() => {
    setTimeout(() => {
      if (s.activeInput() === "command") {
        commandInput?.focus()
      } else {
        argsInput?.focus()
      }
    }, 10)
  })

  useKeyboard((key) => {
    // Tab - switch between inputs
    if (key.name === "tab") {
      key.preventDefault()
      if (s.activeInput() === "command") {
        s.setActiveInput("args")
        argsInput?.focus()
      } else {
        s.setActiveInput("command")
        commandInput?.focus()
      }
      return
    }
    // Enter - save
    if (key.name === "return") {
      key.preventDefault()
      s.onSaveCustom()
      return
    }
    // Escape - cancel (go back to list)
    if (key.name === "escape") {
      key.preventDefault()
      props.onCancel()
      return
    }
  })

  return (
    <Dialog onClose={props.onCancel} width={55} height={12}>
      <box style={{ flexDirection: "column" }}>
        {/* Title */}
        <text>
          <span style={{ fg: theme().primary, bold: true }}>Custom Terminal</span>
        </text>

        {/* Command input */}
        <box style={{ marginTop: 1 }}>
          <text>
            <span style={{ fg: theme().textMuted }}>Command: </span>
          </text>
          <input
            ref={commandInput}
            value={s.customCommand()}
            onInput={(v) => s.setCustomCommand(v)}
            focusedBackgroundColor={theme().backgroundElement}
            cursorColor={theme().primary}
            focusedTextColor={theme().text}
            width={40}
          />
        </box>

        {/* Args input */}
        <box style={{ marginTop: 1 }}>
          <text>
            <span style={{ fg: theme().textMuted }}>Args:    </span>
          </text>
          <input
            ref={argsInput}
            value={s.customArgs()}
            onInput={(v) => s.setCustomArgs(v)}
            focusedBackgroundColor={theme().backgroundElement}
            cursorColor={theme().primary}
            focusedTextColor={theme().text}
            width={40}
          />
        </box>

        {/* Help text */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().textMuted }}>
            Use {"{cmd}"} as placeholder for the attach command
          </span>
        </text>

        {/* Footer */}
        <text style={{ marginTop: 2 }}>
          <span style={{ fg: theme().text }}>Enter</span>
          <span style={{ fg: theme().textMuted }}> save  </span>
          <span style={{ fg: theme().text }}>Tab</span>
          <span style={{ fg: theme().textMuted }}> switch  </span>
          <span style={{ fg: theme().text }}>Esc</span>
          <span style={{ fg: theme().textMuted }}> back</span>
        </text>
      </box>
    </Dialog>
  )
}

/**
 * DialogTerminalConfig Component
 */
export function DialogTerminalConfig(props: DialogTerminalConfigProps) {
  const state = props.state

  // Transform available terminals to options
  const options = createMemo<DialogSelectOption[]>(() => {
    const terms = state.availableTerminals().map(t => ({
      title: t.name,
      value: t.name,
      category: "Installed Terminals",
      onSelect: () => state.onSelect(t)
    }))
    
    // Add Custom option
    terms.push({
      title: "Custom...",
      value: "custom",
      category: "Manual Configuration",
      onSelect: () => state.setViewState("custom")
    })
    return terms
  })

  // Keybinds for list view
  const keybinds = [
    { label: "Select", key: "Enter" },
    { label: "Navigate", key: "↑/↓" },
    { label: "Copy", key: "^C", onSelect: state.onCopy, bind: ["\x03"] }
  ]

  return (
    <Show 
      when={state.viewState() === "list"} 
      fallback={
        <CustomTerminalForm 
          state={state} 
          onCancel={() => state.setViewState("list")} 
        />
      }
    >
      <DialogSelect
        title="Configure Terminal"
        options={options()}
        onClose={props.onCancel}
        keybinds={keybinds}
      />
    </Show>
  )
}
