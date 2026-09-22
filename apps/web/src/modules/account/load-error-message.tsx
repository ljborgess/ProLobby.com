'use client'

import { useAccountContent } from '@/hooks/use-account-content'

/** The `/verifications` fallback when the API is unreachable or misbehaves. */
export function LoadErrorMessage() {
  const content = useAccountContent()

  return (
    <p role="alert" className="text-base text-danger">
      {content.loadError}
    </p>
  )
}
