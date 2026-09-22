/**
 * Reads and validates `DISCORD_BOT_TOKEN` — issue #168.
 *
 * Same shape as `readWebhookSecret` (`@prolobby/types`): a missing or
 * placeholder token must stop the process before it does anything, not fail
 * later inside `client.login`, after the webhook server already started
 * accepting traffic it cannot yet act on.
 */
export function readDiscordBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token || token === 'changeme') {
    throw new Error(
      'DISCORD_BOT_TOKEN is required and must not be the placeholder — it authenticates every Discord API call this process makes',
    )
  }
  return token
}
