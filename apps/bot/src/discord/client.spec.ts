import { EventEmitter } from 'node:events'
import { Partials } from 'discord.js'
import type { Client } from 'discord.js'
import { createDiscordClient, logGatewayErrors } from './client'
import type { Logger } from '../logger'

/**
 * Regression for the bug found in the 2026-09-23 review: without
 * `Partials.GuildMember`, `guildMemberRemove` silently never fires for
 * anyone not already in `guild.members.cache` — which past 50 members (or
 * after a restart) is most of the server. See the comment in client.ts.
 */
describe('createDiscordClient', () => {
  it('accepts partial guild members, so a leave resolves even when the cache missed the join', () => {
    const client = createDiscordClient()

    expect(client.options.partials).toContain(Partials.GuildMember)
  })
})

function silentLogger(): Logger {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger
}

describe('logGatewayErrors', () => {
  it('exits on shardDisconnect, the event discord.js only emits when it has given up reconnecting', () => {
    const client = new EventEmitter() as unknown as Client
    const log = silentLogger()
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    logGatewayErrors(client, log)

    ;(client as unknown as EventEmitter).emit(
      'shardDisconnect',
      { code: 4004, reason: 'bad token' },
      0,
    )

    expect(log.error).toHaveBeenCalledWith(
      'discord',
      'shard disconnected for good — exiting so the container restarts',
      expect.objectContaining({ code: 4004 }),
    )
    expect(exit).toHaveBeenCalledWith(1)
    exit.mockRestore()
  })

  it('only logs on shardReconnecting, which discord.js retries on its own', () => {
    const client = new EventEmitter() as unknown as Client
    const log = silentLogger()
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    logGatewayErrors(client, log)

    ;(client as unknown as EventEmitter).emit('shardReconnecting', 0)

    expect(log.info).toHaveBeenCalledWith('discord', 'shard reconnecting', { shardId: 0 })
    expect(exit).not.toHaveBeenCalled()
    exit.mockRestore()
  })
})
