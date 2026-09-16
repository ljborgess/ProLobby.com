import { Transform } from 'class-transformer'
import { IsEmail, MaxLength } from 'class-validator'

/** Joins the sign-up waiting list — RF-078. */
export class JoinWaitingListDto {
  /** Normalised at the edge, like sign-up — see SignUpDto.email. */
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string
}
