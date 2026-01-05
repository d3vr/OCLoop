# DialogSelect & Command Palette Bug Fixes

## Overview

Fix critical bugs in the newly implemented DialogSelect component and Command Palette system:

1. **Escape key not dismissing dialog** - DialogSelect expects Dialog to handle Escape, but Dialog only handles backdrop clicks
2. **Keybinds triggering during search** - Typing 'c' to search triggers the "Copy" keybind instead of adding to search
3. **Header layout broken** - Title and "esc" hint appear concatenated with stray "figure" text
4. **Options list garbled** - Category text bleeds into option titles due to missing flex direction
5. **Ctrl+P not opening command palette** - App.tsx input handler consumes all input before CommandContext sees it
6. **Footer keybind label confusing** - "Copy Cmd" should just be "Copy"

## Backlog

### Phase 1: DialogSelect Core Fixes

- [x] **Fix Escape key and keybind-during-search issues**
  - File: `src/ui/DialogSelect.tsx`
  - Lines 71-88: Modify the `useInput` handler
  - When `key.name === "escape"`: call `props.onClose()` instead of just returning
  - Move keybind processing (lines 78-88) AFTER the search input handling (lines 133-139)
  - Only process keybinds when `key.ctrl` or `key.meta` is true, OR when the key is not a printable character
  - This prevents 'c' from triggering Copy when user is typing in search

- [x] **Fix header and options layout issues**
  - File: `src/ui/DialogSelect.tsx`
  - Line 154: Add `flexDirection: "row"` to the header `<box>` style
  - Line 205: Add `flexDirection: "row"` to the option row `<box>` style
  - These explicit declarations ensure the flex layout works correctly in opentui

### Phase 2: Command Palette Keybinding Fix

- [x] **Fix Ctrl+P not triggering command palette**
  - File: `src/App.tsx`
  - In the `inputHandler` function (lines 834-948):
    - At the start of the handler (after the keyboard input logging), add a check:
      ```typescript
      // Ctrl+P - open command palette (handle globally before state-specific handlers)
      if (sequence === KEYS.CTRL_P) {
        command.show()
        return true
      }
      ```
    - This should be placed around line 846, before any state-specific handling
  - This ensures Ctrl+P is handled before the debug/ready state handlers that consume all input

### Phase 3: Terminal Config Dialog Cleanup

- [x] **Fix confusing "Copy Cmd" keybind label**
  - File: `src/components/DialogTerminalConfig.tsx`
  - Line 212: Change `label: "Copy Cmd"` to `label: "Copy"`
  - The footer format is "**Label** key", so this will display as "**Copy** C"

### Phase 4: Verification

- [ ] [MANUAL] **Verify all dialog fixes**
  - Build and run: `bun run build && ./dist/ocloop --debug`
  - Test DialogSelect (Terminal Config via T key):
    - [ ] Escape key dismisses the dialog
    - [ ] Typing 'c' in search adds to search query (doesn't trigger Copy)
    - [ ] Header shows "Configure Terminal" on left, "esc" on right (no "figure" text)
    - [ ] Options display cleanly with title on left, category on right (not concatenated)
    - [ ] Footer shows "**Copy** C" (not "Copy Cmd C")
  - Test Command Palette:
    - [ ] Ctrl+P opens the command palette
    - [ ] Search and navigation work correctly
    - [ ] Escape dismisses the palette
  - Test backdrop click still works to dismiss dialogs

## Testing Notes

### Manual Testing Steps

1. **Build the application**:
   ```bash
   bun run build && ./dist/ocloop --debug
   ```

2. **Test Command Palette (Ctrl+P)**:
   - Press `Ctrl+P` - command palette should open
   - Type to filter commands
   - Press `Escape` - palette should close
   - Click backdrop - palette should close

3. **Test Terminal Config Dialog (T key)**:
   - Press `T` - terminal config dialog should open
   - Verify header: "Configure Terminal" left-aligned, "esc" right-aligned
   - Verify options: terminal names on left, "Installed Terminals" category on right (separated, not concatenated)
   - Type "c" in search - should add 'c' to search, NOT close dialog
   - Press `Escape` - dialog should close
   - Press `T` again, then `C` - should copy attach command (when not typing in search)

4. **Verify keybind behavior**:
   - Open terminal config with `T`
   - Type something in search (e.g., "kit")
   - Press `C` - should add 'c' to search, not trigger copy
   - Clear search (backspace)
   - Press `C` with empty search - should trigger copy

### Existing Tests

Run existing tests to check for regressions:
```bash
bun test
```

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/ui/DialogSelect.tsx` | Modify | Fix Escape handling, keybind-during-search, header/options layout |
| `src/App.tsx` | Modify | Add Ctrl+P handling before state-specific handlers |
| `src/components/DialogTerminalConfig.tsx` | Modify | Change "Copy Cmd" label to "Copy" |
