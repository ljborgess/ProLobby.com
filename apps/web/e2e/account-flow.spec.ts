import { test, expect } from '@playwright/test'

/**
 * Browser-side rules that no other suite sees.
 *
 * These run against `next start` alone, with **no API behind it** (see
 * playwright.config.ts). So everything here must hold without a backend: client
 * validation, what an anonymous visitor gets, the redirect of a page that needs
 * a session, and the cross-site guard, which answers inside the `/bff` route
 * before it ever calls the API.
 *
 * Anything that needs a session or real data is covered by the API's e2e suite
 * and by `pnpm smoke` against a running stack.
 */

test.describe('visitante', () => {
  test('a home oferece criar conta e entrar, e não mostra o painel da conta', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByText('Próximos passos')).toHaveCount(0)
  })

  test('a tela do Discord manda pro login quando não há sessão', async ({ page }) => {
    await page.goto('/account/discord')

    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('cadastro', () => {
  test('exige 8 caracteres na pergunta de segurança antes de enviar', async ({ page }) => {
    await page.goto('/sign-up')

    await expect(page.getByText(/Mínimo de 8 caracteres/)).toBeVisible()

    await page.getByLabel('E-mail').fill('jogador@exemplo.com')
    await page.getByLabel('Senha').fill('uma-senha-bem-longa')
    await page.getByLabel('Data de nascimento').fill('2004-06-26')
    await page.getByLabel('Pergunta de segurança').fill('Babi')
    await page.getByLabel('Resposta').fill('Sao Paulo')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('A pergunta precisa de pelo menos 8 caracteres.')).toBeVisible()
  })
})

test.describe('proxies /bff', () => {
  /**
   * The login CSRF found in the audit of 2026-09-21: a form on any site could
   * post `text/plain` whose body was valid JSON, and the proxy forwarded it as
   * JSON. The refusal happens before the API is called, so it is provable here.
   */
  test('recusam um POST de outro site com 403', async ({ request }) => {
    const response = await request.post('/bff/sessions', {
      headers: {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
        'content-type': 'text/plain',
      },
      data: '{"email":"a@b.com","password":"a=long-enough-password"}',
    })

    expect(response.status()).toBe(403)
  })

  test('recusam corpo que não seja JSON, mesmo sem cabeçalho do navegador', async ({ request }) => {
    const response = await request.post('/bff/accounts', {
      headers: { 'content-type': 'text/plain' },
      data: '{"email":"a@b.com"}',
    })

    expect(response.status()).toBe(403)
  })
})

test.describe('callback do Discord', () => {
  test('cancelar no Discord volta pra tela com o motivo, sem chamar a API', async ({ request }) => {
    const response = await request.get('/bff/discord/callback?error=access_denied', {
      maxRedirects: 0,
    })

    expect(response.status()).toBe(303)
    expect(response.headers()['location']).toBe('/account/discord?status=denied')
    // O `code` que chega na URL não vaza pra terceiros: a política global manda
    // só a origem em requisição cross-origin. Verificado aqui, na resposta real,
    // porque um header posto no handler é sobrescrito pelo next.config.ts.
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })
})
