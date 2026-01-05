/**
 * Theme Context Provider
 *
 * Provides theme colors to the application by reading the user's OpenCode
 * theme preferences from ~/.local/state/opencode/kv.json.
 *
 * Falls back to the "opencode" theme in dark mode if:
 * - The kv.json file doesn't exist
 * - The theme specified in kv.json is not found
 * - Any error occurs during theme loading
 */

import { createContext, useContext, createSignal, onMount, type JSX } from "solid-js"
import {
  getResolvedTheme,
  type ThemeColors,
  type ThemeMode,
} from "../lib/theme-resolver"
import { DEFAULT_THEME } from "../lib/themes"

/**
 * Value provided by the ThemeContext
 */
export interface ThemeContextValue {
  /** Resolved theme colors (hex values) */
  theme: () => ThemeColors
  /** Current theme mode (dark/light) */
  mode: () => ThemeMode
  /** Name of the current theme */
  themeName: () => string
}

/**
 * Default theme colors for SSR/initial render
 */
const defaultTheme = getResolvedTheme(DEFAULT_THEME, "dark")

/**
 * The Theme Context
 */
const ThemeContext = createContext<ThemeContextValue>({
  theme: () => defaultTheme,
  mode: () => "dark" as ThemeMode,
  themeName: () => DEFAULT_THEME,
})

/**
 * OpenCode's kv.json structure (partial - only what we need)
 */
interface OpenCodeKV {
  theme?: string
  theme_mode?: "dark" | "light"
}

/**
 * Get the path to OpenCode's kv.json file
 *
 * Uses XDG_STATE_HOME if set, otherwise ~/.local/state
 */
function getKVPath(): string {
  const xdgState = process.env.XDG_STATE_HOME
  const home = process.env.HOME || process.env.USERPROFILE || ""

  const stateDir = xdgState || `${home}/.local/state`
  return `${stateDir}/opencode/kv.json`
}

/**
 * Read theme preferences from OpenCode's kv.json
 *
 * Returns null if file doesn't exist or can't be parsed
 */
async function readOpenCodePreferences(): Promise<OpenCodeKV | null> {
  try {
    const kvPath = getKVPath()
    const file = Bun.file(kvPath)

    if (!(await file.exists())) {
      return null
    }

    const content = await file.text()
    const data = JSON.parse(content) as OpenCodeKV
    return data
  } catch {
    // File doesn't exist, can't be read, or isn't valid JSON
    return null
  }
}

/**
 * Props for ThemeProvider
 */
export interface ThemeProviderProps {
  children: JSX.Element
}

/**
 * Theme Provider Component
 *
 * Wraps the application and provides theme colors via context.
 * Automatically reads the user's OpenCode theme preferences on mount.
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider(props: ThemeProviderProps) {
  const [theme, setTheme] = createSignal<ThemeColors>(defaultTheme)
  const [mode, setMode] = createSignal<ThemeMode>("dark")
  const [themeName, setThemeName] = createSignal<string>(DEFAULT_THEME)

  onMount(async () => {
    const prefs = await readOpenCodePreferences()

    const selectedTheme = prefs?.theme || DEFAULT_THEME
    const selectedMode: ThemeMode = prefs?.theme_mode || "dark"

    // Resolve the theme colors
    const resolvedColors = getResolvedTheme(selectedTheme, selectedMode)

    setTheme(resolvedColors)
    setMode(selectedMode)
    setThemeName(selectedTheme)
  })

  const value: ThemeContextValue = {
    theme,
    mode,
    themeName,
  }

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access the current theme
 *
 * @returns ThemeContextValue with theme colors, mode, and theme name
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, mode } = useTheme()
 *
 *   return (
 *     <box style={{ color: theme().primary }}>
 *       Current mode: {mode()}
 *     </box>
 *   )
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}

/**
 * Calculate appropriate text color for a selected item background
 *
 * Uses basic relative luminance calculation to determine if the background
 * color is light or dark, and returns contrasting text color.
 *
 * @param theme The current theme colors
 * @returns Hex color string for the text (either primary or secondary text color)
 */
export function selectedForeground(theme: ThemeColors): string {
  // Parse hex color to RGB
  const hex = theme.primary.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance (perceived brightness)
  // Formula: 0.299R + 0.587G + 0.114B
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // If background is light (> 0.5), use dark text
  // If background is dark (<= 0.5), use light text
  return luminance > 0.5 ? "#000000" : "#FFFFFF"
}
