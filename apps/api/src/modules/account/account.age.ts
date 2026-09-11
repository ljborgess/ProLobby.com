/** Minimum age to hold an account — RF-021, docs/produto/04-governanca/03-termos.md. */
export const MINIMUM_AGE = 16

/**
 * Completed years between `birthDate` and `reference`.
 *
 * Counted by calendar, never by dividing milliseconds: a year is not a fixed
 * number of milliseconds (leap years, DST), and the naive division puts
 * someone over the line up to a day early — on exactly the birthday, which is
 * the only date where the answer actually changes.
 */
export function completedYears(birthDate: Date, reference: Date = new Date()): number {
  let years = reference.getUTCFullYear() - birthDate.getUTCFullYear()

  const monthDelta = reference.getUTCMonth() - birthDate.getUTCMonth()
  const dayDelta = reference.getUTCDate() - birthDate.getUTCDate()

  // Birthday has not come round yet this year.
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    years -= 1
  }

  return years
}

/** RF-021: under 16 is refused outright, with no account created. */
export function isOldEnough(birthDate: Date, reference: Date = new Date()): boolean {
  return completedYears(birthDate, reference) >= MINIMUM_AGE
}
