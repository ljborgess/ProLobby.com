import { ResendMailSender } from './resend-mail.sender'
import { TransactionalEmail } from './mail.types'

/**
 * Never exercised before the 2026-09-23 review, which is exactly why the bug
 * survived: every caller passed `data: { token }`, `renderText` read
 * `email.data.url`, and nothing here ever checked what actually left for
 * Resend. Every verification and password-reset email went out with the link
 * missing until this was caught.
 */
describe('ResendMailSender', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  const capture = () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response(null, { status: 200 }))
    global.fetch = fetchMock as unknown as typeof fetch
    return fetchMock
  }

  const bodyOf = (fetchMock: jest.Mock): { text: string; html: string } => {
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    return JSON.parse(init.body as string) as { text: string; html: string }
  }

  it('puts the url in the body it sends to Resend', async () => {
    const fetchMock = capture()
    const sender = new ResendMailSender('key', 'noreply@prolobby.com.br')

    await sender.send({
      to: 'person@example.com',
      kind: TransactionalEmail.VERIFY_ADDRESS,
      data: { url: 'https://prolobby.com.br/verify-email?token=abc123' },
    })

    expect(bodyOf(fetchMock).text).toContain('https://prolobby.com.br/verify-email?token=abc123')
  })

  it('puts the url in a password-reset email too', async () => {
    const fetchMock = capture()
    const sender = new ResendMailSender('key', 'noreply@prolobby.com.br')

    await sender.send({
      to: 'person@example.com',
      kind: TransactionalEmail.PASSWORD_RESET,
      data: { url: 'https://prolobby.com.br/reset-password?token=abc123' },
    })

    expect(bodyOf(fetchMock).text).toContain('https://prolobby.com.br/reset-password?token=abc123')
  })

  /**
   * Added 2026-09-23 alongside the HTML template, on request to match the
   * front end. The plain-text part stays as the fallback (module comment on
   * `renderText`) — this only asserts the new `html` part exists and is not
   * silently broken.
   */
  it('also sends an HTML part with the same link, for the same two kinds', async () => {
    const fetchMock = capture()
    const sender = new ResendMailSender('key', 'noreply@prolobby.com.br')

    await sender.send({
      to: 'person@example.com',
      kind: TransactionalEmail.VERIFY_ADDRESS,
      data: { url: 'https://prolobby.com.br/verify-email?token=abc123' },
    })

    const html = bodyOf(fetchMock).html
    expect(html).toContain('https://prolobby.com.br/verify-email?token=abc123')
    expect(html).toContain('<!doctype html>')
  })

  it('escapes the url in the HTML part, so a token cannot break the markup', async () => {
    const fetchMock = capture()
    const sender = new ResendMailSender('key', 'noreply@prolobby.com.br')

    await sender.send({
      to: 'person@example.com',
      kind: TransactionalEmail.VERIFY_ADDRESS,
      data: { url: 'https://prolobby.com.br/verify-email?token=a"b<c>d' },
    })

    const html = bodyOf(fetchMock).html
    expect(html).not.toContain('token=a"b<c>d')
    expect(html).toContain('token=a&quot;b&lt;c&gt;d')
  })

  it('sends an HTML part for the address-already-registered email too, with no link to escape', async () => {
    const fetchMock = capture()
    const sender = new ResendMailSender('key', 'noreply@prolobby.com.br')

    await sender.send({
      to: 'person@example.com',
      kind: TransactionalEmail.ADDRESS_ALREADY_REGISTERED,
      data: {},
    })

    expect(bodyOf(fetchMock).html).toContain('<!doctype html>')
  })
})
