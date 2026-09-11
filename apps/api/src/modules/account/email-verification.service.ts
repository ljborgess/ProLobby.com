import { EntityManager } from '@mikro-orm/postgresql'
import { BadRequestException, Injectable } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'

import { MailSender, TransactionalEmail } from '../../common/mail/mail.types'
import { Account } from './account.entity'
import { AccountState } from './account.enums'
import { EmailVerification } from './email-verification.entity'

/** 24 hours — see the note on EmailVerification.expiresAt. */
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

/**
 * An unverified account is deleted after 30 days, freeing the address.
 *
 * Without this, signing up with someone else's address locks it forever — and
 * because RF-070 forbids telling the screen anything, the real owner would try
 * to sign up, get the same cheerful answer as everyone else, and never receive
 * a thing. Silent on both ends, and exploitable on purpose rather than by
 * accident.
 *
 * 30 days is slack for someone who got distracted, and short enough that farmed
 * ghost accounts do not accumulate. Deleting costs nothing: an unverified
 * account has no history to destroy.
 */
export const UNVERIFIED_ACCOUNT_TTL_MS = 30 * 24 * 60 * 60 * 1000

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly em: EntityManager,
    private readonly mailSender: MailSender,
  ) {}

  /**
   * Issues a token and emails it. Any earlier pending token for the account is
   * invalidated, so only the newest link works — otherwise an old link found in
   * an inbox would keep verifying an address the person may have already
   * changed their mind about.
   */
  async sendVerification(account: Account): Promise<void> {
    const em = this.em.fork()

    await em.nativeUpdate(
      EmailVerification,
      { account: account.id, usedAt: null },
      { usedAt: new Date() },
    )

    // 32 bytes of CSPRNG. The value travels by email; only its hash is stored.
    const token = randomBytes(32).toString('base64url')

    em.persist(
      em.create(EmailVerification, {
        account: em.getReference(Account, account.id),
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      }),
    )
    await em.flush()

    await this.mailSender.send({
      to: account.email,
      kind: TransactionalEmail.VERIFY_ADDRESS,
      data: { token },
    })
  }

  /**
   * Tells the owner of an address that an account already exists on it — the
   * other half of RF-020.
   *
   * The sign-up screen answers the same thing whether the address was free or
   * taken (RF-070), so this email is the *only* way the real owner ever finds
   * out. Without it, someone who already has an account signs up again,
   * receives an encouraging message, and waits forever for a link that was
   * never sent.
   */
  async notifyAlreadyRegistered(email: string): Promise<void> {
    await this.mailSender.send({
      to: email,
      kind: TransactionalEmail.ADDRESS_ALREADY_REGISTERED,
      data: {},
    })
  }

  /**
   * Consumes a token and activates the account.
   *
   * Every failure answers the same way. A distinct "expired" versus "unknown"
   * would confirm that a token had once existed, which is enough to tell an
   * attacker they guessed a real one.
   */
  async verify(token: string): Promise<void> {
    const em = this.em.fork()
    const verification = await em.findOne(
      EmailVerification,
      { tokenHash: hashToken(token) },
      { populate: ['account'] },
    )

    if (!verification) {
      throw new BadRequestException('invalid_verification_token')
    }

    // A second click on the same link is the normal thing people do. Say it
    // worked rather than "invalid", which reads like a bug in the product.
    if (verification.usedAt) {
      return
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('invalid_verification_token')
    }

    verification.usedAt = new Date()
    verification.account.emailVerified = true

    // Only an unverified account is promoted. A suspended or banned account
    // that verifies its address must not walk out of the punishment through
    // this door.
    if (verification.account.state === AccountState.UNVERIFIED) {
      verification.account.state = AccountState.ACTIVE
    }

    await em.flush()
  }

  /**
   * Deletes accounts that never verified, past the deadline.
   *
   * Meant to be called by a daily job, like the screenshot cleanup already
   * described in the LGPD policy. Returns how many were removed so the caller
   * can log it — a cleanup nobody can see is a cleanup nobody notices failing.
   */
  async deleteExpiredUnverified(now: Date = new Date()): Promise<number> {
    const em = this.em.fork()

    return em.nativeDelete(Account, {
      state: AccountState.UNVERIFIED,
      emailVerified: false,
      createdAt: { $lt: new Date(now.getTime() - UNVERIFIED_ACCOUNT_TTL_MS) },
    })
  }
}

/**
 * SHA-256, not argon2.
 *
 * The token is 32 random bytes, so there is nothing to brute-force and no
 * reason to pay a slow hash on every verification click. argon2 exists to
 * defend low-entropy secrets that people choose; this one is not chosen by
 * anyone.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
