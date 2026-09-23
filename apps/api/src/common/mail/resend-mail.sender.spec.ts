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

  const bodyOf = (fetchMock: jest.Mock): { text: string } => {
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    return JSON.parse(init.body as string) as { text: string }
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
})
