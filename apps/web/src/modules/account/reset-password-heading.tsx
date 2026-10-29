'use client'

import { useSearchParams } from 'next/navigation'
import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthHeading } from './auth-layout'

export function ResetPasswordHeading() {
  const content = useAuthContent().resetPassword
  // Without a token the form below is a dead link, not a password to choose:
  // "choose a new password" over "this link is not valid" contradicts itself.
  const hasToken = Boolean(useSearchParams().get('token'))
  return <AuthHeading title={content.title} subtitle={hasToken ? content.subtitle : undefined} />
}
