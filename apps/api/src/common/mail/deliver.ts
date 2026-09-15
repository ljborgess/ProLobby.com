import type { Logger } from '@nestjs/common'

import type { MailSender, OutgoingEmail } from './mail.types'

/**
 * Sends, and never lets a delivery failure escape.
 *
 * Every caller is in the middle of something that already succeeded — an
 * account was created, a reset link was issued. Failing the whole operation
 * because an email provider timed out trades a recoverable problem (no email
 * yet) for an unrecoverable one (half-finished state).
 */
export async function deliverWithoutThrowing(
  sender: MailSender,
  email: OutgoingEmail,
  logger: Logger,
): Promise<void> {
  try {
    await sender.send(email)
  } catch (error) {
    // Never log the payload: it carries the token.
    logger.error(
      `failed to deliver ${email.kind}`,
      error instanceof Error ? error.stack : undefined,
    )
  }
}
