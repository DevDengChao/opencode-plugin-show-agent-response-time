import { describe, expect, it } from "vitest"
import { completedAtForUser, type SessionMessage } from "../src/session-time"

function message(value: Record<string, unknown>): SessionMessage {
  return value as unknown as SessionMessage
}

function user(id: string, created: number): SessionMessage {
  return message({
    id,
    type: "user",
    time: { created },
    text: "",
    files: [],
    agents: [],
    skills: [],
  })
}

function assistant(id: string, created: number, completed?: number): SessionMessage {
  return message({
    id,
    type: "assistant",
    time: { created, completed },
    agent: "build",
    model: { id: "deepseek-v4-flash", providerID: "team-router" },
    content: [],
  })
}

function idle(id: string, created: number): SessionMessage {
  return message({
    id,
    type: "idle",
    time: { created },
    outcome: "succeeded",
  })
}

describe("completedAtForUser", () => {
  it("returns the latest assistant completion in the turn", () => {
    const messages = [
      user("msg_user_1", 1_000),
      assistant("msg_assistant_1", 1_100, 2_000),
      assistant("msg_assistant_2", 2_100, 4_000),
      idle("msg_idle_1", 4_100),
    ]

    expect(completedAtForUser(messages, "msg_user_1")).toBe(4_000)
  })

  it("stops at the next user message", () => {
    const messages = [
      user("msg_user_1", 1_000),
      assistant("msg_assistant_1", 1_100, 2_000),
      user("msg_user_2", 2_100),
      assistant("msg_assistant_2", 2_200, 5_000),
    ]

    expect(completedAtForUser(messages, "msg_user_1")).toBe(2_000)
    expect(completedAtForUser(messages, "msg_user_2")).toBe(5_000)
  })

  it("stops at a shell turn", () => {
    const messages = [
      user("msg_user_1", 1_000),
      assistant("msg_assistant_1", 1_100, 2_000),
      message({ id: "msg_shell_1", type: "shell", time: { created: 2_100 } }),
      assistant("msg_assistant_2", 2_200, 5_000),
    ]

    expect(completedAtForUser(messages, "msg_user_1")).toBe(2_000)
  })

  it("ignores assistants that have not completed", () => {
    const messages = [
      user("msg_user_1", 1_000),
      assistant("msg_assistant_1", 1_100),
      assistant("msg_assistant_2", 2_100, 3_000),
    ]

    expect(completedAtForUser(messages, "msg_user_1")).toBe(3_000)
  })

  it("returns undefined while the whole turn is still running", () => {
    const messages = [user("msg_user_1", 1_000), assistant("msg_assistant_1", 1_100)]

    expect(completedAtForUser(messages, "msg_user_1")).toBeUndefined()
  })

  it("returns undefined for an unknown user message", () => {
    expect(completedAtForUser([user("msg_user_1", 1_000)], "msg_missing")).toBeUndefined()
  })
})
