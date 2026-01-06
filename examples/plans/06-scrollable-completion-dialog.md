# Simplify Completion Dialog - Display Raw Content

## Overview

The completion dialog (`DialogCompletion.tsx`) currently tries to parse `.loop-complete` files looking for `- [MANUAL]` and `- [BLOCKED]` task patterns. However, AI agents write arbitrary markdown content in this file, and the line-by-line parser:
1. Only extracts the first line of multi-line tasks
2. Produces mangled output (e.g., "pausednstatecterminalolaunch:" instead of "paused state terminal launch:")

**Solution**: Replace structured parsing with simple raw text display in a scrollable container with max-height. This eliminates parsing bugs and shows the user exactly what the AI wrote.

## Backlog

- [x] **Update `CompletionSummary` type to include raw content**
  - File: `src/types.ts`
  - Add optional `rawContent?: string` field to `CompletionSummary` interface (keep existing fields for backward compat during transition)
  - This allows gradual migration without breaking existing code

- [x] **Add raw content reading to `parseCompletionFile`**
  - File: `src/lib/plan-parser.ts`
  - Modify `parseCompletionFile()` to also return the raw file content as a string
  - Return type already `CompletionSummary`, so just add `rawContent` to the returned object
  - If file doesn't exist or is empty, set `rawContent: ""`

- [x] **Update `DialogCompletion` to display raw content**
  - File: `src/components/DialogCompletion.tsx`
  - Add `rawContent?: string` prop to `DialogCompletionProps` interface
  - Replace the Manual Tasks / Blocked Tasks sections with a single scrollable `<box>` displaying raw content
  - Set `maxHeight` on the scrollable container (e.g., 12 lines) so dialog doesn't grow unbounded
  - Keep: title ("Plan Complete"), iteration count, duration, and "Press Q to exit" footer
  - Fallback: if `rawContent` is empty/undefined but `manualTasks`/`blockedTasks` exist, show the old structured display (backward compat)

- [x] **Update `App.tsx` to pass raw content to dialog**
  - File: `src/App.tsx`
  - In `startIteration()` around line 352: ensure `completeSummary.rawContent` is captured
  - In the completion effect around line 636: pass `rawContent={state.summary.rawContent}` to `DialogCompletion`

- [x] **Update tests for the new behavior**
  - File: `src/hooks/useLoopState.test.ts` - Update test cases that check `summary` structure to include `rawContent`
  - [x] File: `src/lib/plan-parser.test.ts` - Add test case for `parseCompletionFile` returning `rawContent`
  - Ensure existing tests still pass (the structured fields remain populated for PLAN.md parsing)

- [ ] [MANUAL] **Visual verification of the completion dialog**
  - Create a `.loop-complete` file with multi-line markdown content
  - Run ocloop and trigger completion (or mock completion state)
  - Verify the raw content displays correctly in a scrollable container
  - Verify long content doesn't overflow the dialog bounds

## Testing Notes

1. **Unit tests**: Run `bun test` from repo root to verify all parser and state tests pass

2. **Manual visual test**:
   ```bash
   # Create a test .loop-complete file with multi-line content
   cat > .loop-complete << 'EOF'
   # Remaining Manual Tasks

   - [ ] [MANUAL] Test toast notification flow:
     - Start ocloop in debug mode: `bun run dev -- -d`
     - Press `Ctrl+\` to test terminal launch

   - [ ] [MANUAL] Test paused state terminal launch:
     - Let session run, then press Space to pause
     - Press `Ctrl+\` - should still work
   EOF

   # Run ocloop - it should detect .loop-complete and show completion dialog
   bun run dev
   ```

3. **Verify scrolling**: If content exceeds max-height, ensure the container is scrollable or truncates gracefully

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | Add `rawContent?: string` to `CompletionSummary` |
| `src/lib/plan-parser.ts` | Modify | Return raw file content from `parseCompletionFile` |
| `src/lib/plan-parser.test.ts` | Modify | Add test for `rawContent` in `parseCompletionFile` |
| `src/components/DialogCompletion.tsx` | Modify | Display raw content instead of parsed tasks |
| `src/App.tsx` | Modify | Pass `rawContent` prop to `DialogCompletion` |
| `src/hooks/useLoopState.test.ts` | Modify | Update test fixtures to include `rawContent` |
