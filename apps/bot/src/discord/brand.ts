import {
  ButtonStyle,
  ComponentType,
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIEmbed,
} from 'discord.js'

/**
 * The bot speaks with the product's look (DESIGN.md, "Cabine de Transmissão"):
 * the green that means "on air", the stadium amber for "wait", the error red.
 * Every message is an embed with the same header, so the server reads like
 * the same broadcast as the site.
 */
export const BRAND = {
  green: 0x22c55e,
  amber: 0xf5b841,
  red: 0xf26d6d,
} as const

/** What a handler hands to Discord: plain JSON, so it is testable without a client. */
export type BotMessage = {
  content?: string
  embeds: APIEmbed[]
  components?: APIActionRowComponent<APIButtonComponent>[]
  /** Pictures from `cards.ts`, shown by the embed as `attachment://name`; `description` is the alt text. */
  files?: { attachment: Buffer; name: string; description: string }[]
}

/** A picture attached to the message and shown inside its embed. */
export function picture(name: string, png: Buffer, alt: string) {
  return {
    image: { url: `attachment://${name}` },
    file: { attachment: png, name, description: alt },
  }
}

/** Without `WEB_URL` there is no link: a test bot must never send people to production. */
export const webLink = (webUrl: string | undefined, path: string): string | undefined =>
  webUrl ? `${webUrl.replace(/\/$/, '')}${path}` : undefined

/** The broadcast plate on top of every embed: PROLOBBY · SEGMENT. */
export const plate = (segment: string, iconUrl?: string): APIEmbed['author'] => ({
  name: `PROLOBBY · ${segment}`,
  ...(iconUrl ? { icon_url: iconUrl } : {}),
})

/**
 * The link buttons under a card: links only, the bot never takes a player
 * action. A button without a URL is dropped, and no row is returned when none
 * is left — Discord refuses an empty row.
 */
export function linkRows(
  buttons: { label: string; url?: string; emoji?: string }[],
): APIActionRowComponent<APIButtonComponent>[] {
  const linked = buttons.filter(
    (button): button is { label: string; url: string; emoji?: string } => Boolean(button.url),
  )
  if (linked.length === 0) return []
  return [
    {
      type: ComponentType.ActionRow,
      components: linked.map(({ label, url, emoji }) => ({
        type: ComponentType.Button,
        style: ButtonStyle.Link,
        label,
        url,
        ...(emoji ? { emoji: { name: emoji } } : {}),
      })),
    },
  ]
}
