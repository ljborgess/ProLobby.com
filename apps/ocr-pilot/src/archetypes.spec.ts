import { archetypeGroup, matchArchetype } from './archetypes'
import { foldGamertag, gamertagAppears, impostorVariants } from './card'
import { parseArchetypeScreen } from './parse'

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

// Tags below are invented; they reproduce the shapes seen on real cards
// (digits read as letters, underscores, a space) without real people's names.
describe('gamertagAppears', () => {
  it('accepts the claimed tag through OCR confusions seen on real cards', () => {
    expect(gamertagAppears('Ra5ko', ['© RaSko 2'])).toBe(true)
    expect(gamertagAppears('Torvalen', ['d Torvalen'])).toBe(true)
    expect(gamertagAppears('QX_MOREL_8_o', ['(2) QX MOREL B o'])).toBe(true)
    expect(gamertagAppears('dusk wind', ['© dusk wind'])).toBe(true)
  })

  it('rejects a different tag', () => {
    expect(gamertagAppears('Pellavo', ['© RaSko 2'])).toBe(false)
  })

  it('never accepts a claim that is only part of the tag on the card', () => {
    expect(gamertagAppears('Morel', ['QX_MOREL_8_o'])).toBe(false)
    expect(gamertagAppears('Torva', ['© Torvalen'])).toBe(false)
  })

  it('never takes the archetype name on the card as the gamertag', () => {
    expect(gamertagAppears('Boss', ['© BOSS'])).toBe(false)
  })

  it('accepts no edit of slack, even on long tags', () => {
    expect(gamertagAppears('Torvalens', ['© Torvalen'])).toBe(false)
    expect(gamertagAppears('Torvalem', ['© Torvalen'])).toBe(false)
  })

  it('folds case, symbols and look-alike characters', () => {
    expect(foldGamertag('QX_MOREL_8_o')).toBe(foldGamertag('qx morel b o'))
    expect(foldGamertag('A|B')).toBe('ab')
  })
})

describe('impostorVariants', () => {
  it('derives far variants and one-edit neighbours', () => {
    const variants = impostorVariants('Torvalen')
    expect(variants.far).toEqual(['rvalen', 'Torv'])
    expect(variants.neighbors).toEqual(['Torvale', 'Torvaleq'])
  })

  it('rejects every variant against a clean read of the real card', () => {
    const { far, neighbors } = impostorVariants('Torvalen')
    for (const tag of [...far, ...neighbors]) {
      expect(gamertagAppears(tag, ['© Torvalen'])).toBe(false)
    }
  })
})

describe('parseArchetypeScreen', () => {
  it('reads the archetype from the line it opens, not from a description word', () => {
    const text = [
      'Keeper Defender Midfielder Forward',
      'SPARK © @ 1 Available',
      'Excels in short bursts, targets the byline and finishes',
      'PlayStyles Via Amps',
    ].join('\n')

    expect(parseArchetypeScreen(text, []).fields.archetype).toBe('spark')
  })
})
