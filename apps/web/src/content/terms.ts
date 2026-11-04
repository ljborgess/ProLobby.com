import type { Locale } from './locale'

/**
 * The Terms of Use (docs/produto/04-governanca/03-termos.md), first text,
 * 2026-11-03. Written from what the dossier already decided — age, Discord,
 * prints, retention, elo and reputation, punishments, deletion and its two
 * exceptions, where data lives — and marked as a draft: it still goes through
 * a lawyer before the first player outside the team, and the 16-17 question
 * (LGPD art. 14) is open there. No payment exists, so none is described;
 * charging later is a material change that asks everyone to accept again.
 */
export type TermsContent = {
  title: string
  draft: string
  version: (date: string) => string
  sections: { title: string; body: string[] }[]
  /** The dialog on sign-up. */
  close: string
  openPage: string
}

export const TERMS_CONTENT: Record<Locale, TermsContent> = {
  pt: {
    title: 'Termos de Uso',
    draft:
      'Rascunho em revisão jurídica. Descreve o que a plataforma faz hoje e pode mudar antes da abertura; se mudar em algo importante, você será chamado a aceitar de novo.',
    version: (date) => `Versão de ${date}`,
    sections: [
      {
        title: '1. O que é a ProLobby',
        body: [
          'A ProLobby organiza partidas de EA FC Pro Clubs: você cadastra seus personagens, entra na fila pela posição que joga e a plataforma monta os dois times e coordena o encontro pelo Discord.',
          'A partida acontece dentro do jogo, fora da ProLobby. A ProLobby não é da EA, não tem relação com ela e não controla o jogo.',
        ],
      },
      {
        title: '2. Quem pode usar',
        body: [
          'É preciso ter 16 anos ou mais. A idade é calculada pela data de nascimento informada no cadastro; informar uma data falsa é motivo de banimento.',
          'Cada pessoa tem uma conta, com até 5 personagens, um por categoria de posição.',
        ],
      },
      {
        title: '3. Discord',
        body: [
          'Para entrar na fila, sua conta precisa estar vinculada a uma conta do Discord e você precisa estar no servidor da ProLobby, porque é por lá que o convite e os canais da partida chegam.',
          'Do Discord guardamos só o identificador da conta (escopo "identify"). O vínculo não se desfaz por conta própria: trocar de Discord é um pedido à moderação.',
        ],
      },
      {
        title: '4. Verificação dos personagens',
        body: [
          'Cada personagem é verificado por um print da tela do jogo, conferido por leitura automática (OCR) e por moderadores. Enviar print de outra pessoa ou alterado é motivo de banimento.',
        ],
      },
      {
        title: '5. Fila, elo e reputação',
        body: [
          'Você tem um elo por categoria de posição, calculado a partir dos resultados das partidas, e uma reputação de 0 a 100 por conta, que mede conduta.',
          'Recusar ou deixar passar a confirmação de uma partida gera espera progressiva para voltar à fila (5 min, 15 min, 30 min, 2 h), que zera depois de 12 horas sem recusa ou de uma partida completada.',
          'A reputação cai com partida sem resultado reportado e com desconexão confirmada, e sobe com partidas limpas e avaliações de companheiros. Abaixo de 55 a fila fica mais lenta; abaixo de 40 a conta é suspensa por 7 dias; abaixo de 25 é banida.',
        ],
      },
      {
        title: '6. Resultado e contestação',
        body: [
          'O resultado é reportado com print da tela final pelos dois lados. Resultado de um lado só pode ser contestado em até 48 horas; disputas são decididas pela moderação, que pode anular a partida e desfazer elo e reputação dela.',
        ],
      },
      {
        title: '7. Conduta',
        body: [
          'Não é permitido: usar conta ou personagem de outra pessoa, combinar resultado, abandonar partidas de propósito, assediar outros jogadores ou tentar burlar a fila, a verificação ou a plataforma.',
          'A moderação pode suspender ou banir contas. Um banimento continua valendo mesmo que a conta seja excluída.',
        ],
      },
      {
        title: '8. Clube declarado',
        body: [
          'Se você declarar um clube com vagas, pode ser chamado para capitão: ao aceitar, você autoriza que jogadores do seu lado no lobby sejam convidados temporariamente para o seu clube no jogo.',
        ],
      },
      {
        title: '9. Seus dados',
        body: [
          'Coletamos: e-mail, data de nascimento, senha (guardada só como hash), pergunta e resposta de segurança (a resposta só como hash), o identificador do Discord, gamertags e os prints que você envia. Identificadores e prints ficam criptografados.',
          'Os prints são apagados automaticamente em 90 dias. O histórico das partidas (placar, elo e reputação aplicados) não expira, porque é o que sustenta o ranking.',
          'Os dados ficam armazenados no Brasil (São Paulo). O trânsito das requisições passa pela rede da Cloudflare e o e-mail transacional é enviado por um provedor no exterior.',
        ],
      },
      {
        title: '10. Excluir sua conta',
        body: [
          'Você pode pedir a exclusão da conta e dos seus dados. Nas partidas de outras pessoas, você passa a aparecer como "jogador removido", para não apagar o histórico delas.',
          'Duas coisas ficam: se a conta foi banida, uma forma cifrada (hash) do Discord e do gamertag continua na lista de bloqueio, sem dado legível; e, se um dia houver pagamento, o registro fiscal da transação fica pelos 5 anos exigidos por lei.',
        ],
      },
      {
        title: '11. Pagamento',
        body: [
          'Hoje a ProLobby não cobra nada. Se algum pagamento vier a existir, estes Termos mudam antes e você será chamado a aceitar a nova versão.',
        ],
      },
      {
        title: '12. Mudanças nestes Termos',
        body: [
          'Guardamos qual versão você aceitou e quando. Mudança importante exige um novo aceite antes de continuar usando a plataforma.',
        ],
      },
    ],
    close: 'Fechar',
    openPage: 'Abrir em outra aba',
  },
  es: {
    title: 'Términos de Uso',
    draft:
      'Borrador en revisión legal. Describe lo que la plataforma hace hoy y puede cambiar antes de la apertura; si cambia en algo importante, te pediremos aceptar de nuevo.',
    version: (date) => `Versión del ${date}`,
    sections: [
      {
        title: '1. Qué es ProLobby',
        body: [
          'ProLobby organiza partidos de EA FC Pro Clubs: registras tus personajes, entras a la cola por la posición que juegas y la plataforma arma los dos equipos y coordina el encuentro por Discord.',
          'El partido se juega dentro del juego, fuera de ProLobby. ProLobby no es de EA, no tiene relación con ella y no controla el juego.',
        ],
      },
      {
        title: '2. Quién puede usarla',
        body: [
          'Debes tener 16 años o más. La edad se calcula con la fecha de nacimiento del registro; dar una fecha falsa es motivo de expulsión.',
          'Cada persona tiene una cuenta, con hasta 5 personajes, uno por categoría de posición.',
        ],
      },
      {
        title: '3. Discord',
        body: [
          'Para entrar a la cola, tu cuenta debe estar vinculada a una cuenta de Discord y debes estar en el servidor de ProLobby, porque por ahí llegan la invitación y los canales del partido.',
          'De Discord guardamos solo el identificador de la cuenta (alcance "identify"). El vínculo no se deshace por cuenta propia: cambiar de Discord es un pedido a la moderación.',
        ],
      },
      {
        title: '4. Verificación de personajes',
        body: [
          'Cada personaje se verifica con una captura de la pantalla del juego, revisada por lectura automática (OCR) y por moderadores. Enviar la captura de otra persona o una alterada es motivo de expulsión.',
        ],
      },
      {
        title: '5. Cola, elo y reputación',
        body: [
          'Tienes un elo por categoría de posición, calculado con los resultados de los partidos, y una reputación de 0 a 100 por cuenta, que mide la conducta.',
          'Rechazar o dejar pasar la confirmación de un partido genera una espera progresiva para volver a la cola (5 min, 15 min, 30 min, 2 h), que se reinicia tras 12 horas sin rechazos o un partido completado.',
          'La reputación baja con partidos sin resultado reportado y con desconexiones confirmadas, y sube con partidos limpios y valoraciones de compañeros. Debajo de 55 la cola es más lenta; debajo de 40 la cuenta se suspende 7 días; debajo de 25 se expulsa.',
        ],
      },
      {
        title: '6. Resultado y reclamo',
        body: [
          'El resultado lo reportan los dos lados con una captura de la pantalla final. Un resultado de un solo lado puede reclamarse en hasta 48 horas; las disputas las decide la moderación, que puede anular el partido y deshacer su elo y reputación.',
        ],
      },
      {
        title: '7. Conducta',
        body: [
          'No se permite: usar la cuenta o el personaje de otra persona, arreglar resultados, abandonar partidos a propósito, acosar a otros jugadores ni intentar burlar la cola, la verificación o la plataforma.',
          'La moderación puede suspender o expulsar cuentas. Una expulsión sigue valiendo aunque la cuenta se elimine.',
        ],
      },
      {
        title: '8. Club declarado',
        body: [
          'Si declaras un club con plazas, pueden llamarte de capitán: al aceptar, autorizas que jugadores de tu lado del lobby sean invitados temporalmente a tu club en el juego.',
        ],
      },
      {
        title: '9. Tus datos',
        body: [
          'Recopilamos: correo, fecha de nacimiento, contraseña (guardada solo como hash), pregunta y respuesta de seguridad (la respuesta solo como hash), el identificador de Discord, gamertags y las capturas que envías. Los identificadores y las capturas se guardan cifrados.',
          'Las capturas se borran automáticamente a los 90 días. El historial de partidos (marcador, elo y reputación aplicados) no vence, porque es lo que sostiene el ranking.',
          'Los datos se almacenan en Brasil (São Paulo). El tránsito de las solicitudes pasa por la red de Cloudflare y el correo transaccional lo envía un proveedor en el exterior.',
        ],
      },
      {
        title: '10. Eliminar tu cuenta',
        body: [
          'Puedes pedir que se eliminen tu cuenta y tus datos. En los partidos de otras personas pasas a figurar como "jugador eliminado", para no borrar su historial.',
          'Dos cosas quedan: si la cuenta fue expulsada, una forma cifrada (hash) del Discord y del gamertag sigue en la lista de bloqueo, sin datos legibles; y, si algún día hay pagos, el registro fiscal de la transacción queda los 5 años que exige la ley.',
        ],
      },
      {
        title: '11. Pagos',
        body: [
          'Hoy ProLobby no cobra nada. Si algún pago llega a existir, estos Términos cambian antes y te pediremos aceptar la nueva versión.',
        ],
      },
      {
        title: '12. Cambios en estos Términos',
        body: [
          'Guardamos qué versión aceptaste y cuándo. Un cambio importante exige una nueva aceptación antes de seguir usando la plataforma.',
        ],
      },
    ],
    close: 'Cerrar',
    openPage: 'Abrir en otra pestaña',
  },
}
