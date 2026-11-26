import { IsString, Matches, ValidateIf } from 'class-validator'

/** 3 to 16 of `A-Z a-z 0-9 _`: no Unicode, so `а` (Cyrillic) cannot pass for `a` (#335). */
export const NICKNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/

export class SetNicknameDto {
  /** `null` takes the nickname away. */
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(NICKNAME_PATTERN, { message: 'invalid_nickname' })
  nickname!: string | null
}
