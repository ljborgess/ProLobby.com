import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'

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
import { Account } from './account.entity'
import { AccountRole } from './account.enums'
import { SessionService } from './session.service'

const PANEL_ROLES: readonly AccountRole[] = [AccountRole.MODERATOR, AccountRole.ADMIN]
const RECOVERY_CODE = /^[a-z2-7]{4}-[a-z2-7]{4}$/i

export type TwoFactorStatus = { required: boolean; enabled: boolean; verified: boolean }

/**
 * The moderation panel's second factor — #311, RNF-010. Only accounts with a
 * panel role set it up; for them every panel route refuses a session that has
 * not passed it (`ModeratorGuard`).
 *
 * Setup is two steps on purpose: the secret is stored when shown, and the
 * factor only counts once the person proves their app produces the right
 * code. A half-finished setup never locks anyone out.
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
      required: PANEL_ROLES.includes(account.role),
      enabled: Boolean(account.totpEnabledAt),
      verified,
    }
  }

  async setup(accountId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const em = this.em.fork()
    const account = await em.findOneOrFail(Account, { id: accountId })
    if (!PANEL_ROLES.includes(account.role)) throw new ForbiddenException('not_a_panel_role')
    if (account.totpEnabledAt) throw new ConflictException('two_factor_already_enabled')
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
    const recoveryCodes = generateRecoveryCodes()
    await this.em.fork().transactional(async (em) => {
      const account = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (account.totpEnabledAt) throw new ConflictException('two_factor_already_enabled')
      if (!account.totpSecretEncrypted) throw new BadRequestException('two_factor_not_set_up')
      const step = verifyTotp(this.secretOf(account), code.trim(), now, null)
      if (step === null) throw new BadRequestException('invalid_code')
      account.totpEnabledAt = now
      account.totpLastStep = step
      account.recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode)
    })
    return { recoveryCodes, token: await this.sessions.issue(accountId, ['pwd', 'otp']) }
  }

  /**
   * The second step of signing in to the panel: a TOTP code, or one recovery
   * code, which then stops working. Row-locked, so the same code raced from
   * two tabs opens one session, never two.
   */
  async verify(accountId: string, code: string, now: Date = new Date()): Promise<string> {
    const typed = code.trim()
    await this.em.fork().transactional(async (em) => {
      const account = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (!account.totpEnabledAt || !account.totpSecretEncrypted) {
        throw new BadRequestException('two_factor_not_set_up')
      }
      if (RECOVERY_CODE.test(typed)) {
        const hash = hashRecoveryCode(typed)
        const left = account.recoveryCodeHashes ?? []
        if (!left.includes(hash)) throw new UnauthorizedException('invalid_code')
        account.recoveryCodeHashes = left.filter((stored) => stored !== hash)
        return
      }
      const step = verifyTotp(this.secretOf(account), typed, now, account.totpLastStep ?? null)
      if (step === null) throw new UnauthorizedException('invalid_code')
      account.totpLastStep = step
    })
    return this.sessions.issue(accountId, ['pwd', 'otp'])
  }

  private secretOf(account: Account): Buffer {
    return decryptAtRest(this.encryptionKey, account.totpSecretEncrypted!)
  }
}
