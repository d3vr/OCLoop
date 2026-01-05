# Command Palette & Dialog UX Overhaul

## Overview

Implement a command palette system matching opencode's UX, including:
- **DialogSelect**: Searchable list selection with fuzzy filtering, category grouping, keyboard/mouse navigation
- **DialogConfirm**: Binary confirmation with Cancel/Confirm buttons and left/right arrow navigation
- **DialogAlert**: Simple notification dialog with OK button
- **CommandContext**: Command registration and Ctrl+P palette display

Additionally, update all existing dialogs to match the new consistent design patterns:
- Header: Title (bold, theme.text) + "esc" hint (theme.textMuted) on right
- Footer keybinds: **Label** key format
- Backdrop click to dismiss
- Remove Y/N key prompts in favor of button navigation

Commands to implement:
1. "Copy attach command" - Copies the opencode attach command to clipboard
2. "Choose default terminal" - Opens terminal configuration dialog

## Backlog

### Phase 1: Dependencies & Utilities

- [x] **Add dependencies and create utility functions**
  - Add `fuzzysort` and `remeda` to `package.json`
  - Create `src/lib/locale.ts` with:
    - `truncate(str, len)` - Truncate string with ellipsis
    - `titlecase(str)` - Capitalize first letter of each word
  - Run `bun install` to verify dependencies install correctly

### Phase 2: Theme Updates

- [ ] **Add selectedForeground helper to ThemeContext**
  - File: `src/context/ThemeContext.tsx`
  - Add `selectedForeground(theme)` function that calculates contrasting text color for selected items
  - Uses luminance calculation: if primary color is light, return dark text; if dark, return light text
  - Export the function alongside existing exports

### Phase 3: Base Dialog Updates

- [ ] **Update base Dialog component**
  - File: `src/ui/Dialog.tsx`
  - Remove `title` prop and title bar rendering (dialogs render their own titles)
  - Add backdrop click-to-dismiss with `onMouseUp` handler
  - Add `useRenderer` import to check for text selection (don't dismiss if selecting)
  - Add `onMouseUp` with `stopPropagation` on content box to prevent dismissal when clicking inside
  - Keep `width`, `height`, `onClose`, `children` props

### Phase 4: New Dialog Components

- [ ] **Create DialogSelect component**
  - File: `src/ui/DialogSelect.tsx`
  - Props: `title`, `placeholder?`, `options`, `onSelect?`, `onMove?`, `onFilter?`, `skipFilter?`, `current?`, `keybinds?`, `onClose`
  - Option interface: `title`, `value`, `description?`, `footer?`, `category?`, `disabled?`, `onSelect?`
  - Features:
    - Header with title + "esc" hint
    - Search input with auto-focus and placeholder "Search"
    - Fuzzy filtering using fuzzysort on title and category
    - Category grouping with headers (theme.accent, bold)
    - Selected item highlighting (backgroundColor: theme.primary)
    - Current item indicator (● dot)
    - Scrollable list with dynamic height
    - "No results found" empty state
    - Footer keybinds row
  - Keyboard: ↑/↓ or Ctrl+P/N to navigate, PageUp/Down for 10 items, Enter to select
  - Mouse: hover to highlight, click to select
  - Use `remeda` for pipe/filter/groupBy/entries/flatMap
  - Use `locale.ts` truncate for long titles

- [ ] **Create DialogConfirm component**
  - File: `src/ui/DialogConfirm.tsx`
  - Props: `title`, `message`, `confirmLabel?` (default: "Confirm"), `cancelLabel?` (default: "Cancel"), `onConfirm?`, `onCancel?`
  - Features:
    - Header with title + "esc" hint
    - Message in theme.textMuted
    - Right-aligned button row with Cancel and Confirm
    - Active button has backgroundColor: theme.primary, text in selectedForeground
    - Inactive button text in theme.textMuted
  - Keyboard: ←/→ to switch buttons, Enter to execute, Escape to cancel
  - Mouse: click buttons to execute
  - Add static helper: `DialogConfirm.show(dialog, title, message, options?): Promise<boolean>`

- [ ] **Create DialogAlert component**
  - File: `src/ui/DialogAlert.tsx`
  - Props: `title`, `message`, `onConfirm?`
  - Features:
    - Header with title + "esc" hint
    - Message in theme.textMuted
    - Right-aligned "ok" button with theme.primary background
  - Keyboard: Enter or Escape to dismiss
  - Mouse: click button to dismiss
  - Add static helper: `DialogAlert.show(dialog, title, message): Promise<void>`

- [ ] **Create UI component index and exports**
  - File: `src/ui/index.ts` (create if doesn't exist)
  - Export Dialog, DialogSelect, DialogConfirm, DialogAlert

### Phase 5: Command Context

- [ ] **Create CommandContext for command palette**
  - File: `src/context/CommandContext.tsx`
  - Context value interface:
    - `register(cb: () => CommandOption[])` - Register commands reactively with auto-cleanup
    - `show()` - Display command palette using DialogSelect
    - `trigger(value: string)` - Programmatically trigger command by value
    - `suspended()` - Accessor for whether keybinds are suspended
    - `keybinds(enabled: boolean)` - Suspend/resume keybind handling
  - CommandOption extends DialogSelectOption with `keybind?: string` for footer display
  - CommandProvider component:
    - Wraps children with context
    - Uses `useKeyboard` to listen for Ctrl+P (check for suspended state and no dialogs open)
    - Shows DialogSelect with registered commands
  - Add `CTRL_P` constant to `src/lib/constants.ts` (character code 0x10)
  - Export CommandProvider and useCommand hook

### Phase 6: Update Existing Dialogs

- [ ] **Refactor QuitConfirmation to use DialogConfirm pattern**
  - File: `src/components/QuitConfirmation.tsx`
  - Change from `[Y]es [N]o` key prompts to Cancel/Quit buttons
  - Use DialogConfirm internally or adopt its pattern directly
  - Props remain: `visible`, `onConfirm`, `onCancel`
  - Button labels: "Cancel" / "Quit"
  - Handle own keyboard (←/→/Enter/Escape) via useKeyboard
  - Remove Y/N key handling from App.tsx for this dialog

- [ ] **Refactor DialogResume to use DialogConfirm pattern**
  - File: `src/components/DialogResume.tsx`
  - Change from `[Y] [N]` key prompts to buttons
  - Button labels: "Start Fresh" / "Resume"
  - Show iteration number in message
  - Handle own keyboard via useKeyboard
  - Remove Y/N key handling from App.tsx for this dialog

- [ ] **Update DialogCompletion styling**
  - File: `src/components/DialogCompletion.tsx`
  - Add proper header with title + "esc" hint (or "Q" since Q quits)
  - Update footer to use new **Label** key pattern: "Quit Q"
  - Keep existing content structure (summary, manual tasks, blocked tasks, scrollbox)

- [ ] **Update DialogError styling**
  - File: `src/components/DialogError.tsx`
  - Add proper header with "Error" title + "esc" hint
  - Update footer to use new pattern: "Retry R" (if recoverable) + "Quit Q"
  - Keep existing error badge and message display

- [ ] **Refactor DialogTerminalConfig to use DialogSelect**
  - File: `src/components/DialogTerminalConfig.tsx`
  - Replace custom list rendering with DialogSelect for terminal list view
  - Terminal options become DialogSelectOption[] with onSelect handlers
  - Keep custom form view for "Custom..." option
  - Simplify createTerminalConfigState:
    - Remove list navigation logic (handled by DialogSelect)
    - Keep viewState signal for list/custom toggle
    - Keep custom form state (command, args, activeInput)
  - Add "Copy" keybind in DialogSelect footer
  - Remove custom handleInput for list view (DialogSelect handles it)
  - Keep handleInput only for custom form view

- [ ] **Update DialogTerminalError styling**
  - File: `src/components/DialogTerminalError.tsx`
  - Add proper header with "Terminal Launch Failed" + "esc" hint
  - Update footer to use new pattern: "Copy C" + "Close esc"
  - Keep existing content (terminal name badge, error, config hint, attach command)

### Phase 7: Wire Everything in App.tsx

- [ ] **Integrate CommandContext and register commands**
  - File: `src/App.tsx`
  - Wrap app with CommandProvider (inside DialogProvider, outside ToastProvider)
  - Register commands in AppContent:
    ```typescript
    command.register(() => [
      {
        title: "Copy attach command",
        value: "copy_attach",
        category: "Terminal",
        keybind: "C",
        onSelect: () => { /* copy attach command, show toast */ },
      },
      {
        title: "Choose default terminal",
        value: "terminal_config",
        category: "Terminal",
        keybind: "T",
        onSelect: () => { /* show terminal config dialog */ },
      },
    ])
    ```
  - Commands should only be enabled when there's a session (check sessionId || lastSessionId)

- [ ] **Simplify App.tsx input handler**
  - File: `src/App.tsx`
  - Remove Y/N key handling for QuitConfirmation (handled by component)
  - Remove Y/N key handling for DialogResume (handled by component)
  - Remove custom input handling delegation for terminal config list view
  - Keep: Space (pause/resume), Q (quit trigger), S (start), T (terminal launch trigger), error state R
  - Add: Ctrl+P detection → `command.show()`
  - Update T key handler: if no session, show toast; if session, call command.trigger("terminal_config") or show config directly

- [ ] **Update component exports**
  - File: `src/components/index.ts`
  - Remove createTerminalConfigState export if no longer needed externally
  - Keep all component exports

### Phase 8: Testing & Verification

- [ ] [MANUAL] **Visual verification of all dialogs**
  - Run ocloop and verify each dialog matches the new design:
    - Command palette (Ctrl+P): shows list, search works, navigation works
    - Terminal config (T key): shows DialogSelect with terminals
    - Quit confirmation (Q key): shows Cancel/Quit buttons
    - Resume dialog: shows Start Fresh/Resume buttons
    - Error dialog: proper styling with retry/quit footer
    - Completion dialog: proper styling with quit footer
    - Terminal error: proper styling with copy/close footer
  - Verify backdrop click dismisses all dialogs
  - Verify mouse hover/click works in DialogSelect
  - Verify keyboard navigation in all dialogs

- [ ] [MANUAL] **Test command palette commands**
  - "Copy attach command": verify copies to clipboard, shows toast
  - "Choose default terminal": opens terminal config dialog

## Testing Notes

### Manual Testing Steps

1. **Start ocloop in debug mode** (no PLAN.md needed):
   ```bash
   bun run build && ./dist/ocloop --debug
   ```

2. **Test Command Palette**:
   - Press `Ctrl+P` - should open command palette
   - Type to filter commands
   - Use ↑/↓ arrows to navigate
   - Press Enter to select
   - Press Escape to close
   - Click backdrop to close

3. **Test Terminal Config**:
   - Press `T` - should open terminal config (or command palette first time)
   - Navigate terminal list with arrows
   - Press `C` to copy attach command
   - Select "Custom..." to enter custom terminal

4. **Test Quit Confirmation**:
   - Press `Q` - should show Cancel/Quit buttons
   - Use ←/→ to switch active button
   - Press Enter to confirm active button
   - Press Escape to cancel

5. **Test Resume Dialog** (requires previous session state):
   - Create a `.loop-state.json` file manually or run a real session
   - Restart ocloop - should show Start Fresh/Resume dialog
   - Use ←/→ and Enter to navigate

6. **Test Backdrop Click**:
   - Open any dialog
   - Click outside the dialog content (on dark backdrop)
   - Dialog should dismiss

### Existing Tests

Run existing tests to ensure no regressions:
```bash
bun test
```

Tests that may need attention:
- `src/hooks/useLoopState.test.ts` - Loop state machine tests
- Any tests that mock dialog interactions

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add fuzzysort, remeda dependencies |
| `src/lib/locale.ts` | Create | Utility functions (truncate, titlecase) |
| `src/lib/constants.ts` | Modify | Add CTRL_P key constant |
| `src/context/ThemeContext.tsx` | Modify | Add selectedForeground helper |
| `src/ui/Dialog.tsx` | Modify | Remove title prop, add backdrop click |
| `src/ui/DialogSelect.tsx` | Create | Searchable selection dialog |
| `src/ui/DialogConfirm.tsx` | Create | Confirmation dialog with buttons |
| `src/ui/DialogAlert.tsx` | Create | Alert/notification dialog |
| `src/ui/index.ts` | Create | UI component exports |
| `src/context/CommandContext.tsx` | Create | Command palette context |
| `src/components/QuitConfirmation.tsx` | Modify | Use DialogConfirm pattern |
| `src/components/DialogResume.tsx` | Modify | Use DialogConfirm pattern |
| `src/components/DialogCompletion.tsx` | Modify | Update header/footer styling |
| `src/components/DialogError.tsx` | Modify | Update header/footer styling |
| `src/components/DialogTerminalConfig.tsx` | Modify | Use DialogSelect for list |
| `src/components/DialogTerminalError.tsx` | Modify | Update header/footer styling |
| `src/components/index.ts` | Modify | Update exports if needed |
| `src/App.tsx` | Modify | Add CommandProvider, register commands, simplify input handling |
