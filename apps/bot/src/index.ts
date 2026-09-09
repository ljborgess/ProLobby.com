import { createDiscordClient } from './discord/client'
import { createWebhookServer } from './webhook/server'

async function main() {
  const client = createDiscordClient()
  await client.login(process.env.DISCORD_BOT_TOKEN)

  const port = process.env.PORT ?? 3002
  createWebhookServer().listen(port, () => {
    console.log(`webhook server listening on ${port}`)
  })
}

void main()
