import { welcomeMessage } from './welcome'

describe('welcomeMessage', () => {
  it('greets in Portuguese and Spanish with the link to link the account', () => {
    const text = welcomeMessage('900000000000000002', 'https://prolobby.test/')

    expect(text).toContain('<@900000000000000002>')
    expect(text).toContain('https://prolobby.test/account/discord')
    expect(text.split('\n')).toHaveLength(2)
    expect(text).toContain('¡Llegaste a ProLobby')
  })

  it('falls back to the public address when WEB_URL is not set', () => {
    expect(welcomeMessage('900000000000000002')).toContain(
      'https://prolobby.com.br/account/discord',
    )
  })
})
