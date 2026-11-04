import { BRAND } from './brand'
import { welcomeMessage } from './welcome'

describe('welcomeMessage', () => {
  it('pings only the newcomer, outside the card', () => {
    const message = welcomeMessage('900000000000000002', { name: 'Borges' })

    expect(message.content).toBe('<@900000000000000002>')
    expect(message.embeds[0]!.title).toBe('Chegou no ProLobby, Borges!')
    expect(message.embeds[0]!.color).toBe(BRAND.green)
  })

  it('walks the three steps, in both languages', () => {
    const text = welcomeMessage('900000000000000002').embeds[0]!.description!

    expect(text).toContain('**1 ·** Crie a conta')
    expect(text).toContain('**3 ·** Vincule este Discord')
    expect(text).toContain('¡Llegaste!')
  })

  it('links to sign-up and to the Discord link on the site', () => {
    const [row] = welcomeMessage('900000000000000002', {
      webUrl: 'https://prolobby.test/',
    }).components!

    expect(row!.components.map((button) => ('url' in button ? button.url : ''))).toEqual([
      'https://prolobby.test/sign-up',
      'https://prolobby.test/account/discord',
    ])
  })
})
