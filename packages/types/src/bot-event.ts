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

export const botEventSchema = z.discriminatedUnion('type', [
  discordMemberLeftEventSchema,
  discordMemberJoinedEventSchema,
])

export type DiscordMemberLeftEvent = z.infer<typeof discordMemberLeftEventSchema>
export type DiscordMemberJoinedEvent = z.infer<typeof discordMemberJoinedEventSchema>
export type BotEvent = z.infer<typeof botEventSchema>
