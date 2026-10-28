import type { Locale } from './locale'

/** Text for the declared club screen — #229, RF-006. One object per locale. */
export interface ClubContent {
  title: string
  /** What it is for, in one line: a club with room can captain. */
  subtitle: string
  clubNameLabel: string
  clubNameHint: string
  /** Shown in the club plate until a name is typed. */
  namePlaceholder: string
  freeSlotsLabel: string
  freeSlotsHint: string
  /** The seat that means "no room": the club is full. */
  full: string
  /** Accessible name of each seat. */
  seats: (count: number) => string
  /** What the chosen room means for captaincy (RF-006): 4 to 11 humans a side. */
  captaincy: (freeSlots: number | null) => string
  save: string
  saving: string
  remove: string
  removing: string
  saved: string
  removed: string
  /** The API refused the values: out of range, too long, or invisible characters. */
  invalid: string
  error: string
  /** Optional; the queue takes anyone without one. */
  optional: string
}

export const CLUB_CONTENT: Record<Locale, ClubContent> = {
  pt: {
    title: 'Seu clube',
    subtitle: 'Quem declara um clube com vaga pode ser escolhido capitão do lobby.',
    clubNameLabel: 'Nome do clube',
    clubNameHint: 'Como aparece no jogo.',
    namePlaceholder: 'Nome do clube',
    freeSlotsLabel: 'Vagas livres agora',
    freeSlotsHint: 'Quantos jogadores ainda cabem no clube.',
    full: 'Cheio',
    seats: (count) => (count === 1 ? '1 vaga' : `${count} vagas`),
    captaincy: (slots) =>
      slots === null
        ? 'Escolha as vagas pra ver de que lado você pode ser capitão.'
        : slots < 3
          ? 'Com menos de 3 vagas você ainda não é chamado pra capitão: um lado tem pelo menos 4 jogadores.'
          : slots >= 10
            ? 'Você pode ser capitão de qualquer lado, até 11 jogadores.'
            : `Você pode ser capitão de um lado com até ${slots + 1} jogadores.`,
    save: 'Salvar',
    saving: 'Salvando…',
    remove: 'Remover clube',
    removing: 'Removendo…',
    saved: 'Clube salvo.',
    removed: 'Clube removido. Você continua podendo entrar na fila.',
    invalid: 'Confira os campos: nome de 1 a 20 caracteres e vagas de 0 a 10.',
    error: 'Não deu certo agora. Tenta de novo em instantes.',
    optional: 'Opcional: a fila aceita quem não tem clube.',
  },
  es: {
    title: 'Tu club',
    subtitle: 'Quien declara un club con plazas libres puede ser elegido capitán del lobby.',
    clubNameLabel: 'Nombre del club',
    clubNameHint: 'Como aparece en el juego.',
    namePlaceholder: 'Nombre del club',
    freeSlotsLabel: 'Plazas libres ahora',
    freeSlotsHint: 'Cuántos jugadores caben todavía en el club.',
    full: 'Lleno',
    seats: (count) => (count === 1 ? '1 plaza' : `${count} plazas`),
    captaincy: (slots) =>
      slots === null
        ? 'Elige las plazas para ver de qué lado puedes ser capitán.'
        : slots < 3
          ? 'Con menos de 3 plazas todavía no te llaman de capitán: un lado tiene al menos 4 jugadores.'
          : slots >= 10
            ? 'Puedes ser capitán de cualquier lado, hasta 11 jugadores.'
            : `Puedes ser capitán de un lado con hasta ${slots + 1} jugadores.`,
    save: 'Guardar',
    saving: 'Guardando…',
    remove: 'Quitar club',
    removing: 'Quitando…',
    saved: 'Club guardado.',
    removed: 'Club quitado. Sigues pudiendo entrar a la cola.',
    invalid: 'Revisa los campos: nombre de 1 a 20 caracteres y plazas de 0 a 10.',
    error: 'No funcionó ahora. Inténtalo de nuevo en un momento.',
    optional: 'Opcional: la cola acepta a quien no tiene club.',
  },
}
