import { EntityManager } from '@mikro-orm/postgresql'
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { encryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { Account } from '../account/account.entity'
import { detectRealImageType, readImageSize } from '../account/evidence-image'
import { ACTIVE_CHARACTER_STATES, Character } from './character.entity'
import { PrintRejection, PrintSubmission, PrintSubmissionStatus } from './print-submission.entity'

/** RF-065: attempts per account per hour, accepted or not. */
export const PRINT_UPLOADS_PER_HOUR = 10
const HOUR_MS = 60 * 60 * 1000

/**
 * RF-064: a garbage gate, not a quality bar. 800×600 rejected every real video
 * frame before any reading (piloto de OCR, rodada 1); a print arrives at any
 * resolution. The blur threshold is still "a calibrar".
 */
export const MIN_PRINT_WIDTH = 320
export const MIN_PRINT_HEIGHT = 240

const RETENTION_MS = 90 * 24 * HOUR_MS

/**
 * Inside `uploads/`, which production mounts as a persistent volume. Every
 * file here is encrypted — item 5 of the security checklist.
 */
function printsDir(): string {
  return process.env.PRINTS_DIR ?? join(process.cwd(), 'uploads', 'character-prints')
}

export type PrintSubmissionView = {
  id: string
  status: PrintSubmissionStatus
  rejection: PrintRejection | null
}

/**
 * Everything that happens to a character's print before verification — #195.
 * Cheapest check first, so garbage never costs storage, and never an OCR call
 * once OCR exists (RF-063, RF-064, RF-065).
 */
@Injectable()
export class PrintSubmissionService implements OnModuleInit {
  private readonly logger = new Logger(PrintSubmissionService.name)
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(private readonly em: EntityManager) {}

  /** Same boot probe as the account-recovery evidence: fail loud, not silent. */
  async onModuleInit(): Promise<void> {
    const dir = printsDir()
    const probe = join(dir, `.write-probe-${randomUUID()}`)
    try {
      await mkdir(dir, { recursive: true })
      await writeFile(probe, '')
      await unlink(probe)
    } catch (error) {
      throw new Error(
        `character print directory is not writable (${dir}). Set PRINTS_DIR to a writable, persistent volume. Cause: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async submit(accountId: string, characterId: string, file: Buffer): Promise<PrintSubmissionView> {
    const em = this.em.fork()
    const character = await em.findOne(Character, {
      id: characterId,
      account: accountId,
      state: { $in: [...ACTIVE_CHARACTER_STATES] },
    })
    if (!character) {
      throw new NotFoundException('character_not_found')
    }

    const since = new Date(Date.now() - HOUR_MS)
    const recent = await em.find(
      PrintSubmission,
      { account: accountId, createdAt: { $gt: since } },
      { orderBy: { createdAt: 'asc' }, fields: ['createdAt'] },
    )
    if (recent.length >= PRINT_UPLOADS_PER_HOUR) {
      const oldest = recent[0]!.createdAt.getTime()
      throw new HttpException(
        {
          message: 'upload_limit',
          retryAfterSeconds: Math.ceil((oldest + HOUR_MS - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const rejection = this.precheck(file) ?? (await this.alreadyUsed(em, file))
    if (rejection) {
      return this.record(em, accountId, character, { rejection })
    }

    const path = join(printsDir(), `${randomUUID()}.enc`)
    await mkdir(printsDir(), { recursive: true })
    await writeFile(path, encryptAtRest(this.encryptionKey, file))
    try {
      return await this.record(em, accountId, character, { fileHash: sha256(file), path })
    } catch (error) {
      await rm(path, { force: true })
      // Same file sent twice at the same moment: the unique hash decides.
      if (isUniqueViolation(error)) {
        return this.record(this.em.fork(), accountId, character, {
          rejection: PrintRejection.PRINT_ALREADY_USED,
        })
      }
      throw error
    }
  }

  /** Deletes stored prints past 90 days; the row and its hash stay (RF-063). */
  async deleteExpiredFiles(now: Date = new Date()): Promise<number> {
    const em = this.em.fork()
    const expired = await em.find(PrintSubmission, {
      filePath: { $ne: null },
      createdAt: { $lt: new Date(now.getTime() - RETENTION_MS) },
    })
    let deleted = 0
    for (const submission of expired) {
      try {
        await rm(submission.filePath!, { force: true })
      } catch (error) {
        this.logger.error(
          `failed to delete expired print ${submission.id}`,
          error instanceof Error ? error.stack : undefined,
        )
        continue
      }
      submission.filePath = undefined
      deleted += 1
    }
    if (deleted > 0) {
      await em.flush()
    }
    return deleted
  }

  private precheck(file: Buffer): PrintRejection | null {
    const type = detectRealImageType(file)
    if (!type) {
      return PrintRejection.INVALID_FORMAT
    }
    const size = readImageSize(file, type)
    if (!size) {
      return PrintRejection.INVALID_FORMAT
    }
    if (size.width < MIN_PRINT_WIDTH || size.height < MIN_PRINT_HEIGHT) {
      return PrintRejection.IMAGE_TOO_SMALL
    }
    return null
  }

  private async alreadyUsed(em: EntityManager, file: Buffer): Promise<PrintRejection | null> {
    const used = await em.count(PrintSubmission, { fileHash: sha256(file) })
    return used > 0 ? PrintRejection.PRINT_ALREADY_USED : null
  }

  private async record(
    em: EntityManager,
    accountId: string,
    character: Character,
    outcome: { rejection: PrintRejection } | { fileHash: string; path: string },
  ): Promise<PrintSubmissionView> {
    const rejected = 'rejection' in outcome
    const submission = em.create(PrintSubmission, {
      account: em.getReference(Account, accountId),
      character: em.getReference(Character, character.id),
      status: rejected ? PrintSubmissionStatus.REJECTED : PrintSubmissionStatus.RECEIVED,
      rejection: rejected ? outcome.rejection : undefined,
      fileHash: rejected ? undefined : outcome.fileHash,
      filePath: rejected ? undefined : outcome.path,
    })
    await em.flush()
    return { id: submission.id, status: submission.status, rejection: submission.rejection ?? null }
  }
}

function sha256(file: Buffer): string {
  return createHash('sha256').update(file).digest('hex')
}
