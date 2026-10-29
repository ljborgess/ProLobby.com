import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { LanguageSwitcher } from './language-switcher'
import { SignUpHeading } from '@/modules/account/sign-up-heading'

describe('LanguageSwitcher', () => {
  it('swaps the rendered copy to Spanish and updates <html lang>', () => {
    renderWithLocale(
      <>
        <SignUpHeading />
        <LanguageSwitcher />
      </>,
    )

    expect(screen.getByRole('heading')).toHaveTextContent('Criar conta')

    fireEvent.click(screen.getByRole('radio', { name: 'Español' }))

    expect(screen.getByRole('heading')).toHaveTextContent('Crear cuenta')
    expect(document.documentElement.lang).toBe('es')
  })
})
