import { EntityManager } from '@mikro-orm/postgresql'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'

import { deliverWithoutThrowing } from '../../common/mail/deliver'
import { MailSender, TransactionalEmail } from '../../common/mail/mail.types'
import { readWebUrl } from '../../common/mail/web-url'
import { Account } from './account.entity'
import { AccountState } from './account.enums'
import { generateToken, hashToken } from './account.token'
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

/**
 * Links re-sent per account per hour — item 11 of the security checklist.
 *
 * Three, like the password reset: a person who is not receiving the email tries
 * a couple of times, and anything beyond that is either a flood aimed at a
 * stranger or a loop in the client.
 */
export const VERIFICATION_RESEND_MAX_PER_HOUR = 3

const ONE_HOUR_MS = 60 * 60 * 1000

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name)
  // Read at boot, like every other value a template needs to not go out
  // blank (2026-09-23 review).
  private readonly webUrl = readWebUrl()

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

    // Invalidated, never `usedAt` — see the entity comment on why the two
    // must not share a column (2026-09-23 review). This row was superseded,
    // not the one that verified anything.
    const invalidated = await em.nativeUpdate(
      EmailVerification,
      { account: account.id, usedAt: null, invalidatedAt: null },
      { invalidatedAt: new Date() },
    )

    // Worth seeing: a steady stream of re-issues means links are not arriving,
    // and a burst from one account means someone is hammering the resend.
    // Neither is visible from anywhere else.
    if (invalidated > 0) {
      this.logger.log(`reissued verification for account ${account.id}, invalidated ${invalidated}`)
    }

    // The value travels by email; only its hash is stored — see account.token.
    const token = generateToken()

    em.persist(
      em.create(EmailVerification, {
        account: em.getReference(Account, account.id),
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      }),
    )
    await em.flush()

    // Not awaited, for two reasons that point the same way.
    //
    // Security: awaiting makes the response time depend on whether there was
    // anything to send. The resend endpoint answers immediately for an unknown
    // address and would wait on a provider round-trip — hundreds of
    // milliseconds — for a pending one. That difference enumerates accounts
    // with a stopwatch, which is precisely what RF-070 spends the sign-up flow
    // preventing.
    //
    // Behaviour: a delivery failure must not undo a sign-up that already
    // committed. Throwing here would answer 500 with the account created, the
    // person would retry, hit the "address already taken" branch, and end up
    // owning an account they cannot reach.
    void deliverWithoutThrowing(
      this.mailSender,
      {
        to: account.email,
        kind: TransactionalEmail.VERIFY_ADDRESS,
        data: { url: `${this.webUrl}/verify-email?token=${encodeURIComponent(token)}` },
      },
      this.logger,
    )
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
    // Not awaited, same reasoning as sendVerification: the response must not
    // reveal, by how long it took, which branch was taken.
    void deliverWithoutThrowing(
      this.mailSender,
      { to: email, kind: TransactionalEmail.ADDRESS_ALREADY_REGISTERED, data: {} },
      this.logger,
    )
  }

  /**
   * Re-issues the link for an address, if there is anything to re-issue.
   *
   * Answers nothing either way. Telling the caller whether the address has a
   * pending account would hand over exactly what RF-070 spends the whole
   * sign-up flow hiding — and this endpoint would be the easiest place to ask.
   *
   * This is the way out of a delivery failure: sign-up does not fail when the
   * provider is down, so without a resend an account could exist with no link
   * ever sent and no way to ask for another.
   */
  async resend(email: string): Promise<void> {
    const em = this.em.fork()
    const account = await em.findOne(Account, { email: email.trim().toLowerCase() })

    // Nothing to do for an unknown address, or for one already verified.
    // Re-sending to a verified account would let anyone spam a stranger
    // inbox by typing their address.
    if (!account || account.emailVerified) {
      return
    }

    // Per-account cap — item 11 of the security checklist, mirroring
    // PASSWORD_RESET_MAX_PER_HOUR. The per-IP bucket on the controller stops
    // one machine; this stops one inbox from being flooded, whether the
    // request came from the public route (any address) or from the button on
    // the logged-in home (issue #171), which made this one click away.
    const issuedLastHour = await em.count(EmailVerification, {
      account: account.id,
      createdAt: { $gt: new Date(Date.now() - ONE_HOUR_MS) },
    })

    if (issuedLastHour >= VERIFICATION_RESEND_MAX_PER_HOUR) {
      // Worth seeing: either someone is hammering one inbox, or a person is
      // stuck and not receiving the email.
      this.logger.warn(`verification resend limit reached for account ${account.id}`)
      return
    }

    // ponytail: two requests racing past the count above can both send — the
    // same accepted gap as PASSWORD_RESET_MAX_PER_HOUR. The cap is a courtesy
    // to a stranger's inbox, not a security boundary, and LOGIN_THROTTLE
    // (5/min per IP) already bounds how fast one caller can race it. A
    // per-account lock would close it, if it ever matters.
    await this.sendVerification(account)
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

    // A second click on the LINK THAT WORKED is the normal thing people do:
    // say it worked rather than "invalid", which reads like a bug in the
    // product. A link a resend superseded is a different thing (2026-09-23
    // review, was conflated with the above): it never verified anything, so
    // it must not answer success just because a newer link came after it.
    if (verification.usedAt) {
      return
    }
    if (verification.invalidatedAt) {
      throw new BadRequestException('invalid_verification_token')
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
    // A hard delete, not the anonymisation the LGPD policy prescribes for
    // account deletion — and correctly so: an unverified account has no match
    // history, no elo and no reputation events, so there is nothing whose
    // traceability could break. If an unverified account ever gains something
    // attached to it, this choice has to be revisited.
    const em = this.em.fork()

    return em.nativeDelete(Account, {
      state: AccountState.UNVERIFIED,
      emailVerified: false,
      createdAt: { $lt: new Date(now.getTime() - UNVERIFIED_ACCOUNT_TTL_MS) },
    })
  }
}
