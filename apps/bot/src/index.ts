import type { Server } from 'node:http'
import { Events } from 'discord.js'
import { createDiscordClient, logGatewayErrors } from './discord/client'
import { lobbyChannelsOn } from './discord/lobby-channels'
import {
  readDiscordGuildId,
  reportPresence,
  reportPresenceSnapshot,
  schedulePresenceSnapshots,
} from './discord/presence'
import { readDiscordBotToken } from './discord/token'
import { logger } from './logger'
import { postBotEvent } from './platform/client'
import { handlePlatformEvent } from './webhook/handlers'
import { createWebhookServer, readWebhookSecret } from './webhook/server'

/**
 * Boots the bot — issue #168.
 *
 * Both secrets are read before anything else runs, the same order the API
 * already enforces (`secrets-at-boot.e2e-spec.ts`): a missing or placeholder
 * value must stop the process on the first line, not fail after it has
 * already authenticated to Discord or started accepting webhook traffic it
 * cannot yet act on. `DISCORD_GUILD_ID` joins them in production (2026-09-23
 * review) — see `readDiscordGuildId`.
 */
export async function main(): Promise<void> {
  const webhookSecret = readWebhookSecret()
  const token = readDiscordBotToken()
  readDiscordGuildId()

  const client = createDiscordClient()
  logGatewayErrors(client, logger)
  // Registered before login, but this is not what makes a leave during boot
  // survive — discord.js itself drops `guildMemberRemove` for any shard not
  // yet Ready (corrected 2026-09-23; the previous comment here claimed
  // otherwise). What actually covers a boot-window leave is the presence
  // snapshot below, sent once the gateway is Ready.
  reportPresence(client, logger)
  client.once(Events.ClientReady, () => {
    void reportPresenceSnapshot(client, logger)
    schedulePresenceSnapshots(client, logger)
  })
  await client.login(token)
  logger.info('bootstrap', 'Discord gateway connected')

  const port = Number(process.env.PORT ?? 3002)
  // /events is never exposed by the Cloudflare tunnel and has no `ports:` in
  // production (ADR-009). HMAC (WEBHOOK_SECRET) is still required: the
  // internal Docker network is the first barrier, not the only one.
  const app = createWebhookServer({
    secret: webhookSecret,
    isReady: () => client.isReady(),
    onEvent: (event) =>
      handlePlatformEvent(event, {
        channelId: process.env.DISCORD_MODERATION_CHANNEL_ID,
        webUrl: process.env.WEB_URL,
        // A channel the bot cannot reach throws, and the API retries: the
        // moderators find out from the delivery-failure case, not silence.
        send: async (channelId, content) => {
          const channel = await client.channels.fetch(channelId)
          if (!channel?.isSendable()) {
            throw new Error(`channel ${channelId} is not one the bot can post in`)
          }
          await channel.send({ content, allowedMentions: { parse: [] } })
        },
        warn: (message) => logger.warn('events', message),
        lobby: { ...lobbyChannelsOn(client), report: postBotEvent },
      }),
  })
  const httpServer = app.listen(port, () => {
    logger.info('bootstrap', `webhook server listening on ${port}`)
  })
  httpServer.on('error', (error) => {
    // Unhandled, this was a raw stack on stderr outside the logger — most
    // often EADDRINUSE, indistinguishable at a glance from any other crash.
    logger.error('bootstrap', 'webhook server failed to start', { message: error.message })
    process.exit(1)
  })

  registerGracefulShutdown(client, httpServer)
}

/**
 * `docker compose down`/restart sends SIGTERM and waits 10s before SIGKILL.
 * As PID 1 with no handler, Node ignores SIGTERM outright (2026-09-23
 * review): every stop was a hard kill, silently dropping any presence POST in
 * flight and never running `client.destroy()`. This gives the container the
 * ordinary path — stop taking new work, let the gateway close cleanly, exit
 * on its own well inside the grace period.
 */
function registerGracefulShutdown(
  client: ReturnType<typeof createDiscordClient>,
  server: Server,
): void {
  let shuttingDown = false

  const shutdown = (signal: string) => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true

    logger.info('bootstrap', `${signal} received, shutting down`)
    server.close()
    client.destroy()
    process.exit(0)
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('SIGINT', () => shutdown('SIGINT'))
}

// Guarded so importing this module in a test (or from a future entrypoint)
// never has the side effect of actually booting.
/* istanbul ignore next -- exercised by running the process, not by a unit test */
if (require.main === module) {
  main().catch((error: unknown) => {
    // The one thing worse than a boot failure is one that leaves no trace:
    // before this, a bad token or missing secret surfaced as an
    // unhandledRejection with no context, and `restart: unless-stopped`
    // looped the container forever with nothing explaining why.
    logger.error('bootstrap', 'failed to start', {
      message: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  })
}
