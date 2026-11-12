import { IsString, Length } from 'class-validator'

/** A 6-digit TOTP code, or a recovery code `xxxx-xxxx` (#311). */
export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 9)
  code!: string
}

/** The one-time code an admin issues by CLI to let a moderator set up the factor (#311). */
export class TwoFactorEnrollmentDto {
  @IsString()
  @Length(9, 9)
  enrollmentCode!: string
}
