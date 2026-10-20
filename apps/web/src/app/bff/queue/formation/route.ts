import { lobbyAction } from '../lobby-action'

/** `PUT /queue/formation` — #249: the captain picks when the side tied or nobody voted. */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'formation', 'PUT', true)
}
