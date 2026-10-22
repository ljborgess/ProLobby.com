import { relayUpload } from '@/common/api/upload'
import { lobbyAction } from '../lobby-action'

/** `POST /queue/report` — 4.1: the result print and the score, multipart. */
export function POST(request: Request): Promise<Response> {
  return relayUpload(request, '/api/queue/report')
}

/** `PUT /queue/report` — fixes the typed score while the other side has not reported. */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'report', 'PUT', true)
}
