import { MikroORM } from '@mikro-orm/postgresql'

import config from '../../common/database/mikro-orm.config'
import { generateOneTimeCode, hashRecoveryCode } from '../../common/security/totp'
import { AuditAction, recordAudit } from '../moderation/audit-entry.entity'
import { Account } from './account.entity'
import { AccountRole } from './account.enums'

/** Long enough to hand it over and use it the same day, short enough to go stale. */
export const ENROLLMENT_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Issues the one-time code a moderator needs to set up the panel's second
 * factor — #311. The first time, and again whenever the phone and the
 * recovery codes are lost: any factor the account had is wiped, and every
 * session it holds stops working.
 *
 *   node dist/modules/account/two-factor-enrollment.cli.js someone@example.com you@example.com
 *
 * The second argument is who runs it and must be an admin; the code is
 * printed here and handed over outside the platform (in person, by a call),
 * never through anything a leaked password reaches. An admin may issue their
 * own first code — whoever runs this already has the database — but never
 * wipe their own working factor: someone who lost it is exactly who must not
 * vouch for it. The change and its audit entry commit together.
 *
 * Run by hand against the database, never by the API process.
 */
export function parseArgs(argv: string[]): { email: string; operator: string } {
  const [email, operator] = argv
  if (!email || !operator) {
    throw new Error('usage: two-factor-enrollment.cli.js <email> <your admin email>')
  }
  return { email: email.trim().toLowerCase(), operator: operator.trim().toLowerCase() }
}

/** The new code, its audit entry and the wipe, in one transaction. Exported for the e2e. */
export async function issueEnrollment(
  orm: MikroORM,
  { email, operator }: { email: string; operator: string },
  now: Date = new Date(),
): Promise<string> {
  const code = generateOneTimeCode()
  await orm.em.fork().transactional(async (em) => {
    const admin = await em.findOne(Account, { email: operator })
    if (!admin || admin.role !== AccountRole.ADMIN) {
      throw new Error(`${operator} is not an admin account`)
    }
    const account = await em.findOne(Account, { email })
    if (!account) throw new Error(`no account with email ${email}`)
    const wasEnabled = Boolean(account.totpEnabledAt)
    if (wasEnabled && account.id === admin.id) {
      throw new Error('an admin cannot reset their own second factor')
    }
    account.totpSecretEncrypted = undefined
    account.totpEnabledAt = undefined
    account.totpLastStep = undefined
    account.recoveryCodeHashes = undefined
    account.twoFactorEnrollmentHash = hashRecoveryCode(code)
    account.twoFactorEnrollmentExpiresAt = new Date(now.getTime() + ENROLLMENT_TTL_MS)
    if (wasEnabled) account.sessionsValidFrom = now
    recordAudit(em, {
      action: AuditAction.TWO_FACTOR_ENROLLMENT,
      actorId: admin.id,
      actorLabel: `cli:${operator}`,
      targetAccountId: account.id,
      before: { enabled: wasEnabled },
      after: { enabled: false, enrollmentIssued: true },
    })
  })
  return code
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const orm = await MikroORM.init(config)
  try {
    const code = await issueEnrollment(orm, args)
    process.stdout.write(
      `${args.email}: enrollment code ${code} (valid 24 h, one use). Hand it over in person.\n`,
    )
  } finally {
    await orm.close()
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
}
