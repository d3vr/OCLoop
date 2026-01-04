import type { PlanProgress, CompletionSummary } from "../types"

type TaskType = "completed" | "pending" | "manual" | "blocked" | "not-a-task"

interface ParsedTask {
  type: TaskType
  description: string
  blockedReason?: string
}

/**
 * Parses a single line from PLAN.md to determine its task type and content.
 * 
 * Handles various formats:
 * - - [x] or - [X] -> completed
 * - - [ ] -> pending
 * - - [MANUAL] or - [ ] [MANUAL] -> manual
 * - - [BLOCKED] or - [ ] [BLOCKED] -> blocked
 */
export function parseTaskLine(line: string): ParsedTask {
  const trimmed = line.trim()
  
  // Must start with "- [" to be a task
  if (!trimmed.startsWith("- [")) {
    return { type: "not-a-task", description: "" }
  }
  
  // Find closing bracket for the checkbox/tag
  // We start searching from index 3 to skip the initial "- ["
  const closeBracket = trimmed.indexOf("]", 3)
  if (closeBracket === -1) {
    return { type: "not-a-task", description: "" }
  }
  
  const checkboxContent = trimmed.slice(3, closeBracket).trim()
  let afterCheckbox = trimmed.slice(closeBracket + 1).trim()
  
  // Check for completed
  if (/^[xX]$/.test(checkboxContent)) {
    return { type: "completed", description: afterCheckbox }
  }
  
  // Check for MANUAL - either in checkbox or as tag after
  if (/^MANUAL$/i.test(checkboxContent)) {
    return { type: "manual", description: afterCheckbox }
  }
  
  // Check for [MANUAL] tag after empty checkbox
  if (checkboxContent === "" && afterCheckbox.toUpperCase().startsWith("[MANUAL]")) {
    const description = afterCheckbox.replace(/^\[MANUAL\]\s*/i, "")
    return { type: "manual", description }
  }
  
  // Check for BLOCKED - either in checkbox or as tag after
  if (/^BLOCKED/i.test(checkboxContent)) {
    const reason = checkboxContent.replace(/^BLOCKED[:\s]*/i, "")
    return { 
      type: "blocked", 
      description: afterCheckbox,
      blockedReason: reason 
    }
  }
  
  // Check for [BLOCKED] tag after empty checkbox
  if (checkboxContent === "" && /^\[BLOCKED/i.test(afterCheckbox)) {
    const match = afterCheckbox.match(/^\[BLOCKED[:\s]*([^\]]*)\]\s*(.*)$/i)
    if (match) {
      return { 
        type: "blocked", 
        description: match[2] || "", 
        blockedReason: match[1]?.trim() || "" 
      }
    }
  }
  
  // Empty checkbox = pending
  if (checkboxContent === "") {
    return { type: "pending", description: afterCheckbox }
  }
  
  // Unknown checkbox content - treat as not a task
  return { type: "not-a-task", description: "" }
}

/**
 * Parses a PLAN.md file content and extracts progress information.
 *
 * Recognizes:
 * - `- [x]` or `- [X]` - completed tasks
 * - `- [ ]` - pending tasks
 * - `- [MANUAL]` or `- [ ] [MANUAL]` - manual tasks (excluded from automation)
 * - `- [BLOCKED]` or `- [ ] [BLOCKED]` - blocked tasks
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
    const task = parseTaskLine(line)
    
    if (task.type === "not-a-task") {
      continue
    }

    total++
    
    switch (task.type) {
      case "completed":
        completed++
        break
      case "manual":
        manual++
        break
      case "blocked":
        blocked++
        break
      // pending counts towards total but not specific buckets here
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
    const task = parseTaskLine(line)

    if (task.type === "manual" && task.description) {
      manualTasks.push(task.description)
    } else if (task.type === "blocked" && task.description) {
      const fullDescription = task.blockedReason
        ? `[BLOCKED: ${task.blockedReason}] ${task.description}`
        : task.description
      blockedTasks.push(fullDescription)
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
 * Parses the .loop-complete file to get completion summary.
 * The file may contain a list of remaining MANUAL and BLOCKED tasks.
 *
 * @param completePath - Path to the .loop-complete file
 * @returns CompletionSummary with arrays of task descriptions
 */
export async function parseCompletionFile(completePath: string): Promise<CompletionSummary> {
  try {
    const file = Bun.file(completePath)
    const content = await file.text()
    
    // The .loop-complete file is expected to list remaining tasks
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
 * Finds the first unchecked task (- [ ]) that isn't MANUAL or BLOCKED
 * and returns its description.
 *
 * @param content - The content of the PLAN.md file
 * @returns The task description or null if no unchecked tasks found
 */
export function getCurrentTaskFromContent(content: string): string | null {
  const lines = content.split("\n")

  for (const line of lines) {
    const task = parseTaskLine(line)
    
    if (task.type === "pending" && task.description) {
      return task.description
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
