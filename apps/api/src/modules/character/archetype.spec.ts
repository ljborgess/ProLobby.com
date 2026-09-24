import {
  Archetype,
  ArchetypeGroup,
  CharacterCategory,
  archetypeFitsCategory,
  archetypeGroup,
  categoriesAllowedFor,
} from './archetype'

describe('archetype × category', () => {
  it('groups all 13 archetypes', () => {
    const count = (group: ArchetypeGroup) =>
      Object.values(Archetype).filter((archetype) => archetypeGroup(archetype) === group).length
    expect(count(ArchetypeGroup.KEEPER)).toBe(2)
    expect(count(ArchetypeGroup.DEFENDER)).toBe(3)
    expect(count(ArchetypeGroup.MIDFIELDER)).toBe(4)
    expect(count(ArchetypeGroup.FORWARD)).toBe(4)
  })

  it.each([
    [Archetype.SHOT_STOPPER, [CharacterCategory.GOALKEEPER]],
    [Archetype.MARAUDER, [CharacterCategory.DEFENDER]],
    [Archetype.CREATOR, [CharacterCategory.MIDFIELDER, CharacterCategory.WINGER]],
    [Archetype.SPARK, [CharacterCategory.WINGER, CharacterCategory.STRIKER]],
  ])('%s allows %j', (archetype, categories) => {
    expect(categoriesAllowedFor(archetype)).toEqual(categories)
  })

  it.each([
    [Archetype.FINISHER, CharacterCategory.GOALKEEPER],
    [Archetype.SWEEPER_KEEPER, CharacterCategory.STRIKER],
    [Archetype.BOSS, CharacterCategory.STRIKER],
    [Archetype.MAESTRO, CharacterCategory.DEFENDER],
  ])('refuses %s as %s', (archetype, category) => {
    expect(archetypeFitsCategory(archetype, category)).toBe(false)
  })

  it('lets every category be reached by some archetype', () => {
    for (const category of Object.values(CharacterCategory)) {
      expect(
        Object.values(Archetype).some((archetype) => archetypeFitsCategory(archetype, category)),
      ).toBe(true)
    }
  })
})
