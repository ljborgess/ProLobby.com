import { IsIn } from 'class-validator'

import { FORMATIONS, type Formation } from '../../lobby/formation-vote.entity'

export class FormationDto {
  @IsIn(FORMATIONS)
  formation!: Formation
}
