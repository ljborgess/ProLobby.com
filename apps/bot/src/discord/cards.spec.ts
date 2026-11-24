import { boardSvg, clip, escapeXml, render, welcomeSvg, wrap } from './cards'

describe('cards', () => {
  it('escapes a name before it reaches the SVG', () => {
    const svg = welcomeSvg('<script>&"x"')

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;&amp;&quot;x&quot;')
    expect(escapeXml('a<b')).toBe('a&lt;b')
  })

  it('clips a long name and wraps a long title into the lines a banner holds', () => {
    expect(clip('Jogador com um nome enorme demais', 10)).toBe('Jogador c…')
    expect(wrap('um dois tres quatro cinco seis sete', 10, 2)).toHaveLength(2)
  })

  it('renders a PNG with the site fonts, no system font needed', async () => {
    const png = await render(
      boardSvg(
        { goalkeeper: 'low', defender: 'busy', midfielder: 'full', winger: 'low', striker: 'low' },
        'lobbies_full',
        '2026-11-04T23:00:00Z',
      ),
    )

    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.length).toBeGreaterThan(10_000)
  })
})
