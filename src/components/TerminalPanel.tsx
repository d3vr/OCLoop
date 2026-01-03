import type { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"

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
   * Whether the terminal should be dimmed (when detached)
   */
  dimmed: boolean
}

/**
 * TerminalPanel component
 *
 * Wraps the ghostty-terminal component with:
 * - Border styling
 * - Opacity based on dimmed state
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
 *   dimmed={!isAttached()}
 * />
 *
 * // Later, to feed data:
 * terminalRef?.feed(ptyOutput)
 * ```
 */
export function TerminalPanel(props: TerminalPanelProps) {
  return (
    <box
      style={{
        border: true,
        borderStyle: "single",
        borderColor: props.dimmed ? "gray" : "cyan",
        flexGrow: 1,
        opacity: props.dimmed ? 0.7 : 1,
        overflow: "hidden",
      }}
    >
      <ghostty-terminal
        ref={props.terminalRef}
        cols={props.cols}
        rows={props.rows}
        persistent={true}
        showCursor={!props.dimmed}
        cursorStyle="block"
      />
    </box>
  )
}
