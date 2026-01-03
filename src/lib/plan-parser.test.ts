import { describe, expect, it } from "bun:test"
import { parsePlan } from "./plan-parser"

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
`
    const result = parsePlan(content)

    expect(result.total).toBe(6)
    expect(result.completed).toBe(2)
    expect(result.pending).toBe(2)
    expect(result.manual).toBe(1)
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
