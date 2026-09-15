import { IsString, Length, MaxLength, MinLength } from 'class-validator'

export class ConfirmPasswordResetDto {
  /** 32 random bytes in base64url — 43 characters, always. */
  @IsString()
  @Length(20, 200)
  token!: string

  /** Same rules as SignUpDto.password, for the same reasons. */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string
}
