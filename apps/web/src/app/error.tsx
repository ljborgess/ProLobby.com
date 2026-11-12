'use client'

import { useEffect } from 'react'
import { ErrorView } from '@/modules/error-view'

/**
 * Anything that throws while a route draws lands here (#296). `retry` is this
 * Next version's name for what older ones called `reset`: it re-fetches and
 * re-renders the segment. The screen says nothing about what broke; the
 * console does.
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorView retry={retry} />
}
