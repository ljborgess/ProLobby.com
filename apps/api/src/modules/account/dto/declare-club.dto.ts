import {
  CREST_SHAPES,
  type CrestShape,
  KIT_COLORS,
  KIT_PATTERNS,
  type KitColor,
  type KitPattern,
} from '@prolobby/types'
import { Transform } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

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
  // Shown to the other humans of the lobby: no control or invisible
  // characters (zero-width spaces, direction overrides), only what reads.
  @Matches(/^[^\p{C}]+$/u)
  clubName!: string

  // The kit is optional: left out, a new club wears the default and an
  // existing one keeps what it had.
  @IsOptional()
  @IsIn(KIT_COLORS)
  kitPrimary?: KitColor

  @IsOptional()
  @IsIn(KIT_COLORS)
  kitSecondary?: KitColor

  @IsOptional()
  @IsIn(KIT_PATTERNS)
  kitPattern?: KitPattern

  @IsOptional()
  @IsIn(CREST_SHAPES)
  crestShape?: CrestShape
}
