import { createHash, createHmac } from 'node:crypto'

import type { BackupObject, BackupStore } from './store'

export type S3BackupConfig = {
  endpoint: string
  region: string
  bucket: string
  accessKey: string
  secretKey: string
  fetchImpl?: typeof fetch
}

/**
 * Oracle Object Storage, S3-compatible, path-style.
 *
 * The official SDK is a large extra dependency for four operations. Signing
 * here keeps dump/restore runnable in the backup image without pulling AWS
 * clients into the API that serves requests.
 */
export class S3BackupStore implements BackupStore {
  private readonly fetchImpl: typeof fetch

  constructor(private readonly config: S3BackupConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  async put(key: string, body: Buffer, at: Date = new Date()): Promise<void> {
    const response = await this.request('PUT', `/${this.config.bucket}/${encodeKey(key)}`, {
      body,
      extraHeaders: { 'x-amz-meta-mtime': at.toISOString() },
    })
    if (!response.ok) {
      throw new Error(`s3 put failed (${response.status})`)
    }
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.request('GET', `/${this.config.bucket}/${encodeKey(key)}`)
    if (response.status === 404) {
      throw new Error(`backup object not found: ${key}`)
    }
    if (!response.ok) {
      throw new Error(`s3 get failed (${response.status})`)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  async list(): Promise<BackupObject[]> {
    const response = await this.request('GET', `/${this.config.bucket}`, {
      query: { 'list-type': '2' },
    })
    if (!response.ok) {
      throw new Error(`s3 list failed (${response.status})`)
    }
    return parseList(await response.text())
  }

  async delete(key: string): Promise<void> {
    const response = await this.request('DELETE', `/${this.config.bucket}/${encodeKey(key)}`)
    if (!response.ok && response.status !== 404) {
      throw new Error(`s3 delete failed (${response.status})`)
    }
  }

  private async request(
    method: string,
    path: string,
    options: {
      body?: Buffer
      query?: Record<string, string>
      extraHeaders?: Record<string, string>
    } = {},
  ): Promise<Response> {
    const url = new URL(this.config.endpoint)
    url.pathname = path
    for (const [name, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(name, value)
    }

    const now = new Date()
    const amzDate = compactUtc(now)
    const dateStamp = amzDate.slice(0, 8)
    const body = options.body ?? Buffer.alloc(0)
    const payloadHash = sha256Hex(body)
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...options.extraHeaders,
    }
    if (options.body) {
      headers['content-length'] = String(options.body.length)
    }

    const signedHeaderNames = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort()
    const canonicalHeaders = signedHeaderNames
      .map((name) => `${name}:${headers[name]!.trim()}\n`)
      .join('')
    const signedHeaders = signedHeaderNames.join(';')
    const canonicalQuery = [...url.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
      .join('&')
    const canonicalRequest = [
      method,
      url.pathname,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n')
    const signature = hmac(
      signingKey(this.config.secretKey, dateStamp, this.config.region),
      stringToSign,
    ).toString('hex')

    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    return this.fetchImpl(url, {
      method,
      headers,
      body: options.body && new Uint8Array(options.body),
    })
  }
}

export function s3ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: typeof fetch,
): S3BackupConfig | null {
  const endpoint = env.BACKUP_S3_ENDPOINT
  const bucket = env.BACKUP_S3_BUCKET
  const accessKey = env.BACKUP_S3_ACCESS_KEY
  const secretKey = env.BACKUP_S3_SECRET_KEY
  if (!endpoint || !bucket || !accessKey || !secretKey) {
    return null
  }
  return {
    endpoint,
    region: env.BACKUP_S3_REGION || 'sa-saopaulo-1',
    bucket,
    accessKey,
    secretKey,
    fetchImpl,
  }
}

function encodeKey(key: string): string {
  return key
    .split('/')
    .map((part) => encodeRfc3986(part))
    .join('/')
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function compactUtc(at: Date): string {
  return at
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmac(key: Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  const date = hmac(Buffer.from(`AWS4${secret}`), dateStamp)
  const regionKey = hmac(date, region)
  const service = hmac(regionKey, 's3')
  return hmac(service, 'aws4_request')
}

export function parseList(xml: string): BackupObject[] {
  const contents = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
  return contents.flatMap((match) => {
    const block = match[1] ?? ''
    const key = inner(block, 'Key')
    const size = Number(inner(block, 'Size') ?? '0')
    const lastModified = inner(block, 'LastModified')
    if (!key || !lastModified) {
      return []
    }
    return [{ key: decodeURIComponent(key), lastModified: new Date(lastModified), size }]
  })
}

function inner(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml)
  return match?.[1]
}
