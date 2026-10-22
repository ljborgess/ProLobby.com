import { lobbyAction } from '../lobby-action'

/** `POST /queue/ratings` — 4.2: a teammate after a finished match. */
export function POST(request: Request): Promise<Response> {
  return lobbyAction(request, 'ratings', 'POST', true)
}
