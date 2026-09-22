import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { listFiles } from './support/list-files'

const WEB_SRC = join(__dirname, '..', '..', 'web', 'src')

/** `apiFetch('/api/...', { method: 'PUT' })` — the only way the web reaches the API. */
const CALL = /apiFetch\(\s*'(\/api\/[^']+)'(?:\s*,\s*\{([\s\S]*?)\n\s*\}\s*\))?/g

interface WebCall {
  path: string
  method: string
  file: string
}

function callsFromWeb(): WebCall[] {
  const calls: WebCall[] = []

  for (const file of listFiles(WEB_SRC, /\.tsx?$/)) {
    // The web's own tests assert against these paths too; only real callers count.
    if (/\.(test|spec)\.tsx?$/.test(file)) {
      continue
    }

    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(CALL)) {
      const method = /method:\s*'(\w+)'/.exec(match[2] ?? '')?.[1] ?? 'GET'
      calls.push({ path: match[1]!, method, file: file.slice(WEB_SRC.length + 1) })
    }
  }

  return calls
}

/**
 * The web and the API are two processes with no shared type for their paths, so
 * a rename on one side is invisible to the other until someone clicks the
 * button. That is exactly what happened on 2026-09-21, when the route
 * convention (#173) moved ten routes at once.
 *
 * This asks the real app about every path the web actually calls. A 404 (or a
 * 405 for the wrong verb) fails; 401, 403 and 400 all pass, because they prove
 * the route exists and only the session or the body is missing.
 */
describe('every API path the web calls exists', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'
    process.env.WEBHOOK_SECRET ??= 'test-webhook-secret-not-the-placeholder'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')
    process.env.THROTTLE_DISABLED = 'true'

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('finds the calls in the web source, so an empty run never passes silently', () => {
    const calls = callsFromWeb()

    expect(calls.length).toBeGreaterThanOrEqual(5)
    expect(calls.every((call) => call.path.startsWith('/api/'))).toBe(true)
  })

  it.each(callsFromWeb().map((call) => [`${call.method} ${call.path}`, call] as const))(
    '%s',
    async (_name, call) => {
      const verb = call.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'
      const response = await request(app.getHttpServer())[verb](call.path)

      expect({ status: response.status, file: call.file }).not.toMatchObject({ status: 404 })
      expect({ status: response.status, file: call.file }).not.toMatchObject({ status: 405 })
    },
  )
})
