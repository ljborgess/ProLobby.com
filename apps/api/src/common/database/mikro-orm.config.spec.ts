import mikroOrmConfig from './mikro-orm.config'

describe('mikro-orm pool (ADR-009 / Neon)', () => {
  it('starts with zero connections so hibernation can drop them', () => {
    expect(mikroOrmConfig.pool).toMatchObject({ min: 0, max: 10, idleTimeoutMillis: 10_000 })
  })
})
