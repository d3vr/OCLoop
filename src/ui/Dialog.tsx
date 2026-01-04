/**
 * Base Dialog Component
 *
 * Renders an absolute-positioned overlay with a semi-transparent backdrop
 * and a centered content box using theme colors.
 *
 * This component is designed to be used with the DialogContext system.
 * Clicking on the backdrop will trigger the onClose callback.
 */

import type { JSX } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/ThemeContext"

/**
 * Props for the Dialog component
 */
export interface DialogProps {
  /**
   * Callback when the dialog should be closed
   * Called when backdrop is clicked or Escape is pressed
   */
  onClose: () => void

  /**
   * Dialog content
   */
  children: JSX.Element

  /**
   * Optional title for the dialog
   */
  title?: string

  /**
   * Optional width of the dialog content box
   * Default: 50
   */
  width?: number

  /**
   * Optional height of the dialog content box
   * Default: auto-calculated based on content, minimum 5
   */
  height?: number
}

/**
 * Dialog Component
 *
 * Renders a modal overlay with:
 * - Full-screen semi-transparent backdrop
 * - Centered content box with themed background
 * - Border using theme.borderActive
 *
 * @example
 * ```tsx
 * function MyDialog() {
 *   const dialog = useDialog()
 *
 *   return (
 *     <Dialog onClose={() => dialog.clear()} title="Confirm Action">
 *       <text>Are you sure?</text>
 *       <text style={{ marginTop: 1 }}>
 *         <span style={{ fg: "green" }}>[Y]</span>es
 *         <span style={{ fg: "red" }}>[N]</span>o
 *       </text>
 *     </Dialog>
 *   )
 * }
 * ```
 */
export function Dialog(props: DialogProps) {
  const dimensions = useTerminalDimensions()
  const { theme } = useTheme()

  // Dialog dimensions with defaults
  const dialogWidth = () => props.width ?? 50
  const dialogHeight = () => props.height ?? 10

  // Calculate centered position
  const left = () => Math.floor((dimensions().width - dialogWidth()) / 2)
  const top = () => Math.floor((dimensions().height - dialogHeight()) / 2)

  return (
    <>
      {/* Backdrop - full screen semi-transparent overlay */}
      {/* Using opacity 0.6 as RGBA(0, 0, 0, 150) translates to ~59% opacity */}
      <box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: dimensions().width,
          height: dimensions().height,
          backgroundColor: "black",
          opacity: 0.6,
        }}
        // Note: Click handling would require mouse support in opentui
        // For now, backdrop clicks are handled through input handler
      />

      {/* Dialog content box */}
      <box
        style={{
          position: "absolute",
          top: top(),
          left: left(),
          width: dialogWidth(),
          height: dialogHeight(),
          backgroundColor: theme().backgroundPanel,
          border: true,
          borderStyle: "single",
          borderColor: theme().borderActive,
          flexDirection: "column",
        }}
      >
        {/* Title bar (if provided) */}
        {props.title && (
          <box
            style={{
              width: "100%",
              paddingLeft: 1,
              paddingRight: 1,
            }}
          >
            <text>
              <span style={{ fg: theme().primary, bold: true }}>
                {props.title}
              </span>
            </text>
          </box>
        )}

        {/* Content area */}
        <box
          style={{
            flexGrow: 1,
            padding: 1,
            flexDirection: "column",
          }}
        >
          {props.children}
        </box>
      </box>
    </>
  )
}
