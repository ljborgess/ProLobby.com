import { IsString, Length } from 'class-validator'

export class VerifyEmailDto {
  /** 32 random bytes in base64url — 43 characters, always. */
  @IsString()
  @Length(20, 200)
  token!: string
}
