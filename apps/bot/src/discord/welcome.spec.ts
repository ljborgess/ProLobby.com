import { BRAND } from './brand'
import { welcomeMessage } from './welcome'

describe('welcomeMessage', () => {
  it('pings only the newcomer, outside the card', async () => {
    const message = await welcomeMessage('900000000000000002', { name: 'Borges' })

    expect(message.content).toBe('<@900000000000000002>')
    expect(message.embeds[0]!.image?.url).toBe('attachment://boas-vindas.png')
    expect(message.embeds[0]!.color).toBe(BRAND.green)
  })

  it('carries the three steps in the picture and in its alt text', async () => {
    const [file] = (await welcomeMessage('900000000000000002')).files!

    expect(file!.attachment.subarray(1, 4).toString()).toBe('PNG')
    expect(file!.description).toContain('1: crie a conta')
    expect(file!.description).toContain('3: vincule este Discord')
  })

  it('links to sign-up and to the Discord link on the site', async () => {
    const [row] = (await welcomeMessage('900000000000000002', { webUrl: 'https://prolobby.test/' }))
      .components!

    expect(row!.components.map((button) => ('url' in button ? button.url : ''))).toEqual([
      'https://prolobby.test/sign-up',
      'https://prolobby.test/account/discord',
    ])
  })
})
