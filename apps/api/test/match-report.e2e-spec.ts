import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
import { MatchReport } from '../src/modules/lobby/match-report.entity'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import { ModerationCaseType } from '../src/modules/moderation/moderation-case.enums'
import { ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { CaptainCascadeService } from '../src/modules/queue/captain-cascade.service'
import { LobbyConfirmationService } from '../src/modules/queue/lobby-confirmation.service'
import { LobbyInviteService } from '../src/modules/queue/lobby-invite.service'
import { MatchReportService } from '../src/modules/queue/match-report.service'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { QueueMatchingService } from '../src/modules/queue/queue-matching.service'
import { CapturingMailSender } from './support/capturing-mail-sender'
import { makePng } from './support/png'

const PASSWORD = 'a-long-enough-password'
const SECOND = 1000
const MINUTE = 60 * SECOND

const ARCHETYPE: Record<CharacterCategory, Archetype> = {
  [CharacterCategory.GOALKEEPER]: Archetype.SHOT_STOPPER,
  [CharacterCategory.DEFENDER]: Archetype.BOSS,
  [CharacterCategory.MIDFIELDER]: Archetype.MAESTRO,
  [CharacterCategory.WINGER]: Archetype.SPARK,
  [CharacterCategory.STRIKER]: Archetype.FINISHER,
}

type Player = { accountId: string; cookie: string }

/**
 * Phase 4.1, slices A and B: the result print and the score before OCR, and
 * the cross-confirmation — RF-042, RF-043, RF-045.
 */
describe('match report (4.1)', () => {
  let app: INestApplication
  let orm: MikroORM
  let matching: QueueMatchingService
  let confirmation: LobbyConfirmationService
  let cascade: CaptainCascadeService
  let invite: LobbyInviteService
  let reports: MatchReportService
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const queued = async (category: CharacterCategory): Promise<Player> => {
    const email = `report-${++counter}@test.local`
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

  /** A lobby with every invite received: the match is on. */
  const playing = async () => {
    const lobby = await closedLobby()
    for (const player of [...lobby.a.others, ...lobby.b.others]) {
      await invite.received(player.accountId, at(lobby.closedAt + SECOND))
    }
    expect((await lobbyOf(lobby.lobbyId)).state).toBe(LobbyState.IN_PROGRESS)
    return lobby
  }

  let seed = 0
  const png = () => makePng(400, 300, ++seed)
  const score = (scoreA: number, scoreB: number) => ({ scoreA, scoreB })

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')
    process.env.PRINTS_DIR = mkdtempSync(join(tmpdir(), 'prolobby-match-'))

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
    invite = moduleRef.get(LobbyInviteService)
    reports = moduleRef.get(MatchReportService)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    delete process.env.PRINTS_DIR
    await app.close()
  })

  it('refuses a print before the 5 min floor, saying how long is left (RF-045)', async () => {
    const { closedAt, a } = await playing()

    await expect(
      reports.submit(a.others[0]!.accountId, score(1, 0), png(), at(closedAt + 4 * MINUTE)),
    ).rejects.toMatchObject({
      status: 409,
      response: { message: 'report_too_early', retryAfterSeconds: 60 },
    })
    expect(await orm.em.fork().count(MatchReport, {})).toBe(0)
  })

  it('the first report moves the lobby to awaiting_confirmation and keeps the print encrypted', async () => {
    const { lobbyId, closedAt, b } = await playing()
    const file = png()
    const when = at(closedAt + 20 * MINUTE)

    const view = await reports.submit(b.others[0]!.accountId, score(2, 3), file, when)

    expect(view).toMatchObject({ side: LobbySide.B, scoreA: 2, scoreB: 3 })
    const lobby = await lobbyOf(lobbyId)
    expect(lobby.state).toBe(LobbyState.AWAITING_CONFIRMATION)
    expect(lobby.firstReportAt).toEqual(when)
    const stored = await orm.em.fork().findOneOrFail(MatchReport, { id: view.id })
    expect(existsSync(stored.filePath!)).toBe(true)
    expect(readFileSync(stored.filePath!).equals(file)).toBe(false)

    // A second report keeps the first marker.
    await reports.submit(b.others[1]!.accountId, score(2, 3), png(), at(closedAt + 22 * MINUTE))
    expect((await lobbyOf(lobbyId)).firstReportAt).toEqual(when)
  })

  it('one report per person, and the same file never reports twice', async () => {
    const { closedAt, a, b } = await playing()
    const file = png()
    const when = at(closedAt + 20 * MINUTE)
    await reports.submit(a.others[0]!.accountId, score(1, 1), file, when)

    await expect(
      reports.submit(a.others[0]!.accountId, score(1, 1), png(), when),
    ).rejects.toMatchObject({ status: 409, message: 'report_exists' })
    await expect(
      reports.submit(b.others[0]!.accountId, score(1, 1), file, when),
    ).rejects.toMatchObject({ status: 409, message: 'print_already_used' })
  })

  it('refuses garbage, outsiders, and a lobby where the match has not started', async () => {
    const lobby = await closedLobby()
    const player = lobby.a.others[0]!
    const later = at(lobby.closedAt + 20 * MINUTE)

    await expect(
      reports.submit(player.accountId, score(1, 0), Buffer.from('not an image'), later),
    ).rejects.toMatchObject({ status: 400, message: 'invalid_format' })
    await expect(
      reports.submit(player.accountId, score(1, 0), makePng(100, 100, 1), later),
    ).rejects.toMatchObject({ status: 400, message: 'image_too_small' })
    // Still waiting on invites: no match to report yet.
    await expect(reports.submit(player.accountId, score(1, 0), png(), later)).rejects.toMatchObject(
      { status: 409, message: 'report_closed' },
    )
    const outsider = await queued(CharacterCategory.WINGER)
    await expect(
      reports.submit(outsider.accountId, score(1, 0), png(), later),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('corrects the typed score until the other side reports, then refuses (RF-042)', async () => {
    const { closedAt, a, b } = await playing()
    const reporter = a.others[0]!.accountId
    await reports.submit(reporter, score(3, 1), png(), at(closedAt + 20 * MINUTE))

    // A teammate reporting too does not close the correction.
    await reports.submit(a.others[1]!.accountId, score(3, 1), png(), at(closedAt + 21 * MINUTE))
    const fixed = await reports.correct(reporter, score(1, 3), at(closedAt + 22 * MINUTE))
    expect(fixed).toMatchObject({ scoreA: 1, scoreB: 3 })
    const row = await orm.em.fork().findOneOrFail(MatchReport, { id: fixed.id })
    expect(row.correctedAt).toEqual(at(closedAt + 22 * MINUTE))

    await reports.submit(b.others[0]!.accountId, score(1, 3), png(), at(closedAt + 23 * MINUTE))
    await expect(reports.correct(reporter, score(2, 3))).rejects.toMatchObject({
      status: 409,
      message: 'report_closed',
    })
  })

  it('end to end over HTTP: multipart print and score, validated, shown on the screen', async () => {
    const { lobbyId, a } = await playing()
    // The floor counts from closed_at; move it back so the real clock is past it.
    const em = orm.em.fork()
    const lobby = await em.findOneOrFail(Lobby, { id: lobbyId })
    lobby.closedAt = new Date(Date.now() - 10 * MINUTE)
    await em.flush()
    const player = a.others[0]!

    const tooHigh = await request(app.getHttpServer())
      .post('/api/queue/report')
      .set('Cookie', player.cookie)
      .field('scoreA', '21')
      .field('scoreB', '0')
      .attach('print', png(), 'print.png')
    expect(tooHigh.status).toBe(400)
    const noPrint = await request(app.getHttpServer())
      .post('/api/queue/report')
      .set('Cookie', player.cookie)
      .field('scoreA', '2')
      .field('scoreB', '0')
    expect(noPrint.status).toBe(400)

    const sent = await request(app.getHttpServer())
      .post('/api/queue/report')
      .set('Cookie', player.cookie)
      .field('scoreA', '2')
      .field('scoreB', '0')
      .attach('print', png(), 'print.png')
    expect(sent.status).toBe(201)
    expect(sent.body).toMatchObject({ scoreA: 2, scoreB: 0 })

    const fixed = await request(app.getHttpServer())
      .put('/api/queue/report')
      .set('Cookie', player.cookie)
      .send({ scoreA: 2, scoreB: 1 })
    expect(fixed.status).toBe(200)

    const shown = await request(app.getHttpServer()).get('/api/queue').set('Cookie', player.cookie)
    expect(shown.body.entry.lobby).toMatchObject({
      state: LobbyState.AWAITING_CONFIRMATION,
      myReport: { scoreA: 2, scoreB: 1 },
    })
    expect(shown.body.entry.lobby.reportableFrom).toEqual(expect.any(String))
    expect(shown.body.entry.lobby.reportConfirmBy).toEqual(expect.any(String))
  })

  it('deletes result prints past 90 days and keeps the hash', async () => {
    const { closedAt, a } = await playing()
    const view = await reports.submit(
      a.others[0]!.accountId,
      score(0, 0),
      png(),
      at(closedAt + 20 * MINUTE),
    )
    const before = await orm.em.fork().findOneOrFail(MatchReport, { id: view.id })

    expect(await reports.deleteExpiredFiles(at(closedAt + 91 * 24 * 60 * MINUTE))).toBe(1)

    const after = await orm.em.fork().findOneOrFail(MatchReport, { id: view.id })
    expect(after.filePath ?? null).toBeNull()
    expect(after.fileHash).toBe(before.fileHash)
    expect(existsSync(before.filePath!)).toBe(false)
  })

  const entriesOf = (lobbyId: string) => orm.em.fork().count(QueueEntry, { lobby: lobbyId })
  const cleanMatchesOf = (lobbyId: string) =>
    orm.em.fork().count(ReputationEvent, { lobbyId, reason: ReputationEventReason.CLEAN_MATCH })
  const disputesOf = (lobbyId: string) =>
    orm.em.fork().count(ModerationCase, { type: ModerationCaseType.SCORE_DISPUTE, lobbyId })

  it('the other side with the same score finishes the match and frees everyone (6 to 8)', async () => {
    const { lobbyId, closedAt, a, b } = await playing()
    await reports.submit(a.others[0]!.accountId, score(2, 1), png(), at(closedAt + 20 * MINUTE))
    expect(await entriesOf(lobbyId)).toBe(8)
    const em = orm.em.fork()
    const below = await em.findOneOrFail(Account, { id: a.captain.accountId })
    below.reputation = 60
    await em.flush()

    const when = at(closedAt + 30 * MINUTE)
    await reports.submit(b.captain.accountId, score(2, 1), png(), when)

    const lobby = await lobbyOf(lobbyId)
    expect(lobby).toMatchObject({ state: LobbyState.FINISHED, scoreA: 2, scoreB: 1, endedAt: when })
    expect(await entriesOf(lobbyId)).toBe(0)
    expect(await disputesOf(lobbyId)).toBe(0)
    // A clean match for all eight: +1, capped at 70 (#208).
    expect(await cleanMatchesOf(lobbyId)).toBe(8)
    expect(
      (await orm.em.fork().findOneOrFail(Account, { id: a.captain.accountId })).reputation,
    ).toBe(61)
    // Settled: anyone else is told it closed.
    await expect(
      reports.submit(b.others[0]!.accountId, score(2, 1), png(), at(closedAt + 31 * MINUTE)),
    ).rejects.toMatchObject({ status: 409, message: 'report_closed' })
  })

  it('a different score opens a score dispute and keeps the queue held (6 to 9)', async () => {
    const { lobbyId, closedAt, a, b } = await playing()
    await reports.submit(a.others[0]!.accountId, score(2, 1), png(), at(closedAt + 20 * MINUTE))

    await reports.submit(b.others[0]!.accountId, score(1, 2), png(), at(closedAt + 25 * MINUTE))

    const lobby = await lobbyOf(lobbyId)
    expect(lobby.state).toBe(LobbyState.IN_DISPUTE)
    expect(lobby.scoreA ?? null).toBeNull()
    expect(await disputesOf(lobbyId)).toBe(1)
    expect(await entriesOf(lobbyId)).toBe(8)
  })

  it('teammates who disagree among themselves end in dispute too', async () => {
    const { lobbyId, closedAt, a, b } = await playing()
    await reports.submit(a.others[0]!.accountId, score(2, 1), png(), at(closedAt + 20 * MINUTE))
    await reports.submit(a.others[1]!.accountId, score(3, 1), png(), at(closedAt + 21 * MINUTE))

    await reports.submit(b.others[0]!.accountId, score(2, 1), png(), at(closedAt + 22 * MINUTE))

    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.IN_DISPUTE)
  })

  it('15 min with one side only: not_confirmed and free; 48 h later, finished (6 to 7 to 8)', async () => {
    const { lobbyId, closedAt, a, b } = await playing()
    const first = closedAt + 20 * MINUTE
    await reports.submit(a.others[0]!.accountId, score(0, 4), png(), at(first))

    // Late, before the job ran: closed all the same, and so is the correction.
    await expect(
      reports.submit(b.others[0]!.accountId, score(0, 4), png(), at(first + 15 * MINUTE)),
    ).rejects.toMatchObject({ status: 409, message: 'report_closed' })
    await expect(
      reports.correct(a.others[0]!.accountId, score(1, 4), at(first + 15 * MINUTE)),
    ).rejects.toMatchObject({ status: 409, message: 'report_closed' })

    expect(await reports.expire(at(first + 15 * MINUTE - 1))).toBe(0)
    expect(await reports.expire(at(first + 15 * MINUTE))).toBe(1)
    const unconfirmed = await lobbyOf(lobbyId)
    expect(unconfirmed).toMatchObject({
      state: LobbyState.NOT_CONFIRMED,
      scoreA: 0,
      scoreB: 4,
      unconfirmedAt: at(first + 15 * MINUTE),
    })
    expect(unconfirmed.endedAt ?? null).toBeNull()
    expect(await entriesOf(lobbyId)).toBe(0)
    expect(await cleanMatchesOf(lobbyId)).toBe(0)

    const contestEnds = first + 15 * MINUTE + 48 * 60 * MINUTE
    expect(await reports.expire(at(contestEnds - 1))).toBe(0)
    expect(await reports.expire(at(contestEnds))).toBe(1)
    expect(await lobbyOf(lobbyId)).toMatchObject({
      state: LobbyState.FINISHED,
      scoreA: 0,
      scoreB: 4,
      endedAt: at(contestEnds),
    })
    expect(await cleanMatchesOf(lobbyId)).toBe(8)
  })
})
