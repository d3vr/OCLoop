/**
 * Theme color resolution utility
 *
 * Ported from OpenCode's theme resolution logic.
 * Handles color resolution: hex strings, def references, dark/light variants.
 */

import { type ThemeDefinition, themes, DEFAULT_THEME } from "./themes";

/**
 * Resolved theme colors with all semantic tokens as hex strings
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundPanel: string;
  backgroundElement: string;
  text: string;
  textMuted: string;
  border: string;
  borderActive: string;
  borderSubtle: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export type ThemeMode = "dark" | "light";

/**
 * All semantic color tokens that we need to resolve
 */
const REQUIRED_TOKENS: (keyof ThemeColors)[] = [
  "primary",
  "secondary",
  "accent",
  "background",
  "backgroundPanel",
  "backgroundElement",
  "text",
  "textMuted",
  "border",
  "borderActive",
  "borderSubtle",
  "success",
  "warning",
  "error",
  "info",
];

/**
 * Resolve a single color value from a theme.
 *
 * Values can be:
 * 1. Direct hex strings (e.g., "#282a36")
 * 2. References to defs (e.g., "purple" -> defs.purple)
 * 3. Objects with dark/light variants
 */
function resolveColor(
  value: string | { dark: string; light: string } | undefined,
  defs: Record<string, string>,
  mode: ThemeMode
): string {
  if (!value) {
    return "#808080"; // Fallback gray
  }

  // Handle dark/light variant objects
  if (typeof value === "object" && value !== null) {
    const modeValue = value[mode];
    // The mode value could also be a def reference or hex
    return resolveColorString(modeValue, defs);
  }

  return resolveColorString(value, defs);
}

/**
 * Resolve a color string which can be a hex color or a def reference
 */
function resolveColorString(
  value: string,
  defs: Record<string, string>
): string {
  if (!value) {
    return "#808080";
  }

  // If it starts with #, it's already a hex color
  if (value.startsWith("#")) {
    return value;
  }

  // Otherwise, look it up in defs
  const defValue = defs[value];
  if (defValue) {
    // Defs should always be hex values, but handle recursion just in case
    if (defValue.startsWith("#")) {
      return defValue;
    }
    // Recursive lookup (shouldn't normally happen, but be safe)
    return resolveColorString(defValue, defs);
  }

  // Fallback if not found
  return "#808080";
}

/**
 * Resolve a full theme definition into concrete hex colors
 */
export function resolveTheme(
  themeDef: ThemeDefinition,
  mode: ThemeMode = "dark"
): ThemeColors {
  const { defs, theme } = themeDef;

  const resolved: Partial<ThemeColors> = {};

  for (const token of REQUIRED_TOKENS) {
    const value = theme[token];
    resolved[token] = resolveColor(value, defs, mode);
  }

  return resolved as ThemeColors;
}

/**
 * Get a resolved theme by name and mode
 *
 * Falls back to the default theme if the requested theme is not found.
 */
export function getResolvedTheme(
  themeName: string,
  mode: ThemeMode = "dark"
): ThemeColors {
  const themeDef = themes[themeName] ?? themes[DEFAULT_THEME];
  return resolveTheme(themeDef, mode);
}

/**
 * Check if a theme name is valid
 */
export function isValidTheme(themeName: string): boolean {
  return themeName in themes;
}
