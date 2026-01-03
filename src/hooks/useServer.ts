import { createSignal, onMount, onCleanup } from "solid-js"
import { createOpencodeServer, type ServerOptions } from "@opencode-ai/sdk/server"

/**
 * Server status states
 */
export type ServerStatus = "starting" | "ready" | "error" | "stopped"

/**
 * Return type for the useServer hook
 */
export interface UseServerReturn {
  url: () => string | null
  port: () => number | null
  status: () => ServerStatus
  error: () => Error | undefined
  stop: () => Promise<void>
}

/**
 * Options for the useServer hook
 */
export interface UseServerOptions {
  /** Port to use for the server (default: 4096, or random if 0) */
  port?: number
  /** Hostname to bind to (default: 127.0.0.1) */
  hostname?: string
  /** Timeout for server startup in ms (default: 10000) */
  timeout?: number
  /** Whether to auto-start the server on mount (default: true) */
  autoStart?: boolean
}

/**
 * Hook to manage the OpenCode server lifecycle.
 *
 * Starts the server on mount and provides reactive state for status, URL, and port.
 * Automatically cleans up the server on unmount.
 *
 * @example
 * ```tsx
 * const server = useServer({ port: 4096 })
 *
 * createEffect(() => {
 *   if (server.status() === "ready") {
 *     console.log("Server ready at", server.url())
 *   }
 * })
 * ```
 */
export function useServer(options: UseServerOptions = {}): UseServerReturn {
  const {
    port,
    hostname = "127.0.0.1",
    timeout = 10000,
    autoStart = true,
  } = options

  const [url, setUrl] = createSignal<string | null>(null)
  const [serverPort, setServerPort] = createSignal<number | null>(null)
  const [status, setStatus] = createSignal<ServerStatus>("starting")
  const [error, setError] = createSignal<Error | undefined>(undefined)

  // Store reference to the server for cleanup
  let serverRef: { url: string; close: () => void } | null = null
  let abortController: AbortController | null = null

  /**
   * Start the OpenCode server
   */
  async function startServer(): Promise<void> {
    if (status() !== "starting" && status() !== "stopped") {
      return
    }

    setStatus("starting")
    setError(undefined)

    abortController = new AbortController()

    const serverOptions: ServerOptions = {
      hostname,
      timeout,
      signal: abortController.signal,
    }

    // Only set port if explicitly provided
    if (port !== undefined) {
      serverOptions.port = port
    }

    try {
      serverRef = await createOpencodeServer(serverOptions)

      // Extract port from URL
      const parsedUrl = new URL(serverRef.url)
      const actualPort = parseInt(parsedUrl.port, 10)

      setUrl(serverRef.url)
      setServerPort(actualPort)
      setStatus("ready")
    } catch (err) {
      const serverError = err instanceof Error ? err : new Error(String(err))
      setError(serverError)
      setStatus("error")
      serverRef = null
    }
  }

  /**
   * Stop the server gracefully
   */
  async function stop(): Promise<void> {
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    if (serverRef) {
      serverRef.close()
      serverRef = null
    }

    setUrl(null)
    setServerPort(null)
    setStatus("stopped")
  }

  // Auto-start server on mount if enabled
  onMount(() => {
    if (autoStart) {
      startServer()
    }
  })

  // Cleanup on unmount
  onCleanup(() => {
    stop()
  })

  return {
    url,
    port: serverPort,
    status,
    error,
    stop,
  }
}
