import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsIn, IsString, Length, Matches, ValidateIf } from 'class-validator'

import { Archetype } from '../archetype'
import { PrintRejection } from '../print-submission.entity'

/** Causes a moderator picks by eye; the gamertag ones are decided by the server. */
export const MODERATOR_REJECTIONS = [
  PrintRejection.UNREADABLE,
  PrintRejection.NOT_ACTIVE_ARCHETYPE,
  PrintRejection.ARCHETYPE_MISMATCH,
] as const

/**
 * RF-073: approving means typing what the print shows, not clicking "ok".
 * The server compares the typed gamertag with the declared one, so a typo or a
 * different tag on the card becomes a rejection, never a silent approval.
 */
export class VerificationDecisionDto {
  @IsBoolean()
  approve!: boolean

  @ValidateIf((dto: VerificationDecisionDto) => dto.approve)
  @IsEnum(Archetype)
  archetype?: Archetype

  @ValidateIf((dto: VerificationDecisionDto) => dto.approve)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 20)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9 _.#-]*$/)
  gamertag?: string

  @ValidateIf((dto: VerificationDecisionDto) => !dto.approve)
  @IsIn(MODERATOR_REJECTIONS)
  rejection?: (typeof MODERATOR_REJECTIONS)[number]
}
