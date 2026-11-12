import type { Locale } from './locale'

/**
 * The browser-tab title of each route, in both languages (#296). Only routes
 * with their own title are here: the home keeps the layout's "ProLobby", and
 * /moderation and the 404 keep it on purpose (a hidden route must not say what
 * it is, in any language).
 */
export type PageTitleKey =
  | 'signUp'
  | 'login'
  | 'forgotPassword'
  | 'resetPassword'
  | 'verifyEmail'
  | 'terms'
  | 'verifications'
  | 'character'
  | 'club'
  | 'discord'
  | 'queue'

export const PAGE_TITLES: Record<Locale, Record<PageTitleKey, string>> = {
  pt: {
    signUp: 'Criar conta',
    login: 'Entrar',
    forgotPassword: 'Esqueci minha senha',
    resetPassword: 'Nova senha',
    verifyEmail: 'Verificação de e-mail',
    terms: 'Termos de Uso',
    verifications: 'Sua conta',
    character: 'Elenco',
    club: 'Clube',
    discord: 'Discord',
    queue: 'Fila',
  },
  es: {
    signUp: 'Crear cuenta',
    login: 'Entrar',
    forgotPassword: 'Olvidé mi contraseña',
    resetPassword: 'Nueva contraseña',
    verifyEmail: 'Verificación de correo',
    terms: 'Términos de Uso',
    verifications: 'Tu cuenta',
    character: 'Plantilla',
    club: 'Club',
    discord: 'Discord',
    queue: 'Cola',
  },
}
