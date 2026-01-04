#!/usr/bin/env bun

import { render, extend } from "@opentui/solid"
import { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"
import { App } from "./App"
import { DEFAULTS } from "./lib/constants"
import type { CLIArgs } from "./types"

// Register ghostty-terminal component
declare module "@opentui/solid" {
  interface OpenTUIComponents {
    "ghostty-terminal": typeof GhosttyTerminalRenderable
  }
}

extend({ "ghostty-terminal": GhosttyTerminalRenderable })

/**
 * Display help message and exit
 */
function showHelp(): void {
  console.log(`
Usage: ocloop [options]

OCLoop is a loop harness that orchestrates opencode to execute tasks from a
PLAN.md file iteratively. Each iteration runs in an isolated session, with
the opencode TUI embedded and visible throughout.

Options:
  -p, --port <number>      Server port (opencode defaults: try 4096, then random)
  -m, --model <string>     Model to use (passed to opencode)
  -r, --run                Start iterations immediately (default: wait for [S])
  -d, --debug              Debug/sandbox mode (no plan file validation, manual sessions)
  --prompt <path>          Path to loop prompt file (default: ${DEFAULTS.PROMPT_FILE})
  --plan <path>            Path to plan file (default: ${DEFAULTS.PLAN_FILE})
  -h, --help               Show help

Examples:
  ocloop                           # Start, wait for [S] to begin
  ocloop -r                        # Start iterations immediately
  ocloop -m claude-sonnet-4        # Use specific model
  ocloop --plan my-plan.md         # Use custom plan file
`)
  process.exit(0)
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    promptFile: DEFAULTS.PROMPT_FILE,
    planFile: DEFAULTS.PLAN_FILE,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    switch (arg) {
      case "-h":
      case "--help":
        showHelp()
        break

      case "-p":
      case "--port":
        const portStr = argv[++i]
        if (!portStr || isNaN(parseInt(portStr, 10))) {
          console.error("Error: --port requires a numeric argument")
          process.exit(1)
        }
        args.port = parseInt(portStr, 10)
        break

      case "-m":
      case "--model":
        const model = argv[++i]
        if (!model) {
          console.error("Error: --model requires an argument")
          process.exit(1)
        }
        args.model = model
        break

      case "--prompt":
        const promptPath = argv[++i]
        if (!promptPath) {
          console.error("Error: --prompt requires a file path argument")
          process.exit(1)
        }
        args.promptFile = promptPath
        break

      case "--plan":
        const planPath = argv[++i]
        if (!planPath) {
          console.error("Error: --plan requires a file path argument")
          process.exit(1)
        }
        args.planFile = planPath
        break

      case "-r":
      case "--run":
        args.run = true
        break

      case "-d":
      case "--debug":
        args.debug = true
        break

      default:
        // Unknown argument - ignore for now (could warn)
        break
    }
  }

  return args
}

/**
 * Validate that required files exist before starting
 */
async function validatePrerequisites(args: CLIArgs): Promise<void> {
  // Skip validation in debug mode
  if (args.debug) {
    return
  }

  // Check PLAN.md exists
  const planFile = Bun.file(args.planFile)
  const planExists = await planFile.exists()
  if (!planExists) {
    console.error(`Error: Plan file not found: ${args.planFile}`)
    console.error("")
    console.error("OCLoop requires a PLAN.md file with tasks to execute.")
    console.error("Create a PLAN.md file with a task list, for example:")
    console.error("")
    console.error("  ## Backlog")
    console.error("  - [ ] Task one description")
    console.error("  - [ ] Task two description")
    console.error("")
    process.exit(1)
  }

  // Check loop prompt file exists
  const promptFile = Bun.file(args.promptFile)
  const promptExists = await promptFile.exists()
  if (!promptExists) {
    console.error(`Error: Prompt file not found: ${args.promptFile}`)
    console.error("")
    console.error(`OCLoop requires a prompt file (default: ${DEFAULTS.PROMPT_FILE}).`)
    console.error("This file contains the prompt sent to opencode for each iteration.")
    console.error("")
    console.error("Create a prompt file with instructions for executing plan tasks.")
    console.error("")
    process.exit(1)
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const args = parseArgs(process.argv.slice(2))

  // Validate prerequisites before rendering
  await validatePrerequisites(args)

  // Render the application
  // The render function returns when the app exits
  await render(() => <App {...args} />, {
    targetFps: 60,
    exitOnCtrlC: false, // We handle Ctrl+C ourselves
    useMouse: true,
  })
}

// Run main and handle errors
main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
