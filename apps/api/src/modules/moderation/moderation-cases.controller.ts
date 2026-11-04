import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'

import { ModeratorGuard } from '../../common/auth/moderator.guard'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { CloseCaseDto } from './dto/close-case.dto'
import { ModerationCaseType } from './moderation-case.enums'
import {
  ModerationCasesService,
  type CaseDetail,
  type CaseListItem,
  type SectionSummary,
} from './moderation-cases.service'
import { ModerationSection } from './moderation-sections'

/** The panel's case queue by section — #306, #307. */
@Controller('moderation/cases')
@UseGuards(ModeratorGuard)
export class ModerationCasesController {
  constructor(private readonly cases: ModerationCasesService) {}

  @Get('summary')
  async summary(@Req() request: RequestWithAccount): Promise<{ sections: SectionSummary[] }> {
    return { sections: await this.cases.summary(request.account!.id) }
  }

  @Get()
  list(
    @Req() request: RequestWithAccount,
    @Query('section', new ParseEnumPipe(ModerationSection, { optional: true }))
    section?: ModerationSection,
    @Query('type', new ParseEnumPipe(ModerationCaseType, { optional: true }))
    type?: ModerationCaseType,
  ): Promise<CaseListItem[]> {
    return this.cases.list(request.account!.id, section, type)
  }

  @Get(':caseId')
  detail(
    @Req() request: RequestWithAccount,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ): Promise<CaseDetail> {
    return this.cases.detail(request.account!.id, caseId)
  }

  @Post(':caseId/closures')
  @HttpCode(HttpStatus.NO_CONTENT)
  close(
    @Req() request: RequestWithAccount,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CloseCaseDto,
  ): Promise<void> {
    return this.cases.close(request.account!.id, caseId, dto)
  }
}
