import { Injectable } from '@nestjs/common'

import type { CharacterCategory } from '../character/archetype'

/** What a searching account is told keeps the queue from closing (RF-007). */
export type QueueStall = 'unpaired' | 'captain_missing'

/**
 * What kept the last matching run from closing another lobby — #234,
 * RF-007. The run writes it, `GET /queue` reads it for the asker's category
 * only: no count of who is waiting ever leaves (RF-008).
 *
 * ponytail: in memory, which holds for the one API process of ADR-009; a
 * second process would need it in the database.
 */
@Injectable()
export class QueueStallState {
  private last: { unpaired: CharacterCategory[]; captainMissing: boolean } | null = null

  record(unpaired: CharacterCategory[], captainMissing: boolean): void {
    this.last = { unpaired, captainMissing }
  }

  /** Why this category's people wait, as of the last run; null when nothing stalls it. */
  for(category: CharacterCategory): QueueStall | null {
    if (!this.last) return null
    if (this.last.unpaired.includes(category)) return 'unpaired'
    return this.last.captainMissing ? 'captain_missing' : null
  }
}
