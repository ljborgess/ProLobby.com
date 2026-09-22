import type { Locale } from './locale'

/**
 * Text for the public landing (`(public)/page.tsx`) — issue #171 redesign of
 * 2026-09-22. Scoped to this page only: it is the one screen the 2026-09-18
 * "no polish before Fase 2.5" rule (docs/produto/01-visao/01-visao.md)
 * explicitly carves out, since it is the public face, not part of the
 * cadastro/fila flow that rule protects.
 */
export interface LandingContent {
  hero: {
    titlePrefix: string
    titleAccent: string
    titleSuffix: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
  }
  features: {
    eyebrow: string
    items: { title: string; body: string }[]
  }
  footer: {
    tagline: string
  }
}

export const LANDING_CONTENT: Record<Locale, LandingContent> = {
  pt: {
    hero: {
      titlePrefix: 'A ',
      titleAccent: 'ProLobby',
      titleSuffix: ' é matchmaking de verdade pro seu Pro Clubs',
      subtitle:
        'Cadastra seu personagem, entra na fila por posição e é pareado com outros jogadores verificados — sem grupo de WhatsApp, sem gente sumida no meio do jogo.',
      primaryCta: 'Criar conta',
      secondaryCta: 'Entrar',
    },
    features: {
      eyebrow: 'Como funciona',
      items: [
        {
          title: 'Identidade verificada',
          body: 'Cada conta prova de quem é o personagem antes de entrar na fila — sem sósia, sem conta emprestada.',
        },
        {
          title: 'Fila por posição',
          body: 'Você entra na posição que joga. O pareamento monta os dois times, a IA do jogo cobre o resto quando falta gente.',
        },
        {
          title: 'Vínculo com Discord',
          body: 'Conta e Discord ligados numa vez só — é por lá que o convite de partida chega.',
        },
      ],
    },
    footer: {
      tagline: 'Matchmaking competitivo e identidade verificada para EA FC Pro Clubs.',
    },
  },
  es: {
    hero: {
      titlePrefix: 'La ',
      titleAccent: 'ProLobby',
      titleSuffix: ' es matchmaking de verdad para tu Pro Clubs',
      subtitle:
        'Registra tu personaje, entra a la cola por posición y te emparejamos con otros jugadores verificados — sin grupo de WhatsApp, sin gente que desaparece a mitad del partido.',
      primaryCta: 'Crear cuenta',
      secondaryCta: 'Entrar',
    },
    features: {
      eyebrow: 'Cómo funciona',
      items: [
        {
          title: 'Identidad verificada',
          body: 'Cada cuenta prueba quién es el personaje antes de entrar a la cola — sin sosias, sin cuenta prestada.',
        },
        {
          title: 'Cola por posición',
          body: 'Entras en la posición que juegas. El emparejamiento arma los dos equipos, la IA del juego cubre el resto si falta gente.',
        },
        {
          title: 'Vínculo con Discord',
          body: 'Cuenta y Discord conectados de una vez — por ahí llega la invitación del partido.',
        },
      ],
    },
    footer: {
      tagline: 'Matchmaking competitivo e identidad verificada para EA FC Pro Clubs.',
    },
  },
}
