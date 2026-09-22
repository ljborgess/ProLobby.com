/**
 * The bot's only logger — issue #168.
 *
 * `console.log` with no level or context was the only output the process had:
 * in production this runs with no database and no screen, so the log is the
 * one place a failure can be seen at all. This is a level and a timestamp
 * printed in front of the message, nothing more — the same shape Nest's own
 * `Logger` gives `apps/api`, without pulling Nest into a plain Express +
 * discord.js process for one class.
 *
 * Never pass a Discord ID or a webhook secret into `meta` — item 11 of the
 * security checklist. Nothing here redacts a field for you.
 */
export interface Logger {
  info(context: string, message: string, meta?: Record<string, unknown>): void
  warn(context: string, message: string, meta?: Record<string, unknown>): void
  error(context: string, message: string, meta?: Record<string, unknown>): void
}

function line(
  level: string,
  context: string,
  message: string,
  meta?: Record<string, unknown>,
): string {
  const suffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
  return `[${new Date().toISOString()}] ${level.padEnd(5)} [${context}] ${message}${suffix}`
}

export const logger: Logger = {
  info(context, message, meta) {
    console.log(line('INFO', context, message, meta))
  },
  warn(context, message, meta) {
    console.warn(line('WARN', context, message, meta))
  },
  error(context, message, meta) {
    console.error(line('ERROR', context, message, meta))
  },
}
