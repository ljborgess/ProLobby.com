import type { Locale } from './locale'

/** The signed-in header: one menu on every screen behind the login. */
export type NavContent = {
  label: string
  home: string
  homeLabel: string
  queue: string
  squad: string
  club: string
}

export const NAV_CONTENT: Record<Locale, NavContent> = {
  pt: {
    label: 'Menu principal',
    home: 'Início',
    homeLabel: 'ProLobby, início',
    queue: 'Fila',
    squad: 'Elenco',
    club: 'Clube',
  },
  es: {
    label: 'Menú principal',
    home: 'Inicio',
    homeLabel: 'ProLobby, inicio',
    queue: 'Cola',
    squad: 'Plantel',
    club: 'Club',
  },
}
