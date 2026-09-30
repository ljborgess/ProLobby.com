import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { GameEdition } from '../../common/domain/game-edition.enum'
import { Platform } from '../../common/domain/platform.enum'
import { Account } from '../account/account.entity'
import { Archetype, CharacterCategory } from './archetype'

export enum CharacterState {
  /** Created, no accepted print yet. Counts as the category's active one. */
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  /** Replaced by a newer one in the same category (RF-027). Never deleted. */
  INACTIVE = 'inactive',
  /** Belongs to a past game edition. */
  ARCHIVED = 'archived',
}

export const ACTIVE_CHARACTER_STATES = [
  CharacterState.PENDING_VERIFICATION,
  CharacterState.VERIFIED,
] as const

/**
 * Dossier counterpart: `Personagem` in docs/requisitos/03-dados.md.
 *
 * No overall, no attributes, no elo column: the verified screen (Archetypes)
 * shows neither overall nor attributes, the seed is the baseline 1000, and
 * category elo is derived from unreverted events (#207, 06-piloto-ocr.md).
 *
 * "One active per category per edition" is a partial unique index in the
 * migration, not a check in the service: two concurrent creations must not
 * both win.
 */
export const ONE_ACTIVE_PER_CATEGORY_UNIQUE_INDEX = 'character_one_active_per_category'

@Entity({ tableName: 'character' })
@Index({ properties: ['account', 'state'] })
// Partial index, raw expression like `moderation_case`: MikroORM's unique has
// no WHERE. Must stay byte-identical to migration 20260924133630.
@Unique({
  name: ONE_ACTIVE_PER_CATEGORY_UNIQUE_INDEX,
  expression: `create unique index "${ONE_ACTIVE_PER_CATEGORY_UNIQUE_INDEX}" on "character" ("account_id", "category", "edition") where ("state" in ('pending_verification', 'verified'))`,
})
export class Character {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @Enum({ items: () => CharacterCategory })
  category!: CharacterCategory

  @Enum({ items: () => Archetype })
  archetype!: Archetype

  @Enum({ items: () => Platform })
  platform!: Platform

  @Enum({ items: () => GameEdition })
  edition!: GameEdition

  /** Display name, free to edit — low competitive risk. */
  @Property({ length: 40, nullable: true })
  name?: string

  /** K-factor and seed decay depend on it (RF-077), and RF-028 reads it. */
  @Property({ type: 'smallint', default: 0 })
  matchesInCategory: number & Opt = 0

  @Enum({ items: () => CharacterState, default: CharacterState.PENDING_VERIFICATION })
  state: CharacterState & Opt = CharacterState.PENDING_VERIFICATION

  @Property({ nullable: true })
  verifiedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
