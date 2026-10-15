import { z } from 'zod'

const uuid = z.string().uuid()
const occurredAt = z.string().datetime()

/** A Discord user id: a snowflake, 17 to 20 digits. Anything else is not an id. */
const snowflake = z.string().regex(/^\d{17,20}$/)

/**
 * Bot → platform events (RF-060, issue #150) — the direction that did not exist.
 *
 * The signature is the same one the platform uses towards the bot
 * (`webhook-signature.ts`), inverted: the bot signs, the API refuses what does
 * not match. Only what the platform needs to *decide* travels here; the bot
 * reports a fact ("this Discord user left"), never a rule.
 *
 * Strict, like the platform → bot payloads: an unexpected field is a sender
 * that thinks it is sending something the receiver will never see.
 */
export const discordMemberLeftEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('discord.member_left'),
  payload: z.object({ discordId: snowflake }).strict(),
})

export const discordMemberJoinedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('discord.member_joined'),
  payload: z.object({ discordId: snowflake }).strict(),
})

/**
 * The full membership as the bot sees it right now — added in the 2026-09-23
 * review to close two gaps `discord.member_left`/`_joined` cannot: an account
 * linked while already outside the server (no "left" ever fires for it), and
 * a leave/join that happens while the bot process is down (no listener is
 * running to see it). Sent on every reconnect and on a timer
 * (`reportPresenceSnapshot`); the API treats it as the whole truth for the
 * moment it arrives, not a delta, so a dropped or duplicate delivery only
 * costs staleness until the next one.
 */
export const discordPresenceSnapshotEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('discord.presence_snapshot'),
  payload: z.object({ discordIds: z.array(snowflake) }).strict(),
})

/**
 * The bot created the three channels of a lobby (#250) after `lobby.closed`.
 * The API keeps the ids (the deletion in #251 needs them) and opens the 60 s
 * formation vote (RF-034, #249), which counts from this moment.
 */
export const lobbyChannelsCreatedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('lobby.channels_created'),
  payload: z
    .object({
      lobbyId: uuid,
      textChannelId: snowflake,
      voiceAChannelId: snowflake,
      voiceBChannelId: snowflake,
    })
    .strict(),
})

export const botEventSchema = z.discriminatedUnion('type', [
  discordMemberLeftEventSchema,
  discordMemberJoinedEventSchema,
  discordPresenceSnapshotEventSchema,
  lobbyChannelsCreatedEventSchema,
])

export type DiscordMemberLeftEvent = z.infer<typeof discordMemberLeftEventSchema>
export type DiscordMemberJoinedEvent = z.infer<typeof discordMemberJoinedEventSchema>
export type DiscordPresenceSnapshotEvent = z.infer<typeof discordPresenceSnapshotEventSchema>
export type LobbyChannelsCreatedEvent = z.infer<typeof lobbyChannelsCreatedEventSchema>
export type BotEvent = z.infer<typeof botEventSchema>
