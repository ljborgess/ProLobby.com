import { Global, Module } from '@nestjs/common'

import { ConsoleMailSender } from './console-mail.sender'
import { MailSender } from './mail.types'
import { ResendMailSender } from './resend-mail.sender'

/**
 * Delivery of transactional email.
 *
 * Global because more than one module sends (account today, moderation later),
 * and none of them should care who delivers.
 *
 * Which sender is chosen by configuration, at boot:
 *
 * - `RESEND_API_KEY` set → Resend (ADR-008), the real provider.
 * - otherwise, outside production → the console sender, which logs the token
 *   so the flow can be exercised without a domain.
 * - otherwise, in production → **the boot fails**, loudly and with a reason.
 *
 * That last branch is the point. An account that never receives its
 * verification link is indistinguishable from a broken sign-up, so a
 * production process must not be allowed to start believing it can send when
 * it cannot. Before this, the console sender threw from its own constructor
 * and the failure surfaced as an opaque dependency-injection error.
 *
 * Resend needs SPF and DKIM on a domain the project controls, so this stays
 * unconfigurable until the `.com.br` exists (#130) — which is exactly why the
 * failure has to name the reason instead of a stack trace.
 */
@Global()
@Module({
  providers: [
    {
      provide: MailSender,
      useFactory: (): MailSender => {
        const apiKey = process.env.RESEND_API_KEY

        if (apiKey) {
          const from = process.env.MAIL_FROM

          if (!from) {
            throw new Error(
              'MAIL_FROM is required alongside RESEND_API_KEY — Resend refuses a message with no verified sender address (ADR-008)',
            )
          }

          return new ResendMailSender(apiKey, from)
        }

        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            'RESEND_API_KEY is required in production — without it no verification or password-reset email is delivered, and a sign-up that never arrives looks exactly like a broken one (ADR-008)',
          )
        }

        return new ConsoleMailSender()
      },
    },
  ],
  exports: [MailSender],
})
export class MailModule {}
