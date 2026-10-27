import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { EventDelivery } from '../src/modules/bot-integration/event-delivery.entity'
import { EventDeliveryTargetKind } from '../src/modules/bot-integration/event-delivery.enums'
import { EventDeliveryService } from '../src/modules/bot-integration/event-delivery.service'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseType,
} from '../src/modules/moderation/moderation-case.enums'

/** #226: an opened case reaches the moderators' channel through the bot. */
describe('moderation case announcer (#226)', () => {
  let app: INestApplication
  let orm: MikroORM
  let events: EventDeliveryService

  /** The announcement is queued right after the flush, not inside it. */
  const announcementsOf = async (caseId: string): Promise<EventDelivery[]> => {
    for (let tries = 0; tries < 40; tries += 1) {
      const rows = (
        await orm.em.fork().find(EventDelivery, { type: 'moderation.case_opened' })
      ).filter((row) => events.payloadOf(row).caseId === caseId)
      if (rows.length > 0) return rows
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return []
  }

  const open = async (type: ModerationCaseType): Promise<string> => {
    const em = orm.em.fork()
    const opened = em.create(ModerationCase, { type, origin: ModerationCaseOrigin.SYSTEM })
    await em.flush()
    return opened.id
  }

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    events = moduleRef.get(EventDeliveryService)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    await app.close()
  })

  it('queues one system event per case opened, carrying only id and type', async () => {
    const caseId = await open(ModerationCaseType.CHARACTER_VERIFICATION)

    const [announcement, ...more] = await announcementsOf(caseId)

    expect(more).toHaveLength(0)
    expect(announcement!.targetKind).toBe(EventDeliveryTargetKind.SYSTEM)
    expect(events.payloadOf(announcement!)).toEqual({ caseId, caseType: 'character_verification' })
  })

  it('never announces a delivery failure, which would loop through the same bot', async () => {
    const caseId = await open(ModerationCaseType.BOT_DELIVERY_FAILURE)

    expect(await announcementsOf(caseId)).toHaveLength(0)
  })

  it('does not announce again when an open case is only updated', async () => {
    const caseId = await open(ModerationCaseType.PUNISHMENT_APPEAL)
    await announcementsOf(caseId)
    const em = orm.em.fork()
    const opened = await em.findOneOrFail(ModerationCase, { id: caseId })
    opened.decision = 'still looking'
    await em.flush()

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(await announcementsOf(caseId)).toHaveLength(1)
  })
})
