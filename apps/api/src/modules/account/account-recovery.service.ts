import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger } from '@nestjs/common'

import { HashService } from '../../common/auth/hash.service'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseOrigin, ModerationCaseType } from '../moderation/moderation-case.enums'
import { Account } from './account.entity'
import { AccountState } from './account.enums'
import { normaliseSecurityAnswer } from './account.security-answer'

/**
 * Where the evidence screenshot lands — RF-025.
 *
 * Provisional, same as ModerationCase.evidencePath: real storage is the
 * Oracle Object Storage bucket from ADR-009, wired up with the rest of the
 * upload pipeline in phase 2.2. `apps/api/uploads/` is already gitignored for
 * exactly this kind of local, dev-only file.
 */
const EVIDENCE_DIR = join(process.cwd(), 'uploads', 'account-recovery')

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name)

  constructor(
    private readonly em: EntityManager,
    private readonly hashService: HashService,
  ) {}

  /**
   * Starts a recovery request — RF-025, RF-070.
   *
   * Returns before doing anything the caller could time or read a status
   * code from: whether the address exists, whether the answer matched, none
   * of it is observable from this call. Fire-and-forget, same shape as
   * PasswordResetService.request — the difference is there is nothing to
   * email here, so nothing at all needs to happen before the response.
   */
  request(email: string, securityAnswer: string, evidence: Buffer, extension: string): void {
    void this.open(email, securityAnswer, evidence, extension).catch((error: unknown) => {
      this.logger.error(
        'failed to process an account recovery request',
        error instanceof Error ? error.stack : undefined,
      )
    })
  }

  /**
   * Opens the case, if there is one to open.
   *
   * Public so tests can await it; the HTTP path goes through request().
   */
  async open(
    email: string,
    securityAnswer: string,
    evidence: Buffer,
    extension: string,
  ): Promise<void> {
    const em = this.em.fork()
    const account = await em.findOne(Account, { email })

    // Same silence as an unknown address: nothing to recover into, and the
    // caller already got the generic response either way.
    if (!account || isTerminal(account.state)) {
      return
    }

    const matches = await this.hashService.matches(
      normaliseSecurityAnswer(securityAnswer),
      account.securityAnswerHash,
    )

    // One factor is not enough (RF-025): a wrong answer opens nothing, no
    // matter how convincing the screenshot is. The print's authenticity — it
    // really is *this* account's gamertag — is not machine-checked until the
    // OCR pipeline exists (phase 2.2); until then a moderator looks at it by
    // hand when resolving the case (phase 5).
    if (!matches) {
      return
    }

    const evidencePath = await this.saveEvidence(evidence, extension)

    em.persist(
      em.create(ModerationCase, {
        type: ModerationCaseType.ACCOUNT_RECOVERY,
        origin: ModerationCaseOrigin.USER,
        targetAccount: account,
        evidencePath,
      }),
    )
    await em.flush()
  }

  private async saveEvidence(evidence: Buffer, extension: string): Promise<string> {
    await mkdir(EVIDENCE_DIR, { recursive: true })
    const path = join(EVIDENCE_DIR, `${randomUUID()}.${extension}`)
    await writeFile(path, evidence)
    return path
  }
}

/** Nothing to recover into: gone, or already at the far end of moderation. */
function isTerminal(state: AccountState): boolean {
  return state === AccountState.DELETED || state === AccountState.BANNED
}
