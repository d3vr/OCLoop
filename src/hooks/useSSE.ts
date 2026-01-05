import { createSignal, onMount, onCleanup, type Accessor } from "solid-js"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import type { Event, Todo, SessionStatus } from "@opencode-ai/sdk/v2"
import { log } from "../lib/debug-logger"

/** Maximum length for individual string values in logged event data */
const MAX_LOG_VALUE_LENGTH = 200

/**
 * Recursively truncate string values in data for logging.
 * Preserves JSON structure while limiting individual string lengths.
 */
function truncateForLog(data: unknown, maxValueLength = MAX_LOG_VALUE_LENGTH): unknown {
  if (typeof data === "string" && data.length > maxValueLength) {
    return data.substring(0, maxValueLength) + `...[${data.length} chars]`
  }
  if (Array.isArray(data)) {
    return data.map(v => truncateForLog(v, maxValueLength))
  }
  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, truncateForLog(v, maxValueLength)])
    )
  }
  return data
}

/**
 * SSE connection status
 */
export type SSEStatus = "disconnected" | "connecting" | "connected" | "error"

/**
 * SSE event handlers for OCLoop-relevant events
 */
export interface SSEEventHandlers {
  /** Called when a session is created */
  onSessionCreated?: (sessionId: string) => void
  /** Called when a session becomes idle */
  onSessionIdle?: (sessionId: string) => void
  /** Called when todos are updated */
  onTodoUpdated?: (sessionId: string, todos: Todo[]) => void
  /** Called when a file is edited */
  onFileEdited?: (file: string) => void
  /** Called when session status changes */
  onSessionStatus?: (sessionId: string, status: SessionStatus) => void
  /** Called when a session error occurs */
  onSessionError?: (sessionId: string | undefined, error: string) => void
  /** Called for any event (useful for debugging) */
  onAnyEvent?: (event: Event) => void
}

/**
 * Options for the useSSE hook
 */
export interface UseSSEOptions {
  /** Server URL to connect to (reactive accessor) */
  url: Accessor<string>
  /** Directory scope for the SSE connection */
  directory?: string
  /** Event handlers */
  handlers: SSEEventHandlers
  /** Session ID to filter events (optional) */
  sessionId?: Accessor<string | undefined>
  /** Whether to auto-connect on mount (default: true) */
  autoConnect?: boolean
  /** Called when an error occurs */
  onError?: (error: Error) => void
}

/**
 * Return type for the useSSE hook
 */
export interface UseSSEReturn {
  /** Current connection status */
  status: Accessor<SSEStatus>
  /** Last error that occurred */
  error: Accessor<Error | undefined>
  /** Manually reconnect */
  reconnect: () => void
  /** Disconnect from the SSE stream */
  disconnect: () => void
}

/**
 * Hook to subscribe to OpenCode SSE events.
 *
 * Connects to the `/event` endpoint and provides event filtering by session.
 * Automatically handles reconnection on connection loss.
 *
 * @example
 * ```tsx
 * const sse = useSSE({
 *   url: "http://127.0.0.1:4096",
 *   sessionId: () => currentSessionId(),
 *   handlers: {
 *     onSessionIdle: (sessionId) => {
 *       console.log("Session idle:", sessionId)
 *       dispatch({ type: "session_idle" })
 *     },
 *     onTodoUpdated: (sessionId, todos) => {
 *       console.log("Todos updated:", todos)
 *     },
 *   },
 * })
 *
 * createEffect(() => {
 *   if (sse.status() === "connected") {
 *     console.log("SSE connected")
 *   }
 * })
 * ```
 */
export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const {
    url,
    directory,
    handlers,
    sessionId,
    autoConnect = true,
    onError,
  } = options

  const [status, setStatus] = createSignal<SSEStatus>("disconnected")
  const [error, setError] = createSignal<Error | undefined>(undefined)

  // Abort controller for canceling the SSE connection
  let abortController: AbortController | null = null
  // Flag to track if we should keep trying to reconnect
  let shouldReconnect = true

  /**
   * Process an incoming SSE event and call appropriate handlers
   */
  function processEvent(event: Event): void {
    log.debug("sse", "Event received", { type: event.type, sessionId: sessionId?.(), data: truncateForLog(event.properties) })

    // Call the generic handler first
    if (handlers.onAnyEvent) {
      handlers.onAnyEvent(event)
    }

    // Get the current session filter
    const filterSessionId = sessionId?.()

    // Handle specific event types
    switch (event.type) {
      case "session.created": {
        // Extract session ID from event.properties.info.id
        const eventSessionId = (event.properties as { info?: { id?: string } })
          .info?.id
        if (eventSessionId) {
          // Filter by session if a filter is set
          if (filterSessionId && eventSessionId !== filterSessionId) {
            return
          }
          handlers.onSessionCreated?.(eventSessionId)
        }
        break
      }

      case "session.idle": {
        const eventSessionId = event.properties.sessionID
        // Filter by session if a filter is set
        if (filterSessionId && eventSessionId !== filterSessionId) {
          return
        }
        handlers.onSessionIdle?.(eventSessionId)
        break
      }

      case "session.error": {
        const eventSessionId = (event.properties as { sessionID?: string })
          .sessionID
        const errorMessage =
          (event.properties as { error?: string }).error ?? "Unknown error"
        // Filter by session if a filter is set
        if (
          filterSessionId &&
          eventSessionId &&
          eventSessionId !== filterSessionId
        ) {
          return
        }
        handlers.onSessionError?.(eventSessionId, errorMessage)
        break
      }

      case "todo.updated": {
        const eventSessionId = event.properties.sessionID
        // Filter by session if a filter is set
        if (filterSessionId && eventSessionId !== filterSessionId) {
          return
        }
        handlers.onTodoUpdated?.(eventSessionId, event.properties.todos)
        break
      }

      case "file.edited": {
        handlers.onFileEdited?.(event.properties.file)
        break
      }

      case "session.status": {
        const eventSessionId = event.properties.sessionID
        // Filter by session if a filter is set
        if (filterSessionId && eventSessionId !== filterSessionId) {
          return
        }
        handlers.onSessionStatus?.(eventSessionId, event.properties.status)
        break
      }
    }
  }

  /**
   * Connect to the SSE stream
   */
  async function connect(): Promise<void> {
    if (status() === "connecting" || status() === "connected") {
      return
    }

    // Get the current URL value from the accessor
    const currentUrl = url()
    
    // Validate URL before attempting to connect
    if (!currentUrl) {
      log.warn("sse", "Cannot connect: URL is empty")
      return
    }

    setStatus("connecting")
    setError(undefined)

    abortController = new AbortController()
    
    log.info("sse", "Connecting", { url: currentUrl, directory })

    try {
      // Create the SDK client
      const client = createOpencodeClient({
        baseUrl: currentUrl,
        directory,
      })

      // Subscribe to events
      const events = await client.event.subscribe(
        { directory },
        { signal: abortController.signal },
      )

      // Check if subscription was successful
      if (!events.stream) {
        throw new Error("Failed to subscribe to SSE events: no stream returned")
      }

      setStatus("connected")
      log.info("sse", "Connected")

      // Process events from the stream
      for await (const event of events.stream) {
        processEvent(event)
      }

      // Stream ended normally
      setStatus("disconnected")

      // Attempt reconnection if appropriate
      if (shouldReconnect) {
        scheduleReconnect()
      }
    } catch (err) {
      // Handle abort (not an error)
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("disconnected")
        return
      }

      const connectionError = err instanceof Error ? err : new Error(String(err))
      setError(connectionError)
      setStatus("error")
      log.error("sse", "Connection error", connectionError)

      if (onError) {
        onError(connectionError)
      }

      // Attempt reconnection on error
      if (shouldReconnect) {
        scheduleReconnect()
      }
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  let reconnectAttempts = 0
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  function scheduleReconnect(): void {
    if (!shouldReconnect) {
      return
    }

    // Calculate delay with exponential backoff (max 30 seconds)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    reconnectAttempts++

    reconnectTimeout = setTimeout(() => {
      if (shouldReconnect) {
        connect()
      }
    }, delay)
  }

  /**
   * Disconnect from the SSE stream
   */
  function disconnect(): void {
    log.info("sse", "Disconnecting")
    shouldReconnect = false

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (abortController) {
      abortController.abort()
      abortController = null
    }

    setStatus("disconnected")
  }

  /**
   * Manually trigger a reconnection
   */
  function reconnect(): void {
    // Reset reconnection state
    reconnectAttempts = 0
    shouldReconnect = true

    // Cancel any existing connection
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    // Start fresh connection
    connect()
  }

  // Auto-connect on mount if enabled
  onMount(() => {
    if (autoConnect) {
      connect()
    }
  })

  // Cleanup on unmount
  onCleanup(() => {
    disconnect()
  })

  return {
    status,
    error,
    reconnect,
    disconnect,
  }
}
