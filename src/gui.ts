import { Plugin, Style } from "@opencode/plugin/gui"
import { installResponseTimes } from "./response-time"
import { completedAtForUser } from "./session-time"
import styles from "./styles.css?inline"

export default Plugin.define({
  setup(ctx) {
    console.info(`[agent-response-time] GUI setup in OpenCode ${ctx.app.version}`)
    ctx.add(Style, styles)

    const controller = installResponseTimes({
      locale: () => ctx.locale.locale(),
      resolveTime: ({ userMessageID }) => {
        const session = ctx.sessions.current()

        if (!session || !userMessageID) return undefined

        const messages = session.server.data.session.message.list(session.id)

        return completedAtForUser(messages, userMessageID)
      },
      openDelay: 800,
      debug: ctx.options.debug === true,
    })

    return () => controller.dispose()
  },
})
