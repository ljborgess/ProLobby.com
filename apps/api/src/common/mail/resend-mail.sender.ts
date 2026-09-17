import { Injectable, Logger } from '@nestjs/common'

import { MailSender, TransactionalEmail, type OutgoingEmail } from './mail.types'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Subjects live here, not in the caller: the caller knows the kind, not the wording. */
const SUBJECT: Record<TransactionalEmail, string> = {
  [TransactionalEmail.VERIFY_ADDRESS]: 'Confirme seu e-mail — ProLobby',
  [TransactionalEmail.ADDRESS_ALREADY_REGISTERED]: 'Alguém tentou criar conta com seu e-mail',
  [TransactionalEmail.PASSWORD_RESET]: 'Redefinir sua senha — ProLobby',
}

/**
 * Delivery through Resend — ADR-008.
 *
 * Plain `fetch` against the HTTP API rather than the `resend` SDK: one POST
 * with a bearer token is the whole integration, and a dependency that ships
 * its own retry and error types would be more code to understand than the
 * request it replaces.
 *
 * Note what this class does *not* do: retry. `deliverWithoutThrowing` already
 * decided that a delivery failure must never fail the operation that caused
 * it, and a retry loop inside a request handler would hold a connection open
 * on the caller's time. Re-sending is a person clicking "resend", which the
 * verification flow already offers.
 */
@Injectable()
export class ResendMailSender extends MailSender {
  private readonly logger = new Logger(ResendMailSender.name)

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {
    super()
  }

  async send(email: OutgoingEmail): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: email.to,
        subject: SUBJECT[email.kind],
        text: renderText(email),
      }),
    })

    if (!response.ok) {
      // The body carries Resend's reason (bad key, unverified domain, rate
      // limit) and never the token, which is in the payload we sent, not in
      // the answer we got.
      const reason = await response.text().catch(() => '')
      throw new Error(`resend refused ${email.kind}: HTTP ${response.status} ${reason}`)
    }
  }
}

/**
 * Plain text, deliberately.
 *
 * HTML email is a template system, an inliner and a rendering matrix; none of
 * that is the account flow. Every message here is one sentence and one link.
 */
function renderText(email: OutgoingEmail): string {
  switch (email.kind) {
    case TransactionalEmail.VERIFY_ADDRESS:
      return `Confirme seu e-mail para ativar a conta:\n\n${email.data.url ?? ''}\n\nSe não foi você, ignore esta mensagem.`
    case TransactionalEmail.PASSWORD_RESET:
      return `Para redefinir sua senha, abra o link abaixo. Ele expira em 30 minutos.\n\n${email.data.url ?? ''}\n\nSe não foi você, ignore esta mensagem: nada muda sem abrir o link.`
    case TransactionalEmail.ADDRESS_ALREADY_REGISTERED:
      // RF-070: the person who tried to sign up learns nothing. This message
      // goes to the owner of the address, who is the only one entitled to
      // know the account exists.
      return `Alguém tentou criar uma conta no ProLobby com este e-mail, que já tem conta.\n\nSe foi você, entre normalmente — ou use "esqueci minha senha".\nSe não foi, não há nada a fazer: nenhuma conta nova foi criada.`
  }
}
