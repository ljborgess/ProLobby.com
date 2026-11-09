import type { Locale } from './locale'

/** What a screen reader hears while a signed-in route loads (#296). */
export const LOADING_CONTENT: Record<Locale, { label: string }> = {
  pt: { label: 'Carregando' },
  es: { label: 'Cargando' },
}
