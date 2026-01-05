# Modal Refactor Bug Fixes - Phase 2

## Overview

Fix remaining UI/UX issues in the DialogSelect component, Terminal Config dialog, Command Palette, and Dashboard after the initial modal refactor. Issues include layout problems (squished search input, overlapping options, footer in column instead of row), broken input handling (backspace not working), confusing keybindings, modal stacking issues, double terminal launches, and missing command palette hint in dashboard.

## Backlog

### Phase 1: DialogSelect Core Layout Fixes

- [x] **Fix search input and list item height issues**
  - File: `src/ui/DialogSelect.tsx`
  - Search input is "squished" because box lacks explicit height
  - List items overlap because they lack explicit height
  - Changes:
    - Line ~169: Add `height: 1` to search box style
    - Line ~183: Add `overflow: "hidden"` to list container box style
    - Line ~202: Add `height: 1` to each list item box style

- [x] **Fix footer layout - should be row, not column**
  - File: `src/ui/DialogSelect.tsx`
  - Line ~238: Add `flexDirection: "row"` to footer box style
  - The keybind hints are stacking vertically instead of horizontally

- [x] **Fix backspace not working in search input**
  - File: `src/ui/DialogSelect.tsx`
  - Line ~122: The character input check `input.length === 1` matches backspace before the backspace handler runs
  - Change from:
    ```tsx
    if (!key.ctrl && !key.meta && input.length === 1) {
      setSearch(s => s + input)
    }
    ```
  - To:
    ```tsx
    if (!key.ctrl && !key.meta && input.length === 1 && key.name !== "backspace") {
      setSearch(s => s + input)
    }
    ```

### Phase 2: Terminal Config Dialog Fixes

- [x] **Fix keybindings - change Copy from "C" to "Ctrl+C" and add navigation hints**
  - File: `src/components/DialogTerminalConfig.tsx`
  - Lines 210-213: Update keybinds array
  - Current: `{ label: "Copy", key: "C", onSelect: state.onCopy, bind: ["c", "C"] }`
  - Change to include navigation hints and use Ctrl+C:
    ```tsx
    const keybinds = [
      { label: "Select", key: "Enter" },
      { label: "Navigate", key: "↑/↓" },
      { label: "Copy", key: "^C", onSelect: state.onCopy, bind: ["\x03"] }
    ]
    ```
  - Note: `\x03` is Ctrl+C. The display key is "^C"

- [x] **Fix double terminal launch on selection**
  - File: `src/ui/DialogSelect.tsx`
  - Lines 78-84: When Enter is pressed, investigate if handler fires twice
  - Lines 196-200: Mouse click also triggers selection
  - Potential causes:
    1. Both `key.name === "return"` and `key.name === "enter"` matching on single keypress
    2. Event propagation issue
  - Fix: Add early return or guard flag to prevent double execution
  - Also check `src/hooks/useInput.ts` to see if Enter generates multiple events

### Phase 3: Command Palette Integration Fixes

- [x] **Fix "Choose default terminal" modal stacking issue**
  - File: `src/App.tsx`
  - Lines 825-827: When selecting "Choose default terminal" from command palette, the terminal config modal opens behind the command palette
  - Need to close command palette before showing terminal config
  - Change from:
    ```tsx
    onSelect: () => {
      setShowingTerminalConfig(true)
    },
    ```
  - To:
    ```tsx
    onSelect: () => {
      dialog.clear()  // Close command palette first
      setShowingTerminalConfig(true)
    },
    ```
  - The `dialog` context is already available at line 119: `const dialog = useDialog()`

### Phase 4: Dashboard Command Palette Hint

- [x] **Add command palette keybinding hint to Dashboard**
  - File: `src/components/Dashboard.tsx`
  - Lines 115-166: Add `{ key: "^P", desc: "commands" }` to keybindHints for applicable states
  - States to update:
    - `ready` (line 121): Add `{ key: "^P", desc: "commands" }`
    - `running` (line 126): Add `{ key: "^P", desc: "commands" }`
    - `paused` (line 132): Add `{ key: "^P", desc: "commands" }`
    - `debug` with sessionId (line 152): Add `{ key: "^P", desc: "commands" }`
    - `debug` without sessionId (line 159): Add `{ key: "^P", desc: "commands" }`

### Phase 5: Verification

- [ ] [MANUAL] **Verify all fixes**
  - Build and run: `bun run build && ./dist/ocloop --debug`
  - Test Terminal Config Dialog (press T):
    - [ ] Search input has proper height (not squished)
    - [ ] Options don't overlap (each on its own line)
    - [ ] Backspace works to delete from search
    - [ ] Footer shows hints in a row: "Select Enter  Navigate ↑/↓  Copy ^C"
    - [ ] Ctrl+C copies the attach command
    - [ ] Selecting a terminal (e.g., alacritty) launches exactly 1 terminal window
    - [ ] Escape closes the dialog
  - Test Command Palette (press Ctrl+P):
    - [ ] Footer hints display horizontally, not vertically
    - [ ] Selecting "Choose default terminal" closes command palette and shows terminal config
    - [ ] Terminal config is visible (not behind command palette)
  - Test Dashboard:
    - [ ] Keybind hints include "^P commands" in running/paused/debug states

## Testing Notes

### Build and Run
```bash
bun run build && ./dist/ocloop --debug
```

### Manual Test Sequence

1. **Dashboard hint visibility**
   - Launch in debug mode
   - Verify "^P commands" appears in the keybind hints row

2. **Command Palette**
   - Press `Ctrl+P` to open command palette
   - Verify footer shows "Select Enter" and "Navigate ↑/↓" in a horizontal row
   - Type to filter commands, verify backspace works
   - Select "Choose default terminal"
   - Verify command palette closes and terminal config opens (not hidden behind)

3. **Terminal Config Dialog**
   - Press `T` to open (or via command palette)
   - Verify search input box has proper height with visible border
   - Verify terminal options (alacritty, kitty, xterm, etc.) each appear on separate lines
   - Type in search, verify backspace deletes characters
   - Verify footer shows "Select Enter  Navigate ↑/↓  Copy ^C" horizontally
   - Press `Ctrl+C` to copy attach command (should show toast)
   - Select a terminal (e.g., alacritty) and verify only ONE terminal window opens
   - Press `Escape` to close dialog

4. **Regression check**
   - Verify all existing keyboard shortcuts still work (Space for pause, Q for quit, etc.)

### Existing Tests
```bash
bun test
```

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/ui/DialogSelect.tsx` | Modify | Fix search box height, list item height, overflow, footer layout, backspace handling |
| `src/components/DialogTerminalConfig.tsx` | Modify | Update keybinds to include Enter/Navigate hints and change Copy to Ctrl+C |
| `src/App.tsx` | Modify | Close command palette before showing terminal config |
| `src/components/Dashboard.tsx` | Modify | Add "^P commands" hint to applicable states |
| `src/hooks/useInput.ts` | Review | Check if Enter generates multiple key events (may need fix) |
