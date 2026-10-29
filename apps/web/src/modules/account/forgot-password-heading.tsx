'use client'

import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthHeading } from './auth-layout'

export function ForgotPasswordHeading() {
  const content = useAuthContent().forgotPassword
  return <AuthHeading title={content.title} subtitle={content.subtitle} />
}
