import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { createHash, createHmac, randomBytes } from 'node:crypto'

const seeds = getStore('potuzhno-fair-seeds')
const nonces = getStore('potuzhno-fair-nonces')
const ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
const SEED = /^[A-Za-z0-9_-]{24,128}$/
const CASE = /^[a-z_]{2,40}$/
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const dayKey = () => new Date().toISOString().slice(0, 10)
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

async function getDailySeed(day: string) {
  const key = `seed:${day}`
  const existing = await seeds.get(key, { type: 'json' }) as { seed?: string, hash?: string } | null
  if (existing?.seed && existing.hash) return existing
  const seed = randomBytes(32).toString('base64url')
  const created = { seed, hash: hash(seed) }
  const result = await seeds.set(key, JSON.stringify(created), { onlyIfNew: true })
  if (result.modified) return created
  return await getDailySeed(day)
}

export default async (request: Request) => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405)
  let body: any
  try { body = await request.json() } catch { return response({ error: 'Некоректний запит.' }, 400) }
  const deviceId = String(body?.deviceId || '')
  const clientSeed = String(body?.clientSeed || '')
  const caseId = String(body?.caseId || '')
  const nonce = Number(body?.nonce)
  if (!ID.test(deviceId) || !SEED.test(clientSeed) || !CASE.test(caseId) || !Number.isSafeInteger(nonce) || nonce < 0 || nonce > 1_000_000_000) {
    return response({ error: 'Некоректні дані перевірки.' }, 400)
  }

  const day = dayKey()
  const nonceKey = `nonce:${day}:${deviceId}:${nonce}`
  const previous = await nonces.get(nonceKey, { type: 'json' })
  if (previous) return response(previous)

  const seed = await getDailySeed(day)
  const proof = `${clientSeed}:${deviceId}:${nonce}:${caseId}`
  const bytes = createHmac('sha256', seed.seed).update(proof).digest()
  const roll = bytes.readUInt32BE(0) / 0x1_0000_0000
  const wearRoll = bytes.readUInt32BE(4) / 0x1_0000_0000
  const result = { day, nonce, roll, wearRoll, serverSeedHash: seed.hash, proof }
  const stored = await nonces.set(nonceKey, JSON.stringify(result), { onlyIfNew: true })
  if (!stored.modified) {
    const replay = await nonces.get(nonceKey, { type: 'json' })
    if (!replay) return response({ error: 'Раунд ще зберігається. Повтори запит.' }, 409)
    return response(replay)
  }
  return response(result)
}

export const config: Config = { path: '/api/fair/roll', method: 'POST' }
