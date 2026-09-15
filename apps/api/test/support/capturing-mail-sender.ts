import {
  MailSender,
  type OutgoingEmail,
  type TransactionalEmail,
} from '../../src/common/mail/mail.types'

/** Captures what would have been sent, and can be told to fail or to hang. */
export class CapturingMailSender extends MailSender {
  readonly sent: OutgoingEmail[] = []
  failNext = false
  /** Never resolves — a provider that stopped answering. */
  hang = false

  async send(email: OutgoingEmail): Promise<void> {
    if (this.hang) {
      return new Promise(() => undefined)
    }
    if (this.failNext) {
      this.failNext = false
      throw new Error('provider unavailable')
    }
    this.sent.push(email)
  }

  lastOf(kind: TransactionalEmail): OutgoingEmail | undefined {
    return [...this.sent].reverse().find((email) => email.kind === kind)
  }

  sentTo(address: string, kind: TransactionalEmail): OutgoingEmail[] {
    return this.sent.filter((email) => email.to === address && email.kind === kind)
  }

  /**
   * Waits for an email to one address — delivery is fire-and-forget by design,
   * so the request returns before the provider is called.
   *
   * The address is required, not optional: an email fired by an earlier test
   * can land after this one already cleared the box, and "the last email of
   * this kind" would then be somebody else's.
   */
  async waitFor(kind: TransactionalEmail, to: string, timeoutMs = 2000): Promise<OutgoingEmail> {
    const deadline = Date.now() + timeoutMs

    for (;;) {
      const found = this.sentTo(to, kind).at(-1)
      if (found) {
        return found
      }
      if (Date.now() > deadline) {
        throw new Error(`no ${kind} email to ${to} within ${timeoutMs} ms`)
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  clear(): void {
    this.sent.length = 0
    this.failNext = false
    this.hang = false
  }
}
