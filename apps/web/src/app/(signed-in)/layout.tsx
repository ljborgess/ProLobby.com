import type { ReactNode } from 'react'
import { requireSession } from '@/common/auth/require-session'

/**
 * The signed-in area that has its own loading screen (#296): /queue,
 * /verifications and /account/character. The gate lives here, outside the
 * boundary of `loading.tsx`, so a visitor without a valid session is sent to
 * the login before any byte of the page.
 */
export default async function SignedInLayout({ children }: { children: ReactNode }) {
  await requireSession()
  return children
}
