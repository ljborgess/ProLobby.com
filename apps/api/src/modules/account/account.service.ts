import { EntityManager } from '@mikro-orm/postgresql'
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'

import { HashService } from '../../common/auth/hash.service'
import { isOldEnough } from './account.age'
import { Account } from './account.entity'
import { normaliseSecurityAnswer } from './account.security-answer'
import { CapacityService } from './capacity.service'
import { EmailVerificationService } from './email-verification.service'
import type { SignUpDto } from './dto/sign-up.dto'

@Injectable()
export class AccountService {
  constructor(
    private readonly em: EntityManager,
    private readonly hashService: HashService,
    private readonly capacityService: CapacityService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Creates an account — RF-019, RF-020, RF-021, RF-070, RF-072.
   *
   * Returns nothing on purpose. The caller always answers the same thing, and
   * what actually happened (account created, or address already taken) travels
   * by email, to the person who owns that address.
   */
  async signUp(dto: SignUpDto): Promise<void> {
    // RF-072: near the free-tier ceiling, sign-up pauses. Checked first, before
    // any hashing, because the whole point is not to spend resources.
    if (await this.capacityService.isSignUpPaused()) {
      throw new ServiceUnavailableException({
        message: 'signup_paused',
        // RF-078: the waiting list is the only way back to this person — with
        // no account, there is no in-app notification and no bot DM.
        waitingListAvailable: true,
      })
    }

    const birthDate = new Date(dto.birthDate)

    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('birthDate is not a valid date')
    }

    // RF-021: under 16 is refused outright, and *this* refusal is explicit.
    // It does not leak anything about other people — unlike the email check
    // below, it is about the data the person just typed.
    if (!isOldEnough(birthDate)) {
      throw new BadRequestException('minimum_age_not_met')
    }

    const existing = await this.em.findOne(Account, { email: dto.email })

    // Hashing runs on both paths. Skipping it for a taken address would make
    // that case answer measurably faster, and RF-070 would fall to a stopwatch
    // rather than to the response body.
    //
    // What this buys is *masking*, not constant time: the free path also runs
    // an insert, so the two are not identical — argon2 simply dominates the
    // total by enough that one query does not stand out. Genuinely constant
    // time would need a fixed-duration response, which is a much bigger
    // hammer than this threat deserves.
    const [passwordHash, securityAnswerHash] = await Promise.all([
      this.hashService.hash(dto.password),
      this.hashService.hash(normaliseSecurityAnswer(dto.securityAnswer)),
    ])

    if (existing) {
      // RF-020 + RF-070: the screen says nothing, and the truth goes to the
      // owner of the address. This email is the *only* way they ever learn an
      // account already exists on it.
      await this.emailVerificationService.notifyAlreadyRegistered(existing.email)
      return
    }

    const account = this.em.create(Account, {
      email: dto.email,
      passwordHash,
      birthDate,
      securityQuestion: dto.securityQuestion,
      securityAnswerHash,
    })

    try {
      await this.em.persistAndFlush(account)
      await this.emailVerificationService.sendVerification(account)
    } catch (error) {
      // Two requests for the same address can both pass the findOne above and
      // reach the insert. The unique index is what actually enforces RF-020,
      // and losing that race must look exactly like the "already exists" case.
      // Two requests for the same address can both pass the findOne above and
      // reach the insert. The unique index is what actually enforces RF-020,
      // and losing that race must look exactly like the "already exists" case
      // — including the email to the owner.
      if (isUniqueViolation(error)) {
        await this.emailVerificationService.notifyAlreadyRegistered(dto.email)
        return
      }
      throw error
    }
  }
}

/** Postgres unique-violation SQLSTATE. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
