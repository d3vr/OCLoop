# Fix Modal Keybindings and Filter Non-Keyboard Events

## Overview

Two bugs in the input handling system need to be fixed:

1. **Modal keybindings don't work**: When the terminal config modal (`DialogTerminalConfig`) or terminal error modal (`DialogTerminalError`) is displayed, no keyboard input is processed. Pressing Escape, arrow keys, Enter, or any other key has no effect. The modals document keyboard shortcuts in their footers but they don't function.

2. **Non-keyboard events are logged as keypresses**: Focus events (`\x1b[I` for focus-in, `\x1b[O` for focus-out) and potentially mouse events are logged as "Key pressed" in the debug log, making the keybinding log noisy and misleading.

### Root Cause Analysis

**Issue 1 - Modal keybindings**: In `src/App.tsx:812-814`, when a modal is showing, the input handler returns `false` early:

```typescript
if (showingTerminalConfig() || terminalError()) {
   return false
}
```

This was intended to "not interfere" with the dialog's input handling, but the dialog components have no way to receive input. `DialogTerminalConfig` creates internal state via `createTerminalConfigState()` which includes a `handleInput()` method, but it's never called because:
- The component doesn't expose its state externally
- App.tsx has no reference to call the dialog's input handler

**Issue 2 - Non-keyboard logging**: The input handler logs all sequences unconditionally at `src/App.tsx:801-808`. Focus events and mouse events are terminal control sequences, not user keypresses.

## Backlog

- [ ] **Filter non-keyboard events from keybinding log**
  - File: `src/App.tsx` (lines 801-808)
  - Add condition before `log.debug("keybinding", ...)` to skip:
    - Focus events: `\x1b[I` (focus in), `\x1b[O` (focus out)
    - Mouse events X10 mode: sequences starting with `\x1b[M`
    - Mouse events SGR mode: sequences starting with `\x1b[<`
  - Create a helper function `isKeyboardInput(sequence: string): boolean` for clarity
  - Place helper in `src/lib/constants.ts` alongside `KEYS` constant

- [ ] **Fix terminal config modal input handling**
  - File: `src/App.tsx`
  - File: `src/components/DialogTerminalConfig.tsx`
  - Changes:
    1. Export `createTerminalConfigState` is already exported, good
    2. In App.tsx, lift the terminal config state creation to the component level
       - Call `createTerminalConfigState()` at App.tsx component scope (near line 116 where `showingTerminalConfig` signal is)
       - Pass required callbacks: `onSelect`, `onCustom`, `onCopy`, `onCancel`
    3. Modify input handler (line 812-814):
       - When `showingTerminalConfig()` is true, call `terminalConfigState.handleInput(sequence)` and return its result
    4. Update `DialogTerminalConfig` component to accept state as a prop instead of creating it internally:
       - Add new prop `state: TerminalConfigState` to `DialogTerminalConfigProps`
       - Remove internal `createTerminalConfigState()` call in component
       - Use passed-in state for rendering
    5. Update App.tsx render to pass state prop to `DialogTerminalConfig`

- [ ] **Fix terminal error modal input handling**
  - File: `src/App.tsx`
  - File: `src/components/DialogTerminalError.tsx`
  - Changes:
    1. Create `createTerminalErrorState()` function in `DialogTerminalError.tsx`:
       - Similar pattern to `createTerminalConfigState()`
       - Handles: `C/c` for copy, `Escape` for close, `Enter` for close
       - Returns `{ handleInput: (sequence: string) => boolean }`
    2. Export the state type and factory function
    3. In App.tsx, create terminal error state at component level
    4. Modify input handler (line 812-814):
       - When `terminalError()` is true, call `terminalErrorState.handleInput(sequence)` and return its result
    5. Update `DialogTerminalError` props to accept state (optional, may not need UI state since it's display-only)

- [ ] **[MANUAL] Verify all modal keybindings work**
  - Launch ocloop in debug mode: `bun run dev -- -d`
  - Press `T` to open terminal config modal
  - Test: Arrow keys move selection, Enter selects, C copies, Escape closes
  - Trigger terminal error (configure invalid terminal in config, press T)
  - Test: C copies, Escape/Enter closes
  - Check `.loop.log` - verify focus events and mouse clicks are NOT logged as "Key pressed"

## Testing Notes

### Manual Testing Steps

1. **Test keybinding filter**:
   ```bash
   bun run dev -- -d
   ```
   - Switch focus away from terminal and back
   - Check `.loop.log` - should NOT see focus events logged as "Key pressed"
   - Click with mouse if supported - should NOT see mouse events logged

2. **Test terminal config modal**:
   ```bash
   bun run dev -- -d
   ```
   - Press `T` to open terminal config dialog
   - Press `↓` or `j` - selection should move down
   - Press `↑` or `k` - selection should move up
   - Press `C` - should copy attach command (check clipboard)
   - Press `Escape` - dialog should close
   - Re-open with `T`, press `Enter` on a terminal - should select and launch/close

3. **Test terminal error modal**:
   - Edit `~/.config/ocloop/config.json` to have invalid terminal:
     ```json
     { "terminal": { "type": "known", "name": "nonexistent-terminal" } }
     ```
   - Run `bun run dev -- -d`, press `T`
   - Error dialog should appear
   - Press `C` - should copy attach command
   - Press `Escape` or `Enter` - dialog should close

### Automated Tests

Currently no automated tests for input handling. Consider adding in future.

## File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/constants.ts` | Modify | Add `isKeyboardInput()` helper function |
| `src/App.tsx` | Modify | Filter non-keyboard events from log; lift modal state; forward input to modal handlers |
| `src/components/DialogTerminalConfig.tsx` | Modify | Accept state as prop instead of creating internally |
| `src/components/DialogTerminalError.tsx` | Modify | Add `createTerminalErrorState()` factory function |
