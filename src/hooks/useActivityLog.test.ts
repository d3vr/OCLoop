import { describe, it, expect } from "bun:test";
import { createRoot } from "solid-js";
import { useActivityLog } from "./useActivityLog";

describe("useActivityLog", () => {
  it("should initialize with empty events", () => {
    createRoot((dispose) => {
      const { events } = useActivityLog();
      expect(events()).toEqual([]);
      dispose();
    });
  });

  it("should add events", () => {
    createRoot((dispose) => {
      const { events, addEvent } = useActivityLog();
      
      addEvent("session_start", "Start");
      expect(events()).toHaveLength(1);
      expect(events()[0].type).toBe("session_start");
      expect(events()[0].message).toBe("Start");
      expect(events()[0].id).toBe(1);
      expect(events()[0].timestamp).toBeInstanceOf(Date);
      
      dispose();
    });
  });

  it("should support new event types", () => {
    createRoot((dispose) => {
      const { events, addEvent } = useActivityLog();
      
      addEvent("user_message", "User said hi");
      addEvent("assistant_message", "Assistant replied");
      addEvent("reasoning", "Thinking...");
      addEvent("tool_use", "Running command");

      const log = events();
      expect(log).toHaveLength(4);
      expect(log[0].type).toBe("user_message");
      expect(log[1].type).toBe("assistant_message");
      expect(log[2].type).toBe("reasoning");
      expect(log[3].type).toBe("tool_use");
      
      dispose();
    });
  });

  it("should support optional options (dimmed, detail)", () => {
    createRoot((dispose) => {
      const { events, addEvent } = useActivityLog();
      
      addEvent("tool_use", "bash", { detail: "ls -la" });
      addEvent("reasoning", "thought", { dimmed: true });

      const log = events();
      expect(log[0].detail).toBe("ls -la");
      expect(log[1].dimmed).toBe(true);
      
      dispose();
    });
  });

  it("should cap events at MAX_EVENTS", () => {
    createRoot((dispose) => {
      const { events, addEvent } = useActivityLog();
      
      // Add 105 events
      for (let i = 0; i < 105; i++) {
        addEvent("task", `Task ${i}`);
      }

      const log = events();
      expect(log).toHaveLength(100);
      expect(log[0].message).toBe("Task 5");
      expect(log[99].message).toBe("Task 104");
      
      dispose();
    });
  });

  it("should clear events", () => {
    createRoot((dispose) => {
      const { events, addEvent, clear } = useActivityLog();
      
      addEvent("session_start", "Start");
      expect(events()).toHaveLength(1);
      
      clear();
      expect(events()).toHaveLength(0);
      
      dispose();
    });
  });
});
