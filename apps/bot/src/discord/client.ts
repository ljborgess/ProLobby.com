import { Client, GatewayIntentBits } from 'discord.js'

// Server Members Intent must be enabled in the Developer Portal (RF-062) —
// without it the Verified role is never granted, and the failure is silent.
export function createDiscordClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  })
}
