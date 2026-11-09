import type { Locale } from './locale'

/** The error screen: something broke while drawing a route (#296). */
export type ErrorContent = {
  title: string
  body: string
  retry: string
  home: string
}

export const ERROR_CONTENT: Record<Locale, ErrorContent> = {
  pt: {
    title: 'Falta na jogada',
    body: 'Algo deu errado aqui. Tenta de novo; se continuar, volta pro início.',
    retry: 'Tentar de novo',
    home: 'Voltar pro início',
  },
  es: {
    title: 'Falta en la jugada',
    body: 'Algo salió mal aquí. Inténtalo de nuevo; si sigue, vuelve al inicio.',
    retry: 'Intentar de nuevo',
    home: 'Volver al inicio',
  },
}
