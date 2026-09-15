import { EntityManager } from '@mikro-orm/postgresql'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'

import { HashService } from '../../common/auth/hash.service'
import { deliverWithoutThrowing } from '../../common/mail/deliver'
import { MailSender, TransactionalEmail } from '../../common/mail/mail.types'
import { Account } from './account.entity'
import { AccountState } from './account.enums'
import { generateToken, hashToken } from './account.token'
import { PasswordReset } from './password-reset.entity'

/** 30 minutes — RF-024, docs/produto/parametros.md. */
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000

/**
 * Links issued per account per hour — item 11 of the security checklist.
 *
 * The per-IP throttle stops one machine; this stops many machines aimed at one
 * inbox. Without it, anyone could flood a stranger with reset emails from a
 * handful of addresses.
 */
export const PASSWORD_RESET_MAX_PER_HOUR = 3

const ONE_HOUR_MS = 60 * 60 * 1000

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name)

  constructor(
    private readonly em: EntityManager,
    private readonly mailSender: MailSender,
    private readonly hashService: HashService,
  ) {}

  /**
   * Starts a reset for an address — RF-024, RF-070.
   *
   * Returns before doing anything the caller could time. Looking the account
   * up, issuing the token and sending the email all happen after the response:
   * awaiting the insert would make a real account a few milliseconds slower
   * than an unknown address, which is enough to enumerate accounts with a
   * script.
   */
  request(email: string): void {
    void this.issue(email).catch((error: unknown) => {
      this.logger.error(
        'failed to issue a password reset',
        error instanceof Error ? error.stack : undefined,
      )
    })
  }

  /**
   * Issues a link and emails it, if there is an account to reset.
   *
   * Public so tests can await it; the HTTP path goes through request().
   */
  async issue(email: string): Promise<void> {
    const em = this.em.fork()
    const account = await em.findOne(Account, { email })

    // A deleted account is gone — there is nothing to reset, and the caller
    // already got the same answer as for an address that never existed.
    if (!account || account.state === AccountState.DELETED) {
      return
    }

    const issuedLastHour = await em.count(PasswordReset, {
      account: account.id,
      createdAt: { $gt: new Date(Date.now() - ONE_HOUR_MS) },
    })

    if (issuedLastHour >= PASSWORD_RESET_MAX_PER_HOUR) {
      // Worth seeing: either someone is hammering one inbox, or a person is
      // stuck and not receiving the email. Neither shows up anywhere else.
      this.logger.warn(`password reset limit reached for account ${account.id}`)
      return
    }

    // Asking again invalidates the previous link (RF-024): only the newest
    // email in the inbox works.
    //
    // ponytail: two requests racing past the count can leave two live links
    // for a few seconds; both still expire in 30 minutes and die at the first
    // completed reset. A per-account lock would close it, if it ever matters.
    await em.nativeUpdate(
      PasswordReset,
      { account: account.id, usedAt: null },
      { usedAt: new Date() },
    )

    const token = generateToken()

    em.persist(
      em.create(PasswordReset, {
        account,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      }),
    )
    await em.flush()

    await deliverWithoutThrowing(
      this.mailSender,
      { to: account.email, kind: TransactionalEmail.PASSWORD_RESET, data: { token } },
      this.logger,
    )
  }

  /**
   * Sets a new password from a reset link — RF-024.
   *
   * Every failure answers the same: unknown, expired and already used are
   * indistinguishable, so a guessed token learns nothing about whether it once
   * existed.
   *
   * Does not end existing sessions: there is no per-session revocation
   * (ADR-007). The interface must not promise that resetting logs anyone out.
   */
  async confirm(token: string, newPassword: string): Promise<void> {
    const em = this.em.fork()
    const reset = await em.findOne(PasswordReset, { tokenHash: hashToken(token) })

    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      throw invalidResetToken()
    }

    // Hashed before claiming the link: argon2 is the slow part, and running
    // it inside the transaction would hold the row for nothing. A valid token
    // does cost more than an invalid one, which only reveals what the caller
    // already holds — 256 random bits nobody can guess.
    const passwordHash = await this.hashService.hash(newPassword)
    const accountId = reset.account.id

    await em.transactional(async (tx) => {
      const now = new Date()

      // The claim is the real check. Two requests with the same link can both
      // pass the read above; only one of them updates a row that is still
      // unused, and the loser rolls back without touching the password.
      const claimed = await tx.nativeUpdate(
        PasswordReset,
        { id: reset.id, usedAt: null, expiresAt: { $gt: now } },
        { usedAt: now },
      )

      if (claimed === 0) {
        throw invalidResetToken()
      }

      const updated = await tx.nativeUpdate(
        Account,
        { id: accountId, state: { $ne: AccountState.DELETED } },
        { passwordHash },
      )

      if (updated === 0) {
        throw invalidResetToken()
      }

      // Any other link still pending for this account is pointless now — and
      // an older one leaking later must not undo the reset.
      await tx.nativeUpdate(PasswordReset, { account: accountId, usedAt: null }, { usedAt: now })
    })
  }
}

function invalidResetToken(): BadRequestException {
  return new BadRequestException('invalid_reset_token')
}
