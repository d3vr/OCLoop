/**
 * Dialog Terminal Config Component
 *
 * First-time terminal configuration dialog that:
 * - Shows a list of detected/installed terminal emulators
 * - Allows selection of a known terminal or custom configuration
 * - Provides option to copy the attach command to clipboard
 *
 * Uses the Dialog component for consistent styling.
 * 
 * Note: Input handling is delegated to the parent component (App.tsx)
 * which uses renderer.prependInputHandler for consistent key handling.
 * The parent should call handleInput() to process key sequences.
 */

import { createSignal, For, Show } from "solid-js"
import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"
import type { KnownTerminal } from "../lib/terminal-launcher"

/**
 * View state for the dialog
 */
export type TerminalConfigViewState = "list" | "custom"

/**
 * State exposed by the dialog for input handling
 */
export interface TerminalConfigState {
  viewState: () => TerminalConfigViewState
  selectedIndex: () => number
  customCommand: () => string
  customArgs: () => string
  activeInput: () => "command" | "args"
  listItems: () => Array<KnownTerminal | { name: string; command: string; args: string[] }>
  handleInput: (sequence: string) => boolean
}

/**
 * Props for the DialogTerminalConfig component
 */
export interface DialogTerminalConfigProps {
  /** The state object containing view logic and input handlers */
  state: TerminalConfigState
  /** Callback when dialog should close (e.g. clicking outside) */
  onCancel: () => void
}

/**
 * Create state and input handling for terminal config dialog
 * 
 * This function creates the reactive state and returns handlers
 * that can be called from the parent's input handler.
 */
export function createTerminalConfigState(
  availableTerminals: () => KnownTerminal[],
  onSelect: (terminal: KnownTerminal) => void,
  onCustom: (command: string, args: string) => void,
  onCopy: () => void,
  onCancel: () => void,
): TerminalConfigState {
  const [viewState, setViewState] = createSignal<TerminalConfigViewState>("list")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [customCommand, setCustomCommand] = createSignal("")
  const [customArgs, setCustomArgs] = createSignal("-e {cmd}")
  const [activeInput, setActiveInput] = createSignal<"command" | "args">("command")

  // List items: available terminals + "Custom..." option
  const listItems = () => [
    ...availableTerminals(),
    { name: "Custom...", command: "", args: [] as string[] },
  ]

  // Handle key input for list view
  const handleListInput = (sequence: string): boolean => {
    const items = listItems()
    const maxIndex = items.length - 1

    // Arrow up or k
    if (sequence === "\x1b[A" || sequence === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1))
      return true
    }
    // Arrow down or j
    if (sequence === "\x1b[B" || sequence === "j") {
      setSelectedIndex((i) => Math.min(maxIndex, i + 1))
      return true
    }
    // Enter
    if (sequence === "\r" || sequence === "\n") {
      const selected = items[selectedIndex()]
      if (selected.name === "Custom...") {
        setViewState("custom")
      } else {
        onSelect(selected as KnownTerminal)
      }
      return true
    }
    // C - copy command
    if (sequence === "c" || sequence === "C") {
      onCopy()
      return true
    }
    // Escape
    if (sequence === "\x1b") {
      onCancel()
      return true
    }
    return true // Consume all other input
  }

  // Handle key input for custom view
  const handleCustomInput = (sequence: string): boolean => {
    // Tab - switch between inputs
    if (sequence === "\t") {
      setActiveInput((current) => (current === "command" ? "args" : "command"))
      return true
    }
    // Enter - save if command is set
    if (sequence === "\r" || sequence === "\n") {
      if (customCommand().trim()) {
        onCustom(customCommand().trim(), customArgs().trim())
      }
      return true
    }
    // Escape - go back to list
    if (sequence === "\x1b") {
      setViewState("list")
      return true
    }
    // Backspace
    if (sequence === "\x7f" || sequence === "\b") {
      if (activeInput() === "command") {
        setCustomCommand((c) => c.slice(0, -1))
      } else {
        setCustomArgs((a) => a.slice(0, -1))
      }
      return true
    }
    // Printable characters
    if (sequence.length === 1 && sequence.charCodeAt(0) >= 32 && sequence.charCodeAt(0) < 127) {
      if (activeInput() === "command") {
        setCustomCommand((c) => c + sequence)
      } else {
        setCustomArgs((a) => a + sequence)
      }
      return true
    }
    return true // Consume all other input
  }

  // Combined input handler
  const handleInput = (sequence: string): boolean => {
    if (viewState() === "list") {
      return handleListInput(sequence)
    } else {
      return handleCustomInput(sequence)
    }
  }

  return {
    viewState,
    selectedIndex,
    customCommand,
    customArgs,
    activeInput,
    listItems,
    handleInput,
  }
}

/**
 * DialogTerminalConfig Component
 *
 * Shows a terminal selection dialog for first-time configuration.
 * Includes list navigation, custom terminal input, and copy option.
 *
 * @example
 * ```tsx
 * <DialogTerminalConfig
 *   state={terminalConfigState}
 *   onCancel={() => closeDialog()}
 * />
 * ```
 */
export function DialogTerminalConfig(props: DialogTerminalConfigProps) {
  const { theme } = useTheme()
  const state = props.state

  // Calculate dialog dimensions
  const dialogWidth = 55
  const dialogHeight = () => {
    if (state.viewState() === "custom") {
      return 12 // Title + fields + help + footer + padding
    }
    // List view: title + items + divider + footer
    const itemCount = Math.min(state.listItems().length, 10) // Cap visible items
    return Math.max(10, itemCount + 6)
  }

  return (
    <Dialog onClose={props.onCancel} title="" width={dialogWidth} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        <Show when={state.viewState() === "list"} fallback={
          // Custom terminal view
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
                  fg: state.activeInput() === "command" ? theme().text : theme().textMuted,
                  bg: state.activeInput() === "command" ? theme().backgroundElement : undefined,
                }}
              >
                {state.customCommand() || " "}
                {state.activeInput() === "command" && <span style={{ fg: theme().primary }}>_</span>}
              </span>
            </text>

            {/* Args input */}
            <text style={{ marginTop: 1 }}>
              <span style={{ fg: theme().textMuted }}>Args:    </span>
              <span
                style={{
                  fg: state.activeInput() === "args" ? theme().text : theme().textMuted,
                  bg: state.activeInput() === "args" ? theme().backgroundElement : undefined,
                }}
              >
                {state.customArgs() || " "}
                {state.activeInput() === "args" && <span style={{ fg: theme().primary }}>_</span>}
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
              <span style={{ fg: theme().text }}>[Enter]</span>
              <span style={{ fg: theme().textMuted }}> save  </span>
              <span style={{ fg: theme().text }}>[Tab]</span>
              <span style={{ fg: theme().textMuted }}> switch  </span>
              <span style={{ fg: theme().text }}>[Esc]</span>
              <span style={{ fg: theme().textMuted }}> back</span>
            </text>
          </box>
        }>
          {/* List view */}
          <box style={{ flexDirection: "column" }}>
            {/* Title */}
            <text>
              <span style={{ fg: theme().primary, bold: true }}>Configure Terminal</span>
            </text>

            {/* Terminal list */}
            <box style={{ marginTop: 1, flexDirection: "column" }}>
              <For each={state.listItems()}>
                {(item, index) => {
                  const isSelected = () => index() === state.selectedIndex()
                  const isCustomOption = () => item.name === "Custom..."

                  return (
                    <>
                      {/* Divider before Custom option */}
                      <Show when={isCustomOption()}>
                        <text>
                          <span style={{ fg: theme().border }}>
                            {"─".repeat(dialogWidth - 6)}
                          </span>
                        </text>
                      </Show>
                      <text>
                        <span
                          style={{
                            fg: isSelected() ? theme().primary : theme().text,
                            bold: isSelected(),
                            bg: isSelected() ? theme().backgroundElement : undefined,
                          }}
                        >
                          {isSelected() ? " > " : "   "}
                          {item.name}
                        </span>
                      </text>
                    </>
                  )
                }}
              </For>
            </box>

            {/* Footer */}
            <text style={{ marginTop: 1 }}>
              <span style={{ fg: theme().text }}>[Enter]</span>
              <span style={{ fg: theme().textMuted }}> select  </span>
              <span style={{ fg: theme().text }}>[C]</span>
              <span style={{ fg: theme().textMuted }}> copy cmd  </span>
              <span style={{ fg: theme().text }}>[Esc]</span>
              <span style={{ fg: theme().textMuted }}> cancel</span>
            </text>
          </box>
        </Show>
      </box>
    </Dialog>
  )
}
