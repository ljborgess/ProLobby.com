/**
 * Folds case, accents and inner whitespace off a security answer.
 *
 * Without it, "São Paulo", "sao paulo" and " São  Paulo " hash differently, and
 * the legitimate person fails their own recovery factor — at the worst possible
 * moment, since reaching RF-025 means they already lost both email and Discord.
 *
 * Accent folding is deliberate and has a cost: it shrinks the search space for
 * someone guessing. Accepted, because the alternative is a recovery path that
 * only works if the person remembers how they typed an accent months ago.
 *
 * Lives in its own file, next to account.age.ts, because it is a pure rule: the
 * sign-up writes the hash and the recovery flow (#91) compares against it, and
 * both must normalise identically. A copy on either side is how the answer
 * stops matching itself.
 */
export function normaliseSecurityAnswer(answer: string): string {
  return answer
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
