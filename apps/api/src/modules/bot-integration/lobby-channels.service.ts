import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'
import type { LobbyChannelsCreatedEvent } from '@prolobby/types'

import { Lobby, LobbyState } from '../lobby/lobby.entity'

/**
 * The bot created a lobby's channels (#250): keep the ids and open the 60 s
 * formation vote (RF-034, #249).
 *
 * The 60 s start when the API hears it, not at the bot's `occurredAt`: a
 * delivery retried a minute late must not open a vote already over. A repeat
 * of the event changes nothing, and a lobby that ended in the meantime only
 * keeps the ids, so #251 can still delete the channels.
 */
@Injectable()
export class LobbyChannelsService {
  constructor(private readonly em: EntityManager) {}

  async apply(event: LobbyChannelsCreatedEvent, now: Date = new Date()): Promise<void> {
    const em = this.em.fork()
    const lobby = await em.findOne(Lobby, { id: event.payload.lobbyId })
    if (!lobby || lobby.textChannelId) return
    lobby.textChannelId = event.payload.textChannelId
    lobby.voiceAChannelId = event.payload.voiceAChannelId
    lobby.voiceBChannelId = event.payload.voiceBChannelId
    if (lobby.state === LobbyState.WAITING_INVITE || lobby.state === LobbyState.IN_PROGRESS) {
      lobby.formationVoteStartedAt = now
    }
    await em.flush()
  }
}
