import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { Character } from './character.entity'

export enum PrintSubmissionStatus {
  /** Passed the pre-checks; waits for verification (moderation now, OCR later). */
  RECEIVED = 'received',
  /** Verified: the character it belongs to is verified by this print. */
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

/** RF-029 causes: the first three before any reading, the rest at verification. */
export enum PrintRejection {
  INVALID_FORMAT = 'invalid_format',
  IMAGE_TOO_SMALL = 'image_too_small',
  PRINT_ALREADY_USED = 'print_already_used',
  /** The tag on the card is not the one declared for that platform. */
  GAMERTAG_MISMATCH = 'gamertag_mismatch',
  /** Banned, or already verified by another account. Said the same way on purpose. */
  GAMERTAG_UNAVAILABLE = 'gamertag_unavailable',
  /** The archetype on the print does not fit the chosen category. */
  ARCHETYPE_MISMATCH = 'archetype_mismatch',
  /** The open card is not the active archetype (no ✓ beside the name). */
  NOT_ACTIVE_ARCHETYPE = 'not_active_archetype',
  /** Not the Archetypes screen, or nothing on it can be read. */
  UNREADABLE = 'unreadable',
}

/**
 * Dossier counterpart: `EnvioDePrint` in docs/requisitos/03-dados.md.
 *
 * Every attempt is a row, rejected ones included: RF-065 counts attempts, not
 * accepted prints. The hash is unique (RF-063) and stays after the file is
 * deleted at 90 days, so a deleted print still cannot be reused.
 */
@Entity({ tableName: 'print_submission' })
@Index({ properties: ['account', 'createdAt'] })
export class PrintSubmission {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  /**
   * Set null, not cascade, when the account goes: the hash must outlive it
   * (RF-063), and the retention job deletes the file of an orphaned row on
   * its next run instead of leaving it on disk with nothing pointing at it.
   */
  @ManyToOne(() => Account, { deleteRule: 'set null', nullable: true })
  account?: Account

  @ManyToOne(() => Character, { deleteRule: 'set null', nullable: true })
  character?: Character

  /** Null on rejected attempts: only a stored print owns a hash. */
  @Property({ length: 64, nullable: true })
  @Unique()
  fileHash?: string

  /** Encrypted file on disk. Null once rejected or past the 90 days. */
  @Property({ type: 'text', nullable: true, hidden: true })
  filePath?: string

  @Enum({ items: () => PrintSubmissionStatus })
  status!: PrintSubmissionStatus

  @Enum({ items: () => PrintRejection, nullable: true })
  rejection?: PrintRejection

  @Property()
  createdAt: Date & Opt = new Date()
}
