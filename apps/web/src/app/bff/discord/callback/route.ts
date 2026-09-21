import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { statusFromApi, type DiscordLinkStatus } from '@/modules/account/discord-link-status'

/**
 * The `redirect_uri` registered with Discord — #149.
 *
 * Discord sends the browser here with `?code&state`. This handler does not
 * decide anything: it forwards both to the API as a **POST** with the session
 * cookie, so `client_secret` never leaves the API and no GET on the API changes
 * state (item 9b of the security checklist). What makes a forged GET here
 * harmless is on the API side: the `state` is single use and bound to the
 * session that started the flow.
 *
 * It answers with a redirect to the screen, carrying only a closed status code —
 * never the `code`, the `state` or anything Discord sent.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const code = params.get('code')
  const state = params.get('state')

  // The person pressed "cancel" on Discord's screen.
  if (params.get('error')) {
    return backToScreen('denied')
  }

  if (!code || !state) {
    return backToScreen('error')
  }

  const cookie = request.headers.get('cookie')
  let apiResponse: Response
  try {
    apiResponse = await apiFetch('/api/accounts/discord-links/callbacks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ state, code }),
      forwardedIp: forwardedIpFrom(request),
    })
  } catch {
    return backToScreen('error')
  }

  if (apiResponse.status === 401) {
    return redirect('/login')
  }

  const body = (await apiResponse.json().catch(() => undefined)) as { message?: string } | undefined

  return backToScreen(statusFromApi(apiResponse.status, body?.message))
}

function backToScreen(status: DiscordLinkStatus): Response {
  return redirect(`/account/discord?status=${status}`)
}

// A relative `Location`: behind the tunnel `request.url` carries the internal
// host, and building an absolute address from it would send the person there.
function redirect(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      location,
      // The URL Discord redirected to held a `code`; do not let it ride along.
      'referrer-policy': 'no-referrer',
      'cache-control': 'private, no-store',
    },
  })
}
