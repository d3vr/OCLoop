# Activity Pane Enhancement Plan

## Overview

Enhance the ocloop activity pane to provide better visibility into OpenCode session activity. The current implementation only shows basic events (session start/idle, task updates, file edits, errors). We're adding:

1. **Session stats header** - Running token totals and diff summary displayed at the top of the activity area
2. **Rich activity events** - Tool usage, user/assistant messages, and reasoning with truncated previews
3. **Background-based styling** - Adopt OpenCode's visual pattern of using background colors instead of borders to differentiate panes

### Visual Target
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dashboard (unchanged)                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Tokens: 12,105 (in:12,017 out:25 rsn:63)                  Diff: +6/-0 (1)    │
│                                                                              │
│ 16:05:17  > hello!                                                           │
│ 16:05:23  ~ Acknowledge the User...                                          │
│ 16:05:23  < Hello! I'm opencode...                                           │
│ 16:05:23  ⚙ bash: ls -la                                                     │
│ 16:05:23  ✎ src/App.tsx                                                      │
│ 16:05:24  ◯ Session idle                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Backlog

### Phase 1: Formatting Utilities

- [x] Create `src/lib/format.ts` with formatting helper functions
  - `formatTokenCount(n: number): string` - Format with thousands separator ("12,105")
  - `truncateText(text: string, maxLen: number): string` - Truncate with ellipsis ("Hello! I'm ope...")
  - `formatDiffSummary(additions: number, deletions: number, files: number): string` - Format as "+6/-0 (1)"
  - `getToolPreview(toolName: string, input: Record<string, unknown>): string` - Extract preview from tool input:
    - `bash` → `input.command` truncated
    - `read` → `input.filePath` basename
    - `write` → `input.filePath` basename
    - `edit` → `input.filePath` basename
    - `glob` → `input.pattern`
    - `grep` → `input.pattern`
    - `task` → `input.description` or "subtask"
    - Default → tool name only

### Phase 2: Session Stats Hook

- [x] Create `src/hooks/useSessionStats.ts` for tracking session-level statistics
  - Interface `SessionTokens`: `{ input: number, output: number, reasoning: number, cacheRead: number, cacheWrite: number }`
  - Interface `SessionDiff`: `{ additions: number, deletions: number, files: number }`
  - Interface `UseSessionStatsReturn`:
    - `tokens(): SessionTokens` - Current cumulative token counts
    - `diff(): SessionDiff` - Current diff summary
    - `totalTokens(): number` - Computed total (input + output + reasoning)
    - `addTokens(tokens: Partial<SessionTokens>): void` - Accumulate tokens from step-finish events
    - `setDiff(diff: SessionDiff): void` - Update diff summary from session.updated events
    - `reset(): void` - Reset all stats (for new session)

### Phase 3: Extend Activity Log Types

- [x] Update `src/hooks/useActivityLog.ts` to support new event types
  - Add new event types to `ActivityEventType`: `user_message`, `assistant_message`, `reasoning`, `tool_use`
  - Add optional `dimmed?: boolean` field to `ActivityEvent` interface
  - Add optional `detail?: string` field for tool command/arg preview
  - Update `addEvent` signature to accept optional third parameter `options?: { dimmed?: boolean, detail?: string }`

### Phase 4: Extend SSE Event Handlers

- [x] Update `src/hooks/useSSE.ts` to handle additional event types
  - Add new handler types to `SSEEventHandlers` interface:
    - `onToolUse?: (part: ToolPart) => void`
    - `onMessageText?: (part: TextPart, role: "user" | "assistant") => void`
    - `onReasoning?: (part: ReasoningPart) => void`
    - `onStepFinish?: (part: StepFinishPart) => void`
    - `onSessionSummary?: (summary: { additions: number, deletions: number, files: number }) => void`
  - Add `message.part.updated` handling in `processEvent()`:
    - Check `part.type` and dispatch to appropriate handler
    - For text/reasoning parts, only fire on first appearance (check for `time.start` without `time.end`, or track seen part IDs)
    - Need to determine message role from context (track last message.updated with role info)
  - Add `session.updated` handling to extract and dispatch `summary` when present
  - Import necessary Part types from SDK or define locally

### Phase 5: Update ActivityLog Component Styling

- [x] Update `src/components/ActivityLog.tsx` for background-based styling and stats header
  - Remove border-related styles (`border`, `borderStyle`, `borderColor`)
  - Add `backgroundColor: theme().backgroundPanel`
  - Add stats header row (new `ActivityStatsHeader` sub-component or inline):
    - Left-aligned: "Tokens: {total} (in:{input} out:{output} rsn:{reasoning})"
    - Right-aligned: "Diff: +{add}/-{del} ({files})"
    - Use `flexDirection: "row"`, `justifyContent: "space-between"`
  - Add new props: `tokens: SessionTokens`, `diff: SessionDiff`
  - Update `getEventIcon()` to handle new event types:
    - `user_message` → `">"`
    - `assistant_message` → `"<"`
    - `reasoning` → `"~"`
    - `tool_use` → `"⚙"`
  - Update `getEventColor()` to return `theme().textMuted` for dimmed events
  - Update event row rendering to:
    - Check `event.dimmed` and apply muted color to message text
    - Display `event.detail` after the icon if present (for tool_use: "⚙ bash: ls -la")
    - Truncate message content to ~40 chars

### Phase 6: Wire Up Events in App.tsx

- [x] Update `src/App.tsx` to integrate session stats and new SSE handlers
  - Import and initialize `useSessionStats()` hook
  - Pass `sessionStats.tokens()` and `sessionStats.diff()` to `<ActivityLog>` component
  - Track message roles: maintain a `Map<messageID, role>` signal updated from `message.updated` events
  - Add SSE handlers in the `useSSE` options:
    - `onStepFinish`: Extract tokens from part and call `sessionStats.addTokens()`
    - `onSessionSummary`: Call `sessionStats.setDiff()`
    - `onToolUse`: Call `activityLog.addEvent("tool_use", getToolPreview(...), { detail: toolName })`
    - `onMessageText`: Determine role from tracked map, add `user_message` or `assistant_message` event with `{ dimmed: true }`
    - `onReasoning`: Add `reasoning` event with `{ dimmed: true }`
  - Reset session stats when session changes (new session created)

### Phase 7: Testing & Polish

- [ ] [MANUAL] Visual verification of the activity pane
  - Run `bun run build && bun run start --debug` to launch in debug mode
  - Send messages and verify:
    - Token counts accumulate correctly in header
    - Diff summary updates after file changes
    - User/assistant messages appear with `>` / `<` icons and dimmed text
    - Tool usage shows with `⚙` icon and command preview
    - Reasoning appears with `~` icon (if model produces reasoning)
  - Verify styling: background colors replace borders, text is readable

- [x] Run `bun run lint` and fix any issues

- [x] Run `bun test` and fix any test failures (if existing tests affected)

## Testing Notes

### Manual Verification Steps

1. **Build and run in debug mode:**
   ```bash
   bun run build && bun run start --debug
   ```

2. **In the spawned OpenCode terminal, send test messages:**
   - Simple greeting: "hello" → should show user_message and assistant_message events
   - File operation: "read package.json" → should show tool_use event with file preview
   - Bash command: "run ls -la" → should show tool_use with command preview
   - File edit: "add a comment to src/App.tsx" → should show file_edit and diff summary update

3. **Verify token accumulation:**
   - After each message exchange, token counts should increase
   - Format should be: "Tokens: X,XXX (in:X,XXX out:XXX rsn:XXX)"

4. **Verify diff summary:**
   - After file edits, should show: "Diff: +N/-M (F)" where F = file count

5. **Verify styling:**
   - Activity pane should have a subtle background color (backgroundPanel)
   - No visible borders around the activity pane
   - Dimmed events (messages, reasoning) should use muted text color
   - Tool/file events should use normal text color

### Existing Test Commands
```bash
bun test           # Run all tests
bun run lint       # Check for lint errors
bun run build      # Verify build succeeds
```

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/format.ts` | Create | Formatting utilities for tokens, text truncation, diff summary, tool preview |
| `src/hooks/useSessionStats.ts` | Create | Hook for tracking cumulative session tokens and diff summary |
| `src/hooks/useActivityLog.ts` | Modify | Add new event types, dimmed flag, detail field |
| `src/hooks/useSSE.ts` | Modify | Add handlers for message.part.updated, step-finish, session summary |
| `src/components/ActivityLog.tsx` | Modify | Add stats header, new icons, background styling, dimmed text support |
| `src/App.tsx` | Modify | Wire up session stats hook and new SSE event handlers |

## Technical Notes

### Token Tracking Strategy
We'll track tokens from `step-finish` events in `message.part.updated`. Each step-finish contains:
```typescript
{
  type: "step-finish",
  tokens: { input: number, output: number, reasoning: number, cache: { read: number, write: number } }
}
```
These are accumulated into running totals. The `message.updated` event also contains tokens but we'll use step-finish for consistency and granularity.

### Message Part Deduplication
`message.part.updated` events fire multiple times as content streams. To avoid duplicate activity entries:
- Track seen part IDs in a Set
- Only add activity entry on first occurrence of each part ID
- Check for presence of `time.start` to confirm it's a real part (not a delta update)

### Tool Input Access
Tool parts have structure: `part.state.input` contains the tool arguments. For bash:
- `part.state.input.command` - the shell command
- `part.state.input.description` - optional description

We'll display the truncated command for bash, and appropriate fields for other tools.

### Background Color Hierarchy (from OpenCode)
- `theme.background` - Main app background (darkest)
- `theme.backgroundPanel` - Panel backgrounds (slightly lighter) ← Use for ActivityLog
- `theme.backgroundElement` - Interactive elements (lightest)
