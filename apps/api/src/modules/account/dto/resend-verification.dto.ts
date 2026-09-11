import { Transform } from 'class-transformer'
import { IsEmail, MaxLength } from 'class-validator'

export class ResendVerificationDto {
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string
}
