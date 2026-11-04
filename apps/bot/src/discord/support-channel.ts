import { randomUUID } from 'node:crypto'
import { Events, type Client, type Message } from 'discord.js'
import type { BotEvent } from '@prolobby/types'

import type { Logger } from '../logger'
import { BRAND, plate, type BotMessage } from './brand'

/** Per person, per hour: enough to explain a problem, not enough to flood the panel. */
export const SUPPORT_PER_HOUR = 3
const HOUR_MS = 60 * 60 * 1000
/** The confirmation stays long enough to be read, then the channel is clean again. */
const REPLY_TTL_MS = 60_000

export type SupportOutcome = 'opened' | 'limited' | 'empty' | 'failed'

const REPLY: Record<SupportOutcome, { color: number; title: string; text: string }> = {
  opened: {
    color: BRAND.green,
    title: '✅ Caso aberto',
    text: 'A moderação responde em até 24 h, pela plataforma. Sua mensagem saiu do canal pra não ficar pública.\n*Recibido: abrimos un caso en moderación.*',
  },
  limited: {
    color: BRAND.amber,
    title: '⏳ Calma aí',
    text: `Você já abriu ${SUPPORT_PER_HOUR} casos nesta hora. Espere um pouco e escreva tudo numa mensagem só.\n*Ya abriste ${SUPPORT_PER_HOUR} casos en esta hora.*`,
  },
  empty: {
    color: BRAND.amber,
    title: '✍️ Escreva em texto',
    text: 'Anexo sozinho não abre caso: conte o problema em palavras.\n*Escribe el problema en texto.*',
  },
  failed: {
    color: BRAND.red,
    title: '⚠️ Não deu agora',
    text: 'Não conseguimos abrir o caso; tente de novo em alguns minutos. Sua mensagem ficou no canal.\n*No se pudo abrir el caso ahora.*',
  },
}

/** The answer under a support message: a short card, pinging only its author. */
export function supportReply(
  outcome: SupportOutcome,
  authorId: string,
  iconUrl?: string,
): BotMessage {
  const { color, title, text } = REPLY[outcome]
  return {
    content: `<@${authorId}>`,
    embeds: [{ author: plate('SUPORTE', iconUrl), color, title, description: text }],
  }
}

/** Who wrote recently, in memory: a restart only forgives the hour early. */
export function supportLimiter(perHour = SUPPORT_PER_HOUR) {
  const seen = new Map<string, number[]>()
  return (authorId: string, now: number): boolean => {
    const recent = (seen.get(authorId) ?? []).filter((at) => now - at < HOUR_MS)
    if (recent.length >= perHour) {
      seen.set(authorId, recent)
      return false
    }
    seen.set(authorId, [...recent, now])
    return true
  }
}

export type SupportDeps = {
  allow: (authorId: string, now: number) => boolean
  report: (event: BotEvent) => Promise<{ status: number }>
  now: () => Date
}

/** RF-061: what happens to one message in #suporte-e-denuncia. */
export async function takeSupportMessage(
  message: { authorId: string; content: string },
  deps: SupportDeps,
): Promise<SupportOutcome> {
  const content = message.content.trim().slice(0, 2000)
  if (!content) return 'empty'
  const now = deps.now()
  if (!deps.allow(message.authorId, now.getTime())) return 'limited'
  try {
    const { status } = await deps.report({
      id: randomUUID(),
      occurredAt: now.toISOString(),
      type: 'discord.support_message',
      payload: { discordId: message.authorId, content },
    })
    return status >= 200 && status < 300 ? 'opened' : 'failed'
  } catch {
    return 'failed'
  }
}

/**
 * Listens to #suporte-e-denuncia. An opened or refused message is deleted —
 * a report names people, and the case is where it belongs — and the bot
 * answers with a mention that disappears after a minute. A failure keeps the
 * message, so nothing the person wrote is lost.
 */
export function supportChannelOn(
  client: Client,
  log: Logger,
  deps: { channelId: string; report: SupportDeps['report'] },
): void {
  const allow = supportLimiter()
  client.on(Events.MessageCreate, (message: Message) => {
    if (message.channelId !== deps.channelId || message.author.bot || message.system) return
    void (async () => {
      const outcome = await takeSupportMessage(
        { authorId: message.author.id, content: message.content },
        { allow, report: deps.report, now: () => new Date() },
      )
      if (outcome !== 'failed') await message.delete().catch(() => {})
      if (!message.channel.isSendable()) return
      const reply = await message.channel.send({
        ...supportReply(outcome, message.author.id, client.user?.displayAvatarURL()),
        allowedMentions: { users: [message.author.id] },
      })
      setTimeout(() => void reply.delete().catch(() => {}), REPLY_TTL_MS).unref()
      if (outcome === 'failed') log.warn('support', 'support message did not become a case')
    })().catch((error: unknown) => {
      log.error('support', 'support message handling failed', {
        message: error instanceof Error ? error.message : String(error),
      })
    })
  })
}
