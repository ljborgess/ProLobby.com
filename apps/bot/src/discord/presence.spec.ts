import { EventEmitter } from 'node:events'
import type { Client } from 'discord.js'
import type { BotEvent } from '@prolobby/types'

import type { Logger } from '../logger'
import { reportPresence } from './presence'

/**
 * RF-060, issue #150 — the bot → platform direction.
 *
 * A `Client` is an `EventEmitter`, so the real listener wiring is exercised
 * here: the test emits what Discord emits and asserts on what leaves for the
 * API. Nothing is stubbed between the two.
 */

type Emitting = Client & EventEmitter

function member(id: string, options: { bot?: boolean; guildId?: string } = {}) {
  return {
    user: { id, bot: options.bot ?? false },
    guild: { id: options.guildId ?? '111111111111111111' },
  }
}

function silentLogger(): Logger {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger
}

describe('reportPresence', () => {
  const originalGuild = process.env.DISCORD_GUILD_ID

  afterEach(() => {
    if (originalGuild === undefined) {
      delete process.env.DISCORD_GUILD_ID
    } else {
      process.env.DISCORD_GUILD_ID = originalGuild
    }
  })

  const wire = () => {
    const client = new EventEmitter() as Emitting
    const post = jest
      .fn<Promise<{ status: number }>, [BotEvent]>()
      .mockResolvedValue({ status: 204 })
    reportPresence(client, silentLogger(), post)
    return { client, post }
  }

  it('reports a leave as discord.member_left, carrying only the Discord id', async () => {
    const { client, post } = wire()

    client.emit('guildMemberRemove', member('123456789012345678'))
    await Promise.resolve()

    expect(post).toHaveBeenCalledTimes(1)
    const event = post.mock.calls[0]![0]
    expect(event.type).toBe('discord.member_left')
    expect(event.payload).toEqual({ discordId: '123456789012345678' })
    // The platform decides what leaving means; the bot reports a fact and
    // sends nothing that hints at who has an account.
    expect(Object.keys(event.payload)).toEqual(['discordId'])
  })

  it('reports a rejoin as discord.member_joined', async () => {
    const { client, post } = wire()

    client.emit('guildMemberAdd', member('123456789012345678'))
    await Promise.resolve()

    expect(post.mock.calls[0]![0].type).toBe('discord.member_joined')
  })

  it('gives every event its own id, so a redelivery is distinguishable from a new one', async () => {
    const { client, post } = wire()

    client.emit('guildMemberRemove', member('123456789012345678'))
    client.emit('guildMemberAdd', member('123456789012345678'))
    await Promise.resolve()

    const ids = post.mock.calls.map(([event]) => event.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('ignores other bots — they are not people with accounts', async () => {
    const { client, post } = wire()

    client.emit('guildMemberRemove', member('123456789012345678', { bot: true }))
    await Promise.resolve()

    expect(post).not.toHaveBeenCalled()
  })

  it('ignores another guild when DISCORD_GUILD_ID names the real one', async () => {
    process.env.DISCORD_GUILD_ID = '111111111111111111'
    const { client, post } = wire()

    client.emit(
      'guildMemberRemove',
      member('123456789012345678', { guildId: '999999999999999999' }),
    )
    await Promise.resolve()

    // The footgun this closes: a bot invited to a test server alongside the
    // live one would otherwise block real accounts.
    expect(post).not.toHaveBeenCalled()
  })

  it('reports from any guild when DISCORD_GUILD_ID is unset', async () => {
    delete process.env.DISCORD_GUILD_ID
    const { client, post } = wire()

    client.emit(
      'guildMemberRemove',
      member('123456789012345678', { guildId: '999999999999999999' }),
    )
    await Promise.resolve()

    expect(post).toHaveBeenCalledTimes(1)
  })

  it('survives the platform being unreachable, instead of taking the bot down', async () => {
    const client = new EventEmitter() as Emitting
    const log = silentLogger()
    const post = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    reportPresence(client, log, post)

    client.emit('guildMemberRemove', member('123456789012345678'))
    await new Promise((resolve) => setImmediate(resolve))

    // An unhandled rejection here would kill the process under the boot
    // handler added in #168, taking the gateway down over one missed event.
    expect(log.error).toHaveBeenCalledWith(
      'presence',
      'could not reach the platform',
      expect.objectContaining({ type: 'discord.member_left' }),
    )
  })

  it('logs a refusal instead of pretending the report landed', async () => {
    const client = new EventEmitter() as Emitting
    const log = silentLogger()
    const post = jest.fn().mockResolvedValue({ status: 401 })
    reportPresence(client, log, post)

    client.emit('guildMemberRemove', member('123456789012345678'))
    await new Promise((resolve) => setImmediate(resolve))

    expect(log.error).toHaveBeenCalledWith(
      'presence',
      'platform refused the event',
      expect.objectContaining({ status: 401 }),
    )
    expect(log.info).not.toHaveBeenCalled()
  })
})
