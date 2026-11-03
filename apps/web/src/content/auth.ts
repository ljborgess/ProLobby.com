import type { Locale } from './locale'

/**
 * Text for the sign-up and sign-in screens — issue #87. One object per
 * locale, so a missing key is a TypeScript error, not a silent blank in
 * production.
 */
export interface AuthContent {
  signUp: {
    title: string
    subtitle: string
    emailLabel: string
    passwordLabel: string
    passwordHint: string
    birthDateLabel: string
    securityQuestionLabel: string
    securityQuestionHint: string
    securityQuestionTooShort: string
    securityAnswerTooShort: string
    securityAnswerLabel: string
    acceptTerms: string
    submit: string
    submitting: string
    switchToSignIn: string
    genericError: string
    fieldRequired: string
    emailInvalid: string
    passwordTooShort: string
    ageTooYoung: string
    accessGroup: string
    recoveryGroup: string
    /** Why the birth date is asked, under the field. */
    birthDateHint: string
    /** Ready-made security questions (RF-019 takes any text of 8 to 200). */
    securityQuestionPick: string
    /** Under the ready-made list: what the question is for (no length rule to state). */
    securityQuestionWhy: string
    securityQuestions: string[]
    securityQuestionCustom: string
    securityQuestionCustomLabel: string
    /** One announcement for a failed submit, instead of one per field. */
    errorSummary: (count: number) => string
    /** The screen after sending: the same for a new and a taken address (RF-070). */
    sentTitle: string
    sentTo: (email: string) => string
    sentSpam: string
    sentWrongEmail: string
    nextStepsTitle: string
    nextSteps: string[]
  }
  signIn: {
    title: string
    subtitle: string
    emailLabel: string
    passwordLabel: string
    submit: string
    submitting: string
    switchToSignUp: string
    invalidCredentials: string
    networkError: string
  }
  signOut: {
    submit: string
    submitting: string
    /** Só a API encerra a sessão; sem resposta dela a pessoa continua logada. */
    failed: string
  }
  forgotPassword: {
    linkLabel: string
    title: string
    subtitle: string
    emailLabel: string
    submit: string
    submitting: string
    sent: string
    backToSignIn: string
  }
  resetPassword: {
    title: string
    subtitle: string
    passwordLabel: string
    passwordHint: string
    submit: string
    submitting: string
    success: string
    invalidToken: string
    requestNew: string
    genericError: string
    goToSignIn: string
  }
  verifyEmail: {
    title: string
    verifying: string
    success: string
    invalidToken: string
    requestNew: string
    genericError: string
    goToSignIn: string
  }
  languageSwitcher: {
    label: string
  }
  /** Name of the eye button in a password field; its state goes in aria-pressed. */
  revealPassword: string
}

export const AUTH_CONTENT: Record<Locale, AuthContent> = {
  pt: {
    signUp: {
      title: 'Criar conta',
      subtitle: 'Verificação por print, fila por posição, partida de verdade.',
      emailLabel: 'E-mail',
      passwordLabel: 'Senha',
      passwordHint: 'Mínimo de 12 caracteres.',
      birthDateLabel: 'Data de nascimento',
      securityQuestionLabel: 'Pergunta de segurança',
      securityQuestionHint:
        'Mínimo de 8 caracteres. Usada se você perder o e-mail e o Discord ao mesmo tempo.',
      securityQuestionTooShort: 'A pergunta precisa de pelo menos 8 caracteres.',
      securityAnswerTooShort: 'A resposta precisa de pelo menos 2 caracteres.',
      securityAnswerLabel: 'Resposta',
      acceptTerms: 'Li e aceito os Termos de Uso.',
      submit: 'Criar conta',
      submitting: 'Criando conta…',
      switchToSignIn: 'Já tem conta? Entrar',
      genericError: 'Não deu pra criar a conta agora. Tenta de novo em instantes.',
      fieldRequired: 'Preenche este campo.',
      emailInvalid: 'Esse e-mail não parece válido.',
      passwordTooShort: 'Precisa de pelo menos 12 caracteres.',
      ageTooYoung: 'É preciso ter 16 anos ou mais.',
      accessGroup: 'Acesso',
      recoveryGroup: 'Recuperação da conta',
      birthDateHint: 'Só pra confirmar que você tem 16 anos ou mais.',
      securityQuestionPick: 'Escolha uma pergunta',
      securityQuestionWhy: 'Usada se você perder o e-mail e o Discord ao mesmo tempo.',
      securityQuestions: [
        'Qual era o nome do seu primeiro animal de estimação?',
        'Em que cidade seus pais se conheceram?',
        'Qual o nome da rua onde você cresceu?',
        'Qual foi o primeiro jogo que você zerou?',
        'Qual apelido só a sua família usa?',
      ],
      securityQuestionCustom: 'Escrever a minha',
      securityQuestionCustomLabel: 'Sua pergunta',
      errorSummary: (count) =>
        count === 1 ? '1 campo precisa de ajuste.' : `${count} campos precisam de ajuste.`,
      sentTitle: 'Confira seu e-mail',
      sentTo: (email) =>
        `Se estiver tudo certo, o link de confirmação chega em ${email} em alguns minutos.`,
      sentSpam:
        'Não chegou? Olha o spam e a aba Promoções. Depois de entrar, dá pra pedir outro na sua conta.',
      sentWrongEmail: 'Errei o e-mail',
      nextStepsTitle: 'Depois do e-mail',
      nextSteps: ['Confirmar o e-mail', 'Vincular o Discord', 'Mandar o print do seu personagem'],
    },
    signIn: {
      title: 'Entrar',
      subtitle: 'Continue de onde parou.',
      emailLabel: 'E-mail',
      passwordLabel: 'Senha',
      submit: 'Entrar',
      submitting: 'Entrando…',
      switchToSignUp: 'Não tem conta? Criar agora',
      invalidCredentials: 'E-mail ou senha incorretos.',
      networkError: 'Não deu pra entrar agora. Confere a conexão e tenta de novo.',
    },
    signOut: {
      submit: 'Sair da conta',
      submitting: 'Saindo…',
      failed: 'Não deu pra sair agora. Você continua logado — tenta de novo.',
    },
    forgotPassword: {
      linkLabel: 'Esqueci minha senha',
      title: 'Redefinir senha',
      subtitle: 'Mandamos um link de redefinição para o seu e-mail.',
      emailLabel: 'E-mail',
      submit: 'Enviar link',
      submitting: 'Enviando…',
      sent: 'Se esse e-mail tiver conta, enviamos um link com as instruções.',
      backToSignIn: 'Voltar para entrar',
    },
    resetPassword: {
      title: 'Nova senha',
      subtitle: 'Escolhe uma senha nova para a sua conta.',
      passwordLabel: 'Nova senha',
      passwordHint: 'Mínimo de 12 caracteres.',
      submit: 'Salvar nova senha',
      submitting: 'Salvando…',
      success: 'Senha redefinida. Já dá pra entrar com ela.',
      invalidToken: 'Esse link não é mais válido. Pede um novo link de redefinição.',
      requestNew: 'Pedir novo link',
      genericError: 'Não deu pra redefinir agora. Tenta de novo em instantes.',
      goToSignIn: 'Ir para o login',
    },
    verifyEmail: {
      title: 'Verificação de e-mail',
      verifying: 'Verificando…',
      success: 'E-mail verificado. Já dá pra entrar na fila.',
      invalidToken: 'Esse link não é mais válido. Pede um novo na sua conta.',
      requestNew: 'Pedir um novo e-mail',
      genericError: 'Não deu pra verificar agora. Tenta de novo em instantes.',
      goToSignIn: 'Ir para o login',
    },
    languageSwitcher: {
      label: 'Idioma',
    },
    revealPassword: 'Mostrar senha',
  },
  es: {
    signUp: {
      title: 'Crear cuenta',
      subtitle: 'Verificación por captura, cola por posición, partido de verdad.',
      emailLabel: 'Correo electrónico',
      passwordLabel: 'Contraseña',
      passwordHint: 'Mínimo 12 caracteres.',
      birthDateLabel: 'Fecha de nacimiento',
      securityQuestionLabel: 'Pregunta de seguridad',
      securityQuestionHint:
        'Mínimo 8 caracteres. Se usa si pierdes el correo y Discord al mismo tiempo.',
      securityQuestionTooShort: 'La pregunta necesita al menos 8 caracteres.',
      securityAnswerTooShort: 'La respuesta necesita al menos 2 caracteres.',
      securityAnswerLabel: 'Respuesta',
      acceptTerms: 'Leí y acepto los Términos de Uso.',
      submit: 'Crear cuenta',
      submitting: 'Creando cuenta…',
      switchToSignIn: '¿Ya tienes cuenta? Entrar',
      genericError: 'No se pudo crear la cuenta ahora. Intenta de nuevo en un momento.',
      fieldRequired: 'Completa este campo.',
      emailInvalid: 'Ese correo no parece válido.',
      passwordTooShort: 'Necesita al menos 12 caracteres.',
      ageTooYoung: 'Debes tener 16 años o más.',
      accessGroup: 'Acceso',
      recoveryGroup: 'Recuperación de la cuenta',
      birthDateHint: 'Solo para confirmar que tienes 16 años o más.',
      securityQuestionPick: 'Elige una pregunta',
      securityQuestionWhy: 'Se usa si pierdes el correo y Discord al mismo tiempo.',
      securityQuestions: [
        '¿Cómo se llamaba tu primera mascota?',
        '¿En qué ciudad se conocieron tus padres?',
        '¿Cómo se llama la calle donde creciste?',
        '¿Cuál fue el primer juego que terminaste?',
        '¿Qué apodo usa solo tu familia?',
      ],
      securityQuestionCustom: 'Escribir la mía',
      securityQuestionCustomLabel: 'Tu pregunta',
      errorSummary: (count) =>
        count === 1 ? '1 campo necesita ajuste.' : `${count} campos necesitan ajuste.`,
      sentTitle: 'Revisa tu correo',
      sentTo: (email) =>
        `Si todo está bien, el enlace de confirmación llega a ${email} en unos minutos.`,
      sentSpam:
        '¿No llegó? Revisa el spam y la pestaña Promociones. Después de entrar, puedes pedir otro desde tu cuenta.',
      sentWrongEmail: 'Me equivoqué de correo',
      nextStepsTitle: 'Después del correo',
      nextSteps: ['Confirmar el correo', 'Vincular Discord', 'Enviar la captura de tu personaje'],
    },
    signIn: {
      title: 'Entrar',
      subtitle: 'Continúa donde lo dejaste.',
      emailLabel: 'Correo electrónico',
      passwordLabel: 'Contraseña',
      submit: 'Entrar',
      submitting: 'Entrando…',
      switchToSignUp: '¿No tienes cuenta? Crear ahora',
      invalidCredentials: 'Correo o contraseña incorrectos.',
      networkError: 'No se pudo entrar ahora. Revisa la conexión e intenta de nuevo.',
    },
    signOut: {
      submit: 'Cerrar sesión',
      submitting: 'Saliendo…',
      failed: 'No se pudo cerrar la sesión. Sigues conectado — intenta de nuevo.',
    },
    forgotPassword: {
      linkLabel: 'Olvidé mi contraseña',
      title: 'Restablecer contraseña',
      subtitle: 'Enviamos un enlace de restablecimiento a tu correo.',
      emailLabel: 'Correo electrónico',
      submit: 'Enviar enlace',
      submitting: 'Enviando…',
      sent: 'Si ese correo tiene cuenta, enviamos un enlace con las instrucciones.',
      backToSignIn: 'Volver a entrar',
    },
    resetPassword: {
      title: 'Nueva contraseña',
      subtitle: 'Elige una contraseña nueva para tu cuenta.',
      passwordLabel: 'Nueva contraseña',
      passwordHint: 'Mínimo 12 caracteres.',
      submit: 'Guardar nueva contraseña',
      submitting: 'Guardando…',
      success: 'Contraseña restablecida. Ya puedes entrar con ella.',
      invalidToken: 'Ese enlace ya no es válido. Pide un nuevo enlace de restablecimiento.',
      requestNew: 'Pedir un nuevo enlace',
      genericError: 'No se pudo restablecer ahora. Intenta de nuevo en un momento.',
      goToSignIn: 'Ir al login',
    },
    verifyEmail: {
      title: 'Verificación de correo',
      verifying: 'Verificando…',
      success: 'Correo verificado. Ya puedes entrar en la cola.',
      invalidToken: 'Ese enlace ya no es válido. Pide uno nuevo desde tu cuenta.',
      requestNew: 'Pedir un nuevo correo',
      genericError: 'No se pudo verificar ahora. Intenta de nuevo en un momento.',
      goToSignIn: 'Ir al login',
    },
    languageSwitcher: {
      label: 'Idioma',
    },
    revealPassword: 'Mostrar contraseña',
  },
}
