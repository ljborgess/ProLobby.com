import { Transform } from 'class-transformer'
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

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
}
