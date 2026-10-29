import type { Metadata } from 'next'
import { NotFoundView } from '@/modules/not-found-view'

export const metadata: Metadata = {
  title: 'ProLobby',
}

export default function NotFound() {
  return <NotFoundView />
}
