/**
 * Summary of remaining tasks when plan is complete
 */
export interface CompletionSummary {
  manualTasks: string[]  // Descriptions of [MANUAL] tasks
  blockedTasks: string[] // Descriptions of [BLOCKED: reason] tasks
  rawContent?: string    // Raw content of the completion file
}

/**
 * Error categories for OCLoop
 */
export type ErrorSource = "server" | "sse" | "pty" | "api" | "plan"

/**
 * State machine type for the OCLoop harness
 */
export type LoopState =
  | { type: "starting" }
  | { type: "ready" }  // Server ready, waiting for user to start iterations
  | { type: "running"; iteration: number; sessionId: string }
  | { type: "pausing"; iteration: number; sessionId: string }
  | { type: "paused"; iteration: number }
  | { type: "stopping" }
  | { type: "stopped" }
  | { type: "complete"; iterations: number; summary: CompletionSummary }
  | { type: "error"; source: ErrorSource; message: string; recoverable: boolean }
  | { type: "debug"; sessionId: string }

/**
 * Actions that can be dispatched to the loop state machine
 */
export type LoopAction =
  | { type: "server_ready" }
  | { type: "server_ready_debug" }
  | { type: "start" }  // User initiates first iteration
  | { type: "toggle_pause" }
  | { type: "quit" }
  | { type: "session_idle" }
  | { type: "iteration_started"; sessionId: string }
  | { type: "new_session"; sessionId: string }
  | { type: "plan_complete"; summary: CompletionSummary }
  | { type: "error"; source: ErrorSource; message: string; recoverable: boolean }
  | { type: "retry" }

/**
 * Progress information parsed from PLAN.md
 */
export interface PlanProgress {
  total: number // All tasks
  completed: number // [x] tasks
  pending: number // [ ] tasks (non-manual, non-blocked)
  manual: number // [MANUAL] tasks
  blocked: number // [BLOCKED] tasks
  automatable: number // pending (what the loop will do)
  percentComplete: number // completed / (total - manual)
}

/**
 * CLI arguments for OCLoop
 */
export interface CLIArgs {
  port?: number
  model?: string
  promptFile: string
  planFile: string
  run?: boolean  // Start iterations immediately without waiting for user input
  debug?: boolean  // Enable debug/sandbox mode without plan file validation
}
