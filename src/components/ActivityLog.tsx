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
 * Get the label for an event type
 */
function getEventLabel(type: ActivityEventType): string {
  switch (type) {
    case "session_start":
      return "[start]";
    case "session_idle":
      return "[idle]";
    case "task":
      return "[task]";
    case "file_edit":
      return "[edit]";
    case "error":
      return "[error]";
    case "user_message":
      return "[user]";
    case "assistant_message":
      return "[ai]";
    case "reasoning":
      return "[think]";
    case "tool_use":
      return "[tool]";
    case "file_read":
      return "[read]";
    default:
      return "[???]";
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

  // Get color for event label
  const getLabelColor = (type: ActivityEventType): string => {
    switch (type) {
      case "user_message":
        return theme().info;
      case "assistant_message":
        return theme().success;
      case "reasoning":
        return theme().warning;
      case "tool_use":
      case "task":
        return theme().primary;
      case "file_read":
      case "file_edit":
        return theme().info;
      case "error":
        return theme().error;
      case "session_start":
      case "session_idle":
        return theme().textMuted;
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
        overflow: "hidden",
      }}
    >
      {/* Stats header */}
      <Show when={props.tokens && props.diff}>
        <box
          style={{
            height: 2,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingLeft: 1,
            paddingRight: 1,
            paddingTop: 1,
            marginBottom: 1,
            flexShrink: 0,
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
      <scrollbox
        stickyScroll={true}
        stickyStart="bottom"
        verticalScrollbarOptions={{
          visible: true,
          trackOptions: {
            foregroundColor: theme().primary,
          },
        }}
        viewportOptions={{
          paddingRight: 1,
        }}
        style={{
          flexGrow: 1,
          flexDirection: "column",
          paddingLeft: 1,
          paddingBottom: 2,
          overflow: "hidden",
        }}
      >
        <For each={displayEvents()}>
          {(event) => {
            const content =
              event.type === "tool_use" && event.detail
                ? `${event.detail}: ${event.message}`
                : event.message;

            return (
              <text>
                <span style={{ fg: theme().textMuted }}>
                  {formatTime(event.timestamp)}
                </span>
                {"  "}
                <span style={{ fg: getLabelColor(event.type) }}>
                  {getEventLabel(event.type)}
                </span>
                <span
                  style={{
                    fg: event.dimmed ? theme().textMuted : theme().text,
                  }}
                >
                  {" "}
                  {truncateText(content, 40)}
                </span>
              </text>
            );
          }}
        </For>
      </scrollbox>
    </box>
  );
}
