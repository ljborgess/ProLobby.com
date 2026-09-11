import { Injectable, Logger } from '@nestjs/common'

import { MailSender, type OutgoingEmail } from './mail.types'

/**
 * Writes the email to the log instead of sending it.
 *
 * The default until a provider is wired up, and the only sender used in tests.
 * Refuses to run in production: an account that silently never receives its
 * verification link is indistinguishable from a broken sign-up, and this class
 * would make that the default behaviour.
 */
@Injectable()
export class ConsoleMailSender extends MailSender {
  private readonly logger = new Logger(ConsoleMailSender.name)

  constructor() {
    super()

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ConsoleMailSender must never run in production — no email would be delivered',
      )
    }
  }

  async send(email: OutgoingEmail): Promise<void> {
    // The token is printed on purpose: this is how the flow is exercised
    // locally and in the internal beta, before a provider exists.
    this.logger.log(`[${email.kind}] to ${email.to} — ${JSON.stringify(email.data)}`)
  }
}
