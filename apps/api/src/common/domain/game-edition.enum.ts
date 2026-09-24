/**
 * EA FC editions a character can belong to. A new edition archives the
 * characters of the previous one and asks for verification again
 * (docs/produto/05-produto/02-escopo.md), so the edition is part of a
 * character's identity, not a label.
 */
export enum GameEdition {
  FC27 = 'fc27',
}

export const CURRENT_EDITION = GameEdition.FC27
