import { Show } from "solid-js"
import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"

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
 * Uses the Dialog component for consistent styling with other modals.
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
  const { theme } = useTheme()

  return (
    <Show when={props.visible}>
      <Dialog onClose={props.onCancel} title="" width={30} height={6}>
        <box style={{ flexDirection: "column", alignItems: "center" }}>
          {/* Title */}
          <text>
            <span style={{ fg: theme().warning, bold: true }}>Quit OCLoop?</span>
          </text>

          {/* Options */}
          <text style={{ marginTop: 1 }}>
            <span style={{ fg: theme().success }}>[Y]</span>
            <span style={{ fg: theme().text }}>es  </span>
            <span style={{ fg: theme().error }}>[N]</span>
            <span style={{ fg: theme().text }}>o</span>
          </text>
        </box>
      </Dialog>
    </Show>
  )
}
