import { MikroORM } from '@mikro-orm/postgresql'

import config from '../../common/database/mikro-orm.config'
import { Account } from './account.entity'
import { AccountRole } from './account.enums'

/**
 * Gives or takes a platform role — the only way a moderator is made, since
 * no route can raise a role (docs/produto/04-governanca/01-moderacao.md).
 *
 *   node dist/modules/account/set-role.cli.js someone@example.com moderator
 *   node dist/modules/account/set-role.cli.js someone@example.com user
 *
 * Run by hand against the database, never by the API process.
 */
export function parseArgs(argv: string[]): { email: string; role: AccountRole } {
  const [email, role] = argv
  if (!email || !role) {
    throw new Error('usage: set-role.cli.js <email> <user|moderator|admin>')
  }
  if (!(Object.values(AccountRole) as string[]).includes(role)) {
    throw new Error(`unknown role ${role}`)
  }
  return { email: email.trim().toLowerCase(), role: role as AccountRole }
}

async function main(): Promise<void> {
  const { email, role } = parseArgs(process.argv.slice(2))
  const orm = await MikroORM.init(config)
  try {
    const changed = await orm.em.fork().nativeUpdate(Account, { email }, { role })
    if (changed === 0) {
      throw new Error(`no account with email ${email}`)
    }
    process.stdout.write(`${email} is now ${role}\n`)
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
