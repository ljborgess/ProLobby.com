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
        html: renderHtml(email),
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
 * Plain text, kept as the `text` part alongside the HTML one (2026-09-23):
 * every mail client that refuses or hides HTML — and every accessibility
 * tool that reads it — falls back to this. Every message here is one
 * sentence and one link, on purpose: the HTML version dresses this exact
 * content, it does not replace it.
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

/**
 * The design system's own tokens (`apps/web/src/app/globals.css`), copied
 * rather than imported: email HTML has to be self-contained inline CSS in one
 * string, and a build-time import across `apps/api`/`apps/web` would need a
 * shared package for four colours. If the palette moves, move it here too.
 */
const COLOR_BG = '#070b14'
const COLOR_SURFACE = '#0c1322'
const COLOR_SURFACE_LINE = 'rgba(255,255,255,0.08)'
const COLOR_TEXT = '#e8edf7'
const COLOR_TEXT_SOFT = '#9aa8bf'
const COLOR_TEXT_WEAK = '#6b7a94'
const COLOR_ACCENT = '#22c55e'
const COLOR_ACCENT_STRONG = '#15803d'
const COLOR_ACCENT_DIM = 'rgba(34,197,94,0.35)'
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
const MONO_STACK = "'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace"

/**
 * HTML wrapper, added 2026-09-23 on request to match the front end — then
 * pushed further ("mais futurístico") the same day.
 *
 * Table layout and inline styles throughout, not the design system's own CSS
 * classes: an email is rendered by whatever the recipient's client supports
 * (Outlook's engine is Word, not a browser), and inline `style` on `<table>`/
 * `<td>` is the one subset that survives everywhere. The visual touches
 * (gradient rule, glowing button, scanline texture) are all things that
 * degrade to something plain and still readable where a client strips them —
 * never something structural. No external stylesheet, no `<style>` block
 * relied on for anything that matters, no image required to read the message
 * — the wordmark is text, not a logo file.
 */
function renderHtml(email: OutgoingEmail): string {
  const body = htmlBody(email)

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(SUBJECT[email.kind])}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLOR_BG}; font-family:${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BG};">
      <tr>
        <td align="center" style="padding:48px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td style="padding-bottom:28px;" align="center">
                <span style="font-size:19px; font-weight:700; color:${COLOR_TEXT}; letter-spacing:-0.02em;">Pro<span style="color:${COLOR_ACCENT};">Lobby</span></span>
              </td>
            </tr>
            <tr>
              <td style="border-radius:2px; background:linear-gradient(90deg, transparent, ${COLOR_ACCENT}, transparent);">
                <div style="height:2px; line-height:2px; font-size:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="background-color:${COLOR_SURFACE}; background-image:repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px); border:1px solid ${COLOR_SURFACE_LINE}; border-top:none; border-radius:0 0 12px 12px; padding:36px 32px;">
                <p style="margin:0 0 18px; font-family:${MONO_STACK}; font-size:11px; letter-spacing:0.16em; color:${COLOR_ACCENT}; text-transform:uppercase;">${escapeHtml(eyebrow(email.kind))}</p>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;">
                <p style="margin:0; font-size:12px; line-height:1.6; color:${COLOR_TEXT_WEAK};">
                  Você recebeu este e-mail porque este endereço foi usado no ProLobby. Se não foi você, pode ignorar — nada acontece sem abrir o link.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/** The small tracked label above the heading — a HUD readout, not a subject line repeat. */
function eyebrow(kind: TransactionalEmail): string {
  switch (kind) {
    case TransactionalEmail.VERIFY_ADDRESS:
      return 'Verificação de conta'
    case TransactionalEmail.PASSWORD_RESET:
      return 'Redefinição de senha'
    case TransactionalEmail.ADDRESS_ALREADY_REGISTERED:
      return 'Aviso de segurança'
  }
}

function htmlBody(email: OutgoingEmail): string {
  switch (email.kind) {
    case TransactionalEmail.VERIFY_ADDRESS:
      return `
                <h1 style="margin:0 0 12px; font-size:21px; line-height:1.35; color:${COLOR_TEXT}; font-weight:700;">Confirme seu e-mail</h1>
                <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${COLOR_TEXT_SOFT};">Clique no botão abaixo para ativar sua conta e liberar a verificação de personagem e o vínculo com o Discord.</p>
                ${button('Confirmar e-mail', email.data.url ?? '')}
                ${fallbackLink(email.data.url ?? '')}
                ${divider()}
                <p style="margin:0; font-size:13px; line-height:1.6; color:${COLOR_TEXT_WEAK};">Se não foi você, ignore esta mensagem.</p>`
    case TransactionalEmail.PASSWORD_RESET:
      return `
                <h1 style="margin:0 0 12px; font-size:21px; line-height:1.35; color:${COLOR_TEXT}; font-weight:700;">Redefinir sua senha</h1>
                <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${COLOR_TEXT_SOFT};">Clique no botão abaixo para escolher uma senha nova. O link expira em <span style="color:${COLOR_TEXT};">30 minutos</span>.</p>
                ${button('Redefinir senha', email.data.url ?? '')}
                ${fallbackLink(email.data.url ?? '')}
                ${divider()}
                <p style="margin:0; font-size:13px; line-height:1.6; color:${COLOR_TEXT_WEAK};">Se não foi você, ignore esta mensagem: nada muda sem abrir o link.</p>`
    case TransactionalEmail.ADDRESS_ALREADY_REGISTERED:
      return `
                <h1 style="margin:0 0 12px; font-size:21px; line-height:1.35; color:${COLOR_TEXT}; font-weight:700;">Alguém tentou criar conta com seu e-mail</h1>
                <p style="margin:0 0 12px; font-size:14px; line-height:1.6; color:${COLOR_TEXT_SOFT};">Se foi você, é só entrar normalmente — ou usar "esqueci minha senha" caso não lembre a senha.</p>
                ${divider()}
                <p style="margin:0; font-size:13px; line-height:1.6; color:${COLOR_TEXT_WEAK};">Se não foi você, não há nada a fazer: nenhuma conta nova foi criada.</p>`
  }
}

/** A thin dashed rule in the accent, standing in for the site's own section dividers — cheap in table-safe CSS, degrades to nothing if `border-style: dashed` is stripped. */
function divider(): string {
  return `<div style="margin:22px 0; border-top:1px dashed ${COLOR_SURFACE_LINE}; font-size:0; line-height:0;">&nbsp;</div>`
}

/**
 * The accent CTA, with a glow (`box-shadow`) most modern clients render (Apple
 * Mail, Gmail's web and app views, Outlook.com) and the rest simply show
 * without — never the only way the button reads as clickable. `bgcolor`
 * alongside the inline style: Outlook desktop's Word engine ignores
 * `background` via CSS on some versions and reads the attribute instead.
 */
function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td bgcolor="${COLOR_ACCENT}" style="background-color:${COLOR_ACCENT}; border-radius:8px; box-shadow:0 0 0 1px ${COLOR_ACCENT_DIM}, 0 4px 20px ${COLOR_ACCENT_DIM};">
                      <a href="${escapeHtml(url)}" style="display:inline-block; padding:13px 28px; font-size:14px; font-weight:700; letter-spacing:0.02em; color:${COLOR_ACCENT_STRONG}; text-decoration:none;">${escapeHtml(label)} &rarr;</a>
                    </td>
                  </tr>
                </table>`
}

/** The button is a `<table>`, which some clients strip entirely — the plain URL is what survives when it does. */
function fallbackLink(url: string): string {
  return `<p style="margin:16px 0 0; font-family:${MONO_STACK}; font-size:11px; line-height:1.6; color:${COLOR_TEXT_WEAK}; word-break:break-all;">ou copie o link: <a href="${escapeHtml(url)}" style="color:${COLOR_ACCENT};">${escapeHtml(url)}</a></p>`
}

/** Every value interpolated here is a URL we generated ourselves or fixed copy — never account input — but escaping costs nothing and a future caller may not know that. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
