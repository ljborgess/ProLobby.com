/**
 * Consoles and PC in scope — docs/produto/05-produto/02-escopo.md.
 *
 * Lives in `common/domain` because more than one module needs it: identity
 * (a gamertag belongs to a platform), characters (phase 2.2) and the ban list.
 * Previous console generations (PS4, Xbox One) are out of scope on purpose.
 */
export enum Platform {
  PS5 = 'ps5',
  XBOX_SERIES = 'xbox_series',
  PC = 'pc',
}
