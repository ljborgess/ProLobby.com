/**
 * The product's five categories — the queue builds a team as 1 + 4 + 2 + 2 + 2
 * and pairs category against category (docs/produto/03-partida/02-fila.md), so
 * these cannot collapse into the game's four archetype groups.
 */
export enum CharacterCategory {
  GOALKEEPER = 'goalkeeper',
  DEFENDER = 'defender',
  MIDFIELDER = 'midfielder',
  WINGER = 'winger',
  STRIKER = 'striker',
}

/** EA FC 27 Clubs archetypes, all 13. */
export enum Archetype {
  SHOT_STOPPER = 'shot_stopper',
  SWEEPER_KEEPER = 'sweeper_keeper',
  PROGRESSOR = 'progressor',
  BOSS = 'boss',
  MARAUDER = 'marauder',
  DISRUPTOR = 'disruptor',
  RECYCLER = 'recycler',
  MAESTRO = 'maestro',
  CREATOR = 'creator',
  SPARK = 'spark',
  MAGICIAN = 'magician',
  FINISHER = 'finisher',
  TARGET = 'target',
}

export enum ArchetypeGroup {
  KEEPER = 'keeper',
  DEFENDER = 'defender',
  MIDFIELDER = 'midfielder',
  FORWARD = 'forward',
}

// Group follows the icon row on the in-game Archetypes screen (real FC 27
// prints), not third-party summaries, which mix the groups up.
const GROUP_OF: Record<Archetype, ArchetypeGroup> = {
  [Archetype.SHOT_STOPPER]: ArchetypeGroup.KEEPER,
  [Archetype.SWEEPER_KEEPER]: ArchetypeGroup.KEEPER,
  [Archetype.PROGRESSOR]: ArchetypeGroup.DEFENDER,
  [Archetype.BOSS]: ArchetypeGroup.DEFENDER,
  [Archetype.MARAUDER]: ArchetypeGroup.DEFENDER,
  [Archetype.DISRUPTOR]: ArchetypeGroup.MIDFIELDER,
  [Archetype.RECYCLER]: ArchetypeGroup.MIDFIELDER,
  [Archetype.MAESTRO]: ArchetypeGroup.MIDFIELDER,
  [Archetype.CREATOR]: ArchetypeGroup.MIDFIELDER,
  [Archetype.SPARK]: ArchetypeGroup.FORWARD,
  [Archetype.MAGICIAN]: ArchetypeGroup.FORWARD,
  [Archetype.FINISHER]: ArchetypeGroup.FORWARD,
  [Archetype.TARGET]: ArchetypeGroup.FORWARD,
}

/**
 * docs/produto/02-jogador/01-verificacao.md, "Categoria e arquétipo". An
 * archetype is a build, not a position, so a group allows the categories its
 * archetypes really play: a Creator at right midfield is a winger, a Spark can
 * play wide or up front. What this blocks is the gross mismatch.
 */
const ALLOWED: Record<ArchetypeGroup, CharacterCategory[]> = {
  [ArchetypeGroup.KEEPER]: [CharacterCategory.GOALKEEPER],
  [ArchetypeGroup.DEFENDER]: [CharacterCategory.DEFENDER],
  [ArchetypeGroup.MIDFIELDER]: [CharacterCategory.MIDFIELDER, CharacterCategory.WINGER],
  [ArchetypeGroup.FORWARD]: [CharacterCategory.WINGER, CharacterCategory.STRIKER],
}

export function archetypeGroup(archetype: Archetype): ArchetypeGroup {
  return GROUP_OF[archetype]
}

export function categoriesAllowedFor(archetype: Archetype): CharacterCategory[] {
  return ALLOWED[GROUP_OF[archetype]]
}

export function archetypeFitsCategory(archetype: Archetype, category: CharacterCategory): boolean {
  return categoriesAllowedFor(archetype).includes(category)
}

export type ArchetypeOption = {
  archetype: Archetype
  group: ArchetypeGroup
  categories: CharacterCategory[]
}

/** The table the screen needs to offer only archetypes a category allows. */
export function archetypeOptions(): ArchetypeOption[] {
  return Object.values(Archetype).map((archetype) => ({
    archetype,
    group: GROUP_OF[archetype],
    categories: categoriesAllowedFor(archetype),
  }))
}
