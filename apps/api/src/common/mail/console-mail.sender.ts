import { Injectable, Logger } from '@nestjs/common'

import { MailSender, type OutgoingEmail } from './mail.types'

/**
 * Writes the email to the log instead of sending it.
 *
 * What runs in development, in tests, and in the internal beta until the
 * domain exists and Resend can be configured (ADR-008, #130).
 *
 * The production guard below is now a second line of defence: MailModule
 * already refuses to build this sender when NODE_ENV is production, and says
 * why. It stays because the reason it exists does not depend on the module —
 * an account that silently never receives its verification link is
 * indistinguishable from a broken sign-up, and anyone constructing this class
 * directly deserves the same refusal.
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
