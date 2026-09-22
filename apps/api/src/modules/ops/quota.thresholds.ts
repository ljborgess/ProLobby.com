import type { QuotaResource } from '@prolobby/types'

/**
 * Free-tier caps and alert points — ADR-009 decision 9 / #123.
 *
 * Neon documents GB as 10^9 bytes (`data_transfer_bytes / 1000000000`).
 * Compute is CU-seconds on `GET /projects/{id}`; 100 CU-hours is 360_000 s.
 * Object Storage is the Oracle free allowance (20 GiB), alert only at 80%.
 *
 * Crossing a cap never spends money: the job only enqueues `system.quota_alert`.
 */
export type QuotaCap = {
  resource: QuotaResource
  cap: number
  label: string
  percents: readonly number[]
}

export const QUOTA_CAPS: Record<QuotaResource, QuotaCap> = {
  neon_storage: {
    resource: 'neon_storage',
    cap: 0.5 * 1_000_000_000,
    label: '0.5GB',
    percents: [70, 90],
  },
  neon_compute: {
    resource: 'neon_compute',
    cap: 100 * 3600,
    label: '100CU-h',
    percents: [70, 90],
  },
  neon_egress: {
    resource: 'neon_egress',
    cap: 5 * 1_000_000_000,
    label: '5GB',
    percents: [60, 80],
  },
  object_storage: {
    resource: 'object_storage',
    cap: 20 * 1024 * 1024 * 1024,
    label: '20GiB',
    percents: [80],
  },
}

export function usagePercent(used: number, cap: number): number {
  if (cap <= 0) {
    return 100
  }
  return Math.min(100, Math.round((used / cap) * 100))
}

/** Highest configured threshold that `percent` has reached, if any. */
export function highestMetThreshold(
  percent: number,
  percents: readonly number[],
): number | undefined {
  return [...percents].sort((a, b) => b - a).find((threshold) => percent >= threshold)
}
