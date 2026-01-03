/**
 * API helpers for OpenCode SDK
 *
 * Wraps the @opencode-ai/sdk client with simplified helper functions
 * for common OCLoop operations.
 */

import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/v2"

export type { OpencodeClient }

/**
 * Create an OpenCode SDK client
 */
export function createClient(url: string): OpencodeClient {
  return createOpencodeClient({ baseUrl: url })
}

/**
 * Session data returned from session.create
 */
export interface Session {
  id: string
  projectID: string
  directory: string
  parentID?: string
  title: string
  version: string
  time: {
    created: number
    updated: number
    compacting?: number
    archived?: number
  }
}

/**
 * Create a new session
 * @returns The created session data
 */
export async function createSession(client: OpencodeClient): Promise<Session> {
  const result = await client.session.create({})

  if (!result.response.ok || !result.data) {
    throw new Error(
      `Failed to create session: ${result.response.status} ${result.response.statusText}`,
    )
  }

  return result.data
}

/**
 * Send a prompt to a session asynchronously (returns immediately)
 * The session will process the prompt in the background.
 *
 * @param client - The OpenCode client
 * @param sessionId - The session ID to send the prompt to
 * @param prompt - The prompt text to send
 */
export async function sendPromptAsync(
  client: OpencodeClient,
  sessionId: string,
  prompt: string,
): Promise<void> {
  const result = await client.session.promptAsync({
    sessionID: sessionId,
    parts: [{ type: "text", text: prompt }],
  })

  if (!result.response.ok) {
    throw new Error(
      `Failed to send prompt: ${result.response.status} ${result.response.statusText}`,
    )
  }
}

/**
 * Abort a running session
 *
 * @param client - The OpenCode client
 * @param sessionId - The session ID to abort
 * @returns true if the session was successfully aborted
 */
export async function abortSession(
  client: OpencodeClient,
  sessionId: string,
): Promise<boolean> {
  const result = await client.session.abort({
    sessionID: sessionId,
  })

  if (!result.response.ok) {
    throw new Error(
      `Failed to abort session: ${result.response.status} ${result.response.statusText}`,
    )
  }

  return result.data ?? false
}

/**
 * Get session status
 *
 * @param client - The OpenCode client
 * @param sessionId - The session ID to get status for
 */
export async function getSessionStatus(
  client: OpencodeClient,
  sessionId: string,
): Promise<{ status: string } | undefined> {
  const result = await client.session.status({})

  if (!result.response.ok || !result.data) {
    throw new Error(
      `Failed to get session status: ${result.response.status} ${result.response.statusText}`,
    )
  }

  // Find the status for our session in the response
  const sessionStatus = result.data.find(
    (s: { sessionID: string; status: string }) => s.sessionID === sessionId,
  )
  return sessionStatus ? { status: sessionStatus.status } : undefined
}
