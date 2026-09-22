import { randomBytes } from 'node:crypto'

import { decryptAtRest, encryptAtRest } from '../security/evidence-encryption'
import { MemoryBackupStore } from './memory-store'
import { parseDatabaseUrl } from './pg'
import { productionBackupDeps, runDump, runRestore, storeFromEnv } from './run'
import { dumpObjectKey, pruneOlderThan, totalBytes } from './store'

describe('backup pipeline (#123 / RNF-007)', () => {
  const key = randomBytes(32)
  const encrypt = (plaintext: Buffer) => encryptAtRest(key, plaintext)
  const decrypt = (encrypted: Buffer) => decryptAtRest(key, encrypted)

  it('encrypts the dump before it is stored, and restore decrypts back to the same bytes', async () => {
    const store = new MemoryBackupStore()
    const plaintext = Buffer.from('pg-dump-custom-format')
    const dump = jest.fn().mockResolvedValue(plaintext)
    const restore = jest.fn().mockResolvedValue(undefined)
    const deps = {
      store,
      dump,
      restore,
      encrypt,
      decrypt,
      now: () => new Date('2026-09-22T00:00:00.000Z'),
    }

    const { key: objectKey, pruned } = await runDump(
      'postgres://owner:secret@db.example:5432/prolobby',
      deps,
    )

    expect(dump).toHaveBeenCalledTimes(1)
    expect(pruned).toBe(0)
    expect(objectKey).toBe(dumpObjectKey(new Date('2026-09-22T00:00:00.000Z')))
    const stored = await store.get(objectKey)
    expect(stored.equals(plaintext)).toBe(false)
    expect(decrypt(stored).equals(plaintext)).toBe(true)

    await runRestore('postgres://owner:secret@db.example:5432/prolobby_restore', objectKey, deps)
    expect(restore).toHaveBeenCalledWith(
      expect.objectContaining({ database: 'prolobby_restore', host: 'db.example' }),
      plaintext,
    )
  })

  it('drops copies older than 30 days and keeps the rest', async () => {
    const store = new MemoryBackupStore()
    const now = new Date('2026-09-22T00:00:00.000Z')
    await store.put('old.dump.enc', Buffer.from('old'), new Date('2026-08-22T00:00:00.000Z'))
    await store.put('keep.dump.enc', Buffer.from('keep'), new Date('2026-09-21T00:00:00.000Z'))

    await expect(pruneOlderThan(store, now)).resolves.toBe(1)
    const left = await store.list()
    expect(left.map((object) => object.key)).toEqual(['keep.dump.enc'])
  })

  it('refuses to store dumps on the VM disk when NODE_ENV is production', () => {
    expect(() => storeFromEnv({ NODE_ENV: 'production' })).toThrow(/BACKUP_S3_BUCKET/)
  })

  it('does not put the database password on the pg_dump argv — parse only', () => {
    const target = parseDatabaseUrl(
      'postgres://prolobby_owner:p%40ss@ep-host.neon.tech:5432/prolobby?sslmode=require',
    )
    expect(target).toEqual({
      host: 'ep-host.neon.tech',
      port: '5432',
      user: 'prolobby_owner',
      password: 'p@ss',
      database: 'prolobby',
      sslMode: 'require',
    })
  })

  it('sums listed object sizes for the Object Storage quota', async () => {
    const store = new MemoryBackupStore()
    await store.put('a', Buffer.alloc(10))
    await store.put('b', Buffer.alloc(25))
    expect(totalBytes(await store.list())).toBe(35)
  })

  it('production deps refuse to boot without EVIDENCE_ENCRYPTION_KEY', () => {
    const previous = process.env.EVIDENCE_ENCRYPTION_KEY
    delete process.env.EVIDENCE_ENCRYPTION_KEY
    try {
      expect(() => productionBackupDeps(new MemoryBackupStore())).toThrow(/EVIDENCE_ENCRYPTION_KEY/)
    } finally {
      if (previous === undefined) {
        delete process.env.EVIDENCE_ENCRYPTION_KEY
      } else {
        process.env.EVIDENCE_ENCRYPTION_KEY = previous
      }
    }
  })
})
