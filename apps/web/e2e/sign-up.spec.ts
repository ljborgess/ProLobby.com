import { test, expect } from '@playwright/test'

test('sign-up page renders the form with labelled fields', async ({ page }) => {
  await page.goto('/sign-up')

  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible()
})

test('login page renders the form with labelled fields', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
})

test.describe('mobile viewport', () => {
  // A phone width, not a whole device profile: swapping browser engine/UA
  // per describe block forces a new worker, which Playwright refuses inside
  // a `describe` (it has to be a top-level project). The viewport alone is
  // what the layout actually needs to prove itself against.
  test.use({ viewport: { width: 390, height: 844 } })

  // Item 5 of RNF-015 (touch area) plus the issue's own mobile-first
  // requirement: the submit button has to be reachable without the page
  // scrolling sideways, which is the failure mode a fixed-width layout
  // produces on a phone.
  test('sign-up form has no horizontal overflow and the submit button is reachable', async ({
    page,
  }) => {
    await page.goto('/sign-up')

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)

    await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible()
  })
})
