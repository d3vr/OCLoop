/**
 * Dialog Resume Component
 *
 * Displays a prompt when a previous session is detected, allowing
 * the user to resume from where they left off or start fresh.
 *
 * Uses the Dialog component for consistent styling.
 */

import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"

/**
 * Props for the DialogResume component
 */
export interface DialogResumeProps {
  /** The iteration number where the previous session was interrupted */
  iteration: number
  /** Callback when user chooses to resume the previous session */
  onResume: () => void
  /** Callback when user chooses to start fresh */
  onStartFresh: () => void
}

/**
 * DialogResume Component
 *
 * Shows a resume prompt when a previous session is detected,
 * giving the user the choice to continue or start over.
 *
 * @example
 * ```tsx
 * <DialogResume
 *   iteration={5}
 *   onResume={() => resumePreviousSession()}
 *   onStartFresh={() => startNewSession()}
 * />
 * ```
 */
export function DialogResume(props: DialogResumeProps) {
  const { theme } = useTheme()

  return (
    <Dialog onClose={props.onStartFresh} title="" width={50} height={8}>
      <box style={{ flexDirection: "column" }}>
        {/* Title */}
        <text>
          <span style={{ fg: theme().primary, bold: true }}>
            Resume Previous Run?
          </span>
        </text>

        {/* Message */}
        <text style={{ marginTop: 1 }}>
          <span style={{ fg: theme().text }}>
            Found interrupted session at iteration{" "}
          </span>
          <span style={{ fg: theme().accent, bold: true }}>
            {props.iteration}
          </span>
        </text>

        {/* Actions */}
        <text style={{ marginTop: 2 }}>
          <span style={{ fg: theme().text }}>[Y]</span>
          <span style={{ fg: theme().textMuted }}> Resume  </span>
          <span style={{ fg: theme().text }}>[N]</span>
          <span style={{ fg: theme().textMuted }}> Start Fresh</span>
        </text>
      </box>
    </Dialog>
  )
}
