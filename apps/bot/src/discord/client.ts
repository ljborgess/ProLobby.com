import { Client, GatewayIntentBits } from 'discord.js'

import type { Logger } from '../logger'

// Server Members Intent must be enabled in the Developer Portal (RF-062) —
// without it the Verified role is never granted, and the failure is silent.
export function createDiscordClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  })
}

/**
 * Logs a lost gateway connection — issue #168.
 *
 * discord.js reconnects on its own (out of scope here, the library already
 * does it); what was missing is any trace that it ever happened. Without
 * this, a WebSocket drop was invisible in every log the process has.
 */
export function logGatewayErrors(client: Client, log: Logger): void {
  client.on('error', (error) => {
    log.error('discord', 'gateway connection error', { message: error.message })
  })
  client.on('shardError', (error, shardId) => {
    log.error('discord', 'shard error', { shardId, message: error.message })
  })
}
