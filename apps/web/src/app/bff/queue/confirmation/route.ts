import { lobbyAction } from '../lobby-action'

/** `PUT /queue/confirmation` — issue #232, the 30 s answer. */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'confirmation', 'PUT', true)
}
