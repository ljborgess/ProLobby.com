import { IsEnum, IsString, IsUUID, Length } from 'class-validator'

import { UserReportReason } from '../../moderation/moderation-case.enums'

/** A report against someone of a match the reporter played (4.2). */
export class OpenUserReportDto {
  @IsUUID()
  lobbyId!: string

  /** The person's row in that match: account ids never leave the API. */
  @IsUUID()
  participationId!: string

  @IsEnum(UserReportReason)
  reason!: UserReportReason

  /** Same floor as an appeal: a moderator needs something to act on. */
  @IsString()
  @Length(20, 2000)
  message!: string
}
