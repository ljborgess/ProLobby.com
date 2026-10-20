import { lobbyAction } from '../lobby-action'

/** `PUT /queue/formation-vote` — #249: vote, or change the vote, within the 60 s. */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'formation-vote', 'PUT', true)
}
