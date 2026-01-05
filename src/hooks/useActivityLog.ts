import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";

/**
 * Activity event types that can appear in the log
 */
export type ActivityEventType =
  | "session_start"
  | "session_idle"
  | "task"
  | "file_edit"
  | "error"
  | "user_message"
  | "assistant_message"
  | "reasoning"
  | "tool_use"
  | "file_read";

/**
 * A single activity event in the log
 */
export interface ActivityEvent {
  /** Unique identifier for this event */
  id: number;
  /** When the event occurred */
  timestamp: Date;
  /** Type of event */
  type: ActivityEventType;
  /** Human-readable message */
  message: string;
  /** Whether the event text should be dimmed (muted color) */
  dimmed?: boolean;
  /** Additional detail text (e.g. tool command/args) */
  detail?: string;
}

/**
 * Maximum number of events to keep in the log
 */
const MAX_EVENTS = 100;

/**
 * Return type for the useActivityLog hook
 */
export interface UseActivityLogReturn {
  /** Accessor for the list of activity events (most recent last) */
  events: Accessor<ActivityEvent[]>;
  /** Add a new event to the log */
  addEvent: (
    type: ActivityEventType,
    message: string,
    options?: { dimmed?: boolean; detail?: string }
  ) => void;
  /** Clear all events from the log */
  clear: () => void;
}

/**
 * Hook to manage activity log state.
 *
 * Tracks events like session starts, file edits, task updates, and errors.
 * Automatically generates unique IDs and timestamps for each event.
 * Caps the log at 100 entries (oldest events are removed first).
 *
 * @example
 * ```tsx
 * const activity = useActivityLog()
 *
 * // Add events
 * activity.addEvent("session_start", "Session started")
 * activity.addEvent("file_edit", "src/App.tsx")
 * activity.addEvent("task", "Implement new feature")
 * activity.addEvent("error", "Build failed")
 *
 * // Access events in a component
 * <For each={activity.events()}>
 *   {(event) => <Text>{event.message}</Text>}
 * </For>
 *
 * // Clear the log
 * activity.clear()
 * ```
 */
export function useActivityLog(): UseActivityLogReturn {
  const [events, setEvents] = createSignal<ActivityEvent[]>([]);

  // Counter for generating unique IDs
  let nextId = 1;

  /**
   * Add a new event to the activity log
   * Events are appended to the end (most recent last)
   * If the log exceeds MAX_EVENTS, oldest events are removed
   */
  function addEvent(
    type: ActivityEventType,
    message: string,
    options?: { dimmed?: boolean; detail?: string }
  ): void {
    const event: ActivityEvent = {
      id: nextId++,
      timestamp: new Date(),
      type,
      message,
      dimmed: options?.dimmed,
      detail: options?.detail,
    };

    setEvents((prev) => {
      const updated = [...prev, event];
      // Cap at MAX_EVENTS by removing from the beginning
      if (updated.length > MAX_EVENTS) {
        return updated.slice(updated.length - MAX_EVENTS);
      }
      return updated;
    });
  }

  /**
   * Clear all events from the log
   */
  function clear(): void {
    setEvents([]);
  }

  return {
    events,
    addEvent,
    clear,
  };
}
