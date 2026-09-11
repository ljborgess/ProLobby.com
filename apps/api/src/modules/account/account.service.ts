import { EntityManager } from '@mikro-orm/postgresql'
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'

import { HashService } from '../../common/auth/hash.service'
import { isOldEnough } from './account.age'
import { Account } from './account.entity'
import { CapacityService } from './capacity.service'
import type { SignUpDto } from './dto/sign-up.dto'

@Injectable()
export class AccountService {
  constructor(
    private readonly em: EntityManager,
    private readonly hashService: HashService,
    private readonly capacityService: CapacityService,
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

    // The hashing happens either way. Skipping it when the address is taken
    // would make the taken case answer measurably faster, and RF-070 would be
    // defeated by a stopwatch rather than by the response body.
    const [passwordHash, securityAnswerHash] = await Promise.all([
      this.hashService.hash(dto.password),
      this.hashService.hash(normaliseSecurityAnswer(dto.securityAnswer)),
    ])

    if (existing) {
      // RF-020 + RF-070: silence here, and an email to the owner of the
      // address telling them an account already exists. Sending that email is
      // issue #89; until then this branch simply does not create anything.
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
    } catch (error) {
      // Two requests for the same address can both pass the findOne above and
      // reach the insert. The unique index is what actually enforces RF-020,
      // and losing that race must look exactly like the "already exists" case.
      if (isUniqueViolation(error)) {
        return
      }
      throw error
    }
  }
}

/**
 * Folds case, accents and inner whitespace off a security answer.
 *
 * Without it, "São Paulo", "sao paulo" and " São  Paulo " hash differently, and
 * the legitimate person fails their own recovery factor — at the worst possible
 * moment, since reaching RF-025 means they already lost both email and Discord.
 *
 * Accent folding is deliberate and has a cost: it shrinks the search space for
 * someone guessing. Accepted, because the alternative is a recovery path that
 * only works if the person remembers how they typed an accent months ago.
 */
export function normaliseSecurityAnswer(answer: string): string {
  return answer
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Postgres unique-violation SQLSTATE. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
