import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderWithLocale } from '@/test-utils'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

/**
 * A form with no `method` submits with GET, and a GET submit puts every field
 * in the query string: `/login?email=...&password=...`. That happens on a
 * native submit — before React hydrates, or whenever the bundle fails to load
 * — and the password then lands in the address bar, in browser history, in the
 * `Referer` sent to third parties, in server access logs and, in production,
 * in Cloudflare's logs.
 *
 * Nothing in the JavaScript path can prevent it, because the JavaScript is
 * exactly what is missing when it happens. Only the markup can.
 */
describe('credentials never reach the URL', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it.each([
    ['sign-in', <SignInForm key="in" />],
    ['sign-up', <SignUpForm key="up" />],
  ])('%s posts instead of getting, so a native submit cannot leak fields', (_name, element) => {
    const { container } = renderWithLocale(element)
    const form = container.querySelector('form')

    expect(form).not.toBeNull()
    expect(form?.getAttribute('method')).toBe('post')
  })

  it.each([
    ['sign-in', <SignInForm key="in" />],
    ['sign-up', <SignUpForm key="up" />],
  ])('%s keeps the password field out of any GET-able shape', (_name, element) => {
    const { container } = renderWithLocale(element)

    const password = container.querySelector('input[type="password"]')
    expect(password).not.toBeNull()
    // Belt and braces: even if someone later drops `method`, an explicit
    // `formMethod` on the submit button would override it back to GET.
    expect(container.querySelector('[formmethod="get"]')).toBeNull()
  })
})
