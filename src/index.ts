import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "opencode-plugin-show-agent-response-time",
  setup(ctx) {
    console.info(`[agent-response-time] server part loaded in OpenCode ${ctx.app.version}`)
  },
})
