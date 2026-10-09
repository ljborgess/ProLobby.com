import { sampleModerationCaseOpenedEvent } from '@prolobby/types'

import { announceModerationCase } from './moderation-case-opened'

describe('announceModerationCase (#226)', () => {
  const deps = () => ({
    channelId: '900000000000000001',
    webUrl: 'https://prolobby.test/',
    send: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn(),
  })

  it('posts the kind of case and the panel link to the moderators channel', async () => {
    const d = deps()

    await announceModerationCase(sampleModerationCaseOpenedEvent(), d)

    expect(d.send).toHaveBeenCalledWith(
      '900000000000000001',
      'Caso novo de moderação: **verificação de personagem**. Meta: 24 h.\nhttps://prolobby.test/moderation',
    )
  })

  it('names a kind it does not know by its own words, not by refusing it', async () => {
    const d = deps()

    await announceModerationCase(
      sampleModerationCaseOpenedEvent({
        payload: { caseId: '11111111-1111-1111-1111-000000000401', caseType: 'brand_new_kind' },
      }),
      d,
    )

    expect(d.send.mock.calls[0]![1]).toContain('**brand new kind**')
  })

  it('carries nothing about the person: no id of the case, account or print', async () => {
    const d = deps()
    const event = sampleModerationCaseOpenedEvent()

    await announceModerationCase(event, d)

    expect(d.send.mock.calls[0]![1]).not.toContain(event.payload.caseId)
  })

  it('warns and does not post when no channel is configured', async () => {
    const d = { ...deps(), channelId: undefined }

    await announceModerationCase(sampleModerationCaseOpenedEvent(), d)

    expect(d.send).not.toHaveBeenCalled()
    expect(d.warn).toHaveBeenCalledWith(expect.stringContaining('DISCORD_MODERATION_CHANNEL_ID'))
  })
})
