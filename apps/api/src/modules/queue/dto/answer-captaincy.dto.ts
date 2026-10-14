import { IsIn } from 'class-validator'

import type { CaptainAnswer } from '../captain-cascade.service'

export class AnswerCaptaincyDto {
  @IsIn(['confirm', 'decline', 'full'])
  answer!: CaptainAnswer
}
