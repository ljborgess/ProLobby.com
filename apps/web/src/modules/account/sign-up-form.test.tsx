import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { SignUpForm } from './sign-up-form'

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('shows a validation error per field and never submits, when the form is empty', async () => {
    renderWithLocale(<SignUpForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    // One alert per invalid field — the checklist (RNF-015) asks for a
    // message that says what to do, not just that something is wrong.
    expect(await screen.findAllByRole('alert')).toHaveLength(6)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects an age under 16 with the specific message, not a generic one', () => {
    renderWithLocale(<SignUpForm />)

    fireEvent.change(screen.getByLabelText('Data de nascimento'), {
      target: { value: new Date().toISOString().slice(0, 10) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText('É preciso ter 16 anos ou mais.')).toBeInTheDocument()
  })
})
