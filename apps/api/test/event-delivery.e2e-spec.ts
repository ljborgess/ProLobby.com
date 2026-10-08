import { MikroORM } from '@mikro-orm/postgresql'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { sampleLobbyClosedEvent } from '@prolobby/types'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { EventDelivery } from '../src/modules/bot-integration/event-delivery.entity'
import { EventDeliveryTargetKind } from '../src/modules/bot-integration/event-delivery.enums'
import { EventDeliveryService } from '../src/modules/bot-integration/event-delivery.service'

const WEBHOOK_SECRET = 'test-webhook-secret-not-the-placeholder'

describe('EventDelivery (e2e)', () => {
  let app: INestApplication
  let orm: MikroORM
  let service: EventDeliveryService
  const fetchMock = jest.fn().mockResolvedValue({ status: 202 })

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.WEBHOOK_SECRET = WEBHOOK_SECRET
    process.env.BOT_WEBHOOK_URL = 'http://127.0.0.1:3002/events'
    global.fetch = fetchMock as unknown as typeof fetch

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    service = moduleRef.get(EventDeliveryService)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('stores a single row when the same event is enqueued twice at once', async () => {
    const event = sampleLobbyClosedEvent()
    const target = { kind: EventDeliveryTargetKind.LOBBY, id: event.payload.lobbyId }

    await Promise.all([service.enqueue(event, target), service.enqueue(event, target)])

    const em = orm.em.fork()
    await expect(em.count(EventDelivery, { eventId: event.id })).resolves.toBe(1)
  })

  it('recovers a pending delivery on boot and does not poll afterwards', async () => {
    const event = sampleLobbyClosedEvent({
      id: '11111111-1111-1111-1111-000000000050',
    })
    const em = orm.em.fork()
    em.persist(
      em.create(EventDelivery, {
        eventId: event.id,
        type: event.type,
        payload: event.payload,
        occurredAt: new Date(event.occurredAt),
        targetKind: EventDeliveryTargetKind.LOBBY,
        targetId: event.payload.lobbyId,
        attempts: 1,
        nextAttemptAt: new Date(Date.now() + 50),
      }),
    )
    await em.flush()

    const before = service.getPendingLookupCount()
    await service.recoverPending()
    expect(service.getPendingLookupCount()).toBe(before + 1)

    await new Promise((resolve) => setTimeout(resolve, 200))

    const stored = await orm.em.fork().findOneOrFail(EventDelivery, { eventId: event.id })
    expect(stored.deliveredAt).toBeInstanceOf(Date)
    expect(service.getPendingLookupCount()).toBe(before + 1)
  })
})
