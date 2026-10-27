import type { Locale } from './locale'

/** Text for the declared club screen — #229, RF-006. One object per locale. */
export interface ClubContent {
  title: string
  /** What it is for, in one line: a club with room can captain. */
  subtitle: string
  clubNameLabel: string
  clubNameHint: string
  freeSlotsLabel: string
  freeSlotsHint: string
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
    clubNameHint: 'Como aparece no jogo. Até 20 caracteres.',
    freeSlotsLabel: 'Vagas livres',
    freeSlotsHint: 'Quantos jogadores ainda cabem no clube agora, de 0 a 10.',
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
    clubNameHint: 'Como aparece en el juego. Hasta 20 caracteres.',
    freeSlotsLabel: 'Plazas libres',
    freeSlotsHint: 'Cuántos jugadores caben todavía en el club ahora, de 0 a 10.',
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
