import { Client, GatewayIntentBits, Partials } from 'discord.js'

import type { Logger } from '../logger'

// Server Members Intent must be enabled in the Developer Portal (RF-062) —
// without it the Verified role is never granted, and the failure is silent.
//
// Partials.GuildMember matters for the same reason RF-062 needs the intent:
// discord.js only fills `guild.members.cache` from GUILD_CREATE up to
// `large_threshold` (50 by default) members. Past that, or for anyone who
// joined before this process's own last GUILD_CREATE, `guildMemberRemove`
// resolves the leaving member against that cache and finds nothing — the
// library drops the event on the floor instead of emitting a partial one.
// RF-060 depends on this event firing for every real member, not just the
// first fifty seen since the last restart.
export function createDiscordClient(): Client {
  return new Client({
    // GuildVoiceStates (#251): without it a voice channel's members are always
    // empty, and the lobby sweep would delete calls with people in them.
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.GuildMember, Partials.User],
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
  // `shardDisconnect` fires only when discord.js has given up and will NOT
  // reconnect on its own (a normal drop retries silently and never reaches
  // here) — bad token rotated (4004), Server Members Intent turned off in the
  // portal (4014), and the like. Left unhandled (2026-09-23 review), the
  // process stayed up with `isReady()` returning false forever: `/health`
  // correctly reports it, but nothing ever fixes it, because discord.js
  // itself will not try again. Exit and let `restart: unless-stopped` start a
  // clean process — the one thing that can recover from a dead credential.
  client.on('shardDisconnect', (event, shardId) => {
    log.error('discord', 'shard disconnected for good — exiting so the container restarts', {
      shardId,
      code: event.code,
      reason: event.reason,
    })
    process.exit(1)
  })
  client.on('shardReconnecting', (shardId) => {
    log.info('discord', 'shard reconnecting', { shardId })
  })
}
