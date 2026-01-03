# OCLoop

A loop harness that orchestrates [OpenCode](https://github.com/opencode-ai/opencode) to execute tasks from a PLAN.md file iteratively. Each iteration runs in an isolated session, with the OpenCode TUI embedded and visible throughout.

## Features

- **Automated task execution**: Execute a plan one task at a time, each in a fresh context window
- **Full visibility**: See the OpenCode TUI at all times, attach to interact when needed
- **Knowledge persistence**: Learnings are documented in AGENTS.md and docs/ across iterations
- **Clean boundaries**: New session per iteration, pause between iterations
- **Progress tracking**: Visual progress bar and status indicators

## Requirements

- [Bun](https://bun.sh) runtime (v1.0 or later)
- [OpenCode](https://github.com/opencode-ai/opencode) installed and configured

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ocloop.git
cd ocloop

# Install dependencies
bun install

# Build the project
bun run build
```

### Global Installation

```bash
# After building, link globally
bun link

# Now you can run from anywhere
ocloop
```

## Quick Start

1. **Create a plan file** (`PLAN.md`):

```markdown
## Backlog

- [ ] **1.1** Initialize the database schema
- [ ] **1.2** Create user authentication endpoints
- [ ] **1.3** Add input validation
- [MANUAL] **2.1** Deploy to staging environment
```

2. **Create a loop prompt file** (`.loop-prompt.md`):

```markdown
Execute the next task from PLAN.md.

Before starting:
1. Read PLAN.md fully
2. Identify the next uncompleted task ([ ])

Execute:
1. Make the code changes
2. Run relevant tests
3. Commit with a descriptive message

After completion:
1. Update PLAN.md marking completed items with [x]
2. If all tasks are complete, create .PLAN_COMPLETE
```

3. **Run OCLoop**:

```bash
ocloop
```

## Usage

```
Usage: ocloop [options]

Options:
  -p, --port <number>      Server port (default: 4096, falls back to random)
  -m, --model <string>     Model to use (passed to opencode)
  --prompt <path>          Path to loop prompt file (default: .loop-prompt.md)
  --plan <path>            Path to plan file (default: PLAN.md)
  -h, --help               Show help

Examples:
  ocloop                           # Start with defaults
  ocloop -m claude-sonnet-4        # Use specific model
  ocloop --plan my-plan.md         # Use custom plan file
```

## Keybindings

| Key       | Condition     | Action                       |
| --------- | ------------- | ---------------------------- |
| `Ctrl+\`  | Always        | Toggle attach/detach         |
| `Space`   | Detached only | Toggle pause/resume          |
| `Q`       | Detached only | Show quit confirmation       |
| `R`       | Error state   | Retry after recoverable error|

### Attach/Detach Mode

- **Detached** (default): OCLoop controls input. You can pause, quit, and observe.
- **Attached**: Input goes directly to the OpenCode TUI. Use this to interact with OpenCode mid-iteration.

Press `Ctrl+\` to toggle between modes.

## Plan File Format

OCLoop parses your PLAN.md to track progress. Supported task formats:

```markdown
- [ ] Pending task (will be executed)
- [x] Completed task
- [MANUAL] Task requiring human intervention (skipped)
- [BLOCKED: reason] Task that cannot proceed (skipped)
```

### Task Naming Convention

Using bold task IDs helps with organization:

```markdown
- [ ] **1.1** First task in phase 1
- [ ] **1.2** Second task in phase 1
- [ ] **2.1** First task in phase 2
```

## Loop Lifecycle

1. OCLoop starts the OpenCode server
2. Creates a new session for each iteration
3. Sends your loop prompt to the session
4. Waits for the session to become idle (task complete)
5. Checks for `.PLAN_COMPLETE` file
6. If not complete, starts the next iteration

### Completion

The loop ends when:
- OpenCode creates a `.PLAN_COMPLETE` file (indicating all automatable tasks are done)
- You quit manually with `Q`
- An unrecoverable error occurs

## Visual States

| State              | Indicator                    | Description                    |
| ------------------ | ---------------------------- | ------------------------------ |
| Starting           | Spinner                      | Server starting up             |
| Running (Detached) | Green `RUNNING`              | Iteration in progress          |
| Running (Attached) | Green `RUNNING` + `ATTACHED` | You're interacting with TUI    |
| Pausing            | Yellow `PAUSING...`          | Waiting for iteration to end   |
| Paused             | Yellow `PAUSED`              | Loop paused between iterations |
| Complete           | Cyan `COMPLETE`              | All tasks finished             |
| Error              | Red `ERROR`                  | Something went wrong           |

## Configuration

### Environment Variables

OCLoop respects OpenCode's environment variables for API keys and configuration. See [OpenCode documentation](https://opencode.ai/docs) for details.

### Files

| File              | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `PLAN.md`         | Task list to execute                             |
| `.loop-prompt.md` | Prompt sent to OpenCode each iteration           |
| `.PLAN_COMPLETE`  | Created when all automatable tasks are complete  |
| `AGENTS.md`       | Persistent knowledge for OpenCode across sessions|

## Examples

The `examples/` directory contains starter templates:

- `PLAN.md` - Example task plan demonstrating all supported markers (`[ ]`, `[x]`, `[MANUAL]`, `[BLOCKED]`)
- `loop-prompt.md` - Example loop prompt with best practices for knowledge persistence

To use them:

```bash
cp examples/PLAN.md ./PLAN.md
cp examples/loop-prompt.md ./.loop-prompt.md  # Note the leading dot
```

## Development

```bash
# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## Troubleshooting

### "Error: Prompt file not found"

Create a `.loop-prompt.md` file with instructions for executing plan tasks. See Quick Start above.

### "Error: Plan file not found"

Create a `PLAN.md` file with tasks. At minimum:

```markdown
## Backlog
- [ ] Your first task
```

### Server fails to start

- Check if port 4096 is already in use
- Try specifying a different port: `ocloop -p 5000`
- Ensure OpenCode is properly installed

### Loop seems stuck

- Press `Ctrl+\` to attach and see what OpenCode is doing
- Check if OpenCode is waiting for input or confirmation
- You can interact directly while attached

## License

MIT
