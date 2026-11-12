import { MikroORM } from '@mikro-orm/postgresql'

import config from '../../common/database/mikro-orm.config'
import { AuditAction, recordAudit } from '../moderation/audit-entry.entity'
import { Account } from './account.entity'
import { AccountRole } from './account.enums'

/**
 * Wipes a moderator's second factor so they can set it up again — #311, for
 * when the phone with the authenticator is lost and the recovery codes too.
 *
 *   node dist/modules/account/reset-two-factor.cli.js someone@example.com you@example.com
 *
 * Same rules as `set-role.cli`: the second argument is who runs it and must be
 * an admin, and the reset and its audit entry commit together. Nobody resets
 * their own factor — someone who lost it is exactly who must not vouch for it.
 * Every session the account holds stops working, so a thief who has a
 * session from before the reset loses it too.
 *
 * Run by hand against the database, never by the API process.
 */
export function parseArgs(argv: string[]): { email: string; operator: string } {
  const [email, operator] = argv
  if (!email || !operator) {
    throw new Error('usage: reset-two-factor.cli.js <email> <your admin email>')
  }
  return { email: email.trim().toLowerCase(), operator: operator.trim().toLowerCase() }
}

/** The reset and its audit entry, in one transaction. Exported for the e2e. */
export async function resetTwoFactor(
  orm: MikroORM,
  { email, operator }: { email: string; operator: string },
  now: Date = new Date(),
): Promise<void> {
  if (email === operator) throw new Error('an admin cannot reset their own second factor')
  await orm.em.fork().transactional(async (em) => {
    const admin = await em.findOne(Account, { email: operator })
    if (!admin || admin.role !== AccountRole.ADMIN) {
      throw new Error(`${operator} is not an admin account`)
    }
    const account = await em.findOne(Account, { email })
    if (!account) throw new Error(`no account with email ${email}`)
    const wasEnabled = Boolean(account.totpEnabledAt)
    account.totpSecretEncrypted = undefined
    account.totpEnabledAt = undefined
    account.totpLastStep = undefined
    account.recoveryCodeHashes = undefined
    account.sessionsValidFrom = now
    recordAudit(em, {
      action: AuditAction.TWO_FACTOR_RESET,
      actorId: admin.id,
      actorLabel: `cli:${operator}`,
      targetAccountId: account.id,
      before: { enabled: wasEnabled },
      after: { enabled: false },
    })
  })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const orm = await MikroORM.init(config)
  try {
    await resetTwoFactor(orm, args)
    process.stdout.write(`${args.email}: second factor reset; set it up again at next sign-in\n`)
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
