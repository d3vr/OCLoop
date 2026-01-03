/**
 * Keybinding constants
 */
export const KEYS = {
  CTRL_BACKSLASH: "\x1c", // Ctrl+\ for toggle attach/detach
  SPACE: " ",
  ESCAPE: "\x1b",
  Q_LOWER: "q",
  Q_UPPER: "Q",
  Y_LOWER: "y",
  Y_UPPER: "Y",
  N_LOWER: "n",
  N_UPPER: "N",
} as const

/**
 * Default file paths
 */
export const DEFAULTS = {
  PROMPT_FILE: ".loop-prompt.md",
  PLAN_FILE: "PLAN.md",
  COMPLETE_FILE: ".PLAN_COMPLETE",
} as const

/**
 * UI Colors
 */
export const COLORS = {
  RUNNING: "green",
  PAUSED: "yellow",
  COMPLETE: "cyan",
  ERROR: "red",
  DIMMED: "gray",
} as const
