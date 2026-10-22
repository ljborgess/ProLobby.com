import { Transform } from 'class-transformer'
import { ArrayMaxSize, IsOptional, IsUUID } from 'class-validator'

import { ReportScoreDto } from './report-score.dto'

/**
 * The report with its print (4.1). `absent` names who left or never played,
 * by their row in the lobby; multipart sends it as one comma-separated field.
 */
export class SubmitReportDto extends ReportScoreDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsUUID('all', { each: true })
  // A side has at most 11 humans; the whole lobby, 22.
  @ArrayMaxSize(21)
  absent?: string[]
}
