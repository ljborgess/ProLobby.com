import { Logger } from '@nestjs/common'

import { CfConnectingIpThrottlerGuard } from './cf-connecting-ip-throttler.guard'

/**
 * `getTracker` is protected, and it is the whole behaviour worth testing —
 * which bucket a request is counted in. Reached through a subclass rather than
 * a cast, so the signature stays checked.
 */
class TestableGuard extends CfConnectingIpThrottlerGuard {
  track(req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.getTracker(req)
  }
}

const guard = () =>
  new TestableGuard(
    // The base class needs its collaborators only for canActivate(), which
    // this spec never calls.
    {} as never,
    {} as never,
    {} as never,
  )

const request = (
  headers: Record<string, string | string[] | undefined> = {},
  ip = '203.0.113.7',
) => ({
  ip,
  headers,
})

describe('CfConnectingIpThrottlerGuard', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.restoreAllMocks()
  })

  describe('outside production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('tracks by the socket address', async () => {
      await expect(guard().track(request())).resolves.toBe('203.0.113.7')
    })

    it('ignores the header, because anyone can send it with no Cloudflare in front', async () => {
      await expect(guard().track(request({ 'cf-connecting-ip': '198.51.100.1' }))).resolves.toBe(
        '203.0.113.7',
      )
    })
  })

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('tracks by CF-Connecting-IP, which Cloudflare overwrites', async () => {
      await expect(guard().track(request({ 'cf-connecting-ip': '198.51.100.1' }))).resolves.toBe(
        '198.51.100.1',
      )
    })

    /**
     * The finding this spec exists for: the fallback is not a smaller
     * precision, it is one bucket for everybody. It must never be silent.
     */
    it('logs an error when the header is missing, because the limit becomes global', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

      await expect(guard().track(request())).resolves.toBe('203.0.113.7')

      expect(error).toHaveBeenCalledTimes(1)
      expect(error.mock.calls[0]?.[0]).toContain('GLOBAL')
    })

    it('does not flood the log when every request lacks the header', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
      const subject = guard()

      await subject.track(request())
      await subject.track(request())
      await subject.track(request())

      expect(error).toHaveBeenCalledTimes(1)
    })

    it('treats an empty header as missing', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

      await expect(guard().track(request({ 'cf-connecting-ip': '' }))).resolves.toBe('203.0.113.7')

      expect(error).toHaveBeenCalledTimes(1)
    })

    it('never returns an empty tracker, which would merge unrelated callers', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

      // Built inline, not through `request()`: passing `undefined` there would
      // hit the default parameter and silently restore an address.
      await expect(guard().track({ headers: {} })).resolves.toBe('unknown')
    })
  })
})
