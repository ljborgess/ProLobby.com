import type { Locale } from './locale'

/**
 * Text for the public landing (`(public)/page.tsx`) — issue #171 redesign of
 * 2026-09-22, extended the same day with a top bar, a facts strip, a
 * position grid and a solo-queue spotlight (structure borrowed from
 * gamersclub.com.br's top bar / "só no mês passado" / "modos de jogo" /
 * "partidas GC solo" at the user's request — see docs/produto/01-visao/01-visao.md).
 *
 * `facts` deliberately holds no invented traction (no "jogadores online" —
 * Fase 2.3 has no queue yet): every value is a real, already-decided spec
 * number (RF-009's 30 s, the 5 position categories, the pt/es locale count).
 */
export interface LandingContent {
  topBar: {
    cta: string
    signIn: string
    /** With a session: the one door, back into the account. */
    account: string
    /** Short labels for the top bar ticker — same real facts as `facts.items`, tightened for a small badge instead of a full strip. */
    ticker: { value: string; label: string }[]
  }
  hero: {
    titlePrefix: string
    titleAccent: string
    titleSuffix: string
    subtitle: string
    /** Under the hero's squad drawing: what the five shirts are. */
    squadCaption: string
  }
  facts: {
    eyebrow: string
    items: { value: string; label: string }[]
  }
  positions: {
    eyebrow: string
    title: string
    body: string
    items: string[]
  }
  soloQueue: {
    eyebrow: string
    title: string
    body: string
  }
  features: {
    eyebrow: string
    items: { title: string; body: string }[]
  }
  footer: {
    tagline: string
  }
  /**
   * The broadcast frame (2026-10-29): the plates a matchday transmission puts
   * on screen. Pre-match, never "live": no match is running on this page.
   */
  broadcast: {
    stage: string
    clockLabel: string
    lineup: string
    example: string
    tactical: string
    replay: string
    finalWhistle: string
  }
  /** The page's close, before the footer: the one place the offer is repeated. */
  closing: {
    title: string
    body: string
    cta: string
    signIn: string
    /** With a session: straight to the queue. */
    signedInCta: string
  }
  /**
   * The queue board — the lineup view a lobby fills into. Labelled as an
   * example on purpose: it is a drawn representation, not live data, and the
   * queue itself is Fase 2.5.
   */
  queueBoard: {
    title: string
    formation: string
    example: string
    filled: string
    waiting: string
  }
  /** The art panel beside the sign-in and sign-up forms (`AuthLayout`). */
  authAside: {
    signIn: { title: string; body: string }
    signUp: { title: string; body: string }
  }
}

export const LANDING_CONTENT: Record<Locale, LandingContent> = {
  pt: {
    topBar: {
      cta: 'Criar conta',
      signIn: 'Entrar',
      account: 'Minha conta',
      ticker: [
        { value: '5', label: 'posições' },
        { value: '30s', label: 'de fila' },
        { value: '11v11', label: 'por partida' },
        { value: 'PT/ES', label: '' },
      ],
    },
    hero: {
      titlePrefix: 'A ',
      titleAccent: 'ProLobby',
      titleSuffix: ' é matchmaking de verdade pro seu Pro Clubs',
      subtitle:
        'Cadastra seu personagem, entra na fila por posição e é pareado com outros jogadores verificados — sem grupo de WhatsApp, sem gente sumida no meio do jogo.',
      squadCaption: 'Um personagem por posição, cada um verificado por print do jogo.',
    },
    facts: {
      eyebrow: 'O que já está decidido',
      items: [
        { value: '5', label: 'categorias de posição' },
        { value: '30s', label: 'pra confirmar a fila' },
        { value: '11v11', label: 'humano + IA do jogo cobre o resto' },
        { value: '2', label: 'idiomas — pt e es' },
      ],
    },
    positions: {
      eyebrow: 'Fila por posição',
      title: 'Você entra na posição que joga de verdade',
      body: 'Cada personagem tem categoria fixa e elo próprio — desempenho de goleiro não vira elo de atacante. Até 5 personagens por conta, um por categoria.',
      items: ['Goleiro', 'Zaga', 'Meio', 'Ponta', 'Ataque'],
    },
    soloQueue: {
      eyebrow: 'Entra sozinho, sai com time',
      title: 'Sem grupo de amigo pra fechar 11',
      body: 'A fila pareia sua categoria com quem também entrou sozinho. Faltou gente? A IA do jogo cobre o resto — o jogo continua, ninguém fica esperando um 11º jogador que nunca chega.',
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
    broadcast: {
      stage: 'Pré-jogo',
      clockLabel: 'pra confirmar a fila',
      lineup: 'Escalação',
      example: 'exemplo',
      tactical: 'Câmera tática',
      replay: 'Replay',
      finalWhistle: 'Apito final',
    },
    closing: {
      title: 'Pronto pra entrar em campo?',
      body: 'Cria a conta, cadastra o personagem da sua posição e entra na fila. A partida é no jogo; o resto a ProLobby coordena.',
      cta: 'Criar minha conta',
      signIn: 'Já tenho conta',
      signedInCta: 'Ir pra fila',
    },
    queueBoard: {
      title: 'Lobby',
      formation: '4-3-3',
      example: 'Exemplo de como o lobby fecha',
      filled: 'confirmado',
      waiting: 'na fila',
    },
    authAside: {
      signIn: {
        title: 'A fila lembra de você',
        body: 'Sua posição, seu elo e seu vínculo do Discord continuam onde estavam.',
      },
      signUp: {
        title: 'Uma conta, cinco personagens',
        body: 'Um por categoria de posição, cada um com elo próprio. Verificação antes da primeira fila.',
      },
    },
  },
  es: {
    topBar: {
      cta: 'Crear cuenta',
      signIn: 'Entrar',
      account: 'Mi cuenta',
      ticker: [
        { value: '5', label: 'posiciones' },
        { value: '30s', label: 'de cola' },
        { value: '11v11', label: 'por partido' },
        { value: 'PT/ES', label: '' },
      ],
    },
    hero: {
      titlePrefix: 'La ',
      titleAccent: 'ProLobby',
      titleSuffix: ' es matchmaking de verdad para tu Pro Clubs',
      subtitle:
        'Registra tu personaje, entra a la cola por posición y te emparejamos con otros jugadores verificados — sin grupo de WhatsApp, sin gente que desaparece a mitad del partido.',
      squadCaption: 'Un personaje por posición, cada uno verificado con una captura del juego.',
    },
    facts: {
      eyebrow: 'Lo que ya está decidido',
      items: [
        { value: '5', label: 'categorías de posición' },
        { value: '30s', label: 'para confirmar la cola' },
        { value: '11v11', label: 'humano + la IA del juego cubre el resto' },
        { value: '2', label: 'idiomas — pt y es' },
      ],
    },
    positions: {
      eyebrow: 'Cola por posición',
      title: 'Entras en la posición que juegas de verdad',
      body: 'Cada personaje tiene categoría fija y elo propio — el desempeño de arquero no se vuelve elo de delantero. Hasta 5 personajes por cuenta, uno por categoría.',
      items: ['Arquero', 'Defensa', 'Mediocampo', 'Extremo', 'Delantero'],
    },
    soloQueue: {
      eyebrow: 'Entras solo, sales con equipo',
      title: 'Sin grupo de amigos para completar 11',
      body: 'La cola empareja tu categoría con quien también entró solo. ¿Faltó gente? La IA del juego cubre el resto — el partido continúa, nadie espera un 11° jugador que nunca llega.',
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
    broadcast: {
      stage: 'Previa',
      clockLabel: 'para confirmar la cola',
      lineup: 'Alineación',
      example: 'ejemplo',
      tactical: 'Cámara táctica',
      replay: 'Repetición',
      finalWhistle: 'Pitazo final',
    },
    closing: {
      title: '¿Listo para salir a la cancha?',
      body: 'Crea la cuenta, registra el personaje de tu posición y entra a la cola. El partido es en el juego; del resto se encarga ProLobby.',
      cta: 'Crear mi cuenta',
      signIn: 'Ya tengo cuenta',
      signedInCta: 'Ir a la cola',
    },
    queueBoard: {
      title: 'Lobby',
      formation: '4-3-3',
      example: 'Ejemplo de cómo se cierra el lobby',
      filled: 'confirmado',
      waiting: 'en la cola',
    },
    authAside: {
      signIn: {
        title: 'La cola se acuerda de ti',
        body: 'Tu posición, tu elo y tu vínculo de Discord siguen donde estaban.',
      },
      signUp: {
        title: 'Una cuenta, cinco personajes',
        body: 'Uno por categoría de posición, cada uno con su propio elo. Verificación antes de la primera cola.',
      },
    },
  },
}
