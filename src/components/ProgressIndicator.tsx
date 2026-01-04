import { createMemo } from "solid-js"
import { useTheme } from "../context/ThemeContext"

/**
 * Props for the ProgressIndicator component
 */
export interface ProgressIndicatorProps {
  completed: number
  total: number
  width: number
}

/**
 * ProgressIndicator component
 *
 * Renders a progress bar with percentage display.
 * Uses block characters for filled and light shade for empty portions.
 * Colors are derived from the current theme.
 *
 * @example
 * ```tsx
 * <ProgressIndicator completed={4} total={10} width={20} />
 * // Renders: ████████░░░░░░░░░░░░ 40%
 * ```
 */
export function ProgressIndicator(props: ProgressIndicatorProps) {
  const { theme } = useTheme()

  const percentage = createMemo(() => {
    if (props.total === 0) return 100
    return Math.round((props.completed / props.total) * 100)
  })

  const filledWidth = createMemo(() => {
    if (props.total === 0) return props.width
    return Math.round((props.completed / props.total) * props.width)
  })

  const emptyWidth = createMemo(() => {
    return props.width - filledWidth()
  })

  const filledChars = createMemo(() => {
    return "█".repeat(filledWidth())
  })

  const emptyChars = createMemo(() => {
    return "░".repeat(emptyWidth())
  })

  return (
    <text>
      <span style={{ fg: theme().primary }}>{filledChars()}</span>
      <span style={{ fg: theme().borderSubtle }}>{emptyChars()}</span>
      <span style={{ fg: theme().text }}> {percentage()}%</span>
    </text>
  )
}
