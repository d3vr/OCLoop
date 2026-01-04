import { describe, expect, it } from "bun:test"
import { loopReducer } from "./useLoopState"
import type { LoopState, LoopAction } from "../types"

describe("loopReducer", () => {
  describe("server_ready action", () => {
    it("should transition from starting to ready", () => {
      const state: LoopState = { type: "starting" }
      const action: LoopAction = { type: "server_ready" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("ready")
    })

    it("should not change state if already running", () => {
      const state: LoopState = {
        type: "running",
        attached: true,
        iteration: 5,
        sessionId: "test-session",
      }
      const action: LoopAction = { type: "server_ready" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })
  })

  describe("start action", () => {
    it("should transition from ready to running (detached)", () => {
      const state: LoopState = { type: "ready" }
      const action: LoopAction = { type: "start" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("running")
      if (result.type === "running") {
        expect(result.attached).toBe(false)
        expect(result.iteration).toBe(0)
        expect(result.sessionId).toBe("")
      }
    })

    it("should not change state if not in ready state", () => {
      const state: LoopState = {
        type: "running",
        attached: true,
        iteration: 5,
        sessionId: "test-session",
      }
      const action: LoopAction = { type: "start" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })

    it("should not change state if in paused state", () => {
      const state: LoopState = {
        type: "paused",
        attached: false,
        iteration: 2,
      }
      const action: LoopAction = { type: "start" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })
  })

  describe("iteration_started action", () => {
    it("should increment iteration and set sessionId when running", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 2,
        sessionId: "",
      }
      const action: LoopAction = {
        type: "iteration_started",
        sessionId: "new-session-123",
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("running")
      if (result.type === "running") {
        expect(result.iteration).toBe(3)
        expect(result.sessionId).toBe("new-session-123")
        expect(result.attached).toBe(false)
      }
    })

    it("should preserve attached state when starting iteration", () => {
      const state: LoopState = {
        type: "running",
        attached: true,
        iteration: 1,
        sessionId: "",
      }
      const action: LoopAction = {
        type: "iteration_started",
        sessionId: "session-456",
      }

      const result = loopReducer(state, action)

      if (result.type === "running") {
        expect(result.attached).toBe(true)
      }
    })

    it("should transition from paused to running when resuming", () => {
      const state: LoopState = {
        type: "paused",
        attached: false,
        iteration: 3,
      }
      const action: LoopAction = {
        type: "iteration_started",
        sessionId: "resume-session",
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("running")
      if (result.type === "running") {
        expect(result.iteration).toBe(4)
        expect(result.sessionId).toBe("resume-session")
        expect(result.attached).toBe(false)
      }
    })
  })

  describe("toggle_attach action", () => {
    it("should toggle attached state when running", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 1,
        sessionId: "session",
      }
      const action: LoopAction = { type: "toggle_attach" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("running")
      if (result.type === "running") {
        expect(result.attached).toBe(true)
      }
    })

    it("should toggle back to detached when attached", () => {
      const state: LoopState = {
        type: "running",
        attached: true,
        iteration: 1,
        sessionId: "session",
      }
      const action: LoopAction = { type: "toggle_attach" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("running")
      if (result.type === "running") {
        expect(result.attached).toBe(false)
      }
    })

    it("should toggle attached state when paused", () => {
      const state: LoopState = {
        type: "paused",
        attached: false,
        iteration: 2,
      }
      const action: LoopAction = { type: "toggle_attach" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("paused")
      if (result.type === "paused") {
        expect(result.attached).toBe(true)
      }
    })

    it("should preserve other state properties when toggling", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 5,
        sessionId: "my-session",
      }
      const action: LoopAction = { type: "toggle_attach" }

      const result = loopReducer(state, action)

      if (result.type === "running") {
        expect(result.iteration).toBe(5)
        expect(result.sessionId).toBe("my-session")
      }
    })

    it("should not change state when starting", () => {
      const state: LoopState = { type: "starting" }
      const action: LoopAction = { type: "toggle_attach" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })

    it("should not change state when ready", () => {
      const state: LoopState = { type: "ready" }
      const action: LoopAction = { type: "toggle_attach" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })
  })

  describe("toggle_pause action", () => {
    it("should transition from running (detached) to pausing", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 3,
        sessionId: "session-123",
      }
      const action: LoopAction = { type: "toggle_pause" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("pausing")
      if (result.type === "pausing") {
        expect(result.iteration).toBe(3)
        expect(result.sessionId).toBe("session-123")
      }
    })

    it("should not pause when attached", () => {
      const state: LoopState = {
        type: "running",
        attached: true,
        iteration: 3,
        sessionId: "session-123",
      }
      const action: LoopAction = { type: "toggle_pause" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })

    it("should resume from paused (detached) to running", () => {
      const state: LoopState = {
        type: "paused",
        attached: false,
        iteration: 5,
      }
      const action: LoopAction = { type: "toggle_pause" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("running")
      if (result.type === "running") {
        expect(result.iteration).toBe(5)
        expect(result.attached).toBe(false)
        expect(result.sessionId).toBe("")
      }
    })

    it("should not resume when paused and attached", () => {
      const state: LoopState = {
        type: "paused",
        attached: true,
        iteration: 5,
      }
      const action: LoopAction = { type: "toggle_pause" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })
  })

  describe("session_idle action", () => {
    it("should reset sessionId when running", () => {
      const state: LoopState = {
        type: "running",
        attached: true,
        iteration: 3,
        sessionId: "completed-session",
      }
      const action: LoopAction = { type: "session_idle" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("running")
      if (result.type === "running") {
        expect(result.sessionId).toBe("")
        expect(result.iteration).toBe(3)
        expect(result.attached).toBe(false)
      }
    })

    it("should transition from pausing to paused", () => {
      const state: LoopState = {
        type: "pausing",
        iteration: 4,
        sessionId: "session-to-pause",
      }
      const action: LoopAction = { type: "session_idle" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("paused")
      if (result.type === "paused") {
        expect(result.iteration).toBe(4)
        expect(result.attached).toBe(false)
      }
    })
  })

  describe("quit action", () => {
    it("should transition from running to stopping", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 2,
        sessionId: "session",
      }
      const action: LoopAction = { type: "quit" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("stopping")
    })

    it("should transition from paused to stopping", () => {
      const state: LoopState = {
        type: "paused",
        attached: false,
        iteration: 3,
      }
      const action: LoopAction = { type: "quit" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("stopping")
    })

    it("should transition from pausing to stopping", () => {
      const state: LoopState = {
        type: "pausing",
        iteration: 2,
        sessionId: "session",
      }
      const action: LoopAction = { type: "quit" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("stopping")
    })

    it("should transition from ready to stopping", () => {
      const state: LoopState = { type: "ready" }
      const action: LoopAction = { type: "quit" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("stopping")
    })

    it("should not change state when starting", () => {
      const state: LoopState = { type: "starting" }
      const action: LoopAction = { type: "quit" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })
  })

  describe("plan_complete action", () => {
    it("should transition from running to complete with summary", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 10,
        sessionId: "session",
      }
      const action: LoopAction = {
        type: "plan_complete",
        summary: { manualTasks: ["Manual task 1"], blockedTasks: [] },
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("complete")
      if (result.type === "complete") {
        expect(result.iterations).toBe(10)
        expect(result.summary.manualTasks).toEqual(["Manual task 1"])
        expect(result.summary.blockedTasks).toEqual([])
      }
    })

    it("should transition from paused to complete with summary", () => {
      const state: LoopState = {
        type: "paused",
        attached: false,
        iteration: 7,
      }
      const action: LoopAction = {
        type: "plan_complete",
        summary: { manualTasks: [], blockedTasks: ["[BLOCKED: reason] Task"] },
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("complete")
      if (result.type === "complete") {
        expect(result.iterations).toBe(7)
        expect(result.summary.manualTasks).toEqual([])
        expect(result.summary.blockedTasks).toEqual(["[BLOCKED: reason] Task"])
      }
    })

    it("should transition from ready to complete with summary", () => {
      const state: LoopState = { type: "ready" }
      const action: LoopAction = {
        type: "plan_complete",
        summary: { manualTasks: [], blockedTasks: [] },
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("complete")
      if (result.type === "complete") {
        expect(result.iterations).toBe(0)
        expect(result.summary).toEqual({ manualTasks: [], blockedTasks: [] })
      }
    })
  })

  describe("error action", () => {
    it("should transition from starting to error", () => {
      const state: LoopState = { type: "starting" }
      const action: LoopAction = {
        type: "error",
        source: "server",
        message: "Failed to start server",
        recoverable: true,
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("error")
      if (result.type === "error") {
        expect(result.source).toBe("server")
        expect(result.message).toBe("Failed to start server")
        expect(result.recoverable).toBe(true)
      }
    })

    it("should transition from ready to error", () => {
      const state: LoopState = { type: "ready" }
      const action: LoopAction = {
        type: "error",
        source: "api",
        message: "Something failed",
        recoverable: true,
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("error")
      if (result.type === "error") {
        expect(result.source).toBe("api")
        expect(result.message).toBe("Something failed")
        expect(result.recoverable).toBe(true)
      }
    })

    it("should transition from running to error", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 3,
        sessionId: "session",
      }
      const action: LoopAction = {
        type: "error",
        source: "api",
        message: "API request failed",
        recoverable: true,
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("error")
      if (result.type === "error") {
        expect(result.source).toBe("api")
        expect(result.message).toBe("API request failed")
        expect(result.recoverable).toBe(true)
      }
    })

    it("should transition from paused to error", () => {
      const state: LoopState = {
        type: "paused",
        attached: false,
        iteration: 2,
      }
      const action: LoopAction = {
        type: "error",
        source: "pty",
        message: "Terminal crashed",
        recoverable: false,
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("error")
      if (result.type === "error") {
        expect(result.source).toBe("pty")
        expect(result.message).toBe("Terminal crashed")
        expect(result.recoverable).toBe(false)
      }
    })

    it("should transition from pausing to error", () => {
      const state: LoopState = {
        type: "pausing",
        iteration: 4,
        sessionId: "session",
      }
      const action: LoopAction = {
        type: "error",
        source: "sse",
        message: "Connection lost",
        recoverable: true,
      }

      const result = loopReducer(state, action)

      expect(result.type).toBe("error")
      if (result.type === "error") {
        expect(result.source).toBe("sse")
        expect(result.message).toBe("Connection lost")
      }
    })

    it("should not change state when already stopped", () => {
      const state: LoopState = { type: "stopped" }
      const action: LoopAction = {
        type: "error",
        source: "server",
        message: "Some error",
        recoverable: true,
      }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })
  })

  describe("retry action", () => {
    it("should transition from recoverable error to starting", () => {
      const state: LoopState = {
        type: "error",
        source: "server",
        message: "Server failed",
        recoverable: true,
      }
      const action: LoopAction = { type: "retry" }

      const result = loopReducer(state, action)

      expect(result.type).toBe("starting")
    })

    it("should not transition from non-recoverable error", () => {
      const state: LoopState = {
        type: "error",
        source: "pty",
        message: "Terminal crashed",
        recoverable: false,
      }
      const action: LoopAction = { type: "retry" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })

    it("should not change state when not in error state", () => {
      const state: LoopState = {
        type: "running",
        attached: false,
        iteration: 1,
        sessionId: "session",
      }
      const action: LoopAction = { type: "retry" }

      const result = loopReducer(state, action)

      expect(result).toEqual(state)
    })
  })

  describe("state machine flow scenarios", () => {
    it("should handle a complete lifecycle: start → ready → run → pause → resume → complete", () => {
      let state: LoopState = { type: "starting" }

      // Server becomes ready
      state = loopReducer(state, { type: "server_ready" })
      expect(state.type).toBe("ready")

      // User starts the loop
      state = loopReducer(state, { type: "start" })
      expect(state.type).toBe("running")

      // First iteration starts
      state = loopReducer(state, {
        type: "iteration_started",
        sessionId: "session-1",
      })
      if (state.type === "running") {
        expect(state.iteration).toBe(1)
      }

      // Session completes
      state = loopReducer(state, { type: "session_idle" })
      expect(state.type).toBe("running")

      // Second iteration starts
      state = loopReducer(state, {
        type: "iteration_started",
        sessionId: "session-2",
      })
      if (state.type === "running") {
        expect(state.iteration).toBe(2)
      }

      // User pauses
      state = loopReducer(state, { type: "toggle_pause" })
      expect(state.type).toBe("pausing")

      // Session completes while pausing
      state = loopReducer(state, { type: "session_idle" })
      expect(state.type).toBe("paused")

      // User resumes
      state = loopReducer(state, { type: "toggle_pause" })
      expect(state.type).toBe("running")

      // Third iteration starts
      state = loopReducer(state, {
        type: "iteration_started",
        sessionId: "session-3",
      })
      if (state.type === "running") {
        expect(state.iteration).toBe(3)
      }

      // Plan is complete
      state = loopReducer(state, {
        type: "plan_complete",
        summary: { manualTasks: [], blockedTasks: [] },
      })
      expect(state.type).toBe("complete")
      if (state.type === "complete") {
        expect(state.iterations).toBe(3)
        expect(state.summary).toEqual({ manualTasks: [], blockedTasks: [] })
      }
    })

    it("should handle attach/detach cycle while running", () => {
      let state: LoopState = {
        type: "running",
        attached: false,
        iteration: 1,
        sessionId: "session",
      }

      // Attach
      state = loopReducer(state, { type: "toggle_attach" })
      expect(state.type).toBe("running")
      if (state.type === "running") {
        expect(state.attached).toBe(true)
      }

      // Cannot pause while attached
      state = loopReducer(state, { type: "toggle_pause" })
      expect(state.type).toBe("running")
      if (state.type === "running") {
        expect(state.attached).toBe(true)
      }

      // Detach
      state = loopReducer(state, { type: "toggle_attach" })
      if (state.type === "running") {
        expect(state.attached).toBe(false)
      }

      // Now can pause
      state = loopReducer(state, { type: "toggle_pause" })
      expect(state.type).toBe("pausing")
    })
  })
})
