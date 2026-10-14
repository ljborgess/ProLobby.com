import { MikroORM } from '@mikro-orm/postgresql'

import config from '../../common/database/mikro-orm.config'
import { AuditAction, recordAudit } from '../moderation/audit-entry.entity'
import { Account } from './account.entity'
import { AccountRole } from './account.enums'

/**
 * Gives or takes a platform role — the only way a moderator is made, since
 * no route can raise a role (docs/produto/04-governanca/01-moderacao.md).
 *
 *   node dist/modules/account/set-role.cli.js someone@example.com moderator you@example.com
 *   node dist/modules/account/set-role.cli.js someone@example.com user you@example.com
 *
 * The third argument is who runs it, and it must be an admin account: the
 * change and its audit entry (#243) commit together, so a role never moves
 * without a record of who moved it, from what, to what. While no admin exists
 * at all, the first one can still be made (there is nobody to vouch for it);
 * the entry then reads `cli:bootstrap:<operator>`.
 *
 * Run by hand against the database, never by the API process.
 */
export function parseArgs(argv: string[]): { email: string; role: AccountRole; operator: string } {
  const [email, role, operator] = argv
  if (!email || !role || !operator) {
    throw new Error('usage: set-role.cli.js <email> <user|moderator|admin> <your admin email>')
  }
  if (!(Object.values(AccountRole) as string[]).includes(role)) {
    throw new Error(`unknown role ${role}`)
  }
  return {
    email: email.trim().toLowerCase(),
    role: role as AccountRole,
    operator: operator.trim().toLowerCase(),
  }
}

/** The change and its audit entry, in one transaction. Exported for the e2e. */
export async function setRole(
  orm: MikroORM,
  { email, role, operator }: { email: string; role: AccountRole; operator: string },
): Promise<void> {
  await orm.em.fork().transactional(async (em) => {
    const bootstrap = (await em.count(Account, { role: AccountRole.ADMIN })) === 0
    const admin = await em.findOne(Account, { email: operator })
    if (!bootstrap && (!admin || admin.role !== AccountRole.ADMIN)) {
      throw new Error(`${operator} is not an admin account`)
    }
    const account = await em.findOne(Account, { email })
    if (!account) {
      throw new Error(`no account with email ${email}`)
    }
    const before = account.role
    account.role = role
    recordAudit(em, {
      action: AuditAction.ROLE_CHANGED,
      actorId: admin?.id,
      actorLabel: bootstrap ? `cli:bootstrap:${operator}` : `cli:${operator}`,
      targetAccountId: account.id,
      before: { role: before },
      after: { role },
    })
  })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const orm = await MikroORM.init(config)
  try {
    await setRole(orm, args)
    process.stdout.write(`${args.email} is now ${args.role}\n`)
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
