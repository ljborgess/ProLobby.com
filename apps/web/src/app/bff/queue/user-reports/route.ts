import { lobbyAction } from '../lobby-action'

/** `POST /queue/user-reports` — 4.2: someone met in a match. */
export function POST(request: Request): Promise<Response> {
  return lobbyAction(request, 'user-reports', 'POST', true)
}
