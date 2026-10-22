import { lobbyAction } from '../lobby-action'

/** `PUT /queue/invite` — #248: this human got the invite to the captain's club. */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'invite', 'PUT', false)
}
