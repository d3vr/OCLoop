import type { ErrorSource } from "../types"
import { COLORS } from "../lib/constants"

/**
 * Props for the ErrorDisplay component
 */
export interface ErrorDisplayProps {
  /**
   * Source of the error
   */
  source: ErrorSource
  /**
   * Error message to display
   */
  message: string
  /**
   * Whether the error is recoverable (can retry)
   */
  recoverable: boolean
  /**
   * Callback when user presses R to retry (if recoverable)
   */
  onRetry?: () => void
  /**
   * Callback when user presses Q to quit
   */
  onQuit?: () => void
}

/**
 * Get a human-readable label for the error source
 */
function getSourceLabel(source: ErrorSource): string {
  switch (source) {
    case "server":
      return "Server Error"
    case "sse":
      return "Connection Error"
    case "pty":
      return "Terminal Error"
    case "api":
      return "API Error"
    case "plan":
      return "Plan Error"
    default:
      return "Error"
  }
}

/**
 * ErrorDisplay component
 *
 * Displays error information in a centered box with options to retry or quit.
 * Shows different information based on whether the error is recoverable.
 *
 * @example
 * ```tsx
 * <ErrorDisplay
 *   source="server"
 *   message="Failed to start server: port already in use"
 *   recoverable={true}
 *   onRetry={() => loop.dispatch({ type: "retry" })}
 *   onQuit={() => process.exit(1)}
 * />
 * ```
 */
export function ErrorDisplay(props: ErrorDisplayProps) {
  const sourceLabel = getSourceLabel(props.source)

  return (
    <box
      style={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <box
        style={{
          border: true,
          borderStyle: "double",
          borderColor: COLORS.ERROR,
          padding: 2,
          flexDirection: "column",
          alignItems: "center",
          minWidth: 50,
          maxWidth: 80,
        }}
      >
        {/* Error icon and title */}
        <text>
          <span style={{ fg: COLORS.ERROR, bold: true }}>
            {`! ${sourceLabel}`}
          </span>
        </text>

        <text> </text>

        {/* Error message */}
        <text>
          <span style={{ fg: "white" }}>{props.message}</span>
        </text>

        <text> </text>

        {/* Instructions based on recoverability */}
        {props.recoverable ? (
          <box style={{ flexDirection: "column", alignItems: "center" }}>
            <text>
              <span style={{ fg: COLORS.DIMMED }}>
                {"Press [R] to retry or [Q] to quit"}
              </span>
            </text>
          </box>
        ) : (
          <box style={{ flexDirection: "column", alignItems: "center" }}>
            <text>
              <span style={{ fg: COLORS.DIMMED }}>
                {"Press [Q] to quit"}
              </span>
            </text>
          </box>
        )}
      </box>
    </box>
  )
}
