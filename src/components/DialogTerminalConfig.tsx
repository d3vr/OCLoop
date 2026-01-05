import { createSignal, createMemo, Show, type Accessor } from "solid-js"
import { useInput } from "../hooks/useInput"
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
 * Handles its own input via useInput
 */
function CustomTerminalForm(props: {
  state: TerminalConfigState
  onCancel: () => void
}) {
  const { theme } = useTheme()
  const s = props.state

  useInput((input, key) => {
    // Tab - switch between inputs
    if (key.name === "tab") {
      s.setActiveInput(s.activeInput() === "command" ? "args" : "command")
      return
    }
    // Enter - save
    if (key.name === "return" || key.name === "enter") {
      s.onSaveCustom()
      return
    }
    // Escape - cancel (go back to list)
    if (key.name === "escape") {
      props.onCancel()
      return
    }
    // Backspace
    if (key.name === "backspace") {
      if (s.activeInput() === "command") {
        s.setCustomCommand(s.customCommand().slice(0, -1))
      } else {
        s.setCustomArgs(s.customArgs().slice(0, -1))
      }
      return
    }
    // Typed characters
    if (input.length === 1 && input.charCodeAt(0) >= 32 && input.charCodeAt(0) < 127) {
      if (s.activeInput() === "command") {
        s.setCustomCommand(s.customCommand() + input)
      } else {
        s.setCustomArgs(s.customArgs() + input)
      }
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
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().textMuted }}>Command: </span>
          <span
            style={{
              fg: s.activeInput() === "command" ? theme().text : theme().textMuted,
              bg: s.activeInput() === "command" ? theme().backgroundElement : undefined,
            }}
          >
            {s.customCommand() || " "}
            {s.activeInput() === "command" && <span style={{ fg: theme().primary }}>_</span>}
          </span>
        </text>

        {/* Args input */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().textMuted }}>Args:    </span>
          <span
            style={{
              fg: s.activeInput() === "args" ? theme().text : theme().textMuted,
              bg: s.activeInput() === "args" ? theme().backgroundElement : undefined,
            }}
          >
            {s.customArgs() || " "}
            {s.activeInput() === "args" && <span style={{ fg: theme().primary }}>_</span>}
          </span>
        </text>

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
