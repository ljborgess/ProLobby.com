import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('apiFetch', () => {
  const originalApiUrl = process.env.API_URL

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))
    vi.resetModules()
  })

  afterEach(() => {
    process.env.API_URL = originalApiUrl
    vi.unstubAllGlobals()
  })

  it('calls the configured base URL, not a hardcoded one', async () => {
    process.env.API_URL = 'http://api.internal:4000'
    const { apiFetch } = await import('./client')

    await apiFetch('/accounts')

    expect(fetch).toHaveBeenCalledWith('http://api.internal:4000/accounts', expect.anything())
  })

  it('falls back to the local API dev server when nothing is configured', async () => {
    delete process.env.API_URL
    const { apiFetch } = await import('./client')

    await apiFetch('/accounts')

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3001/accounts', expect.anything())
  })

  it('forwards the real client IP as CF-Connecting-IP when given one — issue #99', async () => {
    const { apiFetch } = await import('./client')

    await apiFetch('/accounts', { forwardedIp: '203.0.113.7' })

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = init!.headers as Headers
    expect(headers.get('CF-Connecting-IP')).toBe('203.0.113.7')
  })

  it('sends no CF-Connecting-IP at all when none is given — local dev, no Cloudflare in front', async () => {
    const { apiFetch } = await import('./client')

    await apiFetch('/accounts')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = init!.headers as Headers
    expect(headers.has('CF-Connecting-IP')).toBe(false)
  })
})
