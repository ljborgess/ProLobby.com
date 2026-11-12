import { IsString, Length } from 'class-validator'

/** A 6-digit TOTP code, or a recovery code `xxxx-xxxx` (#311). */
export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 9)
  code!: string
}
