import { Transform } from 'class-transformer'
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'

import { ClosureReason } from '../moderation-sections'

/** A case closed from the panel (#306): the outcome, one ready reason, an optional note. */
export class CloseCaseDto {
  @IsIn(['resolved', 'dismissed'])
  outcome!: 'resolved' | 'dismissed'

  @IsEnum(ClosureReason)
  reason!: ClosureReason

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  note?: string

  /**
   * Score disputes only, and required there (#342): the score that stands,
   * or `annul` when no evidence decides it (RF-044). 0 to 20 a side, as a report.
   */
  @IsOptional()
  @IsIn(['score', 'annul'])
  dispute?: 'score' | 'annul'

  @ValidateIf((dto: CloseCaseDto) => dto.dispute === 'score')
  @IsInt()
  @Min(0)
  @Max(20)
  scoreA?: number

  @ValidateIf((dto: CloseCaseDto) => dto.dispute === 'score')
  @IsInt()
  @Min(0)
  @Max(20)
  scoreB?: number
}
