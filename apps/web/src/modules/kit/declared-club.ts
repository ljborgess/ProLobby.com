import type { Kit } from '@prolobby/types'

/** `GET /api/accounts/me/club` → `club`. */
export interface DeclaredClubView {
  freeSlots: number
  clubName: string
  /** Absent only in answers from before Kit Lab: read as the default kit. */
  kit?: Kit
}
