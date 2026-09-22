import { NeonConsumptionClient } from './neon-consumption.client'

describe('NeonConsumptionClient', () => {
  it('returns null when the management credentials are unset — the API still boots', async () => {
    const client = new NeonConsumptionClient({})
    await expect(client.read()).resolves.toBeNull()
  })

  it('reads consumption from GET /projects/{id} and does not use DATABASE_URL', async () => {
    const http = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          project: {
            compute_time_seconds: 3600,
            data_transfer_bytes: 1_000_000,
            synthetic_storage_size_bytes: 50_000_000,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const client = new NeonConsumptionClient(
      {
        NEON_API_KEY: 'neon-key',
        NEON_PROJECT_ID: 'quiet-paper-123',
        DATABASE_URL: 'postgres://nope',
      },
      http as unknown as typeof fetch,
    )

    await expect(client.read()).resolves.toEqual({
      storageBytes: 50_000_000,
      computeSeconds: 3600,
      egressBytes: 1_000_000,
    })

    const [url, init] = http.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://console.neon.tech/api/v2/projects/quiet-paper-123')
    expect(url).not.toContain('postgres')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer neon-key')
  })

  it('fails when Neon omits a consumption field — zero would hide a real reading', async () => {
    const http = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ project: { compute_time_seconds: 1 } }), { status: 200 }),
      )
    const client = new NeonConsumptionClient(
      { NEON_API_KEY: 'k', NEON_PROJECT_ID: 'p' },
      http as unknown as typeof fetch,
    )
    await expect(client.read()).rejects.toThrow(/consumption fields/)
  })
})
