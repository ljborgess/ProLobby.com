import { apiFetch, type ApiFetchOptions } from '@/common/api/client'
import type { DeclaredClubView } from '@/modules/kit/declared-club'
import { kitLookOf, type KitLook } from '@/modules/kit/kit-art'

/**
 * The declared club's kit, for the screens that dress shirts in it. The kit
 * is decoration: an unreachable API or a body it cannot use means no kit
 * (the shirts keep their plain look), never a broken page. The failure is
 * logged, like the other loaders do, so it does not go unseen.
 */
export async function fetchClubLook(init: ApiFetchOptions): Promise<KitLook | null> {
  try {
    const response = await apiFetch('/api/accounts/me/club', init)
    if (!response.ok) {
      console.error(`club-look: API answered ${response.status}`)
      return null
    }
    const { club } = (await response.json()) as { club: DeclaredClubView | null }
    return kitLookOf(club)
  } catch (error) {
    console.error('club-look: could not load the club kit', error)
    return null
  }
}
