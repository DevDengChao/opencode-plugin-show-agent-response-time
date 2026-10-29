import { formatFullTime } from "./format-time"

const TIMELINE_SELECTOR = '[data-slot="session-timeline-scroll"]'
const TEXT_PART_SELECTOR = '[data-component="text-part"]'
const COPY_WRAPPER_SELECTOR = '[data-slot="text-part-copy-wrapper"]'
const META_SELECTOR = '[data-slot="text-part-meta"]'
const META_ITEM_SELECTOR = '[data-slot="text-part-meta-item"]'
const OWN_ATTRIBUTE = "data-art-response-time"
const UI_ATTRIBUTE = "data-art-ui"
const TOOLTIP_ID = "art-response-time-tooltip"
const CLOSE_ANIMATION_MS = 80

export interface ResponseTimeInput {
  userMessageID?: string
  partID?: string
}

export interface ResponseTimesOptions {
  /** Resolves the turn's response completion time, in milliseconds since the epoch. */
  resolveTime(input: ResponseTimeInput): number | undefined
  /** The current interface locale, for Intl formatting. */
  locale(): string
  /** Override the full timestamp formatter, mostly for tests. */
  formatTime?: (time: number, locale: string) => string
  /** How long the pointer must rest on the duration before the tooltip opens. Defaults to 800ms. */
  openDelay?: number
  debug?: boolean
  root?: Document | HTMLElement
  scopeSelector?: string
}

export interface ResponseTimesController {
  scan(): void
  dispose(): void
  count(): number
}

interface Decoration {
  readonly wrapper: HTMLElement
  readonly item: HTMLElement
  cleanup(): void
}

interface TriggerInput {
  userMessageID?: string
  partID?: string
}

class TooltipController {
  private element: HTMLElement | null = null
  private triggerElement: HTMLElement | null = null
  private closeTimer: number | undefined
  private unbind: (() => void) | null = null

  isOpenFor(trigger: HTMLElement): boolean {
    return (
      this.triggerElement === trigger &&
      this.element?.isConnected === true &&
      this.closeTimer === undefined
    )
  }

  show(trigger: HTMLElement, text: string, pointerOpened: boolean): void {
    if (!trigger.isConnected || !document.body) return

    this.cancelClose()

    if (this.triggerElement && this.triggerElement !== trigger) this.detachTrigger()
    this.triggerElement = trigger

    const element = this.element ?? this.create()
    this.element = element

    element.textContent = text
    element.removeAttribute("data-closed")

    const theme = trigger.closest<HTMLElement>("[data-theme]")?.getAttribute("data-theme")
    if (theme) element.setAttribute("data-theme", theme)
    else element.removeAttribute("data-theme")

    if (!element.isConnected) {
      element.style.visibility = "hidden"
      document.body.append(element)
    }

    this.position()
    element.style.visibility = "visible"

    this.setDescribedBy(trigger)
    this.bindListeners(pointerOpened)
  }

  close(animate = true): void {
    this.unbindListeners()
    this.detachTrigger()

    const element = this.element

    if (!element) {
      this.cancelClose()
      return
    }

    if (!animate || !element.isConnected) {
      this.cancelClose()
      element.remove()
      if (this.element === element) this.element = null
      return
    }

    if (this.closeTimer !== undefined) return

    element.setAttribute("data-closed", "")
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = undefined
      element.remove()
      if (this.element === element) this.element = null
    }, CLOSE_ANIMATION_MS)
  }

  dispose(): void {
    this.close(false)
    this.unbindListeners()
    this.detachTrigger()
    this.cancelClose()
    this.element?.remove()
    this.element = null
  }

  private create(): HTMLElement {
    const element = document.createElement("div")
    element.id = TOOLTIP_ID
    element.className = "art-response-time-tooltip"
    element.dataset.component = "tooltip-v2"
    element.dataset.appearance = "compact"
    element.dataset.placement = "top"
    element.dataset.artUi = "tooltip"
    element.setAttribute("role", "tooltip")
    return element
  }

  private position(): void {
    const element = this.element
    const trigger = this.triggerElement

    if (!element || !trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = element.getBoundingClientRect()
    const gap = 4
    const margin = 8

    let placement: "top" | "bottom" = "top"
    let top = triggerRect.top - tooltipRect.height - gap

    if (top < margin) {
      placement = "bottom"
      top = triggerRect.bottom + gap
    }

    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
    const maxLeft = Math.max(margin, window.innerWidth - tooltipRect.width - margin)
    const maxTop = Math.max(margin, window.innerHeight - tooltipRect.height - margin)

    left = Math.min(Math.max(left, margin), maxLeft)
    top = Math.min(Math.max(top, margin), maxTop)

    element.dataset.placement = placement
    element.style.left = `${Math.round(left)}px`
    element.style.top = `${Math.round(top)}px`
  }

  private setDescribedBy(trigger: HTMLElement): void {
    const current = trigger.getAttribute("aria-describedby")
    const tokens = new Set(current?.split(/\s+/).filter(Boolean) ?? [])
    tokens.add(TOOLTIP_ID)
    trigger.setAttribute("aria-describedby", [...tokens].join(" "))
  }

  private detachTrigger(): void {
    const trigger = this.triggerElement

    if (!trigger) return

    const current = trigger.getAttribute("aria-describedby")

    if (current) {
      const tokens = current.split(/\s+/).filter((token) => token && token !== TOOLTIP_ID)

      if (tokens.length > 0) trigger.setAttribute("aria-describedby", tokens.join(" "))
      else trigger.removeAttribute("aria-describedby")
    }

    this.triggerElement = null
  }

  private bindListeners(pointerOpened: boolean): void {
    this.unbindListeners()

    const close = () => this.close()
    const closeNow = () => this.close(false)
    const onPointerMove = (event: PointerEvent) => {
      const trigger = this.triggerElement
      if (!trigger) return

      if (!trigger.isConnected) {
        this.close()
        return
      }

      const rect = trigger.getBoundingClientRect()

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        this.close()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      const trigger = this.triggerElement
      if (!trigger) return
      if (event.target instanceof Node && trigger.contains(event.target)) return
      this.close()
    }

    window.addEventListener("resize", closeNow)
    window.addEventListener("blur", closeNow)
    window.addEventListener("scroll", closeNow, true)
    document.addEventListener("pointerdown", onPointerDown, true)
    if (pointerOpened) document.addEventListener("pointermove", onPointerMove, true)

    this.unbind = () => {
      window.removeEventListener("resize", closeNow)
      window.removeEventListener("blur", closeNow)
      window.removeEventListener("scroll", closeNow, true)
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointermove", onPointerMove, true)
    }
  }

  private unbindListeners(): void {
    this.unbind?.()
    this.unbind = null
  }

  private cancelClose(): void {
    if (this.closeTimer !== undefined) {
      window.clearTimeout(this.closeTimer)
      this.closeTimer = undefined
    }

    this.element?.removeAttribute("data-closed")
  }
}

function isOwnNode(node: Node): boolean {
  if (node instanceof Element) return node.closest(`[${UI_ATTRIBUTE}]`) !== null
  if (node instanceof Text) return node.parentElement?.closest(`[${UI_ATTRIBUTE}]`) !== null
  return false
}

function isOwnMutation(record: MutationRecord): boolean {
  if (isOwnNode(record.target)) return true
  if (record.type !== "childList") return false

  const nodes = [...record.addedNodes, ...record.removedNodes]
  return nodes.length > 0 && nodes.every(isOwnNode)
}

function elementOf(node: Node): Element | null {
  return node instanceof Element ? node : node.parentElement
}

function affectsResponseTime(record: MutationRecord, scopeSelector: string): boolean {
  if (record.type === "characterData") {
    return elementOf(record.target)?.closest(COPY_WRAPPER_SELECTOR) !== null
  }

  if (record.type === "attributes") {
    return elementOf(record.target)?.closest(COPY_WRAPPER_SELECTOR) !== null
  }

  if (record.type !== "childList") return false
  if (elementOf(record.target)?.closest(COPY_WRAPPER_SELECTOR)) return true

  for (const node of [...record.addedNodes, ...record.removedNodes]) {
    if (!(node instanceof Element)) continue

    if (node.matches(COPY_WRAPPER_SELECTOR) || node.querySelector(COPY_WRAPPER_SELECTOR)) {
      return true
    }

    if (node.matches(scopeSelector) || node.querySelector(scopeSelector)) return true
  }

  return false
}

/** Finds the response duration item inside an assistant text footer, or undefined when there is none. */
export function findResponseTimeItem(wrapper: HTMLElement): HTMLElement | undefined {
  const meta = wrapper.querySelector<HTMLElement>(META_SELECTOR)

  if (!meta) return undefined

  const items = Array.from(meta.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.matches(META_ITEM_SELECTOR),
  )

  if (items.length === 0) return undefined

  // An interrupted response puts the duration before the "Interrupted" label.
  const index = wrapper.hasAttribute("data-interrupted") ? items.length - 2 : items.length - 1
  const item = items[index]

  if (!item || item.hasAttribute("data-variant")) return undefined

  const label = (item.textContent ?? "").trim()

  // Durations always include a number; this avoids marking a model or agent label
  // when a footer has no duration at all.
  if (!label || !/\d/.test(label)) return undefined

  return item
}

export function installResponseTimes(options: ResponseTimesOptions): ResponseTimesController {
  const root = options.root ?? document
  const scopeSelector = options.scopeSelector ?? TIMELINE_SELECTOR
  const openDelay = Math.max(0, options.openDelay ?? 800)
  const debug = options.debug === true
  const formatTime = options.formatTime ?? formatFullTime
  const tooltip = new TooltipController()
  const decorations = new Map<HTMLElement, Decoration>()

  let disposed = false
  let scheduled = false
  let observer: MutationObserver | null = null

  function collectWrappers(): HTMLElement[] {
    if (root instanceof Document) {
      return Array.from(
        root.querySelectorAll<HTMLElement>(`${scopeSelector} ${COPY_WRAPPER_SELECTOR}`),
      )
    }

    if (root.matches(scopeSelector)) {
      return Array.from(root.querySelectorAll<HTMLElement>(COPY_WRAPPER_SELECTOR))
    }

    const scope = root.closest<HTMLElement>(scopeSelector)

    if (scope) return Array.from(scope.querySelectorAll<HTMLElement>(COPY_WRAPPER_SELECTOR))

    return Array.from(
      root.querySelectorAll<HTMLElement>(`${scopeSelector} ${COPY_WRAPPER_SELECTOR}`),
    )
  }

  function decorate(wrapper: HTMLElement, item: HTMLElement): Decoration {
    const previousTabIndex = item.getAttribute("tabindex")
    let timer: number | undefined

    item.setAttribute(OWN_ATTRIBUTE, "")
    item.setAttribute("tabindex", "0")

    const clearTimer = () => {
      if (timer === undefined) return
      window.clearTimeout(timer)
      timer = undefined
    }

    const resolve = (): TriggerInput => {
      const textPart = wrapper.closest<HTMLElement>(TEXT_PART_SELECTOR)
      const row = wrapper.closest<HTMLElement>("[data-message-id]")

      return {
        userMessageID: row?.getAttribute("data-message-id") || undefined,
        partID: textPart?.getAttribute("data-timeline-part-id") || undefined,
      }
    }

    const open = (pointerOpened: boolean) => {
      clearTimer()

      const input = resolve()
      const time = options.resolveTime(input)

      if (time === undefined || !Number.isFinite(time)) {
        if (debug) {
          console.info(
            `[agent-response-time] no completion time for ${
              input.userMessageID ?? input.partID ?? "unknown message"
            }`,
          )
        }
        return
      }

      const text = formatTime(time, options.locale())

      if (!text) return

      tooltip.show(item, text, pointerOpened)
    }

    const enter = (event: Event) => {
      if ((event as PointerEvent).pointerType === "touch") return
      if (tooltip.isOpenFor(item)) return

      tooltip.close(false)
      timer = window.setTimeout(() => {
        timer = undefined
        open(true)
      }, openDelay)
    }

    const leave = () => {
      clearTimer()
      if (tooltip.isOpenFor(item)) tooltip.close()
    }

    const focus = () => open(false)

    const blur = () => {
      if (tooltip.isOpenFor(item)) tooltip.close()
    }

    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !tooltip.isOpenFor(item)) return
      tooltip.close()
    }

    item.addEventListener("pointerenter", enter)
    item.addEventListener("pointerleave", leave)
    item.addEventListener("pointercancel", leave)
    item.addEventListener("focus", focus)
    item.addEventListener("blur", blur)
    item.addEventListener("keydown", keydown)

    return {
      wrapper,
      item,
      cleanup() {
        clearTimer()
        if (tooltip.isOpenFor(item)) tooltip.close(false)

        item.removeEventListener("pointerenter", enter)
        item.removeEventListener("pointerleave", leave)
        item.removeEventListener("pointercancel", leave)
        item.removeEventListener("focus", focus)
        item.removeEventListener("blur", blur)
        item.removeEventListener("keydown", keydown)

        item.removeAttribute(OWN_ATTRIBUTE)

        if (previousTabIndex === null) item.removeAttribute("tabindex")
        else item.setAttribute("tabindex", previousTabIndex)
      },
    }
  }

  function scan(): void {
    if (disposed) return

    const wrappers = collectWrappers()
    const seen = new Set<HTMLElement>()

    for (const wrapper of wrappers) {
      if (!wrapper.isConnected) continue
      if (!wrapper.closest<HTMLElement>(TEXT_PART_SELECTOR)) continue

      const item = findResponseTimeItem(wrapper)

      if (!item || !item.isConnected) continue

      seen.add(wrapper)

      const existing = decorations.get(wrapper)

      if (existing && existing.item === item && item.isConnected) continue

      existing?.cleanup()
      decorations.delete(wrapper)
      decorations.set(wrapper, decorate(wrapper, item))
    }

    for (const [wrapper, decoration] of decorations) {
      if (seen.has(wrapper) && wrapper.isConnected && decoration.item.isConnected) continue

      decoration.cleanup()
      decorations.delete(wrapper)
    }

    if (debug) {
      console.info(`[agent-response-time] ${decorations.size} trigger(s) active`)
    }
  }

  function schedule(): void {
    if (scheduled || disposed) return

    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      scan()
    })
  }

  observer = new MutationObserver((records) => {
    if (records.some((record) => !isOwnMutation(record) && affectsResponseTime(record, scopeSelector))) {
      schedule()
    }
  })

  const observationTarget = root instanceof Document ? document.documentElement : root
  observer.observe(observationTarget, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-interrupted"],
  })

  scan()

  if (debug) {
    console.info(`[agent-response-time] installed for ${scopeSelector}`)
  }

  return {
    scan,
    dispose() {
      if (disposed) return

      disposed = true
      observer?.disconnect()
      observer = null
      scheduled = false

      for (const decoration of decorations.values()) decoration.cleanup()
      decorations.clear()
      tooltip.dispose()
    },
    count() {
      return decorations.size
    },
  }
}
