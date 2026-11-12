import type { Locale } from './locale'

/** Text for `/moderation/2fa` — the panel's second factor, #311. */
export interface TwoFactorContent {
  setupTitle: string
  setupIntro: string
  enrollmentLabel: string
  enrollmentHint: string
  start: string
  starting: string
  secretLabel: string
  openInApp: string
  codeLabel: string
  codeHint: string
  activate: string
  activating: string
  recoveryTitle: string
  recoveryIntro: string
  copy: string
  copied: string
  savedConfirm: string
  enterPanel: string
  verifyTitle: string
  verifyIntro: string
  verify: string
  verifying: string
  invalidCode: string
  invalidEnrollment: string
  tooMany: string
  error: string
}

export const TWO_FACTOR_CONTENT: Record<Locale, TwoFactorContent> = {
  pt: {
    setupTitle: 'Proteja o painel',
    setupIntro:
      'O painel de moderação pede um código do app autenticador (Google Authenticator, Authy ou 1Password) além da senha.',
    enrollmentLabel: 'Código de cadastro',
    enrollmentHint: 'O código xxxx-xxxx que um admin te passou. Vale 24 h e uma vez.',
    start: 'Configurar agora',
    starting: 'Gerando…',
    secretLabel: 'Chave pra digitar no app',
    openInApp: 'Abrir no app autenticador',
    codeLabel: 'Código de 6 dígitos',
    codeHint: 'O número que o app mostra agora.',
    activate: 'Ativar',
    activating: 'Ativando…',
    recoveryTitle: 'Códigos de recuperação',
    recoveryIntro:
      'Se perder o celular, cada código abre o painel uma vez. Eles não aparecem de novo: guarde num gerenciador de senhas.',
    copy: 'Copiar códigos',
    copied: 'Copiados',
    savedConfirm: 'Guardei os códigos',
    enterPanel: 'Entrar no painel',
    verifyTitle: 'Código do autenticador',
    verifyIntro: 'Digite o código do app, ou um código de recuperação.',
    verify: 'Entrar',
    verifying: 'Conferindo…',
    invalidCode: 'Código errado ou já usado. Confira o app e tente de novo.',
    invalidEnrollment: 'Código de cadastro errado ou vencido. Peça um novo a um admin.',
    tooMany: 'Muitas tentativas. Espere 15 minutos e tente de novo.',
    error: 'Não deu agora. Tente de novo em instantes.',
  },
  es: {
    setupTitle: 'Protege el panel',
    setupIntro:
      'El panel de moderación pide un código de la app autenticadora (Google Authenticator, Authy o 1Password) además de la contraseña.',
    enrollmentLabel: 'Código de registro',
    enrollmentHint: 'El código xxxx-xxxx que te pasó un admin. Vale 24 h y una vez.',
    start: 'Configurar ahora',
    starting: 'Generando…',
    secretLabel: 'Clave para escribir en la app',
    openInApp: 'Abrir en la app autenticadora',
    codeLabel: 'Código de 6 dígitos',
    codeHint: 'El número que muestra la app ahora.',
    activate: 'Activar',
    activating: 'Activando…',
    recoveryTitle: 'Códigos de recuperación',
    recoveryIntro:
      'Si pierdes el celular, cada código abre el panel una vez. No vuelven a aparecer: guárdalos en un gestor de contraseñas.',
    copy: 'Copiar códigos',
    copied: 'Copiados',
    savedConfirm: 'Guardé los códigos',
    enterPanel: 'Entrar al panel',
    verifyTitle: 'Código del autenticador',
    verifyIntro: 'Escribe el código de la app, o un código de recuperación.',
    verify: 'Entrar',
    verifying: 'Verificando…',
    invalidCode: 'Código incorrecto o ya usado. Revisa la app e intenta de nuevo.',
    invalidEnrollment: 'Código de registro incorrecto o vencido. Pide uno nuevo a un admin.',
    tooMany: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.',
    error: 'No se pudo ahora. Intenta de nuevo en un momento.',
  },
}
