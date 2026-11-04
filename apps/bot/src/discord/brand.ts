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
}

export const webLink = (webUrl: string | undefined, path: string): string =>
  `${(webUrl ?? 'https://prolobby.com.br').replace(/\/$/, '')}${path}`

/** The broadcast plate on top of every embed: PROLOBBY · SEGMENT. */
export const plate = (segment: string, iconUrl?: string): APIEmbed['author'] => ({
  name: `PROLOBBY · ${segment}`,
  ...(iconUrl ? { icon_url: iconUrl } : {}),
})

/** One row of link buttons: links only, the bot never takes a player action. */
export function linkRow(
  buttons: { label: string; url: string; emoji?: string }[],
): APIActionRowComponent<APIButtonComponent> {
  return {
    type: ComponentType.ActionRow,
    components: buttons.map(({ label, url, emoji }) => ({
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      label,
      url,
      ...(emoji ? { emoji: { name: emoji } } : {}),
    })),
  }
}
