import { AuthLayout } from '@/modules/account/auth-layout'
import { SignInForm } from '@/modules/account/sign-in-form'
import { SignInHeading } from '@/modules/account/sign-in-heading'
import { pageMetadata } from '@/common/page-metadata'

export const generateMetadata = () => pageMetadata('login')

export default function LoginPage() {
  return (
    <AuthLayout variant="signIn">
      <SignInHeading />
      <SignInForm />
    </AuthLayout>
  )
}
