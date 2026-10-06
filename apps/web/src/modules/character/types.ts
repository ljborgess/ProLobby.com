import type { CharacterCategory, Platform, PrintRejection } from '@/content/character'

/** `GET /characters` item — only what the screen uses. */
export interface CharacterView {
  id: string
  category: CharacterCategory
  archetype: string
  platform: Platform
  name?: string | null
  state: 'pending_verification' | 'verified'
  /** The category's rating, not the character's: a replacement inherits it (RF-027). */
  elo: number
  /** Latest print: the character screen is where a rejection reaches the player. */
  lastPrint?: {
    status: 'received' | 'accepted' | 'rejected'
    rejection: PrintRejection | null
  } | null
}

/** `GET /characters/archetypes` item: the one source of the table. */
export interface ArchetypeOption {
  archetype: string
  categories: CharacterCategory[]
}

export interface PrintResult {
  status: 'received' | 'accepted' | 'rejected'
  rejection: PrintRejection | null
}

/** Game spelling: the name the player will see on the screen they photograph. */
export function archetypeLabel(archetype: string): string {
  return archetype.replace(/_/g, ' ').toUpperCase()
}
