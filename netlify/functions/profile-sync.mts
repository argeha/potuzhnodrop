import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { createHash, timingSafeEqual } from 'node:crypto'

const profiles = getStore('potuzhno-profiles', { consistency: 'strong' })
const MAX_PAYLOAD_BYTES = 750_000
const ACCOUNT_ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
const RECOVERY_CODE = /^[A-Za-z0-9_-]{40,160}$/

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const digest = (value: string) => createHash('sha256').update(value).digest()
const matches = (left: string, right: string) => {
  const a = Buffer.from(left, 'hex')
  const b = Buffer.from(right, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

const isPayload = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_PAYLOAD_BYTES
  } catch {
    return false
  }
}

export default async (request: Request) => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405)

  let body: any
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > MAX_PAYLOAD_BYTES + 4_096) return response({ error: 'Збереження завелике.' }, 413)
    body = JSON.parse(raw)
  } catch {
    return response({ error: 'Некоректний запит.' }, 400)
  }

  const action = String(body?.action || '')
  const accountId = String(body?.accountId || '')
  const recoveryCode = String(body?.recoveryCode || '')
  if (!ACCOUNT_ID.test(accountId) || !RECOVERY_CODE.test(recoveryCode)) return response({ error: 'Некоректні дані профілю.' }, 400)

  const key = `profile:${accountId}`
  const recoveryHash = digest(recoveryCode).toString('hex')

  if (action === 'create') {
    if (!isPayload(body.payload)) return response({ error: 'Некоректне збереження.' }, 400)
    const data = { version: 1, recoveryHash, payload: body.payload, updatedAt: Date.now() }
    const created = await profiles.set(key, JSON.stringify(data), { onlyIfNew: true })
    if (!created.modified) return response({ error: 'Профіль уже існує.' }, 409)
    return response({ updatedAt: data.updatedAt })
  }

  const entry = await profiles.getWithMetadata(key, { type: 'json' })
  if (!entry || !entry.data || !matches(String(entry.data.recoveryHash || ''), recoveryHash)) {
    return response({ error: 'Профіль не знайдено або код відновлення неправильний.' }, 403)
  }

  if (action === 'load') return response({ payload: entry.data.payload, updatedAt: entry.data.updatedAt })
  if (action !== 'save' || !isPayload(body.payload)) return response({ error: 'Некоректне збереження.' }, 400)

  const data = { ...entry.data, payload: body.payload, updatedAt: Date.now() }
  const saved = await profiles.set(key, JSON.stringify(data), { onlyIfMatch: entry.etag })
  if (!saved.modified) return response({ error: 'Профіль змінено на іншому пристрої. Завантаж його й повтори дію.' }, 409)
  return response({ updatedAt: data.updatedAt })
}

export const config: Config = { path: '/api/profile/sync', method: 'POST' }
