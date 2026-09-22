const mockCreateDiscordClient = jest.fn()
const mockLogGatewayErrors = jest.fn()
jest.mock('./discord/client', () => ({
  createDiscordClient: mockCreateDiscordClient,
  logGatewayErrors: mockLogGatewayErrors,
}))

/**
 * Issue #168: both secrets must stop the boot before the process does
 * anything else — never after it has already authenticated to Discord.
 */
describe('main() validates secrets before touching Discord', () => {
  const ORIGINAL = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL }
    mockCreateDiscordClient.mockReset()
    mockLogGatewayErrors.mockReset()
  })

  afterAll(() => {
    process.env = ORIGINAL
  })

  it('refuses to start without WEBHOOK_SECRET, and never creates a Discord client', async () => {
    delete process.env.WEBHOOK_SECRET
    process.env.DISCORD_BOT_TOKEN = 'a-real-looking-token'

    const { main } = await import('./index')

    await expect(main()).rejects.toThrow(/WEBHOOK_SECRET/)
    expect(mockCreateDiscordClient).not.toHaveBeenCalled()
  })

  it('refuses to start without DISCORD_BOT_TOKEN, before creating a client', async () => {
    process.env.WEBHOOK_SECRET = 'a-real-looking-webhook-secret'
    delete process.env.DISCORD_BOT_TOKEN

    const { main } = await import('./index')

    await expect(main()).rejects.toThrow(/DISCORD_BOT_TOKEN/)
    expect(mockCreateDiscordClient).not.toHaveBeenCalled()
  })

  it('refuses the placeholder DISCORD_BOT_TOKEN the same way as a missing one', async () => {
    process.env.WEBHOOK_SECRET = 'a-real-looking-webhook-secret'
    process.env.DISCORD_BOT_TOKEN = 'changeme'

    const { main } = await import('./index')

    await expect(main()).rejects.toThrow(/DISCORD_BOT_TOKEN/)
    expect(mockCreateDiscordClient).not.toHaveBeenCalled()
  })
})
