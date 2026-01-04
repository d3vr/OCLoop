import { describe, expect, it } from "bun:test"
import { parsePlan, parseRemainingTasks, getCurrentTaskFromContent, parseTaskLine } from "./plan-parser"

describe("parseTaskLine", () => {
  it("should parse completed tasks", () => {
    expect(parseTaskLine("- [x] Task")).toEqual({ type: "completed", description: "Task" })
    expect(parseTaskLine("- [X] Task")).toEqual({ type: "completed", description: "Task" })
  })

  it("should parse pending tasks", () => {
    expect(parseTaskLine("- [ ] Task")).toEqual({ type: "pending", description: "Task" })
  })

  it("should parse MANUAL tasks in checkbox", () => {
    expect(parseTaskLine("- [MANUAL] Task")).toEqual({ type: "manual", description: "Task" })
    expect(parseTaskLine("- [manual] Task")).toEqual({ type: "manual", description: "Task" })
  })

  it("should parse MANUAL tasks as tag after checkbox", () => {
    expect(parseTaskLine("- [ ] [MANUAL] Task")).toEqual({ type: "manual", description: "Task" })
    expect(parseTaskLine("- [ ] [manual] Task")).toEqual({ type: "manual", description: "Task" })
  })

  it("should parse BLOCKED tasks in checkbox", () => {
    expect(parseTaskLine("- [BLOCKED: reason] Task")).toEqual({ 
      type: "blocked", 
      description: "Task", 
      blockedReason: "reason" 
    })
    expect(parseTaskLine("- [BLOCKED] Task")).toEqual({ 
      type: "blocked", 
      description: "Task", 
      blockedReason: "" 
    })
  })

  it("should parse BLOCKED tasks as tag after checkbox", () => {
    expect(parseTaskLine("- [ ] [BLOCKED: reason] Task")).toEqual({ 
      type: "blocked", 
      description: "Task", 
      blockedReason: "reason" 
    })
    expect(parseTaskLine("- [ ] [BLOCKED] Task")).toEqual({ 
      type: "blocked", 
      description: "Task", 
      blockedReason: "" 
    })
  })

  it("should return not-a-task for invalid lines", () => {
    expect(parseTaskLine("Not a task")).toEqual({ type: "not-a-task", description: "" })
    expect(parseTaskLine("- Item")).toEqual({ type: "not-a-task", description: "" })
    expect(parseTaskLine("- [ ]")).toEqual({ type: "pending", description: "" }) // Valid but empty description
  })
})

describe("parsePlan", () => {
  it("should return empty progress for empty content", () => {
    const result = parsePlan("")

    expect(result.total).toBe(0)
    expect(result.completed).toBe(0)
    expect(result.pending).toBe(0)
    expect(result.manual).toBe(0)
    expect(result.blocked).toBe(0)
    expect(result.automatable).toBe(0)
    expect(result.percentComplete).toBe(100) // edge case: no tasks = 100% complete
  })

  it("should parse completed tasks with lowercase x", () => {
    const content = `
- [x] Task one
- [x] Task two
`
    const result = parsePlan(content)

    expect(result.total).toBe(2)
    expect(result.completed).toBe(2)
    expect(result.pending).toBe(0)
    expect(result.percentComplete).toBe(100)
  })

  it("should parse completed tasks with uppercase X", () => {
    const content = `
- [X] Task one
- [X] Task two
`
    const result = parsePlan(content)

    expect(result.total).toBe(2)
    expect(result.completed).toBe(2)
    expect(result.pending).toBe(0)
    expect(result.percentComplete).toBe(100)
  })

  it("should parse pending tasks", () => {
    const content = `
- [ ] Task one
- [ ] Task two
- [ ] Task three
`
    const result = parsePlan(content)

    expect(result.total).toBe(3)
    expect(result.completed).toBe(0)
    expect(result.pending).toBe(3)
    expect(result.automatable).toBe(3)
    expect(result.percentComplete).toBe(0)
  })

  it("should parse MANUAL tasks", () => {
    const content = `
- [MANUAL] Manual testing task
- [MANUAL] Another manual task
`
    const result = parsePlan(content)

    expect(result.total).toBe(2)
    expect(result.manual).toBe(2)
    expect(result.pending).toBe(0)
    expect(result.percentComplete).toBe(100) // manual tasks excluded from percentage
  })

  it("should parse MANUAL tasks with checkbox tag", () => {
    const content = `
- [ ] [MANUAL] Manual testing task
- [ ] [MANUAL] Another manual task
`
    const result = parsePlan(content)

    expect(result.total).toBe(2)
    expect(result.manual).toBe(2)
    expect(result.pending).toBe(0)
    expect(result.percentComplete).toBe(100)
  })

  it("should parse BLOCKED tasks", () => {
    const content = `
- [BLOCKED: waiting for API] Blocked task one
- [BLOCKED: needs review] Blocked task two
`
    const result = parsePlan(content)

    expect(result.total).toBe(2)
    expect(result.blocked).toBe(2)
    expect(result.pending).toBe(0)
  })

  it("should parse BLOCKED tasks with checkbox tag", () => {
    const content = `
- [ ] [BLOCKED: waiting for API] Blocked task one
- [ ] [BLOCKED] Blocked task two
`
    const result = parsePlan(content)

    expect(result.total).toBe(2)
    expect(result.blocked).toBe(2)
    expect(result.pending).toBe(0)
  })

  it("should parse BLOCKED tasks case-insensitively", () => {
    const content = `
- [blocked: reason] Task one
- [Blocked: reason] Task two
- [BLOCKED: reason] Task three
`
    const result = parsePlan(content)

    expect(result.total).toBe(3)
    expect(result.blocked).toBe(3)
  })

  it("should parse a mixed plan correctly", () => {
    const content = `
## Backlog

- [x] **1.1** Completed task
- [x] **1.2** Another completed
- [ ] **1.3** Pending task
- [ ] **1.4** Another pending
- [MANUAL] **2.1** Manual testing task
- [BLOCKED: needs API] **2.2** Blocked task
- [ ] [MANUAL] **2.3** Tagged manual task
`
    const result = parsePlan(content)

    expect(result.total).toBe(7)
    expect(result.completed).toBe(2)
    expect(result.pending).toBe(2)
    expect(result.manual).toBe(2)
    expect(result.blocked).toBe(1)
    expect(result.automatable).toBe(2)
    // percentComplete = completed / (total - manual) = 2 / 5 = 40%
    expect(result.percentComplete).toBe(40)
  })

  it("should handle indented checkboxes", () => {
    const content = `
  - [x] Indented completed
    - [ ] Double indented pending
`
    const result = parsePlan(content)

    expect(result.total).toBe(2)
    expect(result.completed).toBe(1)
    expect(result.pending).toBe(1)
  })

  it("should ignore non-checkbox lines", () => {
    const content = `
# Header

Some description text.

- [x] A real task

More text here.

- Regular list item without checkbox
`
    const result = parsePlan(content)

    expect(result.total).toBe(1)
    expect(result.completed).toBe(1)
  })

  it("should calculate correct percentage", () => {
    const content = `
- [x] Task 1
- [x] Task 2
- [x] Task 3
- [ ] Task 4
- [ ] Task 5
- [MANUAL] Manual task
`
    const result = parsePlan(content)

    expect(result.total).toBe(6)
    expect(result.completed).toBe(3)
    expect(result.pending).toBe(2)
    expect(result.manual).toBe(1)
    // percentComplete = 3 / (6 - 1) = 3/5 = 60%
    expect(result.percentComplete).toBe(60)
  })
})

describe("parseRemainingTasks", () => {
  it("should return empty arrays for empty content", () => {
    const result = parseRemainingTasks("")

    expect(result.manualTasks).toEqual([])
    expect(result.blockedTasks).toEqual([])
  })

  it("should extract MANUAL task descriptions", () => {
    const content = `
- [MANUAL] Manual testing task
- [MANUAL] Another manual task
- [ ] [MANUAL] Tagged manual task
`
    const result = parseRemainingTasks(content)

    expect(result.manualTasks).toEqual([
      "Manual testing task",
      "Another manual task",
      "Tagged manual task"
    ])
    expect(result.blockedTasks).toEqual([])
  })

  it("should extract BLOCKED task descriptions with reasons", () => {
    const content = `
- [BLOCKED: waiting for API] Blocked task one
- [BLOCKED: needs review] Blocked task two
- [ ] [BLOCKED: upstream] Tagged blocked task
`
    const result = parseRemainingTasks(content)

    expect(result.manualTasks).toEqual([])
    expect(result.blockedTasks).toEqual([
      "[BLOCKED: waiting for API] Blocked task one",
      "[BLOCKED: needs review] Blocked task two",
      "[BLOCKED: upstream] Tagged blocked task"
    ])
  })

  it("should handle BLOCKED tasks without reason", () => {
    const content = `
- [BLOCKED] Simple blocked task
`
    const result = parseRemainingTasks(content)

    expect(result.blockedTasks).toEqual(["Simple blocked task"])
  })

  it("should extract both MANUAL and BLOCKED tasks", () => {
    const content = `
## Backlog

- [x] **1.1** Completed task
- [MANUAL] **2.1** Manual testing task
- [BLOCKED: needs API] **2.2** Blocked task
`
    const result = parseRemainingTasks(content)

    expect(result.manualTasks).toEqual(["**2.1** Manual testing task"])
    expect(result.blockedTasks).toEqual(["[BLOCKED: needs API] **2.2** Blocked task"])
  })

  it("should handle case-insensitive BLOCKED tags", () => {
    const content = `
- [blocked: reason] Task one
- [Blocked: reason] Task two
- [BLOCKED: reason] Task three
`
    const result = parseRemainingTasks(content)

    expect(result.blockedTasks.length).toBe(3)
  })

  it("should ignore completed and pending tasks", () => {
    const content = `
- [x] Completed task
- [ ] Pending task
- [MANUAL] Manual task
`
    const result = parseRemainingTasks(content)

    expect(result.manualTasks).toEqual(["Manual task"])
    expect(result.blockedTasks).toEqual([])
  })
})

describe("getCurrentTaskFromContent", () => {
  it("should return null for empty content", () => {
    const result = getCurrentTaskFromContent("")

    expect(result).toBeNull()
  })

  it("should return null when no unchecked tasks exist", () => {
    const content = `
- [x] Completed task
- [x] Another completed
`
    const result = getCurrentTaskFromContent(content)

    expect(result).toBeNull()
  })

  it("should return first unchecked task", () => {
    const content = `
- [x] Completed task
- [ ] First pending task
- [ ] Second pending task
`
    const result = getCurrentTaskFromContent(content)

    expect(result).toBe("First pending task")
  })

  it("should handle task with bold formatting", () => {
    const content = `
- [ ] **Add current task detection**
`
    const result = getCurrentTaskFromContent(content)

    expect(result).toBe("**Add current task detection**")
  })

  it("should skip MANUAL and BLOCKED tasks", () => {
    const content = `
- [MANUAL] Manual task
- [BLOCKED: reason] Blocked task
- [ ] [MANUAL] Tagged manual task
- [ ] [BLOCKED] Tagged blocked task
- [ ] First automatable task
`
    const result = getCurrentTaskFromContent(content)

    expect(result).toBe("First automatable task")
  })

  it("should handle indented checkboxes", () => {
    const content = `
## Section
  - [ ] Indented pending task
`
    const result = getCurrentTaskFromContent(content)

    expect(result).toBe("Indented pending task")
  })

  it("should return null for empty task description", () => {
    const content = `
- [ ] 
- [ ] Next task
`
    const result = getCurrentTaskFromContent(content)

    // First one is empty, so it returns "Next task" because getCurrentTaskFromContent logic calls parseTaskLine
    // parseTaskLine("- [ ] ") returns { type: "pending", description: "" }
    // getCurrentTaskFromContent checks for task.type === "pending" && task.description
    
    expect(result).toBe("Next task")
  })

  it("should skip empty and return first valid task", () => {
    const content = `
- [x] Completed
- [ ] Valid task
`
    const result = getCurrentTaskFromContent(content)

    expect(result).toBe("Valid task")
  })

  it("should handle complex task descriptions", () => {
    const content = `
- [ ] Create \`src/components/Dashboard.tsx\` with props
`
    const result = getCurrentTaskFromContent(content)

    expect(result).toBe("Create `src/components/Dashboard.tsx` with props")
  })
})
