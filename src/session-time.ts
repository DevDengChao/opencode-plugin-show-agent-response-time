import type { MountedSession } from "@opencode/plugin/gui"

type SessionMessages = ReturnType<MountedSession["server"]["data"]["session"]["message"]["list"]>

export type SessionMessage = SessionMessages[number]

/**
 * The turn's response completion time: the latest assistant message completion after the
 * user message, before the next user or shell turn starts.
 *
 * This mirrors OpenCode's own turn duration calculation, so the tooltip time is exactly the
 * end of the duration shown in the assistant footer.
 */
export function completedAtForUser(
  messages: readonly SessionMessage[],
  userMessageID: string,
): number | undefined {
  let userIndex = -1

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index]

    if (message.type === "user" && message.id === userMessageID) {
      userIndex = index
      break
    }
  }

  if (userIndex === -1) return undefined

  let completed: number | undefined

  for (let index = userIndex + 1; index < messages.length; index++) {
    const message = messages[index]

    if (message.type === "user" || message.type === "shell") break
    if (message.type !== "assistant" || message.time.completed === undefined) continue

    completed =
      completed === undefined ? message.time.completed : Math.max(completed, message.time.completed)
  }

  return completed
}
