import { lobbyAction } from '../lobby-action'

/** `PUT /queue/club-full` — #248: the captain says the club filled up. */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'club-full', 'PUT', false)
}
