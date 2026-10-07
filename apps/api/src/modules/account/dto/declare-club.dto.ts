import { Transform } from 'class-transformer'
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

import { MAX_CLUB_NAME_LENGTH, MAX_FREE_SLOTS } from '../declared-club.entity'

export class DeclareClubDto {
  @IsInt()
  @Min(0)
  @Max(MAX_FREE_SLOTS)
  freeSlots!: number

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(MAX_CLUB_NAME_LENGTH)
  clubName!: string
}
