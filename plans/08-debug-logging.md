# Debug Logging & Terminal Keybinding Fix

## Overview

Add comprehensive debug logging to `.loop.log` for troubleshooting ocloop behavior, and change the terminal attach keybinding from `Ctrl+\` to `T` for reliability.

**Why logging:**
- Currently no way to debug issues like keybindings not working
- In-memory activity log is UI-only and not persisted
- Need visibility into state transitions, session lifecycle, SSE events, terminal launches

**Why change keybinding:**
- `Ctrl+\` may have terminal/shell conflicts
- Single letter keybinding is simpler and more reliable
- `T` is intuitive for "Terminal"

**Log file behavior:**
- Writes to `.loop.log` in current working directory
- Rotates existing `.loop.log` → `.loop.log.old` on each new ocloop session
- Always enabled (no flag needed)
- File only (no console output)

## Backlog

- [x] Create debug logger utility
  - File: `src/lib/debug-logger.ts` (new file)
  - Exports singleton `log` object with methods:
    - `debug(context: string, message: string, data?: unknown)`
    - `info(context: string, message: string, data?: unknown)`
    - `warn(context: string, message: string, data?: unknown)`
    - `error(context: string, message: string, error?: unknown)`
    - `sessionStart(opts: { debug: boolean; cwd: string })`
    - `iterationStart(n: number)`
    - `iterationEnd(n: number)`
  - On `sessionStart()`: rotate `.loop.log` → `.loop.log.old` if exists, then create fresh
  - Log format: `[HH:MM:SS.mmm] [LEVEL] [context] message { data }`
  - Session header format:
    ```
    ================================================================================
    OCLOOP SESSION: 2026-01-05T12:34:56.789Z
    Working Directory: /home/user/project
    Debug Mode: true
    ================================================================================
    ```
  - Iteration markers: `--- ITERATION N ---` and `--- ITERATION N END ---`
  - Use synchronous `fs.appendFileSync` for reliability

- [x] Update gitignore pattern to cover all `.loop*` files
  - File: `src/lib/loop-state.ts`
  - Line 109: Change `const entry = LOOP_STATE_FILE` to `const entry = ".loop*"`
  - This covers: `.loop-state.json`, `.loop.log`, `.loop.log.old`

- [x] Change terminal keybinding from `Ctrl+\` to `T`
  - File: `src/lib/constants.ts`
    - Remove line 5: `CTRL_BACKSLASH: "\x1c"`
    - Add after line 17 (after S_UPPER): `T_LOWER: "t"` and `T_UPPER: "T"`
  - File: `src/App.tsx`
    - Lines 786-795: Change keybinding check from `KEYS.CTRL_BACKSLASH` to `KEYS.T_LOWER || KEYS.T_UPPER`
    - Move the terminal launch block inside state-specific handling (running, paused, debug with session) to avoid consuming `T` in wrong states
  - File: `src/components/Dashboard.tsx`
    - Line 127: Change `"Ctrl+\\"` to `"T"`
    - Line 133: Change `"Ctrl+\\"` to `"T"`
    - Line 153: Change `"Ctrl+\\"` to `"T"`

- [x] Add startup logging
  - File: `src/index.tsx`
  - After CLI arg parsing (around line 100), before render:
    - `log.sessionStart({ debug: args.debug, cwd: process.cwd() })`
    - `log.info("startup", "CLI arguments", { plan: args.plan, prompt: args.prompt, debug: args.debug, run: args.run })`
    - `log.info("startup", "Plan file", { path: planPath, exists: planFileExists })`

- [x] Add state machine logging
  - File: `src/hooks/useLoopState.ts`
  - Import: `import { log } from "../lib/debug-logger"`
  - In `loopReducer` function (line 34):
    - At start: `log.debug("state", "Dispatch", { action: action.type, payload: action })`
    - Before each return: `log.debug("state", "Transition", { from: state.type, to: newState.type, newState })`
  - Log sessionId when present in state (running, pausing, debug states)

- [x] Add core App.tsx logging
  - File: `src/App.tsx`
  - Import: `import { log } from "./lib/debug-logger"`
  - Locations to add logging:
    - `onMount` input handler (line 779): Log key pressed with hex code, current state type, sessionId(), lastSessionId()
    - `handleTerminalLaunch` (line 678): Log session ID and whether config exists
    - `launchConfiguredTerminal` (line 694): Log URL, attach command, and launch result
    - `createDebugSession` (line 420): Log attempt, success with sessionId, or failure with error
    - State effect (lines 131-175): Log iteration start/end transitions
    - `handleQuit` (line 461): Log quit initiated with current sessionId
    - Server ready effect (line 499): Log server ready, URL, and mode (debug vs normal)

- [x] Add SSE logging
  - File: `src/hooks/useSSE.ts`
  - Import: `import { log } from "../lib/debug-logger"`
  - Locations:
    - `connect()`: `log.info("sse", "Connecting", { url })`
    - `disconnect()`: `log.info("sse", "Disconnecting")`
    - `onopen`: `log.info("sse", "Connected")`
    - `onerror`: `log.error("sse", "Connection error", error)`
    - Each event handler: `log.debug("sse", "Event received", { type, sessionId, data })`

- [x] Add terminal launcher logging
  - File: `src/lib/terminal-launcher.ts`
  - Import: `import { log } from "./debug-logger"`
  - Locations:
    - `detectInstalledTerminals` (line 92): Log detected terminals
    - `launchTerminal` (line 132): Log command, args, and result

- [x] Add config and loop-state logging
  - File: `src/lib/config.ts`
    - Import: `import { log } from "./debug-logger"`
    - `loadConfig`: Log loaded config or default
    - `saveConfig`: Log saved config
  - File: `src/lib/loop-state.ts`
    - Import: `import { log } from "./debug-logger"`
    - `loadLoopState`: Log loaded state or null
    - `saveLoopState`: Log saved state
    - `ensureGitignore`: Log gitignore update

- [x] [MANUAL] Test debug logging and terminal keybinding
  - Build: `bun run build`
  - Test 1 - Debug mode with terminal launch:
    - Run: `./dist/ocloop -d`
    - Wait for "DEBUG" badge to appear
    - Press `T` to launch terminal
    - Verify terminal opens with attach command
    - Press `Q` to quit
    - Check `.loop.log` exists and contains session info, state transitions, keybinding events
  - Test 2 - Log rotation:
    - Run ocloop again
    - Verify `.loop.log.old` exists with previous session
    - Verify `.loop.log` has fresh content
  - Test 3 - Gitignore:
    - Check `.gitignore` contains `.loop*` entry
  - Test 4 - Normal mode:
    - Create test PLAN.md with a task
    - Run: `./dist/ocloop`
    - Press `S` to start
    - Verify logging shows iteration start, session creation
    - Press `T` to launch terminal during running state

## Testing Notes

### Build
```bash
bun run build
```

### Manual Verification

1. **Debug mode terminal launch:**
   ```bash
   ./dist/ocloop -d
   # Wait for DEBUG badge
   # Press T - should launch configured terminal
   # Press Q to quit
   ```

2. **Check log file:**
   ```bash
   cat .loop.log
   # Should see session header, state transitions, keybinding events, session IDs
   ```

3. **Log rotation:**
   ```bash
   ./dist/ocloop -d
   # Press Q
   ./dist/ocloop -d
   # Press Q
   ls -la .loop*
   # Should see both .loop.log and .loop.log.old
   ```

4. **Gitignore:**
   ```bash
   cat .gitignore | grep ".loop"
   # Should see .loop* entry
   ```

5. **Normal mode iteration logging:**
   ```bash
   echo "- [ ] Test task" > PLAN.md
   ./dist/ocloop
   # Press S to start
   # Check .loop.log for iteration markers and session IDs
   ```

### Expected Log Output

```
================================================================================
OCLOOP SESSION: 2026-01-05T12:34:56.789Z
Working Directory: /home/user/project
Debug Mode: true
================================================================================

[12:34:57.123] [INFO] [startup] CLI arguments { debug: true, run: false }
[12:34:57.200] [INFO] [server] Starting...
[12:34:58.000] [INFO] [server] Ready { url: "http://localhost:39045" }
[12:34:58.100] [DEBUG] [state] Dispatch { action: "server_ready_debug" }
[12:34:58.101] [DEBUG] [state] Transition { from: "starting", to: "debug", sessionId: "" }
[12:34:58.200] [INFO] [session] Creating debug session...
[12:34:58.500] [INFO] [session] Debug session created { sessionId: "ses_abc12345" }
[12:34:58.501] [DEBUG] [state] Dispatch { action: "new_session", sessionId: "ses_abc12345" }
[12:34:58.502] [DEBUG] [state] Transition { from: "debug", to: "debug", sessionId: "ses_abc12345" }
[12:35:01.500] [DEBUG] [keybinding] Key pressed { key: "T", hex: "0x54", state: "debug", sessionId: "ses_abc12345", lastSessionId: "ses_abc12345" }
[12:35:01.502] [INFO] [terminal] Launching { sessionId: "ses_abc12345", command: "alacritty", args: ["-e", "opencode", "attach", "http://localhost:39045", "--session", "ses_abc12345"] }
[12:35:01.650] [INFO] [terminal] Launch result { success: true }
```

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/debug-logger.ts` | Create | Debug logging utility with rotation |
| `src/lib/constants.ts` | Modify | Remove CTRL_BACKSLASH, add T_LOWER/T_UPPER |
| `src/lib/loop-state.ts` | Modify | Change gitignore entry to `.loop*`, add logging |
| `src/App.tsx` | Modify | Change keybinding to T, add comprehensive logging |
| `src/components/Dashboard.tsx` | Modify | Update keybinding hints from `Ctrl+\` to `T` |
| `src/hooks/useLoopState.ts` | Modify | Add state transition logging |
| `src/hooks/useSSE.ts` | Modify | Add SSE event logging |
| `src/lib/terminal-launcher.ts` | Modify | Add terminal detection/launch logging |
| `src/lib/config.ts` | Modify | Add config load/save logging |
| `src/index.tsx` | Modify | Add startup logging |
