/** Postgres unique-violation SQLSTATE, including wrapped DriverException. */
export function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current: unknown = error

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    if ('code' in current && current.code === '23505') {
      return true
    }
    current = 'cause' in current ? current.cause : undefined
  }

  return false
}
