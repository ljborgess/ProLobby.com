import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { readFile } from 'node:fs/promises'

import { isUniqueViolation } from '../../common/database/postgres-error'
import {
  decryptAtRest,
  encryptAtRest,
  readEvidenceEncryptionKey,
} from '../../common/security/evidence-encryption'
import { hashGamertag, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { Account } from '../account/account.entity'
import { detectRealImageType } from '../account/evidence-image'
import { BlockedIdentity } from '../moderation/blocked-identity.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from '../moderation/moderation-case.enums'
import { archetypeFitsCategory, type Archetype, type CharacterCategory } from './archetype'
import { ACTIVE_CHARACTER_STATES, Character, CharacterState } from './character.entity'
import type { VerificationDecisionDto } from './dto/verification-decision.dto'
import { PlatformGamertag, VERIFIED_GAMERTAG_UNIQUE_INDEX } from './platform-gamertag.entity'
import { PrintRejection, PrintSubmission, PrintSubmissionStatus } from './print-submission.entity'

/**
 * What the moderator needs to judge one print — item 17: nothing more. No
 * declared archetype or gamertag: the moderator types what the print shows
 * (RF-073) and the server compares, so the browser never holds a hint to copy.
 */
export type VerificationCaseView = {
  caseId: string
  openedAt: Date
  category: CharacterCategory
  platform: string
}

/** One screen of the queue, oldest first. */
const QUEUE_PAGE = 50

export type VerificationOutcome = {
  approved: boolean
  rejection: PrintRejection | null
}

/**
 * Character verification by moderation — #198. While OCR is out of the flow
 * every received print lands here; afterwards only repeated OCR failures do.
 *
 * The ownership checks that left character creation (#201) live here: a ban
 * or another account's verified claim only matters once a print proves the
 * person holds the tag, and only then is the answer theirs to see.
 */
@Injectable()
export class CharacterVerificationService {
  private readonly hmacSecret = readIdentityHmacSecret()
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(private readonly em: EntityManager) {}

  /** Called in the same unit of work that records a received print. */
  openCase(em: EntityManager, submission: PrintSubmission, account: Account): void {
    em.create(ModerationCase, {
      type: ModerationCaseType.CHARACTER_VERIFICATION,
      origin: ModerationCaseOrigin.SYSTEM,
      targetAccount: account,
      printSubmission: submission,
    })
  }

  async listOpen(moderatorId: string): Promise<VerificationCaseView[]> {
    const em = this.em.fork()
    const cases = await em.find(
      ModerationCase,
      {
        type: ModerationCaseType.CHARACTER_VERIFICATION,
        state: ModerationCaseState.OPEN,
        // Nobody judges their own print.
        targetAccount: { $ne: moderatorId },
      },
      {
        populate: ['printSubmission.character'],
        orderBy: { openedAt: 'asc' },
        limit: QUEUE_PAGE,
      },
    )
    return cases.flatMap((moderationCase) => {
      const character = moderationCase.printSubmission?.character
      return character
        ? [
            {
              caseId: moderationCase.id,
              openedAt: moderationCase.openedAt,
              category: character.category,
              platform: character.platform,
            },
          ]
        : []
    })
  }

  /**
   * A replaced character (RF-027) cannot be verified any more: its open case
   * closes with it, in the same unit of work that inactivates it.
   */
  async closeCaseOfReplaced(em: EntityManager, characterId: string): Promise<void> {
    const cases = await em.find(
      ModerationCase,
      {
        type: ModerationCaseType.CHARACTER_VERIFICATION,
        state: ModerationCaseState.OPEN,
        printSubmission: { character: characterId },
      },
      { populate: ['printSubmission'] },
    )
    for (const moderationCase of cases) {
      moderationCase.state = ModerationCaseState.RESOLVED
      moderationCase.resolvedAt = new Date()
      moderationCase.decision = 'closed: character_replaced'
      moderationCase.printSubmission!.status = PrintSubmissionStatus.REJECTED
    }
  }

  async printFor(moderatorId: string, caseId: string): Promise<{ bytes: Buffer; type: string }> {
    const moderationCase = await this.openCaseFor(this.em.fork(), moderatorId, caseId)
    const path = moderationCase.printSubmission?.filePath
    if (!path) {
      throw new NotFoundException('print_not_found')
    }
    const bytes = decryptAtRest(this.encryptionKey, await readFile(path))
    const type = detectRealImageType(bytes)
    return { bytes, type: type === 'jpg' ? 'image/jpeg' : `image/${type ?? 'png'}` }
  }

  async decide(
    moderatorId: string,
    caseId: string,
    dto: VerificationDecisionDto,
  ): Promise<VerificationOutcome> {
    try {
      return await this.em.fork().transactional(async (em) => {
        const moderationCase = await this.openCaseFor(em, moderatorId, caseId, true)
        const submission = moderationCase.printSubmission!
        const character = submission.character
        if (
          !character ||
          !(ACTIVE_CHARACTER_STATES as readonly CharacterState[]).includes(character.state)
        ) {
          throw new ConflictException('character_replaced')
        }
        // Same lock character creation takes: the claim cannot change tag
        // between the check below and the approval.
        await em.findOneOrFail(
          Account,
          { id: character.account.id },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )
        const claim = await em.findOne(PlatformGamertag, {
          account: character.account,
          platform: character.platform,
        })

        const rejection = dto.approve
          ? await this.ownershipProblem(em, character, claim, dto.archetype!, dto.gamertag!)
          : dto.rejection!

        this.resolve(em, moderationCase, moderatorId, rejection)
        if (rejection) {
          submission.status = PrintSubmissionStatus.REJECTED
          submission.rejection = rejection
          return { approved: false, rejection }
        }

        submission.status = PrintSubmissionStatus.ACCEPTED
        character.archetype = dto.archetype!
        character.state = CharacterState.VERIFIED
        character.verifiedAt = new Date()
        // Exclusivity is born here: the partial unique index decides a race.
        claim!.verifiedAt = new Date()
        // The moderator read the spelling on the card: that is what is shown.
        claim!.gamertagEncrypted = encryptAtRest(this.encryptionKey, Buffer.from(dto.gamertag!))
        await em.flush()
        return { approved: true, rejection: null }
      })
    } catch (error) {
      if (isUniqueViolation(error, VERIFIED_GAMERTAG_UNIQUE_INDEX)) {
        // Another account verified the same tag a moment earlier.
        throw new ConflictException('gamertag_already_verified')
      }
      throw error
    }
  }

  private async openCaseFor(
    em: EntityManager,
    moderatorId: string,
    caseId: string,
    lock = false,
  ): Promise<ModerationCase> {
    // Only the case row is locked; relations load after. Two moderators on the
    // same case: the second waits, then the OPEN filter no longer matches.
    const moderationCase = await em.findOne(
      ModerationCase,
      {
        id: caseId,
        type: ModerationCaseType.CHARACTER_VERIFICATION,
        state: ModerationCaseState.OPEN,
      },
      lock ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {},
    )
    if (!moderationCase) {
      throw new NotFoundException('case_not_found')
    }
    if (moderationCase.targetAccount?.id === moderatorId) {
      throw new ForbiddenException('own_case')
    }
    await em.populate(moderationCase, ['printSubmission.character'])
    // The case target and the character owner are the same today; checked
    // on both so a future caller of openCase cannot open a way around it.
    if (moderationCase.printSubmission?.character?.account.id === moderatorId) {
      throw new ForbiddenException('own_case')
    }
    return moderationCase
  }

  private async ownershipProblem(
    em: EntityManager,
    character: Character,
    claim: PlatformGamertag | null,
    archetype: Archetype,
    gamertag: string,
  ): Promise<PrintRejection | null> {
    if (!archetypeFitsCategory(archetype, character.category)) {
      return PrintRejection.ARCHETYPE_MISMATCH
    }
    const gamertagHash = hashGamertag(this.hmacSecret, gamertag)
    if (!claim || claim.gamertagHash !== gamertagHash) {
      return PrintRejection.GAMERTAG_MISMATCH
    }
    const blocked = await em.count(BlockedIdentity, { platform: character.platform, gamertagHash })
    const takenElsewhere = await em.count(PlatformGamertag, {
      platform: character.platform,
      gamertagHash,
      verifiedAt: { $ne: null },
      account: { $ne: character.account },
    })
    return blocked > 0 || takenElsewhere > 0 ? PrintRejection.GAMERTAG_UNAVAILABLE : null
  }

  private resolve(
    em: EntityManager,
    moderationCase: ModerationCase,
    moderatorId: string,
    rejection: PrintRejection | null,
  ): void {
    moderationCase.state = ModerationCaseState.RESOLVED
    moderationCase.resolvedBy = em.getReference(Account, moderatorId)
    moderationCase.resolvedAt = new Date()
    moderationCase.decision = rejection ? `rejected: ${rejection}` : 'approved'
  }
}
