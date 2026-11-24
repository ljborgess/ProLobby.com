import type { CaseDetail, CaseListItem, CasesSource, SectionSummary } from './cases'
import type {
  AuditPage,
  Metrics,
  PlanResult,
  PlayerSheet,
  PlayerSummary,
  ToolsSource,
} from './tools'
import { MIN_SEARCH_LENGTH } from './tools'

const BASE = '/bff/moderation'

async function get<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const query = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, value]) => value !== ''),
  ).toString()
  const response = await fetch(`${BASE}/${path}${query ? `?${query}` : ''}`, {
    cache: 'no-store',
  })
  if (response.status === 404) return null
  // Any other failure throws, so the screen shows its error and retry.
  if (!response.ok) throw new Error(`moderation ${path}: HTTP ${response.status}`)
  return (await response.json()) as T
}

async function post(path: string, body: unknown): Promise<{ status: number; message: string }> {
  const response = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  let message = ''
  try {
    message = ((await response.json()) as { message?: string }).message ?? ''
  } catch {
    // 204 has no body.
  }
  return { status: response.status, message }
}

/** The case queue, read and written through `/bff/moderation/cases` (#307). */
export function createBffCasesSource(): CasesSource {
  return {
    async summary() {
      const body = await get<{ sections: SectionSummary[] }>('cases/summary')
      if (!body) throw new Error('moderation summary: not found')
      // The API lists every type, even with nothing open; the filter shows only what has cases.
      return body.sections.map((section) => ({
        ...section,
        types: section.types.filter((entry) => entry.open > 0),
      }))
    },
    async list(section, type) {
      return (
        (await get<CaseListItem[]>('cases', { section: section ?? '', type: type ?? '' })) ?? []
      )
    },
    detail: (id) => get<CaseDetail>(`cases/${id}`),
    async close(id, closure) {
      const { status, message } = await post(`cases/${id}/closures`, closure)
      if (status === 204) return 'closed'
      if (status === 409 && message === 'case_already_closed') return 'already_closed'
      return 'failed'
    },
  }
}

/** The management sections, through `/bff/moderation/*` (#312, #313). */
export function createBffToolsSource(): ToolsSource {
  return {
    async searchPlayers(query) {
      const term = query.trim()
      if (term.length < MIN_SEARCH_LENGTH) return []
      return (await get<PlayerSummary[]>('players', { q: term })) ?? []
    },
    player: (accountId) => get<PlayerSheet>(`players/${accountId}`),
    async audit(filters, before) {
      const page = await get<AuditPage>('audit', {
        actor: filters.actor,
        action: filters.action,
        account: filters.account,
        before: before ?? '',
      })
      if (!page) throw new Error('moderation audit: not found')
      return page
    },
    async metrics() {
      const metrics = await get<Metrics>('metrics')
      if (!metrics) throw new Error('moderation metrics: not found')
      return metrics
    },
    async setPlan(accountId, plan, pixReference): Promise<PlanResult> {
      const { status, message } = await post(`players/${accountId}/plan`, {
        plan,
        ...(plan === 'none' ? {} : { pixReference }),
      })
      if (status >= 200 && status < 300) return 'ok'
      if (status === 403 && message === 'admin_only') return 'forbidden'
      if (status === 409 && message === 'account_closed') return 'account_closed'
      if (status === 409 && message === 'already_founder') return 'already_founder'
      return 'failed'
    },
  }
}
