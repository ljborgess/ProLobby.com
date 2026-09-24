import { archetypeGroup, matchArchetype } from './archetypes'
import { foldGamertag, gamertagAppears } from './card'

describe('matchArchetype', () => {
  it('snaps misreads seen on real prints to the archetype name', () => {
    expect(matchArchetype('MAESTRO')).toBe('maestro')
    expect(matchArchetype('SPARK+')).toBe('spark')
    expect(matchArchetype('MAESTR0')).toBe('maestro')
    expect(matchArchetype('Sweeper Keeper')).toBe('sweeper keeper')
  })

  it('refuses words that are not an archetype instead of guessing', () => {
    expect(matchArchetype('Masteries')).toBeNull()
    expect(matchArchetype('Reset Archetype')).toBeNull()
    expect(matchArchetype('Edit')).toBeNull()
  })

  it('maps each archetype to the group its icon sits under', () => {
    expect(archetypeGroup('marauder')).toBe('defender')
    expect(archetypeGroup('disruptor')).toBe('midfielder')
    expect(archetypeGroup('spark')).toBe('forward')
    expect(archetypeGroup(null)).toBeNull()
  })
})

describe('gamertagAppears', () => {
  it('accepts the claimed tag through OCR confusions seen on real cards', () => {
    expect(gamertagAppears('Le5ki', ['© LeSki 2'])).toBe(true)
    expect(gamertagAppears('Simmmens', ['d Simmmens'])).toBe(true)
    expect(gamertagAppears('Simmmens', ['SPARK | © Simmmen'])).toBe(true)
  })

  it('rejects a different tag', () => {
    expect(gamertagAppears('ImBonesy', ['© LeSki 2'])).toBe(false)
    expect(gamertagAppears('Tradeska', ['B- navid4B89 2'])).toBe(false)
  })

  it('folds case, separators and look-alike characters', () => {
    expect(foldGamertag('AIR_PEDRI_8_o')).toBe(foldGamertag('air pedrl b o'))
  })
})
