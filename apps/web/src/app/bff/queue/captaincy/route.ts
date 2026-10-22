import { lobbyAction } from '../lobby-action'

/** `PUT /queue/captaincy` — #247: confirm, decline or "o clube encheu". */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'captaincy', 'PUT', true)
}
