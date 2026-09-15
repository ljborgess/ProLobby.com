import { Transform } from 'class-transformer'
import { IsEmail, MaxLength } from 'class-validator'

export class RequestPasswordResetDto {
  /** Normalised at the edge, like sign-up — see SignUpDto.email. */
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string
}
