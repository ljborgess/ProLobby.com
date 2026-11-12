import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
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
import { FailedSignIn } from './failed-sign-in.entity'
import {
  FAILED_SIGN_IN_MAX_PER_WINDOW,
  FAILED_SIGN_IN_WINDOW_MS,
  SessionService,
} from './session.service'

const ONE_TIME_CODE = /^[a-z2-7]{4}-[a-z2-7]{4}$/i

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
 * - **guess the code**: wrong codes count in the same per-account window as
 *   wrong passwords (10 per 15 min), so spreading guesses over many IPs buys
 *   nothing;
 * - **use a stolen recovery code unseen**: each use is in the audit log.
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
    const em = this.em.fork()
    const account = await em.findOneOrFail(Account, { id: accountId })
    if (!MODERATION_ROLES.includes(account.role)) throw new ForbiddenException('not_a_panel_role')
    if (account.totpEnabledAt) throw new ConflictException('two_factor_already_enabled')
    await this.refuseWhenLocked(accountId, now)
    if (!this.enrollmentMatches(account, enrollmentCode, now)) {
      await this.recordFailure(accountId)
      throw new BadRequestException('invalid_enrollment_code')
    }
    const secret = generateTotpSecret()
    account.totpSecretEncrypted = encryptAtRest(this.encryptionKey, secret)
    account.totpLastStep = undefined
    await em.flush()
    return { secret: base32(secret), otpauthUrl: otpauthUrl(secret, account.email) }
  }

  /** The first valid code turns the factor on and hands out the recovery codes, once. */
  async activate(
    accountId: string,
    code: string,
    now: Date = new Date(),
  ): Promise<{ recoveryCodes: string[]; token: string }> {
    await this.refuseWhenLocked(accountId, now)
    const recoveryCodes = generateRecoveryCodes()
    let valid = false
    await this.em.fork().transactional(async (em) => {
      const account = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (account.totpEnabledAt) throw new ConflictException('two_factor_already_enabled')
      if (!account.totpSecretEncrypted || !account.twoFactorEnrollmentHash) {
        throw new BadRequestException('two_factor_not_set_up')
      }
      const step = verifyTotp(this.secretOf(account), code.trim(), now, null)
      if (step === null) return
      valid = true
      account.totpEnabledAt = now
      account.totpLastStep = step
      account.recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode)
      // The enrollment code is spent: it set up this phone and no other.
      account.twoFactorEnrollmentHash = undefined
      account.twoFactorEnrollmentExpiresAt = undefined
    })
    if (!valid) {
      await this.recordFailure(accountId)
      throw new BadRequestException('invalid_code')
    }
    await this.clearFailures(accountId)
    return { recoveryCodes, token: await this.sessions.issue(accountId, ['pwd', 'otp']) }
  }

  /**
   * The second step of signing in to the panel: a TOTP code, or one recovery
   * code, which then stops working. Row-locked, so the same code raced from
   * two tabs opens one session, never two.
   */
  async verify(accountId: string, code: string, now: Date = new Date()): Promise<string> {
    await this.refuseWhenLocked(accountId, now)
    const typed = code.trim()
    let valid = false
    await this.em.fork().transactional(async (em) => {
      const account = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (!account.totpEnabledAt || !account.totpSecretEncrypted) {
        throw new BadRequestException('two_factor_not_set_up')
      }
      if (ONE_TIME_CODE.test(typed)) {
        const hash = hashRecoveryCode(typed)
        const left = account.recoveryCodeHashes ?? []
        if (!left.includes(hash)) return
        account.recoveryCodeHashes = left.filter((stored) => stored !== hash)
        recordAudit(em, {
          action: AuditAction.RECOVERY_CODE_USED,
          actorId: account.id,
          actorLabel: 'moderator',
          targetAccountId: account.id,
          after: { recoveryCodesLeft: account.recoveryCodeHashes.length },
        })
        valid = true
        return
      }
      const step = verifyTotp(this.secretOf(account), typed, now, account.totpLastStep ?? null)
      if (step === null) return
      account.totpLastStep = step
      valid = true
    })
    if (!valid) {
      await this.recordFailure(accountId)
      throw new UnauthorizedException('invalid_code')
    }
    await this.clearFailures(accountId)
    return this.sessions.issue(accountId, ['pwd', 'otp'])
  }

  private enrollmentMatches(account: Account, code: string, now: Date): boolean {
    return Boolean(
      account.twoFactorEnrollmentHash &&
      account.twoFactorEnrollmentExpiresAt &&
      account.twoFactorEnrollmentExpiresAt > now &&
      ONE_TIME_CODE.test(code.trim()) &&
      hashRecoveryCode(code) === account.twoFactorEnrollmentHash,
    )
  }

  /** The sign-in window (10 per 15 min), shared: a wrong code costs the same as a wrong password. */
  private async refuseWhenLocked(accountId: string, now: Date): Promise<void> {
    const recent = await this.em.fork().count(FailedSignIn, {
      account: accountId,
      createdAt: { $gt: new Date(now.getTime() - FAILED_SIGN_IN_WINDOW_MS) },
    })
    if (recent >= FAILED_SIGN_IN_MAX_PER_WINDOW) {
      throw new HttpException('too_many_attempts', HttpStatus.TOO_MANY_REQUESTS)
    }
  }

  private async recordFailure(accountId: string): Promise<void> {
    const em = this.em.fork()
    em.create(FailedSignIn, { account: accountId })
    await em.flush()
  }

  private async clearFailures(accountId: string): Promise<void> {
    await this.em.fork().nativeDelete(FailedSignIn, { account: accountId })
  }

  private secretOf(account: Account): Buffer {
    return decryptAtRest(this.encryptionKey, account.totpSecretEncrypted!)
  }
}
