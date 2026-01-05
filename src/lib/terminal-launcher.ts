/**
 * Terminal detection and launching utilities for OCLoop
 *
 * Handles detecting installed terminal emulators and launching them
 * with the opencode attach command.
 */

import type { TerminalConfig } from "./config"
import { log } from "./debug-logger"

/**
 * A known terminal emulator with its launch configuration
 */
export interface KnownTerminal {
  name: string
  command: string
  args: string[] // Args to pass when executing a command, {cmd} is replaced
}

/**
 * Result of a terminal launch attempt
 */
export interface LaunchResult {
  success: boolean
  error?: string
}

/**
 * List of known terminal emulators with their configurations.
 * The args array uses {cmd} as a placeholder for the command to execute.
 */
export const KNOWN_TERMINALS: KnownTerminal[] = [
  { name: "alacritty", command: "alacritty", args: ["-e", "{cmd}"] },
  { name: "kitty", command: "kitty", args: ["{cmd}"] },
  { name: "wezterm", command: "wezterm", args: ["start", "--", "{cmd}"] },
  {
    name: "gnome-terminal",
    command: "gnome-terminal",
    args: ["--", "{cmd}"],
  },
  { name: "konsole", command: "konsole", args: ["-e", "{cmd}"] },
  {
    name: "xfce4-terminal",
    command: "xfce4-terminal",
    args: ["-e", "{cmd}"],
  },
  { name: "foot", command: "foot", args: ["{cmd}"] },
  { name: "tilix", command: "tilix", args: ["-e", "{cmd}"] },
  { name: "terminator", command: "terminator", args: ["-e", "{cmd}"] },
  { name: "xterm", command: "xterm", args: ["-e", "{cmd}"] },
  { name: "urxvt", command: "urxvt", args: ["-e", "{cmd}"] },
  {
    name: "x-terminal-emulator",
    command: "x-terminal-emulator",
    args: ["-e", "{cmd}"],
  },
]

/**
 * Get the full list of known terminals
 */
export function getKnownTerminals(): KnownTerminal[] {
  return KNOWN_TERMINALS
}

/**
 * Lookup a known terminal by name
 */
export function getKnownTerminalByName(name: string): KnownTerminal | undefined {
  return KNOWN_TERMINALS.find((t) => t.name === name)
}

/**
 * Check if a command exists on the system using `which`
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", command], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const exitCode = await proc.exited
    return exitCode === 0
  } catch {
    return false
  }
}

/**
 * Detect which known terminals are installed on the system.
 * Checks each terminal's command using `which`.
 */
export async function detectInstalledTerminals(): Promise<KnownTerminal[]> {
  const results = await Promise.all(
    KNOWN_TERMINALS.map(async (terminal) => ({
      terminal,
      exists: await commandExists(terminal.command),
    })),
  )

  const installed = results.filter((r) => r.exists).map((r) => r.terminal)
  log.info("terminal", "Detected installed terminals", { 
    count: installed.length, 
    names: installed.map(t => t.name) 
  })
  
  return installed
}

/**
 * Generate the opencode attach command for a session
 */
export function getAttachCommand(url: string, sessionId: string): string {
  return `opencode attach ${url} --session ${sessionId}`
}

/**
 * Build the argument list for launching a terminal with a command.
 * Replaces {cmd} placeholder with the actual command parts.
 */
function buildArgs(argsPattern: string[], attachCmd: string): string[] {
  // Split the attach command into parts for proper shell handling
  const cmdParts = attachCmd.split(" ")

  return argsPattern.flatMap((arg) => {
    if (arg === "{cmd}") {
      // Replace placeholder with command parts
      return cmdParts
    }
    // Keep other args as-is
    return [arg]
  })
}

/**
 * Launch a terminal with the attach command.
 * The terminal is spawned as a detached process.
 */
export async function launchTerminal(
  config: TerminalConfig,
  attachCmd: string,
): Promise<LaunchResult> {
  try {
    let command: string
    let args: string[]

    if (config.type === "known") {
      const terminal = getKnownTerminalByName(config.name)
      if (!terminal) {
        return {
          success: false,
          error: `Unknown terminal: ${config.name}`,
        }
      }
      command = terminal.command
      args = buildArgs(terminal.args, attachCmd)
    } else {
      // Custom terminal
      command = config.command

      // Parse the args pattern, replacing {cmd}
      const argsPattern = config.args.split(/\s+/).filter((a) => a.length > 0)
      args = buildArgs(argsPattern, attachCmd)
    }

    // Verify the command exists
    const exists = await commandExists(command)
    if (!exists) {
      log.warn("terminal", "Command not found", { command })
      return {
        success: false,
        error: `Terminal command not found: ${command}`,
      }
    }

    log.info("terminal", "Spawning terminal", { command, args })

    // Spawn the terminal as a detached process
    // Using 'inherit' for stdio so the terminal can run independently
    const proc = Bun.spawn([command, ...args], {
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    })

    // Unref the process so it doesn't keep the parent alive
    proc.unref()
    
    log.info("terminal", "Terminal spawned successfully")

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error("terminal", "Failed to launch terminal", error)
    return {
      success: false,
      error,
    }
  }
}
