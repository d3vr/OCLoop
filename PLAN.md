# Debug Mode Implementation Plan

## Overview

Add a `--debug` / `-d` flag to ocloop that enables an interactive sandbox mode. This allows starting the OC server and creating sessions without requiring PLAN.md or .loop-prompt.md files. Useful for:
- Testing OC server interactions
- Experimenting with the TUI/UX
- Debugging session lifecycle without running actual work

**Key behaviors in debug mode:**
- No plan/prompt file validation
- Auto-creates a session on startup
- User can create additional sessions with `N` key
- No iteration loop, no prompts sent - pure manual interaction
- Session idle = stay ready for new session (no auto-iteration)

## Backlog

- [ ] **Add debug types to type system** (`src/types.ts`)
  - Add `debug?: boolean` to `CLIArgs` interface (line ~59)
  - Add `{ type: "debug"; attached: boolean; sessionId: string }` to `LoopState` union (after line 19)
  - Add `{ type: "server_ready_debug" }` to `LoopAction` union (after line 32)
  - Add `{ type: "new_session"; sessionId: string }` to `LoopAction` union (after line 32)

- [ ] **Add CLI flag parsing and help text** (`src/index.tsx`)
  - Add `--debug` / `-d` to help text in `showHelp()` (after line 32, before Examples)
  - Add case for `-d` / `--debug` in `parseArgs()` switch statement (after line 104)
  - Modify `validatePrerequisites()` to return early when `args.debug === true` (line 119)

- [ ] **Update state machine for debug mode** (`src/hooks/useLoopState.ts`)
  - Add `server_ready_debug` case to `loopReducer()` - transitions `starting` → `debug` state
  - Add `new_session` case to `loopReducer()` - sets sessionId in debug state
  - Update `session_idle` case - handle debug state (clear sessionId, stay in debug)
  - Update `toggle_attach` case - handle debug state
  - Update `quit` case - add `debug` to allowed states list
  - Add `isDebug` derived memo (after line 254)
  - Update `canQuit` memo to include debug state when detached
  - Add `isDebug` to return object

- [ ] **Add debug mode handling to App** (`src/App.tsx`)
  - Add `createDebugSession()` async function (after `startIteration()`, ~line 404)
    - Creates session via SDK, dispatches `new_session`, spawns PTY
    - Handles errors with recoverable error dispatch
  - Modify server ready effect (~line 446) to dispatch `server_ready_debug` when `props.debug`
  - Modify `initializeSession()` (~line 468) to call `createDebugSession()` and return early in debug mode
  - Update `sessionId` memo (~line 179) to also extract from debug state
  - Update SSE `onSessionIdle` handler (~line 226) to check debug state sessionId
  - Add debug mode input handling in `inputHandler` (~line 629):
    - Check `loop.isDebug()` after quit confirmation handling
    - Handle `N` key → call `createDebugSession()`
    - Handle `Q` key → show quit confirmation
    - Forward input to PTY when attached, consume otherwise
  - Add early returns to `refreshPlan()` and `refreshCurrentTask()` when `props.debug`

- [ ] **Update Dashboard for debug mode** (`src/components/Dashboard.tsx`)
  - Add `debug` case to `getStateBadge()` (~line 23): `{ icon: "⚙", text: "DEBUG", colorKey: "info" }`
  - Update `iteration` memo (~line 78) - return 0 for debug state
  - Add `debug` case to `keybindHints` memo (~line 115):
    - Attached: `[Ctrl+\ detach]`
    - Detached with session: `[Ctrl+\ attach] [N new session] [Q quit]`
    - Detached no session: `[N new session] [Q quit]`
  - Update plan progress `<Show>` (~line 203) - hide when `props.state.type === "debug"`
  - Update `truncatedTask` memo (~line 159) - show session ID (truncated) in debug mode instead of task

- [MANUAL] **Test debug mode end-to-end**
  - Run `bun run build` to verify no type errors
  - Run `./dist/ocloop --help` and verify debug flag appears
  - Run `./dist/ocloop --debug` in a test directory (no PLAN.md needed)
  - Verify: server starts, session auto-created, PTY attached
  - Verify: `Ctrl+\` detaches, dashboard shows DEBUG state
  - Verify: `N` creates new session
  - Verify: `Q` shows quit confirmation, `Y` exits cleanly

## Testing Notes

### Build Verification
```bash
bun run build
```
Should complete without TypeScript errors.

### Manual Testing Checklist

1. **Help text**
   ```bash
   ./dist/ocloop --help
   ```
   Verify `-d, --debug` option appears in output.

2. **Debug mode startup (no files)**
   ```bash
   cd /tmp && mkdir ocloop-test && cd ocloop-test
   /path/to/ocloop --debug
   ```
   Should start without "Plan file not found" error.

3. **Session auto-creation**
   - On startup, should see DEBUG badge in dashboard
   - Terminal panel should show opencode TUI attached to a session

4. **Keyboard interactions**
   - `Ctrl+\` - Toggle attach/detach (dashboard border should change)
   - When detached: `N` should create new session
   - When detached: `Q` should show quit confirmation
   - `Y` on quit confirmation should exit cleanly

5. **Session lifecycle**
   - In attached mode, type `/exit` to end session
   - Should return to debug state with empty session
   - Dashboard should update keybinds (no "attach" when no session)
   - `N` should create fresh session

6. **With options**
   ```bash
   ./dist/ocloop -d -p 4099
   ./dist/ocloop --debug -m claude-sonnet-4
   ```
   Port and model options should still work in debug mode.

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | Add `debug` to CLIArgs, LoopState, LoopAction |
| `src/index.tsx` | Modify | Add `--debug` flag parsing, skip validation |
| `src/hooks/useLoopState.ts` | Modify | Handle debug state transitions, add `isDebug` |
| `src/App.tsx` | Modify | Debug session creation, input handling, skip plan logic |
| `src/components/Dashboard.tsx` | Modify | Debug badge, keybinds, hide plan progress |
