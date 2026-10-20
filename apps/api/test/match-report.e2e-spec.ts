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
import { PeerRating, PeerRatingKind } from '../src/modules/lobby/peer-rating.entity'
import { PlatformGamertag } from '../src/modules/character/platform-gamertag.entity'
import { encryptAtRest } from '../src/common/security/evidence-encryption'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseState,
  ModerationCaseType,
  UserReportReason,
} from '../src/modules/moderation/moderation-case.enums'
import { ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { CaptainCascadeService } from '../src/modules/queue/captain-cascade.service'
import { LobbyConfirmationService } from '../src/modules/queue/lobby-confirmation.service'
import { LobbyInviteService } from '../src/modules/queue/lobby-invite.service'
import { MatchReportService } from '../src/modules/queue/match-report.service'
import { PeerRatingService } from '../src/modules/queue/peer-rating.service'
import { UserReportService } from '../src/modules/queue/user-report.service'
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
  let ratings: PeerRatingService
  let userReports: UserReportService
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
    ratings = moduleRef.get(PeerRatingService)
    userReports = moduleRef.get(UserReportService)
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

  /** A one-sided result: side A reported 0x4 and nobody of side B, past the 15 min. */
  const unconfirmed = async () => {
    const lobby = await playing()
    const first = lobby.closedAt + 20 * MINUTE
    await reports.submit(lobby.a.others[0]!.accountId, score(0, 4), png(), at(first))
    await reports.expire(at(first + 15 * MINUTE))
    return { ...lobby, unconfirmedAt: first + 15 * MINUTE }
  }

  it('any human of the match contests within 48 h, once, and the lobby goes to dispute (RF-012, RF-013)', async () => {
    const { lobbyId, unconfirmedAt, a, b } = await unconfirmed()
    // Someone of the side that reported can contest too.
    const contestant = a.others[1]!.accountId

    await reports.contest(contestant, lobbyId, at(unconfirmedAt + 47 * 60 * MINUTE))

    const lobby = await lobbyOf(lobbyId)
    expect(lobby.state).toBe(LobbyState.IN_DISPUTE)
    expect(lobby.scoreA ?? null).toBeNull()
    const cases = await orm.em
      .fork()
      .find(ModerationCase, { type: ModerationCaseType.SCORE_DISPUTE, lobbyId })
    expect(cases).toHaveLength(1)
    expect(cases[0]!.openedBy!.id).toBe(contestant)

    await expect(reports.contest(contestant, lobbyId)).rejects.toMatchObject({
      status: 409,
      message: 'contest_exists',
    })
    // Already in dispute: nothing left to contest.
    await expect(reports.contest(b.others[0]!.accountId, lobbyId)).rejects.toMatchObject({
      status: 409,
      message: 'contest_closed',
    })
    // And the 48 h job leaves a disputed lobby alone.
    expect(await reports.expire(at(unconfirmedAt + 49 * 60 * MINUTE))).toBe(0)
  })

  it('refuses a contest after the 48 h, on a confirmed match, and from outside the match', async () => {
    const late = await unconfirmed()
    await expect(
      reports.contest(
        late.b.others[0]!.accountId,
        late.lobbyId,
        at(late.unconfirmedAt + 48 * 60 * MINUTE),
      ),
    ).rejects.toMatchObject({ status: 409, message: 'contest_closed' })

    const confirmed = await playing()
    await reports.submit(
      confirmed.a.others[0]!.accountId,
      score(1, 0),
      png(),
      at(confirmed.closedAt + 20 * MINUTE),
    )
    await reports.submit(
      confirmed.b.others[0]!.accountId,
      score(1, 0),
      png(),
      at(confirmed.closedAt + 21 * MINUTE),
    )
    await expect(
      reports.contest(confirmed.b.others[1]!.accountId, confirmed.lobbyId),
    ).rejects.toMatchObject({ status: 409, message: 'contest_closed' })

    await expect(
      reports.contest(confirmed.a.others[0]!.accountId, late.lobbyId),
    ).rejects.toMatchObject({ status: 404, message: 'no_lobby' })
  })

  it('a dispute holds the queue: searching entries go, joining is refused (RF-013, HTTP)', async () => {
    const { lobbyId, a, b } = await unconfirmed()
    // Move the 48 h onto the real clock, for the HTTP call.
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Lobby, { id: lobbyId })
    row.unconfirmedAt = new Date(Date.now() - MINUTE)
    await em.flush()
    // b.captain searches again after the match freed the queue.
    const character = await em.findOneOrFail(Character, { account: b.captain.accountId })
    em.create(QueueEntry, {
      account: b.captain.accountId,
      character,
      category: character.category,
      eloAtEntry: 1000,
    })
    await em.flush()

    // The entry is gone; the screen finds the lobby to contest here.
    const before = await request(app.getHttpServer())
      .get('/api/queue')
      .set('Cookie', a.others[0]!.cookie)
    expect(before.body.entry).toBeNull()
    expect(before.body.lastMatch).toMatchObject({
      lobbyId,
      state: LobbyState.NOT_CONFIRMED,
      scoreA: 0,
      scoreB: 4,
      contestUntil: expect.any(String),
    })

    const contested = await request(app.getHttpServer())
      .post('/api/queue/contest')
      .set('Cookie', a.others[0]!.cookie)
      .send({ lobbyId })
    expect(contested.status).toBe(204)
    expect(await orm.em.fork().count(QueueEntry, { account: b.captain.accountId })).toBe(0)
    const after = await request(app.getHttpServer())
      .get('/api/queue')
      .set('Cookie', a.others[0]!.cookie)
    expect(after.body.lastMatch).toMatchObject({
      lobbyId,
      state: LobbyState.IN_DISPUTE,
      scoreA: null,
      contestUntil: null,
    })

    const joined = await request(app.getHttpServer())
      .post('/api/queue')
      .set('Cookie', b.captain.cookie)
      .send({ characterId: character.id })
    expect(joined.status).toBe(409)
    expect(joined.body.message).toBe('match_in_dispute')

    const bad = await request(app.getHttpServer())
      .post('/api/queue/contest')
      .set('Cookie', a.others[0]!.cookie)
      .send({ lobbyId: 'not-a-uuid' })
    expect(bad.status).toBe(400)
  })

  it('60 min of the match without a print: expired, −3 for every human, queue free (5 to 12)', async () => {
    const { lobbyId, closedAt, a } = await playing()
    const deadline = closedAt + 60 * MINUTE

    // Past the 60 min, before the job: refused all the same.
    await expect(
      reports.submit(a.others[0]!.accountId, score(1, 0), png(), at(deadline)),
    ).rejects.toMatchObject({ status: 409, message: 'report_closed' })

    expect(await reports.expire(at(deadline - 1))).toBe(0)
    expect(await reports.expire(at(deadline))).toBe(1)

    expect(await lobbyOf(lobbyId)).toMatchObject({
      state: LobbyState.EXPIRED_NO_REPORT,
      endedAt: at(deadline),
    })
    expect(await entriesOf(lobbyId)).toBe(0)
    const events = await orm.em
      .fork()
      .find(ReputationEvent, { lobbyId, reason: ReputationEventReason.ZERO_REPORT })
    expect(events).toHaveLength(8)
    expect(events.every((e) => e.delta === -3)).toBe(true)
    const account = await orm.em.fork().findOneOrFail(Account, { id: a.captain.accountId })
    expect(account.reputation).toBe(67)
  })

  it('a lobby that never started does not expire by zero-report', async () => {
    const { lobbyId, closedAt } = await closedLobby()
    // Still waiting on invites: that window's own job cancels it, without penalty.
    await reports.expire(at(closedAt + 61 * MINUTE))
    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.WAITING_INVITE)
  })

  it('the third zero-report in 30 days costs 6; one older than 30 days does not count (RF-071)', async () => {
    const { lobbyId, closedAt, a } = await playing()
    const who = a.captain.accountId
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { id: who })
    const day = 24 * 60 * MINUTE
    // Two earlier zero-reports inside the window, one just outside it.
    for (const ago of [31 * day, 20 * day, 2 * day]) {
      em.create(ReputationEvent, {
        account,
        delta: -3,
        reason: ReputationEventReason.ZERO_REPORT,
        createdAt: at(closedAt - ago),
      })
    }
    await em.flush()

    await reports.expire(at(closedAt + 60 * MINUTE))

    const mine = await orm.em.fork().findOneOrFail(ReputationEvent, { lobbyId, account: who })
    expect(mine.delta).toBe(-6)
  })

  /** Both sides reported 2x1: finished. */
  const finished = async () => {
    const lobby = await playing()
    await reports.submit(
      lobby.a.others[0]!.accountId,
      score(2, 1),
      png(),
      at(lobby.closedAt + 20 * MINUTE),
    )
    await reports.submit(
      lobby.b.others[0]!.accountId,
      score(2, 1),
      png(),
      at(lobby.closedAt + 21 * MINUTE),
    )
    expect((await lobbyOf(lobby.lobbyId)).state).toBe(LobbyState.FINISHED)
    return lobby
  }
  const participationOf = (lobbyId: string, accountId: string) =>
    orm.em.fork().findOneOrFail(LobbyParticipation, { lobby: lobbyId, account: accountId })
  const reputationOf = async (accountId: string) =>
    (await orm.em.fork().findOneOrFail(Account, { id: accountId })).reputation

  it('lists the teammates of the side to rate, with the gamertag inside the match (4.2)', async () => {
    const { lobbyId, a } = await finished()
    const rated = a.others[1]!
    const em = orm.em.fork()
    em.create(PlatformGamertag, {
      account: rated.accountId,
      platform: Platform.PS5,
      gamertagHash: 'b'.repeat(64),
      gamertagEncrypted: encryptAtRest(
        Buffer.from(process.env.EVIDENCE_ENCRYPTION_KEY!, 'base64'),
        Buffer.from('Parceiro_Bom'),
      ),
      verifiedAt: new Date(),
    })
    await em.flush()

    const shown = await request(app.getHttpServer())
      .get('/api/queue')
      .set('Cookie', a.others[0]!.cookie)

    const teammates = shown.body.lastMatch.teammates
    expect(teammates).toHaveLength(3)
    // The other side too, to report: no rating there.
    expect(shown.body.lastMatch.opponents).toHaveLength(4)
    const row = await participationOf(lobbyId, rated.accountId)
    expect(teammates).toContainEqual(
      expect.objectContaining({
        participationId: row.id,
        gamertag: 'Parceiro_Bom',
        myRating: null,
      }),
    )
    // Account ids never leave the API.
    expect(JSON.stringify(teammates)).not.toContain(rated.accountId)
  })

  it('a thumbs-up is +1 at once, even above 70; once per pair; only the own side (4.2)', async () => {
    const { lobbyId, a, b } = await finished()
    const from = a.others[0]!.accountId
    const to = await participationOf(lobbyId, a.captain.accountId)
    const before = await reputationOf(a.captain.accountId)

    await ratings.rate(from, lobbyId, to.id, PeerRatingKind.THUMBS_UP)

    expect(await reputationOf(a.captain.accountId)).toBe(before + 1)
    await expect(ratings.rate(from, lobbyId, to.id, PeerRatingKind.NEGATIVE)).rejects.toMatchObject(
      {
        status: 409,
        message: 'rating_exists',
      },
    )
    const rival = await participationOf(lobbyId, b.captain.accountId)
    await expect(
      ratings.rate(from, lobbyId, rival.id, PeerRatingKind.NEGATIVE),
    ).rejects.toMatchObject({ status: 404, message: 'not_a_teammate' })
    const self = await participationOf(lobbyId, from)
    await expect(
      ratings.rate(from, lobbyId, self.id, PeerRatingKind.THUMBS_UP),
    ).rejects.toMatchObject({ status: 404, message: 'not_a_teammate' })
  })

  it('a negative moves nothing; a match not finished cannot be rated (4.2)', async () => {
    const done = await finished()
    const to = await participationOf(done.lobbyId, done.a.captain.accountId)
    const before = await reputationOf(done.a.captain.accountId)
    await ratings.rate(done.a.others[0]!.accountId, done.lobbyId, to.id, PeerRatingKind.NEGATIVE)
    expect(await reputationOf(done.a.captain.accountId)).toBe(before)

    const running = await playing()
    const mate = await participationOf(running.lobbyId, running.a.captain.accountId)
    await expect(
      ratings.rate(
        running.a.others[0]!.accountId,
        running.lobbyId,
        mate.id,
        PeerRatingKind.THUMBS_UP,
      ),
    ).rejects.toMatchObject({ status: 409, message: 'rating_closed' })
  })

  it('5 negatives in 30 days from different people in different matches open a case, once', async () => {
    const { lobbyId, a } = await finished()
    const target = a.captain.accountId
    const em = orm.em.fork()
    // Earlier, inside the window: two people in two matches, and a third person twice.
    const negative = (from: string, ago: number) =>
      em.create(PeerRating, {
        lobby: em.create(Lobby, { state: LobbyState.FINISHED }),
        fromAccount: from,
        toAccount: target,
        kind: PeerRatingKind.NEGATIVE,
        createdAt: new Date(Date.now() - ago),
      })
    for (let i = 0; i < 2; i++)
      negative((await queued(CharacterCategory.WINGER)).accountId, (i + 1) * 24 * 60 * MINUTE)
    const repeat = (await queued(CharacterCategory.WINGER)).accountId
    negative(repeat, 3 * 24 * 60 * MINUTE)
    negative(repeat, 2 * MINUTE)
    // Older than 30 days: out of the count.
    negative((await queued(CharacterCategory.WINGER)).accountId, 31 * 24 * 60 * MINUTE)
    await em.flush()
    const cases = () =>
      orm.em.fork().count(ModerationCase, {
        type: ModerationCaseType.NEGATIVE_RATING_THRESHOLD,
        targetAccount: target,
      })
    const to = await participationOf(lobbyId, target)

    // 4 people over 5 matches: the repeat counts once.
    await ratings.rate(a.others[0]!.accountId, lobbyId, to.id, PeerRatingKind.NEGATIVE)
    expect(await cases()).toBe(0)
    // 5 people over 5 matches (this one counted once).
    await ratings.rate(a.others[1]!.accountId, lobbyId, to.id, PeerRatingKind.NEGATIVE)
    expect(await cases()).toBe(1)

    // The next negative starts a new count: no second case right away.
    await ratings.rate(a.others[2]!.accountId, lobbyId, to.id, PeerRatingKind.NEGATIVE)
    expect(await cases()).toBe(1)
  })

  it('rates over HTTP with a validated body (4.2)', async () => {
    const { lobbyId, a } = await finished()
    const to = await participationOf(lobbyId, a.captain.accountId)

    const ok = await request(app.getHttpServer())
      .post('/api/queue/ratings')
      .set('Cookie', a.others[0]!.cookie)
      .send({ lobbyId, participationId: to.id, kind: 'thumbs_up' })
    expect(ok.status).toBe(204)
    const bad = await request(app.getHttpServer())
      .post('/api/queue/ratings')
      .set('Cookie', a.others[0]!.cookie)
      .send({ lobbyId, participationId: to.id, kind: 'stars' })
    expect(bad.status).toBe(400)
  })

  const WHY = 'Saiu no meio da partida e voltou rindo no canal.'

  it('reports someone of the match, either side, with the author kept for moderation only (4.2)', async () => {
    const { lobbyId, a, b } = await finished()
    const rival = await participationOf(lobbyId, b.captain.accountId)

    const { caseId } = await userReports.open(
      a.others[0]!.accountId,
      lobbyId,
      rival.id,
      UserReportReason.DISCONNECT,
      WHY,
    )

    const opened = await orm.em.fork().findOneOrFail(ModerationCase, { id: caseId })
    expect(opened).toMatchObject({
      type: ModerationCaseType.USER_REPORT,
      state: ModerationCaseState.OPEN,
      lobbyId,
      reportReason: UserReportReason.DISCONNECT,
      reportMessage: WHY,
    })
    expect(opened.targetAccount!.id).toBe(b.captain.accountId)
    expect(opened.openedBy!.id).toBe(a.others[0]!.accountId)
  })

  it('refuses a 4th open report until one is resolved (RF-068)', async () => {
    const { lobbyId, a, b } = await finished()
    const from = a.others[0]!.accountId
    const targets = [b.captain, ...b.others].map((p) => participationOf(lobbyId, p.accountId))
    const rows = await Promise.all(targets)
    for (const row of rows.slice(0, 3)) {
      await userReports.open(from, lobbyId, row.id, UserReportReason.BEHAVIOR, WHY)
    }
    await expect(
      userReports.open(from, lobbyId, rows[3]!.id, UserReportReason.BEHAVIOR, WHY),
    ).rejects.toMatchObject({ status: 409, message: 'too_many_open_reports' })

    const em = orm.em.fork()
    const [one] = await em.find(ModerationCase, {
      openedBy: from,
      type: ModerationCaseType.USER_REPORT,
    })
    one!.state = ModerationCaseState.RESOLVED
    await em.flush()
    await userReports.open(from, lobbyId, rows[3]!.id, UserReportReason.BEHAVIOR, WHY)
  })

  it('only someone met in a match, never oneself or a stranger (4.2)', async () => {
    const first = await finished()
    const second = await finished()
    const from = first.a.others[0]!.accountId
    const self = await participationOf(first.lobbyId, from)
    const elsewhere = await participationOf(second.lobbyId, second.a.captain.accountId)

    await expect(
      userReports.open(from, first.lobbyId, self.id, UserReportReason.FRAUD, WHY),
    ).rejects.toMatchObject({ status: 404, message: 'not_in_match' })
    await expect(
      userReports.open(from, first.lobbyId, elsewhere.id, UserReportReason.FRAUD, WHY),
    ).rejects.toMatchObject({ status: 404, message: 'not_in_match' })
    await expect(
      userReports.open(from, second.lobbyId, elsewhere.id, UserReportReason.FRAUD, WHY),
    ).rejects.toMatchObject({ status: 404, message: 'no_lobby' })
  })

  it('3 reports dismissed in 30 days make a conduct case about the reporter, once (RF-069)', async () => {
    const { lobbyId, a, b } = await finished()
    const from = a.others[0]!.accountId
    const rows = await Promise.all(
      [b.captain, ...b.others].map((p) => participationOf(lobbyId, p.accountId)),
    )
    const conduct = () =>
      orm.em.fork().count(ModerationCase, {
        type: ModerationCaseType.BASELESS_REPORTS,
        targetAccount: from,
      })
    // What the panel will do (phase 5): dismiss, then tell the service.
    const dismiss = async (participationId: string, at: Date) => {
      const { caseId } = await userReports.open(
        from,
        lobbyId,
        participationId,
        UserReportReason.BEHAVIOR,
        WHY,
      )
      await orm.em.fork().transactional(async (em) => {
        const report = await em.findOneOrFail(ModerationCase, { id: caseId })
        report.state = ModerationCaseState.DISMISSED
        report.resolvedAt = at
        await em.flush()
        await userReports.afterDismissal(em, report, at)
      })
    }
    const now = Date.now()
    // One older than 30 days does not count.
    await dismiss(rows[0]!.id, new Date(now - 31 * 24 * 60 * MINUTE))
    await dismiss(rows[1]!.id, new Date(now - 2 * MINUTE))
    await dismiss(rows[2]!.id, new Date(now - MINUTE))
    expect(await conduct()).toBe(0)

    await dismiss(rows[3]!.id, new Date(now))
    expect(await conduct()).toBe(1)
  })

  it('opens a report over HTTP with a validated body (4.2)', async () => {
    const { lobbyId, a, b } = await finished()
    const rival = await participationOf(lobbyId, b.captain.accountId)
    const send = (body: object) =>
      request(app.getHttpServer())
        .post('/api/queue/user-reports')
        .set('Cookie', a.others[0]!.cookie)
        .send({ lobbyId, participationId: rival.id, reason: 'behavior', ...body })

    expect((await send({ message: 'curto' })).status).toBe(400)
    expect((await send({ message: WHY, reason: 'spam' })).status).toBe(400)
    const ok = await send({ message: WHY })
    expect(ok.status).toBe(201)
    expect(ok.body).toEqual({ caseId: expect.any(String) })
  })

  it('rating closes 48 h after the match finished (4.2)', async () => {
    const { lobbyId, a } = await finished()
    const ended = (await lobbyOf(lobbyId)).endedAt!.getTime()
    const to = await participationOf(lobbyId, a.captain.accountId)
    const from = a.others[0]!.accountId

    await expect(
      ratings.rate(from, lobbyId, to.id, PeerRatingKind.THUMBS_UP, at(ended + 48 * 60 * MINUTE)),
    ).rejects.toMatchObject({ status: 409, message: 'rating_closed' })
    await ratings.rate(
      from,
      lobbyId,
      to.id,
      PeerRatingKind.THUMBS_UP,
      at(ended + 48 * 60 * MINUTE - 1),
    )

    const shown = await request(app.getHttpServer())
      .get('/api/queue')
      .set('Cookie', a.others[1]!.cookie)
    expect(new Date(shown.body.lastMatch.rateUntil).getTime()).toBe(ended + 48 * 60 * MINUTE)
  })
})
