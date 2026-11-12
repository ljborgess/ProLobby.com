import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'

import { ModeratorGuard } from '../../common/auth/moderator.guard'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { AccountPlan, AccountRole } from '../account/account.enums'
import { SetPlanDto } from './dto/set-plan.dto'
import { PlanService } from './plan.service'

/** Founder and Supporter, set by an admin from the panel (#313). Moderators see the plan, never change it. */
@Controller('moderation/players')
@UseGuards(ModeratorGuard)
export class ModerationPlansController {
  constructor(private readonly plans: PlanService) {}

  @Post(':accountId/plan')
  set(
    @Req() request: RequestWithAccount,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: SetPlanDto,
  ): Promise<{ plan: AccountPlan; planExpiresAt: Date | null }> {
    if (request.account!.role !== AccountRole.ADMIN) throw new ForbiddenException('admin_only')
    return this.plans.set(request.account!.id, accountId, dto.plan, dto.pixReference)
  }
}
