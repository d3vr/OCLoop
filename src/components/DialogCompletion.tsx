import { For, Show } from "solid-js"
import { Dialog } from "../ui/Dialog"
import { useTheme } from "../context/ThemeContext"
import { formatDuration } from "../hooks/useLoopStats"

export interface DialogCompletionProps {
  iterations: number
  totalTime: number
  manualTasks: string[]
  blockedTasks: string[]
  rawContent?: string
  onClose: () => void
}

export function DialogCompletion(props: DialogCompletionProps) {
  const { theme } = useTheme()

  const hasRemainingTasks = () =>
    props.manualTasks.length > 0 || props.blockedTasks.length > 0 || (props.rawContent && props.rawContent.trim().length > 0)

  // Calculate dialog height based on content
  const dialogHeight = () => {
    let height = 7 // Base: header + summary + footer + padding
    
    // If we have raw content, use it with a max height
    if (props.rawContent && props.rawContent.trim().length > 0) {
       // Limit to 12 lines max for the content area
       const lines = props.rawContent.trim().split('\n').length;
       height += Math.min(lines, 12);
       return Math.max(9, height);
    }
    
    // Fallback to structured calculation
    if (props.manualTasks.length > 0) {
      height += 1 + props.manualTasks.length // Header + items
    }
    if (props.blockedTasks.length > 0) {
      height += 1 + props.blockedTasks.length // Header + items
    }
    if (!hasRemainingTasks()) {
      height += 1 // "All automatable tasks finished" message
    }
    return Math.max(9, height)
  }

  return (
    <Dialog onClose={props.onClose} width={62} height={dialogHeight()}>
      <box style={{ flexDirection: "column" }}>
        {/* Header */}
        <box style={{ width: "100%", justifyContent: "space-between", marginBottom: 1 }}>
          <text>
            <span style={{ fg: theme().success, bold: true }}>✓</span>
            <span style={{ fg: theme().primary, bold: true }}> Plan Complete</span>
          </text>
          <text>
            <span style={{ fg: theme().textMuted }}>esc</span>
          </text>
        </box>

        {/* Summary line */}
        <text>
          <span style={{ fg: theme().textMuted }}>Completed in </span>
          <span style={{ fg: theme().text }}>{props.iterations}</span>
          <span style={{ fg: theme().textMuted }}> iteration{props.iterations !== 1 ? "s" : ""} (</span>
          <span style={{ fg: theme().text }}>{formatDuration(props.totalTime)}</span>
          <span style={{ fg: theme().textMuted }}>)</span>
        </text>

        {/* Raw content display (priority) */}
        <Show when={props.rawContent && props.rawContent.trim().length > 0}>
           <scrollbox 
             marginTop={1}
             maxHeight={12}
             verticalScrollbarOptions={{
               visible: true,
               trackOptions: {
                 backgroundColor: theme().backgroundPanel,
                 foregroundColor: theme().borderSubtle
               }
             }}
             viewportOptions={{
               paddingRight: 1
             }}
           >
             <text>
                <span style={{ fg: theme().text }}>{props.rawContent}</span>
             </text>
           </scrollbox>
        </Show>

        {/* Fallback: Structured display if no raw content */}
        <Show when={!props.rawContent || props.rawContent.trim().length === 0}>
          <box style={{ flexDirection: "column" }}>
            {/* Manual tasks section */}
            <Show when={props.manualTasks.length > 0}>
              <text style={{ marginTop: 1 }}>
                <span style={{ fg: theme().warning, bold: true }}>Manual Tasks</span>
              </text>
              <For each={props.manualTasks}>
                {(task) => (
                  <text>
                    <span style={{ fg: theme().textMuted }}>  • </span>
                    <span style={{ fg: theme().text }}>{task}</span>
                  </text>
                )}
              </For>
            </Show>

            {/* Blocked tasks section */}
            <Show when={props.blockedTasks.length > 0}>
              <text style={{ marginTop: 1 }}>
                <span style={{ fg: theme().error, bold: true }}>Blocked Tasks</span>
              </text>
              <For each={props.blockedTasks}>
                {(task) => (
                  <text>
                    <span style={{ fg: theme().textMuted }}>  • </span>
                    <span style={{ fg: theme().text }}>{task}</span>
                  </text>
                )}
              </For>
            </Show>
          </box>
        </Show>

        {/* No remaining tasks message */}
        <Show when={!hasRemainingTasks()}>
          <text style={{ marginTop: 1 }}>
            <span style={{ fg: theme().success }}>All automatable tasks finished.</span>
          </text>
        </Show>

        {/* Footer */}
        <text style={{ marginTop: 1 }}>
          <span style={{ bold: true }}>Quit</span> Q
        </text>
      </box>
    </Dialog>
  )
}
