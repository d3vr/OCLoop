# Add Visible Scrollbar to Completion Dialog

## Overview

The completion dialog (`DialogCompletion.tsx`) displays raw content from `.loop-complete` files, but when content exceeds the 12-line max height, it's simply cut off with no visual indication that more content exists. Users have no way to scroll or see truncated content.

**Solution**: Replace the `<box>` container with a `<scrollbox>` element from `@opentui/solid` that provides:
1. A visible scrollbar track when content overflows
2. Keyboard/scroll navigation through the content
3. Visual feedback that more content exists

This matches the scrollbar pattern used in opencode's session view (`packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` lines 909-926).

## Backlog

- [x] **Replace box with scrollbox in DialogCompletion**
  - File: `src/components/DialogCompletion.tsx`
  - Location: Lines 103-109 (raw content display section)
  - Changes:
    - Replace `<box style={{ marginTop: 1, flexDirection: "column", maxHeight: 12, overflow: "hidden" }}>` with `<scrollbox>` element
    - Add `verticalScrollbarOptions` with:
      - `visible: true` - always show scrollbar when content overflows
      - `trackOptions.backgroundColor: theme().backgroundPanel` - track background
      - `trackOptions.foregroundColor: theme().borderSubtle` - scrollbar thumb color
    - Add `viewportOptions.paddingRight: 1` to make room for the scrollbar
    - Move `marginTop={1}` and `maxHeight={12}` to scrollbox props (not in style object)
  - Note: `<scrollbox>` is a JSX intrinsic element from opentui, not an import

- [x] **Increase dialog width to accommodate scrollbar**
  - File: `src/components/DialogCompletion.tsx`
  - Location: Line 84 (`width={60}`)
  - Change: Increase `width` from 60 to 62 to give room for scrollbar + padding

- [ ] [MANUAL] **Visual verification of scrollbar**
  - Create a `.loop-complete` file with 15+ lines of content (exceeds 12-line max)
  - Run ocloop and observe the completion dialog
  - Verify:
    - Scrollbar is visible on the right side when content overflows
    - Scrollbar thumb position reflects scroll position
    - Content can be scrolled (arrow keys or scroll wheel)
    - Scrollbar uses theme colors correctly
    - Content that fits within 12 lines shows no scrollbar (or minimal scrollbar)

## Testing Notes

1. **Build verification**: Run `bun run build` to ensure no type errors

2. **Manual visual test**:
   ```bash
   # Create a test .loop-complete file with many lines
   cat > .loop-complete << 'EOF'
   # Remaining Manual Tasks

   Line 1 - This is a test of scrollbar visibility
   Line 2 - The scrollbar should appear on the right
   Line 3 - When content exceeds 12 lines
   Line 4 - The scrollbar thumb should be draggable
   Line 5 - Or respond to scroll wheel/arrow keys
   Line 6 - This tests the overflow behavior
   Line 7 - Of the completion dialog
   Line 8 - With the new scrollbox component
   Line 9 - From @opentui/solid
   Line 10 - Which provides native scrollbar support
   Line 11 - For terminal UI applications
   Line 12 - This line should be at the boundary
   Line 13 - This line should require scrolling
   Line 14 - To see this content
   Line 15 - And this final line
   EOF

   # Run ocloop - it should detect .loop-complete and show completion dialog
   bun run dev
   ```

3. **Scrollbar behavior verification**:
   - Press arrow keys (Up/Down) to scroll content
   - Use scroll wheel if supported
   - Observe scrollbar thumb moves with content
   - Verify scrollbar doesn't overlap content text

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/DialogCompletion.tsx` | Modify | Replace `<box>` with `<scrollbox>` for raw content display, add scrollbar options, increase dialog width |
