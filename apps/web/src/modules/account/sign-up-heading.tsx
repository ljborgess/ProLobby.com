'use client'

import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthHeading } from './auth-layout'

export function SignUpHeading() {
  const content = useAuthContent().signUp
  return <AuthHeading title={content.title} subtitle={content.subtitle} />
}
