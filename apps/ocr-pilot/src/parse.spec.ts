import { parseOcrText, readAttributeValue } from './parse'

const EN_SCREEN = [
  'Ball Control',
  'Scoring',
  'Acceleration 85 70-90 -5',
  'Sprint Spe… 88',
  'Finishing 76',
  'Shot Power 80',
  'Short Pass 82',
  'Long Pass 79',
  'Ball Control 84',
  'Dribbling 87',
  'Interceptio… 71',
  'Heading A… 68',
  'Stand Tack… 64',
  'Jumping 74',
  'Stamina 81',
].join('\n')

describe('parseOcrText', () => {
  it('reads truncated English labels and ignores min–max and body modifiers', () => {
    const parsed = parseOcrText(EN_SCREEN)
    expect(parsed.language).toBe('en')
    expect(parsed.fields.overall).toBeNull()
    expect(parsed.fields.gamertag).toBeNull()
    expect(parsed.fields.attributes).toEqual(
      expect.objectContaining({
        acceleration: 85,
        sprintSpeed: 88,
        finishing: 76,
        shotPower: 80,
        shortPassing: 82,
        longPassing: 79,
        ballControl: 84,
        dribbling: 87,
        interceptions: 71,
        headingAccuracy: 68,
        standingTackle: 64,
        jumping: 74,
        stamina: 81,
      }),
    )
  })

  it('does not let a group header steal the next row number', () => {
    const parsed = parseOcrText('Ball Control\nScoring\nAcceleration 85')
    expect(parsed.fields.attributes.ballControl).toBeUndefined()
    expect(parsed.fields.attributes.acceleration).toBe(85)
  })

  it('detects Portuguese from distinctive stems', () => {
    const parsed = parseOcrText(
      ['Aceleração 85', 'Finalização 76', 'Passe curto 82', 'Drible 87', 'Carrinho 60'].join('\n'),
    )
    expect(parsed.language).toBe('pt')
    expect(parsed.fields.attributes.acceleration).toBe(85)
    expect(parsed.fields.attributes.finishing).toBe(76)
    expect(parsed.fields.attributes.shortPassing).toBe(82)
    expect(parsed.fields.attributes.dribbling).toBe(87)
    expect(parsed.fields.attributes.slidingTackle).toBe(60)
  })

  it('detects Spanish from distinctive stems', () => {
    const parsed = parseOcrText(
      ['Aceleración 85', 'Definición 76', 'Pase corto 82', 'Regate 87', 'Agresividad 55'].join(
        '\n',
      ),
    )
    expect(parsed.language).toBe('es')
    expect(parsed.fields.attributes.acceleration).toBe(85)
    expect(parsed.fields.attributes.finishing).toBe(76)
    expect(parsed.fields.attributes.dribbling).toBe(87)
  })

  it('returns no language when too few labels match', () => {
    const parsed = parseOcrText('hello world 12')
    expect(parsed.language).toBeNull()
    expect(parsed.fields.attributes).toEqual({})
  })
})

describe('readAttributeValue', () => {
  it('prefers the current value on the same line over a range on the next', () => {
    expect(readAttributeValue(' 85\n70-90')).toBe(85)
  })

  it('reads a value that sits alone on the following line', () => {
    expect(readAttributeValue('\n84')).toBe(84)
  })
})
