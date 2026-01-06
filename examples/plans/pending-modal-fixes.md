# Modal Refactor Fixes - Phase 3

## Overview

Fix remaining UI/UX issues in modal dialogs after phase 2 refactor:

1. **DialogSelect scrolling broken** - When navigating down through options, the list doesn't scroll to keep the selected item visible. The selection goes out of view.
2. **Quit dialog buttons stacked vertically** - Cancel and Quit buttons appear in a column instead of side-by-side.
3. **Dialog title bar layout broken** - The "esc" hint overlaps the title in both quit and completion dialogs instead of being right-aligned.
4. **Copy attach command doesn't close modal** - When selecting "Copy attach command" from command palette, the modal stays open instead of closing and showing a toast.

## Backlog

### Phase 1: Fix DialogSelect Scrolling

- [x] **Fix viewport scrolling when navigating up/down in DialogSelect**
  - File: `src/ui/DialogSelect.tsx`
  - Problem: The `selectedIndex()` signal is read immediately after `setSelectedIndex()`, but SolidJS may return the stale value due to batching. The scroll comparison uses the old index.
  - Lines 87-103: Refactor up/down navigation to calculate new index first:
    ```tsx
    // UP navigation (lines 87-94)
    if (key.name === "up" || (input === KEYS.CTRL_P)) {
      const newIndex = Math.max(0, selectedIndex() - 1)
      setSelectedIndex(newIndex)
      if (newIndex < viewportStart()) {
        setViewportStart(newIndex)
      }
      if (props.onMove) props.onMove(filteredOptions()[newIndex])
    }

    // DOWN navigation (lines 96-103)
    if (key.name === "down" || (input === KEYS.CTRL_N)) {
      const newIndex = Math.min(filteredOptions().length - 1, selectedIndex() + 1)
      setSelectedIndex(newIndex)
      if (newIndex >= viewportStart() + ITEMS_PER_PAGE) {
        setViewportStart(newIndex - ITEMS_PER_PAGE + 1)
      }
      if (props.onMove) props.onMove(filteredOptions()[newIndex])
    }
    ```
  - Lines 105-119: Apply same fix to pageup/pagedown handlers

### Phase 2: Fix Dialog Layout Issues

- [ ] **Fix DialogConfirm header and button layout**
  - File: `src/ui/DialogConfirm.tsx`
  - Line 49: Add `flexDirection: "row"` to header box style
    - Current: `style={{ width: "100%", justifyContent: "space-between", marginBottom: 1 }}`
    - Change to: `style={{ width: "100%", justifyContent: "space-between", marginBottom: 1, flexDirection: "row" }}`
  - Line 66: Add `flexDirection: "row"` to buttons container
    - Current: `style={{ width: "100%", justifyContent: "flex-end", gap: 2 }}`
    - Change to: `style={{ width: "100%", justifyContent: "flex-end", gap: 2, flexDirection: "row" }}`

- [ ] **Fix DialogCompletion header layout**
  - File: `src/components/DialogCompletion.tsx`
  - Line 50: Add `flexDirection: "row"` to header box style
    - Current: `style={{ width: "100%", justifyContent: "space-between", marginBottom: 1 }}`
    - Change to: `style={{ width: "100%", justifyContent: "space-between", marginBottom: 1, flexDirection: "row" }}`

### Phase 3: Fix Command Palette Copy Behavior

- [ ] **Close command palette when copying attach command**
  - File: `src/App.tsx`
  - Lines 830-836: Add `dialog.clear()` before the copy operation
    - Current:
      ```tsx
      onSelect: () => {
        if (sid && url) {
          const cmd = getAttachCommand(url, sid)
          copyToClipboard(cmd)
          toast.show({ variant: "success", message: "Copied to clipboard" })
        }
      },
      ```
    - Change to:
      ```tsx
      onSelect: () => {
        dialog.clear()  // Close command palette first
        if (sid && url) {
          const cmd = getAttachCommand(url, sid)
          copyToClipboard(cmd)
          toast.show({ variant: "success", message: "Copied to clipboard" })
        }
      },
      ```

### Phase 4: Verification

- [ ] [MANUAL] **Verify all fixes**
  - Build and run: `bun run build && ./dist/ocloop --debug`
  - Test DialogSelect scrolling (press T for terminal config):
    - [ ] Navigate down past visible items - list should scroll to keep selection visible
    - [ ] Navigate up from bottom - list should scroll up
    - [ ] PageUp/PageDown should also scroll correctly
  - Test Quit dialog (press Q):
    - [ ] Title "Quit OCLoop?" and "esc" hint should be on same line, separated
    - [ ] Cancel and Quit buttons should be side-by-side on same row
    - [ ] Left/Right arrow keys should switch between buttons
  - Test Completion dialog (complete a plan or mock completion state):
    - [ ] "Plan Complete" title and "esc" hint should be on same line, separated
  - Test Command Palette copy (press Ctrl+P, select "Copy attach command"):
    - [ ] Modal should close immediately
    - [ ] Toast "Copied to clipboard" should appear
  - Test Terminal Config copy (press T, then Ctrl+C):
    - [ ] Modal should close immediately
    - [ ] Toast "Copied to clipboard" should appear

## Testing Notes

### Build and Run
```bash
bun run build && ./dist/ocloop --debug
```

### Manual Test Sequence

1. **DialogSelect scrolling** (Terminal Config dialog)
   - Press `T` to open terminal config
   - Use Down arrow to navigate past the 6th item
   - Verify the list scrolls and selection remains visible
   - Navigate back up and verify scrolling works in reverse
   - Try PageDown/PageUp for bulk navigation

2. **Quit dialog layout**
   - Press `Q` to show quit confirmation
   - Verify "Quit OCLoop?" is on left, "esc" is on right of same line
   - Verify "Cancel" and "Quit" buttons are side-by-side
   - Press Left/Right to switch between buttons
   - Press Escape to close

3. **Completion dialog layout**
   - To test: Create a plan with a single task, mark it complete, and run ocloop
   - Or: Temporarily modify code to show completion dialog on startup
   - Verify "Plan Complete" title and "esc" are properly separated

4. **Command palette copy behavior**
   - Start a session (so there's a session ID to copy)
   - Press `Ctrl+P` to open command palette
   - Select "Copy attach command"
   - Verify: Modal closes AND toast appears

5. **Terminal config copy behavior**
   - Press `T` to open terminal config
   - Press `Ctrl+C` to copy attach command
   - Verify: Modal closes AND toast appears

### Existing Tests
```bash
bun test
```

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/ui/DialogSelect.tsx` | Modify | Fix viewport scrolling by calculating new index before updating signals |
| `src/ui/DialogConfirm.tsx` | Modify | Add `flexDirection: "row"` to header and buttons container |
| `src/components/DialogCompletion.tsx` | Modify | Add `flexDirection: "row"` to header box |
| `src/App.tsx` | Modify | Add `dialog.clear()` before copy in command palette's "Copy attach command" |
