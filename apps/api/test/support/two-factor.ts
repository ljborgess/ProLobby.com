import type { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { SESSION_COOKIE_NAME } from '../../src/common/security/session-cookie'
import {
  fromBase32,
  generateOneTimeCode,
  hashRecoveryCode,
  stepOf,
  totpAt,
} from '../../src/common/security/totp'
import { Account } from '../../src/modules/account/account.entity'

/** What an authenticator app would show right now for this secret. */
export const codeFor = (secret: Buffer, now = new Date(), offsetSteps = 0): string =>
  totpAt(secret, stepOf(now) + offsetSteps)

const cookieOf = (res: request.Response): string => {
  const header = res.headers['set-cookie']
  const cookies = Array.isArray(header) ? header : [header]
  return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
}

/**
 * Turns on the panel's second factor for a moderator's session (#311) and
 * returns the upgraded cookie, the secret and the recovery codes — what a
 * moderator would have after scanning the code once.
 */
export async function withSecondFactor(
  app: INestApplication,
  orm: MikroORM,
  email: string,
  cookie: string,
): Promise<{ cookie: string; secret: Buffer; recoveryCodes: string[] }> {
  const enrollmentCode = await enroll(orm, email)
  const setup = await request(app.getHttpServer())
    .post('/api/accounts/me/two-factor/setup')
    .set('Cookie', cookie)
    .send({ enrollmentCode })
  if (setup.status !== 200) throw new Error(`2FA setup answered ${setup.status}`)
  const secret = fromBase32(setup.body.secret as string)
  const activation = await request(app.getHttpServer())
    .post('/api/accounts/me/two-factor/activation')
    .set('Cookie', cookie)
    .send({ code: codeFor(secret) })
  if (activation.status !== 200) throw new Error(`2FA activation answered ${activation.status}`)
  return { cookie: cookieOf(activation), secret, recoveryCodes: activation.body.recoveryCodes }
}

/** What `two-factor-enrollment.cli` would hand over, written straight to the row. */
export async function enroll(orm: MikroORM, email: string): Promise<string> {
  const code = generateOneTimeCode()
  const em = orm.em.fork()
  const account = await em.findOneOrFail(Account, { email })
  account.twoFactorEnrollmentHash = hashRecoveryCode(code)
  account.twoFactorEnrollmentExpiresAt = new Date(Date.now() + 60 * 60 * 1000)
  await em.flush()
  return code
}
