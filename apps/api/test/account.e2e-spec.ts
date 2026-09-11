import { MikroORM } from '@mikro-orm/postgresql'

import config from '../src/common/database/mikro-orm.config'
import { AccountPlan, AccountRole, AccountState } from '../src/modules/account/account.enums'

/**
 * Proves the account table exists as the data model describes it — defaults,
 * unique constraints and all — against a real Postgres.
 *
 * Defaults are checked at the *database* level on purpose: a default that
 * lives only in the entity class silently disappears the moment a row is
 * inserted by a migration, a seed script or a manual fix.
 */
describe('account table', () => {
  let orm: MikroORM

  beforeAll(async () => {
    orm = await MikroORM.init(config)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    await orm.close(true)
  })

  const baseColumns = `"id", "email", "password_hash", "birth_date", "security_question", "security_answer_hash", "created_at"`
  const baseValues = (email: string) =>
    `gen_random_uuid(), '${email}', 'hash', '1990-01-01', 'question?', 'hash', now()`

  it('applies the documented defaults at database level', async () => {
    const connection = orm.em.getConnection()
    await connection.execute(
      `insert into "account" (${baseColumns}) values (${baseValues('defaults@test.local')})`,
    )

    const [row] = await connection.execute<
      { role: string; reputation: number; plan: string; state: string; email_verified: boolean }[]
    >(`select role, reputation, plan, state, email_verified from "account"`)

    expect(row?.role).toBe(AccountRole.USER)
    expect(row?.plan).toBe(AccountPlan.NONE)
    expect(row?.state).toBe(AccountState.UNVERIFIED)
    expect(row?.email_verified).toBe(false)
    // 70, not 0: a new account gets the benefit of the doubt.
    expect(Number(row?.reputation)).toBe(70)
  })

  it('refuses two accounts with the same email', async () => {
    const connection = orm.em.getConnection()
    await connection.execute(
      `insert into "account" (${baseColumns}) values (${baseValues('same@test.local')})`,
    )

    await expect(
      connection.execute(
        `insert into "account" (${baseColumns}) values (${baseValues('same@test.local')})`,
      ),
    ).rejects.toThrow()
  })

  it('refuses two accounts with the same Discord ID, but allows many without one', async () => {
    const connection = orm.em.getConnection()
    await connection.execute(
      `insert into "account" (${baseColumns}, "discord_id") values (${baseValues('discord-a@test.local')}, '123')`,
    )

    await expect(
      connection.execute(
        `insert into "account" (${baseColumns}, "discord_id") values (${baseValues('discord-b@test.local')}, '123')`,
      ),
    ).rejects.toThrow()

    // Null is not a duplicate: every account is unlinked until phase 2.3.
    await connection.execute(
      `insert into "account" (${baseColumns}) values (${baseValues('unlinked-1@test.local')})`,
    )
    await connection.execute(
      `insert into "account" (${baseColumns}) values (${baseValues('unlinked-2@test.local')})`,
    )
  })
})
