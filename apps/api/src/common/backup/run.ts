import {
  decryptAtRest,
  encryptAtRest,
  readEvidenceEncryptionKey,
} from '../security/evidence-encryption'
import { dumpDatabase, parseDatabaseUrl, restoreDatabase, type PgTarget } from './pg'
import { s3ConfigFromEnv, S3BackupStore } from './s3-store'
import { dumpObjectKey, pruneOlderThan, type BackupStore } from './store'

export type BackupDeps = {
  store: BackupStore
  dump: (target: PgTarget) => Promise<Buffer>
  restore: (target: PgTarget, dump: Buffer) => Promise<void>
  encrypt: (plaintext: Buffer) => Buffer
  decrypt: (encrypted: Buffer) => Buffer
  now: () => Date
}

export function productionBackupDeps(store: BackupStore): BackupDeps {
  const key = readEvidenceEncryptionKey()
  return {
    store,
    dump: dumpDatabase,
    restore: restoreDatabase,
    encrypt: (plaintext) => encryptAtRest(key, plaintext),
    decrypt: (encrypted) => decryptAtRest(key, encrypted),
    now: () => new Date(),
  }
}

/**
 * Dump → encrypt → put → drop copies older than 30 days.
 *
 * Encryption happens *before* the object leaves the VM. The bucket is private,
 * but a dump of elo, reputation and Discord hashes is still the product's
 * crown jewels — Object Storage native encryption is the floor, not the backup.
 */
export async function runDump(
  databaseUrl: string,
  deps: BackupDeps,
): Promise<{ key: string; pruned: number }> {
  const at = deps.now()
  const plaintext = await deps.dump(parseDatabaseUrl(databaseUrl))
  const key = dumpObjectKey(at)
  await deps.store.put(key, deps.encrypt(plaintext), at)
  const pruned = await pruneOlderThan(deps.store, at)
  return { key, pruned }
}

/**
 * Pull one object, decrypt, restore. The destination URL is whatever the
 * operator pointed `DATABASE_URL` at — on the first internal deploy that is a
 * **new** Neon project (RNF-007). This function does not create that project.
 */
export async function runRestore(
  databaseUrl: string,
  objectKey: string,
  deps: BackupDeps,
): Promise<void> {
  const encrypted = await deps.store.get(objectKey)
  await deps.restore(parseDatabaseUrl(databaseUrl), deps.decrypt(encrypted))
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): BackupStore {
  const s3 = s3ConfigFromEnv(env)
  if (s3) {
    return new S3BackupStore(s3)
  }
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'BACKUP_S3_BUCKET (and endpoint/keys) are required in production — dumps must leave the VM (ADR-009)',
    )
  }
  throw new Error('BACKUP_S3_BUCKET is required')
}
