import { AUDIT_PAGE_SIZE, type AuditEntry, type PlayerSheet, type ToolsSource } from './tools'

const HOUR = 3_600_000
const iso = (hoursAgo: number, now: number) => new Date(now - hoursAgo * HOUR).toISOString()
const uid = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`

/** Made-up players, in the contract's shapes. Names and mentions are invented. */
export function samplePlayers(now = Date.now()): PlayerSheet[] {
  const base = (
    n: number,
    name: string,
    category: string,
    reputation: number | null,
    plan: PlayerSheet['plan'],
    extra: Partial<PlayerSheet> = {},
  ): PlayerSheet => ({
    accountId: uid(n),
    characters: [{ name, category }],
    reputation,
    plan,
    discordMention: `<@2000000000000000${String(n).padStart(2, '0')}>`,
    cases: [],
    punishments: [],
    ...extra,
  })
  return [
    base(1, 'borges_fc', 'midfielder', 82, 'founder', {
      cases: [{ id: uid(101), type: 'user_report', state: 'dismissed', openedAt: iso(900, now) }],
    }),
    base(2, 'Mirabel', 'midfielder', 48, 'none', {
      cases: [
        { id: uid(102), type: 'user_report', state: 'open', openedAt: iso(61, now) },
        { id: uid(103), type: 'punishment_appeal', state: 'resolved', openedAt: iso(500, now) },
      ],
      punishments: [{ kind: 'suspension', from: iso(600, now), until: iso(430, now) }],
    }),
    base(3, 'Kestrel', 'striker', 35, 'none', {
      punishments: [{ kind: 'suspension', from: iso(30, now), until: null }],
    }),
    base(4, 'Ravenna', 'winger', 91, 'supporter'),
    base(5, 'Dornan', 'defender', 55, 'none', {
      cases: [{ id: uid(104), type: 'captain_abuse', state: 'open', openedAt: iso(12, now) }],
    }),
    base(6, 'Hollis', 'goalkeeper', null, 'none'),
  ]
}

const ACTORS = ['Luciano', 'Rafael', 'sistema']

export function sampleAudit(now = Date.now(), count = 27): AuditEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const resolved = i % 3 !== 0
    return {
      id: uid(1000 + i),
      action: resolved ? 'case_resolved' : i % 6 === 0 ? 'plan_changed' : 'role_changed',
      actorLabel: ACTORS[i % ACTORS.length]!,
      targetAccountId: uid((i % 6) + 1),
      caseId: resolved ? uid(100 + (i % 5)) : null,
      before: resolved ? 'open' : i % 6 === 0 ? 'none' : 'user',
      after: resolved ? (i % 2 ? 'resolved' : 'dismissed') : i % 6 === 0 ? 'founder' : 'moderator',
      createdAt: iso(i * 5 + 1, now),
    }
  })
}

/**
 * An in-memory source over the sample data. A plan change sticks for the life
 * of the source; an account that is not an admin gets `forbidden`, like the API.
 */
export function createSampleTools(
  { admin, delayMs = 0 }: { admin: boolean; delayMs?: number },
  players: PlayerSheet[] = samplePlayers(),
  audit: AuditEntry[] = sampleAudit(),
): ToolsSource {
  const wait = () => (delayMs > 0 ? new Promise<void>((r) => setTimeout(r, delayMs)) : undefined)
  const summary = (p: PlayerSheet) => ({
    accountId: p.accountId,
    characters: p.characters,
    reputation: p.reputation,
    plan: p.plan,
    discordMention: p.discordMention,
  })

  return {
    async searchPlayers(query) {
      await wait()
      const needle = query.trim().toLowerCase()
      if (!needle) return []
      return players
        .filter(
          (p) =>
            p.discordMention?.toLowerCase().includes(needle) ||
            p.characters.some((c) => c.name?.toLowerCase().includes(needle)),
        )
        .map(summary)
    },
    async player(accountId) {
      await wait()
      return players.find((p) => p.accountId === accountId) ?? null
    },
    async audit(filters, before) {
      await wait()
      const actor = filters.actor.trim().toLowerCase()
      const account = filters.account.trim().toLowerCase()
      const matching = audit.filter(
        (entry) =>
          (!actor || entry.actorLabel.toLowerCase().includes(actor)) &&
          (!filters.action || entry.action === filters.action) &&
          (!account || entry.targetAccountId?.toLowerCase().includes(account)),
      )
      // Newest first; the cursor is the id of the last entry already shown.
      const start = before ? matching.findIndex((entry) => entry.id === before) + 1 : 0
      const entries = matching.slice(start, start + AUDIT_PAGE_SIZE)
      const last = entries[entries.length - 1]
      const more = start + entries.length < matching.length
      return { entries, next: more && last ? last.id : null }
    },
    async metrics() {
      await wait()
      return {
        beta: [
          { key: 'matches', label: 'Partidas fechadas', value: 34, target: 30, met: true },
          { key: 'players', label: 'Jogadores ativos', value: 41, target: 40, met: true },
          { key: 'verified', label: 'Personagens verificados', value: 52, target: 60, met: false },
          {
            key: 'reports',
            label: 'Casos resolvidos no prazo (%)',
            value: 88,
            target: 90,
            met: false,
          },
          { key: 'uptime', label: 'Fila no ar (%)', value: 99, target: 95, met: true },
          {
            key: 'bot',
            label: 'Eventos entregues ao bot (%)',
            value: null,
            target: 99,
            met: false,
          },
        ],
        success: [
          { key: 'retention', label: 'Quem voltou na semana seguinte', value: 46, band: 'worked' },
          { key: 'queue', label: 'Tempo médio na fila (min)', value: 11, band: 'ambiguous' },
          { key: 'cancel', label: 'Lobbies desfeitos (%)', value: null, band: null },
        ],
      }
    },
    async setPlan(accountId, plan) {
      await wait()
      if (!admin) return 'forbidden'
      const player = players.find((p) => p.accountId === accountId)
      if (!player) return 'failed'
      player.plan = plan
      return 'ok'
    },
  }
}
