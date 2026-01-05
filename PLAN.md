# Activity Log Visual Improvements

## Overview

The current activity log implementation has several usability issues:
1. Multi-line content spills across rows instead of being contained to one line
2. Icons alone (`<`, `>`, `~`, `⚙`) are not immediately comprehensible
3. All text appears in the same muted color, making the UI bland
4. Token/diff stats header is not visible (layout issue)
5. The `session.diff` event includes `.loop.log` changes which should be filtered
6. File reads are not logged as a distinct event type

This plan addresses all issues by:
- Enforcing single-line entries with proper truncation
- Replacing icons with bracketed labels (`[user]`, `[ai]`, `[think]`, `[tool]`, `[read]`, `[edit]`, etc.)
- Color-coding labels while keeping content appropriately dimmed
- Fixing the stats header layout
- Handling `session.diff` events properly with filtering
- Adding `file_read` as a distinct event type

### Visual Target
```
Tokens: 12,105 (in:12,017 out:25 rsn:63)                  Diff: +6/-0 (1)

16:05:17  [user]  hello!
16:05:23  [think] Acknowledge the User...
16:05:23  [ai]    Hello! I'm opencode...
16:05:23  [tool]  bash: ls -la
16:05:24  [read]  package.json
16:05:25  [edit]  src/App.tsx
16:05:26  [idle]  Session idle
```

Labels are color-coded:
- `[user]` → cyan/info
- `[ai]` → green/success
- `[think]` → yellow/warning
- `[tool]` → magenta/primary
- `[read]` → cyan/info
- `[edit]` → cyan/info
- `[task]` → magenta/primary
- `[start]`, `[idle]` → muted
- `[error]` → red/error

## Backlog

### Phase 1: Fix Single-Line Truncation

- [x] Update `truncateText()` in `src/lib/format.ts`
  - Replace newlines and carriage returns with spaces: `text.replace(/[\r\n]+/g, " ")`
  - Collapse multiple whitespace into single space: `.replace(/\s+/g, " ").trim()`
  - Then apply the existing length truncation logic

### Phase 2: Add `file_read` Event Type

- [x] Update `src/hooks/useActivityLog.ts`
  - Add `"file_read"` to the `ActivityEventType` union type (line ~7-16)

### Phase 3: Handle `session.diff` Event with Filtering

- [x] Update `src/hooks/useSSE.ts`
  - Add `FileDiff` interface after `SessionSummary` (around line 65):
    ```typescript
    export interface FileDiff {
      file: string
      additions: number
      deletions: number
    }
    ```
  - Add `onSessionDiff?: (diffs: FileDiff[]) => void` to `SSEEventHandlers` interface (after `onSessionSummary`)
  - Add `session.diff` case in `processEvent()` switch statement (after `session.updated` case, around line 325):
    - Extract `sessionID` and `diff` array from event properties
    - Apply session filter if set
    - Call `handlers.onSessionDiff?.(diffs)` if diff array exists

- [x] Update `src/App.tsx`
  - Import `FileDiff` from `./hooks/useSSE`
  - Replace `onSessionSummary` handler with `onSessionDiff` handler (around line 277-278):
    - Filter out entries where `d.file.endsWith('.loop.log')`
    - Aggregate `additions`, `deletions`, and `files` count from filtered array
    - Call `sessionStats.setDiff({ additions, deletions, files })`

### Phase 4: Handle `read` Tool as `file_read` Event

- [x] Update `onToolUse` handler in `src/App.tsx` (around line 280-285)
  - Check if `toolName === "read"`
  - If read: call `activityLog.addEvent("file_read", preview)` (no detail, no dimmed)
  - Otherwise: keep existing `activityLog.addEvent("tool_use", preview, { detail: toolName })`

### Phase 5: Replace Icons with Labeled Brackets

- [x] Update `src/components/ActivityLog.tsx`
  - Rename `getEventIcon()` to `getEventLabel()` (line ~21-45)
  - Update return values:
    - `session_start` → `"[start]"`
    - `session_idle` → `"[idle]"`
    - `task` → `"[task]"`
    - `file_edit` → `"[edit]"`
    - `error` → `"[error]"`
    - `user_message` → `"[user]"`
    - `assistant_message` → `"[ai]"`
    - `reasoning` → `"[think]"`
    - `tool_use` → `"[tool]"`
    - `file_read` → `"[read]"` (new case)
    - `default` → `"[???]"`

### Phase 6: Color-Code Labels

- [x] Update `src/components/ActivityLog.tsx`
  - Add new function `getLabelColor(type: ActivityEventType): string` that returns:
    - `user_message` → `theme().info`
    - `assistant_message` → `theme().success`
    - `reasoning` → `theme().warning`
    - `tool_use` → `theme().primary`
    - `file_read` → `theme().info`
    - `file_edit` → `theme().info`
    - `task` → `theme().primary`
    - `error` → `theme().error`
    - `session_start`, `session_idle` → `theme().textMuted`
    - `default` → `theme().text`
  - Update the event row rendering (line ~156-169):
    - Split into two spans: one for label (colored), one for content
    - Label span: `<span style={{ fg: getLabelColor(event.type) }}>{getEventLabel(event.type)}</span>`
    - Content span: `<span style={{ fg: event.dimmed ? theme().textMuted : theme().text }}> {content}</span>`
    - Remove `event.detail` display (tool name was in detail, now label handles it)
  - Update content formatting:
    - For `tool_use`: prepend tool name to content, e.g., `bash: ls -la`
    - This requires passing tool name differently - check if `event.detail` should contain tool name

### Phase 7: Fix Stats Header Layout

- [x] Update `src/components/ActivityLog.tsx`
  - Remove `marginTop: -1` from the parent box style (line ~116)
  - Consider changing the `<Show when={props.tokens && props.diff}>` condition to always show the header row (even with zeros), or verify the condition is correct
  - Ensure the stats header box has `flexShrink: 0` to prevent it from being compressed
  - Test that the header is visible after changes

### Phase 8: Update Tool Event Content Format

- [x] Update `onToolUse` handler in `src/App.tsx` to format content properly
  - Change the event message to include tool name prefix: `${toolName}: ${preview}`
  - Remove the `detail` option since we no longer display it separately
  - Example: `activityLog.addEvent("tool_use", `bash: ${preview}`)`

### Phase 9: Testing & Verification

- [ ] Run `bun run lint` and fix any issues

- [ ] Run `bun test` and fix any test failures

- [ ] [MANUAL] Visual verification of the activity log
  - Run `bun run build && bun run start --debug`
  - Verify:
    - Stats header (tokens/diff) is visible at the top
    - All entries are single-line (no text spilling to next row)
    - Labels are bracketed and readable: `[user]`, `[ai]`, `[think]`, `[tool]`, `[read]`, `[edit]`, `[idle]`, `[start]`
    - Labels are color-coded (user=cyan, ai=green, think=yellow, tool=magenta, etc.)
    - Content is dimmed for messages/reasoning, normal for tools/edits
    - File reads show as `[read]` events
    - Diff stats do not count `.loop.log` changes

## Testing Notes

### Manual Verification Steps

1. **Build and run in debug mode:**
   ```bash
   bun run build && bun run start --debug
   ```

2. **In the spawned OpenCode terminal, send test messages:**
   - Simple greeting: "hello" → should show `[user]` and `[ai]` events
   - File read: "read package.json" → should show `[read]` event with filename
   - Bash command: "run ls -la" → should show `[tool]` with `bash: ls -la`
   - File edit: "add a comment to build.ts" → should show `[edit]` and verify diff stats update (without .loop.log)

3. **Verify stats header:**
   - Token counts should accumulate and display at top
   - Format: "Tokens: X,XXX (in:X,XXX out:XXX rsn:XXX)"
   - Diff should show: "Diff: +N/-M (F)"

4. **Verify color coding:**
   - `[user]` labels should be cyan/blue
   - `[ai]` labels should be green
   - `[think]` labels should be yellow/orange
   - `[tool]` labels should be magenta/purple
   - Content text should be dimmed for messages, normal for tools

5. **Verify single-line enforcement:**
   - Long messages should truncate with "..."
   - Multi-line reasoning should collapse to one line

### Existing Test Commands
```bash
bun test           # Run all tests
bun run lint       # Check for lint errors
bun run build      # Verify build succeeds
```

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/format.ts` | Modify | Update `truncateText()` to strip newlines and normalize whitespace |
| `src/hooks/useActivityLog.ts` | Modify | Add `file_read` to `ActivityEventType` union |
| `src/hooks/useSSE.ts` | Modify | Add `FileDiff` interface, `onSessionDiff` handler, handle `session.diff` event |
| `src/components/ActivityLog.tsx` | Modify | Replace icons with labels, add color coding, fix stats header layout |
| `src/App.tsx` | Modify | Handle `read` tool as `file_read`, replace `onSessionSummary` with `onSessionDiff`, update tool event format |
