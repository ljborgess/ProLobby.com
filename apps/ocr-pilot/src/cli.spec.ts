import { helpText, parseCliArgs } from './cli'

describe('parseCliArgs', () => {
  it('defaults to local prints and gabarito paths', () => {
    expect(parseCliArgs([])).toEqual({
      prints: './prints',
      gabarito: './gabarito.json',
      out: null,
      engine: 'tesseract',
      help: false,
    })
  })

  it('reads flags and refuses a paid engine in this slice', () => {
    expect(
      parseCliArgs([
        '--prints',
        'p',
        '--gabarito',
        'g.json',
        '--out',
        'r.json',
        '--engine',
        'tesseract',
      ]),
    ).toEqual({
      prints: 'p',
      gabarito: 'g.json',
      out: 'r.json',
      engine: 'tesseract',
      help: false,
    })
    expect(() => parseCliArgs(['--engine', 'google-vision'])).toThrow(/dropped for cost/)
  })

  it('prints usage without touching the filesystem', () => {
    expect(parseCliArgs(['--help']).help).toBe(true)
    expect(helpText()).toMatch(/--gabarito/)
  })
})
