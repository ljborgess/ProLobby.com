import type { ReactNode } from 'react'
import { requireSession } from '@/common/auth/require-session'

export default async function SignedInLayout({ children }: { children: ReactNode }) {
  await requireSession()
  return children
}
