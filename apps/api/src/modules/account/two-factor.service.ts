import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'

import { MODERATION_ROLES } from '../../common/auth/moderator.guard'
import {
  decryptAtRest,
  encryptAtRest,
  readEvidenceEncryptionKey,
} from '../../common/security/evidence-encryption'
import {
  base32,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUrl,
  verifyTotp,
} from '../../common/security/totp'
import { AuditAction, recordAudit } from '../moderation/audit-entry.entity'
import { Account } from './account.entity'
import { FailedTwoFactor } from './failed-two-factor.entity'
import { SessionService } from './session.service'

const ONE_TIME_CODE = /^[a-z2-7]{4}-[a-z2-7]{4}$/i
/** Wrong codes allowed per account in the window — the same budget as wrong passwords. */
export const TWO_FACTOR_MAX_FAILURES = 10
export const TWO_FACTOR_WINDOW_MS = 15 * 60 * 1000

export type TwoFactorStatus = {
  required: boolean
  enabled: boolean
  verified: boolean
  recoveryCodesLeft: number
}

/**
 * The moderation panel's second factor — #311, RNF-010. Only accounts with a
 * panel role set it up; for them every panel route refuses a session that has
 * not passed it (`ModeratorGuard`).
 *
 * Three things a leaked password alone must not do, and why each rule exists:
 * - **enroll its own phone**: setup needs a one-time enrollment code an admin
 *   issues by CLI, handed over outside the platform;
 * - **guess the code**: wrong codes count per account (10 per 15 min) in a
 *   counter of their own, which a correct password does not clear, and the
 *   count is read under the row lock, so parallel requests cannot all slip
 *   in under the limit;
 * - **use a stolen recovery code unseen**: each use is in the audit log.
 *
 * Passing the factor never lengthens a session: the upgraded token keeps the
 * expiry of the sign-in it came from.
 *
 * ponytail: the secret shares `EVIDENCE_ENCRYPTION_KEY` with every other
 * at-rest field (Discord ids, prints, payloads). A dedicated key only pays off
 * once keys rotate per data set, and rotating that key today already needs a
 * re-encryption pass for all of them.
 */
@Injectable()
export class TwoFactorService {
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(
    private readonly em: EntityManager,
    private readonly sessions: SessionService,
  ) {}

  status(account: Account, verified: boolean): TwoFactorStatus {
    return {
      required: MODERATION_ROLES.includes(account.role),
      enabled: Boolean(account.totpEnabledAt),
      verified,
      recoveryCodesLeft: account.recoveryCodeHashes?.length ?? 0,
    }
  }

  async setup(
    accountId: string,
    enrollmentCode: string,
    now: Date = new Date(),
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = generateTotpSecret()
    const result = await this.attempt(accountId, now, (account) => {
      if (!MODERATION_ROLES.includes(account.role)) {
        throw new ForbiddenException('not_a_panel_role')
      }
      if (account.totpEnabledAt) throw new ConflictException('two_factor_already_enabled')
      if (!this.enrollmentMatches(account, enrollmentCode, now)) return false
      account.totpSecretEncrypted = encryptAtRest(this.encryptionKey, secret)
      account.totpLastStep = undefined
      return account.email
    })
    if (result === false) throw new BadRequestException('invalid_enrollment_code')
    return { secret: base32(secret), otpauthUrl: otpauthUrl(secret, result) }
  }

  /** The first valid code turns the factor on and hands out the recovery codes, once. */
  async activate(
    accountId: string,
    code: string,
    expiresAt: Date | undefined,
    now: Date = new Date(),
  ): Promise<{ recoveryCodes: string[]; token: string }> {
    const recoveryCodes = generateRecoveryCodes()
    const valid = await this.attempt(accountId, now, (account) => {
      if (!MODERATION_ROLES.includes(account.role)) {
        throw new ForbiddenException('not_a_panel_role')
      }
      if (account.totpEnabledAt) throw new ConflictException('two_factor_already_enabled')
      if (!account.totpSecretEncrypted || !this.enrollmentLive(account, now)) {
        throw new BadRequestException('two_factor_not_set_up')
      }
      const step = verifyTotp(this.secretOf(account), code.trim(), now, null)
      if (step === null) return false
      account.totpEnabledAt = now
      account.totpLastStep = step
      account.recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode)
      // The enrollment code is spent: it set up this phone and no other.
      account.twoFactorEnrollmentHash = undefined
      account.twoFactorEnrollmentExpiresAt = undefined
      return true
    })
    if (!valid) throw new BadRequestException('invalid_code')
    return {
      recoveryCodes,
      token: await this.sessions.issue(accountId, ['pwd', 'otp'], expiresAt),
    }
  }

  /**
   * The second step of signing in to the panel: a TOTP code, or one recovery
   * code, which then stops working. A wrong code is a 400 like any bad input;
   * 401 stays reserved for a session that is gone.
   */
  async verify(
    accountId: string,
    code: string,
    expiresAt: Date | undefined,
    now: Date = new Date(),
  ): Promise<string> {
    const typed = code.trim()
    const valid = await this.attempt(accountId, now, (account, em) => {
      if (!account.totpEnabledAt || !account.totpSecretEncrypted) {
        throw new BadRequestException('two_factor_not_set_up')
      }
      if (ONE_TIME_CODE.test(typed)) {
        const hash = hashRecoveryCode(typed)
        const left = account.recoveryCodeHashes ?? []
        if (!left.includes(hash)) return false
        account.recoveryCodeHashes = left.filter((stored) => stored !== hash)
        recordAudit(em, {
          action: AuditAction.RECOVERY_CODE_USED,
          actorId: account.id,
          actorLabel: 'moderator',
          targetAccountId: account.id,
          after: { recoveryCodesLeft: account.recoveryCodeHashes.length },
        })
        return true
      }
      const step = verifyTotp(this.secretOf(account), typed, now, account.totpLastStep ?? null)
      if (step === null) return false
      account.totpLastStep = step
      return true
    })
    if (!valid) throw new BadRequestException('invalid_code')
    return this.sessions.issue(accountId, ['pwd', 'otp'], expiresAt)
  }

  /**
   * One guarded attempt: the account row locked, the window counted under the
   * lock, then `check`. A falsy answer is a wrong code, recorded in the same
   * transaction — so the next attempt, waiting on the lock, already counts it.
   * The window starts clean after a right code.
   */
  private async attempt<T>(
    accountId: string,
    now: Date,
    check: (account: Account, em: EntityManager) => T | false,
  ): Promise<T | false> {
    return this.em.fork().transactional(async (em) => {
      const account = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      const recent = await em.count(FailedTwoFactor, {
        account: accountId,
        createdAt: { $gt: new Date(now.getTime() - TWO_FACTOR_WINDOW_MS) },
      })
      if (recent >= TWO_FACTOR_MAX_FAILURES) {
        throw new HttpException('too_many_attempts', HttpStatus.TOO_MANY_REQUESTS)
      }
      const result = check(account, em)
      if (result === false) {
        em.create(FailedTwoFactor, { account: accountId, createdAt: now })
      } else {
        await em.nativeDelete(FailedTwoFactor, { account: accountId })
      }
      return result
    })
  }

  private enrollmentLive(account: Account, now: Date): boolean {
    return Boolean(
      account.twoFactorEnrollmentHash &&
      account.twoFactorEnrollmentExpiresAt &&
      account.twoFactorEnrollmentExpiresAt > now,
    )
  }

  private enrollmentMatches(account: Account, code: string, now: Date): boolean {
    return (
      this.enrollmentLive(account, now) &&
      ONE_TIME_CODE.test(code.trim()) &&
      hashRecoveryCode(code) === account.twoFactorEnrollmentHash
    )
  }

  private secretOf(account: Account): Buffer {
    return decryptAtRest(this.encryptionKey, account.totpSecretEncrypted!)
  }
}
