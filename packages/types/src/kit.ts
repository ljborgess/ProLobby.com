/**
 * The declared club's kit (Kit Lab, 2026-10-29): two colours, a pattern and a
 * crest shape. A closed set, not free hex, so every pair the screens draw has
 * been checked for contrast and no kit can mimic a state colour of the UI.
 */
export const KIT_COLORS = [
  'white',
  'black',
  'red',
  'claret',
  'orange',
  'yellow',
  'green',
  'sky',
  'blue',
  'navy',
  'purple',
  'grey',
] as const
export type KitColor = (typeof KIT_COLORS)[number]

export const KIT_PATTERNS = ['plain', 'stripes', 'hoops', 'halves', 'sash'] as const
export type KitPattern = (typeof KIT_PATTERNS)[number]

export const CREST_SHAPES = ['shield', 'round', 'diamond'] as const
export type CrestShape = (typeof CREST_SHAPES)[number]

export interface Kit {
  primary: KitColor
  secondary: KitColor
  pattern: KitPattern
  crest: CrestShape
}

/** What a club without choices wears. */
export const DEFAULT_KIT: Kit = {
  primary: 'white',
  secondary: 'navy',
  pattern: 'plain',
  crest: 'shield',
}
