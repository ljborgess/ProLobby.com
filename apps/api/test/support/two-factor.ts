import type { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { SESSION_COOKIE_NAME } from '../../src/common/security/session-cookie'
import { stepOf, totpAt } from '../../src/common/security/totp'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function fromBase32(text: string): Buffer {
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of text) {
    value = (value << 5) | BASE32.indexOf(char)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

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
  cookie: string,
): Promise<{ cookie: string; secret: Buffer; recoveryCodes: string[] }> {
  const setup = await request(app.getHttpServer())
    .post('/api/accounts/me/two-factor/setup')
    .set('Cookie', cookie)
  if (setup.status !== 200) throw new Error(`2FA setup answered ${setup.status}`)
  const secret = fromBase32(setup.body.secret as string)
  const activation = await request(app.getHttpServer())
    .post('/api/accounts/me/two-factor/activation')
    .set('Cookie', cookie)
    .send({ code: codeFor(secret) })
  if (activation.status !== 200) throw new Error(`2FA activation answered ${activation.status}`)
  return { cookie: cookieOf(activation), secret, recoveryCodes: activation.body.recoveryCodes }
}
