import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common'

/**
 * The Discord side of the link flow, behind a seam so tests never call Discord.
 *
 * Scope is `identify` and nothing else (#149): the only thing this platform
 * needs from Discord here is *who this is*. The access token is used once, to
 * read that id, and dropped — it is never returned, stored or logged.
 */
export abstract class DiscordOAuth {
  abstract authorizationUrl(state: string, codeChallenge: string): string

  /** Trades the authorization code for the Discord user id, and forgets the token. */
  abstract userIdFor(code: string, codeVerifier: string): Promise<string>
}

export interface DiscordOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

const DISCORD_API = 'https://discord.com/api'
const REQUEST_TIMEOUT_MS = 5_000
/** A snowflake. Anything else from `/users/@me` is not an identity we should hash. */
const SNOWFLAKE = /^\d{17,20}$/

@Injectable()
export class HttpDiscordOAuth extends DiscordOAuth {
  constructor(private readonly config: DiscordOAuthConfig) {
    super()
  }

  authorizationUrl(state: string, codeChallenge: string): string {
    const url = new URL('https://discord.com/oauth2/authorize')
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: 'identify',
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'consent',
    }).toString()

    return url.toString()
  }

  async userIdFor(code: string, codeVerifier: string): Promise<string> {
    const token = await this.post(`${DISCORD_API}/oauth2/token`, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    })

    const accessToken = (token as { access_token?: unknown }).access_token
    if (typeof accessToken !== 'string') {
      throw new BadGatewayException('discord_unavailable')
    }

    const user = await this.get(`${DISCORD_API}/users/@me`, accessToken)
    const id = (user as { id?: unknown }).id
    if (typeof id !== 'string' || !SNOWFLAKE.test(id)) {
      throw new BadGatewayException('discord_unavailable')
    }

    return id
  }

  // Bodies and tokens stay out of every error on purpose: the failure a caller
  // sees is `discord_unavailable`, and nothing Discord sent goes to a log.
  private async post(url: string, form: Record<string, string>): Promise<unknown> {
    return this.read(
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    )
  }

  private async get(url: string, accessToken: string): Promise<unknown> {
    return this.read(
      await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    )
  }

  private async read(response: Response): Promise<unknown> {
    if (!response.ok) {
      throw new BadGatewayException('discord_unavailable')
    }

    return response.json()
  }
}

/** Outside production with no Discord app configured: the flow answers, it does not crash. */
export class UnconfiguredDiscordOAuth extends DiscordOAuth {
  authorizationUrl(): string {
    throw new ServiceUnavailableException('discord_link_unavailable')
  }

  userIdFor(): Promise<string> {
    throw new ServiceUnavailableException('discord_link_unavailable')
  }
}

/**
 * Chosen at boot, same shape as the mail sender: production refuses to start
 * without the Discord app, because a link button that always fails looks like a
 * broken product; a fresh clone runs without one.
 */
export function createDiscordOAuth(): DiscordOAuth {
  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  const redirectUri = process.env.DISCORD_REDIRECT_URI

  if (clientId && clientSecret && redirectUri) {
    return new HttpDiscordOAuth({ clientId, clientSecret, redirectUri })
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET and DISCORD_REDIRECT_URI are required in production — without them nobody can link a Discord account, and the queue requires one (RF-002)',
    )
  }

  return new UnconfiguredDiscordOAuth()
}
