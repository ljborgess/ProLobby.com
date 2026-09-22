/**
 * Where an encrypted `pg_dump` lives — ADR-009 / #123.
 *
 * Production is Oracle Object Storage in São Paulo, via its S3-compatible
 * API. Tests inject a memory store. The API process never sees this: dump and
 * restore run in the `api-backup` container, which is the only one that holds
 * `DATABASE_DIRECT_URL`.
 */
export type BackupObject = {
  key: string
  lastModified: Date
  size: number
}

export interface BackupStore {
  put(key: string, body: Buffer, at?: Date): Promise<void>
  get(key: string): Promise<Buffer>
  list(): Promise<BackupObject[]>
  delete(key: string): Promise<void>
}

export const BACKUP_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Drops objects older than 30 days. LGPD: a deletion request must vanish from
 * the last copy when the window rolls, and keeping dumps forever would turn
 * the backup into the eternal copy of data the platform promised to erase.
 */
export async function pruneOlderThan(
  store: BackupStore,
  now: Date,
  retentionMs = BACKUP_RETENTION_MS,
): Promise<number> {
  const cutoff = now.getTime() - retentionMs
  const objects = await store.list()
  let removed = 0
  for (const object of objects) {
    if (object.lastModified.getTime() < cutoff) {
      await store.delete(object.key)
      removed += 1
    }
  }
  return removed
}

export function totalBytes(objects: BackupObject[]): number {
  return objects.reduce((sum, object) => sum + object.size, 0)
}

export function dumpObjectKey(at: Date): string {
  return `prolobby/${at.toISOString().replaceAll(':', '-')}.dump.enc`
}
