import type { Locale } from './locale'

/**
 * Text for the logged-in home — issue #171. One object per locale, so a missing
 * key is a TypeScript error, not a silent blank in production.
 *
 * The items are named after what the person still has to do, and the order is
 * the one RF-002 fixes for the queue refusal — the screen and that message must
 * not disagree about what comes first.
 */
export interface AccountContent {
  title: string
  subtitle: string
  done: string
  pending: string
  email: {
    doneLabel: string
    pendingLabel: string
    pendingHint: string
    resend: string
    resending: string
    resent: string
    resendError: string
  }
  discord: {
    doneLabel: string
    pendingLabel: string
    pendingHint: string
    action: string
  }
  allDone: string
}

export const ACCOUNT_CONTENT: Record<Locale, AccountContent> = {
  pt: {
    title: 'Próximos passos',
    subtitle: 'Falta isto para você entrar na fila.',
    done: 'Concluído',
    pending: 'Pendente',
    email: {
      doneLabel: 'E-mail verificado',
      pendingLabel: 'E-mail não verificado',
      pendingHint: 'Enviamos um link quando você criou a conta. O link vale 24 horas.',
      resend: 'Reenviar e-mail',
      resending: 'Enviando…',
      resent: 'Enviamos um e-mail com as instruções.',
      resendError: 'Não deu pra reenviar agora. Tenta de novo em instantes.',
    },
    discord: {
      doneLabel: 'Discord vinculado',
      pendingLabel: 'Discord não vinculado',
      pendingHint: 'A fila e os canais da partida funcionam pelo seu Discord.',
      action: 'Vincular Discord',
    },
    allDone: 'Tudo pronto. A fila abre na próxima fase do projeto.',
  },
  es: {
    title: 'Próximos pasos',
    subtitle: 'Esto falta para que entres en la cola.',
    done: 'Completado',
    pending: 'Pendiente',
    email: {
      doneLabel: 'Correo verificado',
      pendingLabel: 'Correo no verificado',
      pendingHint: 'Enviamos un enlace cuando creaste la cuenta. Vale 24 horas.',
      resend: 'Reenviar correo',
      resending: 'Enviando…',
      resent: 'Te enviamos un correo con las instrucciones.',
      resendError: 'No se pudo reenviar ahora. Intenta de nuevo en un momento.',
    },
    discord: {
      doneLabel: 'Discord vinculado',
      pendingLabel: 'Discord no vinculado',
      pendingHint: 'La cola y los canales del partido funcionan con tu Discord.',
      action: 'Vincular Discord',
    },
    allDone: 'Todo listo. La cola abre en la próxima fase del proyecto.',
  },
}
