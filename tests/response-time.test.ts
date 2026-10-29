import { afterEach, describe, expect, it, vi } from "vitest"
import { formatFullTime } from "../src/format-time"
import {
  findResponseTimeItem,
  installResponseTimes,
  type ResponseTimesController,
} from "../src/response-time"

const COMPLETED = Date.UTC(2026, 9, 29, 16, 46, 42)

function rowMarkup(options: { interrupted?: boolean } = {}): string {
  return `
    <div data-timeline-row="AssistantPart" data-message-id="msg_user_1">
      <div data-component="text-part" data-timeline-part-id="part_text_1">
        <div data-slot="text-part-body">Hello</div>
        <div data-slot="text-part-copy-wrapper"${options.interrupted ? ' data-interrupted=""' : ""}>
          <button type="button">copy</button>
          <span data-slot="text-part-meta">
            <span data-slot="text-part-meta-item">Build</span>
            <span data-slot="text-part-meta-separator">·</span>
            <span data-slot="text-part-meta-item">DeepSeek V4.1 Flash</span>
            <span data-slot="text-part-meta-item" data-variant="">Fast</span>
            <span data-slot="text-part-meta-separator">·</span>
            <span data-slot="text-part-meta-item">4 分钟 46 秒</span>
            ${
              options.interrupted
                ? '<span data-slot="text-part-meta-separator">·</span><span data-slot="text-part-meta-item">Interrupted</span>'
                : ""
            }
          </span>
        </div>
      </div>
    </div>
  `
}

function timelineMarkup(options: { interrupted?: boolean } = {}): string {
  return `<div data-slot="session-timeline-scroll">${rowMarkup(options)}</div>`
}

let controller: ResponseTimesController | null = null

afterEach(() => {
  controller?.dispose()
  controller = null
  document.body.innerHTML = ""
  vi.useRealTimers()
})

function setup(
  markup = timelineMarkup(),
  options: Partial<Parameters<typeof installResponseTimes>[0]> = {},
): ResponseTimesController {
  document.body.innerHTML = markup

  controller = installResponseTimes({
    locale: () => "zh-CN",
    resolveTime: () => COMPLETED,
    formatTime: (time) => `time:${time}`,
    openDelay: 0,
    ...options,
  })

  return controller
}

function trigger(): HTMLElement {
  const element = document.querySelector<HTMLElement>("[data-art-response-time]")

  expect(element).toBeTruthy()
  return element!
}

describe("response time triggers", () => {
  it("marks the duration item and leaves the model variant alone", () => {
    setup()

    expect(trigger().textContent).toBe("4 分钟 46 秒")
    expect(trigger().getAttribute("tabindex")).toBe("0")
    expect(document.querySelectorAll("[data-art-response-time]")).toHaveLength(1)
    expect(document.querySelector("[data-variant]")?.hasAttribute("data-art-response-time")).toBe(
      false,
    )
  })

  it("marks the duration before an interrupted label", () => {
    setup(timelineMarkup({ interrupted: true }))

    expect(trigger().textContent).toBe("4 分钟 46 秒")
  })

  it("shows the completion time on hover and closes on leave", () => {
    vi.useFakeTimers()
    setup()

    const item = trigger()
    item.dispatchEvent(new MouseEvent("pointerenter"))
    vi.runOnlyPendingTimers()

    const tooltip = document.querySelector<HTMLElement>("#art-response-time-tooltip")

    expect(tooltip?.textContent).toBe(`time:${COMPLETED}`)
    expect(tooltip?.getAttribute("data-component")).toBe("tooltip-v2")
    expect(tooltip?.getAttribute("data-appearance")).toBe("compact")
    expect(tooltip?.style.visibility).toBe("visible")
    expect(item.getAttribute("aria-describedby")).toContain("art-response-time-tooltip")

    item.dispatchEvent(new MouseEvent("pointerleave"))
    vi.runOnlyPendingTimers()

    expect(document.querySelector("#art-response-time-tooltip")).toBeNull()
    expect(item.hasAttribute("aria-describedby")).toBe(false)
  })

  it("opens immediately on keyboard focus and closes on blur", () => {
    vi.useFakeTimers()
    setup()

    const item = trigger()
    item.focus()

    expect(document.querySelector("#art-response-time-tooltip")?.textContent).toBe(
      `time:${COMPLETED}`,
    )

    item.blur()
    vi.runOnlyPendingTimers()

    expect(document.querySelector("#art-response-time-tooltip")).toBeNull()
  })

  it("shows nothing when the turn has no completion time", () => {
    vi.useFakeTimers()
    setup(timelineMarkup(), { resolveTime: () => undefined })

    trigger().dispatchEvent(new MouseEvent("pointerenter"))
    vi.runOnlyPendingTimers()

    expect(document.querySelector("#art-response-time-tooltip")).toBeNull()
  })

  it("removes its attributes and listeners when disposed", () => {
    setup()
    const item = trigger()
    const current = controller!

    current.dispose()
    controller = null

    expect(item.hasAttribute("data-art-response-time")).toBe(false)
    expect(item.hasAttribute("tabindex")).toBe(false)
  })

  it("finds the footer of a newly inserted row on scan", () => {
    setup(`
      <div data-slot="session-timeline-scroll">
        <div id="mount"></div>
      </div>
    `)

    document.querySelector("#mount")!.innerHTML = rowMarkup()
    controller!.scan()

    expect(document.querySelectorAll("[data-art-response-time]")).toHaveLength(1)
  })

  it("observes a footer added after installation", async () => {
    setup(`
      <div data-slot="session-timeline-scroll">
        <div id="mount"></div>
      </div>
    `)

    document.querySelector("#mount")!.innerHTML = rowMarkup()

    await vi.waitFor(() => {
      expect(document.querySelectorAll("[data-art-response-time]")).toHaveLength(1)
    })
  })

  it("finds a duration item directly", () => {
    document.body.innerHTML = timelineMarkup()
    const wrapper = document.querySelector<HTMLElement>('[data-slot="text-part-copy-wrapper"]')!

    expect(findResponseTimeItem(wrapper)?.textContent).toBe("4 分钟 46 秒")
  })
})

describe("formatFullTime", () => {
  it("matches OpenCode's full date and long time format", () => {
    const expected = new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "full",
      timeStyle: "long",
    }).format(COMPLETED)

    expect(formatFullTime(COMPLETED, "zh-CN")).toBe(expected)
  })
})
