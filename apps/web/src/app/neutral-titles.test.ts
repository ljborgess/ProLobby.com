import { describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => ({ value: 'es' }), toString: () => '' }),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }))
vi.mock('@/common/api/client', () => ({ apiFetch: vi.fn() }))

import { metadata as moderation } from './moderation/page'
import { metadata as notFound } from './not-found'

/**
 * #296: /moderation is a hidden route (404 to anyone who may not see it), so
 * its tab stays the neutral "ProLobby" whatever the language — a translated
 * title would say what the page is. The 404 says nothing either.
 */
describe('titles that stay neutral on purpose', () => {
  it('keeps /moderation as "ProLobby" even with a Spanish visitor', () => {
    expect(moderation.title).toBe('ProLobby')
  })

  it('keeps the 404 as "ProLobby"', () => {
    expect(notFound.title).toBe('ProLobby')
  })
})
