import { Show } from "solid-js";
import { Dialog } from "../ui/Dialog";
import { useTheme } from "../context/ThemeContext";
import { formatDuration } from "../hooks/useLoopStats";

export interface DialogCompletionProps {
  iterations: number;
  totalTime: number;
  summary: string;
  onClose: () => void;
}

export function DialogCompletion(props: DialogCompletionProps) {
  const { theme } = useTheme();

  // Calculate dialog height based on content
  const dialogHeight = () => {
    let height = 15; // Base: header + summary line + footer + padding

    // Summary content
    const lines = props.summary.trim().split("\n").length;
    height += Math.min(lines, 12);

    return Math.max(9, height);
  };

  return (
    <Dialog onClose={props.onClose} width={62} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        {/* Header */}
        <box
          style={{
            width: "100%",
            justifyContent: "space-between",
            marginBottom: 1,
          }}
        >
          <text>
            <span style={{ fg: theme().success, bold: true }}>✓</span>
            <span style={{ fg: theme().primary, bold: true }}>
              {" "}
              Plan Complete
            </span>
          </text>
          <text>
            <span style={{ fg: theme().textMuted }}>esc</span>
          </text>
        </box>

        {/* Summary line */}
        <text>
          <span style={{ fg: theme().textMuted }}>Completed in </span>
          <span style={{ fg: theme().text }}>{props.iterations}</span>
          <span style={{ fg: theme().textMuted }}>
            {" "}
            iteration{props.iterations !== 1 ? "s" : ""} (
          </span>
          <span style={{ fg: theme().text }}>
            {formatDuration(props.totalTime)}
          </span>
          <span style={{ fg: theme().textMuted }}>)</span>
        </text>

        {/* Summary Content */}
        <scrollbox
          marginTop={1}
          maxHeight={12}
          verticalScrollbarOptions={{
            visible: true,
            trackOptions: {
              backgroundColor: theme().backgroundPanel,
              foregroundColor: theme().borderSubtle,
            },
          }}
          viewportOptions={{
            paddingRight: 1,
          }}
        >
          <text>
            <span style={{ fg: theme().text }}>{props.summary}</span>
          </text>
        </scrollbox>

        {/* Footer */}
        <text style={{ marginTop: 1 }}>
          <span style={{ bold: true }}>Quit</span> Q
        </text>
      </box>
    </Dialog>
  );
}
