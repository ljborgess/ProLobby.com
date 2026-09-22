import { spawn } from 'node:child_process'

/**
 * `pg_dump` / `pg_restore` without putting the connection string on argv.
 *
 * A URI on the command line shows up in `ps` (and therefore in any host-level
 * audit). The variables below are how libpq is meant to be configured; the
 * URL is parsed once and forgotten.
 */
export type PgTarget = {
  host: string
  port: string
  user: string
  password: string
  database: string
  sslMode?: string
}

export function parseDatabaseUrl(url: string): PgTarget {
  const parsed = new URL(url)
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, '').split('?')[0] ?? '')
  if (!parsed.hostname || !parsed.username || !database) {
    throw new Error('DATABASE_URL must include host, user and database')
  }
  return {
    host: parsed.hostname,
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    sslMode: parsed.searchParams.get('sslmode') ?? undefined,
  }
}

function libpqEnv(target: PgTarget): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PGHOST: target.host,
    PGPORT: target.port,
    PGUSER: target.user,
    PGPASSWORD: target.password,
    PGDATABASE: target.database,
  }
  if (target.sslMode) {
    env.PGSSLMODE = target.sslMode
  }
  return env
}

/** Kept on failure only, and only this much — a runaway pg_dump must not OOM the container over its own error text. */
const STDERR_EXCERPT_BYTES = 4_096

/** Exported for pg.spec.ts: the retry-worthy bug lives in the spawn plumbing, not in `pg_dump`'s own behaviour, so the test drives it with a stand-in command instead of requiring the real binary in every environment that runs `pnpm test`. */
export function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  input?: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let stderrBytes = 0
    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(chunk)
    })
    // Kept, not discarded: a silent backup failure is worse than libpq's own
    // failure message, which is host/user/database — none of them secret,
    // and exactly what an operator needs to fix a broken dump without first
    // reproducing it by hand. The password itself is never echoed by libpq,
    // but it is still scrubbed below before this leaves the process, in case
    // a future libpq version or a driver error path ever changes that.
    child.stderr.on('data', (chunk: Buffer) => {
      // Trimmed to the remaining budget, not just gated on it: a single write
      // can carry the whole 200 KB a runaway process produces in one chunk,
      // and checking the running total *before* pushing would let that whole
      // chunk through once, before the next check ever sees the new total.
      const remaining = STDERR_EXCERPT_BYTES - stderrBytes
      if (remaining > 0) {
        stderr.push(chunk.subarray(0, remaining))
        stderrBytes += chunk.length
      }
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        const excerpt = redact(Buffer.concat(stderr).toString('utf8').trim(), env)
        reject(new Error(`${command} exited ${code}${excerpt ? `: ${excerpt}` : ''}`))
        return
      }
      resolve(Buffer.concat(stdout))
    })
    child.stdin.end(input ?? Buffer.alloc(0))
  })
}

/** Belt and braces: strips the one value in `env` that must never leave this process, if it ever showed up. */
function redact(text: string, env: NodeJS.ProcessEnv): string {
  const password = env.PGPASSWORD
  return password ? text.split(password).join('[redacted]') : text
}

/** Custom format (`-Fc`): restore is selective and `--clean` is well-defined. */
export function dumpDatabase(target: PgTarget): Promise<Buffer> {
  return run('pg_dump', ['-Fc', '--no-owner', '--no-acl'], libpqEnv(target))
}

export function restoreDatabase(target: PgTarget, dump: Buffer): Promise<void> {
  return run(
    'pg_restore',
    ['--clean', '--if-exists', '--no-owner', '--no-acl', '-d', target.database],
    libpqEnv(target),
    dump,
  ).then(() => undefined)
}
