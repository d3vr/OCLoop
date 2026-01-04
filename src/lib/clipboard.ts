/**
 * Clipboard operations for copying text to system clipboard.
 * Detects appropriate clipboard tool based on environment (Wayland vs X11).
 */

type ClipboardTool = {
  command: string;
  args: string[];
};

type ClipboardResult = {
  success: boolean;
  error?: string;
};

/**
 * Detects the appropriate clipboard tool for the current environment.
 * Checks $WAYLAND_DISPLAY for wl-copy, falls back to xclip/xsel for X11.
 * Returns null if no clipboard tool is available.
 */
export async function detectClipboardTool(): Promise<ClipboardTool | null> {
  const isWayland = !!process.env.WAYLAND_DISPLAY;

  if (isWayland) {
    // Try wl-copy first for Wayland
    if (await commandExists("wl-copy")) {
      return { command: "wl-copy", args: [] };
    }
  }

  // Try X11 clipboard tools
  if (await commandExists("xclip")) {
    return { command: "xclip", args: ["-selection", "clipboard"] };
  }

  if (await commandExists("xsel")) {
    return { command: "xsel", args: ["--clipboard", "--input"] };
  }

  // Fallback to wl-copy even on X11 (XWayland compatibility)
  if (await commandExists("wl-copy")) {
    return { command: "wl-copy", args: [] };
  }

  return null;
}

/**
 * Copies text to the system clipboard using the detected clipboard tool.
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  const tool = await detectClipboardTool();

  if (!tool) {
    return {
      success: false,
      error:
        "No clipboard tool found. Install wl-copy (Wayland) or xclip/xsel (X11).",
    };
  }

  try {
    const proc = Bun.spawn([tool.command, ...tool.args], {
      stdin: "pipe",
      stdout: "ignore",
      stderr: "pipe",
    });

    // Write text to stdin
    if (proc.stdin) {
      proc.stdin.write(text);
      proc.stdin.end();
    }

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      return {
        success: false,
        error: stderr.trim() || `Clipboard command exited with code ${exitCode}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Checks if a command exists in PATH using `which`.
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", command], {
      stdout: "ignore",
      stderr: "ignore",
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}
