import { sampleModerationCaseClosedEvent } from '@prolobby/types'

import { BRAND } from '../../discord/brand'
import { caseClosedMessage, notifyCaseClosed } from './moderation-case-closed'

describe('notifyCaseClosed (#308)', () => {
  it('tells the outcome and the reason, in both languages, green when it stood', () => {
    const [embed] = caseClosedMessage(sampleModerationCaseClosedEvent()).embeds

    expect(embed!.color).toBe(BRAND.green)
    expect(embed!.title).toContain('Procedente')
    expect(embed!.description).toContain('sua denúncia: **Confirmado**')
    expect(embed!.description).toContain('tu denuncia')
    expect(embed!.fields).toBeUndefined()
  })

  it('turns amber when dismissed, and shows the moderator note', () => {
    const event = sampleModerationCaseClosedEvent()
    event.payload = {
      ...event.payload,
      outcome: 'dismissed',
      reason: 'no_evidence',
      note: 'mande o print',
    }
    const [embed] = caseClosedMessage(event).embeds

    expect(embed!.color).toBe(BRAND.amber)
    expect(embed!.description).toContain('Sem prova suficiente')
    expect(embed!.fields![0]!.value).toBe('mande o print')
  })

  it('sends the DM to the Discord id in the event', async () => {
    const dm = jest.fn().mockResolvedValue(true)
    const event = sampleModerationCaseClosedEvent()

    await notifyCaseClosed(event, { dm, warn: jest.fn() })

    expect(dm).toHaveBeenCalledWith(event.payload.discordId, expect.anything())
  })

  it('logs a closed DM instead of failing, so no delivery-failure case opens', async () => {
    const warn = jest.fn()

    await expect(
      notifyCaseClosed(sampleModerationCaseClosedEvent(), {
        dm: jest.fn().mockResolvedValue(false),
        warn,
      }),
    ).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DMs'))
  })
})
