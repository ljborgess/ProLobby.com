'use client'

import { ErrorView } from '@/modules/error-view'

/**
 * Anything that throws while a route draws lands here (#296). `retry` is this
 * Next version's name for what older ones called `reset`: it re-fetches and
 * re-renders the segment.
 */
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorView retry={retry} />
}
