import { test, expect } from '@playwright/test'

/**
 * These two guarantees are only observable against the *served* build, which
 * is why they live here and not in a JSDOM unit test.
 *
 * A component test renders with React on the client, where the attribute is
 * always written and hydration always happens. Both defects below were
 * invisible from there and plainly visible from a browser: the CSP refused
 * the inline scripts and the page never hydrated, and a form served without
 * `method` submitted natively as GET.
 */
test.describe('CSP does not break the page (item 18)', () => {
  for (const path of ['/', '/login', '/sign-up']) {
    test(`${path} loads with no CSP violation and no page error`, async ({ page }) => {
      const problems: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(message.text())
      })
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // A static `script-src 'self'` used to blow up here twice per load —
      // the App Router's inline RSC payload scripts — and take hydration down
      // with it (React error #412). A form that never hydrates submits
      // natively, which is how a password reached the query string.
      expect(problems).toEqual([])
    })
  }

  test('the policy carries a nonce, not a blanket unsafe-inline', async ({ request }) => {
    const csp = (await request.get('/login')).headers()['content-security-policy'] ?? ''

    expect(csp).toMatch(/script-src[^;]*'nonce-/)
    expect(csp).not.toContain("script-src 'self';")
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
  })

  test('a fresh nonce per response, never a reused one', async ({ request }) => {
    const nonceOf = async () =>
      /('nonce-[^']+')/.exec(
        (await request.get('/login')).headers()['content-security-policy'] ?? '',
      )?.[1]

    expect(await nonceOf()).not.toBe(await nonceOf())
  })
})

test.describe('credentials never reach the URL (item 15)', () => {
  for (const path of ['/login', '/sign-up']) {
    test(`${path} is served with method="post"`, async ({ request }) => {
      const html = await (await request.get(path)).text()
      const form = /<form[^>]*>/.exec(html)?.[0] ?? ''

      expect(form).not.toBe('')
      // A form with no method is a GET form, and a GET submit serialises
      // every field into the query string — password included.
      expect(form).toMatch(/method="post"/i)
    })
  }

  test('a native submit, with JavaScript disabled, does not put the password in the URL', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/login')
    await page.fill('input[type="email"]', 'someone@test.local')
    await page.fill('input[type="password"]', 'a-password-nobody-should-see')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('domcontentloaded')

    expect(page.url()).not.toContain('a-password-nobody-should-see')
    expect(page.url()).not.toContain('password=')

    await context.close()
  })
})
