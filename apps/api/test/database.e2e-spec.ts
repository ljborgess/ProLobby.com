import { MikroORM } from '@mikro-orm/postgresql'

import config from '../src/common/database/mikro-orm.config'

// Prova que o Postgres está de pé e alcançável — no CI (service do
// workflow) e localmente (docker-compose da raiz). Sem ele, um `services:`
// mal configurado passaria despercebido, porque nenhum outro teste toca o
// banco ainda: o CI ficaria verde com banco nenhum e a falha só apareceria
// no PR do schema (issue #67).
//
// Este teste some quando a primeira entidade real tiver teste de migration
// end-to-end — aí a cobertura de "o banco responde" vem de graça junto.
describe('Postgres', () => {
  it('responde a uma query trivial', async () => {
    const orm = await MikroORM.init({
      ...config,
      entities: [],
      entitiesTs: [],
      discovery: { warnWhenNoEntities: false },
    })

    try {
      const rows = await orm.em.getConnection().execute<{ ok: number }[]>('select 1 as ok')
      expect(rows).toHaveLength(1)
      expect(rows[0]?.ok).toBe(1)
    } finally {
      await orm.close(true)
    }
  }, 30_000)
})
