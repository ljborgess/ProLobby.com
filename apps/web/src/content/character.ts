import type { Locale } from './locale'

export type CharacterCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'winger' | 'striker'
export type Platform = 'ps5' | 'xbox_series' | 'pc'
export type WizardStep = 'category' | 'archetype' | 'platform' | 'gamertag' | 'confirm'
export type PrintRejection =
  | 'invalid_format'
  | 'image_too_small'
  | 'print_already_used'
  | 'gamertag_mismatch'
  | 'gamertag_unavailable'
  | 'archetype_mismatch'
  | 'not_active_archetype'
  | 'unreadable'

/**
 * Text for `/account/character` — issue #196. Archetype names stay as the game
 * shows them (`MAESTRO`, `SPARK`): that is what the player sees on the screen
 * they will photograph, in any language.
 */
export interface CharacterContent {
  title: string
  subtitle: string
  categories: Record<CharacterCategory, string>
  /** The three-letter code a squad sheet prints above each slot. */
  categoryCodes: Record<CharacterCategory, string>
  platforms: Record<Platform, string>
  roster: {
    heading: string
    count: (filled: number, total: number) => string
    claim: string
    formHeading: string
    cancel: string
    free: string
    freeHint: string
    legendReview: string
    legendPending: string
    replace: string
  }
  form: {
    categoryLabel: string
    archetypeLabel: string
    archetypeHint: string
    platformLabel: string
    gamertagLabel: string
    gamertagHint: string
    nameLabel: string
    nameHint: string
    choose: string
    submit: string
    submitting: string
    fieldRequired: string
    gamertagInvalid: string
    mismatch: string
    categoryTaken: string
    gamertagLocked: string
    nameInvalid: string
    createLimit: string
    genericError: string
    /** Step names on the rail; the questions are what each step asks. */
    steps: Record<WizardStep, string>
    questions: Record<WizardStep, string>
    stepOf: (step: number, total: number) => string
    next: string
    back: string
    create: string
    change: string
    replaces: string
    archetypeFor: (category: string) => string
    previewCaption: string
  }
  print: {
    heading: string
    instructions: [string, string, string]
    exampleCaption: string
    exampleGamertag: string
    fileLabel: string
    fileHint: string
    submit: string
    submitting: string
    received: string
    rejections: Record<PrintRejection, string>
    uploadLimit: (minutes: number) => string
    tooLarge: string
    fileRequired: string
    cancel: string
    backToList: string
    activeConfirm: string
    activeConfirmRequired: string
    cooldown: (hours: number) => string
    inReview: string
    genericError: string
  }
  existing: {
    heading: string
    pending: string
    rejectedShort: string
    verified: string
    inReview: string
    rejectedPrefix: string
    sendPrint: string
    sendAgain: string
    newCharacter: string
  }
  back: string
}

export const CHARACTER_CONTENT: Record<Locale, CharacterContent> = {
  pt: {
    title: 'Seu personagem',
    subtitle:
      'Escolha a categoria em que você joga e o arquétipo do seu Pro. Depois, mande o print da tela de arquétipos pra gente conferir.',
    categories: {
      goalkeeper: 'Goleiro',
      defender: 'Zaga/Lateral',
      midfielder: 'Meio-campo',
      winger: 'Ponta',
      striker: 'Ataque',
    },
    platforms: { ps5: 'PlayStation 5', xbox_series: 'Xbox Series', pc: 'PC' },
    categoryCodes: {
      goalkeeper: 'GOL',
      defender: 'ZAG',
      midfielder: 'MEI',
      winger: 'PON',
      striker: 'ATA',
    },
    roster: {
      heading: 'Seu elenco',
      count: (filled, total) => `${filled}/${total} vagas`,
      claim: 'Cadastrar',
      formHeading: 'Novo personagem',
      cancel: 'Cancelar',
      free: 'Vaga livre',
      freeHint:
        'Ninguém nessa posição ainda. Cadastre um personagem e mande o print pra ele entrar em campo.',
      legendReview: 'Print em análise',
      legendPending: 'Esperando print',
      replace: 'Trocar personagem',
    },
    form: {
      categoryLabel: 'Categoria',
      archetypeLabel: 'Arquétipo',
      archetypeHint: 'Só aparecem os arquétipos que combinam com a categoria.',
      platformLabel: 'Plataforma',
      gamertagLabel: 'Gamertag nessa plataforma',
      gamertagHint: 'Exatamente como aparece no jogo, embaixo do nome do arquétipo.',
      nameLabel: 'Nome do personagem (opcional)',
      nameHint: 'Só pra você identificar. Pode trocar quando quiser.',
      choose: 'Escolha…',
      submit: 'Continuar',
      submitting: 'Salvando…',
      fieldRequired: 'Preencha este campo.',
      gamertagInvalid: 'Use de 3 a 20 caracteres: letras, números, espaço e _ . # -',
      mismatch: 'Esse arquétipo não combina com a categoria escolhida.',
      categoryTaken: 'Você já tem um personagem ativo nessa categoria.',
      gamertagLocked:
        'Seu gamertag nessa plataforma já foi verificado. Pra trocar, abra um chamado com a moderação.',
      nameInvalid: 'Use só letras, números, espaço e . _ -',
      createLimit: 'Você cadastrou muitos personagens nesta hora. Tenta de novo mais tarde.',
      genericError: 'Não deu pra salvar agora. Tenta de novo em instantes.',
      steps: {
        category: 'Posição',
        archetype: 'Arquétipo',
        platform: 'Plataforma',
        gamertag: 'Gamertag',
        confirm: 'Confirmar',
      },
      questions: {
        category: 'Em que posição você joga?',
        archetype: 'Qual é o arquétipo do seu Pro?',
        platform: 'Em que plataforma você joga?',
        gamertag: 'Como você aparece no jogo?',
        confirm: 'Confere e entra no elenco',
      },
      stepOf: (step, total) => `Etapa ${step} de ${total}`,
      next: 'Próximo',
      back: 'Voltar',
      create: 'Cadastrar personagem',
      change: 'Alterar',
      replaces: 'Substitui o atual',
      archetypeFor: (category) => `Os arquétipos que combinam com ${category}.`,
      previewCaption:
        'É assim que o card aparece na tela de arquétipos. O print precisa mostrar esse nome.',
    },
    print: {
      heading: 'Mande o print da tela de arquétipos',
      instructions: [
        'Abra o arquétipo ativo, o que tem ✓ do lado do nome.',
        'Mande o screenshot do console (botão de compartilhar ou app PlayStation/Xbox). Se for foto da TV: tela inteira, reta e sem reflexo.',
        'Não recorte nem edite a imagem.',
      ],
      exampleCaption:
        'Exemplo: arquétipo ativo aberto, com o ✓ do lado do nome e o seu gamertag embaixo do card.',
      exampleGamertag: 'SeuGamertag',
      fileLabel: 'Print (JPG, PNG ou WEBP, até 10 MB)',
      fileHint: 'No celular, dá pra escolher da galeria.',
      submit: 'Enviar print',
      submitting: 'Enviando…',
      received:
        'Recebemos o print. A moderação confere e o personagem aparece como verificado nos seus próximos passos.',
      rejections: {
        invalid_format: 'Esse arquivo não é uma imagem JPG, PNG ou WEBP. Manda o print de novo.',
        image_too_small:
          'A imagem está pequena demais pra ler. Manda o screenshot do console ou uma foto mais de perto.',
        print_already_used:
          'Esse print já foi enviado antes. Tira um print novo da tela de arquétipos.',
        gamertag_mismatch:
          'O gamertag no card não é o que você informou. Confere se o print é da sua conta e se o gamertag está escrito igual.',
        gamertag_unavailable:
          'Esse gamertag não pode ser verificado nesta conta. Se ele é seu, abra um chamado com a moderação.',
        archetype_mismatch:
          'O arquétipo do print não combina com a categoria escolhida. Cadastre o personagem na categoria certa.',
        not_active_archetype:
          'O arquétipo aberto no print não é o ativo. Abra o arquétipo que tem o ✓ do lado do nome e tire outro print.',
        unreadable:
          'Não deu pra ler o print. Manda a tela de arquétipos inteira, nítida, sem corte.',
      },
      uploadLimit: (minutes) =>
        `Você chegou no limite de envios desta hora. Tenta de novo em ${minutes} min.`,
      tooLarge: 'O arquivo passa de 10 MB. Manda um print menor.',
      fileRequired: 'Escolha o print antes de enviar.',
      cancel: 'Voltar',
      backToList: 'Voltar pros meus personagens',
      activeConfirm: 'O arquétipo aberto no print é o meu ativo (o que tem o ✓ do lado do nome).',
      activeConfirmRequired: 'Confirme que o arquétipo aberto no print é o seu ativo.',
      cooldown: (hours) =>
        `Este personagem foi verificado há pouco. Dá pra mandar outro print em ${hours} h.`,
      inReview: 'Já tem um print deste personagem em análise. Espere a moderação decidir.',
      genericError: 'Não deu pra enviar agora. Tenta de novo em instantes.',
    },
    existing: {
      heading: 'Seus personagens',
      pending: 'Aguardando print',
      rejectedShort: 'Print recusado',
      verified: 'Verificado',
      inReview: 'Print em análise pela moderação',
      rejectedPrefix: 'Print recusado:',
      sendPrint: 'Enviar print',
      sendAgain: 'Enviar de novo',
      newCharacter: 'Cadastrar outro personagem',
    },
    back: 'Próximos passos',
  },
  es: {
    title: 'Tu personaje',
    subtitle:
      'Elige la categoría en la que juegas y el arquetipo de tu Pro. Después, envía la captura de la pantalla de arquetipos para que la revisemos.',
    categories: {
      goalkeeper: 'Portero',
      defender: 'Defensa/Lateral',
      midfielder: 'Mediocampo',
      winger: 'Extremo',
      striker: 'Delantero',
    },
    platforms: { ps5: 'PlayStation 5', xbox_series: 'Xbox Series', pc: 'PC' },
    categoryCodes: {
      goalkeeper: 'POR',
      defender: 'DEF',
      midfielder: 'MED',
      winger: 'EXT',
      striker: 'DEL',
    },
    roster: {
      heading: 'Tu plantilla',
      count: (filled, total) => `${filled}/${total} plazas`,
      claim: 'Registrar',
      formHeading: 'Nuevo personaje',
      cancel: 'Cancelar',
      free: 'Plaza libre',
      freeHint:
        'Nadie en esta posición todavía. Registra un personaje y envía la captura para que entre en el campo.',
      legendReview: 'Captura en revisión',
      legendPending: 'Esperando captura',
      replace: 'Cambiar personaje',
    },
    form: {
      categoryLabel: 'Categoría',
      archetypeLabel: 'Arquetipo',
      archetypeHint: 'Solo aparecen los arquetipos que encajan con la categoría.',
      platformLabel: 'Plataforma',
      gamertagLabel: 'Gamertag en esa plataforma',
      gamertagHint: 'Exactamente como aparece en el juego, debajo del nombre del arquetipo.',
      nameLabel: 'Nombre del personaje (opcional)',
      nameHint: 'Solo para que lo identifiques. Puedes cambiarlo cuando quieras.',
      choose: 'Elige…',
      submit: 'Continuar',
      submitting: 'Guardando…',
      fieldRequired: 'Completa este campo.',
      gamertagInvalid: 'Usa de 3 a 20 caracteres: letras, números, espacio y _ . # -',
      mismatch: 'Ese arquetipo no encaja con la categoría elegida.',
      categoryTaken: 'Ya tienes un personaje activo en esa categoría.',
      gamertagLocked:
        'Tu gamertag en esa plataforma ya fue verificado. Para cambiarlo, abre un caso con la moderación.',
      nameInvalid: 'Usa solo letras, números, espacio y . _ -',
      createLimit: 'Registraste muchos personajes en esta hora. Intenta de nuevo más tarde.',
      genericError: 'No se pudo guardar ahora. Intenta de nuevo en un momento.',
      steps: {
        category: 'Posición',
        archetype: 'Arquetipo',
        platform: 'Plataforma',
        gamertag: 'Gamertag',
        confirm: 'Confirmar',
      },
      questions: {
        category: '¿En qué posición juegas?',
        archetype: '¿Cuál es el arquetipo de tu Pro?',
        platform: '¿En qué plataforma juegas?',
        gamertag: '¿Cómo apareces en el juego?',
        confirm: 'Revisa y entra en la plantilla',
      },
      stepOf: (step, total) => `Paso ${step} de ${total}`,
      next: 'Siguiente',
      back: 'Volver',
      create: 'Registrar personaje',
      change: 'Cambiar',
      replaces: 'Reemplaza al actual',
      archetypeFor: (category) => `Los arquetipos que encajan con ${category}.`,
      previewCaption:
        'Así aparece la tarjeta en la pantalla de arquetipos. La captura tiene que mostrar ese nombre.',
    },
    print: {
      heading: 'Envía la captura de la pantalla de arquetipos',
      instructions: [
        'Abre el arquetipo activo, el que tiene ✓ junto al nombre.',
        'Envía la captura de la consola (botón de compartir o app de PlayStation/Xbox). Si es una foto de la TV: pantalla completa, derecha y sin reflejos.',
        'No recortes ni edites la imagen.',
      ],
      exampleCaption:
        'Ejemplo: arquetipo activo abierto, con el ✓ junto al nombre y tu gamertag debajo de la carta.',
      exampleGamertag: 'TuGamertag',
      fileLabel: 'Captura (JPG, PNG o WEBP, hasta 10 MB)',
      fileHint: 'En el celular, puedes elegirla de la galería.',
      submit: 'Enviar captura',
      submitting: 'Enviando…',
      received:
        'Recibimos la captura. La moderación la revisa y el personaje aparece como verificado en tus próximos pasos.',
      rejections: {
        invalid_format: 'Ese archivo no es una imagen JPG, PNG o WEBP. Envía la captura de nuevo.',
        image_too_small:
          'La imagen es demasiado pequeña para leerla. Envía la captura de la consola o una foto más de cerca.',
        print_already_used:
          'Esa captura ya fue enviada antes. Saca una captura nueva de la pantalla de arquetipos.',
        gamertag_mismatch:
          'El gamertag de la carta no es el que informaste. Revisa que la captura sea de tu cuenta y que el gamertag esté escrito igual.',
        gamertag_unavailable:
          'Ese gamertag no puede verificarse en esta cuenta. Si es tuyo, abre un caso con la moderación.',
        archetype_mismatch:
          'El arquetipo de la captura no encaja con la categoría elegida. Registra el personaje en la categoría correcta.',
        not_active_archetype:
          'El arquetipo abierto en la captura no es el activo. Abre el arquetipo que tiene el ✓ junto al nombre y saca otra captura.',
        unreadable:
          'No se pudo leer la captura. Envía la pantalla de arquetipos completa, nítida y sin recortes.',
      },
      uploadLimit: (minutes) =>
        `Llegaste al límite de envíos de esta hora. Intenta de nuevo en ${minutes} min.`,
      tooLarge: 'El archivo supera los 10 MB. Envía una captura más liviana.',
      fileRequired: 'Elige la captura antes de enviar.',
      cancel: 'Volver',
      backToList: 'Volver a mis personajes',
      activeConfirm:
        'El arquetipo abierto en la captura es mi activo (el que tiene el ✓ junto al nombre).',
      activeConfirmRequired: 'Confirma que el arquetipo abierto en la captura es tu activo.',
      cooldown: (hours) =>
        `Este personaje se verificó hace poco. Podrás enviar otra captura en ${hours} h.`,
      inReview:
        'Ya hay una captura de este personaje en revisión. Espera la decisión de la moderación.',
      genericError: 'No se pudo enviar ahora. Intenta de nuevo en un momento.',
    },
    existing: {
      heading: 'Tus personajes',
      pending: 'Esperando captura',
      rejectedShort: 'Captura rechazada',
      verified: 'Verificado',
      inReview: 'Captura en revisión por la moderación',
      rejectedPrefix: 'Captura rechazada:',
      sendPrint: 'Enviar captura',
      sendAgain: 'Enviar de nuevo',
      newCharacter: 'Registrar otro personaje',
    },
    back: 'Próximos pasos',
  },
}
