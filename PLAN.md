# SSE Connection Fix & Verbose Flag Implementation

## Overview

This plan addresses three critical issues in ocloop:

1. **SSE Connection Bug (Critical)**: The SSE hook captures an empty URL at creation time instead of using a reactive accessor. This causes the SSE connection to fail silently, resulting in:
   - Activity pane showing no events
   - `session.idle` events not being received
   - Loop not advancing to the next iteration after a session completes

2. **Quit Keybinding in Pausing State**: Users cannot quit ocloop while in the `pausing` state, leaving them stuck if something goes wrong.

3. **Verbose Keyboard Logging**: Keyboard events are logged to `.loop.log` unconditionally, cluttering the debug log. These should be hidden behind a `--verbose` flag.

**Root Cause Analysis (SSE Bug)**:
- In `App.tsx:227-228`, the URL is passed as `url: server.url() || ""` which evaluates to empty string at hook creation time (before server starts)
- `useSSE` stores this as a static `string`, not a reactive `Accessor<string>`
- When `sse.reconnect()` is called after server is ready, it still uses the empty URL
- Log evidence: `[INFO] [sse] Connecting {"url":""}` shows the connection attempt with empty URL

## Backlog

### SSE Connection Fix

- [ ] **Update `useSSE` hook to use reactive URL accessor**
  - File: `src/hooks/useSSE.ts`
  - Change `UseSSEOptions.url` type from `string` to `Accessor<string>` (line 36)
  - Update destructuring in `useSSE()` to keep `url` as accessor (line 94)
  - Update `connect()` function to call `url()` to get current value (lines 207, 211-212)
  - Add validation: if `url()` is empty, log warning and return early from `connect()`

- [ ] **Update App.tsx to pass URL as accessor**
  - File: `src/App.tsx`
  - Change line 228 from `url: server.url() || ""` to `url: () => server.url() || ""`

### Quit Keybinding Fix

- [ ] **Allow quit from pausing state**
  - File: `src/hooks/useLoopState.ts`
  - Add `if (s.type === "pausing") return true` to `canQuit()` memo (around line 272)

- [ ] **Update Dashboard keybind hints for pausing state**
  - File: `src/components/Dashboard.tsx`
  - Change line 142 from `return [{ key: "", desc: "Waiting for task..." }]`
  - To: `return [{ key: "", desc: "Waiting for task..." }, { key: "Q", desc: "quit" }]`

- [ ] **Add test for quit from pausing state**
  - File: `src/hooks/useLoopState.test.ts`
  - Add test case in `canQuit` describe block verifying `canQuit` returns true for pausing state

### Verbose Flag Implementation

- [ ] **Add `verbose` to CLI types**
  - File: `src/types.ts`
  - Add `verbose?: boolean` to `CLIArgs` interface (around line 68)

- [ ] **Parse `--verbose` / `-v` flag in CLI**
  - File: `src/index.tsx`
  - Add case for `-v` and `--verbose` in `parseArgs()` switch statement (around line 100)
  - Update help text in `showHelp()` to document the flag (around line 27)

- [ ] **Conditionally log keyboard events based on verbose flag**
  - File: `src/App.tsx`
  - Wrap keyboard debug logging (lines 856-864) with `if (props.verbose)` check

### Testing & Verification

- [ ] [MANUAL] **Verify SSE connection and activity log**
  - Run `bun run build && ./dist/ocloop`
  - Start a session with a plan file
  - Verify in `.loop.log` that SSE connects with non-empty URL: `[INFO] [sse] Connecting {"url":"http://127.0.0.1:XXXX"}`
  - Verify activity pane shows events (session start, file edits, task updates)
  - Verify session_idle triggers the next iteration

- [ ] [MANUAL] **Verify quit works in pausing state**
  - Start ocloop with a plan
  - Press Space to pause while running
  - While in "Waiting for task..." state, press Q
  - Verify quit confirmation appears

- [ ] [MANUAL] **Verify verbose flag behavior**
  - Run `./dist/ocloop` (without --verbose)
  - Press some keys, check `.loop.log` has NO `[keybinding] Key pressed` entries
  - Run `./dist/ocloop --verbose`
  - Press some keys, check `.loop.log` HAS `[keybinding] Key pressed` entries

## Testing Notes

### Automated Tests
```bash
bun test
```
This runs the existing test suite including the new `canQuit` pausing state test.

### Manual Verification Steps

1. **Build the project**:
   ```bash
   bun run build
   ```

2. **Test SSE fix** (requires a valid PLAN.md and .loop-prompt.md):
   ```bash
   ./dist/ocloop
   # Press S to start
   # Watch activity pane for events
   # Check .loop.log for SSE connection URL
   ```

3. **Test quit in pausing state**:
   ```bash
   ./dist/ocloop
   # Press S to start
   # Press Space to pause
   # Press Q while "Waiting for task..." is shown
   # Should show quit confirmation
   ```

4. **Test verbose flag**:
   ```bash
   # Without verbose - no keyboard logs
   ./dist/ocloop
   # Press keys, exit
   grep "keybinding" .loop.log  # Should return nothing
   
   # With verbose - keyboard logs present
   ./dist/ocloop --verbose
   # Press keys, exit
   grep "keybinding" .loop.log  # Should show key presses
   ```

## File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/hooks/useSSE.ts` | Modify | Change URL from string to Accessor, add empty URL validation |
| `src/App.tsx` | Modify | Pass URL as accessor, wrap keyboard logging with verbose check |
| `src/hooks/useLoopState.ts` | Modify | Add pausing to canQuit() |
| `src/components/Dashboard.tsx` | Modify | Add Q keybind hint for pausing state |
| `src/hooks/useLoopState.test.ts` | Modify | Add test for canQuit with pausing state |
| `src/types.ts` | Modify | Add verbose to CLIArgs |
| `src/index.tsx` | Modify | Parse --verbose flag, update help text |
