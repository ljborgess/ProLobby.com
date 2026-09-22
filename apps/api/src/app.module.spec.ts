import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('AppModule middleware routes (#156)', () => {
  const source = readFileSync(join(__dirname, 'app.module.ts'), 'utf8')

  it('uses the Nest 11 named wildcard, not the legacy *', () => {
    expect(source).toContain(".forRoutes('{*splat}')")
    expect(source).not.toMatch(/forRoutes\('\*'\)/)
  })
})
