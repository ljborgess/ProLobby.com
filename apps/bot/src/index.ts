import { createDiscordClient, logGatewayErrors } from './discord/client'
import { readDiscordBotToken } from './discord/token'
import { logger } from './logger'
import { createWebhookServer, readWebhookSecret } from './webhook/server'

/**
 * Boots the bot — issue #168.
 *
 * Both secrets are read before anything else runs, the same order the API
 * already enforces (`secrets-at-boot.e2e-spec.ts`): a missing or placeholder
 * value must stop the process on the first line, not fail after it has
 * already authenticated to Discord or started accepting webhook traffic it
 * cannot yet act on.
 */
export async function main(): Promise<void> {
  const webhookSecret = readWebhookSecret()
  const token = readDiscordBotToken()

  const client = createDiscordClient()
  logGatewayErrors(client, logger)
  await client.login(token)
  logger.info('bootstrap', 'Discord gateway connected')

  const port = Number(process.env.PORT ?? 3002)
  // /events is never exposed by the Cloudflare tunnel and has no `ports:` in
  // production (ADR-009). HMAC (WEBHOOK_SECRET) is still required: the
  // internal Docker network is the first barrier, not the only one.
  createWebhookServer({ secret: webhookSecret, isReady: () => client.isReady() }).listen(
    port,
    () => {
      logger.info('bootstrap', `webhook server listening on ${port}`)
    },
  )
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
