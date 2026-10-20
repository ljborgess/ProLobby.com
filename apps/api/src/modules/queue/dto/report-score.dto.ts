import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'

/**
 * The score typed next to the print (4.1). A multipart field arrives as a
 * string, hence the explicit conversion. 0 to 20 a side: no real Pro Clubs
 * match goes past it (docs/produto/03-partida/04-resultado.md).
 */
export class ReportScoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  scoreA!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  scoreB!: number
}
