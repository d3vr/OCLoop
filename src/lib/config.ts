/**
 * Configuration file management for OCLoop
 *
 * Handles loading, saving, and validating configuration from
 * ~/.config/ocloop/ocloop.json (or XDG_CONFIG_HOME equivalent).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { log } from "./debug-logger"

/**
 * Terminal configuration for a known terminal emulator
 */
export interface KnownTerminalConfig {
  type: "known"
  name: string // Name of the known terminal (e.g., "alacritty", "kitty")
}

/**
 * Terminal configuration for a custom terminal emulator
 */
export interface CustomTerminalConfig {
  type: "custom"
  command: string // The command to run (e.g., "my-terminal")
  args: string // Args pattern with {cmd} placeholder (e.g., "-e {cmd}")
}

/**
 * Terminal configuration union type
 */
export type TerminalConfig = KnownTerminalConfig | CustomTerminalConfig

/**
 * OCLoop configuration file structure
 */
export interface OcloopConfig {
  terminal?: TerminalConfig
}

/**
 * Get the configuration directory path.
 * Uses $XDG_CONFIG_HOME/ocloop if set, otherwise ~/.config/ocloop
 */
export function getConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME
  if (xdgConfigHome) {
    return join(xdgConfigHome, "ocloop")
  }
  return join(homedir(), ".config", "ocloop")
}

/**
 * Get the full path to the configuration file.
 */
export function getConfigPath(): string {
  return join(getConfigDir(), "ocloop.json")
}

/**
 * Load and parse the configuration file.
 * Returns an empty config object if the file doesn't exist.
 */
export function loadConfig(): OcloopConfig {
  const configPath = getConfigPath()

  if (!existsSync(configPath)) {
    log.debug("config", "No config file found, using default")
    return {}
  }

  try {
    const content = readFileSync(configPath, "utf-8")
    const config = JSON.parse(content) as OcloopConfig
    log.info("config", "Loaded config", config)
    return config
  } catch (err) {
    // If parsing fails, return empty config
    log.warn("config", "Failed to load config, using default", err)
    return {}
  }
}

/**
 * Save the configuration to disk.
 * Creates the config directory if it doesn't exist.
 */
export function saveConfig(config: OcloopConfig): void {
  const configDir = getConfigDir()
  const configPath = getConfigPath()

  // Create directory if needed
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8")
  log.info("config", "Saved config", config)
}

/**
 * Type guard to check if the config has a valid terminal configuration
 */
export function hasTerminalConfig(
  config: OcloopConfig,
): config is OcloopConfig & { terminal: TerminalConfig } {
  if (!config.terminal) {
    return false
  }

  const terminal = config.terminal

  if (terminal.type === "known") {
    return typeof terminal.name === "string" && terminal.name.length > 0
  }

  if (terminal.type === "custom") {
    return (
      typeof terminal.command === "string" &&
      terminal.command.length > 0 &&
      typeof terminal.args === "string"
    )
  }

  return false
}
