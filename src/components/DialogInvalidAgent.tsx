import { createSignal } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { Dialog } from "../ui/Dialog"
import { useTheme, selectedForeground } from "../context/ThemeContext"

export interface DialogInvalidAgentProps {
  agentName: string
  availableAgents: string[]
  defaultAgent?: string
  onUseDefault: () => void
  onQuit: () => void
}

export function DialogInvalidAgent(props: DialogInvalidAgentProps) {
  const { theme } = useTheme()
  const [activeButton, setActiveButton] = createSignal<"default" | "quit">("default")

  // Handle keyboard input
  useKeyboard((key) => {
    // Escape handled by Dialog backdrop/onClose
    if (key.name === "escape") {
      props.onQuit()
      return
    }

    if (key.name === "return") {
      if (activeButton() === "default") {
        props.onUseDefault()
      } else {
        props.onQuit()
      }
      return
    }

    if (key.name === "left" || key.name === "right") {
      setActiveButton(prev => prev === "default" ? "quit" : "default")
    }
  })

  return (
    <Dialog 
      onClose={() => props.onQuit()} 
      width={60} 
      height={14}
    >
      {/* Header */}
      <box style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
        <text>
          <span style={{ bold: true, fg: theme().text }}>Invalid Agent</span>
        </text>
        <text>
          <span style={{ fg: theme().textMuted }}>esc to quit</span>
        </text>
      </box>

      {/* Message */}
      <box style={{ flexGrow: 1, marginBottom: 1, flexDirection: "column" }}>
        <text>
          <span style={{ fg: theme().error }}>Agent "{props.agentName}" not found.</span>
        </text>
        
        <box style={{ marginTop: 1, flexDirection: "column" }}>
          <text>
            <span style={{ fg: theme().textMuted }}>Available agents:</span>
          </text>
          {props.availableAgents.map(agent => (
            <text>
              <span style={{ fg: theme().text }}>  - {agent}</span>
            </text>
          ))}
        </box>
      </box>

      {/* Buttons */}
      <box style={{ width: "100%", flexDirection: "row", justifyContent: "flex-end", gap: 2 }}>
        {/* Quit Button */}
        <box
          style={{
            paddingLeft: 1,
            paddingRight: 1,
            backgroundColor: activeButton() === "quit" ? theme().primary : undefined,
          }}
          onMouseUp={() => {
            setActiveButton("quit")
            props.onQuit()
          }}
        >
          <text>
            <span style={{ 
              fg: activeButton() === "quit" ? selectedForeground(theme()) : theme().textMuted 
            }}>
              Quit
            </span>
          </text>
        </box>

        {/* Use Default Button */}
        <box
          style={{
            paddingLeft: 1,
            paddingRight: 1,
            backgroundColor: activeButton() === "default" ? theme().primary : undefined,
          }}
          onMouseUp={() => {
            setActiveButton("default")
            props.onUseDefault()
          }}
        >
          <text>
            <span style={{ 
              fg: activeButton() === "default" ? selectedForeground(theme()) : theme().textMuted 
            }}>
              Use Default {props.defaultAgent ? `(${props.defaultAgent})` : ""}
            </span>
          </text>
        </box>
      </box>
    </Dialog>
  )
}
