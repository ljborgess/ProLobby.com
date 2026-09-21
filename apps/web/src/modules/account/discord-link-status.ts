/**
 * What the callback tells the screen, carried in `?status=` after the redirect.
 *
 * A closed list and never free text: the value comes back in a URL, so the page
 * only ever renders a message it picked itself from this list.
 */
export const DISCORD_LINK_STATUSES = [
  'linked',
  'denied',
  'invalid_state',
  'blocked',
  'already_linked',
  'account_already_linked',
  'unavailable',
  'error',
] as const

export type DiscordLinkStatus = (typeof DISCORD_LINK_STATUSES)[number]

export function isDiscordLinkStatus(value: string | undefined): value is DiscordLinkStatus {
  return DISCORD_LINK_STATUSES.includes(value as DiscordLinkStatus)
}

/** Maps the API's answer to the callback onto a status the screen can show. */
export function statusFromApi(httpStatus: number, message: string | undefined): DiscordLinkStatus {
  if (httpStatus === 204) return 'linked'
  if (httpStatus === 400 && message === 'invalid_state') return 'invalid_state'
  if (httpStatus === 403 && message === 'discord_link_blocked') return 'blocked'
  if (httpStatus === 409 && message === 'discord_already_linked') return 'already_linked'
  if (httpStatus === 409 && message === 'account_already_linked') return 'account_already_linked'
  if (httpStatus === 503) return 'unavailable'

  return 'error'
}
