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
import { useTerminalDimensions, useRenderer } from "@opentui/solid"
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
 *     <Dialog onClose={() => dialog.clear()}>
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
  const renderer = useRenderer()

  // Dialog dimensions with defaults
  const dialogWidth = () => props.width ?? 50
  const dialogHeight = () => props.height ?? 10

  // Calculate centered position
  const left = () => Math.floor((dimensions().width - dialogWidth()) / 2)
  const top = () => Math.floor((dimensions().height - dialogHeight()) / 2)

  // Handle backdrop click
  const handleBackdropClick = (e: any) => {
    // Don't close if user is selecting text
    // @ts-ignore - selection property exists at runtime
    if (renderer.selection?.active) return
    props.onClose()
  }

  return (
    <>
      {/* Backdrop - full screen semi-transparent overlay */}
      {/* Using opacity 0.6 as RGBA(0, 0, 0, 150) translates to ~59% opacity */}
      <box
        onMouseUp={handleBackdropClick}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: dimensions().width,
          height: dimensions().height,
          backgroundColor: "black",
          opacity: 0.6,
        }}
      />

      {/* Dialog content box */}
      <box
        onMouseUp={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: top(),
          left: left(),
          width: dialogWidth(),
          height: dialogHeight(),
          backgroundColor: theme().backgroundPanel,
          flexDirection: "column",
        }}
      >
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
