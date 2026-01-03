# OCLoop Implementation Plan

## Overview

OCLoop is a loop harness that orchestrates opencode to execute tasks from a PLAN.md file iteratively. Each iteration runs in an isolated session, with the opencode TUI embedded and visible throughout. The user can pause, attach/detach from the TUI, and monitor progress.

### Core Value Proposition

- **Automated task execution**: Execute a plan one task at a time, each in a fresh context window
- **Full visibility**: See the opencode TUI at all times, attach to interact when needed
- **Knowledge persistence**: Learnings are documented in AGENTS.md and docs/ across iterations
- **Clean boundaries**: New session per iteration, pause between iterations

---

## Reference Codebases

When in doubt about implementation details, consult these codebases which are available locally:

| Codebase          | Path                               | Purpose                                      |
| ----------------- | ---------------------------------- | -------------------------------------------- |
| OpenCode          | `./reference-repo/opencode`        | Server/client SDK, SSE events, API structure |
| OpenTUI           | `./reference-repo/opentui`         | TUI rendering, Solid.js integration, input handling |
| Ghostty-OpenTUI   | `./reference-repo/ghostty-opentui` | Terminal emulation, PTY rendering patterns   |

Always check these directories to understand:
- How hooks are structured and composed
- How input handling and keybindings work
- How PTY management is done
- How SSE events are consumed
- Component patterns and best practices

---

## Dependencies

| Package           | Purpose                            |
| ----------------- | ---------------------------------- |
| `@opentui/core`   | TUI rendering engine               |
| `@opentui/solid`  | Solid.js reconciler for opentui    |
| `solid-js`        | Reactive UI framework              |
| `ghostty-opentui` | Terminal emulation + PTY rendering |
| `bun-pty`         | PTY spawning and management        |
| `@opencode/sdk`   | OpenCode server/client SDK         |

---

## Project Structure

```
ocloop/
├── src/
│   ├── index.tsx                 # Entry point
│   ├── App.tsx                   # Main application component
│   ├── components/
│   │   ├── StatusBar.tsx         # Top status bar with progress
│   │   ├── TerminalPanel.tsx     # ghostty-terminal wrapper
│   │   ├── ProgressIndicator.tsx # Visual progress bar
│   │   └── QuitConfirmation.tsx  # Quit confirmation modal
│   ├── hooks/
│   │   ├── useServer.ts          # OpenCode server lifecycle
│   │   ├── useSSE.ts             # SSE event subscription
│   │   ├── useLoopState.ts       # Main state machine
│   │   ├── usePlanProgress.ts    # PLAN.md parsing
│   │   └── usePTY.ts             # PTY management
│   ├── lib/
│   │   ├── api.ts                # OpenCode API helpers
│   │   ├── plan-parser.ts        # PLAN.md parser
│   │   └── constants.ts          # Keybindings, colors, etc.
│   └── types.ts                  # TypeScript types
├── package.json
├── tsconfig.json
├── bunfig.toml
└── README.md
```

---

## State Machine

### States

```
┌─────────────────────────────────────────────────────────────┐
│                        STARTING                              │
│                  (server startup, init)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ server ready
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    RUNNING_DETACHED                          │
│         (iteration in progress, OCLoop has input)            │
│                                                              │
│  [Ctrl+\] → RUNNING_ATTACHED                                │
│  [Space]  → PAUSING                                          │
│  [Q]      → STOPPING                                         │
│  session.idle → next iteration or COMPLETE                   │
└─────────────────────────────────────────────────────────────┘
        │                                           ▲
        │ Ctrl+\                                    │ Ctrl+\
        ▼                                           │
┌─────────────────────────────────────────────────────────────┐
│                    RUNNING_ATTACHED                          │
│         (iteration in progress, PTY has input)               │
│                                                              │
│  [Ctrl+\] → RUNNING_DETACHED                                │
│  session.idle → RUNNING_DETACHED (for next iteration)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        PAUSING                               │
│    (waiting for current iteration to complete, then pause)   │
│                                                              │
│  session.idle → PAUSED_DETACHED                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PAUSED_DETACHED                           │
│              (loop paused, OCLoop has input)                 │
│                                                              │
│  [Ctrl+\] → PAUSED_ATTACHED                                 │
│  [Space]  → RUNNING_DETACHED (resume)                        │
│  [Q]      → STOPPING                                         │
└─────────────────────────────────────────────────────────────┘
        │                                           ▲
        │ Ctrl+\                                    │ Ctrl+\
        ▼                                           │
┌─────────────────────────────────────────────────────────────┐
│                    PAUSED_ATTACHED                           │
│              (loop paused, PTY has input)                    │
│                                                              │
│  [Ctrl+\] → PAUSED_DETACHED                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        STOPPING                              │
│              (cleanup, abort if needed)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        STOPPED                               │
│                    (exit process)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        COMPLETE                              │
│              (.PLAN_COMPLETE detected)                       │
└─────────────────────────────────────────────────────────────┘
```

### State Type Definition

```typescript
type LoopState =
  | { type: "starting" }
  | { type: "running"; attached: boolean; iteration: number; sessionId: string }
  | { type: "pausing"; iteration: number; sessionId: string }
  | { type: "paused"; attached: boolean; iteration: number }
  | { type: "stopping" }
  | { type: "stopped" }
  | { type: "complete"; iterations: number }
```

---

## Keybindings

| Key             | Condition     | Action                      |
| --------------- | ------------- | --------------------------- |
| `Ctrl+\`        | Always        | Toggle attach/detach        |
| `Space`         | Detached only | Toggle pause                |
| `Q`             | Detached only | Show quit confirmation modal |
| Everything else | Attached      | Forward to PTY              |

### Implementation Pattern

```typescript
renderer.prependInputHandler((sequence: string): boolean => {
  // Ctrl+\ (0x1c) - always handle
  if (sequence === "\x1c") {
    toggleAttach()
    return true
  }

  // If showing quit confirmation modal
  if (showingQuitConfirmation) {
    if (sequence === "y" || sequence === "Y") {
      quit()
      return true
    }
    if (sequence === "n" || sequence === "N" || sequence === "\x1b") { // n, N, or Escape
      hideQuitConfirmation()
      return true
    }
    return true // consume all other input while modal is shown
  }

  // If attached, forward everything to PTY
  if (state.attached) {
    pty.write(sequence)
    return true
  }

  // Detached - handle our keybindings
  if (sequence === " ") {
    togglePause()
    return true
  }
  if (sequence === "q" || sequence === "Q") {
    showQuitConfirmation()
    return true
  }

  return false // let opentui handle (scrolling, etc.)
})
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [▶ RUNNING] Iter 3 | Plan: [4/12] ██████░░░░ 33%           │
│ [Ctrl+\] Attach  [Space] Pause  [Q] Quit                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────────────────────────────────────┐ │
│   │                                                       │ │
│   │              opencode TUI (ghostty-terminal)          │ │
│   │                                                       │ │
│   │                                                       │ │
│   │                                                       │ │
│   └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visual States

| State              | Status Bar                               | TUI Panel            |
| ------------------ | ---------------------------------------- | -------------------- |
| Running (Detached) | Bright, shows keybindings                | Dimmed (opacity 0.7) |
| Running (Attached) | Dimmed, shows "Ctrl+\ to detach"         | Bright (opacity 1.0) |
| Pausing            | Yellow "PAUSING...", keybindings hidden  | Dimmed               |
| Paused (Detached)  | Yellow "PAUSED", shows resume keybinding | Dimmed               |
| Paused (Attached)  | Yellow "PAUSED", dimmed                  | Bright               |
| Quit Confirmation  | Modal overlay: "Quit OCLoop? [Y/N]"      | Dimmed               |
| Complete           | Green "COMPLETE", shows summary          | Shows final state    |

---

## Data Flow

### Startup Sequence

```
1. Parse command line args (--port, --model, --prompt-file)
2. Check PLAN.md exists
3. Check .loop-prompt.md exists (error if missing)
4. Start opencode server (SDK: createOpencodeServer)
5. Subscribe to SSE events
6. Parse PLAN.md for initial progress
7. Transition to RUNNING_DETACHED
8. Start first iteration
```

### Iteration Sequence

```
1. Check .PLAN_COMPLETE exists → COMPLETE
2. Create new session (API: POST /session)
3. Spawn PTY: opencode attach <url> --session <id>
4. Feed PTY output to ghostty-terminal
5. Send prompt (API: POST /session/:id/prompt_async)
6. Listen for events:
   - message.part.updated → (visual only, PTY shows it)
   - todo.updated → update current task display
   - session.diff → (visual only)
   - session.idle → iteration complete
7. Kill PTY
8. If state is PAUSING → transition to PAUSED_DETACHED
9. Otherwise → start next iteration
```

### SSE Event Handling

```typescript
interface SSEHandlers {
  "session.idle": (e: EventSessionIdle) => {
    if (e.sessionID === currentSessionId) {
      completeIteration()
    }
  }

  "session.status": (e: EventSessionStatus) => {
    updateSessionStatus(e.status)
  }

  "todo.updated": (e: EventTodoUpdated) => {
    if (e.sessionID === currentSessionId) {
      updateCurrentTaskDisplay(e.todos)
    }
  }

  "file.edited": (e: EventFileEdited) => {
    // Could trigger PLAN.md re-parse if needed
    if (e.file.endsWith("PLAN.md")) {
      reParsePlan()
    }
  }
}
```

---

## PLAN.md Parser

### Input Format

```markdown
## Backlog

- [ ] **1.1** Task one description
- [ ] **1.2** Task two description
- [x] **1.3** Completed task
- [MANUAL] **2.1** Manual testing task
- [BLOCKED: reason] **2.2** Blocked task
```

### Output

```typescript
interface PlanProgress {
  total: number // All tasks
  completed: number // [x] tasks
  pending: number // [ ] tasks (non-manual, non-blocked)
  manual: number // [MANUAL] tasks
  blocked: number // [BLOCKED] tasks
  automatable: number // pending (what the loop will do)
  percentComplete: number // completed / (total - manual)
}
```

### Parser Implementation

```typescript
function parsePlan(content: string): PlanProgress {
  const lines = content.split("\n")
  let total = 0,
    completed = 0,
    manual = 0,
    blocked = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]")) {
      total++
      completed++
    } else if (trimmed.startsWith("- [ ]")) {
      total++
    } else if (trimmed.startsWith("- [MANUAL]")) {
      total++
      manual++
    } else if (trimmed.match(/^- \[BLOCKED/i)) {
      total++
      blocked++
    }
  }

  const pending = total - completed - manual - blocked
  const automatable = pending
  const denominator = total - manual
  const percentComplete = denominator > 0 ? Math.round((completed / denominator) * 100) : 100

  return { total, completed, pending, manual, blocked, automatable, percentComplete }
}
```

---

## PTY Management

### Spawning

```typescript
import { spawn, type IPty } from "bun-pty"

function spawnOpencodePTY(serverUrl: string, sessionId: string, cols: number, rows: number): IPty {
  return spawn("opencode", ["attach", serverUrl, "--session", sessionId], {
    name: "xterm-256color",
    cols,
    rows,
    cwd: process.cwd(),
  })
}
```

### Lifecycle

```typescript
interface PTYManager {
  pty: IPty | null
  terminalRef: React.RefObject<GhosttyTerminalRenderable>

  spawn(sessionId: string): void
  kill(): void
  write(data: string): void
  resize(cols: number, rows: number): void
}
```

### Data Flow

```
PTY stdout → pty.onData() → terminalRef.current.feed(data) → ghostty-terminal renders
```

---

## Prompt Configuration

### Loop Prompt File

The loop prompt is read from `.loop-prompt.md` in the project directory. This file is **required** - OCLoop will exit with an error if not found.

Default locations:
- **Prompt file**: `.loop-prompt.md`
- **Plan file**: `PLAN.md`

---

## Component Specifications

### StatusBar.tsx

```typescript
interface StatusBarProps {
  state: LoopState
  planProgress: PlanProgress
  currentTask?: string
}

// Displays:
// - State indicator (▶ RUNNING, ⏸ PAUSED, ✓ COMPLETE)
// - Iteration number
// - Plan progress (e.g., [4/12] with progress bar)
// - Current task description (truncated)
// - Keybinding hints (context-sensitive)
```

### TerminalPanel.tsx

```typescript
interface TerminalPanelProps {
  terminalRef: React.RefObject<GhosttyTerminalRenderable>
  cols: number
  rows: number
  dimmed: boolean
}

// Wraps ghostty-terminal with:
// - Border styling
// - Opacity based on dimmed state
// - Resize handling
```

### QuitConfirmation.tsx

```typescript
interface QuitConfirmationProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Renders centered modal overlay:
// ┌─────────────────────────┐
// │   Quit OCLoop? [Y/N]    │
// └─────────────────────────┘
// 
// Keys handled by parent input handler, not component
```

### ProgressIndicator.tsx

```typescript
interface ProgressIndicatorProps {
  completed: number
  total: number
  width: number
}

// Renders: ██████░░░░ 60%
```

---

## Hooks Specifications

### useServer.ts

```typescript
interface UseServerReturn {
  url: string | null
  port: number | null // The actual port used by the server
  status: "starting" | "ready" | "error" | "stopped"
  error?: Error
  stop: () => Promise<void>
}

// Port handling is done by opencode natively:
// - If port is 0 or omitted: opencode tries 4096 first, then random OS-assigned port
// - If port is specified: opencode uses exactly that port
function useServer(port?: number): UseServerReturn
```

**SDK Port Retrieval**: The `createOpencodeServer()` function from `@opencode-ai/sdk` returns the actual URL (including port) after the server starts:

```typescript
import { createOpencodeServer } from "@opencode-ai/sdk"

const server = await createOpencodeServer() // or { port: 0 } to force random
console.log(server.url) // e.g., "http://127.0.0.1:4096" or "http://127.0.0.1:54321"

// To extract the port:
const port = new URL(server.url).port
```

The SDK works by:
1. Spawning `opencode serve --hostname=... --port=...`
2. Parsing stdout for the line: `opencode server listening on http://hostname:port`
3. Returning the URL from that output

This means even with `port: 0`, OCLoop can discover the actual assigned port.

### useSSE.ts

```typescript
interface UseSSEOptions {
  url: string
  onEvent: (event: Event) => void
  onError?: (error: Error) => void
}

function useSSE(options: UseSSEOptions): {
  connected: boolean
  reconnect: () => void
}
```

### useLoopState.ts

```typescript
interface UseLoopStateReturn {
  state: LoopState
  dispatch: (action: LoopAction) => void

  // Derived state
  isAttached: boolean
  isRunning: boolean
  isPaused: boolean
  canPause: boolean
  canQuit: boolean
  
  // Quit confirmation modal
  showingQuitConfirmation: boolean
  showQuitConfirmation: () => void
  hideQuitConfirmation: () => void
}

type LoopAction =
  | { type: "server_ready" }
  | { type: "toggle_attach" }
  | { type: "toggle_pause" }
  | { type: "quit" }
  | { type: "session_idle" }
  | { type: "iteration_started"; sessionId: string }
  | { type: "plan_complete" }
```

### usePlanProgress.ts

```typescript
interface UsePlanProgressReturn {
  progress: PlanProgress | null
  loading: boolean
  error?: Error
  refresh: () => Promise<void>
}

function usePlanProgress(planPath?: string): UsePlanProgressReturn
```

### usePTY.ts

```typescript
interface UsePTYReturn {
  pty: IPty | null
  spawn: (sessionId: string) => void
  kill: () => void
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
}

function usePTY(
  serverUrl: string,
  terminalRef: RefObject<GhosttyTerminalRenderable>,
  cols: number,
  rows: number,
): UsePTYReturn
```

---

## API Helpers (lib/api.ts)

```typescript
import { createOpencodeClient } from "@opencode/sdk"

export function createClient(url: string) {
  return createOpencodeClient({ baseUrl: url })
}

export async function createSession(client: OpencodeClient): Promise<Session> {
  const result = await client.session.create()
  return result.data
}

export async function sendPromptAsync(client: OpencodeClient, sessionId: string, prompt: string): Promise<void> {
  await client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: prompt }],
    },
  })
}

export async function abortSession(client: OpencodeClient, sessionId: string): Promise<void> {
  await client.session.abort({ path: { id: sessionId } })
}
```

---

## Entry Point (index.tsx)

```typescript
#!/usr/bin/env bun

import { render } from "@opentui/solid"
import { extend } from "@opentui/solid"
import { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"
import { App } from "./App"

// Register ghostty-terminal component
extend({ "ghostty-terminal": GhosttyTerminalRenderable })

// Parse args
const args = parseArgs(process.argv.slice(2))

// Validate prerequisites
await validatePrerequisites()

// Render
render(() => <App {...args} />, {
  targetFps: 60,
  exitOnCtrlC: false,
  useMouse: true,
})
```

---

## CLI Interface

```
Usage: ocloop [options]

Options:
  -p, --port <number>      Server port (opencode defaults: try 4096, then random)
  -m, --model <string>     Model to use (passed to opencode)
  --prompt <path>          Path to loop prompt file (default: .loop-prompt.md)
  --plan <path>            Path to plan file (default: PLAN.md)
  -h, --help               Show help

Examples:
  ocloop                           # Start with defaults
  ocloop -m claude-sonnet-4        # Use specific model
  ocloop --plan my-plan.md         # Use custom plan file
```

---

## Implementation Phases

### Phase 1: Foundation

- [x] **1.1** Initialize project structure
  - Create `ocloop/` directory
  - Set up `package.json` with dependencies
  - Configure `tsconfig.json` for Solid.js + opentui
  - Configure `bunfig.toml` with preload

- [ ] **1.2** Implement PLAN.md parser
  - File: `src/lib/plan-parser.ts`
  - Parse checkboxes, [MANUAL], [BLOCKED] items
  - Return PlanProgress object
  - Add tests

- [ ] **1.3** Implement server management hook
  - File: `src/hooks/useServer.ts`
  - Use `createOpencodeServer` from SDK
  - Handle startup, ready, error states
  - Cleanup on unmount

### Phase 2: Core Loop Logic

- [ ] **2.1** Implement state machine hook
  - File: `src/hooks/useLoopState.ts`
  - Define all states and transitions
  - Handle iteration counting
  - Expose derived state helpers

- [ ] **2.2** Implement SSE subscription hook
  - File: `src/hooks/useSSE.ts`
  - Connect to `/event` endpoint
  - Parse SSE events
  - Handle reconnection
  - Filter events by current session

- [ ] **2.3** Implement PTY management hook
  - File: `src/hooks/usePTY.ts`
  - Spawn `opencode attach` in PTY
  - Feed output to ghostty-terminal ref
  - Handle kill and resize
  - Cleanup on unmount

### Phase 3: UI Components

- [ ] **3.1** Implement StatusBar component
  - File: `src/components/StatusBar.tsx`
  - Display state, iteration, progress
  - Context-sensitive keybinding hints
  - Truncated current task display

- [ ] **3.2** Implement ProgressIndicator component
  - File: `src/components/ProgressIndicator.tsx`
  - Render progress bar with percentage
  - Configurable width and colors

- [ ] **3.3** Implement TerminalPanel component
  - File: `src/components/TerminalPanel.tsx`
  - Wrap ghostty-terminal
  - Apply dimming based on attach state
  - Handle resize events

- [ ] **3.4** Implement QuitConfirmation component
  - File: `src/components/QuitConfirmation.tsx`
  - Modal overlay with "Quit OCLoop? [Y/N]" prompt
  - Centered on screen
  - Handles Y/N/Escape keys

### Phase 4: Main Application

- [ ] **4.1** Implement main App component
  - File: `src/App.tsx`
  - Compose all hooks and components
  - Set up input handler for keybindings
  - Manage iteration lifecycle

- [ ] **4.2** Implement entry point
  - File: `src/index.tsx`
  - Parse CLI arguments
  - Validate prerequisites (PLAN.md exists, etc.)
  - Register ghostty-terminal component
  - Render App

- [ ] **4.3** Implement API helpers
  - File: `src/lib/api.ts`
  - Wrap SDK client creation
  - Session creation helper
  - Prompt sending helper
  - Abort helper

### Phase 5: Polish and Edge Cases

- [ ] **5.1** Handle .PLAN_COMPLETE detection
  - Check before each iteration
  - Parse remaining MANUAL/BLOCKED tasks
  - Display completion summary

- [ ] **5.2** Handle prompt file loading
  - Check for `.loop-prompt.md` (error if missing)
  - Support `--prompt` CLI flag for custom path

- [ ] **5.3** Handle terminal resize
  - Resize PTY when terminal size changes
  - Recalculate layout dimensions
  - Update ghostty-terminal cols/rows

- [ ] **5.4** Handle error states
  - Server startup failure
  - SSE connection loss
  - PTY crash
  - API errors

- [ ] **5.5** Add graceful shutdown
  - Abort current session if running
  - Kill PTY
  - Stop server
  - Exit cleanly

### Phase 6: Documentation and Packaging

- [ ] **6.1** Write README.md
  - Installation instructions
  - Usage examples
  - Configuration options
  - Troubleshooting

- [ ] **6.2** Create example files
  - Example PLAN.md
  - Example .loop-prompt.md

- [ ] **6.3** Set up npm publishing
  - Configure package.json for publishing
  - Add bin entry for CLI
  - Test global installation

---

## Testing Strategy

### Unit Tests

- PLAN.md parser
- State machine transitions
- Progress calculations

### Integration Tests

- Server startup/shutdown
- SSE event handling
- PTY spawn/kill lifecycle

### Manual Testing

- [ ] Start OCLoop with a simple 3-task plan
- [ ] Verify iterations progress automatically
- [ ] Test pause/resume with Space
- [ ] Test attach/detach with Ctrl+\
- [ ] Verify keybindings work in both modes
- [ ] Test quit with Q
- [ ] Verify .PLAN_COMPLETE stops the loop
- [ ] Test with [MANUAL] and [BLOCKED] tasks
- [ ] Verify progress bar accuracy
- [ ] Test terminal resize handling

---

## Configuration Files

### package.json

```json
{
  "name": "ocloop",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "ocloop": "./dist/index.js"
  },
  "scripts": {
    "dev": "bun run src/index.tsx",
    "build": "bun build src/index.tsx --outdir dist --target bun",
    "test": "bun test"
  },
  "dependencies": {
    "@opentui/core": "latest",
    "@opentui/solid": "latest",
    "solid-js": "^1.8.0",
    "ghostty-opentui": "latest",
    "bun-pty": "latest",
    "@opencode/sdk": "latest"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

### bunfig.toml

```toml
preload = ["@opentui/solid/preload"]
```

---

## Success Criteria

1. **Functional loop**: OCLoop successfully executes tasks from PLAN.md iteratively
2. **Visual feedback**: User can see opencode TUI at all times
3. **Control**: User can pause, attach, detach, and quit at appropriate times
4. **Progress tracking**: Status bar shows accurate iteration and plan progress
5. **Clean completion**: Loop exits when .PLAN_COMPLETE is created
6. **Knowledge persistence**: AGENTS.md and docs/ are updated across iterations
7. **Session history**: All sessions are preserved for debugging

---

## Future Enhancements (Post-v1)

1. **Session switching without PTY restart**: Contribute API to opencode
2. **Split view**: Show multiple past sessions side-by-side
3. **Cost tracking**: Display cumulative token usage and cost
4. **Time tracking**: Show elapsed time per iteration and total
5. **Retry failed iterations**: Automatic retry with backoff
6. **Custom keybindings**: Configurable via config file
7. **Notification on completion**: Desktop notification when loop finishes
8. **Remote server support**: Connect to opencode server on another machine
