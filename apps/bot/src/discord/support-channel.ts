import { randomUUID } from 'node:crypto'
import { Events, type Client, type Message } from 'discord.js'
import type { BotEvent } from '@prolobby/types'

import type { Logger } from '../logger'
import { BRAND, linkRows, plate, webLink, type BotMessage } from './brand'

/** Per person, per hour: enough to explain a problem, not enough to flood the panel. */
export const SUPPORT_PER_HOUR = 3
const HOUR_MS = 60 * 60 * 1000
/** The confirmation stays long enough to be read, then the channel is clean again. */
const REPLY_TTL_MS = 60_000

/**
 * `opened`: the case has everything, the public copy goes. `kept`: the case is
 * open but points back to the message, which stays — an attachment (a print
 * as evidence) or text past 2000 characters cannot travel in the case.
 */
export type SupportOutcome = 'opened' | 'kept' | 'limited' | 'empty' | 'failed'

/** Every answer says how the reply comes back, and how to be reachable if not linked. */
const REACH =
  'A resposta vem em até 24 h, pela plataforma ou por mensagem aqui no Discord. Ainda não vinculou a conta? Vincule pra acompanhar pela plataforma.'

const REPLY: Record<SupportOutcome, { color: number; title: string; text: string }> = {
  opened: {
    color: BRAND.green,
    title: '✅ Caso aberto',
    text: `${REACH} Sua mensagem saiu do canal pra não ficar pública.
*Recibido: abrimos un caso en moderación.*`,
  },
  kept: {
    color: BRAND.green,
    title: '✅ Caso aberto',
    text: `${REACH} Sua mensagem ficou no canal porque tem anexo ou é longa demais pro caso: a moderação lê por aqui.
*Recibido: abrimos un caso en moderación.*`,
  },
  limited: {
    color: BRAND.amber,
    title: '⏳ Calma aí',
    text: `Você já abriu ${SUPPORT_PER_HOUR} casos nesta hora. Esta mensagem não virou caso; espere um pouco e escreva tudo numa mensagem só.
*Ya abriste ${SUPPORT_PER_HOUR} casos en esta hora.*`,
  },
  empty: {
    color: BRAND.amber,
    title: '✍️ Escreva em texto',
    text: 'Conte o problema em palavras ou mande um print junto.\n*Escribe el problema en texto.*',
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
  opts: { iconUrl?: string; linkUrl?: string } = {},
): BotMessage {
  const { color, title, text } = REPLY[outcome]
  return {
    content: `<@${authorId}>`,
    embeds: [{ author: plate('SUPORTE', opts.iconUrl), color, title, description: text }],
    components:
      outcome === 'opened' || outcome === 'kept'
        ? linkRows([{ label: 'Vincular Discord', url: opts.linkUrl, emoji: '🔗' }])
        : [],
  }
}

/**
 * Who opened a case recently, in memory: a restart only forgives the hour
 * early. `refund` gives a slot back when the case did not open — a platform
 * outage must not use up someone's hour.
 */
export function supportLimiter(perHour = SUPPORT_PER_HOUR) {
  const seen = new Map<string, number[]>()
  return {
    take(authorId: string, now: number): boolean {
      const recent = (seen.get(authorId) ?? []).filter((at) => now - at < HOUR_MS)
      if (recent.length >= perHour) {
        seen.set(authorId, recent)
        return false
      }
      seen.set(authorId, [...recent, now])
      return true
    },
    refund(authorId: string, now: number): void {
      const recent = seen.get(authorId) ?? []
      const at = recent.lastIndexOf(now)
      if (at >= 0) recent.splice(at, 1)
    },
  }
}

export type SupportDeps = {
  limiter: ReturnType<typeof supportLimiter>
  report: (event: BotEvent) => Promise<{ status: number }>
  now: () => Date
}

const CASE_MAX = 2000

/** RF-061: what happens to one message in #suporte-e-denuncia. */
export async function takeSupportMessage(
  message: { authorId: string; content: string; attachments: number; url: string },
  deps: SupportDeps,
): Promise<SupportOutcome> {
  const text = message.content.trim()
  if (!text && message.attachments === 0) return 'empty'
  const keep = message.attachments > 0 || text.length > CASE_MAX
  const pointer = keep
    ? `

[Mensagem no Discord${message.attachments ? ` com ${message.attachments} anexo(s)` : ''}: ${message.url}]`
    : ''
  const content = `${text.slice(0, CASE_MAX - pointer.length)}${pointer}`.trim()

  const now = deps.now()
  if (!deps.limiter.take(message.authorId, now.getTime())) return 'limited'
  try {
    const { status } = await deps.report({
      id: randomUUID(),
      occurredAt: now.toISOString(),
      type: 'discord.support_message',
      payload: { discordId: message.authorId, content },
    })
    if (status >= 200 && status < 300) return keep ? 'kept' : 'opened'
  } catch {
    // falls through to the refund
  }
  deps.limiter.refund(message.authorId, now.getTime())
  return 'failed'
}

/**
 * Listens to #suporte-e-denuncia. Only a message whose case holds all of it is
 * deleted — a report names people, and the case is where it belongs. Anything
 * not fully in a case (limited, failed, with an attachment) stays, so nothing
 * the person wrote is lost. The bot answers with a mention that disappears
 * after a minute.
 */
export function supportChannelOn(
  client: Client,
  log: Logger,
  deps: { channelId: string; report: SupportDeps['report']; webUrl?: string },
): void {
  const limiter = supportLimiter()
  client.on(Events.MessageCreate, (message: Message) => {
    if (message.channelId !== deps.channelId || message.author.bot || message.system) return
    void (async () => {
      const outcome = await takeSupportMessage(
        {
          authorId: message.author.id,
          content: message.content,
          attachments: message.attachments.size,
          url: message.url,
        },
        { limiter, report: deps.report, now: () => new Date() },
      )
      if (outcome === 'opened' || outcome === 'empty') await message.delete().catch(() => {})
      if (!message.channel.isSendable()) return
      const reply = await message.channel.send({
        ...supportReply(outcome, message.author.id, {
          iconUrl: client.user?.displayAvatarURL(),
          linkUrl: webLink(deps.webUrl, '/account/discord'),
        }),
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
