import {
  PLATFORM_EVENT_TYPES,
  isKnownPlatformEventType,
  platformEventSchema,
  sampleLobbyClosedEvent,
  sampleQuotaAlertEvent,
} from '@prolobby/types'

/**
 * The contract lives in `packages/types`, which has no test runner of its own.
 * It is exercised here because the bot is where it is enforced — the edge that
 * refuses an event is the thing these rules protect.
 */
describe('platform event contract', () => {
  it('knows exactly the types the union accepts', () => {
    // The list used by the edge check and the schema used to parse have to be
    // the same set. Two hand-kept lists drift, and the symptom is an event the
    // contract accepts being refused as unknown.
    const fromUnion = platformEventSchema.options.map((option) => option.shape.type.value)

    expect([...PLATFORM_EVENT_TYPES].sort()).toEqual([...fromUnion].sort())
    for (const type of fromUnion) {
      expect(isKnownPlatformEventType(type)).toBe(true)
    }
    expect(isKnownPlatformEventType('lobby.exploded')).toBe(false)
  })

  it('refuses an unexpected field in a payload instead of dropping it', () => {
    const event = sampleLobbyClosedEvent()
    const smuggled = {
      ...event,
      payload: { ...event.payload, kickEveryone: true },
    }

    // Without `.strict()`, zod strips the field and hands the handler a
    // payload that silently lost something the sender believed it was sending.
    expect(platformEventSchema.safeParse(smuggled).success).toBe(false)
  })

  it('refuses a payload that belongs to another event type', () => {
    const lobby = sampleLobbyClosedEvent()
    const mismatched = { ...lobby, type: 'account.punished' as const }

    expect(platformEventSchema.safeParse(mismatched).success).toBe(false)
  })

  it('accepts the fixtures it ships', () => {
    expect(platformEventSchema.safeParse(sampleLobbyClosedEvent()).success).toBe(true)
    expect(platformEventSchema.safeParse(sampleQuotaAlertEvent()).success).toBe(true)
  })
})
