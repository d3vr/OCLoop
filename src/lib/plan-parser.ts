import type { PlanProgress, CompletionSummary } from "../types"

/**
 * Parses a PLAN.md file content and extracts progress information.
 *
 * Recognizes:
 * - `- [x]` or `- [X]` - completed tasks
 * - `- [ ]` - pending tasks
 * - `- [MANUAL]` - manual tasks (excluded from automation)
 * - `- [BLOCKED: reason]` - blocked tasks
 *
 * @param content - The content of the PLAN.md file
 * @returns PlanProgress object with task counts and percentages
 */
export function parsePlan(content: string): PlanProgress {
  const lines = content.split("\n")
  let total = 0
  let completed = 0
  let manual = 0
  let blocked = 0

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]")) {
      total++
      completed++
    } else if (trimmed.startsWith("- [ ]")) {
      total++
    } else if (trimmed.startsWith("- [MANUAL]")) {
      total++
      manual++
    } else if (/^- \[BLOCKED/i.test(trimmed)) {
      total++
      blocked++
    }
  }

  const pending = total - completed - manual - blocked
  const automatable = pending
  const denominator = total - manual
  const percentComplete = denominator > 0 ? Math.round((completed / denominator) * 100) : 100

  return {
    total,
    completed,
    pending,
    manual,
    blocked,
    automatable,
    percentComplete,
  }
}

/**
 * Extracts task descriptions for MANUAL and BLOCKED tasks from PLAN.md content.
 *
 * @param content - The content of the PLAN.md file
 * @returns CompletionSummary with arrays of task descriptions
 */
export function parseRemainingTasks(content: string): CompletionSummary {
  const lines = content.split("\n")
  const manualTasks: string[] = []
  const blockedTasks: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("- [MANUAL]")) {
      // Extract the task description after [MANUAL]
      const description = trimmed.replace(/^- \[MANUAL\]\s*/, "").trim()
      if (description) {
        manualTasks.push(description)
      }
    } else if (/^- \[BLOCKED/i.test(trimmed)) {
      // Extract the task description (includes the reason)
      // Format: "- [BLOCKED: reason] description" -> keep both reason and description
      const match = trimmed.match(/^- \[BLOCKED[:\s]*([^\]]*)\]\s*(.*)$/i)
      if (match) {
        const reason = match[1]?.trim()
        const description = match[2]?.trim()
        const fullDescription = reason
          ? `[BLOCKED: ${reason}] ${description}`
          : description || "Unknown task"
        blockedTasks.push(fullDescription)
      }
    }
  }

  return { manualTasks, blockedTasks }
}

/**
 * Reads and parses a PLAN.md file from disk.
 *
 * @param planPath - Path to the PLAN.md file
 * @returns PlanProgress object with task counts and percentages
 * @throws Error if the file cannot be read
 */
export async function parsePlanFile(planPath: string): Promise<PlanProgress> {
  const file = Bun.file(planPath)
  const content = await file.text()
  return parsePlan(content)
}

/**
 * Reads and parses remaining tasks from a PLAN.md file.
 *
 * @param planPath - Path to the PLAN.md file
 * @returns CompletionSummary with arrays of task descriptions
 * @throws Error if the file cannot be read
 */
export async function parseRemainingTasksFile(planPath: string): Promise<CompletionSummary> {
  const file = Bun.file(planPath)
  const content = await file.text()
  return parseRemainingTasks(content)
}

/**
 * Parses the .PLAN_COMPLETE file to get completion summary.
 * The file may contain a list of remaining MANUAL and BLOCKED tasks.
 *
 * @param completePath - Path to the .PLAN_COMPLETE file
 * @returns CompletionSummary with arrays of task descriptions
 */
export async function parseCompletionFile(completePath: string): Promise<CompletionSummary> {
  try {
    const file = Bun.file(completePath)
    const content = await file.text()
    
    // The .PLAN_COMPLETE file is expected to list remaining tasks
    // Parse any [MANUAL] or [BLOCKED] items from it
    return parseRemainingTasks(content)
  } catch {
    // If the file doesn't exist or can't be read, return empty summary
    return { manualTasks: [], blockedTasks: [] }
  }
}

/**
 * Extracts the current task text from plan content.
 *
 * Finds the first unchecked task (- [ ]) and returns its description.
 *
 * @param content - The content of the PLAN.md file
 * @returns The task description or null if no unchecked tasks found
 */
export function getCurrentTaskFromContent(content: string): string | null {
  const lines = content.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("- [ ]")) {
      // Extract the task description after the checkbox
      const description = trimmed.replace(/^- \[ \]\s*/, "").trim()
      return description || null
    }
  }

  return null
}

/**
 * Reads a PLAN.md file and returns the current (first unchecked) task.
 *
 * @param planPath - Path to the PLAN.md file
 * @returns The task description or null if no unchecked tasks found
 * @throws Error if the file cannot be read
 */
export async function getCurrentTask(planPath: string): Promise<string | null> {
  const file = Bun.file(planPath)
  const content = await file.text()
  return getCurrentTaskFromContent(content)
}
