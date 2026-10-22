import { relayUpload } from '@/common/api/upload'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Thin proxy to `POST /characters/:id/prints` — issue #195, screen #196.
 * The id is checked before it becomes part of the API path; the rest of the
 * guard is the upload's.
 */
export async function POST(
  request: Request,
  context: RouteContext<'/bff/characters/[id]/prints'>,
): Promise<Response> {
  const { id } = await context.params
  if (!UUID.test(id)) {
    return Response.json({ message: 'character_not_found' }, { status: 404 })
  }
  return relayUpload(request, `/api/characters/${id}/prints`)
}
