import { Client, GatewayIntentBits } from 'discord.js'

// Server Members Intent precisa estar ativo no Developer Portal (RF-062) —
// sem isso o cargo Verificado nunca é concedido, e a falha é silenciosa.
export function createDiscordClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  })
}
