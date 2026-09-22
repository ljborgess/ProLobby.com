import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Next 16 proxy convention (#157)', () => {
  const src = join(process.cwd(), 'src')

  it('lives in proxy.ts and exports proxy, not the deprecated middleware file', () => {
    expect(existsSync(join(src, 'proxy.ts'))).toBe(true)
    expect(existsSync(join(src, 'middleware.ts'))).toBe(false)
    const source = readFileSync(join(src, 'proxy.ts'), 'utf8')
    expect(source).toContain('export function proxy')
    expect(source).not.toContain('export function middleware')
  })
})
