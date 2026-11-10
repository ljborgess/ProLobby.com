import {
  CASE_TYPES,
  SECTION_KEYS,
  oldestFirst,
  type CaseDetail,
  type CasePerson,
  type CaseListItem,
  type CaseType,
  type CasesSource,
  type SectionKey,
  type SectionSummary,
} from './cases'

/** Which section each type lives in: the API's `SECTION_OF`, #307. */
export const SECTION_OF: Record<CaseType, SectionKey> = {
  character_verification: 'verifications',
  ocr_exception: 'verifications',
  gamertag_change: 'verifications',
  linked_identity_change: 'verifications',
  user_report: 'reports',
  captain_abuse: 'reports',
  negative_rating_threshold: 'reports',
  baseless_reports: 'reports',
  score_dispute: 'matches',
  possible_game_bug: 'matches',
  punishment_appeal: 'appeals',
  support_request: 'support',
  account_recovery: 'support',
  bot_delivery_failure: 'system',
}

const HOUR = 3_600_000
const ago = (hours: number, now: number) => new Date(now - hours * HOUR).toISOString()

/** Made-up cases in the contract's shapes. Names, mentions and texts are invented. */
export function sampleCases(now = Date.now()): CaseDetail[] {
  const base = (
    n: number,
    type: CaseType,
    hours: number,
    overdue: boolean,
    extra: Partial<CaseDetail> = {},
  ): CaseDetail => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    type,
    section: SECTION_OF[type],
    openedAt: ago(hours, now),
    overdue,
    origin: 'user',
    lobbyId: null,
    text: null,
    reportReason: null,
    people: [],
    ...extra,
  })
  const target = (
    name: string,
    rep: number,
    open = 0,
    resolved = 0,
    dismissed = 0,
  ): CasePerson => ({
    role: 'target',
    characters: [{ name, category: 'midfielder' }],
    reputation: rep,
    history: { open, resolved, dismissed },
    discordMention: `<@1000000000000000${String(rep).padStart(2, '0')}>`,
  })
  const opener = (name: string, rep: number): CasePerson => ({
    role: 'opened_by',
    characters: [{ name, category: 'striker' }],
    reputation: rep,
    history: { open: 1, resolved: 2, dismissed: 0 },
    discordMention: null,
  })

  return [
    base(1, 'user_report', 61, true, {
      text: 'Saiu da chamada no meio do segundo tempo e a partida ficou 3 contra 4.',
      reportReason: 'disconnect',
      lobbyId: '5b6d1f0a-2c3e-4a7b-9d10-8e4f6a1c2b3d',
      people: [opener('Torvalen', 72), target('Mirabel', 48, 1, 0, 2)],
    }),
    base(2, 'user_report', 30, false, {
      text: 'Xingou o time inteiro depois do primeiro gol.',
      reportReason: 'behavior',
      people: [opener('Ravenna', 80), target('Kestrel', 35, 0, 1, 0)],
    }),
    base(3, 'captain_abuse', 12, false, {
      origin: 'system',
      people: [target('Dornan', 55, 2, 1, 0)],
    }),
    base(4, 'score_dispute', 50, true, {
      origin: 'system',
      lobbyId: '9a0c2e4f-6b8d-4f1a-8c3e-5d7b9f1a3c5e',
      text: 'Os dois lados enviaram placares diferentes: 2 a 1 e 1 a 2.',
      people: [target('Aldric', 64), opener('Sorrel', 70)],
    }),
    base(5, 'punishment_appeal', 20, false, {
      text: 'Perdi a conexão por causa da internet, não foi de propósito.',
      people: [opener('Hollis', 41)],
    }),
    base(6, 'support_request', 8, false, {
      origin: 'discord_message',
      text: 'Não consigo vincular o Discord, aparece erro na tela.',
      people: [opener('Brannoch', 66)],
    }),
    base(7, 'bot_delivery_failure', 3, false, { origin: 'system' }),
    base(8, 'ocr_exception', 27, true, {
      origin: 'system',
      people: [opener('Wystan', 58)],
    }),
    base(9, 'gamertag_change', 5, false, {
      text: 'Mudei meu gamertag no console e preciso atualizar.',
      people: [opener('Lorcan', 75)],
    }),
  ]
}

/** An in-memory source over the sample cases: closing one removes it, a second close answers 409. */
export function createSampleSource(cases: CaseDetail[] = sampleCases(), delayMs = 0): CasesSource {
  const open = new Map(cases.map((item) => [item.id, item]))
  const wait = () => (delayMs > 0 ? new Promise<void>((r) => setTimeout(r, delayMs)) : undefined)
  const preview = (item: CaseDetail) => item.text?.slice(0, 120) ?? null

  return {
    async summary() {
      await wait()
      return SECTION_KEYS.map<SectionSummary>((key) => {
        const mine = [...open.values()].filter((item) => item.section === key)
        return {
          key,
          open: mine.length,
          types: CASE_TYPES.filter((type) => SECTION_OF[type] === key)
            .map((type) => ({ type, open: mine.filter((item) => item.type === type).length }))
            .filter((entry) => entry.open > 0),
        }
      })
    },
    async list(section, type) {
      await wait()
      const items = [...open.values()]
        .filter((item) => (!section || item.section === section) && (!type || item.type === type))
        .map<CaseListItem>((item) => ({
          id: item.id,
          type: item.type,
          section: item.section,
          openedAt: item.openedAt,
          overdue: item.overdue,
          preview: preview(item),
        }))
      return oldestFirst(items)
    },
    async detail(id) {
      await wait()
      return open.get(id) ?? null
    },
    async close(id) {
      await wait()
      if (!open.has(id)) return 'already_closed'
      open.delete(id)
      return 'closed'
    },
  }
}
