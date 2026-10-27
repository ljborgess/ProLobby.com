import type { LobbyEndedEvent } from '@prolobby/types'

import { lobbyChannelNames, type LobbyChannelsDeps } from './lobby-closed'

export type LobbyEndedDeps = Pick<LobbyChannelsDeps, 'findChannel'> & {
  deleteChannel: (channelId: string) => Promise<void>
}

/**
 * #251, RF-052: a cancelled or expired lobby loses its three channels at
 * once, with no 15 min floor — there is no match left for them to serve.
 * Found by name, so a retry, or a channel already gone, is a no-op.
 */
export async function dropLobbyChannels(
  event: LobbyEndedEvent,
  deps: LobbyEndedDeps,
): Promise<void> {
  for (const name of Object.values(lobbyChannelNames(event.payload.lobbyId))) {
    const channel = await deps.findChannel(name)
    if (channel) await deps.deleteChannel(channel.id)
  }
}
