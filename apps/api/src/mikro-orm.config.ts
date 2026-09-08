import { defineConfig } from '@mikro-orm/postgresql'

// Stub — nenhuma entidade ainda (docs/requisitos/03-dados.md define o modelo).
// Não importado em app.module.ts até a primeira entidade nascer (ver ADR-006).
export default defineConfig({
  clientUrl: process.env.DATABASE_URL ?? 'postgres://prolobby:prolobby@localhost:5432/prolobby',
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  debug: process.env.NODE_ENV !== 'production',
})
