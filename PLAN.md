# DialogSelect Scroll-Into-View Fix

## Overview

The `DialogSelect` component has a scrolling bug where navigating with arrow keys doesn't automatically scroll selected items into view. The current implementation uses manual viewport slicing (`viewportStart` + array `.slice()`), while opencode uses opentui's `<scrollbox>` component with programmatic `scrollBy()` calls to keep the selected item visible.

**Root cause:** We render only a sliced subset of items and manually track viewport offset, but the scroll adjustment logic doesn't properly sync with what's actually rendered.

**Solution:** Replace manual viewport management with opentui's `<scrollbox>` component and implement scroll-into-view logic matching opencode's approach:
1. Render all filtered options inside a `<scrollbox>`
2. Assign unique `id` to each option element
3. On selection change, find the child element and call `scrollBy()` to bring it into view
4. On filter change, call `scrollTo(0)` to reset scroll position

## Backlog

- [x] **Refactor DialogSelect to use scrollbox with scroll-into-view**
  - File: `src/ui/DialogSelect.tsx`
  - Import `ScrollBoxRenderable` from `@opentui/core` for type annotation
  - Remove `viewportStart` signal (line 44) - no longer needed
  - Remove `ITEMS_PER_PAGE` constant (line 46) - no longer needed  
  - Remove `visibleItems()` computed (lines 148-151) - no longer needed
  - Add scrollbox ref: `let scroll: ScrollBoxRenderable | undefined`
  - Create `moveTo(index: number)` helper function that:
    - Sets selectedIndex
    - Finds child by id using `scroll.getChildren().find()`
    - Calculates if child is in view (`child.y - scroll.y`)
    - Calls `scroll.scrollBy()` to adjust if needed
  - Update keyboard handlers (up/down/pageup/pagedown) to call `moveTo()` instead of direct `setSelectedIndex`
  - Update filter effect to call `scroll?.scrollTo(0)` when filter changes
  - Replace `<box style={{ flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>` with `<scrollbox>`:
    - Add `ref={(r) => scroll = r}` 
    - Add `maxHeight={6}` (equivalent to ITEMS_PER_PAGE)
    - Add `scrollbarOptions={{ visible: false }}`
  - Update `<For each={visibleItems()}>` to `<For each={filteredOptions()}>`
  - Add `id={option.value}` to each option's outer `<box>`
  - Remove viewport offset calculation from option index (`const index = () => viewportStart() + i()` becomes just `i()`)

- [ ] **[MANUAL] Test DialogSelect scroll behavior**
  - Run `bun run build && bun run dev`
  - Open terminal config dialog (should have 5+ options to test scrolling)
  - Verify: pressing down arrow scrolls items into view when reaching bottom
  - Verify: pressing up arrow scrolls items into view when reaching top
  - Verify: typing in search box resets scroll to top
  - Verify: pageup/pagedown work correctly
  - Verify: mouse click on options still works
  - Verify: current item indicator (bullet) still displays correctly

## Testing Notes

1. **Build and run:**
   ```bash
   bun run build && bun run dev
   ```

2. **Test scenarios:**
   - Open the terminal configuration dialog (requires a session with terminal output)
   - Navigate up/down through the list - selected item should always be visible
   - Type search text - list should filter and scroll reset to top
   - Use PageUp/PageDown - should move in larger increments
   - Click on items - should still select and trigger action

3. **Edge cases to verify:**
   - List with fewer items than viewport height (no scrolling needed)
   - List with exactly viewport height items
   - List with many more items than viewport
   - Empty search results ("No results found" display)
   - Rapid key presses

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/ui/DialogSelect.tsx` | Modify | Replace manual viewport slicing with scrollbox, add scroll-into-view logic |
