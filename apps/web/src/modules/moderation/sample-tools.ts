import {
  AUDIT_PAGE_SIZE,
  MIN_SEARCH_LENGTH,
  type AuditEntry,
  type PlayerSheet,
  type ToolsSource,
} from './tools'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const iso = (hoursAgo: number, now: number) => new Date(now - hoursAgo * HOUR).toISOString()
const uid = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`

/** Made-up players, in the contract's shapes. Names and mentions are invented. */
export function samplePlayers(now = Date.now()): PlayerSheet[] {
  const base = (
    n: number,
    name: string,
    category: string,
    reputation: number,
    plan: PlayerSheet['plan'],
    extra: Partial<PlayerSheet> = {},
  ): PlayerSheet => ({
    accountId: uid(n),
    characters: [{ name, category }],
    reputation,
    plan,
    discordMention: `<@2000000000000000${String(n).padStart(2, '0')}>`,
    state: 'active',
    planExpiresAt: null,
    cases: [],
    punishments: [],
    ...extra,
  })
  return [
    base(1, 'borges_fc', 'midfielder', 82, 'founder', {
      cases: [{ id: uid(101), type: 'user_report', state: 'dismissed', openedAt: iso(900, now) }],
    }),
    base(2, 'Mirabel', 'midfielder', 48, 'none', {
      state: 'suspended',
      cases: [
        { id: uid(102), type: 'user_report', state: 'open', openedAt: iso(61, now) },
        { id: uid(103), type: 'punishment_appeal', state: 'resolved', openedAt: iso(500, now) },
      ],
      punishments: [{ kind: 'suspension', openedAt: iso(600, now), decision: 'resolved' }],
    }),
    base(3, 'Kestrel', 'striker', 35, 'none', {
      state: 'banned',
      punishments: [{ kind: 'ban', openedAt: iso(30, now), decision: null }],
    }),
    base(4, 'Ravenna', 'winger', 91, 'supporter', {
      planExpiresAt: new Date(now + 12 * DAY).toISOString(),
    }),
    base(5, 'Dornan', 'defender', 55, 'none', {
      cases: [{ id: uid(104), type: 'captain_abuse', state: 'open', openedAt: iso(12, now) }],
    }),
    base(6, 'Hollis', 'goalkeeper', 50, 'none'),
  ]
}

/** The moderators of the sample audit: an account id each, as the API's `actorId`. */
export const SAMPLE_ACTORS = [
  { id: uid(901), label: 'Luciano' },
  { id: uid(902), label: 'Rafael' },
  { id: null, label: 'sistema' },
] as const

export function sampleAudit(now = Date.now(), count = 27): AuditEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const resolved = i % 3 !== 0
    const actor = SAMPLE_ACTORS[i % SAMPLE_ACTORS.length]!
    return {
      id: uid(1000 + i),
      action: resolved ? 'case_resolved' : i % 6 === 0 ? 'plan_changed' : 'role_changed',
      actorId: actor.id,
      actorLabel: actor.label,
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
 * of the source and follows the API's rules: only an admin (403 otherwise),
 * a banned account is closed (409), a Founder stays Founder (409), a renewed
 * Supporter gets 30 days on top of what is left.
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
      if (needle.length < MIN_SEARCH_LENGTH) return []
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
      const matching = audit.filter(
        (entry) =>
          (!filters.actor || entry.actorId === filters.actor) &&
          (!filters.action || entry.action === filters.action) &&
          (!filters.account || entry.targetAccountId === filters.account),
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
      // The keys and targets of the API (moderation-insights.service.ts).
      return {
        beta: [
          { key: 'matches_completed', value: 34, target: 10, met: true },
          { key: 'announced_night_closed', value: null, target: 1, met: false },
          { key: 'unannounced_night_closed', value: null, target: 1, met: false },
          { key: 'strangers_share', value: 38, target: 50, met: false },
          { key: 'ocr_first_pass', value: 84, target: 80, met: true },
          { key: 'lobbies_cancelled_by_bug', value: 0, target: 0, met: true },
        ],
        success: [
          { key: 'matches_per_week', value: 12, band: 'worked' },
          { key: 'confirmed_without_dispute', value: 78, band: 'ambiguous' },
          { key: 'returned_for_second', value: null, band: null },
        ],
      }
    },
    async setPlan(accountId, plan) {
      await wait()
      if (!admin) return 'forbidden'
      const player = players.find((p) => p.accountId === accountId)
      if (!player) return 'failed'
      if (player.state === 'banned') return 'account_closed'
      if (player.plan === 'founder' && plan === 'supporter') return 'already_founder'
      const now = Date.now()
      if (plan === 'supporter') {
        const left = player.planExpiresAt ? Math.max(0, Date.parse(player.planExpiresAt) - now) : 0
        player.planExpiresAt = new Date(now + left + 30 * DAY).toISOString()
      } else {
        player.planExpiresAt = null
      }
      player.plan = plan
      return 'ok'
    },
  }
}
