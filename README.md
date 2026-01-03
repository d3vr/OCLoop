# OCLoop

A loop harness that orchestrates [OpenCode](https://opencode.ai) to execute tasks from a PLAN.md file iteratively. Each iteration runs in an isolated session, with the OpenCode TUI embedded and visible throughout.

## Features

- **Automated task execution**: Execute a plan one task at a time, each in a fresh context window
- **Full visibility**: See the OpenCode TUI at all times, attach to interact when needed
- **Knowledge persistence**: Learnings are documented in AGENTS.md and docs/ across iterations
- **Clean boundaries**: New session per iteration, pause between iterations
- **Progress tracking**: Visual progress bar and status indicators

## Requirements

- [Bun](https://bun.sh) runtime (v1.0 or later)
- [OpenCode](https://opencode.ai) installed and configured

## Installation

```bash
# Clone the repository
git clone https://github.com/d3vr/ocloop.git
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

1. **Create a plan file** (`PLAN.md`) and **loop prompt file** (`.loop-prompt.md`):

```bash
cp examples/PLAN.md ./PLAN.md
cp examples/loop-prompt.md ./.loop-prompt.md  # Note the leading dot
```

See `examples/CREATE_PLAN.md` for a prompt to help generate plans for your project.

2. **Run OCLoop**:

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
- `CREATE_PLAN.md` - Prompt to help generate a plan for your project

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

- Ensure OpenCode is properly installed and available in your PATH
- Check OpenCode logs for errors (usually in `.opencode/` directory)
- Verify your API keys are configured correctly

### Loop seems stuck

- Press `Ctrl+\` to attach and see what OpenCode is doing
- Check if OpenCode is waiting for input or confirmation
- You can interact directly while attached

## License

MIT
