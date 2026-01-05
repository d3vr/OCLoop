/**
 * Keybinding constants
 */
export const KEYS = {

  SPACE: " ",
  ESCAPE: "\x1b",
  Q_LOWER: "q",
  Q_UPPER: "Q",
  Y_LOWER: "y",
  Y_UPPER: "Y",
  N_LOWER: "n",
  N_UPPER: "N",
  R_LOWER: "r",
  R_UPPER: "R",
  S_LOWER: "s",
  S_UPPER: "S",
  T_LOWER: "t",
  T_UPPER: "T",
  CTRL_P: "\x10", // ASCII 16
  CTRL_N: "\x0e", // ASCII 14
} as const

/**
 * Check if input sequence is a keyboard event (vs mouse/focus event)
 */
export function isKeyboardInput(sequence: string): boolean {
  // Focus events: \x1b[I (focus in), \x1b[O (focus out)
  if (sequence === "\x1b[I" || sequence === "\x1b[O") {
    return false
  }
  
  // Mouse events X10 mode: sequences starting with \x1b[M
  if (sequence.startsWith("\x1b[M")) {
    return false
  }
  
  // Mouse events SGR mode: sequences starting with \x1b[<
  if (sequence.startsWith("\x1b[<")) {
    return false
  }

  return true
}

/**
 * Default file paths
 */
export const DEFAULTS = {
  PROMPT_FILE: ".loop-prompt.md",
  PLAN_FILE: "PLAN.md",
  COMPLETE_FILE: ".loop-complete",
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
