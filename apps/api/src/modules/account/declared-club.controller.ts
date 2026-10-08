import { EntityManager } from '@mikro-orm/postgresql'
import { Body, Controller, Delete, Get, HttpCode, Put, Req } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import type { RequestWithAccount } from '../../common/auth/session.guard'
import { DeclaredClub } from './declared-club.entity'
import { DeclareClubDto } from './dto/declare-club.dto'

export interface DeclaredClubView {
  freeSlots: number
  clubName: string
  updatedAt: Date
}

/**
 * The logged-in account's own club declaration — #229, RF-006. Only `me`:
 * there is no route that takes another account's ID (item 7 of the checklist).
 */
@Controller('accounts/me/club')
export class DeclaredClubController {
  constructor(private readonly em: EntityManager) {}

  @Get()
  async current(@Req() request: RequestWithAccount): Promise<{ club: DeclaredClubView | null }> {
    const club = await this.em.fork().findOne(DeclaredClub, { account: request.account!.id })
    return { club: club ? toView(club) : null }
  }

  /** Declaring again replaces it; the upsert keeps two saves at once to one row. */
  @Put()
  async declare(
    @Req() request: RequestWithAccount,
    @Body() dto: DeclareClubDto,
  ): Promise<DeclaredClubView> {
    const club = await this.em.fork().upsert(
      DeclaredClub,
      {
        // A plain-object upsert skips the entity's initializers; the existing
        // row keeps its id (excluded below).
        id: randomUUID(),
        account: request.account!.id,
        freeSlots: dto.freeSlots,
        clubName: dto.clubName,
        updatedAt: new Date(),
      },
      { onConflictFields: ['account'], onConflictExcludeFields: ['id'] },
    )
    return toView(club)
  }

  @Delete()
  @HttpCode(204)
  async remove(@Req() request: RequestWithAccount): Promise<void> {
    await this.em.fork().nativeDelete(DeclaredClub, { account: request.account!.id })
  }
}

function toView(club: DeclaredClub): DeclaredClubView {
  return { freeSlots: club.freeSlots, clubName: club.clubName, updatedAt: club.updatedAt }
}
