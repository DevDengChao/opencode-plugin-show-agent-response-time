const formatters = new Map<string, Intl.DateTimeFormat>()

/**
 * The same full date and long time format OpenCode uses for the user message timestamp tooltip.
 * The time zone name comes from Intl, so a zh-CN locale renders e.g.
 * "2026年10月30日星期五 GMT+8 00:46:42".
 */
export function formatFullTime(time: number, locale: string): string {
  const key = locale || "default"
  let formatter = formatters.get(key)

  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat(locale || undefined, {
        dateStyle: "full",
        timeStyle: "long",
      })
    } catch {
      formatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "long",
      })
    }

    formatters.set(key, formatter)
  }

  return formatter.format(time)
}
