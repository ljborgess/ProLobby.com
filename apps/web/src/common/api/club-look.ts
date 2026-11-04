import { apiFetch, type ApiFetchOptions } from '@/common/api/client'
import { kitLookOf, type KitLook } from '@/modules/kit/kit-art'
import type { DeclaredClubView } from '@/modules/account/club-panel'

/**
 * The declared club's kit, for the screens that dress shirts in it. The kit
 * is decoration: an unreachable API or a body it cannot use means no kit
 * (the shirts keep their plain look), never a broken page.
 */
export async function fetchClubLook(init: ApiFetchOptions): Promise<KitLook | null> {
  try {
    const response = await apiFetch('/api/accounts/me/club', init)
    if (!response.ok) return null
    const { club } = (await response.json()) as { club: DeclaredClubView | null }
    return kitLookOf(club)
  } catch {
    return null
  }
}
