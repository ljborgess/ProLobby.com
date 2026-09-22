import type { BackupObject, BackupStore } from './store'

type Entry = { body: Buffer; lastModified: Date }

export class MemoryBackupStore implements BackupStore {
  private readonly objects = new Map<string, Entry>()

  async put(key: string, body: Buffer, at: Date = new Date()): Promise<void> {
    this.objects.set(key, { body: Buffer.from(body), lastModified: new Date(at) })
  }

  async get(key: string): Promise<Buffer> {
    const entry = this.objects.get(key)
    if (!entry) {
      throw new Error(`backup object not found: ${key}`)
    }
    return Buffer.from(entry.body)
  }

  async list(): Promise<BackupObject[]> {
    return [...this.objects.entries()].map(([key, entry]) => ({
      key,
      lastModified: entry.lastModified,
      size: entry.body.length,
    }))
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key)
  }
}
