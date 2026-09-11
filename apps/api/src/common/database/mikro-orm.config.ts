import { Migrator } from '@mikro-orm/migrations'
import { defineConfig } from '@mikro-orm/postgresql'

// Data model: docs/requisitos/03-dados.md.
// Not imported by app.module.ts yet — the API boots without a database until
// the first endpoint needs one (issue #84). This config serves the migration
// CLI and the tests that open a connection.
export default defineConfig({
  clientUrl: process.env.DATABASE_URL ?? 'postgres://prolobby:prolobby@localhost:5432/prolobby',
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  debug: process.env.NODE_ENV !== 'production',
  extensions: [Migrator],
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
