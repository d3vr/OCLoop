import { For, createMemo } from "solid-js";
import { useTheme } from "../context/ThemeContext";
import type { ActivityEvent, ActivityEventType } from "../hooks/useActivityLog";

/**
 * Props for the ActivityLog component
 */
export interface ActivityLogProps {
  /** List of activity events to display */
  events: ActivityEvent[];
}

/**
 * Get the icon for an event type
 */
function getEventIcon(type: ActivityEventType): string {
  switch (type) {
    case "session_start":
      return "▶";
    case "session_idle":
      return "◯";
    case "task":
      return "◆";
    case "file_edit":
      return "✎";
    case "error":
      return "⚠";
    default:
      return "•";
  }
}

/**
 * Format a Date to HH:MM:SS
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * ActivityLog component
 *
 * Displays a scrollable list of activity events in a bordered panel.
 * Replaces the old TerminalPanel component with a simpler activity log.
 *
 * Each row shows: `HH:MM:SS  <icon> <message>`
 *
 * Color coding by event type:
 * - session_start/idle: muted text
 * - task: primary color
 * - file_edit: normal text with edit icon
 * - error: error color with warning icon
 *
 * @example
 * ```tsx
 * const activity = useActivityLog()
 *
 * <ActivityLog events={activity.events()} />
 * ```
 */
export function ActivityLog(props: ActivityLogProps) {
  const { theme } = useTheme();

  // Get color for event type
  const getEventColor = (type: ActivityEventType): string => {
    switch (type) {
      case "session_start":
      case "session_idle":
        return theme().textMuted;
      case "task":
        return theme().primary;
      case "file_edit":
        return theme().text;
      case "error":
        return theme().error;
      default:
        return theme().text;
    }
  };

  // Reverse events so most recent is at the bottom
  const displayEvents = createMemo(() => props.events);

  return (
    <box
      style={{
        border: true,
        borderStyle: "single",
        borderColor: theme().borderSubtle,
        flexGrow: 1,
        flexDirection: "column",
        marginTop: -1,
        overflow: "hidden",
      }}
    >
      {/* Title row */}
      <box
        style={{
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <text>
          <span style={{ fg: theme().textMuted }}>Activity</span>
        </text>
      </box>

      {/* Event list - scrollable, most recent at bottom */}
      <box
        style={{
          flexGrow: 1,
          flexDirection: "column",
          paddingLeft: 1,
          paddingRight: 1,
          overflow: "hidden",
        }}
      >
        <For each={displayEvents()}>
          {(event) => (
            <text>
              <span style={{ fg: theme().textMuted }}>
                {formatTime(event.timestamp)}
              </span>
              <span style={{ fg: getEventColor(event.type) }}>
                {"  "}
                {getEventIcon(event.type)} {event.message}
              </span>
            </text>
          )}
        </For>
      </box>
    </box>
  );
}
