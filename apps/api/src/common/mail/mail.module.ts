import { Global, Module } from '@nestjs/common'

import { ConsoleMailSender } from './console-mail.sender'
import { MailSender } from './mail.types'

/**
 * Delivery of transactional email.
 *
 * Global because more than one module sends (account today, moderation later),
 * and none of them should care who delivers.
 *
 * The provider itself is still an open decision with LGPD weight — an email
 * address is personal data and every serious provider is abroad. Until it is
 * made, ConsoleMailSender logs instead of sending, and refuses to run in
 * production. Swapping it changes this file and nothing else.
 */
@Global()
@Module({
  providers: [{ provide: MailSender, useClass: ConsoleMailSender }],
  exports: [MailSender],
})
export class MailModule {}
