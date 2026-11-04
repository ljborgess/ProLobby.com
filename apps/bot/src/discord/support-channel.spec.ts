import { SUPPORT_PER_HOUR, supportLimiter, takeSupportMessage } from './support-channel'

describe('#suporte-e-denuncia (RF-061)', () => {
  const author = '900000000000000005'
  const deps = (status = 204) => ({
    allow: supportLimiter(),
    report: jest.fn().mockResolvedValue({ status }),
    now: () => new Date('2026-11-04T12:00:00Z'),
  })

  it('sends the message to the platform as a support event', async () => {
    const d = deps()

    expect(
      await takeSupportMessage({ authorId: author, content: '  me baniram sem motivo  ' }, d),
    ).toBe('opened')
    expect(d.report).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'discord.support_message',
        payload: { discordId: author, content: 'me baniram sem motivo' },
      }),
    )
  })

  it('refuses an attachment with no text instead of opening an empty case', async () => {
    const d = deps()

    expect(await takeSupportMessage({ authorId: author, content: '   ' }, d)).toBe('empty')
    expect(d.report).not.toHaveBeenCalled()
  })

  it(`stops at ${SUPPORT_PER_HOUR} cases an hour per person`, async () => {
    const d = deps()
    for (let i = 0; i < SUPPORT_PER_HOUR; i++) {
      await takeSupportMessage({ authorId: author, content: `caso ${i}` }, d)
    }

    expect(await takeSupportMessage({ authorId: author, content: 'mais um' }, d)).toBe('limited')
    expect(d.report).toHaveBeenCalledTimes(SUPPORT_PER_HOUR)
  })

  it('counts each person apart, and forgets after the hour', () => {
    const allow = supportLimiter(1)
    const t = Date.parse('2026-11-04T12:00:00Z')

    expect(allow('a', t)).toBe(true)
    expect(allow('a', t + 1)).toBe(false)
    expect(allow('b', t + 1)).toBe(true)
    expect(allow('a', t + 60 * 60 * 1000)).toBe(true)
  })

  it('reports a failure when the platform did not take it, so the message is kept', async () => {
    const d = deps(500)

    expect(await takeSupportMessage({ authorId: author, content: 'oi' }, d)).toBe('failed')
    d.report.mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await takeSupportMessage({ authorId: '900000000000000006', content: 'oi' }, d)).toBe(
      'failed',
    )
  })

  it('cuts a message at 2000 characters, the size the platform accepts', async () => {
    const d = deps()

    await takeSupportMessage({ authorId: author, content: 'x'.repeat(4000) }, d)

    expect(d.report.mock.calls[0]![0].payload.content).toHaveLength(2000)
  })
})
