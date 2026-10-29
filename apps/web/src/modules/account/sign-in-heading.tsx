'use client'

import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthHeading } from './auth-layout'

export function SignInHeading() {
  const content = useAuthContent().signIn
  return <AuthHeading title={content.title} subtitle={content.subtitle} />
}
