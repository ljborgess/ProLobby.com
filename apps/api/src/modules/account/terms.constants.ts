/**
 * Terms of use versions — RF-026, docs/produto/04-governanca/03-termos.md.
 *
 * Kept in code, not in a table, on purpose: the terms text itself is versioned
 * in the repository and publishing a new version already requires a deploy.
 * A database row would be a second source of truth that can disagree with the
 * text actually shown to people.
 *
 * Versions are ISO dates, so "at least this version" is a plain string
 * comparison — which is also why the format must never change.
 */

/** The version a person accepts when signing up or accepting today. */
export const CURRENT_TERMS_VERSION = '2026-09-14'

/**
 * The most recent version that was a *material* change.
 *
 * An account that accepted anything at or after this version keeps using the
 * platform; one that did not is held at the acceptance screen until it does.
 *
 * Publishing a non-material revision moves only CURRENT_TERMS_VERSION. A
 * material one — enabling billing is the example the dossier gives — moves
 * both, and every existing account is asked again. Which revisions are
 * material is a decision made by whoever publishes, never inferred from a diff.
 */
export const LATEST_MATERIAL_TERMS_VERSION = '2026-09-14'
