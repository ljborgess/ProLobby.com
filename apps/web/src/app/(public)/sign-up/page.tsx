import { AuthLayout } from '@/modules/account/auth-layout'
import { SignUpForm } from '@/modules/account/sign-up-form'
import { pageMetadata } from '@/common/page-metadata'

export const generateMetadata = () => pageMetadata('signUp')

export default function SignUpPage() {
  return (
    <AuthLayout variant="signUp">
      <SignUpForm />
    </AuthLayout>
  )
}
