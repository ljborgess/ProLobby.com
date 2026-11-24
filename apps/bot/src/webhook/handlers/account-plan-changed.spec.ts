import { sampleAccountPlanChangedEvent } from '@prolobby/types'

import { applyPlanRole, planLogMessage } from './account-plan-changed'

const roleIds = { founder: 'R_FOUNDER', supporter: 'R_SUPPORTER' }

describe('applyPlanRole (#313)', () => {
  it('gives Founder, takes Supporter away, and logs it', async () => {
    const setRoles = jest.fn().mockResolvedValue(true)
    const send = jest.fn().mockResolvedValue(undefined)
    const event = sampleAccountPlanChangedEvent()

    await applyPlanRole(event, { roleIds, setRoles, send, logChannelId: 'LOG', warn: jest.fn() })

    expect(setRoles).toHaveBeenCalledWith(event.payload.discordId, ['R_FOUNDER'], ['R_SUPPORTER'])
    expect(send).toHaveBeenCalledWith('LOG', expect.anything())
  })

  it('takes both away on none', async () => {
    const setRoles = jest.fn().mockResolvedValue(true)
    const event = sampleAccountPlanChangedEvent()
    event.payload = { ...event.payload, plan: 'none' }

    await applyPlanRole(event, { roleIds, setRoles, send: jest.fn(), warn: jest.fn() })

    expect(setRoles).toHaveBeenCalledWith(event.payload.discordId, [], ['R_FOUNDER', 'R_SUPPORTER'])
    expect(planLogMessage(event).embeds[0]!.title).toBe('Plano revogado')
  })

  it('warns instead of failing when the person left or the roles are not set', async () => {
    const warn = jest.fn()
    const send = jest.fn()

    await applyPlanRole(sampleAccountPlanChangedEvent(), {
      roleIds,
      setRoles: jest.fn().mockResolvedValue(false),
      send,
      logChannelId: 'LOG',
      warn,
    })
    await applyPlanRole(sampleAccountPlanChangedEvent(), {
      roleIds: {},
      setRoles: jest.fn(),
      send,
      warn,
    })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(send).not.toHaveBeenCalled()
  })
})
