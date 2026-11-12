import { apiFetch } from '@/common/api/client'
import { relay } from '@/common/api/proxy-response'

/**
 * Public liveness probe for external uptime monitors.
 *
 * The API already answers `GET /api/health` with `{"status":"ok"}`, but it
 * lives on the Docker network only: the tunnel exposes the web app alone and
 * answers everything else with `http_status:404` (deploy/cloudflared.yml).
 * A monitor pointed at any API path therefore saw a 404 and had to accept it
 * as "up" — which a dead API, or the tunnel's own fallback, also returns.
 *
 * This relays the real check, so the monitor sees 200 + `"status":"ok"` only
 * when web, API and the hop between them all work; API down is a 502
 * (`relay`'s `api_unavailable`). No cookie or forwarded IP: the probe is
 * anonymous, and the API's health route skips the rate limiter on purpose.
 */
export function GET(): Promise<Response> {
  return relay(apiFetch('/api/health', { cache: 'no-store' }))
}
