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

  // The column is the HMAC, never the readable Discord ID (RNF-009 / item 5 of
  // the security checklist). Uniqueness has to hold on the hash, because that
  // is the only form the ID is ever stored in — a unique index on a column
  // that no longer exists would let two accounts claim the same Discord.
  it('refuses two accounts with the same Discord ID hash, but allows many without one', async () => {
    const connection = orm.em.getConnection()
    const hash = 'a'.repeat(64)

    await connection.execute(
      `insert into "account" (${baseColumns}, "discord_id_hash") values (${baseValues('discord-a@test.local')}, '${hash}')`,
    )

    await expect(
      connection.execute(
        `insert into "account" (${baseColumns}, "discord_id_hash") values (${baseValues('discord-b@test.local')}, '${hash}')`,
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

  /**
   * The regression guard for RNF-009 on this table. A readable `discord_id`
   * column is what the data model ruled out in 2026-09-11 and what the schema
   * carried anyway until 2026-09-18 — nothing failed while it existed, which
   * is exactly why it survived. This test is the thing that would have failed.
   */
  it('stores the Discord ID only as hash and ciphertext, never in plain text', async () => {
    const columns = await orm.em.getConnection().execute<{ column_name: string }[]>(
      `select column_name from information_schema.columns
         where table_name = 'account' and column_name like 'discord%'`,
    )
    const names = columns.map((column) => column.column_name)

    expect(names).toContain('discord_id_hash')
    expect(names).toContain('discord_id_encrypted')
    expect(names).not.toContain('discord_id')
  })
})
