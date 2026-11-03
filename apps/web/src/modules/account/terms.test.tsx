import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { TERMS_CONTENT } from '@/content/terms'
import { SignUpForm } from './sign-up-form'
import { TermsDocument } from './terms'

describe('Terms of Use', () => {
  it('shows the draft notice, the version and every section, in both languages', () => {
    renderWithLocale(<TermsDocument />)

    expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument()
    expect(screen.getByText(TERMS_CONTENT.pt.draft)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(
      TERMS_CONTENT.pt.sections.length,
    )
    expect(TERMS_CONTENT.es.sections).toHaveLength(TERMS_CONTENT.pt.sections.length)
  })

  it('opens from the sign-up checkbox without ticking it', () => {
    renderWithLocale(<SignUpForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Termos de Uso' }))

    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByText(TERMS_CONTENT.pt.draft)).toBeInTheDocument()
  })
})
