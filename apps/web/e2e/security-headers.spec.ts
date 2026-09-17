import { test, expect } from '@playwright/test'

// Item 18 of the security checklist — proves the headers next.config.ts
// declares are actually on the response, not just in the config file.
test('sends the baseline security headers', async ({ request }) => {
  const response = await request.get('/')
  const headers = response.headers()

  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  // `next start` (this suite's webServer, see playwright.config.ts) always
  // runs with NODE_ENV=production, so the production-only HSTS header is
  // expected here too — a dev-only `next dev` run would not have it.
  expect(headers['strict-transport-security']).toContain('max-age=63072000')
})
