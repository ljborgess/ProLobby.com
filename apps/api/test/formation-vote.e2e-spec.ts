import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  signWebhookPayload,
  type LobbyChannelsCreatedEvent,
} from '@prolobby/types'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { Platform } from '../src/common/domain/platform.enum'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { DeclaredClub } from '../src/modules/account/declared-club.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { CaptainOffer } from '../src/modules/lobby/captain-offer.entity'
import { LobbyParticipation, LobbySide } from '../src/modules/lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import { LobbyChannelsService } from '../src/modules/bot-integration/lobby-channels.service'
import { CaptainCascadeService } from '../src/modules/queue/captain-cascade.service'
import { FormationVoteService } from '../src/modules/queue/formation-vote.service'
import { LobbyConfirmationService } from '../src/modules/queue/lobby-confirmation.service'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { QueueMatchingService } from '../src/modules/queue/queue-matching.service'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'
const SECOND = 1000
const SECRET = 'test-webhook-secret-not-the-placeholder'

const ARCHETYPE: Record<CharacterCategory, Archetype> = {
  [CharacterCategory.GOALKEEPER]: Archetype.SHOT_STOPPER,
  [CharacterCategory.DEFENDER]: Archetype.BOSS,
  [CharacterCategory.MIDFIELDER]: Archetype.MAESTRO,
  [CharacterCategory.WINGER]: Archetype.SPARK,
  [CharacterCategory.STRIKER]: Archetype.FINISHER,
}

type Player = { accountId: string; cookie: string }

/** Phase 3, #249: the formation vote of each side — RF-034. */
describe('formation vote (#249)', () => {
  let app: INestApplication
  let orm: MikroORM
  let matching: QueueMatchingService
  let confirmation: LobbyConfirmationService
  let cascade: CaptainCascadeService
  let channels: LobbyChannelsService
  let formation: FormationVoteService
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const queued = async (category: CharacterCategory): Promise<Player> => {
    const email = `formation-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    account.emailVerified = true
    account.state = AccountState.ACTIVE
    account.discordIdHash = randomUUID()
    const character = em.create(Character, {
      account,
      category,
      archetype: ARCHETYPE[category],
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    em.create(QueueEntry, { account, character, category, eloAtEntry: 1000 })
    em.create(DeclaredClub, { account, freeSlots: 10, clubName: `Clube ${counter}` })
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { accountId: account.id, cookie: cookieOf(res) }
  }

  /** Eight humans, both captains confirmed: the invite window is running. */
  const closedLobby = async () => {
    const players = [
      await queued(CharacterCategory.MIDFIELDER),
      await queued(CharacterCategory.MIDFIELDER),
      await queued(CharacterCategory.GOALKEEPER),
      await queued(CharacterCategory.GOALKEEPER),
      await queued(CharacterCategory.DEFENDER),
      await queued(CharacterCategory.DEFENDER),
      await queued(CharacterCategory.STRIKER),
      await queued(CharacterCategory.STRIKER),
    ]
    expect(await matching.closeMatches()).toBe(1)
    const [created] = await orm.em.fork().find(Lobby, { state: LobbyState.WAITING_PLAYERS })
    const t0 = created!.createdAt.getTime()
    for (const player of players) {
      await confirmation.respond(player.accountId, true, new Date(t0 + SECOND))
    }
    const closedAt = new Date(t0 + 5 * SECOND)
    const offers = await orm.em.fork().find(CaptainOffer, { lobby: created!.id, outcome: null })
    for (const offer of offers) {
      await cascade.respond(offer.account.id, 'confirm', closedAt)
    }
    const lobby = await lobbyOf(created!.id)
    expect(lobby.state).toBe(LobbyState.WAITING_INVITE)

    const rows = await orm.em.fork().find(LobbyParticipation, { lobby })
    const byId = new Map(players.map((p) => [p.accountId, p]))
    const side = (s: LobbySide) => {
      const captain = (s === LobbySide.A ? lobby.captainA : lobby.captainB)!.id
      return {
        captain: byId.get(captain)!,
        others: rows
          .filter((r) => r.side === s && r.account.id !== captain)
          .map((r) => byId.get(r.account.id)!),
      }
    }
    return {
      lobbyId: lobby.id,
      closedAt: closedAt.getTime(),
      a: side(LobbySide.A),
      b: side(LobbySide.B),
    }
  }

  const lobbyOf = (id: string) => orm.em.fork().findOneOrFail(Lobby, { id })
  const at = (ms: number) => new Date(ms)

  const channelsEvent = (lobbyId: string, n = 1): LobbyChannelsCreatedEvent => ({
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    type: 'lobby.channels_created',
    payload: {
      lobbyId,
      textChannelId: `90000000000000000${n}`,
      voiceAChannelId: `91000000000000000${n}`,
      voiceBChannelId: `92000000000000000${n}`,
    },
  })

  /** A closed lobby whose channels the bot reported at `openedAt`. */
  const voting = async () => {
    const lobby = await closedLobby()
    const openedAt = lobby.closedAt + 10 * SECOND
    await channels.apply(channelsEvent(lobby.lobbyId), at(openedAt))
    return { ...lobby, openedAt }
  }

  const chosen = async (lobbyId: string) => {
    const lobby = await lobbyOf(lobbyId)
    return { a: lobby.formationA ?? null, b: lobby.formationB ?? null }
  }

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.WEBHOOK_SECRET = SECRET
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue(new CapturingMailSender())
      .compile()
    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()
    orm = moduleRef.get(MikroORM)
    matching = moduleRef.get(QueueMatchingService)
    confirmation = moduleRef.get(LobbyConfirmationService)
    cascade = moduleRef.get(CaptainCascadeService)
    channels = moduleRef.get(LobbyChannelsService)
    formation = moduleRef.get(FormationVoteService)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('keeps the channel ids and opens the 60 s once, on the first report', async () => {
    const { lobbyId, openedAt } = await voting()
    await channels.apply(channelsEvent(lobbyId, 2), at(openedAt + 30 * SECOND))

    const lobby = await lobbyOf(lobbyId)
    expect(lobby.textChannelId).toBe('900000000000000001')
    expect(lobby.voiceAChannelId).toBe('910000000000000001')
    expect(lobby.formationVoteStartedAt).toEqual(at(openedAt))
  })

  it('refuses a vote before the channels exist and after the 60 s', async () => {
    const { lobbyId, a } = await closedLobby()
    await expect(formation.vote(a.others[0]!.accountId, '4-3-3', new Date())).rejects.toMatchObject(
      { status: 409 },
    )

    const openedAt = Date.now()
    await channels.apply(channelsEvent(lobbyId), at(openedAt))
    await formation.vote(a.others[0]!.accountId, '4-3-3', at(openedAt + 60 * SECOND))
    await expect(
      formation.vote(a.others[1]!.accountId, '4-3-3', at(openedAt + 61 * SECOND)),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('the most voted wins, a changed vote counts once, and each side counts only its own', async () => {
    const { lobbyId, openedAt, a, b } = await voting()
    const t = (s: number) => at(openedAt + s * SECOND)
    await formation.vote(a.captain.accountId, '4-4-2', t(1))
    await formation.vote(a.others[0]!.accountId, '4-4-2', t(2))
    await formation.vote(a.others[1]!.accountId, '4-3-3', t(3))
    // Changed mind: one vote, the last one.
    await formation.vote(a.others[1]!.accountId, '4-4-2', t(4))
    // The other side voting 4-3-3 in bulk does not reach side A.
    for (const player of [b.captain, ...b.others]) {
      await formation.vote(player.accountId, '4-3-3', t(5))
    }

    expect(await formation.close(t(59))).toBe(0)
    expect(await formation.close(t(60))).toBe(1)

    expect(await chosen(lobbyId)).toEqual({ a: '4-4-2', b: '4-3-3' })
  })

  it('a tie goes to the captain, among the tied only', async () => {
    const { lobbyId, openedAt, a } = await voting()
    await formation.vote(a.others[0]!.accountId, '4-4-2', at(openedAt + SECOND))
    await formation.vote(a.others[1]!.accountId, '4-2-3-1', at(openedAt + SECOND))
    await formation.close(at(openedAt + 60 * SECOND))
    expect((await chosen(lobbyId)).a).toBeNull()

    await expect(formation.choose(a.others[0]!.accountId, '4-4-2')).rejects.toMatchObject({
      status: 404,
    })
    await expect(formation.choose(a.captain.accountId, '4-3-3')).rejects.toMatchObject({
      status: 400,
    })
    await formation.choose(a.captain.accountId, '4-2-3-1')

    expect((await chosen(lobbyId)).a).toBe('4-2-3-1')
    await expect(formation.choose(a.captain.accountId, '4-4-2')).rejects.toMatchObject({
      status: 409,
    })
  })

  it('no vote at all: the captain picks any', async () => {
    const { lobbyId, openedAt, b } = await voting()
    await expect(formation.choose(b.captain.accountId, '4-3-3')).rejects.toMatchObject({
      status: 409,
    })
    await formation.close(at(openedAt + 60 * SECOND))

    await formation.choose(b.captain.accountId, '4-3-3')

    expect((await chosen(lobbyId)).b).toBe('4-3-3')
  })

  it('refuses a vote from outside the lobby', async () => {
    const { openedAt } = await voting()
    const outsider = await queued(CharacterCategory.WINGER)
    await expect(
      formation.vote(outsider.accountId, '4-3-3', at(openedAt + SECOND)),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('end to end over HTTP: the bot reports, a player votes, the screen shows it', async () => {
    const { lobbyId, a } = await closedLobby()
    const body = JSON.stringify(channelsEvent(lobbyId))
    const signedAt = new Date().toISOString()
    const reported = await request(app.getHttpServer())
      .post('/api/bot-events')
      .set('content-type', 'application/json')
      .set(WEBHOOK_TIMESTAMP_HEADER, signedAt)
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookPayload(SECRET, signedAt, body))
      .send(body)
    expect(reported.status).toBe(204)

    const player = a.others[0]!
    const bad = await request(app.getHttpServer())
      .put('/api/queue/formation-vote')
      .set('Cookie', player.cookie)
      .send({ formation: '3-5-2' })
    expect(bad.status).toBe(400)
    const voted = await request(app.getHttpServer())
      .put('/api/queue/formation-vote')
      .set('Cookie', player.cookie)
      .send({ formation: '4-2-3-1' })
    expect(voted.status).toBe(204)

    const shown = await request(app.getHttpServer()).get('/api/queue').set('Cookie', player.cookie)
    expect(shown.body.entry.lobby.formation).toMatchObject({
      options: ['4-3-3', '4-4-2', '4-2-3-1'],
      myVote: '4-2-3-1',
      chosen: null,
      captainChoices: null,
    })
    expect(shown.body.entry.lobby.formation.voteBy).toEqual(expect.any(String))
    expect(await orm.em.fork().count(QueueEntry, { lobby: lobbyId })).toBe(8)
  })
})
