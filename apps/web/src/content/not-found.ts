import type { Locale } from './locale'

/** The 404 page: a route that does not exist, or one this account may not see. */
export type NotFoundContent = {
  title: string
  body: string
  action: string
}

export const NOT_FOUND_CONTENT: Record<Locale, NotFoundContent> = {
  pt: {
    title: 'Bola fora',
    body: 'Essa página não existe ou saiu de campo.',
    action: 'Voltar pro início',
  },
  es: {
    title: 'Pelota afuera',
    body: 'Esta página no existe o salió de la cancha.',
    action: 'Volver al inicio',
  },
}
