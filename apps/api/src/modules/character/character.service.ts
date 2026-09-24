import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { CURRENT_EDITION } from '../../common/domain/game-edition.enum'
import { encryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { hashIdentity, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { Account } from '../account/account.entity'
import { BlockedIdentity } from '../moderation/blocked-identity.entity'
import { archetypeFitsCategory } from './archetype'
import { ACTIVE_CHARACTER_STATES, Character, CharacterState } from './character.entity'
import type { ChangeCategoryDto } from './dto/change-category.dto'
import type { CreateCharacterDto } from './dto/create-character.dto'
import { PlatformGamertag } from './platform-gamertag.entity'

/** What the screen needs about a character — item 17: never the entity. */
export type CharacterView = Pick<
  Character,
  'id' | 'category' | 'archetype' | 'platform' | 'edition' | 'name' | 'state' | 'matchesInCategory'
>

/**
 * PSN IDs and Xbox gamertags are case-insensitive, so the identity key is
 * too. Every hash of a gamertag goes through here — the ban list included —
 * or the same tag would hash two ways and the check would silently miss.
 */
export function normalizeGamertag(gamertag: string): string {
  return gamertag.trim().toLowerCase()
}

@Injectable()
export class CharacterService {
  private readonly hmacSecret = readIdentityHmacSecret()
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(private readonly em: EntityManager) {}

  async list(accountId: string): Promise<CharacterView[]> {
    const characters = await this.em
      .fork()
      .find(
        Character,
        {
          account: accountId,
          edition: CURRENT_EDITION,
          state: { $in: [...ACTIVE_CHARACTER_STATES] },
        },
        { orderBy: { createdAt: 'asc' } },
      )
    return characters.map(toView)
  }

  async hasVerified(accountId: string): Promise<boolean> {
    const count = await this.em.fork().count(Character, {
      account: accountId,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
    })
    return count > 0
  }

  async create(accountId: string, dto: CreateCharacterDto): Promise<CharacterView> {
    if (!archetypeFitsCategory(dto.archetype, dto.category)) {
      throw new BadRequestException('archetype_category_mismatch')
    }
    const gamertagHash = hashIdentity(this.hmacSecret, normalizeGamertag(dto.gamertag))

    try {
      return await this.em.fork().transactional(async (em) => {
        // One account creates one character at a time: the "inactivate the
        // previous one" step below must not race a second creation.
        const account = await em.findOneOrFail(
          Account,
          { id: accountId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )

        if ((await em.count(BlockedIdentity, { platform: dto.platform, gamertagHash })) > 0) {
          throw new ForbiddenException('gamertag_unavailable')
        }
        const takenElsewhere = await em.count(PlatformGamertag, {
          platform: dto.platform,
          gamertagHash,
          verifiedAt: { $ne: null },
          account: { $ne: accountId },
        })
        if (takenElsewhere > 0) {
          throw new ConflictException('gamertag_already_verified')
        }

        await this.claimGamertag(em, account, dto, gamertagHash)

        // RF-027: never deleted — the previous one stays in the history.
        await em.nativeUpdate(
          Character,
          {
            account: accountId,
            category: dto.category,
            edition: CURRENT_EDITION,
            state: { $in: [...ACTIVE_CHARACTER_STATES] },
          },
          { state: CharacterState.INACTIVE },
        )

        const character = em.create(Character, {
          account,
          category: dto.category,
          archetype: dto.archetype,
          platform: dto.platform,
          edition: CURRENT_EDITION,
          name: dto.name,
        })
        await em.flush()
        return toView(character)
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('character_conflict')
      }
      throw error
    }
  }

  async changeCategory(
    accountId: string,
    characterId: string,
    dto: ChangeCategoryDto,
  ): Promise<CharacterView> {
    try {
      return await this.em.fork().transactional(async (em) => {
        const character = await em.findOne(
          Character,
          { id: characterId, account: accountId, state: { $in: [...ACTIVE_CHARACTER_STATES] } },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )
        if (!character) {
          throw new NotFoundException('character_not_found')
        }
        // RF-028: from the first match on, elo exists in that category, and
        // moving would carry performance between positions.
        if (character.matchesInCategory > 0) {
          throw new ConflictException('category_locked_after_match')
        }
        if (!archetypeFitsCategory(character.archetype, dto.category)) {
          throw new BadRequestException('archetype_category_mismatch')
        }
        character.category = dto.category
        await em.flush()
        return toView(character)
      })
    } catch (error) {
      // The partial unique index: that category already has an active one.
      if (isUniqueViolation(error)) {
        throw new ConflictException('category_taken')
      }
      throw error
    }
  }

  /**
   * The claim is provisional until a print verifies it, so fixing a typo is
   * free. Once verified, changing it is a moderation request — PSN and Xbox
   * let people rename, and that must not reopen the tag to anyone.
   */
  private async claimGamertag(
    em: EntityManager,
    account: Account,
    dto: CreateCharacterDto,
    gamertagHash: string,
  ): Promise<void> {
    const claim = await em.findOne(PlatformGamertag, { account, platform: dto.platform })
    if (claim?.gamertagHash === gamertagHash) {
      return
    }
    if (claim?.verifiedAt) {
      throw new ConflictException('gamertag_change_requires_moderation')
    }
    const gamertagEncrypted = encryptAtRest(this.encryptionKey, Buffer.from(dto.gamertag))
    if (claim) {
      claim.gamertagHash = gamertagHash
      claim.gamertagEncrypted = gamertagEncrypted
      return
    }
    em.create(PlatformGamertag, {
      account,
      platform: dto.platform,
      gamertagHash,
      gamertagEncrypted,
    })
  }
}

function toView(character: Character): CharacterView {
  return {
    id: character.id,
    category: character.category,
    archetype: character.archetype,
    platform: character.platform,
    edition: character.edition,
    name: character.name,
    state: character.state,
    matchesInCategory: character.matchesInCategory,
  }
}
