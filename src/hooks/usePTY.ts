import { createSignal, onCleanup, type Accessor } from "solid-js"
import { spawn, type IPty, type IDisposable } from "bun-pty"
import type { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"

/**
 * PTY status states
 */
export type PTYStatus = "idle" | "spawning" | "running" | "exited" | "error"

/**
 * Return type for the usePTY hook
 */
export interface UsePTYReturn {
  /** The PTY instance (null when not running) */
  pty: Accessor<IPty | null>
  /** Current status of the PTY */
  status: Accessor<PTYStatus>
  /** Last error that occurred */
  error: Accessor<Error | undefined>
  /** Spawn a new PTY for a session */
  spawn: (sessionId: string) => void
  /** Kill the current PTY */
  kill: () => void
  /** Write data to the PTY */
  write: (data: string) => void
  /** Resize the PTY */
  resize: (cols: number, rows: number) => void
}

/**
 * Options for the usePTY hook
 */
export interface UsePTYOptions {
  /** Server URL to connect to */
  serverUrl: Accessor<string | null>
  /** Reference to the ghostty-terminal renderable */
  terminalRef: { current: GhosttyTerminalRenderable | null }
  /** Terminal columns */
  cols: Accessor<number>
  /** Terminal rows */
  rows: Accessor<number>
  /** Called when the PTY exits */
  onExit?: (exitCode: number, signal?: number | string) => void
  /** Called when the PTY encounters an error */
  onError?: (error: Error) => void
}

/**
 * Hook to manage PTY lifecycle for opencode attach sessions.
 *
 * Spawns `opencode attach <url> --session <id>` in a PTY and feeds
 * output to a ghostty-terminal renderable.
 *
 * @example
 * ```tsx
 * const terminalRef = { current: null as GhosttyTerminalRenderable | null }
 *
 * const pty = usePTY({
 *   serverUrl: () => server.url(),
 *   terminalRef,
 *   cols: () => 120,
 *   rows: () => 40,
 *   onExit: (code) => {
 *     console.log("PTY exited with code", code)
 *   },
 * })
 *
 * // When a session is ready, spawn the PTY
 * pty.spawn(sessionId)
 *
 * // Forward user input when attached
 * if (isAttached()) {
 *   pty.write(inputData)
 * }
 *
 * // Cleanup when done
 * pty.kill()
 * ```
 */
export function usePTY(options: UsePTYOptions): UsePTYReturn {
  const {
    serverUrl,
    terminalRef,
    cols,
    rows,
    onExit,
    onError,
  } = options

  const [pty, setPty] = createSignal<IPty | null>(null)
  const [status, setStatus] = createSignal<PTYStatus>("idle")
  const [error, setError] = createSignal<Error | undefined>(undefined)

  // Store disposables for cleanup
  let dataDisposable: IDisposable | null = null
  let exitDisposable: IDisposable | null = null

  /**
   * Spawn a new PTY for the given session
   */
  function spawnPTY(sessionId: string): void {
    const url = serverUrl()
    if (!url) {
      const err = new Error("Cannot spawn PTY: server URL not available")
      setError(err)
      setStatus("error")
      onError?.(err)
      return
    }

    // Kill any existing PTY first
    killPTY()

    setStatus("spawning")
    setError(undefined)

    try {
      const currentCols = cols()
      const currentRows = rows()

      const newPty = spawn("opencode", ["attach", url, "--session", sessionId], {
        name: "xterm-256color",
        cols: currentCols,
        rows: currentRows,
        cwd: process.cwd(),
        env: {
          ...process.env as Record<string, string>,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      })

      // Set up data handler to feed output to ghostty-terminal
      dataDisposable = newPty.onData((data: string) => {
        if (terminalRef.current) {
          terminalRef.current.feed(data)
        }
      })

      // Set up exit handler
      exitDisposable = newPty.onExit((event) => {
        setStatus("exited")
        setPty(null)
        cleanupDisposables()
        onExit?.(event.exitCode, event.signal)
      })

      setPty(newPty)
      setStatus("running")
    } catch (err) {
      const spawnError = err instanceof Error ? err : new Error(String(err))
      setError(spawnError)
      setStatus("error")
      onError?.(spawnError)
    }
  }

  /**
   * Clean up event disposables
   */
  function cleanupDisposables(): void {
    if (dataDisposable) {
      dataDisposable.dispose()
      dataDisposable = null
    }
    if (exitDisposable) {
      exitDisposable.dispose()
      exitDisposable = null
    }
  }

  /**
   * Kill the current PTY
   */
  function killPTY(): void {
    const currentPty = pty()
    if (currentPty) {
      try {
        currentPty.kill("SIGTERM")
      } catch {
        // Ignore errors when killing (process may already be dead)
      }
      cleanupDisposables()
      setPty(null)
      setStatus("idle")
    }
  }

  /**
   * Write data to the PTY
   */
  function writePTY(data: string): void {
    const currentPty = pty()
    if (currentPty && status() === "running") {
      currentPty.write(data)
    }
  }

  /**
   * Resize the PTY
   */
  function resizePTY(newCols: number, newRows: number): void {
    const currentPty = pty()
    if (currentPty && status() === "running") {
      currentPty.resize(newCols, newRows)
    }
  }

  // Cleanup on unmount
  onCleanup(() => {
    killPTY()
  })

  return {
    pty,
    status,
    error,
    spawn: spawnPTY,
    kill: killPTY,
    write: writePTY,
    resize: resizePTY,
  }
}
