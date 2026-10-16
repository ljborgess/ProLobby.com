import { IsUUID } from 'class-validator'

export class ContestResultDto {
  /** Named, not derived: within the 48 h the person may be in another match already. */
  @IsUUID()
  lobbyId!: string
}
