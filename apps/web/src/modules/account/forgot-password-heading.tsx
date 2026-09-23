'use client'

import { useAuthContent } from '@/hooks/use-auth-content'

export function ForgotPasswordHeading() {
  const content = useAuthContent().forgotPassword
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-2xl font-semibold text-foreground">{content.title}</h1>
      <p className="text-base text-foreground-soft">{content.subtitle}</p>
    </div>
  )
}
