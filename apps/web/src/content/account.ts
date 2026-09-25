import type { Locale } from './locale'

/**
 * Text for `/verifications` — issue #171. One object per locale, so a missing
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
  character: {
    doneLabel: string
    pendingLabel: string
    pendingHint: string
    action: string
  }
  discord: {
    doneLabel: string
    pendingLabel: string
    pendingHint: string
    action: string
    absentLabel: string
    absentHint: string
    absentAction: string
  }
  allDone: string
  reputation: {
    label: string
    slowQueue: string
    howItMoves: string
    bands: Record<'good' | 'slow_queue' | 'suspension' | 'ban', string>
    valueText: (value: number, band: string) => string
  }
  loadError: string
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
    character: {
      doneLabel: 'Personagem verificado',
      pendingLabel: 'Personagem não verificado',
      pendingHint: 'Cadastre seu personagem e mande o print da tela de arquétipos do seu Pro.',
      action: 'Cadastrar personagem',
    },
    discord: {
      doneLabel: 'Discord vinculado',
      pendingLabel: 'Discord não vinculado',
      pendingHint: 'A fila e os canais da partida acontecem por lá.',
      action: 'Vincular',
      absentLabel: 'Você saiu do servidor Discord',
      absentHint:
        'A fila fica bloqueada enquanto você estiver fora. Volte pelo convite abaixo e o acesso libera sozinho — seu vínculo continua o mesmo.',
      absentAction: 'Entrar no servidor',
    },
    allDone: 'Tudo pronto. A fila abre na próxima fase do projeto.',
    reputation: {
      label: 'Reputação',
      slowQueue:
        'Abaixo de 55, a fila demora mais pra achar partida. Partidas limpas sobem 1 ponto cada, até 70.',
      howItMoves: 'Cada partida limpa soma 1 ponto, até 70. Desconexão tira 8.',
      bands: {
        good: 'Boa',
        slow_queue: 'Fila mais lenta',
        suspension: 'Faixa de suspensão',
        ban: 'Faixa de banimento',
      },
      valueText: (value, band) => `${value} de 100, ${band}`,
    },
    loadError: 'Não deu pra carregar sua conta agora. Atualiza a página em instantes.',
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
    character: {
      doneLabel: 'Personaje verificado',
      pendingLabel: 'Personaje no verificado',
      pendingHint:
        'Registra tu personaje y envía la captura de la pantalla de arquetipos de tu Pro.',
      action: 'Registrar personaje',
    },
    discord: {
      doneLabel: 'Discord vinculado',
      pendingLabel: 'Discord no vinculado',
      pendingHint: 'La cola y los canales del partido pasan por allí.',
      action: 'Vincular',
      absentLabel: 'Saliste del servidor de Discord',
      absentHint:
        'La cola queda bloqueada mientras estés fuera. Vuelve por la invitación de abajo y el acceso se libera solo — tu vínculo sigue siendo el mismo.',
      absentAction: 'Entrar al servidor',
    },
    allDone: 'Todo listo. La cola abre en la próxima fase del proyecto.',
    reputation: {
      label: 'Reputación',
      slowQueue:
        'Por debajo de 55, la cola tarda más en encontrar partida. Cada partida limpia suma 1 punto, hasta 70.',
      howItMoves: 'Cada partida limpia suma 1 punto, hasta 70. Una desconexión resta 8.',
      bands: {
        good: 'Buena',
        slow_queue: 'Cola más lenta',
        suspension: 'Franja de suspensión',
        ban: 'Franja de baneo',
      },
      valueText: (value, band) => `${value} de 100, ${band}`,
    },
    loadError: 'No se pudo cargar tu cuenta ahora. Actualiza la página en un momento.',
  },
}
