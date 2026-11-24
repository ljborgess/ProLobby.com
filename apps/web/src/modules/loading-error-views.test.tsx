import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { ERROR_CONTENT } from '@/content/error'
import { LOADING_CONTENT } from '@/content/loading'
import { ErrorView } from './error-view'
import { LoadingView } from './loading-view'

describe('LoadingView (#296)', () => {
  it.each(['pt', 'es'] as const)('announces the wait in %s, without a spinner', (locale) => {
    const { container } = renderWithLocale(<LoadingView />, locale)
    // The live region sits inside <main>, which keeps its landmark.
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(
      LOADING_CONTENT[locale].label,
    )
    expect(container.querySelector('[class*="animate-spin"]')).toBeNull()
  })

  it('only breathes when motion is allowed', () => {
    const { container } = renderWithLocale(<LoadingView />)
    expect(container.querySelector('.animate-pulse')).toBeNull()
    expect(container.querySelector('[class*="motion-safe:animate-pulse"]')).not.toBeNull()
  })
})

describe('ErrorView (#296)', () => {
  it.each(['pt', 'es'] as const)('offers a retry and the way home in %s', (locale) => {
    const retry = vi.fn()
    renderWithLocale(<ErrorView retry={retry} />, locale)
    const content = ERROR_CONTENT[locale]

    expect(screen.getByRole('heading', { name: content.title })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: content.retry }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: content.home })).toHaveAttribute('href', '/')
  })

  it('shows nothing about what broke', () => {
    renderWithLocale(<ErrorView retry={vi.fn()} />)
    expect(document.body.textContent).not.toMatch(/digest|stack|Error:/i)
  })
})
