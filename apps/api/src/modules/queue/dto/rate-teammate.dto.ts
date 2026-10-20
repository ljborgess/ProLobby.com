import { IsEnum, IsUUID } from 'class-validator'

import { PeerRatingKind } from '../../lobby/peer-rating.entity'

export class RateTeammateDto {
  @IsUUID()
  lobbyId!: string

  /** The teammate's row in `lastMatch.teammates`: account ids never leave the API. */
  @IsUUID()
  participationId!: string

  @IsEnum(PeerRatingKind)
  kind!: PeerRatingKind
}
