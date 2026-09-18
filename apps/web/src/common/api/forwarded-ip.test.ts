import { afterEach, describe, expect, it, vi } from 'vitest'

import { forwardedIpFrom } from './forwarded-ip'

const requestWith = (headers: Record<string, string>) =>
  new Request('http://localhost/bff/sessions', { headers })

describe('forwardedIpFrom', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('forwards the header in production, where Cloudflare has overwritten it', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(forwardedIpFrom(requestWith({ 'cf-connecting-ip': '198.51.100.1' }))).toBe(
      '198.51.100.1',
    )
  })

  /**
   * The finding this test exists for. With nothing in front of this server the
   * header is caller-controlled, and the API trusts what arrives from here —
   * so forwarding it outside production would let a request choose which
   * rate-limit bucket counts it.
   */
  it('ignores the header outside production, where the caller controls it', () => {
    vi.stubEnv('NODE_ENV', 'development')

    expect(forwardedIpFrom(requestWith({ 'cf-connecting-ip': '198.51.100.1' }))).toBeUndefined()
  })

  it('is undefined when the header is absent', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(forwardedIpFrom(requestWith({}))).toBeUndefined()
  })
})
