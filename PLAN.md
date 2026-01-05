# Bug Fixes: Pause/Unpause, ActivityLog, Dialogs, Session Abort

## Overview

This plan addresses 6 bugs identified in the OCLoop application:

1. **Double session launch on unpause** - When going PAUSING → PAUSED → unpause, two sessions are launched instead of one
2. **ActivityLog autoscroll** - The activity pane should autoscroll to bottom, pause when user scrolls up, resume when scrolled back down
3. **ActivityLog padding** - Token stats panel and event list need proper padding for visual breathing room
4. **Session abort handling** - When user manually aborts from attached OC terminal, we should pause and log the abort
5. **Dialog buttons layout** - Quit/resume dialog buttons are stacked vertically instead of horizontally
6. **ESC hint overlap** - The "esc" hint overlaps with dialog title due to missing flexDirection

## Backlog

### Task 1: Fix double session launch on PAUSED → unpause

**Root cause:** Two places trigger `startIteration()` when unpausing:
1. The Space key handler directly calls `startIteration()` after dispatching `toggle_pause`
2. The effect at lines 698-706 also triggers `startIteration()` when it detects running state with empty sessionId

**Fix:** Remove the redundant `startIteration()` call from the Space key handler.

- [x] Update `src/App.tsx` (lines 978-988)
  - In the Space key handler, remove the `if (loop.state().type === "running") { startIteration() }` block
  - Keep only `loop.dispatch({ type: "toggle_pause" })`
  - The existing effect at lines 698-706 will handle starting the next iteration correctly

### Task 2: Add autoscroll with stickyScroll to ActivityLog

**Solution:** Use opentui's `<scrollbox>` component with `stickyScroll={true}` and `stickyStart="bottom"` which provides:
- Auto-scroll to bottom when new content is added
- Pauses auto-scroll when user scrolls up (internally tracked via `_hasManualScroll`)
- Resumes when user scrolls back to bottom

- [ ] Update `src/components/ActivityLog.tsx`
  - Replace the event list `<box>` wrapper (lines 152-190) with `<scrollbox>`
  - Add props: `stickyScroll={true}`, `stickyStart="bottom"`
  - Add `verticalScrollbarOptions` with theme-appropriate colors
  - Add `viewportOptions={{ paddingRight: 1 }}` for scrollbar clearance

### Task 3: Add padding to ActivityLog

- [ ] Update `src/components/ActivityLog.tsx`
  - Add `paddingBottom: 2` to the scrollbox (for breathing room at bottom of event list)
  - Add `paddingTop: 1` to the token stats header box (lines 126-136)

### Task 4: Handle session abort (MessageAbortedError)

**Background:** When user aborts from attached OC terminal (presses Esc), OpenCode sends:
- `session.error` event with `error.name === "MessageAbortedError"`
- `session.idle` event

**Solution:** Parse the error object in `useSSE.ts` and expose structured error info to handler.

- [ ] Update `src/hooks/useSSE.ts`
  - Add `SessionError` interface after `SSEStatus` type (around line 76):
    ```typescript
    export interface SessionError {
      message: string
      name?: string
      isAborted: boolean
    }
    ```
  - Update `onSessionError` signature in `SSEEventHandlers` interface (line 93):
    - Change from `(sessionId: string | undefined, error: string) => void`
    - To `(sessionId: string | undefined, error: SessionError) => void`
  - Update `session.error` case in `processEvent()` (lines 234-248):
    - Parse `event.properties.error` as an object with `{ name?: string; data?: { message?: string } }`
    - Create `SessionError` object with `isAborted: errorObj.name === "MessageAbortedError"`
    - Pass structured error to handler

- [ ] Update `src/App.tsx`
  - Update `onSessionError` handler (lines 242-244):
    - Check `error.isAborted`
    - If aborted: add activity event "Session aborted by user", dispatch `toggle_pause` if running
    - If not aborted: add error event with `error.message`

### Task 5: Fix DialogConfirm buttons layout

**Root cause:** Missing `flexDirection: "row"` on buttons container causes vertical stacking.

- [ ] Update `src/ui/DialogConfirm.tsx` (line 66)
  - Add `flexDirection: "row"` to the buttons container style

### Task 6: Fix DialogConfirm header layout (ESC hint overlap)

**Root cause:** Missing `flexDirection: "row"` on header box causes title and "esc" hint to stack.

- [ ] Update `src/ui/DialogConfirm.tsx` (line 49)
  - Add `flexDirection: "row"` to the header box style

### Task 7: Testing & Verification

- [ ] Run existing tests: `bun test`
- [ ] Run build: `bun run build`
- [ ] [MANUAL] Test double session fix:
  - Start loop, let it run an iteration
  - Press Space to pause (PAUSING state)
  - Wait for session to complete (PAUSED state)
  - Press Space to resume
  - Verify only ONE new session is created (check activity log for single `[start]` entry)
- [ ] [MANUAL] Test ActivityLog autoscroll:
  - Run loop and let activity events accumulate
  - Verify new events auto-scroll to bottom
  - Scroll up manually to view history
  - Verify auto-scroll pauses (new events don't scroll view)
  - Scroll back to bottom
  - Verify auto-scroll resumes
- [ ] [MANUAL] Test session abort handling:
  - Run loop or debug mode
  - Press T to open external terminal
  - In the terminal, press Esc to abort
  - Verify activity shows "Session aborted by user"
  - Verify app transitions to PAUSED state
- [ ] [MANUAL] Test dialog layouts:
  - Press Q to show quit confirmation
  - Verify buttons are in a horizontal row
  - Verify "esc" hint is on the same line as title, right-aligned

## Testing Notes

### Build and Test Commands
```bash
bun test           # Run all tests
bun run build      # Build the application
bun run start      # Start in normal mode
bun run start --debug  # Start in debug mode (for testing abort handling)
```

### Manual Test Scenarios

**Scenario 1: Double Session Fix**
1. `bun run build && bun run start`
2. Press S to start the loop
3. Wait for first iteration to begin (shows `[start]` in activity)
4. Press Space to pause
5. Wait for PAUSED state
6. Press Space to resume
7. Count `[start]` entries in activity log - should be exactly 2 (initial + resume)

**Scenario 2: Activity Autoscroll**
1. Start loop and let it run
2. Watch activity pane - should auto-scroll as new events appear
3. Use keyboard (if focused) or observe scrollbar to scroll up
4. New events should NOT scroll the view down
5. Scroll to very bottom
6. New events should resume auto-scrolling

**Scenario 3: Session Abort**
1. `bun run build && bun run start --debug`
2. Press N to create a session
3. Press T to open terminal config, select a terminal
4. In the terminal, type something to start the AI responding
5. Press Esc in the terminal to abort
6. Check OCLoop - should show "Session aborted by user" and enter PAUSED state

**Scenario 4: Dialog Layouts**
1. Start app in any mode
2. Press Q - quit confirmation should show
3. Verify: Title "Quit OCLoop?" on left, "esc" on right (same line)
4. Verify: "Cancel" and "Quit" buttons side by side (horizontal)

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/App.tsx` | Modify | Remove duplicate `startIteration()` from Space handler; update `onSessionError` handler |
| `src/components/ActivityLog.tsx` | Modify | Replace box with scrollbox, add stickyScroll, add padding |
| `src/hooks/useSSE.ts` | Modify | Add `SessionError` interface, parse error object properly |
| `src/ui/DialogConfirm.tsx` | Modify | Add `flexDirection: "row"` to header and buttons containers |
