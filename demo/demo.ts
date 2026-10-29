import { installResponseTimes } from "../src/response-time"
import "../src/styles.css"
import "./demo.css"

const completedAt = new Map<string, number>([
  ["msg_user_normal", Date.UTC(2026, 9, 29, 16, 46, 42)],
  ["msg_user_interrupted", Date.UTC(2026, 9, 29, 17, 12, 8)],
])

const controller = installResponseTimes({
  locale: () => document.documentElement.lang || "zh-CN",
  resolveTime: ({ userMessageID }) => (userMessageID ? completedAt.get(userMessageID) : undefined),
  openDelay: 400,
  debug: true,
})

const themeButton = document.querySelector<HTMLButtonElement>("#theme-toggle")

function syncThemeButton() {
  if (!themeButton) return
  const dark = document.documentElement.dataset.theme === "dark"
  themeButton.textContent = dark ? "切换亮色" : "切换暗色"
}

themeButton?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"
  document.documentElement.dataset.theme = next
  syncThemeButton()
})

window.addEventListener("beforeunload", () => controller.dispose())

syncThemeButton()
