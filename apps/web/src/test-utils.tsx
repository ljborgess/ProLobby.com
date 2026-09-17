import { render, type RenderResult } from '@testing-library/react'
import { LocaleProvider } from '@/common/providers/locale-provider'
import type { Locale } from '@/content/locale'

/** Renders a component the way the real app does: inside `LocaleProvider`. */
export function renderWithLocale(ui: React.ReactElement, locale: Locale = 'pt'): RenderResult {
  return render(<LocaleProvider initialLocale={locale}>{ui}</LocaleProvider>)
}
