import {
  composeServiceBlock,
  composeServiceNames,
  readRepoFile,
  serviceDeclaresPorts,
  withoutComments,
} from './production-compose'

describe('production compose (ADR-009 / #121)', () => {
  const prod = readRepoFile('docker-compose.prod.yml')
  const dev = readRepoFile('docker-compose.yml')
  const tunnel = readRepoFile('deploy/cloudflared.yml')

  it('runs web, api, api-migrate, api-backup, bot and cloudflared — and no Postgres', () => {
    expect(composeServiceNames(prod).sort()).toEqual(
      ['api', 'api-backup', 'api-migrate', 'bot', 'cloudflared', 'web'].sort(),
    )
  })

  /**
   * The API healthcheck probed `/health` while the route is `/api/health` —
   * `applySecurity` puts a global prefix on everything, with no exclusion. A
   * 404 makes `r.ok` false, so the container never becomes healthy, and `web`
   * waits on `condition: service_healthy` forever: the whole deploy stops on a
   * URL nobody could see was wrong. Third time this prefix bites (the tunnel
   * path and `main.ts` were the other two), hence a test and not just a fix.
   */
  it('probes the API health route behind the global prefix, not at the root', () => {
    const api = composeServiceBlock(prod, 'api')

    expect(api).toContain('/api/health')
    // Belt and braces: catches a later edit that drops the prefix back.
    expect(api).not.toMatch(/127\.0\.0\.1:3001\/health/)
  })

  it('publishes no ports on any production service — item 11 / ADR-009', () => {
    for (const name of composeServiceNames(prod)) {
      expect(serviceDeclaresPorts(composeServiceBlock(prod, name))).toBe(false)
    }
  })

  it('keeps the local Postgres publish on the dev compose, and only there', () => {
    expect(composeServiceNames(dev)).toEqual(['postgres'])
    expect(serviceDeclaresPorts(composeServiceBlock(dev, 'postgres'))).toBe(true)
  })

  it('does not put the Nest API or the bot webhook on the tunnel', () => {
    const ingress = withoutComments(tunnel)
    expect(ingress).toContain('http://web:3000')
    expect(ingress).not.toContain('http://api:')
    expect(ingress).not.toContain('http://bot:')
    expect(ingress).not.toContain('/events')
    expect(ingress).not.toContain(':3001')
    expect(ingress).not.toContain(':3002')
  })

  /**
   * Audit of 2026-09-21: the API wrote account-recovery evidence inside the
   * container, as `node`, into a root-owned tree, with no volume. Two failures
   * in one: EACCES lost every recovery at once, and even writable, each deploy
   * would have deleted the evidence behind every open case.
   */
  it('keeps account-recovery evidence on a volume the non-root process owns', () => {
    const api = composeServiceBlock(prod, 'api')
    const dockerfile = readRepoFile('apps/api/Dockerfile')

    expect(api).toContain('api-evidence:/app/apps/api/uploads')
    expect(api).toContain('EVIDENCE_DIR: /app/apps/api/uploads/account-recovery')
    expect(withoutComments(prod)).toMatch(/^volumes:\n\s+api-evidence:/m)
    expect(dockerfile).toContain('chown -R node:node /app/apps/api/uploads')
    expect(dockerfile.indexOf('chown -R node:node')).toBeLessThan(dockerfile.indexOf('USER node'))
  })

  it('sends the API at the bot over Docker DNS, not a published port', () => {
    const api = composeServiceBlock(prod, 'api')
    expect(api).toContain('BOT_WEBHOOK_URL: http://bot:3002/events')
  })

  it('runs migrations with the direct URL, never with the API role', () => {
    const migrate = withoutComments(composeServiceBlock(prod, 'api-migrate'))
    const api = withoutComments(composeServiceBlock(prod, 'api'))
    expect(migrate).toContain('DATABASE_DIRECT_URL')
    expect(migrate).toContain('target: runner')
    expect(api).not.toContain('DATABASE_DIRECT_URL')
  })

  /**
   * Issue #123: pg_dump needs the owner URL and postgresql-client. Putting
   * either on the API process would break ADR-009 (prolobby_app has no DDL)
   * and would keep a dump binary in the request path. The backup stage is a
   * one-shot profile, not `up -d`.
   */
  it('dumps from a one-shot backup image that is not the API process', () => {
    const backup = composeServiceBlock(prod, 'api-backup')
    const api = composeServiceBlock(prod, 'api')
    const dockerfile = readRepoFile('apps/api/Dockerfile')

    expect(withoutComments(backup)).toContain('DATABASE_DIRECT_URL')
    expect(backup).toContain('target: backup')
    expect(backup).toContain('profiles:')
    expect(backup).toMatch(/restart: ['"]no['"]/)
    expect(serviceDeclaresPorts(backup)).toBe(false)
    expect(api).toContain('target: runner')
    expect(dockerfile).toContain('FROM runner AS backup')
    expect(dockerfile).toContain('postgresql-client')
    expect(dockerfile).toContain('dist/common/backup/cli.js')
  })

  /**
   * Issue #168: before this, `api` and `web` had a healthcheck and `bot` did
   * not — a bot that lost its gateway connection stayed "up" as far as Compose
   * could tell, and RF-060 (#150) needs the bot to be really connected.
   */
  it('checks the bot over its own /health route, not just that the process exists', () => {
    const bot = composeServiceBlock(prod, 'bot')

    expect(bot).toContain('healthcheck')
    expect(bot).toContain('127.0.0.1:3002/health')
    expect(serviceDeclaresPorts(bot)).toBe(false)
  })
})
