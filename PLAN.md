# OCLoop UI Refactor Plan

## Overview

Refactor the OCLoop TUI to match OpenCode's visual design patterns and provide a stable, informative dashboard experience. The current implementation has several issues:

1. **Unstable Layout**: StatusBar grows dynamically based on content, causing layout shifts
2. **Hardcoded Colors**: No theming system; colors are scattered strings like `"cyan"`, `"yellow"`
3. **Poor Focus Indication**: Unclear which pane (header vs terminal) is "active"
4. **Missing Timing Data**: No iteration time tracking, averages, or ETA
5. **No Session Persistence**: Cannot resume interrupted runs
6. **Text Dump in StatusBar**: Completion summary clutters the status area instead of using a modal

This refactor introduces OpenCode's provider-based architecture, a theme system that auto-detects the user's OpenCode theme, a fixed-height Dashboard, proper modal dialogs, and session state persistence.

---

## Backlog

### Phase 1: Infrastructure

- [x] **Vendor OpenCode theme definitions**
  - Create directory `src/lib/themes/`
  - Copy all 32 theme JSON files from `../opencode/packages/opencode/src/cli/cmd/tui/context/theme/`:
    - `aura.json`, `ayu.json`, `catppuccin.json`, `catppuccin-frappe.json`, `catppuccin-macchiato.json`
    - `cobalt2.json`, `cursor.json`, `dracula.json`, `everforest.json`, `flexoki.json`
    - `github.json`, `gruvbox.json`, `kanagawa.json`, `lucent-orng.json`, `material.json`
    - `matrix.json`, `mercury.json`, `monokai.json`, `nightowl.json`, `nord.json`
    - `one-dark.json`, `opencode.json`, `orng.json`, `osaka-jade.json`, `palenight.json`
    - `rosepine.json`, `solarized.json`, `synthwave84.json`, `tokyonight.json`
    - `vercel.json`, `vesper.json`, `zenburn.json`
  - Create `src/lib/themes/index.ts` to export all themes as a record

- [x] **Create theme resolver utility**
  - Create `src/lib/theme-resolver.ts`
  - Port the `resolveTheme()` function from OpenCode's `context/theme.tsx`
  - Handle color resolution: hex strings, def references, dark/light variants
  - Export `ThemeColors` type with all semantic tokens:
    - `primary`, `secondary`, `accent`
    - `background`, `backgroundPanel`, `backgroundElement`
    - `text`, `textMuted`
    - `border`, `borderActive`, `borderSubtle`
    - `success`, `warning`, `error`, `info`

- [x] **Create ThemeContext provider**
  - Create `src/context/ThemeContext.tsx`
  - On init, read `~/.local/state/opencode/kv.json` using XDG paths:
    - Extract `theme` (string, default: `"opencode"`)
    - Extract `theme_mode` (`"dark"` | `"light"`, default: `"dark"`)
  - Load corresponding theme from vendored files
  - Fallback to `opencode` theme if file missing or theme not found
  - Export `useTheme()` hook returning `{ theme: ThemeColors, mode: string }`
  - Export `ThemeProvider` component

- [x] **Create DialogContext provider**
  - Create `src/context/DialogContext.tsx`
  - Implement stack-based dialog manager:
    - `show(component: () => JSX.Element)`: Push dialog to stack
    - `replace(component: () => JSX.Element)`: Clear stack, push new dialog
    - `clear()`: Pop all dialogs
    - `stack`: Accessor for current dialog stack
  - Handle Escape key to dismiss top dialog
  - Export `useDialog()` hook and `DialogProvider` component

- [x] **Create base Dialog component**
  - Create `src/ui/Dialog.tsx`
  - Renders as absolute-positioned overlay:
    - Full screen dimensions
    - Semi-transparent black backdrop (`RGBA(0, 0, 0, 150)`)
    - Centered content box with `theme.backgroundPanel` background
  - Props: `onClose: () => void`, `children: JSX.Element`
  - Click on backdrop calls `onClose`

### Phase 2: State & Logic

- [x] **Create loop state persistence utility**
  - Create `src/lib/loop-state.ts`
  - Define schema:
    ```ts
    interface LoopStateFile {
      version: 1
      iteration: number
      iterationHistory: number[]  // Active times in ms
      createdAt: number
      updatedAt: number
    }
    ```
  - Implement functions:
    - `loadLoopState(): Promise<LoopStateFile | null>` - Read `.loop-state.json` from cwd
    - `saveLoopState(state: LoopStateFile): Promise<void>` - Write to `.loop-state.json`
    - `deleteLoopState(): Promise<void>` - Remove file on completion
  - Handle file not found, parse errors gracefully (return null)

- [x] **Create .gitignore auto-update utility**
  - Add to `src/lib/loop-state.ts`:
    - `ensureGitignore(): Promise<void>`
    - Check if `.gitignore` exists in cwd
    - If exists, check if `.loop-state.json` is listed
    - If not listed, append `\n.loop-state.json` to file
    - If `.gitignore` doesn't exist, create it with `.loop-state.json`

- [x] **Create useLoopStats hook**
  - Create `src/hooks/useLoopStats.ts`
  - State:
    ```ts
    {
      iterationStartTime: number | null
      pauseStartTime: number | null
      accumulatedPauseTime: number
      history: number[]  // Active times for completed iterations
    }
    ```
  - Methods:
    - `startIteration()`: Set `iterationStartTime = Date.now()`, reset `accumulatedPauseTime = 0`
    - `pause()`: Set `pauseStartTime = Date.now()`
    - `resume()`: Add `(Date.now() - pauseStartTime)` to `accumulatedPauseTime`, clear `pauseStartTime`
    - `endIteration()`: Calculate active time, push to history, return duration
    - `loadFromState(state: LoopStateFile)`: Restore history from persisted state
  - Computed:
    - `elapsedTime()`: Current iteration elapsed (updates every 1s via interval), minus accumulated pause
    - `averageTime()`: `sum(history) / history.length` or null if empty
    - `totalActiveTime()`: `sum(history)` + current iteration active time
    - `estimatedTotal(remaining: number)`: `averageTime * remaining` or null
  - Format helper: `formatDuration(ms: number): string` → `"1m 23s"`, `"45s"`, `"2h 15m"`
  - Return `"N/A"` for estimates when no history data available

- [x] **Add current task detection to plan parser**
  - Modify `src/lib/plan-parser.ts`
  - Add function `getCurrentTask(planFile: string): Promise<string | null>`
  - Parse PLAN.md and find first line matching `- [ ]` pattern
  - Extract task text (strip the checkbox prefix)
  - Return null if no unchecked tasks found

### Phase 3: Components

- [x] **Create Dashboard component**
  - Create `src/components/Dashboard.tsx`
  - Fixed height: 4 rows
  - Props:
    ```ts
    {
      isActive: boolean
      state: LoopState
      progress: PlanProgress | null
      stats: ReturnType<typeof useLoopStats>
      currentTask: string | null
      isAttached: boolean
    }
    ```
  - Layout (4 rows):
    - Row 1: State badge + Iteration + Tasks progress bar
    - Row 2: Timer (current) + Average + Estimated total
    - Row 3: Current task (truncated if needed)
    - Row 4: Keybind hints (OpenCode style: `Ctrl+\ attach  Space pause  Q quit`)
  - Styling:
    - Active: Border = `theme.primary`, full opacity
    - Inactive: Border = `theme.borderSubtle`, reduced opacity (0.7)
  - Keybind hints format: Key in `theme.text`, description in `theme.textMuted`

- [x] **Create DialogCompletion component**
  - Create `src/components/DialogCompletion.tsx`
  - Props:
    ```ts
    {
      iterations: number
      totalTime: number  // ms
      manualTasks: string[]
      blockedTasks: string[]
    }
    ```
  - Layout:
    - Title: "✓ Plan Complete"
    - Summary: "Completed in X iterations (Ym Zs)"
    - If manualTasks.length > 0: Section with header "Manual Tasks" + bullet list
    - If blockedTasks.length > 0: Section with header "Blocked Tasks" + bullet list
    - If no tasks: "All automatable tasks finished."
    - Footer: "Press any key to exit"
  - Use theme colors: `theme.success` for checkmark, `theme.warning` for manual, `theme.error` for blocked

- [x] **Create DialogError component**
  - Create `src/components/DialogError.tsx`
  - Props:
    ```ts
    {
      source: string
      message: string
      recoverable: boolean
      onRetry?: () => void
      onQuit: () => void
    }
    ```
  - Layout:
    - Title: "Error" with `theme.error` color
    - Source badge and message
    - If recoverable: "[R] Retry  [Q] Quit"
    - If not recoverable: "[Q] Quit"

- [x] **Create DialogResume component**
  - Create `src/components/DialogResume.tsx`
  - Props:
    ```ts
    {
      iteration: number
      onResume: () => void
      onStartFresh: () => void
    }
    ```
  - Layout:
    - Title: "Resume Previous Run?"
    - Message: "Found interrupted session at iteration {iteration}"
    - Buttons: "[Y] Resume  [N] Start Fresh"

- [x] **Refactor TerminalPanel component**
  - Modify `src/components/TerminalPanel.tsx`
  - Remove hardcoded styles:
    - Remove `border: true`, `borderStyle: "single"`
    - Remove `borderColor: props.dimmed ? "gray" : "cyan"`
  - Add props:
    - `isActive: boolean` (replaces `dimmed`)
  - Import and use `useTheme()`:
    - Border: `isActive ? theme.primary : theme.borderSubtle`
    - Opacity: `isActive ? 1 : 0.7`
  - Keep `showCursor={isActive}` behavior

- [x] **Refactor ProgressIndicator component**
  - Modify `src/components/ProgressIndicator.tsx`
  - Import and use `useTheme()`
  - Replace hardcoded colors:
    - Filled segments: `theme.primary`
    - Empty segments: `theme.borderSubtle`

- [x] **Refactor QuitConfirmation to use Dialog system**
  - Modify `src/components/QuitConfirmation.tsx`
  - Remove the component's own overlay/positioning logic
  - Convert to a simple content component that gets wrapped by Dialog
  - Or: Delete file and inline into a `DialogQuit.tsx` that uses the Dialog system

### Phase 4: Integration

- [x] **Update App.tsx with provider hierarchy**
  - Modify `src/App.tsx`
  - Wrap app in providers (order matters):
    ```tsx
    <ThemeProvider>
      <DialogProvider>
        <AppContent />
      </DialogProvider>
    </ThemeProvider>
    ```
  - Move current App logic into `AppContent` component

- [ ] **Integrate useLoopStats into App**
  - Modify `src/App.tsx`
  - Initialize `useLoopStats()` hook
  - Wire up to loop state machine:
    - On `iteration_started`: Call `stats.startIteration()`
    - On `toggle_pause` (pause): Call `stats.pause()`
    - On `toggle_pause` (resume): Call `stats.resume()`
    - On `session_idle`: Call `stats.endIteration()`, update persisted state

- [ ] **Integrate session persistence into App**
  - Modify `src/App.tsx`
  - On startup (after server ready):
    - Call `ensureGitignore()`
    - Call `loadLoopState()`
    - If state exists: Show `DialogResume` via dialog system
    - On resume: Load history into stats, set iteration count
    - On start fresh: Delete state file, proceed normally
  - On iteration complete: Call `saveLoopState()` with updated data
  - On plan complete: Call `deleteLoopState()`

- [ ] **Integrate current task detection**
  - Modify `src/App.tsx`
  - Track `currentTask` signal
  - Primary source: SSE `onTodoUpdated` with `status: "in_progress"`
  - Fallback: On `iteration_started` and `onFileEdited` for PLAN.md, call `getCurrentTask()`
  - Pass to Dashboard component

- [ ] **Implement new layout structure**
  - Modify `src/App.tsx`
  - Remove `STATUS_BAR_HEIGHT` constant
  - New layout:
    ```tsx
    <box flexDirection="column" height="100%">
      <Dashboard
        isActive={!isAttached}
        state={loop.state()}
        progress={planProgress()}
        stats={stats}
        currentTask={currentTask()}
        isAttached={loop.isAttached()}
      />
      <TerminalPanel
        isActive={isAttached}
        terminalRef={...}
        cols={...}
        rows={...}
      />
    </box>
    ```
  - Calculate terminal rows: `dimensions.height - 4` (Dashboard fixed at 4 rows)

- [ ] **Wire up completion dialog**
  - Modify `src/App.tsx`
  - When `loop.state().type === "complete"`:
    - Calculate `totalTime` from stats
    - Show `DialogCompletion` via dialog system
    - On any key press in dialog: Exit process

- [ ] **Wire up error dialog**
  - Modify `src/App.tsx`
  - When `loop.state().type === "error"`:
    - Show `DialogError` via dialog system
    - Handle retry/quit actions

- [ ] **Clean up deleted components**
  - Delete `src/components/StatusBar.tsx`
  - Delete `src/components/ErrorDisplay.tsx`
  - Update `src/components/index.ts` exports:
    - Remove: `StatusBar`, `ErrorDisplay`
    - Add: `Dashboard`, `DialogCompletion`, `DialogError`, `DialogResume`

### Phase 5: Polish & Testing

- [ ] [MANUAL] **Visual verification of theme matching**
  - Run `opencode` and note current theme
  - Run `ocloop` in same terminal
  - Verify colors match (primary, background, text, borders)
  - Test with at least 3 different themes (opencode, dracula, tokyonight)

- [ ] [MANUAL] **Test focus indication**
  - Start ocloop, verify Dashboard has bright border (detached state)
  - Press `Ctrl+\` to attach, verify Terminal gets bright border, Dashboard dims
  - Press `Ctrl+\` to detach, verify Dashboard gets bright border back

- [ ] [MANUAL] **Test timing accuracy**
  - Run a short plan with 2-3 iterations
  - Verify current iteration timer updates every second
  - Verify timer pauses when Space is pressed
  - Verify average calculation after 2+ iterations
  - Verify total time in completion dialog matches expected

- [ ] [MANUAL] **Test session persistence**
  - Start a run, complete 2 iterations
  - Press Q to quit mid-run
  - Verify `.loop-state.json` exists with correct data
  - Restart ocloop, verify resume prompt appears
  - Select resume, verify iteration count continues correctly
  - Complete plan, verify `.loop-state.json` is deleted

- [ ] [MANUAL] **Test .gitignore auto-update**
  - Remove `.loop-state.json` from .gitignore (or delete .gitignore)
  - Run ocloop
  - Verify `.loop-state.json` was added to .gitignore

- [ ] [MANUAL] **Test empty completion scenario**
  - Create a plan with no `[MANUAL]` or `[BLOCKED]` tasks
  - Run to completion
  - Verify dialog shows "All automatable tasks finished." message

---

## Testing Notes

### Manual Testing Workflow

1. **Build the project**:
   ```bash
   bun run build
   ```

2. **Run in development mode**:
   ```bash
   bun run dev
   ```

3. **Test with a sample plan**:
   - Create a `PLAN.md` with 3-5 simple tasks
   - Create a `PROMPT.md` with basic instructions
   - Run `bun run dev --run` to auto-start

4. **Theme verification**:
   - Check `~/.local/state/opencode/kv.json` for current theme
   - Compare ocloop colors against opencode TUI

### Key Scenarios to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| Fresh start | No resume prompt, starts at iteration 1 |
| Resume after quit | Shows resume prompt with correct iteration |
| Pause/Resume timing | Timer pauses, total time accurate |
| Attach/Detach | Border colors swap correctly |
| Plan complete | Modal shows, file deleted, any key exits |
| Error (recoverable) | Modal shows retry option |
| Error (non-recoverable) | Modal shows quit only |
| Theme not found | Falls back to opencode theme |
| kv.json missing | Falls back to opencode theme, dark mode |

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/themes/` | Create | Directory with 32 vendored theme JSONs |
| `src/lib/themes/index.ts` | Create | Export all themes as record |
| `src/lib/theme-resolver.ts` | Create | Theme color resolution logic |
| `src/lib/loop-state.ts` | Create | Session persistence + gitignore utility |
| `src/lib/plan-parser.ts` | Modify | Add `getCurrentTask()` function |
| `src/context/ThemeContext.tsx` | Create | Theme provider + auto-detect |
| `src/context/DialogContext.tsx` | Create | Stack-based dialog manager |
| `src/ui/Dialog.tsx` | Create | Base dialog overlay component |
| `src/hooks/useLoopStats.ts` | Create | Timing logic with pause awareness |
| `src/components/Dashboard.tsx` | Create | New header component (4 rows) |
| `src/components/DialogCompletion.tsx` | Create | Plan complete modal |
| `src/components/DialogError.tsx` | Create | Error display modal |
| `src/components/DialogResume.tsx` | Create | Resume prompt modal |
| `src/components/TerminalPanel.tsx` | Modify | Add isActive prop, use theme |
| `src/components/ProgressIndicator.tsx` | Modify | Use theme colors |
| `src/components/QuitConfirmation.tsx` | Modify/Delete | Migrate to dialog system |
| `src/components/StatusBar.tsx` | Delete | Replaced by Dashboard |
| `src/components/ErrorDisplay.tsx` | Delete | Replaced by DialogError |
| `src/components/index.ts` | Modify | Update exports |
| `src/App.tsx` | Modify | Provider hierarchy, new layout, integrations |
