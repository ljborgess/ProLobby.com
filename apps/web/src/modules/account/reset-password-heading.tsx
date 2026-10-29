'use client'

import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthHeading } from './auth-layout'

export function ResetPasswordHeading() {
  const content = useAuthContent().resetPassword
  return <AuthHeading title={content.title} subtitle={content.subtitle} />
}
