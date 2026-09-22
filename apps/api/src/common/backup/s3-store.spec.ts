import { S3BackupStore, parseList, s3ConfigFromEnv } from './s3-store'

describe('S3BackupStore', () => {
  it('signs PutObject and sends the encrypted body, never a connection string', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const store = new S3BackupStore({
      endpoint: 'https://namespace.compat.objectstorage.sa-saopaulo-1.oraclecloud.com',
      region: 'sa-saopaulo-1',
      bucket: 'prolobby-backups',
      accessKey: 'AKIAEXAMPLE',
      secretKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await store.put('prolobby/one.dump.enc', Buffer.from('ciphertext'))

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit]
    expect(String(url)).toContain('/prolobby-backups/prolobby/one.dump.enc')
    expect(init.method).toBe('PUT')
    const headers = init.headers as Record<string, string>
    expect(headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\//)
    expect(headers.authorization).toContain('sa-saopaulo-1/s3/aws4_request')
    expect(Buffer.from(init.body as Uint8Array).toString()).toBe('ciphertext')
    expect(JSON.stringify(init)).not.toMatch(/DATABASE/)
  })

  it('parses ListBucketResult sizes for the quota job', () => {
    const objects = parseList(`
      <ListBucketResult>
        <Contents>
          <Key>prolobby/a.dump.enc</Key>
          <LastModified>2026-09-01T00:00:00.000Z</LastModified>
          <Size>100</Size>
        </Contents>
        <Contents>
          <Key>prolobby/b.dump.enc</Key>
          <LastModified>2026-09-21T00:00:00.000Z</LastModified>
          <Size>20</Size>
        </Contents>
      </ListBucketResult>
    `)
    expect(objects).toEqual([
      {
        key: 'prolobby/a.dump.enc',
        lastModified: new Date('2026-09-01T00:00:00.000Z'),
        size: 100,
      },
      {
        key: 'prolobby/b.dump.enc',
        lastModified: new Date('2026-09-21T00:00:00.000Z'),
        size: 20,
      },
    ])
  })

  it('reads S3 config from env and refuses a partial set', () => {
    expect(
      s3ConfigFromEnv({
        BACKUP_S3_ENDPOINT: 'https://example.compat.objectstorage.sa-saopaulo-1.oraclecloud.com',
        BACKUP_S3_BUCKET: 'prolobby-backups',
        BACKUP_S3_ACCESS_KEY: 'key',
        BACKUP_S3_SECRET_KEY: 'secret',
      }),
    ).toMatchObject({ region: 'sa-saopaulo-1', bucket: 'prolobby-backups' })
    expect(s3ConfigFromEnv({ BACKUP_S3_BUCKET: 'only-bucket' })).toBeNull()
  })
})
