import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

/**
 * Sign-up payload — RF-019.
 *
 * The global ValidationPipe runs with `forbidNonWhitelisted`, so anything not
 * declared here is *rejected*, not ignored. That is what keeps `role`,
 * `reputation`, `plan` and `state` out of reach of the request body (item 8 of
 * the security checklist): they are absent on purpose, not by oversight.
 */
export class SignUpDto {
  /**
   * Normalised to lowercase here, at the edge, so every downstream check —
   * uniqueness, lookup, comparison — sees the same string.
   *
   * Without this, `Luciano@x.com` and `luciano@x.com` are two valid rows:
   * Postgres compares varchar case-sensitively, and RF-020 ("one email, one
   * account") would break in the most banal way possible. Worse, since RF-070
   * makes the response identical for free and taken addresses, the person
   * would never find out they already had an account.
   */
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string

  /**
   * 12 characters minimum, no composition rules (no "one uppercase, one
   * symbol"): length beats character classes against real guessing, and
   * composition rules push people into `Password1!`, which is in every
   * wordlist. The 128 ceiling exists because argon2 hashes the whole input and
   * a megabyte-long password is a cheap way to burn CPU.
   */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string

  /**
   * ISO date (YYYY-MM-DD). The under-16 rejection happens in the service, not
   * here: "how old is this person" is a business rule with a documented reason
   * (RF-021), not input format.
   */
  @IsDateString()
  birthDate!: string

  /** Free text written by the person — see the note in AccountService. */
  @IsString()
  @Length(8, 200)
  securityQuestion!: string

  /**
   * Trimmed here; case and accent folding happen in the service, next to the
   * comparison that has to match it. Normalising in two different places is
   * how the answer stops matching itself.
   */
  @IsString()
  @Length(2, 200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  securityAnswer!: string

  /**
   * The terms version the person was shown and accepted — RF-026.
   *
   * Required: an account born without a recorded acceptance would have used the
   * platform with no traceable consent, which is what LGPD asks for in
   * practice. Must equal the current version; the service refuses anything
   * else so a stale form cannot record consent to text nobody is showing.
   */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  acceptedTermsVersion!: string
}
