import { matchArchetype } from './archetypes'
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
})

// Tags below are invented; they reproduce the shapes seen on real cards
// (digits read as letters, underscores, a space) without real people's names.
describe('gamertagAppears', () => {
  it('accepts the claimed tag through OCR confusions seen on real cards', () => {
    expect(gamertagAppears('Ra5ko', ['© RaSko'])).toBe(true)
    expect(gamertagAppears('Torvalen', ['d Torvalen'])).toBe(true)
    expect(gamertagAppears('QX_MOREL_8_o', ['© QX_MOREL_8_o'])).toBe(true)
    expect(gamertagAppears('dusk wind', ['© dusk wind'])).toBe(true)
    expect(gamertagAppears('Target Man', ['© Target Man'])).toBe(true)
  })

  it('rejects a different tag', () => {
    expect(gamertagAppears('Pellavo', ['© RaSko'])).toBe(false)
  })

  it('never accepts a claim that is only part of the tag on the card', () => {
    expect(gamertagAppears('Morel', ['QX_MOREL_8_o'])).toBe(false)
    expect(gamertagAppears('Torva', ['© Torvalen'])).toBe(false)
    expect(gamertagAppears('Morel', ['(2) QX MOREL B o'])).toBe(false)
    expect(gamertagAppears('QXMorel', ['(2) QX MOREL B o'])).toBe(false)
    expect(gamertagAppears('man', ['© Target Man'])).toBe(false)
  })

  it('reads nothing from a line ending in one character or a symbol, junk or not', () => {
    expect(gamertagAppears('Ra5ko', ['© RaSko 2'])).toBe(false)
    expect(gamertagAppears('Ra5ko2', ['© RaSko 2'])).toBe(false)
    expect(gamertagAppears('QX_MOREL_8_o', ['(2) QX MOREL B o'])).toBe(false)
    expect(gamertagAppears('Ra5k', ['© Ra5k?'])).toBe(false)
    expect(gamertagAppears('Ra5ko', ['© RaSko |'])).toBe(false)
  })

  it('takes the icon glued to the tag as the icon when another line splits it off', () => {
    expect(gamertagAppears('ORa5ko', ['ORaSko', 'O RaSko'])).toBe(false)
    expect(gamertagAppears('Ra5ko', ['ORaSko', 'O RaSko'])).toBe(true)
  })

  it('never takes the archetype name on the card as the gamertag', () => {
    expect(gamertagAppears('Boss', ['© BOSS'])).toBe(false)
    expect(gamertagAppears('Arget', ['ARGET'])).toBe(false)
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
  it('derives near misses, one character more and word pieces', () => {
    expect(impostorVariants('Torvalen')).toEqual([
      'Torvale',
      'Torvaleq',
      'Torvalenx',
      'Torvalen2',
      'OTorvalen',
      'rvalen',
      'Torv',
    ])
    expect(impostorVariants('QX_MOREL_8_o')).toEqual(expect.arrayContaining(['QX', 'o']))
  })

  it('rejects every variant against a clean read of the real card', () => {
    for (const tag of impostorVariants('Torvalen')) {
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

  it('takes confidence only from the title line, not a menu word elsewhere', () => {
    const text = ['Keeper Defender', 'SWEEPER KEEPER 1 Available'].join('\n')
    const words = [
      { text: 'Keeper', confidence: 0.1 },
      { text: 'SWEEPER', confidence: 0.9 },
      { text: 'KEEPER', confidence: 0.9 },
    ]

    expect(parseArchetypeScreen(text, words).fieldConfidence).toBeCloseTo(0.9)
  })
})
