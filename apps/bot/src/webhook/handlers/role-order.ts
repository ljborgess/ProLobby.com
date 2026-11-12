/**
 * Role events can arrive out of order: each one retries on its own (10/20/40 s)
 * and a late retry would undo a newer change. Each event carries the whole
 * answer and when it happened, so the newest one applied for a person wins.
 *
 * ponytail: in memory, one entry per person touched. A restart forgets it, so
 * a retry landing right after a restart can still apply; a store in the API
 * (role state per account) is the upgrade if that ever bites.
 */
export class RoleOrder {
  private readonly last = new Map<string, number>()

  isStale(discordId: string, occurredAt: string): boolean {
    return Date.parse(occurredAt) < (this.last.get(discordId) ?? -Infinity)
  }

  applied(discordId: string, occurredAt: string): void {
    const at = Date.parse(occurredAt)
    if (at > (this.last.get(discordId) ?? -Infinity)) this.last.set(discordId, at)
  }
}
