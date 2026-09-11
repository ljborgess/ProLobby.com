import { Transform } from 'class-transformer'
import { IsEmail, IsString, MaxLength } from 'class-validator'

/**
 * Sign-in payload — RF-022.
 *
 * The password has no length rules here on purpose: the minimum belongs to
 * sign-up, and enforcing it on sign-in would tell an attacker that a short
 * guess is not worth trying. Only a ceiling, so a huge string cannot burn CPU
 * in argon2.
 */
export class SignInDto {
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string

  @IsString()
  @MaxLength(128)
  password!: string
}
