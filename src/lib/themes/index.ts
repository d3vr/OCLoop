/**
 * Vendored OpenCode theme definitions
 *
 * These theme files are copied from:
 * opencode/packages/opencode/src/cli/cmd/tui/context/theme/
 */

import aura from "./aura.json";
import ayu from "./ayu.json";
import catppuccin from "./catppuccin.json";
import catppuccinFrappe from "./catppuccin-frappe.json";
import catppuccinMacchiato from "./catppuccin-macchiato.json";
import cobalt2 from "./cobalt2.json";
import cursor from "./cursor.json";
import dracula from "./dracula.json";
import everforest from "./everforest.json";
import flexoki from "./flexoki.json";
import github from "./github.json";
import gruvbox from "./gruvbox.json";
import kanagawa from "./kanagawa.json";
import lucentOrng from "./lucent-orng.json";
import material from "./material.json";
import matrix from "./matrix.json";
import mercury from "./mercury.json";
import monokai from "./monokai.json";
import nightowl from "./nightowl.json";
import nord from "./nord.json";
import oneDark from "./one-dark.json";
import opencode from "./opencode.json";
import orng from "./orng.json";
import osakaJade from "./osaka-jade.json";
import palenight from "./palenight.json";
import rosepine from "./rosepine.json";
import solarized from "./solarized.json";
import synthwave84 from "./synthwave84.json";
import tokyonight from "./tokyonight.json";
import vercel from "./vercel.json";
import vesper from "./vesper.json";
import zenburn from "./zenburn.json";

/**
 * Theme definition structure matching OpenCode's theme.json schema
 */
export interface ThemeDefinition {
  $schema?: string;
  defs: Record<string, string>;
  theme: Record<string, string | { dark: string; light: string }>;
}

/**
 * All available themes, keyed by their theme identifier
 * The key matches the filename (without .json extension)
 */
export const themes: Record<string, ThemeDefinition> = {
  aura,
  ayu,
  catppuccin,
  "catppuccin-frappe": catppuccinFrappe,
  "catppuccin-macchiato": catppuccinMacchiato,
  cobalt2,
  cursor,
  dracula,
  everforest,
  flexoki,
  github,
  gruvbox,
  kanagawa,
  "lucent-orng": lucentOrng,
  material,
  matrix,
  mercury,
  monokai,
  nightowl,
  nord,
  "one-dark": oneDark,
  opencode,
  orng,
  "osaka-jade": osakaJade,
  palenight,
  rosepine,
  solarized,
  synthwave84,
  tokyonight,
  vercel,
  vesper,
  zenburn,
} as Record<string, ThemeDefinition>;

/**
 * Default theme to use when the requested theme is not found
 */
export const DEFAULT_THEME = "opencode";

/**
 * Get a theme by name, falling back to the default theme if not found
 */
export function getTheme(name: string): ThemeDefinition {
  return themes[name] ?? themes[DEFAULT_THEME];
}
