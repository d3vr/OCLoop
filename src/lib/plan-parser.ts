import type { PlanProgress } from "../types"

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
