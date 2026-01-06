# Migration Plan: Replace `useInput` with `useKeyboard`

## Overview

Replace ocloop's custom `useInput` hook with opentui's native `useKeyboard` hook across all components. This migration:

1. **Fixes input routing** - The current `useInput` hook uses `renderer.prependInputHandler()` which consumes ALL input before it reaches opentui's KeyHandler, preventing native `<input>` components from working
2. **Aligns with OpenCode** - Matches how OpenCode handles keyboard input in their TUI
3. **Removes "Not Invented Here" code** - Leverages the framework's built-in keyboard handling instead of custom implementation
4. **Improves search input styling** - Replaces bordered manual text input with OpenCode-style borderless native `<input>` component

### Key API Differences

| Aspect | `useInput` | `useKeyboard` |
|--------|-----------|---------------|
| Import | `../hooks/useInput` | `@opentui/solid` |
| Signature | `(input: string, key: Key) => void` | `(key: KeyEvent) => void` |
| Enter key | `key.name === "return" \|\| key.name === "enter"` | `key.name === "return"` |
| Ctrl+P | `input === "\x10"` | `key.ctrl && key.name === "p"` |
| Ctrl+N | `input === "\x0e"` | `key.ctrl && key.name === "n"` |
| Character check | `input === "c"` | `key.name === "c"` or `key.sequence === "c"` |
| Prevent default | N/A | `key.preventDefault()` |

---

## Backlog

### Phase 1: Migrate Simple Dialogs (LOW complexity)

- [ ] **Migrate `src/ui/DialogAlert.tsx`**
  - Replace import: `useInput` → `useKeyboard` from `@opentui/solid`
  - Update callback at line 17:
    - Change signature from `(input, key) =>` to `(key) =>`
    - Simplify: both escape and return call `props.onConfirm()`
    - Remove `key.name === "enter"` check (only need `"return"`)
  - Verify: Dialog opens, Enter closes, Escape closes

- [ ] **Migrate `src/ui/DialogConfirm.tsx`**
  - Replace import: `useInput` → `useKeyboard` from `@opentui/solid`
  - Update callback at lines 21-40:
    - Change signature from `(input, key) =>` to `(key) =>`
    - Remove `key.name === "enter"` check (only need `"return"`)
    - Keep left/right arrow handling unchanged
  - Verify: Dialog opens, Left/Right switch buttons, Enter confirms selected, Escape cancels

- [ ] **Migrate `src/components/DialogTerminalError.tsx`**
  - Replace import: `useInput` → `useKeyboard` from `@opentui/solid`
  - Update callback at lines 31-42:
    - Change signature from `(input, key) =>` to `(key) =>`
    - Change `input === "c" || input === "C"` to `key.name === "c" || key.sequence === "C"`
    - Remove `key.name === "enter"` check
  - Verify: Dialog opens, 'C' copies command, Enter/Escape close

- [ ] **Migrate `src/context/CommandContext.tsx`**
  - Replace import: `useInput` → `useKeyboard` from `@opentui/solid`
  - Remove import: `KEYS` from `../lib/constants` (no longer needed here)
  - Update callback at lines 64-73:
    - Change signature from `(input, key) =>` to `(key) =>`
    - Change `input === KEYS.CTRL_P` to `key.ctrl && key.name === "p"`
  - Verify: Ctrl+P opens command palette when no dialog is open

### Phase 2: Migrate Complex Components (MEDIUM/HIGH complexity)

- [ ] **Migrate `src/components/DialogTerminalConfig.tsx` - CustomTerminalForm**
  - This component has an internal `CustomTerminalForm` that uses manual text input
  - Add imports:
    - `useKeyboard` from `@opentui/solid`
    - `InputRenderable` from `@opentui/core`
  - Remove import: `useInput` from `../hooks/useInput`
  - In `CustomTerminalForm` function (starts line 86):
    - Add refs: `let commandInput: InputRenderable | undefined` and `let argsInput: InputRenderable | undefined`
    - Replace `useInput` callback (lines 93-126) with `useKeyboard`:
      - Handle Tab: switch focus between command/args inputs
      - Handle Return: call `s.onSaveCustom()`
      - Handle Escape: call `props.onCancel()`
      - Remove manual backspace/character handling (native `<input>` handles this)
    - Replace command input markup (lines 136-148):
      - Replace manual `<text>/<span>` with `<box>` containing label + native `<input>`
      - Props: `onInput`, `value`, `focusedBackgroundColor={theme().backgroundElement}`, `cursorColor={theme().primary}`, `focusedTextColor={theme().text}`
      - Use ref to manage focus
    - Replace args input markup (lines 150-162):
      - Same pattern as command input
  - Verify: Custom terminal form opens, Tab switches fields, typing works in both, Enter saves, Escape goes back

- [ ] **Migrate `src/ui/DialogSelect.tsx`** (most complex)
  - Add imports:
    - `useKeyboard` from `@opentui/solid`
    - `InputRenderable` from `@opentui/core`
  - Remove imports:
    - `useInput` from `../hooks/useInput`
    - `KEYS` from `../lib/constants` (if no longer needed)
  - Add ref: `let input: InputRenderable | undefined` (after line 45)
  - Replace `useInput` callback (lines 91-149) with `useKeyboard`:
    - Change signature from `(input, key) =>` to `(key) =>`
    - Escape: `key.name === "escape"` → `props.onClose()`
    - Enter: `key.name === "return"` → select current option
    - Up: `key.name === "up" || (key.ctrl && key.name === "p")` → move up
    - Down: `key.name === "down" || (key.ctrl && key.name === "n")` → move down
    - PageUp/PageDown: unchanged logic
    - Remove manual character input handling (lines 127-133) - native `<input>` handles this
    - Update keybind matching: change `input` checks to `key.sequence`
  - Replace search input box (lines 170-184):
    - Remove: `borderStyle: "rounded"`, `borderColor`, `height: 3`
    - Change to: `<box style={{ paddingTop: 1, paddingBottom: 1 }}>`
    - Replace manual `<text>/<span>` with native `<input>`:
      - `onInput={(value) => setSearch(value)}`
      - `focusedBackgroundColor={theme().backgroundPanel}`
      - `cursorColor={theme().primary}`
      - `focusedTextColor={theme().textMuted}`
      - `placeholder={props.placeholder ?? "Search"}`
      - `ref` with `setTimeout(() => input?.focus(), 1)`
  - Verify: Search typing works, filtering works, arrow navigation works, Ctrl+P/N navigation, Enter selects, Escape closes, custom keybinds work

### Phase 3: Cleanup

- [ ] **Remove `src/hooks/useInput.ts`**
  - Delete the entire file
  - Run `bun run build` to confirm no remaining imports

- [ ] **Clean up `src/lib/constants.ts`**
  - Check if `KEYS.CTRL_P` and `KEYS.CTRL_N` are still used anywhere
  - If not used, remove them from the `KEYS` object
  - Run grep to verify: `grep -r "KEYS\." src/`
  - Keep only keys that are still referenced

### Phase 4: Testing

- [ ] **Add/update tests for keyboard handling**
  - Check for existing tests in `src/**/*.test.{ts,tsx}` related to dialogs
  - If tests exist that mock `useInput`, update them to work with `useKeyboard`
  - Consider adding tests for:
    - DialogSelect: navigation, selection, search filtering
    - DialogConfirm: button switching, confirm/cancel
    - CommandContext: Ctrl+P trigger

- [ ] **[MANUAL] Full UI verification**
  - Start the application: `bun run dev` or equivalent
  - Test each dialog:
    - Command palette (Ctrl+P): opens, search works, navigation works, selection works
    - Terminal config dialog: list navigation, custom form text entry
    - Confirm dialogs: button navigation, confirm/cancel
    - Alert dialogs: dismiss with Enter/Escape
  - Test the search input styling matches OpenCode (no border, proper padding)

---

## Testing Notes

### Build Verification
```bash
bun run build
```
Should complete with no TypeScript errors.

### Manual Test Checklist

| Component | How to Open | Test Actions |
|-----------|-------------|--------------|
| Command Palette | Press `Ctrl+P` | Type to filter, ↑/↓ to navigate, Enter to select, Escape to close |
| DialogSelect | Via command palette or terminal config | Type search query, ↑/↓/PgUp/PgDn navigate, Ctrl+P/N navigate, Enter select, Escape close |
| DialogConfirm | Triggered by various actions | ←/→ switch buttons, Enter confirm, Escape cancel |
| DialogAlert | Triggered by errors/notifications | Enter or Escape to dismiss |
| Terminal Config | Via terminal config command | Navigate list, select "Custom...", Tab between fields, type in fields, Enter save, Escape back |
| Terminal Error | When terminal launch fails | Press 'C' to copy, Enter/Escape to close |

### Regression Testing
After each file change:
1. Run `bun run build` - must pass
2. Run `bun test` - must pass (if tests exist)
3. Manually verify the specific component still works

---

## File Change Summary

| File | Action | Complexity | Notes |
|------|--------|------------|-------|
| `src/ui/DialogAlert.tsx` | Modify | LOW | Replace useInput → useKeyboard |
| `src/ui/DialogConfirm.tsx` | Modify | LOW | Replace useInput → useKeyboard |
| `src/ui/DialogSelect.tsx` | Modify | HIGH | Replace useInput → useKeyboard, replace manual text input with native `<input>`, update styling |
| `src/components/DialogTerminalConfig.tsx` | Modify | MEDIUM | Replace useInput → useKeyboard, replace manual text inputs with native `<input>` components |
| `src/components/DialogTerminalError.tsx` | Modify | LOW | Replace useInput → useKeyboard |
| `src/context/CommandContext.tsx` | Modify | LOW | Replace useInput → useKeyboard, update Ctrl+P detection |
| `src/hooks/useInput.ts` | Delete | - | Remove custom hook entirely |
| `src/lib/constants.ts` | Modify | LOW | Remove unused KEYS entries |

---

## Reference: OpenCode Implementation

See `../opencode/packages/opencode/src/cli/cmd/tui/ui/dialog-select.tsx` for reference implementation:
- Lines 153-177: `useKeyboard` usage pattern
- Lines 201-218: Native `<input>` component with styling props
