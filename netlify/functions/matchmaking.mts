import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { randomBytes } from 'node:crypto'

const matches = getStore('potuzhno-matchmaking', { consistency: 'strong' })
const ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
const IMAGE_HOSTS = new Set([
  'community.cloudflare.steamstatic.com',
  'community.akamai.steamstatic.com',
  'steamcdn-a.akamaihd.net',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
])
const WAIT_TTL = 10_000
const MATCH_TTL = 10 * 60_000
const MAX_PRICE = 1_000_000
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const cleanText = (value: unknown, limit: number) => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, limit)

type Stake = { name: string; img: string; price: number; rarity: string; rarityColor: string }
type Entrant = { deviceId: string; ticketId: string; name: string; stake: Stake; joinedAt: number }
type Match = { id: string; createdAt: number; winnerTicketId: string; players: Entrant[] }
type MatchState = { queue: Entrant[]; matches: Match[] }

const cleanImage = (value: unknown) => {
  try {
    const url = new URL(cleanText(value, 2048))
    return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

const parseStake = (value: any): Stake | null => {
  const name = cleanText(value?.name, 160)
  const img = cleanImage(value?.img)
  const price = Math.round(Number(value?.price))
  if (!name || !img || !Number.isFinite(price) || price < 1 || price > MAX_PRICE) return null
  const rarityColor = cleanText(value?.rarityColor, 16)
  return {
    name,
    img,
    price,
    rarity: cleanText(value?.rarity, 48) || 'CS2',
    rarityColor: /^#[0-9a-f]{3,8}$/i.test(rarityColor) ? rarityColor : '#b0c3d9',
  }
}

const normalizeState = (value: any): MatchState => ({
  queue: Array.isArray(value?.queue) ? value.queue : [],
  matches: Array.isArray(value?.matches) ? value.matches : [],
})

const cleanState = (state: MatchState, now: number) => {
  state.queue = state.queue.filter(entry => entry && ID.test(String(entry.deviceId || '')) && ID.test(String(entry.ticketId || '')) && now - Number(entry.joinedAt || 0) < WAIT_TTL)
  state.matches = state.matches.filter(match => match && now - Number(match.createdAt || 0) < MATCH_TTL).slice(0, 40)
}

const publicMatch = (match: Match) => ({
  id: match.id,
  createdAt: match.createdAt,
  winnerTicketId: match.winnerTicketId,
  players: match.players.map(player => ({ ticketId: player.ticketId, name: player.name, stake: player.stake })),
})

function resultFor(state: MatchState, deviceId: string, ticketId: string, now: number) {
  const match = state.matches.find(candidate => candidate.players.some(player => player.deviceId === deviceId && player.ticketId === ticketId))
  if (match) return { status: 'matched', match: publicMatch(match) }
  const position = state.queue.findIndex(entry => entry.deviceId === deviceId && entry.ticketId === ticketId)
  if (position >= 0) return { status: 'waiting', position: position + 1, waitedMs: Math.max(0, now - state.queue[position].joinedAt) }
  return { status: 'idle' }
}

async function mutate(callback: (state: MatchState, now: number) => unknown) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const entry = await matches.getWithMetadata('battle-state', { type: 'json', consistency: 'strong' })
    const state = normalizeState(entry?.data)
    const now = Date.now()
    cleanState(state, now)
    const result = callback(state, now)
    const saved = entry
      ? await matches.set('battle-state', JSON.stringify(state), { onlyIfMatch: entry.etag })
      : await matches.set('battle-state', JSON.stringify(state), { onlyIfNew: true })
    if (saved.modified) return result
  }
  throw new Error('Черга оновлюється. Повтори спробу.')
}

export default async (request: Request) => {
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)
  let body: any
  try { body = await request.json() } catch { return respond({ error: 'Некоректний запит.' }, 400) }

  const action = cleanText(body?.action, 16)
  const deviceId = cleanText(body?.deviceId, 64)
  const ticketId = cleanText(body?.ticketId, 64)
  if (!ID.test(deviceId) || !ID.test(ticketId)) return respond({ error: 'Некоректний matchmaking-квиток.' }, 400)

  try {
    if (action === 'status') {
      const state = normalizeState(await matches.get('battle-state', { type: 'json', consistency: 'strong' }))
      const now = Date.now()
      cleanState(state, now)
      return respond(resultFor(state, deviceId, ticketId, now))
    }

    if (action === 'cancel') {
      const result = await mutate((state, now) => {
        const existing = resultFor(state, deviceId, ticketId, now)
        if (existing.status === 'matched') return existing
        state.queue = state.queue.filter(entry => !(entry.deviceId === deviceId && entry.ticketId === ticketId))
        return { status: 'cancelled' }
      })
      return respond(result)
    }

    if (action !== 'join') return respond({ error: 'Невідома дія matchmaking.' }, 400)
    const stake = parseStake(body?.stake)
    if (!stake) return respond({ error: 'Некоректна ставка для віртуального бою.' }, 400)
    const name = cleanText(body?.name, 24) || 'Гравець'

    const result = await mutate((state, now) => {
      const existing = resultFor(state, deviceId, ticketId, now)
      if (existing.status === 'matched') return existing
      state.queue = state.queue.filter(entry => entry.deviceId !== deviceId)
      state.queue.push({ deviceId, ticketId, name, stake, joinedAt: now })

      if (state.queue.length >= 2) {
        const players = state.queue.splice(0, 2)
        const roll = randomBytes(4).readUInt32BE(0) / 0x1_0000_0000
        const match: Match = {
          id: randomBytes(16).toString('hex'),
          createdAt: now,
          winnerTicketId: players[roll < 0.5 ? 0 : 1].ticketId,
          players,
        }
        state.matches.unshift(match)
        return resultFor(state, deviceId, ticketId, now)
      }
      return resultFor(state, deviceId, ticketId, now)
    })
    return respond(result)
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'Matchmaking тимчасово недоступний.' }, 503)
  }
}

export const config: Config = { path: '/api/matchmaking', method: 'POST' }
