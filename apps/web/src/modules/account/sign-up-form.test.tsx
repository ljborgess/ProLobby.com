import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { AUTH_CONTENT } from '@/content/auth'
import { SignUpForm } from './sign-up-form'

const pt = AUTH_CONTENT.pt.signUp

/** Everything valid, with the first ready-made security question. */
function fillValid(email = 'jogador@exemplo.com') {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: 'uma-senha-bem-longa' } })
  fireEvent.change(screen.getByLabelText('Data de nascimento'), {
    target: { value: '1995-05-20' },
  })
  fireEvent.change(screen.getByLabelText('Pergunta de segurança'), {
    target: { value: pt.securityQuestions[0] },
  })
  fireEvent.change(screen.getByLabelText('Resposta'), { target: { value: 'Totó' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('announces one summary for an empty form, focuses the first field, and never submits', async () => {
    renderWithLocale(<SignUpForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    // One live message instead of six at once (critique of 2026-11-03); each
    // error stays on its field, and the keyboard lands on the first one.
    const alerts = await screen.findAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toHaveTextContent(pt.errorSummary(6))
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toHaveFocus())
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription(pt.fieldRequired)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('drops a field error as soon as that field changes', () => {
    renderWithLocale(<SignUpForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a' } })

    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('alert')).toHaveTextContent(pt.errorSummary(5))
  })

  it('rejects an age under 16 with the specific message, not a generic one', () => {
    renderWithLocale(<SignUpForm />)

    fireEvent.change(screen.getByLabelText('Data de nascimento'), {
      target: { value: new Date().toISOString().slice(0, 10) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText('É preciso ter 16 anos ou mais.')).toBeInTheDocument()
  })

  it('offers ready-made questions, and a written one still needs 8 characters', () => {
    renderWithLocale(<SignUpForm />)

    expect(screen.getByRole('option', { name: pt.securityQuestions[0] })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Pergunta de segurança'), {
      target: { value: 'custom' },
    })
    fireEvent.change(screen.getByLabelText(pt.securityQuestionCustomLabel), {
      target: { value: 'Babi' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText(pt.securityQuestionTooShort)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows back the address typed, the next steps, and returns to the filled form on a typo', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 202 }))
    renderWithLocale(<SignUpForm />)

    fillValid('jogador@exemplo.com')
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('heading', { name: pt.sentTitle })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('jogador@exemplo.com')
    expect(screen.getByText(pt.nextSteps[1]!)).toBeInTheDocument()
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string)).toMatchObject({
      securityQuestion: pt.securityQuestions[0],
      securityAnswer: 'Totó',
    })

    fireEvent.click(screen.getByRole('button', { name: pt.sentWrongEmail }))

    expect(screen.getByLabelText('E-mail')).toHaveValue('jogador@exemplo.com')
  })

  it('says it in Spanish too', () => {
    renderWithLocale(<SignUpForm />, 'es')

    fireEvent.change(screen.getByLabelText('Pregunta de seguridad'), {
      target: { value: 'custom' },
    })
    fireEvent.change(screen.getByLabelText('Tu pregunta'), { target: { value: 'Babi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByText('La pregunta necesita al menos 8 caracteres.')).toBeInTheDocument()
  })
})
