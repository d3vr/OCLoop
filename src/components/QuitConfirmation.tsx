import { Show } from "solid-js"
import { DialogConfirm } from "../ui/DialogConfirm"

/**
 * Props for the QuitConfirmation component
 */
export interface QuitConfirmationProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean
  /**
   * Callback when user confirms quit
   */
  onConfirm: () => void
  /**
   * Callback when user cancels quit
   */
  onCancel: () => void
}

/**
 * QuitConfirmation component
 *
 * Renders a confirmation dialog when attempting to quit.
 * Uses DialogConfirm for consistent styling and behavior.
 */
export function QuitConfirmation(props: QuitConfirmationProps) {
  return (
    <Show when={props.visible}>
      <DialogConfirm
        title="Quit OCLoop?"
        message="Are you sure you want to quit?"
        confirmLabel="Quit"
        cancelLabel="Cancel"
        onConfirm={props.onConfirm}
        onCancel={props.onCancel}
      />
    </Show>
  )
}
