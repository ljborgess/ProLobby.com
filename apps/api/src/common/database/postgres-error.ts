/**
 * Postgres unique-violation SQLSTATE, including wrapped DriverException.
 * With `constraint`, only a violation of that index or constraint counts.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const seen = new Set<unknown>()
  let current: unknown = error

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    if ('code' in current && current.code === '23505') {
      return !constraint || ('constraint' in current && current.constraint === constraint)
    }
    current = 'cause' in current ? current.cause : undefined
  }

  return false
}
