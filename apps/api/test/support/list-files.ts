import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Every file under `dir` whose name matches, recursively. */
export function listFiles(dir: string, matching: RegExp): string[] {
  const found: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      found.push(...listFiles(path, matching))
    } else if (matching.test(entry.name)) {
      found.push(path)
    }
  }

  return found
}
