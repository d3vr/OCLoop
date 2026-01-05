# Plan: Toast Notifications + Terminal Launch Fix

## Overview

**Problem:** The `Ctrl+\` keybinding to launch an external terminal silently fails in certain states:

1. **Paused state** - The `sessionId()` memo returns `undefined` because the `"paused"` state type doesn't have a `sessionId` field
2. **Between iterations** - When running but `sessionId` is empty string (waiting for next iteration)
3. **Debug mode after idle** - Session ID gets cleared when session becomes idle

**Solution:**

1. **Track last active session ID** - Store the most recent session ID in a separate signal that persists through state transitions
2. **Add Toast notification system** - Following opencode's TUI pattern, provide user feedback when actions can't be performed
3. **Show info toast** - When `Ctrl+\` is pressed with no session available, display "No active session to attach to"

---

## Backlog

### Phase 1: Create Toast Context and Component

- [x] Create `src/context/ToastContext.tsx` - Toast notification system
  - `ToastVariant` type: `"info" | "success" | "warning" | "error"`
  - `ToastOptions` interface: `{ title?: string, message: string, variant: ToastVariant, duration?: number }`
  - `ToastContextValue` interface: `{ show: (opts) => void, error: (err) => void, currentToast: ToastOptions | null }`
  - `init()` function using `createStore` pattern (like opencode TUI)
    - Manages `currentToast` state
    - Auto-dismiss via `setTimeout` with configurable duration (default 5000ms)
    - `show(options)` - displays toast, resets timeout
    - `error(err)` - helper that extracts error message and shows error variant
  - `ToastProvider` component - wraps children with context
  - `useToast()` hook - access toast methods
  - `Toast` component - absolute positioned UI element
    - Position: `top={2}`, `right={2}` (top-right corner)
    - Max width: `Math.min(50, terminalWidth - 6)`
    - Border color based on variant using theme colors (`theme.info`, `theme.success`, `theme.warning`, `theme.error`)
    - Shows title (bold) if provided, message below
    - Only renders when `currentToast` is not null

### Phase 2: Track Last Active Session ID

- [x] Update `src/App.tsx` - Add session tracking signal
  - Add `lastSessionId` signal: `const [lastSessionId, setLastSessionId] = createSignal<string | undefined>(undefined)`
  - Update in `onSessionCreated` SSE handler: `setLastSessionId(id)`
  - Update in `createDebugSession()` after successful creation: `setLastSessionId(newSessionId)`
  - Keep existing `sessionId()` memo unchanged (used for SSE filtering)

### Phase 3: Update Terminal Launch to Use Toast

- [x] Update `src/App.tsx` - Integrate toast into terminal launch flow
  - Import `ToastProvider`, `Toast`, `useToast` from `./context/ToastContext`
  - Move `useToast()` call inside `AppContent` component (after providers are set up)
  - Update `Ctrl+\` handler in `inputHandler`:
    - Use `lastSessionId()` instead of `sessionId()`
    - If no session: call `toast.show({ variant: "info", message: "No active session to attach to" })`
    - If session exists: proceed with `handleTerminalLaunch(sid)`
  - Update `handleTerminalLaunch()` to use passed `sid` parameter (already does)
  - Add toast feedback for clipboard copy: `toast.show({ variant: "success", message: "Copied to clipboard" })`

### Phase 4: Wire Toast Provider into App

- [x] Update `src/App.tsx` - Add ToastProvider to component tree
  - Wrap `AppContent` with `<ToastProvider>` (inside DialogProvider)
  - Add `<Toast />` component after `<DialogStack />` in the App component
  - Provider hierarchy: `ThemeProvider > DialogProvider > ToastProvider > AppContent`

### Phase 5: Verification

- [x] Run build and verify no errors: `bun run build`
- [ ] [MANUAL] Test toast notification flow:
  - Start ocloop in debug mode: `bun run dev -- -d`
  - Before creating a session, press `Ctrl+\` - should show "No active session" toast
  - Press `N` to create session, then `Ctrl+\` - should show terminal config or launch terminal
  - Let session go idle, press `Ctrl+\` again - should still work (uses lastSessionId)
- [ ] [MANUAL] Test paused state terminal launch:
  - Start ocloop normally with a plan file
  - Press `S` to start, let it run
  - Press `Space` to pause
  - Press `Ctrl+\` - should launch terminal (uses lastSessionId from before pause)

---

## Testing Notes

### Manual Testing Steps

1. **Toast appearance:**
   ```bash
   bun run dev -- -d
   # Press Ctrl+\ before creating any session
   # Verify toast appears in top-right with "No active session to attach to"
   # Verify toast auto-dismisses after ~5 seconds
   ```

2. **Terminal launch from paused state:**
   ```bash
   # Create .loop-prompt.md and PLAN.md with a simple task
   bun run dev
   # Press S to start
   # Wait for first iteration to begin (session ID visible)
   # Press Space to pause
   # Press Ctrl+\ - should launch terminal or show config dialog
   ```

3. **Clipboard feedback:**
   ```bash
   bun run dev -- -d
   # Press N to create session
   # Press Ctrl+\ to show config dialog
   # Press C to copy command
   # Verify "Copied to clipboard" toast appears
   ```

### Build Verification

```bash
bun run build
bun run test  # If tests exist
```

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `src/context/ToastContext.tsx` | Toast provider, hook, and UI component |
| Modify | `src/App.tsx` | Add `lastSessionId` signal, integrate toast, update Ctrl+\ handler |
