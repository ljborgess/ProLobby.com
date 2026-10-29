#!/usr/bin/env node
/**
 * Smoke test against a stack that is already running (`pnpm dev`).
 *
 * It exists because the checks that kept finding real problems were the ones
 * done by hand against the running app — a route renamed on one side, a proxy
 * pointing at the old path, the API down behind a 500 that looked like a wrong
 * password. The unit and e2e suites never see that: each one boots its own app.
 *
 * Read-only in spirit: it creates one throwaway account per run and never
 * touches anything that already exists.
 *
 *   node scripts/smoke.mjs [--web http://localhost:3000] [--api http://localhost:3011]
 */

const args = new Map()
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1])
}

const WEB = args.get('web') ?? 'http://localhost:3000'
const API = args.get('api') ?? 'http://localhost:3011'
const PASSWORD = 'a-long-enough-password'
const email = `smoke-${Date.now()}@test.local`

const PULADO = 'pulado'
const results = []
let session = ''

/**
 * Uma verificação. Devolver a string `pulado` marca o passo como não
 * exercitado neste ambiente — diferente de passar, e o placar não o conta
 * como tal.
 */
const check = async (name, run) => {
  try {
    if ((await run()) === PULADO) {
      results.push({ name, skipped: true })
      console.log(`  --   ${name} (pulado neste ambiente)`)
      return
    }
    results.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (error) {
    results.push({ name, ok: false, error: String(error.message ?? error) })
    console.log(`  FAIL ${name}\n       ${error.message ?? error}`)
  }
}

const expect = (actual, wanted, what) => {
  const ok = typeof wanted === 'function' ? wanted(actual) : actual === wanted
  if (!ok) {
    throw new Error(`${what}: esperado ${wanted}, veio ${JSON.stringify(actual)}`)
  }
}

const call = (url, { method = 'GET', body, headers = {}, auth = false } = {}) =>
  fetch(url, {
    method,
    redirect: 'manual',
    headers: {
      'sec-fetch-site': 'same-origin',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(auth && session ? { cookie: session } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

console.log(`\nsmoke: web=${WEB} api=${API}\n`)

console.log('saúde')
await check('API responde em /api/health', async () => {
  expect((await call(`${API}/api/health`)).status, 200, 'status')
})
await check('web serve a home, o login e o cadastro', async () => {
  for (const path of ['/', '/login', '/sign-up']) {
    expect((await call(WEB + path)).status, 200, `GET ${path}`)
  }
})

console.log('\nconta')
await check('cadastro responde 202 pelo proxy', async () => {
  const res = await call(`${WEB}/bff/accounts`, {
    method: 'POST',
    body: {
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: '2026-09-14',
    },
  })
  expect(res.status, 202, 'status')
})
await check('login devolve o cookie de sessão HttpOnly', async () => {
  const res = await call(`${WEB}/bff/sessions`, {
    method: 'POST',
    body: { email, password: PASSWORD },
  })
  expect(res.status, 200, 'status')
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('prolobby_session='))
  if (!cookie) throw new Error('sem Set-Cookie de sessão')
  expect(cookie.includes('HttpOnly'), true, 'HttpOnly')
  session = cookie.split(';')[0]
})

console.log(
  '\nroteamento (/verifications é a área logada; desde 2026-10-29 a home aparece pra todos)',
)
await check('a home logada mostra a landing com a conta no lugar do cadastro', async () => {
  const res = await call(WEB, { auth: true })
  expect(res.status, 200, 'status')
  const html = await res.text()
  expect(html.includes('Minha conta'), true, 'link da conta')
  expect(html.includes('Criar conta'), false, 'sem botão de cadastro')
  expect(html.includes('Próximos passos'), false, 'painel ausente')
})
await check('a home anônima mostra a landing, não o painel', async () => {
  const res = await call(WEB)
  expect(res.status, 200, 'status')
  const html = await res.text()
  expect(html.includes('Criar conta'), true, 'botão de cadastro')
  expect(html.includes('Próximos passos'), false, 'painel ausente')
})
await check('/verifications sem sessão manda pro login', async () => {
  const res = await call(`${WEB}/verifications`)
  expect(res.status, 307, 'status')
  expect(res.headers.get('location'), '/login', 'destino')
})

console.log('\npré-requisitos da fila')
await check('/verifications mostra os próximos passos', async () => {
  const res = await call(`${WEB}/verifications`, { auth: true })
  expect(res.status, 200, 'status')
  const html = await res.text()
  expect(html.includes('Próximos passos'), true, 'painel em /verifications')
})
await check('queue-prerequisites devolve os quatro booleanos e a reputação', async () => {
  const res = await call(`${API}/api/accounts/me/queue-prerequisites`, { auth: true })
  expect(res.status, 200, 'status')
  const body = await res.json()
  // discordPresent entrou com o RF-060 (#150, 2026-09-23): conta nova nunca
  // vinculada lê o default da entidade (true) — discordLinked já cobre "não
  // vinculado ainda".
  // characterVerified entrou com a Fase 2.2 (#194, 2026-09-24).
  // reputation entrou com a Fase 2.4 (#208, 2026-09-25).
  expect(
    Object.keys(body).sort().join(','),
    'characterVerified,discordLinked,discordPresent,emailVerified,reputation,reputationBand',
    'campos',
  )
  expect(body.emailVerified, false, 'emailVerified de conta nova')
  expect(body.characterVerified, false, 'characterVerified de conta nova')
})
await check('reenvio de verificação responde 202 sem corpo', async () => {
  const res = await call(`${WEB}/bff/accounts/me/verifications/resends`, {
    method: 'POST',
    auth: true,
  })
  expect(res.status, 202, 'status')
})

console.log('\nvínculo com o Discord')
await check('estado do vínculo começa como não vinculado', async () => {
  const res = await call(`${API}/api/accounts/me/discord-link`, { auth: true })
  expect(res.status, 200, 'status')
  expect((await res.json()).linked, false, 'linked')
})
await check('início do vínculo devolve a URL do Discord com PKCE e escopo identify', async () => {
  const res = await call(`${WEB}/bff/accounts/me/discord-link/attempts`, {
    method: 'POST',
    auth: true,
  })
  if (res.status === 503) {
    // Ambiente sem aplicativo do Discord (o CI é assim): a rota responde
    // 'indisponível' de propósito, e isso é o comportamento certo, não falha.
    return PULADO
  }
  expect(res.status, 201, 'status')
  const url = new URL((await res.json()).authorizationUrl)
  expect(url.origin, 'https://discord.com', 'origem')
  expect(url.searchParams.get('scope'), 'identify', 'escopo')
  expect(url.searchParams.get('code_challenge_method'), 'S256', 'PKCE')
  expect(Boolean(url.searchParams.get('state')), true, 'state')
})
await check('cancelar no Discord volta para a tela com status=denied', async () => {
  const res = await call(`${WEB}/bff/discord/callback?error=access_denied`)
  expect(res.status, 303, 'status')
  expect(res.headers.get('location'), '/account/discord?status=denied', 'destino')
})

console.log('\nsegurança')
await check('CSRF: POST text/plain de outro site é recusado com 403', async () => {
  const res = await fetch(`${WEB}/bff/sessions`, {
    method: 'POST',
    headers: {
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
      'content-type': 'text/plain',
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  expect(res.status, 403, 'status')
})
await check('rota da sessão sem cookie responde 401', async () => {
  expect((await call(`${API}/api/accounts/me/queue-prerequisites`)).status, 401, 'status')
})
await check('bot-events sem assinatura responde 401', async () => {
  const res = await call(`${API}/api/bot-events`, { method: 'POST', body: { id: 'x' } })
  expect(res.status, 401, 'status')
})
await check('resposta com sessão não é cacheável', async () => {
  const res = await call(`${WEB}/verifications`, { auth: true })
  const cache = res.headers.get('cache-control') ?? ''
  expect(/no-store|no-cache/.test(cache), true, `cache-control (${cache})`)
})
await check('rotas antigas responderam 404 depois da renomeação', async () => {
  for (const path of [
    '/api/accounts/discord-links/current',
    '/api/accounts/punishment-status',
    '/api/accounts/queue-prerequisites',
  ]) {
    expect((await call(API + path, { auth: true })).status, 404, `GET ${path}`)
  }
})

const failed = results.filter((r) => r.ok === false)
const puladas = results.filter((r) => r.skipped).length
console.log(
  `\n${results.length - failed.length - puladas}/${results.length - puladas} passaram` +
    (puladas > 0 ? `, ${puladas} pulado(s)` : ''),
)
if (failed.length > 0) {
  console.log('falhas:')
  for (const f of failed) console.log(`  - ${f.name}: ${f.error}`)
  process.exit(1)
}
console.log(`conta criada nesta rodada: ${email}\n`)
