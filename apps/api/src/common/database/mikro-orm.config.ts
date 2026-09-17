import { Migrator } from '@mikro-orm/migrations'
import { defineConfig } from '@mikro-orm/postgresql'

// Data model: docs/requisitos/03-dados.md.
// Not imported by app.module.ts yet — the API boots without a database until
// the first endpoint needs one (issue #84). This config serves the migration
// CLI and the tests that open a connection.
/**
 * The local Docker Postgres, and only ever that.
 *
 * In production a missing DATABASE_URL must stop the boot rather than fall
 * back here: the fallback points at a database that does not exist on the
 * VM, so the failure would surface as a connection error at the first
 * request instead of a configuration error at startup — and, on a machine
 * where something *is* listening on 5432, at no point at all. Same rule as
 * corsOrigins() in security.config.ts.
 */
function clientUrl(): string {
  const configured = process.env.DATABASE_URL

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production')
    }
    return 'postgres://prolobby:prolobby@localhost:5432/prolobby'
  }

  if (process.env.NODE_ENV === 'production' && !configured.includes('sslmode=require')) {
    // ADR-009 decision 1: both Neon URLs carry sslmode and channel_binding.
    // A URL pasted without them connects without complaining, in cleartext,
    // and nothing downstream ever mentions it again.
    throw new Error(
      'DATABASE_URL must carry sslmode=require in production — the database is reached over the public internet (ADR-009)',
    )
  }

  return configured
}

export default defineConfig({
  clientUrl: clientUrl(),
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  debug: process.env.NODE_ENV !== 'production',
  extensions: [Migrator],
  // Neon hibernates after 5 minutes idle and drops leftover connections
  // (ADR-009). Starting at zero lets the pool reconnect on the next request
  // instead of holding a dead client overnight and burning CU-hours.
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 10_000,
  },
  migrations: {
    path: './dist/common/database/migrations',
    pathTs: './src/common/database/migrations',
    // Migrations are versioned, reviewed code — not something the ORM applies
    // on boot: schema.update() in production is the short path to losing a
    // column with nobody approving it.
    disableForeignKeys: false,
    snapshot: false,
  },
})
