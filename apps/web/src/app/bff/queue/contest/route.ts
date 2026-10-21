import { lobbyAction } from '../lobby-action'

/** `POST /queue/contest` — 4.1: a one-sided result is wrong. */
export function POST(request: Request): Promise<Response> {
  return lobbyAction(request, 'contest', 'POST', true)
}
