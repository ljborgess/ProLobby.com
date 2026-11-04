// Test-server simulator: development only, never production.
//
//   pnpm --filter @prolobby/api simulate suporte [count]
//     Sends fake support requests and reports as if they came from
//     #suporte-e-denuncia: they become moderation cases, announced by the bot
//     in #casos-moderacao.
//
//   pnpm --filter @prolobby/api simulate fila
//     Puts 7 test players in the queue (GOL, ZAG and ATA in pairs, one MEI)
//     and answers every lobby step for them. Join as MEI on the site to close
//     the lobby. Ctrl+C stops; the 7 stay in the database for the next run.
//
// Needs `pnpm --filter @prolobby/api build` first (it reads dist) and the API
// and the bot running. Refuses any database that is not local.
const path = require('node:path')
const { randomUUID, randomInt } = require('node:crypto')

const api = path.resolve(__dirname, '..')
const req = (p) => require(path.join(api, 'dist', p))

const url = new URL(process.env.DATABASE_URL ?? 'postgres://localhost')
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.error('simulate: só roda contra banco local, nunca em produção.')
  process.exit(1)
}

const SUPPORT = [
  'Não consigo vincular meu Discord, dá erro no fim.',
  'Meu print do personagem foi recusado e não entendi o motivo.',
  'Denúncia: o capitão do outro lado não mandou o convite pro clube.',
  'Denúncia: jogador do meu time saiu no meio da partida de propósito.',
  'Como faço pra trocar a posição do meu personagem?',
  'O placar que reportaram está errado, ganhamos de 3 a 1.',
  'Fiquei bloqueado na fila depois de recusar uma partida, quanto tempo dura?',
  'Denúncia: ofensas no canal de voz do lobby.',
]

const fakeSnowflake = () =>
  `1${randomInt(1e8).toString().padStart(8, '0')}${randomInt(1e9).toString().padStart(9, '0')}`

async function support(count) {
  const { signWebhookPayload, WEBHOOK_SIGNATURE_HEADER, WEBHOOK_TIMESTAMP_HEADER } = require(
    require.resolve('@prolobby/types', { paths: [api] }),
  )
  const target = `http://127.0.0.1:${process.env.PORT ?? 3001}/api/bot-events`
  for (let i = 0; i < count; i++) {
    const body = Buffer.from(
      JSON.stringify({
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
        type: 'discord.support_message',
        payload: { discordId: fakeSnowflake(), content: `[TESTE] ${SUPPORT[i % SUPPORT.length]}` },
      }),
    )
    const signedAt = new Date().toISOString()
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [WEBHOOK_TIMESTAMP_HEADER]: signedAt,
        [WEBHOOK_SIGNATURE_HEADER]: signWebhookPayload(process.env.WEBHOOK_SECRET, signedAt, body),
      },
      body,
    })
    console.log(`caso ${i + 1}/${count}: ${res.status}`)
  }
}

const BOTS = [
  ['midfielder', 'maestro', 'Meio Teste FC', 'claret', 'sky', 'stripes'],
  ['goalkeeper', 'shot_stopper', 'Goleiros Unidos', 'black', 'yellow', 'plain'],
  ['goalkeeper', 'shot_stopper', 'Muralha FC', 'green', 'white', 'hoops'],
  ['defender', 'boss', 'Zaga Forte', 'navy', 'white', 'halves'],
  ['defender', 'boss', 'Defesa Real', 'red', 'black', 'sash'],
  ['striker', 'finisher', 'Gol de Placa', 'blue', 'white', 'plain'],
  ['striker', 'finisher', 'Artilharia', 'orange', 'navy', 'stripes'],
]

async function queue() {
  const { NestFactory } = require(require.resolve('@nestjs/core', { paths: [api] }))
  const { MikroORM } = require(require.resolve('@mikro-orm/postgresql', { paths: [api] }))
  const { AppModule } = req('app.module')
  const { Account } = req('modules/account/account.entity')
  const { AccountState } = req('modules/account/account.enums')
  const { TermsAcceptance } = req('modules/account/terms-acceptance.entity')
  const { CURRENT_TERMS_VERSION } = req('modules/account/terms.constants')
  const { DeclaredClub } = req('modules/account/declared-club.entity')
  const { Character, CharacterState } = req('modules/character/character.entity')
  const { CURRENT_EDITION } = req('common/domain/game-edition.enum')
  const { Platform } = req('common/domain/platform.enum')
  const { QueueEntry } = req('modules/queue/queue-entry.entity')
  const { LobbyParticipation } = req('modules/lobby/lobby-participation.entity')
  const { CaptainOffer } = req('modules/lobby/captain-offer.entity')
  const { LobbyConfirmationService } = req('modules/queue/lobby-confirmation.service')
  const { CaptainCascadeService } = req('modules/queue/captain-cascade.service')
  const { LobbyInviteService } = req('modules/queue/lobby-invite.service')
  const { encryptAtRest, readEvidenceEncryptionKey } = req('common/security/evidence-encryption')
  const { hashIdentity, readIdentityHmacSecret } = req('common/security/identity-hmac')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] })
  const orm = app.get(MikroORM)
  const confirmation = app.get(LobbyConfirmationService)
  const cascade = app.get(CaptainCascadeService)
  const invite = app.get(LobbyInviteService)
  const key = readEvidenceEncryptionKey()
  const hmac = readIdentityHmacSecret()

  const em = orm.em.fork()
  const ids = []
  for (const [i, [category, archetype, clubName, primary, secondary, pattern]] of BOTS.entries()) {
    const email = `bot${i + 1}@fila.local`
    let account = await em.findOne(Account, { email })
    if (!account) {
      account = em.create(Account, {
        email,
        passwordHash: 'not-a-login',
        birthDate: new Date('1995-01-01'),
        securityQuestion: 'Conta de teste local',
        securityAnswerHash: 'not-an-answer',
      })
      em.create(TermsAcceptance, { account, version: CURRENT_TERMS_VERSION })
    }
    account.emailVerified = true
    account.state = AccountState.ACTIVE
    account.discordPresent = true
    if (!account.discordIdEncrypted) {
      const discordId = fakeSnowflake()
      account.discordIdHash = hashIdentity(hmac, discordId)
      account.discordIdEncrypted = encryptAtRest(key, Buffer.from(discordId))
    }
    let character = await em.findOne(Character, { account, category })
    if (!character) {
      character = em.create(Character, {
        account,
        category,
        archetype,
        platform: Platform.PS5,
        edition: CURRENT_EDITION,
        state: CharacterState.VERIFIED,
        verifiedAt: new Date(),
      })
    }
    if (!(await em.findOne(DeclaredClub, { account }))) {
      em.create(DeclaredClub, {
        account,
        freeSlots: 10,
        clubName,
        kitPrimary: primary,
        kitSecondary: secondary,
        kitPattern: pattern,
      })
    }
    await em.flush()
    await em.nativeDelete(QueueEntry, { account })
    em.create(QueueEntry, { account, character, category, eloAtEntry: 1000 })
    await em.flush()
    ids.push(account.id)
    console.log(`na fila: ${email} (${category})`)
  }
  console.log(
    '\nOs 7 estão buscando. Entre na fila como MEI; eu respondo por eles. Ctrl+C encerra.\n',
  )

  const said = new Set()
  const say = (text) => said.has(text) || (said.add(text), console.log(text))
  for (;;) {
    const look = orm.em.fork()
    // Their Discord ids are invented, so the bot's presence snapshot marks
    // them gone; put them back every pass or the queue never places them.
    await look.nativeUpdate(Account, { id: { $in: ids } }, { discordPresent: true })
    for (const id of ids) {
      const mine = await look.findOne(
        LobbyParticipation,
        { account: id },
        { orderBy: { lobby: { createdAt: 'desc' } }, populate: ['lobby'] },
      )
      if (!mine) continue
      const lobby = mine.lobby
      const tag = `lobby ${lobby.id.slice(0, 8)}`
      try {
        if (lobby.state === 'waiting_players' && !mine.confirmedAt) {
          await confirmation.respond(id, true)
          say(`${tag}: jogadores de teste aceitaram`)
        } else if (lobby.state === 'waiting_captain') {
          if (await look.findOne(CaptainOffer, { lobby, account: id, outcome: null })) {
            await cascade.respond(id, 'confirm')
            say(`${tag}: capitão de teste confirmou`)
          }
        } else if (lobby.state === 'waiting_invite' && !mine.inviteReceivedAt) {
          if (![lobby.captainA?.id, lobby.captainB?.id].includes(id)) await invite.received(id)
          say(`${tag}: convites marcados; falta o seu`)
        } else if (lobby.state === 'in_progress') {
          say(`${tag}: partida em andamento`)
        }
      } catch {
        // A step that closed under us: the next pass sees the new state.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
}

const [mode = 'suporte', amount = '4'] = process.argv.slice(2)
const run = mode === 'fila' ? queue() : mode === 'suporte' ? support(Number(amount)) : null
if (!run) {
  console.error('uso: simulate suporte [quantos] | simulate fila')
  process.exit(1)
}
run.then(
  () => process.exit(0),
  (error) => {
    console.error(error.message)
    process.exit(1)
  },
)
