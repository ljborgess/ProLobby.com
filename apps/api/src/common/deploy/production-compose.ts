import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(process.cwd(), '..', '..')

export function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

/**
 * Pulls a top-level Compose service block by name. Compose keys at this
 * indent are always two spaces; a later two-space key or a column-0 key
 * ends the block.
 */
export function composeServiceBlock(yaml: string, serviceName: string): string {
  const lines = yaml.split('\n')
  const header = `  ${serviceName}:`
  const start = lines.findIndex((line) => line === header)
  if (start < 0) {
    throw new Error(`compose is missing service ${serviceName}`)
  }

  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (line === '' || line.startsWith('   ') || line.startsWith('#')) {
      continue
    }
    if (/^ {2}[A-Za-z0-9._-]+:\s*$/.test(line) || /^[A-Za-z]/.test(line)) {
      end = i
      break
    }
  }

  return lines.slice(start, end).join('\n')
}

export function composeServiceNames(yaml: string): string[] {
  const names: string[] = []
  let inServices = false
  for (const line of yaml.split('\n')) {
    if (line === 'services:') {
      inServices = true
      continue
    }
    if (inServices && /^[A-Za-z]/.test(line) && !line.startsWith(' ')) {
      break
    }
    const match = inServices ? /^ {2}([A-Za-z0-9._-]+):\s*$/.exec(line) : null
    if (match?.[1]) {
      names.push(match[1])
    }
  }
  return names
}

export function serviceDeclaresPorts(block: string): boolean {
  return /^( {2}){2,}ports:\s*$/m.test(block)
}

export function withoutComments(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n')
}
