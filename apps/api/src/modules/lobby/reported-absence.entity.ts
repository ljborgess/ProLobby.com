import { Entity, ManyToOne, Opt, PrimaryKey, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { LobbyParticipation } from './lobby-participation.entity'
import { MatchReport } from './match-report.entity'

/**
 * Dossier counterpart: `reportou_ausencia_de` on `Report` in
 * docs/requisitos/03-dados.md — a row per human a report says left or never
 * played (4.1). Confirmed when both sides name the same person; then the
 * finished match costs them −8 instead of the clean match.
 */
@Entity({ tableName: 'reported_absence' })
@Unique({ properties: ['report', 'participation'] })
export class ReportedAbsence {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => MatchReport, { deleteRule: 'cascade' })
  report!: MatchReport

  @ManyToOne(() => LobbyParticipation, { deleteRule: 'cascade' })
  participation!: LobbyParticipation
}
