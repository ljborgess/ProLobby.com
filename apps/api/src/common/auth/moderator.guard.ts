import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'

import { AccountRole } from '../../modules/account/account.enums'
import type { RequestWithAccount } from './session.guard'

const MODERATION_ROLES: readonly AccountRole[] = [AccountRole.MODERATOR, AccountRole.ADMIN]

/**
 * Moderation routes — the first role-gated area. Runs after the global
 * `SessionGuard`, which already loaded the account from the database on this
 * request, so a demoted moderator loses access on the next call.
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const account = context.switchToHttp().getRequest<RequestWithAccount>().account
    if (!account || !MODERATION_ROLES.includes(account.role)) {
      throw new ForbiddenException('moderator_only')
    }
    return true
  }
}
