/**
 * Platform roles — see docs/requisitos/01-transversais.md ("Papéis dentro da
 * plataforma").
 *
 * "Visitante" (visitor) is deliberately absent: it means "no account", not a
 * persisted value. With no RLS in the stack (ADR-005), this field is the
 * *only* foundation of the authorization layer, which lives entirely in API
 * code.
 */
export enum AccountRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

/**
 * Account states — see docs/requisitos/02-estados.md ("Estados da conta e do
 * personagem").
 *
 * SUSPENDED and BANNED are different things: a suspension ends (7 days) and
 * restores reputation to 45 (RF-074); a ban is terminal and survives account
 * deletion through BlockedIdentity (RF-079).
 */
export enum AccountState {
  UNVERIFIED = 'unverified',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted',
}

/**
 * Support plan — see docs/negocio/03-sustentabilidade.md.
 *
 * Born with no billing logic at all: the MVP is free and PIX confirmation is
 * manual, in the moderation panel (phase 5). The column exists now because
 * adding a column is cheap, while migrating accounts that already pay is not.
 */
export enum AccountPlan {
  NONE = 'none',
  FOUNDER = 'founder',
  SUPPORTER = 'supporter',
}
