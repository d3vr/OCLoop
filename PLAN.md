# Terminal Reset on Exit

## Overview

When ocloop exits, the terminal is left in a messed up state with broken colors, missing cursor, or other visual artifacts. This happens because ocloop calls `process.exit()` directly without first calling `renderer.destroy()` to perform the terminal cleanup/reset sequence.

The opentui renderer's `destroy()` method performs critical terminal restoration:
- Resets all text attributes (colors, styles) via `\x1b[0m`
- Shows the cursor via `\x1b[?25h`
- Exits alternate screen mode if enabled
- Disables mouse tracking, kitty keyboard protocol, bracketed paste
- Resets cursor style and color
- Clears terminal title

OpenCode handles this correctly by calling `renderer.destroy()` before `process.exit()`. We need to do the same in ocloop.

## Backlog

- [x] Add `renderer.destroy()` call before `process.exit()` in `handleQuit()`
  - File: `src/App.tsx`
  - Location: `handleQuit()` function (lines 461-492)
  - The `renderer` reference is already available in `AppContent` scope (line 94)
  - Add `renderer.setTerminalTitle("")` to clear window title
  - Add `renderer.destroy()` call immediately before `process.exit(exitCode)`
  - Note: `handleQuit` is defined inside `AppContent` so it has closure access to `renderer`

## Testing Notes

1. **Manual verification required:**
   - Run `bun run build && ./dist/ocloop -d` to start in debug mode
   - Press `Q` to quit
   - Verify terminal cursor is visible after exit
   - Verify terminal colors are normal (try running `ls --color` or similar)
   - Verify no leftover escape sequences are printed

2. **Test SIGINT handling:**
   - Start ocloop: `./dist/ocloop -d`
   - Press `Ctrl+C` to trigger SIGINT
   - Verify terminal is properly reset

3. **Compare with opencode:**
   - Run opencode and exit - terminal should be clean
   - Run ocloop and exit - terminal should now also be clean

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/App.tsx` | Modify | Add `renderer.destroy()` call in `handleQuit()` before `process.exit()` |
