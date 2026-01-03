/**
 * Graceful shutdown manager for OCLoop
 *
 * Provides centralized signal handling and cleanup coordination
 * for SIGINT (Ctrl+C) and SIGTERM signals.
 */

export type ShutdownHandler = () => Promise<void> | void

/**
 * Global shutdown manager instance
 */
class ShutdownManager {
  private handler: ShutdownHandler | null = null
  private isShuttingDown = false

  constructor() {
    // Register signal handlers
    process.on("SIGINT", () => this.handleSignal("SIGINT"))
    process.on("SIGTERM", () => this.handleSignal("SIGTERM"))
  }

  /**
   * Register a shutdown handler to be called when a termination signal is received.
   * Only one handler can be registered at a time; subsequent calls replace the previous handler.
   */
  register(handler: ShutdownHandler): void {
    this.handler = handler
  }

  /**
   * Unregister the current shutdown handler
   */
  unregister(): void {
    this.handler = null
  }

  /**
   * Handle a signal by calling the registered shutdown handler
   */
  private async handleSignal(signal: string): Promise<void> {
    // Prevent multiple concurrent shutdowns
    if (this.isShuttingDown) {
      return
    }
    this.isShuttingDown = true

    if (this.handler) {
      try {
        await this.handler()
      } catch (error) {
        // Log error but still exit
        console.error(`Error during shutdown (${signal}):`, error)
        process.exit(1)
      }
    } else {
      // No handler registered, exit immediately
      process.exit(0)
    }
  }

  /**
   * Trigger a programmatic shutdown (useful for testing or explicit shutdown)
   */
  async shutdown(): Promise<void> {
    await this.handleSignal("programmatic")
  }
}

/**
 * Global shutdown manager instance - singleton
 */
export const shutdownManager = new ShutdownManager()
