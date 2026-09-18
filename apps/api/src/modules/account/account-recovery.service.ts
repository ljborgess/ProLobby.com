import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger } from '@nestjs/common'

import { HashService } from '../../common/auth/hash.service'
import { isUniqueViolation } from '../../common/database/postgres-error'
import { encryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
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
 * exactly this kind of local, dev-only file. Provisional or not, what lands
 * here is encrypted (see saveEvidence) — item 5 of the security checklist has
 * no "later phase" caveat for print, unlike item 4.
 */
const EVIDENCE_DIR = join(process.cwd(), 'uploads', 'account-recovery')

/**
 * Cases opened for one account per day — item 11 of the security checklist.
 *
 * Mirrors PASSWORD_RESET_MAX_PER_HOUR: the per-IP bucket on the controller
 * (`login`, 5/min) stops one machine; this stops the same account's
 * moderation queue from being flooded with duplicate cases. Measured per day,
 * not per hour, because a legitimate recovery is rare — nobody loses email
 * and Discord together more than a couple of times.
 */
export const ACCOUNT_RECOVERY_MAX_PER_DAY = 3

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Retention for an attached screenshot — 90 days (LGPD policy, RNF-008).
 *
 * The decided mechanism is **not** this: ADR-009 puts the rule on the Oracle
 * Object Storage bucket itself, precisely so deletion does not depend on an
 * application job running. This exists because the bucket does not, and the
 * first internal deploy (#121) lands *before* the upload pipeline of phase 2.2
 * — so there is a window where a real recovery screenshot sits on the VM under
 * `uploads/` with nothing to ever delete it. A promise of 90 days that only
 * holds after phase 2.2 is not a promise.
 *
 * **Provisional.** When the bucket takes over, this method and its call in
 * AccountCleanupJob go away with the local directory.
 */
export const EVIDENCE_RETENTION_DAYS = 90

const EVIDENCE_RETENTION_MS = EVIDENCE_RETENTION_DAYS * ONE_DAY_MS

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name)

  /**
   * Read at construction — that is, at boot — and not inside `saveEvidence`.
   *
   * `request()` is fire-and-forget on purpose (see its doc comment), so an
   * exception raised in the request path becomes a log line while the person
   * still gets the 202 that says their recovery was accepted. A missing or
   * malformed key would therefore lose every recovery in silence, and item 5
   * of the security checklist would stop existing without anything failing.
   *
   * Failing here instead kills the process at startup, which is how
   * JWT_SECRET already behaves (see AuthModule).
   */
  private readonly evidenceKey = readEvidenceEncryptionKey()

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

    // Per-account cap — item 11. The controller's `login` bucket (5/min,
    // per IP) stops one machine; this stops one account's queue from being
    // flooded by someone retrying from many addresses, the same gap
    // PasswordResetService closes with PASSWORD_RESET_MAX_PER_HOUR.
    const openedToday = await em.count(ModerationCase, {
      targetAccount: account.id,
      type: ModerationCaseType.ACCOUNT_RECOVERY,
      openedAt: { $gt: new Date(Date.now() - ONE_DAY_MS) },
    })

    if (openedToday >= ACCOUNT_RECOVERY_MAX_PER_DAY) {
      // Worth seeing: either someone is hammering this account's recovery
      // path, or a person is stuck and retrying. Neither shows up anywhere
      // else.
      this.logger.warn(`account recovery limit reached for account ${account.id}`)
      return
    }

    const evidencePath = await this.saveEvidence(evidence, extension)

    try {
      em.persist(
        em.create(ModerationCase, {
          type: ModerationCaseType.ACCOUNT_RECOVERY,
          origin: ModerationCaseOrigin.USER,
          targetAccount: account,
          evidencePath,
        }),
      )
      await em.flush()
    } catch (error) {
      // The file is on disk with no case pointing at it — a moderator can
      // never reach it, so it is not evidence of anything. Best-effort: a
      // cleanup failure here must not hide the original error.
      await rm(evidencePath, { force: true }).catch(() => undefined)

      // The partial unique index (migration 20260916120000) is what actually
      // decides this, not a prior read: two requests can both pass the cap
      // check above and both reach here, and only one insert wins. The
      // loser's answer to the caller is already the same 202 either way —
      // this just stops it from also queuing a duplicate case.
      if (isUniqueViolation(error)) {
        return
      }
      throw error
    }
  }

  /**
   * Deletes screenshots past the 90-day retention — see
   * EVIDENCE_RETENTION_DAYS for why an application job does this at all.
   *
   * The path is cleared in the same pass, so a resolved case never points at a
   * file that is gone: a moderator opening a dead link cannot tell "deleted on
   * schedule" from "storage lost it", and the second reading is the one that
   * costs an afternoon.
   *
   * The file goes first. If the flush fails afterwards the row still names a
   * deleted file, which the next run cleans up; doing it the other way round
   * would drop the only pointer to a file that then stays on disk forever —
   * exactly the leak this method exists to close.
   *
   * @returns how many screenshots were deleted.
   */
  async deleteExpiredEvidence(now: Date = new Date()): Promise<number> {
    const em = this.em.fork()
    const expired = await em.find(ModerationCase, {
      evidencePath: { $ne: null },
      openedAt: { $lt: new Date(now.getTime() - EVIDENCE_RETENTION_MS) },
    })

    let deleted = 0

    for (const moderationCase of expired) {
      const path = moderationCase.evidencePath
      if (!path) {
        continue
      }

      try {
        // `force`: a file already gone is the desired end state, not an error.
        await rm(path, { force: true })
      } catch (error) {
        // One unreadable path must not stop the rest of the sweep — the whole
        // point is that retention does not depend on everything being perfect.
        this.logger.error(
          `failed to delete expired evidence for case ${moderationCase.id}`,
          error instanceof Error ? error.stack : undefined,
        )
        continue
      }

      moderationCase.evidencePath = undefined
      deleted += 1
    }

    if (deleted > 0) {
      await em.flush()
    }

    return deleted
  }

  /** Encrypted at rest — item 5 of the security checklist / RNF-009. */
  private async saveEvidence(evidence: Buffer, extension: string): Promise<string> {
    const encrypted = encryptAtRest(this.evidenceKey, evidence)

    await mkdir(EVIDENCE_DIR, { recursive: true })
    const path = join(EVIDENCE_DIR, `${randomUUID()}.${extension}.enc`)
    await writeFile(path, encrypted)
    return path
  }
}

/**
 * Nothing to recover into: gone, or already at the far end of moderation.
 *
 * BANNED is excluded here but not from PasswordResetService's equivalent
 * check (which only excludes DELETED): resetting a banned account's password
 * is harmless — the ban still blocks everything the guard does regardless —
 * but opening a *recovery* case for one would queue moderation work with
 * nothing to decide, since there is no access left to hand back.
 */
function isTerminal(state: AccountState): boolean {
  return state === AccountState.DELETED || state === AccountState.BANNED
}
