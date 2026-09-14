import { MikroORM } from '@mikro-orm/postgresql'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import config from '../src/common/database/mikro-orm.config'

const SESSION_BOUND = /\b(listen|notify|pg_advisory_lock|pg_advisory_xact_lock|set session|set local)\b/i

/**
 * Replaces the provisional `SELECT 1` smoke test (issue #81).
 *
 * Proves migrations, not the ORM's schema generator: a class that was never
 * turned into a migration is the bug this exists to catch, and
 * `refreshDatabase()` would hide it.
 *
 * Table names come from entity metadata, not a hardcoded count — the issue
 * text still says "6 tables", which is stale (email_verification landed later).
 */
describe('migrations', () => {
  let orm: MikroORM

  beforeAll(async () => {
    orm = await MikroORM.init(config)
  }, 60_000)

  afterAll(async () => {
    if (orm) {
      await orm.getSchemaGenerator().refreshDatabase()
      await orm.close(true)
    }
  }, 60_000)

  it('has no session-bound SQL that would break behind PgBouncer', async () => {
    const dir = path.join(__dirname, '../src/common/database/migrations')
    const files = (await readdir(dir)).filter((name) => name.endsWith('.ts'))
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const sql = await readFile(path.join(dir, file), 'utf8')
      expect(sql).toMatch(/async down\(/)
      expect(sql.match(SESSION_BOUND)).toBeNull()
    }
  })

  it('applies every migration on an empty database and matches the entities', async () => {
    const generator = orm.getSchemaGenerator()
    const migrator = orm.getMigrator()

    await generator.dropSchema()
    await orm.em.getConnection().execute('drop table if exists mikro_orm_migrations cascade')

    await migrator.up()

    const expected = entityTableNames(orm)
    expect(expected.length).toBeGreaterThan(0)
    const tables = await listPublicTables(orm)
    for (const table of expected) {
      expect(tables).toContain(table)
    }

    // Empty diff = columns, types, indexes and uniques all match the classes.
    const drift = await generator.getUpdateSchemaSQL({ wrap: false })
    expect(drift.trim()).toBe('')
  }, 60_000)

  it('reverts every migration back to an empty public schema', async () => {
    const migrator = orm.getMigrator()
    await migrator.up()

    const executed = await migrator.getExecutedMigrations()
    for (let i = 0; i < executed.length; i += 1) {
      await migrator.down()
    }

    const tables = await listPublicTables(orm)
    for (const table of entityTableNames(orm)) {
      expect(tables).not.toContain(table)
    }

    await migrator.up()
  }, 60_000)
})

function entityTableNames(orm: MikroORM): string[] {
  return [
    ...new Set(
      Object.values(orm.getMetadata().getAll())
        .map((meta) => meta.tableName)
        .filter((name): name is string => Boolean(name)),
    ),
  ]
}

async function listPublicTables(orm: MikroORM): Promise<string[]> {
  const rows = await orm.em.getConnection().execute<{ tablename: string }[]>(
    `select tablename from pg_catalog.pg_tables where schemaname = 'public'`,
  )
  return rows.map((row) => row.tablename)
}
