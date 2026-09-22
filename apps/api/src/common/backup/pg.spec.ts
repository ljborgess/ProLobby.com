import { run } from './pg'

/**
 * Code review of 2026-09-22 (#123): `run()` used to discard stderr entirely on
 * a non-zero exit, so a failed pg_dump surfaced as `pg_dump exited 1` with
 * nothing else — indistinguishable from a wrong password, a network drop, a
 * missing database, or a full disk. These tests drive the real spawn plumbing
 * with `node -e` in place of `pg_dump`/`pg_restore`, so they exercise the
 * actual bug (in the stdio wiring, not in libpq) without needing the real
 * binaries installed wherever `pnpm test` runs.
 */
describe('run() surfaces the failure instead of swallowing it', () => {
  const node = process.execPath

  it('includes the exit code and the stderr text when the process fails', async () => {
    const script = "process.stderr.write('connection to server failed: timeout'); process.exit(1)"

    await expect(run(node, ['-e', script], process.env)).rejects.toThrow(
      /exited 1: connection to server failed: timeout/,
    )
  })

  it('never lets PGPASSWORD reach the thrown error, even if a child process echoed it', async () => {
    const script = 'process.stderr.write(process.env.PGPASSWORD || ""); process.exit(1)'

    const error = (await run(node, ['-e', script], {
      ...process.env,
      PGPASSWORD: 'super-secret-value',
    }).catch((e: unknown) => e)) as Error

    expect(error.message).not.toContain('super-secret-value')
    expect(error.message).toContain('[redacted]')
  })

  it('caps how much stderr it keeps, so a runaway process cannot grow the error without bound', async () => {
    const script = "process.stderr.write('x'.repeat(200_000)); process.exit(1)"

    const error = (await run(node, ['-e', script], process.env).catch((e: unknown) => e)) as Error

    expect(error.message.length).toBeLessThan(10_000)
  })

  it('still resolves with stdout when the process succeeds, unaffected by the stderr capture', async () => {
    const script = "process.stdout.write('ok'); process.stderr.write('a warning nobody needs')"

    await expect(run(node, ['-e', script], process.env)).resolves.toEqual(Buffer.from('ok'))
  })
})
