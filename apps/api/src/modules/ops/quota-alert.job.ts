import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import type { QuotaResource, SystemQuotaAlertEvent } from '@prolobby/types'

import { s3ConfigFromEnv, S3BackupStore } from '../../common/backup/s3-store'
import { totalBytes } from '../../common/backup/store'
import { Clock } from '../../common/time/clock'
import { EventDeliveryTargetKind } from '../bot-integration/event-delivery.enums'
import { EventDeliveryService } from '../bot-integration/event-delivery.service'
import { NeonConsumptionClient } from './neon-consumption.client'
import { highestMetThreshold, QUOTA_CAPS, usagePercent } from './quota.thresholds'

/**
 * Every six hours, UTC — ADR-009 / #123.
 *
 * Reads the Neon **management** API and (when configured) lists the backup
 * bucket. Neither call uses `DATABASE_URL`, so a quiet night does not keep
 * the compute awake. Alerts go to `#status-sistema` as `system.quota_alert`.
 */
@Injectable()
export class QuotaAlertJob {
  private readonly logger = new Logger(QuotaAlertJob.name)
  /** resource:threshold → UTC date already sent, so 70% does not spam all day. */
  private readonly alerted = new Map<string, string>()

  constructor(
    private readonly events: EventDeliveryService,
    private readonly neon: NeonConsumptionClient,
    private readonly clock: Clock,
  ) {}

  @Cron('0 */6 * * *', { timeZone: 'UTC' })
  async checkQuotas(): Promise<void> {
    try {
      await this.run()
    } catch (error) {
      this.logger.error(
        'failed to check free-tier quotas',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  async run(): Promise<void> {
    const usages = await this.collect()
    for (const { resource, used } of usages) {
      await this.maybeAlert(resource, used)
    }
  }

  private async collect(): Promise<{ resource: QuotaResource; used: number }[]> {
    const usages: { resource: QuotaResource; used: number }[] = []
    const neon = await this.neon.read()
    if (neon) {
      usages.push(
        { resource: 'neon_storage', used: neon.storageBytes },
        { resource: 'neon_compute', used: neon.computeSeconds },
        { resource: 'neon_egress', used: neon.egressBytes },
      )
    } else {
      this.logger.log('skipping Neon quota check — NEON_API_KEY or NEON_PROJECT_ID unset')
    }

    const objectBytes = await this.objectStorageBytes()
    if (objectBytes !== null) {
      usages.push({ resource: 'object_storage', used: objectBytes })
    }
    return usages
  }

  private async objectStorageBytes(): Promise<number | null> {
    const config = s3ConfigFromEnv()
    if (!config) {
      return null
    }
    const objects = await new S3BackupStore(config).list()
    return totalBytes(objects)
  }

  private async maybeAlert(resource: QuotaResource, used: number): Promise<void> {
    const cap = QUOTA_CAPS[resource]
    const percent = usagePercent(used, cap.cap)
    const threshold = highestMetThreshold(percent, cap.percents)
    if (threshold === undefined) {
      this.logger.log(`${resource} at ${percent}% of ${cap.label}`)
      return
    }

    const day = this.clock.now().toISOString().slice(0, 10)
    const stamp = `${resource}:${threshold}`
    if (this.alerted.get(stamp) === day) {
      return
    }

    const event: SystemQuotaAlertEvent = {
      id: randomUUID(),
      occurredAt: this.clock.now().toISOString(),
      type: 'system.quota_alert',
      payload: { resource, percent, limit: cap.label },
    }
    await this.events.enqueue(event, { kind: EventDeliveryTargetKind.SYSTEM })
    this.alerted.set(stamp, day)
    this.logger.log(`enqueued ${resource} alert at ${percent}% (threshold ${threshold}%)`)
  }
}
