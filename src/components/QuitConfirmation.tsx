import { Show } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"

/**
 * Props for the QuitConfirmation component
 */
export interface QuitConfirmationProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean
  /**
   * Callback when user confirms quit (Y key)
   */
  onConfirm: () => void
  /**
   * Callback when user cancels quit (N key or Escape)
   */
  onCancel: () => void
}

/**
 * QuitConfirmation component
 *
 * Renders a centered modal overlay with "Quit OCLoop? [Y/N]" prompt.
 * The modal is displayed when visible is true.
 *
 * Note: Key handling (Y/N/Escape) is done by the parent input handler,
 * not by this component. The onConfirm and onCancel callbacks are
 * provided for the parent to call when appropriate keys are pressed.
 *
 * @example
 * ```tsx
 * <QuitConfirmation
 *   visible={showingQuitConfirmation()}
 *   onConfirm={() => dispatch({ type: "quit" })}
 *   onCancel={() => hideQuitConfirmation()}
 * />
 * ```
 */
export function QuitConfirmation(props: QuitConfirmationProps) {
  const dimensions = useTerminalDimensions()

  // Modal dimensions
  const modalWidth = 28
  const modalHeight = 5

  // Calculate centered position
  const left = () => Math.floor((dimensions().width - modalWidth) / 2)
  const top = () => Math.floor((dimensions().height - modalHeight) / 2)

  return (
    <Show when={props.visible}>
      {/* Overlay background - covers entire screen with dimmed effect */}
      <box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: dimensions().width,
          height: dimensions().height,
          backgroundColor: "black",
          opacity: 0.5,
        }}
      />

      {/* Modal box - centered on screen */}
      <box
        style={{
          position: "absolute",
          top: top(),
          left: left(),
          width: modalWidth,
          height: modalHeight,
          border: true,
          borderStyle: "double",
          borderColor: "yellow",
          backgroundColor: "#1a1a1a",
          padding: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <box style={{ alignItems: "center" }}>
          <text>
            <span style={{ fg: "yellow" }}>Quit OCLoop?</span>
          </text>
          <text style={{ marginTop: 1 }}>
            <span style={{ fg: "green" }}>[Y]</span>
            <span style={{ fg: "white" }}>es  </span>
            <span style={{ fg: "red" }}>[N]</span>
            <span style={{ fg: "white" }}>o</span>
          </text>
        </box>
      </box>
    </Show>
  )
}
