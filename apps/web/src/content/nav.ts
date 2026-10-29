import type { Locale } from './locale'

/** The signed-in header: one menu on every screen behind the login. */
export type NavContent = {
  label: string
  home: string
  homeLabel: string
  queue: string
  squad: string
  club: string
  /** The account menu: language, Discord, sign out. */
  account: string
  language: string
  discord: string
}

export const NAV_CONTENT: Record<Locale, NavContent> = {
  pt: {
    label: 'Menu principal',
    home: 'Início',
    homeLabel: 'ProLobby, página inicial',
    queue: 'Fila',
    squad: 'Elenco',
    club: 'Clube',
    account: 'Sua conta',
    language: 'Idioma',
    discord: 'Vínculo com o Discord',
  },
  es: {
    label: 'Menú principal',
    home: 'Inicio',
    homeLabel: 'ProLobby, página principal',
    queue: 'Cola',
    squad: 'Plantel',
    club: 'Club',
    account: 'Tu cuenta',
    language: 'Idioma',
    discord: 'Vínculo con Discord',
  },
}
