import { Transform } from 'class-transformer'
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * Opens an account recovery case — RF-025.
 *
 * The evidence screenshot travels as multipart, not JSON, so it is not a
 * field here: the controller pulls it off the request with
 * `@UploadedFile()`.
 */
export class RequestAccountRecoveryDto {
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string

  // No format check beyond length: it is compared against a hash, not parsed,
  // and the sign-up side (SignUpDto) is the one place a shape rule belongs.
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  securityAnswer!: string
}
