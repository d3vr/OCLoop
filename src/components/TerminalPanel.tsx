import type { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"
import { useTheme } from "../context/ThemeContext"

/**
 * Props for the TerminalPanel component
 */
export interface TerminalPanelProps {
  /**
   * Reference to the ghostty terminal renderable.
   * This is set by the parent component and used to feed PTY output.
   */
  terminalRef: (el: GhosttyTerminalRenderable) => void
  /**
   * Number of columns for the terminal
   */
  cols: number
  /**
   * Number of rows for the terminal
   */
  rows: number
  /**
   * Whether the terminal panel is active (focused)
   * When active: bright border, full opacity, cursor shown
   * When inactive: subtle border, reduced opacity, cursor hidden
   */
  isActive: boolean
}

/**
 * TerminalPanel component
 *
 * Wraps the ghostty-terminal component with:
 * - Theme-aware border styling
 * - Opacity based on active state
 * - Proper sizing based on cols/rows
 *
 * The terminal is used in persistent mode for efficient streaming of PTY output.
 *
 * @example
 * ```tsx
 * let terminalRef: GhosttyTerminalRenderable | undefined
 *
 * <TerminalPanel
 *   terminalRef={(el) => terminalRef = el}
 *   cols={120}
 *   rows={30}
 *   isActive={isAttached()}
 * />
 *
 * // Later, to feed data:
 * terminalRef?.feed(ptyOutput)
 * ```
 */
export function TerminalPanel(props: TerminalPanelProps) {
  const { theme } = useTheme()

  return (
    <box
      style={{
        border: true,
        borderStyle: "single",
        borderColor: props.isActive ? theme().primary : theme().borderSubtle,
        flexGrow: 1,
        opacity: props.isActive ? 1 : 0.7,
        overflow: "hidden",
        marginTop: -1,
        zIndex: props.isActive ? 2 : 1,
      }}
    >
      <ghostty-terminal
        ref={props.terminalRef}
        cols={props.cols}
        rows={props.rows}
        persistent={true}
        showCursor={props.isActive}
        cursorStyle="block"
      />
    </box>
  )
}
