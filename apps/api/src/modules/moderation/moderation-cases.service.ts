import { EntityManager, raw } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { decryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { Account } from '../account/account.entity'
import { Character, CharacterState } from '../character/character.entity'
import { UserReportService } from '../queue/user-report.service'
import { AuditAction, recordAudit } from './audit-entry.entity'
import type { CloseCaseDto } from './dto/close-case.dto'
import { ModerationCase } from './moderation-case.entity'
import { ModerationCaseState, ModerationCaseType } from './moderation-case.enums'
import {
  DISMISSED_REASONS,
  GOAL_HOURS,
  ModerationSection,
  QUEUED_TYPES,
  REASON_LABEL,
  RESOLVED_REASONS,
  SECTION_OF,
  typesOf,
} from './moderation-sections'

const PAGE = 100
const PREVIEW = 140
const HOUR_MS = 60 * 60 * 1000

export type SectionSummary = {
  key: ModerationSection
  open: number
  types: { type: ModerationCaseType; open: number }[]
}

export type CaseListItem = {
  id: string
  type: ModerationCaseType
  section: ModerationSection
  openedAt: Date
  overdue: boolean
  preview: string | null
}

export type CasePerson = {
  role: 'opened_by' | 'target'
  characters: { name: string | null; category: string }[]
  reputation: number | null
  history: { open: number; resolved: number; dismissed: number }
  discordMention: string | null
}

export type CaseDetail = Omit<CaseListItem, 'preview'> & {
  origin: string
  lobbyId: string | null
  text: string | null
  reportReason: string | null
  people: CasePerson[]
}

/**
 * The moderation panel by section (#306, #307): every open case a moderator
 * can act on, read and closed here. Character verification keeps its own
 * flow (`moderation/character-verifications`), which decides with the print.
 *
 * What a moderator sees of a person is what judging needs — characters,
 * reputation, case history, a Discord mention — never e-mail or birth date
 * (docs/produto/04-governanca/02-lgpd.md). Nobody sees or closes a case about
 * themselves, the same rule the verification queue applies.
 */
@Injectable()
export class ModerationCasesService {
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(
    private readonly em: EntityManager,
    private readonly userReports: UserReportService,
  ) {}

  async summary(moderatorId: string): Promise<SectionSummary[]> {
    const rows: { type: ModerationCaseType; open: string }[] = await this.em
      .fork()
      .createQueryBuilder(ModerationCase)
      .select(['type', raw('count(*) as open')])
      .where({
        state: ModerationCaseState.OPEN,
        type: { $in: QUEUED_TYPES },
        $or: [{ targetAccount: null }, { targetAccount: { $ne: moderatorId } }],
      })
      .groupBy('type')
      .execute()
    const openOf = new Map(rows.map((row) => [row.type, Number(row.open)]))
    return Object.values(ModerationSection).map((key) => {
      const types = typesOf(key).map((type) => ({ type, open: openOf.get(type) ?? 0 }))
      return { key, open: types.reduce((sum, t) => sum + t.open, 0), types }
    })
  }

  async list(
    moderatorId: string,
    section?: ModerationSection,
    type?: ModerationCaseType,
    now: Date = new Date(),
  ): Promise<CaseListItem[]> {
    const allowed = section ? typesOf(section) : QUEUED_TYPES
    if (type && !allowed.includes(type)) return []
    const cases = await this.em.fork().find(
      ModerationCase,
      {
        type: { $in: type ? [type] : allowed },
        state: ModerationCaseState.OPEN,
        $or: [{ targetAccount: null }, { targetAccount: { $ne: moderatorId } }],
      },
      { orderBy: { openedAt: 'asc' }, limit: PAGE },
    )
    return cases.map((moderationCase) => ({
      ...this.head(moderationCase, now),
      preview: clip(textOf(moderationCase)),
    }))
  }

  async detail(moderatorId: string, caseId: string, now: Date = new Date()): Promise<CaseDetail> {
    const em = this.em.fork()
    const moderationCase = await this.findOwnable(em, moderatorId, caseId)
    const people: CasePerson[] = []
    if (moderationCase.openedBy) {
      people.push(await this.person(em, 'opened_by', moderationCase.openedBy.id))
    } else if (moderationCase.discordIdEncrypted) {
      // Support from someone with no account: only the way to reach them.
      people.push({
        role: 'opened_by',
        characters: [],
        reputation: null,
        history: { open: 0, resolved: 0, dismissed: 0 },
        discordMention: this.mention(moderationCase.discordIdEncrypted),
      })
    }
    if (moderationCase.targetAccount) {
      people.push(await this.person(em, 'target', moderationCase.targetAccount.id))
    }
    return {
      ...this.head(moderationCase, now),
      origin: moderationCase.origin,
      lobbyId: moderationCase.lobbyId ?? null,
      text: textOf(moderationCase),
      reportReason: moderationCase.reportReason ?? null,
      people,
    }
  }

  /**
   * Closes a case with one ready reason and an optional note. The audit entry
   * goes in the same unit of work as the change, so neither exists without the
   * other. Dismissing a report counts towards RF-069 inside that same work.
   */
  async close(
    moderatorId: string,
    caseId: string,
    dto: CloseCaseDto,
    now: Date = new Date(),
  ): Promise<void> {
    const allowed = dto.outcome === 'resolved' ? RESOLVED_REASONS : DISMISSED_REASONS
    if (!allowed.includes(dto.reason)) throw new BadRequestException('reason_not_for_outcome')

    await this.em.fork().transactional(async (em) => {
      const moderationCase = await this.findOwnable(em, moderatorId, caseId)
      if (moderationCase.type === ModerationCaseType.CHARACTER_VERIFICATION) {
        throw new ConflictException('use_verification_flow')
      }
      if (moderationCase.state !== ModerationCaseState.OPEN) {
        throw new ConflictException('case_already_closed')
      }
      const note = dto.note?.trim() || null
      moderationCase.state =
        dto.outcome === 'resolved' ? ModerationCaseState.RESOLVED : ModerationCaseState.DISMISSED
      moderationCase.resolvedBy = em.getReference(Account, moderatorId)
      moderationCase.resolvedAt = now
      moderationCase.decision = note
        ? `${REASON_LABEL[dto.reason]}. ${note}`
        : REASON_LABEL[dto.reason]
      recordAudit(em, {
        action: AuditAction.CASE_RESOLVED,
        actorId: moderatorId,
        actorLabel: 'moderator',
        caseId: moderationCase.id,
        targetAccountId: moderationCase.targetAccount?.id,
        before: { state: ModerationCaseState.OPEN },
        after: { state: moderationCase.state, reason: dto.reason, note },
      })
      await em.flush()
      if (moderationCase.state === ModerationCaseState.DISMISSED) {
        await this.userReports.afterDismissal(em, moderationCase, now)
      }
    })
  }

  /** A queued case, and never one about the moderator asking. */
  private async findOwnable(
    em: EntityManager,
    moderatorId: string,
    caseId: string,
  ): Promise<ModerationCase> {
    const moderationCase = await em.findOne(ModerationCase, { id: caseId })
    if (!moderationCase || !SECTION_OF[moderationCase.type]) {
      throw new NotFoundException('case_not_found')
    }
    if (moderationCase.targetAccount?.id === moderatorId) {
      throw new ForbiddenException('own_case')
    }
    return moderationCase
  }

  private head(moderationCase: ModerationCase, now: Date) {
    const section = SECTION_OF[moderationCase.type]!
    return {
      id: moderationCase.id,
      type: moderationCase.type,
      section,
      openedAt: moderationCase.openedAt,
      overdue: now.getTime() - moderationCase.openedAt.getTime() > GOAL_HOURS[section] * HOUR_MS,
    }
  }

  private async person(
    em: EntityManager,
    role: CasePerson['role'],
    accountId: string,
  ): Promise<CasePerson> {
    const [account, characters, cases] = await Promise.all([
      em.findOneOrFail(Account, { id: accountId }),
      em.find(
        Character,
        {
          account: accountId,
          state: { $in: [CharacterState.PENDING_VERIFICATION, CharacterState.VERIFIED] },
        },
        { orderBy: { category: 'asc' } },
      ),
      em.find(ModerationCase, { targetAccount: accountId }, { fields: ['state'] }),
    ])
    const count = (state: ModerationCaseState) => cases.filter((c) => c.state === state).length
    return {
      role,
      characters: characters.map((character) => ({
        name: character.name ?? null,
        category: character.category,
      })),
      reputation: account.reputation,
      history: {
        open: count(ModerationCaseState.OPEN),
        resolved: count(ModerationCaseState.RESOLVED),
        dismissed: count(ModerationCaseState.DISMISSED),
      },
      discordMention: account.discordIdEncrypted ? this.mention(account.discordIdEncrypted) : null,
    }
  }

  /** `<@id>`: Discord renders it as the person, and the moderator can DM from there. */
  private mention(encrypted: Buffer): string {
    return `<@${decryptAtRest(this.encryptionKey, encrypted).toString()}>`
  }
}

function textOf(moderationCase: ModerationCase): string | null {
  return moderationCase.reportMessage ?? moderationCase.appealMessage ?? null
}

function clip(text: string | null): string | null {
  if (!text) return null
  return text.length > PREVIEW ? `${text.slice(0, PREVIEW - 1)}…` : text
}
