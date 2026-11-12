import { sampleAccountPunishedEvent } from '@prolobby/types'

import { BRAND } from '../../discord/brand'
import { applyPunishmentRoles, punishmentLogMessage } from './account-punished'

const roleIds = { verified: 'R_VER', beta: 'R_BETA', founder: 'R_FOU', supporter: 'R_SUP' }
const deps = () => ({
  roleIds,
  setRoles: jest.fn().mockResolvedValue(true),
  send: jest.fn().mockResolvedValue(undefined),
  logChannelId: 'LOG',
  warn: jest.fn(),
})

describe('applyPunishmentRoles (#324)', () => {
  it('a suspension takes Verificado only, and logs it', async () => {
    const d = deps()
    const event = sampleAccountPunishedEvent()

    await applyPunishmentRoles(event, d)

    expect(d.setRoles).toHaveBeenCalledWith(event.payload.discordId, [], ['R_VER'])
    expect(d.send).toHaveBeenCalledWith('LOG', expect.anything())
  })

  it('the end of a suspension gives Verificado back', async () => {
    const d = deps()
    const event = sampleAccountPunishedEvent()
    event.payload = { ...event.payload, kind: 'suspension_ended' }

    await applyPunishmentRoles(event, d)

    expect(d.setRoles).toHaveBeenCalledWith(event.payload.discordId, ['R_VER'], [])
  })

  it('a ban takes every role, in red', async () => {
    const d = deps()
    const event = sampleAccountPunishedEvent()
    event.payload = { ...event.payload, kind: 'ban' }

    await applyPunishmentRoles(event, d)

    expect(d.setRoles).toHaveBeenCalledWith(
      event.payload.discordId,
      [],
      ['R_VER', 'R_BETA', 'R_FOU', 'R_SUP'],
    )
    expect(punishmentLogMessage(event).embeds[0]!.color).toBe(BRAND.red)
  })

  it('warns, without failing, when Verificado is not set or the person left', async () => {
    const noRole = { ...deps(), roleIds: {} }
    const left = { ...deps(), setRoles: jest.fn().mockResolvedValue(false) }

    await applyPunishmentRoles(sampleAccountPunishedEvent(), noRole)
    await applyPunishmentRoles(sampleAccountPunishedEvent(), left)

    expect(noRole.setRoles).not.toHaveBeenCalled()
    expect(noRole.warn).toHaveBeenCalled()
    expect(left.warn).toHaveBeenCalled()
    expect(left.send).not.toHaveBeenCalled()
  })
})
