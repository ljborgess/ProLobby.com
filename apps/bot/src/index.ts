import { createDiscordClient } from './discord/client'
import { createWebhookServer, readWebhookSecret } from './webhook/server'

async function main() {
  const client = createDiscordClient()
  await client.login(process.env.DISCORD_BOT_TOKEN)

  const port = process.env.PORT ?? 3002
  // /events is never exposed by the Cloudflare tunnel and has no `ports:` in
  // production (ADR-009). HMAC (WEBHOOK_SECRET) is still required: the
  // internal Docker network is the first barrier, not the only one.
  createWebhookServer({ secret: readWebhookSecret() }).listen(port, () => {
    console.log(`webhook server listening on ${port}`)
  })
}

void main()
