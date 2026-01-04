# Plan: External Terminal Launch + Activity Log

## Overview

Replace the embedded PTY/ghostty-terminal approach with a user-configured external terminal launcher and activity log.

**Why:** Embedding a full TUI (`opencode attach`) inside another TUI (ocloop via ghostty-opentui) introduces significant complexity and reliability issues. Instead, when users want to interact with an OC session, we launch their preferred terminal emulator with the attach command.

**Key Features:**
- First-time `Ctrl+\` press shows a configuration dialog listing installed terminals
- User selection is persisted to `~/.config/ocloop/ocloop.json`
- Subsequent presses launch the configured terminal directly
- Fallback option to copy the attach command to clipboard
- Activity log replaces the terminal panel, showing SSE events (session start, file edits, task updates, etc.)

---

## Backlog

### Phase 1: Config Management

- [ ] Create `src/lib/config.ts` - Configuration file management
  - `getConfigDir()` - Returns `$XDG_CONFIG_HOME/ocloop` or `~/.config/ocloop`
  - `getConfigPath()` - Returns full path to `ocloop.json`
  - `loadConfig()` - Loads and parses config, returns empty object if not exists
  - `saveConfig(config)` - Creates directory if needed, writes JSON
  - `hasTerminalConfig(config)` - Type guard checking if terminal is configured
  - Types: `OcloopConfig`, `TerminalConfig` (with `type: "known" | "custom"`)

### Phase 2: Terminal Detection & Launching

- [ ] Create `src/lib/terminal-launcher.ts` - Terminal detection and launching
  - `KNOWN_TERMINALS` constant array with name/command/args for each:
    - alacritty, kitty, wezterm, gnome-terminal, konsole, xfce4-terminal
    - foot, tilix, terminator, xterm, urxvt, x-terminal-emulator
  - `getKnownTerminals()` - Returns the full list
  - `getKnownTerminalByName(name)` - Lookup by name
  - `detectInstalledTerminals()` - Filters list by checking `which <command>` via Bun.spawn
  - `getAttachCommand(url, sessionId)` - Returns `"opencode attach <url> --session <id>"`
  - `launchTerminal(config, attachCmd)` - Spawns detached process, returns `{ success, error? }`
  - Types: `KnownTerminal`, `LaunchResult`

- [ ] Create `src/lib/clipboard.ts` - Clipboard operations
  - `detectClipboardTool()` - Checks `$WAYLAND_DISPLAY` for wl-copy, falls back to xclip/xsel
  - `copyToClipboard(text)` - Spawns clipboard tool, pipes text to stdin
  - Returns `{ success: boolean, error?: string }`

### Phase 3: Activity Log

- [ ] Create `src/hooks/useActivityLog.ts` - Activity log state management
  - `ActivityEvent` type: `{ id, timestamp, type, message }`
  - Event types: `"session_start" | "session_idle" | "task" | "file_edit" | "error"`
  - `useActivityLog()` hook returning:
    - `events: Accessor<ActivityEvent[]>`
    - `addEvent(type, message)` - Prepends event, caps at 100 entries
    - `clear()` - Empties the log
  - Auto-generates unique IDs via counter

- [ ] Create `src/components/ActivityLog.tsx` - Activity log UI component
  - Props: `{ events: ActivityEvent[] }`
  - Bordered box that fills remaining space (like old TerminalPanel)
  - Title row: "Activity"
  - Scrollable event list, most recent at bottom
  - Each row: `HH:MM:SS  <icon> <message>`
  - Color coding by event type using theme colors:
    - session_start/idle: `theme.textMuted`
    - task: `theme.primary` 
    - file_edit: `theme.text` with `"✎"` prefix
    - error: `theme.error` with `"⚠"` prefix

### Phase 4: Terminal Config Dialog

- [ ] Create `src/components/DialogTerminalConfig.tsx` - First-time terminal configuration
  - Props: `{ availableTerminals, attachCommand, onSelect, onCopy, onCancel }`
  - Two view states: `"list"` and `"custom"`
  - List view:
    - Title: "Configure Terminal"
    - Scrollable list of available terminals (filtered to installed only)
    - Highlighted current selection
    - "Custom..." option at bottom separated by divider
    - Footer keybinds: `Enter` select | `C` copy command | `Esc` cancel
  - Custom view:
    - Title: "Custom Terminal"
    - Input field: Command (e.g., `my-terminal`)
    - Input field: Args pattern (e.g., `-e {cmd}`)
    - Help text explaining `{cmd}` placeholder
    - Footer keybinds: `Enter` save | `Esc` back
  - Keyboard navigation: `↑/↓` or `j/k` for list, `Tab` between inputs

- [ ] Create `src/components/DialogTerminalError.tsx` - Terminal launch failure dialog
  - Props: `{ terminalName, errorMessage, attachCommand, onCopy, onClose }`
  - Title: "Terminal Launch Failed"
  - Shows error message
  - Suggests editing `~/.config/ocloop/ocloop.json`
  - Shows attach command for manual copy
  - Footer keybinds: `C` copy command | `Esc` close

### Phase 5: SSE Hook Updates

- [ ] Update `src/hooks/useSSE.ts` - Add new event handlers
  - Add to `SSEEventHandlers` interface:
    - `onSessionCreated?: (sessionId: string) => void`
    - `onSessionError?: (sessionId: string | undefined, error: string) => void`
  - Add case handlers in `processEvent()`:
    - `"session.created"` - Extract `event.properties.info.id`, call handler
    - `"session.error"` - Extract sessionID and error message, call handler

### Phase 6: State Machine Cleanup

- [ ] Update `src/hooks/useLoopState.ts` - Remove attach-related state
  - Remove `isAttached` signal
  - Remove `toggle_attach` action handling
  - Remove any attach/detach state transitions
  - Keep the `"debug"` state but remove its `isAttached` tracking
  - Update `useLoopStateReturn` type to remove `isAttached`

### Phase 7: Component Index Updates

- [ ] Update `src/components/index.ts` - Export changes
  - Remove: `export { TerminalPanel } from "./TerminalPanel"`
  - Add: `export { ActivityLog } from "./ActivityLog"`
  - Add: `export { DialogTerminalConfig } from "./DialogTerminalConfig"`
  - Add: `export { DialogTerminalError } from "./DialogTerminalError"`

### Phase 8: Dashboard Updates

- [ ] Update `src/components/Dashboard.tsx` - Simplify keybind hints
  - Remove `isAttached` prop usage (will always be false)
  - Update keybind hints:
    - Change `"attach"` to `"terminal"` for `Ctrl+\`
    - Remove the attached-state hints branch
  - Simplify `DashboardProps` - can remove `isAttached` prop

### Phase 9: Entry Point Cleanup

- [ ] Update `src/index.tsx` - Remove ghostty-terminal registration
  - Remove import: `import { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"`
  - Remove from `JSX.IntrinsicElements` interface: `"ghostty-terminal": typeof GhosttyTerminalRenderable`
  - Remove from `extend()` call: `"ghostty-terminal": GhosttyTerminalRenderable`

### Phase 10: Main App Refactor

- [ ] Update `src/App.tsx` - Complete integration
  - **Imports:**
    - Remove: `usePTY`, `GhosttyTerminalRenderable` imports
    - Remove: `TerminalPanel` from components import
    - Add: `useActivityLog` hook
    - Add: `loadConfig`, `saveConfig`, `hasTerminalConfig` from config
    - Add: `detectInstalledTerminals`, `getAttachCommand`, `launchTerminal`, `KnownTerminal` from terminal-launcher
    - Add: `copyToClipboard` from clipboard
    - Add: `ActivityLog`, `DialogTerminalConfig`, `DialogTerminalError` from components
  - **State additions:**
    - `ocloopConfig` signal for loaded config
    - `showingTerminalConfig` signal for dialog visibility
    - `terminalError` signal for error dialog state
    - `availableTerminals` signal for detected terminals list
    - `activityLog` from `useActivityLog()` hook
  - **Remove:**
    - `terminalRef` object
    - `usePTY` hook call and all related code
    - PTY error effect
    - Terminal dimension calculations (keep for potential future use or remove)
    - `TerminalPanel` from JSX
  - **On mount:**
    - Load config via `loadConfig()`
    - Detect installed terminals via `detectInstalledTerminals()`
  - **Wire SSE to activity log:**
    - `onSessionCreated` -> `addEvent("session_start", "Session started")`
    - `onSessionIdle` -> existing logic + `addEvent("session_idle", "Session idle")`
    - `onTodoUpdated` -> existing logic + `addEvent("task", content)` for in_progress
    - `onFileEdited` -> existing logic + `addEvent("file_edit", file)`
    - `onSessionError` -> `addEvent("error", errorMessage)`
  - **Update Ctrl+\ handler:**
    - Check for active sessionId, early return if none
    - Check `hasTerminalConfig(config)`:
      - If no config: `setShowingTerminalConfig(true)`
      - If configured: call `launchTerminal()`, handle errors
  - **Update layout JSX:**
    - Replace `TerminalPanel` with `ActivityLog`
    - Pass `activityLog.events()` to ActivityLog
    - Add `DialogTerminalConfig` with Show wrapper
    - Add `DialogTerminalError` with Show wrapper
    - Update `Dashboard` props: `isAttached={false}` (always)
  - **Dialog handlers:**
    - `onSelect`: save config, launch terminal, handle errors
    - `onCopy`: copy to clipboard, close dialog

### Phase 11: File Cleanup

- [ ] Delete removed files
  - Delete `src/hooks/usePTY.ts`
  - Delete `src/components/TerminalPanel.tsx`

### Phase 12: Dependencies

- [ ] Update `package.json` - Remove unused dependencies
  - Remove from dependencies: `"bun-pty": "latest"`
  - Remove from dependencies: `"ghostty-opentui": "latest"`
  - Run `bun install` to update lockfile

### Phase 13: Verification

- [ ] [MANUAL] Test the complete flow
  - Run `bun run dev -- -d` (debug mode)
  - Press `Ctrl+\` - should show terminal config dialog
  - Verify only installed terminals are listed
  - Select a terminal - should save config and launch terminal
  - Press `Ctrl+\` again - should launch terminal directly (no dialog)
  - Test "Copy command" option
  - Test custom terminal configuration
  - Verify activity log shows events during session
  - Verify config persists in `~/.config/ocloop/ocloop.json`

---

## Testing Notes

### Manual Testing Steps

1. **Config persistence:**
   ```bash
   # Start fresh
   rm -rf ~/.config/ocloop
   bun run dev -- -d
   # Press Ctrl+\, select terminal, verify ~/.config/ocloop/ocloop.json created
   ```

2. **Terminal detection:**
   ```bash
   # Verify only installed terminals appear in dialog
   which alacritty kitty wezterm gnome-terminal  # Compare with dialog list
   ```

3. **Clipboard:**
   ```bash
   # Test clipboard works
   bun run dev -- -d
   # Press Ctrl+\, press C, paste in another terminal
   ```

4. **Activity log:**
   ```bash
   bun run dev  # Normal mode with PLAN.md and loop-prompt.md
   # Press S to start
   # Verify events appear: "Session started", file edits, task updates
   ```

5. **Error handling:**
   ```bash
   # Edit ~/.config/ocloop/ocloop.json to reference non-existent terminal
   # Press Ctrl+\, verify error dialog appears
   ```

### Build Verification

```bash
bun run build
bun run test  # If tests exist
```

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `src/lib/config.ts` | Config file load/save utilities |
| Create | `src/lib/terminal-launcher.ts` | Terminal detection and launching |
| Create | `src/lib/clipboard.ts` | Clipboard copy utility |
| Create | `src/hooks/useActivityLog.ts` | Activity log state hook |
| Create | `src/components/ActivityLog.tsx` | Activity log UI component |
| Create | `src/components/DialogTerminalConfig.tsx` | Terminal config dialog |
| Create | `src/components/DialogTerminalError.tsx` | Terminal error dialog |
| Modify | `src/hooks/useSSE.ts` | Add session.created and session.error handlers |
| Modify | `src/hooks/useLoopState.ts` | Remove isAttached state |
| Modify | `src/components/index.ts` | Update exports |
| Modify | `src/components/Dashboard.tsx` | Simplify keybind hints |
| Modify | `src/index.tsx` | Remove ghostty-terminal registration |
| Modify | `src/App.tsx` | Full integration of new features |
| Modify | `package.json` | Remove bun-pty, ghostty-opentui deps |
| Delete | `src/hooks/usePTY.ts` | No longer needed |
| Delete | `src/components/TerminalPanel.tsx` | Replaced by ActivityLog |
