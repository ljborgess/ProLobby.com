import { IsString, Length } from 'class-validator'

export class CompleteDiscordLinkDto {
  /** The opaque value this API issued: 32 random bytes in base64url. */
  @IsString()
  @Length(20, 200)
  state!: string

  /** Discord's authorization code. */
  @IsString()
  @Length(10, 512)
  code!: string
}
