import { IsEnum, Matches, ValidateIf } from 'class-validator'

import { AccountPlan } from '../../account/account.enums'

/**
 * A plan set by an admin after confirming the PIX by hand (#313). The PIX
 * end-to-end id is what ties the change to the payment; revoking needs none.
 */
export class SetPlanDto {
  @IsEnum(AccountPlan)
  plan!: AccountPlan

  @ValidateIf((dto: SetPlanDto) => dto.plan !== AccountPlan.NONE)
  @Matches(/^[A-Za-z0-9-]{8,64}$/)
  pixReference?: string
}
