/**
 * Refuses to run the e2e suites against a database that is not meant for them —
 * audit of 2026-09-21.
 *
 * Sixteen suites call `refreshDatabase()`, which drops every table. Pointed at
 * the database `pnpm dev` uses (the default, and what `.env` holds), one run
 * wiped the accounts someone was testing by hand. A name ending in `_e2e` is the
 * opt-in: nothing else is disposable by accident.
 */
const url = process.env.DATABASE_URL ?? 'postgres://prolobby:prolobby@localhost:5432/prolobby'
const name = new URL(url).pathname.slice(1)

if (!name.endsWith('_e2e')) {
  throw new Error(
    [
      `e2e refused: DATABASE_URL points at "${name}", and these suites drop every table.`,
      'Use a database whose name ends in _e2e, for example:',
      '  docker compose exec postgres createdb -U prolobby prolobby_e2e',
      '  DATABASE_URL=postgres://prolobby:prolobby@localhost:5432/prolobby_e2e pnpm turbo e2e',
    ].join('\n'),
  )
}
