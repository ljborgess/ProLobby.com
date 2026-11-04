import {
  SUPPORT_PER_HOUR,
  supportLimiter,
  supportReply,
  takeSupportMessage,
} from './support-channel'

describe('#suporte-e-denuncia (RF-061)', () => {
  const author = '900000000000000005'
  const url = 'https://discord.com/channels/1/2/3'
  const msg = (content: string, attachments = 0) => ({
    authorId: author,
    content,
    attachments,
    url,
  })
  const deps = (status = 204) => ({
    limiter: supportLimiter(),
    report: jest.fn().mockResolvedValue({ status }),
    now: () => new Date('2026-11-04T12:00:00Z'),
  })

  it('sends the message to the platform as a support event', async () => {
    const d = deps()

    expect(await takeSupportMessage(msg('  me baniram sem motivo  '), d)).toBe('opened')
    expect(d.report).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'discord.support_message',
        payload: { discordId: author, content: 'me baniram sem motivo' },
      }),
    )
  })

  it('keeps a message with an attachment and points the case back to it', async () => {
    const d = deps()

    expect(await takeSupportMessage(msg('ofensas no voice', 1), d)).toBe('kept')
    const content: string = d.report.mock.calls[0]![0].payload.content
    expect(content).toContain('ofensas no voice')
    expect(content).toContain(`1 anexo(s): ${url}`)
  })

  it('opens a case for a print with no text, instead of throwing the evidence away', async () => {
    const d = deps()

    expect(await takeSupportMessage(msg('   ', 1), d)).toBe('kept')
  })

  it('keeps text past 2000 characters, and the case stays within 2000', async () => {
    const d = deps()

    expect(await takeSupportMessage(msg('x'.repeat(3500)), d)).toBe('kept')
    expect(d.report.mock.calls[0]![0].payload.content.length).toBeLessThanOrEqual(2000)
  })

  it('refuses a message with neither text nor attachment', async () => {
    const d = deps()

    expect(await takeSupportMessage(msg('   '), d)).toBe('empty')
    expect(d.report).not.toHaveBeenCalled()
  })

  it(`stops at ${SUPPORT_PER_HOUR} cases an hour per person`, async () => {
    const d = deps()
    for (let i = 0; i < SUPPORT_PER_HOUR; i++) await takeSupportMessage(msg(`caso ${i}`), d)

    expect(await takeSupportMessage(msg('mais um'), d)).toBe('limited')
    expect(d.report).toHaveBeenCalledTimes(SUPPORT_PER_HOUR)
  })

  it('gives the slot back when the case did not open, so an outage does not use up the hour', async () => {
    const d = deps(500)
    for (let i = 0; i < SUPPORT_PER_HOUR + 1; i++) {
      expect(await takeSupportMessage(msg(`tentativa ${i}`), d)).toBe('failed')
    }

    d.report.mockResolvedValue({ status: 204 })
    expect(await takeSupportMessage(msg('agora vai'), d)).toBe('opened')
  })

  it('counts each person apart, and forgets after the hour', () => {
    const limiter = supportLimiter(1)
    const t = Date.parse('2026-11-04T12:00:00Z')

    expect(limiter.take('a', t)).toBe(true)
    expect(limiter.take('a', t + 1)).toBe(false)
    expect(limiter.take('b', t + 1)).toBe(true)
    expect(limiter.take('a', t + 60 * 60 * 1000)).toBe(true)
  })

  it('offers the link to connect the account only when there is a site to link to', () => {
    expect(
      supportReply('opened', author, { linkUrl: 'https://prolobby.test/account/discord' })
        .components,
    ).toHaveLength(1)
    expect(supportReply('opened', author).components).toEqual([])
    expect(supportReply('failed', author, { linkUrl: 'https://x' }).components).toEqual([])
  })
})
