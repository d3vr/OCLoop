import { createContext, useContext, createSignal, onCleanup, type JSX, type Accessor } from "solid-js"
import { useDialog } from "./DialogContext"
import { DialogSelect, type DialogSelectOption } from "../ui/DialogSelect"
import { useKeyboard } from "@opentui/solid"

export interface CommandOption extends DialogSelectOption {
  keybind?: string
}

export interface CommandContextValue {
  register: (factory: () => CommandOption[]) => void
  show: () => void
  trigger: (value: string) => void
  suspended: Accessor<boolean>
  keybinds: (enabled: boolean) => void
}

const CommandContext = createContext<CommandContextValue>()

export function CommandProvider(props: { children: JSX.Element }) {
  const dialog = useDialog()
  const [factories, setFactories] = createSignal<(() => CommandOption[])[]>([])
  const [suspended, setSuspended] = createSignal(false)

  const register = (factory: () => CommandOption[]) => {
    setFactories(prev => [...prev, factory])
    try {
      onCleanup(() => {
        setFactories(prev => prev.filter(f => f !== factory))
      })
    } catch (e) {
      // Not in a reactive scope with cleanup support
      console.warn("Command.register called outside of reactive scope, manual cleanup required (not implemented)")
    }
  }

  const getCommands = () => {
    return factories().flatMap(f => f())
  }

  const show = () => {
    dialog.show(() => (
      <DialogSelect
        title="Command Palette"
        placeholder="Type a command..."
        options={getCommands()}
        onClose={() => dialog.clear()}
        keybinds={[
          { label: "Select", key: "Enter" },
          { label: "Navigate", key: "↑/↓" }
        ]}
      />
    ))
  }

  const trigger = (value: string) => {
    const cmd = getCommands().find(c => c.value === value)
    if (cmd && !cmd.disabled) {
      if (cmd.onSelect) cmd.onSelect()
    }
  }

  useKeyboard((key) => {
    if (suspended()) return

    // Only handle if no dialogs are open
    if (!dialog.hasDialogs()) {
      if (key.ctrl && key.name === "p") {
        show()
      }
    }
  })

  const value: CommandContextValue = {
    register,
    show,
    trigger,
    suspended,
    keybinds: (enabled: boolean) => setSuspended(!enabled),
  }

  return (
    <CommandContext.Provider value={value}>
      {props.children}
    </CommandContext.Provider>
  )
}

export function useCommand() {
  const context = useContext(CommandContext)
  if (!context) throw new Error("useCommand must be used within CommandProvider")
  return context
}
