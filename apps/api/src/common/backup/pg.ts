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

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  input?: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] })
    const stdout: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(chunk)
    })
    // stderr is discarded on purpose: libpq prints the host and user on
    // failure, and those belong in an operator terminal, not in our logs.
    child.stderr.resume()
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited ${code}`))
        return
      }
      resolve(Buffer.concat(stdout))
    })
    child.stdin.end(input ?? Buffer.alloc(0))
  })
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
