const NEON_API = 'https://console.neon.tech/api/v2'

export type NeonUsage = {
  storageBytes: number
  computeSeconds: number
  egressBytes: number
}

/**
 * Neon management API — ADR-009: `GET /projects/{id}` does **not** wake the
 * compute. A missed field is a hard failure: treating absence as zero would
 * hide a 90% storage reading behind a silent 0% alert.
 */
export class NeonConsumptionClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly http: typeof fetch = fetch,
  ) {}

  async read(): Promise<NeonUsage | null> {
    const apiKey = this.env.NEON_API_KEY
    const projectId = this.env.NEON_PROJECT_ID
    if (!apiKey || !projectId) {
      return null
    }

    const response = await this.http(`${NEON_API}/projects/${encodeURIComponent(projectId)}`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`neon project read failed (${response.status})`)
    }

    const body = (await response.json()) as {
      project?: {
        compute_time_seconds?: unknown
        data_transfer_bytes?: unknown
        synthetic_storage_size?: unknown
        synthetic_storage_size_bytes?: unknown
      }
    }
    const project = body.project
    const storage = asNumber(
      project?.synthetic_storage_size_bytes ?? project?.synthetic_storage_size,
    )
    const compute = asNumber(project?.compute_time_seconds)
    const egress = asNumber(project?.data_transfer_bytes)
    if (storage === undefined || compute === undefined || egress === undefined) {
      throw new Error('neon project payload is missing consumption fields')
    }
    return { storageBytes: storage, computeSeconds: compute, egressBytes: egress }
  }
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
