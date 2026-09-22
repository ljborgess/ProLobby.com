import { productionBackupDeps, runDump, runRestore, storeFromEnv } from './run'

/**
 * One-shot entry for the `api-backup` container (#123).
 *
 *   node dist/common/backup/cli.js dump
 *   node dist/common/backup/cli.js restore prolobby/2026-09-22T00-00-00.000Z.dump.enc
 *
 * Scheduled by the VM (`docker compose run --rm api-backup`), not by a loop
 * inside this process: a `setInterval` here would keep Neon awake (ADR-009).
 */
async function main(): Promise<void> {
  const command = process.argv[2] ?? 'dump'
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (direct host, prolobby_owner role)')
  }

  const deps = productionBackupDeps(storeFromEnv())

  if (command === 'dump') {
    const result = await runDump(databaseUrl, deps)
    process.stdout.write(`wrote ${result.key}; pruned ${result.pruned}\n`)
    return
  }

  if (command === 'restore') {
    const objectKey = process.argv[3] ?? process.env.BACKUP_OBJECT_KEY
    if (!objectKey) {
      throw new Error('restore requires the object key')
    }
    await runRestore(databaseUrl, objectKey, deps)
    process.stdout.write(`restored ${objectKey}\n`)
    return
  }

  throw new Error(`unknown command ${command}`)
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
