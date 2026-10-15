import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  WEBHOOK_MAX_SKEW_MS,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  botEventSchema,
  isWebhookTimestampFresh,
  readWebhookSecret,
  verifyWebhookSignature,
} from '@prolobby/types'
import type { Request } from 'express'

import { Public } from '../../common/auth/auth.decorators'
import { BOT_EVENT_THROTTLE } from '../../common/security/throttler.config'
import { DiscordPresenceService } from '../account/discord-presence.service'
import { LobbyChannelsService } from './lobby-channels.service'

type RequestWithRawBody = Request & { rawBody?: Buffer }

/**
 * Receives what the bot saw on Discord — the bot → platform direction (#150).
 *
 * Public in the sense that matters to the session guard (the bot has no
 * session); the authentication is the HMAC, the same contract the platform uses
 * towards the bot, inverted: signed material is `timestamp + "." + raw body`,
 * refused on a bad signature, a stale timestamp (5 minutes) or a wrong secret.
 */
@Controller('bot-events')
export class BotEventsController {
  // Read at boot: a missing or placeholder secret must stop the process, not
  // turn every event into a 500 that the bot dutifully retries.
  private readonly secret = readWebhookSecret()

  constructor(
    private readonly presence: DiscordPresenceService,
    private readonly lobbyChannels: LobbyChannelsService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  // Its own bucket: the bot is one caller sending many events, and the 5/min
  // login bucket would drop a burst of people leaving after a raid.
  @Throttle(BOT_EVENT_THROTTLE)
  async receive(@Req() request: RequestWithRawBody): Promise<void> {
    const signedAt = request.header(WEBHOOK_TIMESTAMP_HEADER)
    const signature = request.header(WEBHOOK_SIGNATURE_HEADER)

    // The raw bytes, never a re-serialised body: whitespace or key order would
    // change the HMAC. See `applySecurity`, which is what captures them.
    if (
      !verifyWebhookSignature(this.secret, signedAt, request.rawBody ?? Buffer.alloc(0), signature)
    ) {
      throw new UnauthorizedException('invalid_signature')
    }

    if (!isWebhookTimestampFresh(signedAt ?? '', new Date(), WEBHOOK_MAX_SKEW_MS)) {
      throw new UnauthorizedException('expired_timestamp')
    }

    const parsed = botEventSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new BadRequestException('invalid_event')
    }

    if (parsed.data.type === 'lobby.channels_created') {
      await this.lobbyChannels.apply(parsed.data)
      return
    }
    // 204 whether or not the Discord belongs to an account: the answer must not
    // say who is on the platform.
    await this.presence.apply(parsed.data)
  }
}
