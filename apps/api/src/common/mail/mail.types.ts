/**
 * Transactional email only — docs/produto/05-produto/01-onboarding.md.
 *
 * Email is for the *account*, never for the product: sign-up verification,
 * password reset, and the waiting-list notice of RF-078. Queue, lobby, result
 * and punishment notices go through Discord and in-app, and nothing here may
 * grow into a marketing channel by accident.
 */
export enum TransactionalEmail {
  VERIFY_ADDRESS = 'verify_address',
  /** Sent to the owner when someone tries to sign up with an address that is already taken (RF-020). */
  ADDRESS_ALREADY_REGISTERED = 'address_already_registered',
  PASSWORD_RESET = 'password_reset',
}

export interface OutgoingEmail {
  to: string
  kind: TransactionalEmail
  /** Values the template needs. Never an entity, never anything not required to render. */
  data: Record<string, string>
}

/**
 * Whoever actually delivers the message.
 *
 * An interface, not a concrete client, because the provider is a decision with
 * LGPD weight (an email address is personal data, and every serious provider is
 * abroad) — and because the beta can run with delivery that only logs. Swapping
 * the implementation must not touch a single caller.
 */
export abstract class MailSender {
  abstract send(email: OutgoingEmail): Promise<void>
}
