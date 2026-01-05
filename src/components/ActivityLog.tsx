import { For, createMemo, Show } from "solid-js";
import { useTheme } from "../context/ThemeContext";
import type { ActivityEvent, ActivityEventType } from "../hooks/useActivityLog";
import type { SessionTokens, SessionDiff } from "../hooks/useSessionStats";
import { formatTokenCount, formatDiffSummary, truncateText } from "../lib/format";

/**
 * Props for the ActivityLog component
 */
export interface ActivityLogProps {
  /** List of activity events to display */
  events: ActivityEvent[];
  /** Session token statistics */
  tokens?: SessionTokens;
  /** Session diff statistics */
  diff?: SessionDiff;
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
    case "user_message":
      return ">";
    case "assistant_message":
      return "<";
    case "reasoning":
      return "~";
    case "tool_use":
      return "⚙";
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
 * Displays a scrollable list of activity events.
 *
 * Each row shows: `HH:MM:SS  <icon> <message>`
 *
 * Color coding by event type:
 * - session_start/idle: muted text
 * - task: primary color
 * - file_edit: normal text with edit icon
 * - error: error color with warning icon
 * - dimmed events (messages, reasoning): muted text
 *
 * @example
 * ```tsx
 * const activity = useActivityLog()
 * const stats = useSessionStats()
 *
 * <ActivityLog
 *   events={activity.events()}
 *   tokens={stats.tokens()}
 *   diff={stats.diff()}
 * />
 * ```
 */
export function ActivityLog(props: ActivityLogProps) {
  const { theme } = useTheme();

  // Get color for event type
  const getEventColor = (event: ActivityEvent): string => {
    if (event.dimmed) {
      return theme().textMuted;
    }

    switch (event.type) {
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
        backgroundColor: theme().backgroundPanel,
        flexGrow: 1,
        flexDirection: "column",
        marginTop: -1,
        overflow: "hidden",
      }}
    >
      {/* Stats header */}
      <Show when={props.tokens && props.diff}>
        <box
          style={{
            height: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingLeft: 1,
            paddingRight: 1,
            marginBottom: 1,
          }}
        >
          <text>
            <span style={{ fg: theme().textMuted }}>
              Tokens: {formatTokenCount(props.tokens!.input + props.tokens!.output + props.tokens!.reasoning)}
              {" "}(in:{formatTokenCount(props.tokens!.input)} out:{formatTokenCount(props.tokens!.output)} rsn:{formatTokenCount(props.tokens!.reasoning)})
            </span>
          </text>
          <text>
            <span style={{ fg: theme().textMuted }}>
              Diff: {formatDiffSummary(props.diff!.additions, props.diff!.deletions, props.diff!.files)}
            </span>
          </text>
        </box>
      </Show>

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
              <span style={{ fg: getEventColor(event) }}>
                {"  "}
                {getEventIcon(event.type)} {truncateText(event.message, 40)}
                {event.detail ? ` ${event.detail}` : ""}
              </span>
            </text>
          )}
        </For>
      </box>
    </box>
  );
}
