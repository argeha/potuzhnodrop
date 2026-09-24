const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

const IMAGE_HOSTS = new Set([
  'community.cloudflare.steamstatic.com',
  'community.akamai.steamstatic.com',
  'steamcdn-a.akamaihd.net',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
])
const AVATAR_HOSTS = new Set([
  'avatars.steamstatic.com',
  'avatars.akamai.steamstatic.com',
  'avatars.fastly.steamstatic.com',
  'steamcdn-a.akamaihd.net',
])
const CATALOG_SOURCES = [
  'https://cdn.jsdelivr.net/gh/ByMykel/CSGO-API@main/public/api/en/skins.json',
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
]
const STEAM_OPENID = 'https://steamcommunity.com/openid/login'
const ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
const RECOVERY_CODE = /^[A-Za-z0-9_-]{40,160}$/
const SEED = /^[A-Za-z0-9_-]{24,128}$/
const CASE = /^[a-z0-9_]{2,40}$/
// Durable Object SQLite values have a 2 MB ceiling. Keep profile payloads below
// that limit after their metadata is added to the stored record.
const MAX_PROFILE_PAYLOAD_BYTES = 1_700_000
const MAX_PROFILE_REQUEST_BYTES = MAX_PROFILE_PAYLOAD_BYTES + 8_192
const MAX_PRICE = 1_000_000
const WAIT_TTL = 10_000
const MATCH_TTL = 10 * 60_000
const PUBLIC_PROFILE_TTL = 90 * 24 * 60 * 60_000
const STEAM_PROFILE_TTL = 6 * 60 * 60_000
const STEAM_SESSION_TTL = 30 * 24 * 60 * 60_000
const CATALOG_TTL = 6 * 60 * 60_000
const CATALOG_STALE_TTL = 7 * 24 * 60 * 60_000
const STEAM_SESSION_COOKIE = 'potuzhno_steam_session'
const STEAM_AUTH_TTL = 10 * 60_000
const STEAM_AUTH_COOKIE = 'potuzhno_steam_auth'
const STEAM_SESSION_VERSION = 'v2'
const PRESENCE_TTL = 70_000
const MAX_PRESENCE_VISITORS = 5_000
const COMMUNITY_PLAYER_TTL = 45 * 24 * 60 * 60_000
const COMMUNITY_EVENT_TTL = 48 * 60 * 60_000
const COMMUNITY_MAX_PLAYERS = 1_000
const COMMUNITY_MAX_EVENTS = 24
const RATE_LIMITS = {
  profile: { limit: 24, windowMs: 60_000 },
  publicProfile: { limit: 60, windowMs: 60_000 },
  fair: { limit: 80, windowMs: 60_000 },
  matchmaking: { limit: 50, windowMs: 60_000 },
  steamAuth: { limit: 8, windowMs: 10 * 60_000 },
  steamInventory: { limit: 16, windowMs: 60_000 },
  steam: { limit: 60, windowMs: 60_000 },
  catalog: { limit: 20, windowMs: 60_000 },
  presence: { limit: 12, windowMs: 60_000 },
  community: { limit: 24, windowMs: 60_000 },
  api: { limit: 120, windowMs: 60_000 },
}
const encoder = new TextEncoder()

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...JSON_HEADERS, ...headers },
})

const cleanText = (value, limit) => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, limit)
const dayKey = () => new Date().toISOString().slice(0, 10)

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function randomHex(byteLength = 16) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return hex(bytes)
}

async function sha256(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

async function hmacSha256(key, value) {
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)))
}

function equalHash(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

function isPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  try {
    return encoder.encode(JSON.stringify(value)).byteLength <= MAX_PROFILE_PAYLOAD_BYTES
  } catch {
    return false
  }
}

function cleanImage(value) {
  try {
    const url = new URL(cleanText(value, 2048))
    return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

async function skinImage(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405)
  const source = cleanImage(new URL(request.url).searchParams.get('src'))
  if (!source) return json({ error: 'Некоректне джерело зображення.' }, 400)

  const cacheKey = new Request(request.url, { method: 'GET' })
  try {
    const cached = await caches.default.match(cacheKey)
    if (cached) {
      if (request.method === 'GET') return cached
      return new Response(null, { status: cached.status, headers: cached.headers })
    }
  } catch {}

  let upstream
  try {
    upstream = await fetch(source, { headers: { Accept: 'image/avif,image/webp,image/png,image/*;q=0.8' } })
  } catch {
    return json({ error: 'Зображення тимчасово недоступне.' }, 502)
  }
  const contentType = upstream.headers.get('Content-Type') || ''
  if (!upstream.ok || !contentType.startsWith('image/')) {
    return json({ error: 'Зображення тимчасово недоступне.' }, 502)
  }
  const response = new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
  if (request.method === 'GET') {
    try {
      await caches.default.put(cacheKey, response.clone())
    } catch {}
  }
  return response
}

function cleanAvatar(value) {
  try {
    const url = new URL(cleanText(value, 2048))
    return url.protocol === 'https:' && AVATAR_HOSTS.has(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

function publicProfilePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const stats = value.stats && typeof value.stats === 'object' && !Array.isArray(value.stats) ? value.stats : {}
  const name = cleanText(value.name, 24)
  if (!name) return null
  return {
    name,
    avatar: cleanAvatar(value.avatar),
    level: Math.round(Math.min(9_999, Math.max(1, Number(value.level) || 1))),
    prestige: Math.round(Math.min(99, Math.max(0, Number(value.prestige) || 0))),
    steamConnected: value.steamConnected === true,
    stats: {
      rounds: Math.round(Math.min(9_999_999, Math.max(0, Number(stats.rounds) || 0))),
      cases: Math.round(Math.min(9_999_999, Math.max(0, Number(stats.cases) || 0))),
      battles: Math.round(Math.min(9_999_999, Math.max(0, Number(stats.battles) || 0))),
      bestValue: Math.round(Math.min(MAX_PRICE, Math.max(0, Number(stats.bestValue) || 0))),
    },
  }
}

function publicProfileView(id, entry) {
  const { avatar, ...profile } = entry.profile || {}
  return {
    id,
    ...profile,
    avatarUrl: avatar ? `/api/public-avatar?id=${encodeURIComponent(id)}` : '',
    updatedAt: Number(entry.updatedAt) || 0,
  }
}

function decodeXmlText(value) {
  return cleanText(String(value || '')
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'"), 160)
}

function xmlTag(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return decodeXmlText(match?.[1] || '')
}

function htmlAttribute(tag, name) {
  const match = String(tag || '').match(new RegExp(`\\b${name}\\s*=\\s*(?:(["'])(.*?)\\1|([^\\s>]+))`, 'i'))
  return decodeXmlText(match?.[2] || match?.[3] || '')
}

function htmlMeta(html, property) {
  const target = String(property || '').toLowerCase()
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || []
  for (const tag of tags) {
    const key = (htmlAttribute(tag, 'property') || htmlAttribute(tag, 'name')).toLowerCase()
    if (key === target) return htmlAttribute(tag, 'content')
  }
  return ''
}

function cleanColor(value) {
  const color = cleanText(value, 32)
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#b0c3d9'
}

function readCookie(request, name) {
  const prefix = `${name}=`
  return (request.headers.get('Cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length) || ''
}

function sessionCookie(name, value, maxAge, secure) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
}

function steamSessionToken(value) {
  const session = String(value || '')
  const match = session.match(new RegExp(`^${STEAM_SESSION_VERSION}_([a-f0-9]{64})$`, 'i'))
  if (match) return { token: match[1].toLowerCase(), sharded: true }
  if (/^[a-f0-9]{64}$/i.test(session)) return { token: session.toLowerCase(), sharded: false }
  return null
}

function rateLimitGroup(path) {
  if (path === '/api/profile/sync') return 'profile'
  if (path === '/api/public-profile' || path === '/api/public-avatar') return 'publicProfile'
  if (path.startsWith('/api/fair/')) return 'fair'
  if (path === '/api/matchmaking') return 'matchmaking'
  if (path === '/api/steam/auth') return 'steamAuth'
  if (path === '/api/steam/inventory') return 'steamInventory'
  if (path.startsWith('/api/steam/')) return 'steam'
  if (path === '/api/catalog/skins') return 'catalog'
  if (path === '/api/presence') return 'presence'
  if (path === '/api/community') return 'community'
  return 'api'
}

function hasFairSecret(env) {
  return typeof env?.FAIR_SEED_SECRET === 'string' && env.FAIR_SEED_SECRET.length >= 32
}

function parseStake(value) {
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

function normalizeMatchState(value) {
  return {
    queue: Array.isArray(value?.queue) ? value.queue : [],
    matches: Array.isArray(value?.matches) ? value.matches : [],
  }
}

function normalizePresenceState(value, now) {
  const active = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(Object.entries(active)
    .filter(([visitorHash, seenAt]) => /^[a-f0-9]{64}$/i.test(visitorHash) && Number.isFinite(Number(seenAt)) && Number(seenAt) > now - PRESENCE_TTL && Number(seenAt) <= now + 10_000)
    .sort(([, leftSeenAt], [, rightSeenAt]) => Number(rightSeenAt) - Number(leftSeenAt))
    .slice(0, MAX_PRESENCE_VISITORS))
}

function boundedInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min) {
  const number = Math.round(Number(value))
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback
}

function communitySeasonKey() {
  return new Date().toISOString().slice(0, 7)
}

function normalizeCommunityPlayer(value, visitorHash, now) {
  const name = cleanText(value?.name, 24)
  if (!name) return null
  const profileId = cleanText(value?.profileId, 64)
  return {
    id: visitorHash,
    name,
    profileId: ID.test(profileId) ? profileId : '',
    xp: boundedInteger(value?.xp, 0, 9_999_999),
    wins: boundedInteger(value?.wins, 0, 9_999_999),
    rounds: boundedInteger(value?.rounds, 0, 9_999_999),
    collectionValue: boundedInteger(value?.collectionValue, 0, MAX_PRICE * 10_000),
    level: boundedInteger(value?.level, 1, 9_999),
    prestige: boundedInteger(value?.prestige, 0, 99),
    updatedAt: now,
  }
}

function normalizeCommunityEvent(value, now) {
  const skin = value?.skin && typeof value.skin === 'object' ? value.skin : null
  const playerId = cleanText(value?.playerId, 64)
  const name = cleanText(value?.name, 24)
  const skinName = cleanText(skin?.name, 160)
  if (!/^[a-f0-9]{64}$/i.test(playerId) || !name || !skinName) return null
  const profileId = cleanText(value?.profileId, 64)
  const kind = ['case', 'upgrade', 'battle', 'royale', 'contract'].includes(value?.kind) ? value.kind : 'drop'
  return {
    id: cleanText(value?.id, 48) || randomHex(12),
    at: boundedInteger(value?.at, now - COMMUNITY_EVENT_TTL, now + 10_000, now),
    kind,
    playerId,
    name,
    profileId: ID.test(profileId) ? profileId : '',
    level: boundedInteger(value?.level, 1, 9_999),
    prestige: boundedInteger(value?.prestige, 0, 99),
    skin: {
      name: skinName,
      img: cleanImage(skin?.img),
      price: boundedInteger(skin?.price, 0, MAX_PRICE),
      rarity: cleanText(skin?.rarity, 48) || 'CS2',
      rarityColor: cleanColor(skin?.rarityColor),
    },
  }
}

function normalizeCommunityState(value, now) {
  const season = communitySeasonKey()
  const source = value?.season === season && value && typeof value === 'object' ? value : {}
  const players = Object.entries(source.players && typeof source.players === 'object' ? source.players : {})
    .filter(([visitorHash, player]) => /^[a-f0-9]{64}$/i.test(visitorHash) && player && now - Number(player.updatedAt || 0) < COMMUNITY_PLAYER_TTL)
    .map(([visitorHash, player]) => [visitorHash, normalizeCommunityPlayer(player, visitorHash, boundedInteger(player.updatedAt, now - COMMUNITY_PLAYER_TTL, now, now))])
    .filter(([, player]) => Boolean(player))
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, COMMUNITY_MAX_PLAYERS)
  const events = (Array.isArray(source.events) ? source.events : [])
    .map(event => normalizeCommunityEvent(event, now))
    .filter(event => event && now - event.at < COMMUNITY_EVENT_TTL)
    .sort((left, right) => right.at - left.at)
    .slice(0, COMMUNITY_MAX_EVENTS)
  return { season, players: Object.fromEntries(players), events }
}

function communityResponse(state, visitorHash) {
  const rows = Object.values(state.players)
    .sort((left, right) => right.xp - left.xp || right.wins - left.wins || right.collectionValue - left.collectionValue || right.updatedAt - left.updatedAt)
  const leaderboard = rows.slice(0, 12).map((player, index) => ({
    rank: index + 1,
    name: player.name,
    profileId: player.profileId,
    xp: player.xp,
    wins: player.wins,
    rounds: player.rounds,
    collectionValue: player.collectionValue,
    level: player.level,
    prestige: player.prestige,
    isMe: player.id === visitorHash,
  }))
  const ownRank = rows.findIndex(player => player.id === visitorHash) + 1
  return { season: state.season, leaderboard, rank: ownRank || null, events: state.events }
}

function cleanMatchState(state, now) {
  state.queue = state.queue.filter(entry => entry && ID.test(String(entry.deviceId || '')) && ID.test(String(entry.ticketId || '')) && now - Number(entry.joinedAt || 0) < WAIT_TTL)
  state.matches = state.matches.filter(match => match && now - Number(match.createdAt || 0) < MATCH_TTL).slice(0, 40)
}

function publicMatch(match) {
  return {
    id: match.id,
    createdAt: match.createdAt,
    winnerTicketId: match.winnerTicketId,
    players: match.players.map(player => ({ ticketId: player.ticketId, name: player.name, profileId: player.profileId || '', stake: player.stake })),
  }
}

function matchmakingResult(state, deviceId, ticketId, now) {
  const match = state.matches.find(candidate => candidate.players.some(player => player.deviceId === deviceId && player.ticketId === ticketId))
  if (match) return { status: 'matched', match: publicMatch(match) }
  const position = state.queue.findIndex(entry => entry.deviceId === deviceId && entry.ticketId === ticketId)
  if (position >= 0) return { status: 'waiting', position: position + 1, waitedMs: Math.max(0, now - state.queue[position].joinedAt) }
  return { status: 'idle' }
}

async function timedFetch(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export class PotuzhnoState {
  constructor(state, env) {
    this.storage = state.storage
    this.env = env
  }

  async fetch(request) {
    const path = new URL(request.url).pathname
    try {
      // These routes are reachable only through a Durable Object stub. The public
      // Worker never dispatches /__internal/* to this class.
      if (path === '/__internal/steam-session') return await this.internalSteamSession(request)
      if (path === '/__internal/migrate-profile') return await this.internalProfileMigration(request)
      if (path === '/__internal/migrate-public-profile') return await this.internalPublicProfileMigration(request)
      if (path === '/api/profile/sync') return await this.profile(request)
      if (path === '/api/public-profile') return await this.publicProfile(request)
      if (path === '/api/public-avatar') return await this.publicAvatar(request)
      if (path === '/api/fair/roll') return await this.fairRoll(request)
      if (path === '/api/fair/verify') return await this.fairVerify(request)
      if (path === '/api/matchmaking') return await this.matchmaking(request)
      if (path === '/api/presence') return await this.presence(request)
      if (path === '/api/community') return await this.community(request)
      if (path === '/api/steam/auth') return await this.steamAuth(request)
      if (path === '/api/steam/session') return await this.steamSession(request)
      if (path === '/api/steam/logout') return await this.steamLogout(request)
      if (path === '/api/steam/profile') return await this.steamProfile(request)
      if (path === '/api/steam/avatar') return await this.steamAvatar(request)
      if (path === '/api/steam/inventory') return await this.steamInventory(request)
      if (path === '/api/catalog/skins') return await this.skinCatalog(request)
      return json({ error: 'Маршрут API не знайдено.' }, 404)
    } catch (error) {
      console.error('API error', path, error)
      return json({ error: 'Сервіс тимчасово недоступний. Повтори спробу.' }, 503)
    }
  }

  async readBody(request, limit = MAX_PROFILE_REQUEST_BYTES) {
    const raw = await request.text()
    if (encoder.encode(raw).byteLength > limit) throw new RangeError('Збереження завелике.')
    return JSON.parse(raw)
  }

  async internalSteamSession(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let session
    try {
      session = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректна сесія Steam.' }, 400)
    }
    if (!/^\d{17}$/.test(String(session?.steamId || '')) || Number(session?.expiresAt || 0) <= Date.now()) {
      return json({ error: 'Некоректна сесія Steam.' }, 400)
    }
    await this.storage.put('steam-session', {
      steamId: String(session.steamId),
      createdAt: Number(session.createdAt) || Date.now(),
      expiresAt: Number(session.expiresAt),
    })
    return json({ stored: true })
  }

  async internalProfileMigration(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит.' }, 400)
    }
    const accountId = String(body?.accountId || '')
    const recoveryHash = String(body?.recoveryHash || '')
    if (!ID.test(accountId) || !/^[a-f0-9]{64}$/i.test(recoveryHash)) return json({ migrated: false })
    const key = `profile:${accountId}`
    const entry = await this.storage.get(key)
    if (!entry || !equalHash(entry.recoveryHash, recoveryHash) || !isPayload(entry.payload)) return json({ migrated: false })
    // Copy rather than move: cross-object writes are not atomic, so keeping the
    // legacy record until a scheduled cleanup is safer than risking data loss if
    // the destination shard fails between the read and its first write.
    return json({ migrated: true, entry })
  }

  async internalPublicProfileMigration(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит.' }, 400)
    }
    const id = String(body?.id || '')
    if (!ID.test(id)) return json({ migrated: false })
    const key = `public-profile:${id}`
    const entry = await this.storage.get(key)
    if (!entry?.profile) return json({ migrated: false })
    // See profile migration above: retain the legacy copy until it is safe to
    // clean up asynchronously; all new traffic goes to the per-profile shard.
    return json({ migrated: true, entry })
  }

  async migrateLegacyProfile(accountId, recoveryHash) {
    const global = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
    const response = await global.fetch(new Request('https://internal/__internal/migrate-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, recoveryHash }),
    }))
    if (!response.ok) return null
    const data = await response.json()
    return data?.migrated && data.entry ? data.entry : null
  }

  async migrateLegacyPublicProfile(id) {
    const global = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
    const response = await global.fetch(new Request('https://internal/__internal/migrate-public-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }))
    if (!response.ok) return null
    const data = await response.json()
    return data?.migrated && data.entry ? data.entry : null
  }

  async publicProfileEntry(id) {
    const key = `public-profile:${id}`
    const local = await this.storage.get(key)
    if (local?.profile) return local
    const migrated = await this.migrateLegacyPublicProfile(id)
    if (migrated?.profile) {
      await this.storage.put(key, migrated)
      return migrated
    }
    return null
  }

  async profile(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request)
    } catch (error) {
      return json({ error: error instanceof RangeError ? error.message : 'Некоректний запит.' }, error instanceof RangeError ? 413 : 400)
    }

    const action = String(body?.action || '')
    const accountId = String(body?.accountId || '')
    const recoveryCode = String(body?.recoveryCode || '')
    if (!ID.test(accountId) || !RECOVERY_CODE.test(recoveryCode)) return json({ error: 'Некоректні дані профілю.' }, 400)

    const key = `profile:${accountId}`
    const recoveryHash = await sha256(recoveryCode)
    let entry = await this.storage.get(key)
    if (!entry) {
      const migrated = await this.migrateLegacyProfile(accountId, recoveryHash)
      if (migrated) {
        await this.storage.put(key, migrated)
        entry = migrated
      }
    }
    if (action === 'create') {
      if (!isPayload(body.payload)) return json({ error: 'Некоректне збереження.' }, 400)
      const result = await this.storage.transaction(async transaction => {
        if (await transaction.get(key)) return null
        const data = { version: 2, revision: 1, recoveryHash, payload: body.payload, updatedAt: Date.now() }
        await transaction.put(key, data)
        return data
      })
      return result ? json({ updatedAt: result.updatedAt, revision: result.revision }) : json({ error: 'Профіль уже існує.' }, 409)
    }

    if (!entry || !equalHash(entry.recoveryHash, recoveryHash)) return json({ error: 'Профіль не знайдено або код відновлення неправильний.' }, 403)
    const revision = Math.max(1, Math.floor(Number(entry.revision) || 1))
    if (action === 'load') return json({ payload: entry.payload, updatedAt: entry.updatedAt, revision })
    if (action !== 'save' || !isPayload(body.payload)) return json({ error: 'Некоректне збереження.' }, 400)
    const expectedRevision = Number(body?.revision)
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) return json({ error: 'Профіль застарів. Онови його перед збереженням.' }, 409)

    const saved = await this.storage.transaction(async transaction => {
      const current = await transaction.get(key)
      const currentRevision = Math.max(1, Math.floor(Number(current?.revision) || 1))
      if (!current || !equalHash(current.recoveryHash, recoveryHash)) return { error: 'Профіль не знайдено або код відновлення неправильний.', status: 403 }
      if (currentRevision !== expectedRevision) return { error: 'Профіль було змінено в іншій вкладці або на іншому пристрої. Спочатку завантаж актуальну версію.', status: 409, revision: currentRevision }
      const updatedAt = Date.now()
      const next = { ...current, version: 2, revision: currentRevision + 1, payload: body.payload, updatedAt }
      await transaction.put(key, next)
      return { updatedAt, revision: next.revision }
    })
    return saved.error ? json({ error: saved.error, revision: saved.revision }, saved.status) : json(saved)
  }

  async publicProfile(request) {
    const url = new URL(request.url)
    if (request.method === 'GET') {
      const id = url.searchParams.get('id') || ''
      if (!ID.test(id)) return json({ error: 'Некоректне посилання на профіль.' }, 400)
      const entry = await this.publicProfileEntry(id)
      if (!entry?.profile || Date.now() - Number(entry.updatedAt || 0) > PUBLIC_PROFILE_TTL) {
        if (entry) await this.storage.delete(`public-profile:${id}`)
        return json({ error: 'Профіль не знайдено або посилання більше не активне.' }, 404)
      }
      return json({ profile: publicProfileView(id, entry) }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=60' })
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 12_288)
    } catch {
      return json({ error: 'Некоректний запит.' }, 400)
    }
    const action = cleanText(body?.action || 'publish', 16)
    const id = cleanText(body?.id, 64)
    const writeKey = cleanText(body?.writeKey, 192)
    if (!ID.test(id) || !SEED.test(writeKey)) return json({ error: 'Некоректні дані публічного профілю.' }, 400)
    const key = `public-profile:${id}`
    const writeHash = await sha256(writeKey)
    const existingEntry = await this.publicProfileEntry(id)

    if (action === 'unpublish') {
      const deleted = await this.storage.transaction(async transaction => {
        const entry = await transaction.get(key)
        if (!entry || !equalHash(entry.writeHash, writeHash)) return false
        await transaction.delete(key)
        return true
      })
      return deleted ? json({ unpublished: true }) : json({ error: 'Профіль не знайдено.' }, 404)
    }
    if (action !== 'publish') return json({ error: 'Невідома дія профілю.' }, 400)
    const profile = publicProfilePayload(body?.profile)
    if (!profile) return json({ error: 'Некоректні публічні дані профілю.' }, 400)
    const entry = await this.storage.transaction(async transaction => {
      const existing = await transaction.get(key) || existingEntry
      if (existing && !equalHash(existing.writeHash, writeHash)) return null
      const next = { version: 1, writeHash, profile, updatedAt: Date.now() }
      await transaction.put(key, next)
      return next
    })
    return entry
      ? json({ profile: publicProfileView(id, entry) })
      : json({ error: 'Це посилання вже належить іншому профілю.' }, 409)
  }

  async publicAvatar(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const id = new URL(request.url).searchParams.get('id') || ''
    if (!ID.test(id)) return json({ error: 'Некоректне посилання на профіль.' }, 400)
    const entry = await this.publicProfileEntry(id)
    const avatar = cleanAvatar(entry?.profile?.avatar)
    if (!avatar || Date.now() - Number(entry?.updatedAt || 0) > PUBLIC_PROFILE_TTL) {
      if (entry && Date.now() - Number(entry.updatedAt || 0) > PUBLIC_PROFILE_TTL) await this.storage.delete(`public-profile:${id}`)
      return json({ error: 'Аватар не знайдено.' }, 404)
    }
    try {
      const response = await timedFetch(avatar, { headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } })
      const contentType = response.headers.get('Content-Type') || ''
      if (!response.ok || !/^image\//i.test(contentType) || !response.body) throw new Error('Invalid public avatar response')
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch {
      return json({ error: 'Steam тимчасово не віддає аватар.' }, 502)
    }
  }

  async dailySeed(day) {
    const key = `seed:${day}`
    // Preserve seeds created by the earlier global implementation so historical
    // fairness proofs remain verifiable after the sharded rollout.
    const stored = await this.storage.get(key)
    if (stored?.seed && stored.hash) return stored
    // With FAIR_SEED_SECRET configured, every shard derives the same daily seed
    // without putting every roll through one global Durable Object. Revealing a
    // derived seed tomorrow does not reveal the long-lived secret or other days.
    if (hasFairSecret(this.env)) {
      const seed = hex(await hmacSha256(this.env.FAIR_SEED_SECRET, `potuzhno-fair:${day}`))
      return { seed, hash: await sha256(seed) }
    }
    return await this.storage.transaction(async transaction => {
      const existing = await transaction.get(key)
      if (existing?.seed && existing.hash) return existing
      const seed = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      const created = { seed, hash: await sha256(seed) }
      await transaction.put(key, created)
      return created
    })
  }

  async fairRoll(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 16_384)
    } catch {
      return json({ error: 'Некоректний запит.' }, 400)
    }
    const deviceId = String(body?.deviceId || '')
    const clientSeed = String(body?.clientSeed || '')
    const caseId = String(body?.caseId || '')
    const nonce = Number(body?.nonce)
    if (!ID.test(deviceId) || !SEED.test(clientSeed) || !CASE.test(caseId) || !Number.isSafeInteger(nonce) || nonce < 0 || nonce > 1_000_000_000) {
      return json({ error: 'Некоректні дані перевірки.' }, 400)
    }

    const day = dayKey()
    const proof = `${clientSeed}:${deviceId}:${nonce}:${caseId}`
    const nonceKey = `nonce:${day}:${deviceId}:${nonce}`
    const previous = await this.storage.get(nonceKey)
    if (previous) {
      if (previous.proof !== proof) return json({ error: 'Цей nonce уже використано в іншому раунді.' }, 409)
      return json(previous)
    }

    const seed = await this.dailySeed(day)
    const bytes = await hmacSha256(seed.seed, proof)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const result = {
      day,
      nonce,
      roll: view.getUint32(0) / 0x1_0000_0000,
      wearRoll: view.getUint32(4) / 0x1_0000_0000,
      serverSeedHash: seed.hash,
      proof,
    }
    const stored = await this.storage.transaction(async transaction => {
      const replay = await transaction.get(nonceKey)
      if (replay) return replay
      await transaction.put(nonceKey, result)
      return result
    })
    return json(stored)
  }

  async fairVerify(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const day = new URL(request.url).searchParams.get('day') || ''
    const today = dayKey()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: 'Вкажи дату у форматі YYYY-MM-DD.' }, 400)
    if (day >= today) return json({ error: 'Поточний seed буде розкрито наступного дня.' }, 423)
    const entry = await this.storage.get(`seed:${day}`)
    if (!entry?.seed || !entry.hash) return json({ error: 'Для цієї дати ще немає раундів.' }, 404)
    return json({ day, serverSeed: entry.seed, serverSeedHash: entry.hash })
  }

  async updateMatchState(callback) {
    return await this.storage.transaction(async transaction => {
      const state = normalizeMatchState(await transaction.get('battle-state'))
      const now = Date.now()
      cleanMatchState(state, now)
      const result = callback(state, now)
      await transaction.put('battle-state', state)
      return result
    })
  }

  async matchmaking(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 16_384)
    } catch {
      return json({ error: 'Некоректний запит.' }, 400)
    }
    const action = cleanText(body?.action, 16)
    const deviceId = cleanText(body?.deviceId, 64)
    const ticketId = cleanText(body?.ticketId, 64)
    if (!ID.test(deviceId) || !ID.test(ticketId)) return json({ error: 'Некоректний matchmaking-квиток.' }, 400)

    if (action === 'status') return json(await this.updateMatchState((state, now) => matchmakingResult(state, deviceId, ticketId, now)))
    if (action === 'cancel') {
      return json(await this.updateMatchState((state, now) => {
        const existing = matchmakingResult(state, deviceId, ticketId, now)
        if (existing.status === 'matched') return existing
        state.queue = state.queue.filter(entry => !(entry.deviceId === deviceId && entry.ticketId === ticketId))
        return { status: 'cancelled' }
      }))
    }
    if (action !== 'join') return json({ error: 'Невідома дія matchmaking.' }, 400)

    const stake = parseStake(body?.stake)
    if (!stake) return json({ error: 'Некоректна ставка для віртуального бою.' }, 400)
    const name = cleanText(body?.name, 24) || 'Гравець'
    const roomId = cleanText(body?.roomId, 64)
    const profileId = cleanText(body?.profileId, 64)
    if (roomId && !ID.test(roomId)) return json({ error: 'Некоректний код кімнати.' }, 400)
    if (profileId && !ID.test(profileId)) return json({ error: 'Некоректний профіль гравця.' }, 400)
    return json(await this.updateMatchState((state, now) => {
      const existing = matchmakingResult(state, deviceId, ticketId, now)
      if (existing.status === 'matched') return existing
      state.queue = state.queue.filter(entry => entry.deviceId !== deviceId)
      const entrant = { deviceId, ticketId, name, profileId, roomId, stake, joinedAt: now }
      state.queue.push(entrant)
      const opponentIndex = state.queue.findIndex(entry => entry.deviceId !== deviceId && entry.ticketId !== ticketId && (entry.roomId || '') === roomId)
      if (opponentIndex >= 0) {
        const [opponent] = state.queue.splice(opponentIndex, 1)
        state.queue = state.queue.filter(entry => entry.ticketId !== ticketId)
        const players = [opponent, entrant]
        const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000
        state.matches.unshift({ id: randomHex(), createdAt: now, winnerTicketId: players[roll < 0.5 ? 0 : 1].ticketId, players })
      }
      return matchmakingResult(state, deviceId, ticketId, now)
    }))
  }

  async presence(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит онлайну.' }, 400)
    }
    const visitorId = cleanText(body?.id, 64)
    if (!ID.test(visitorId)) return json({ error: 'Некоректний ідентифікатор онлайну.' }, 400)

    // The Durable Object holds only a one-way hash, never the browser ID,
    // nickname, Steam account, or IP address. A heartbeat expires naturally.
    const visitorHash = await sha256(visitorId)
    const now = Date.now()
    const online = await this.storage.transaction(async transaction => {
      const active = normalizePresenceState(await transaction.get('presence:active'), now)
      active[visitorHash] = now
      const current = normalizePresenceState(active, now)
      await transaction.put('presence:active', current)
      return Object.keys(current).length
    })
    return json({ online, activeWithinMs: PRESENCE_TTL })
  }

  async community(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 8_192)
    } catch {
      return json({ error: 'Некоректний запит спільноти.' }, 400)
    }
    const visitorId = cleanText(body?.id, 64)
    if (!ID.test(visitorId)) return json({ error: 'Некоректний ідентифікатор гравця.' }, 400)

    const now = Date.now()
    const visitorHash = await sha256(visitorId)
    const player = normalizeCommunityPlayer(body?.player, visitorHash, now)
    if (!player) return json({ error: 'Некоректні дані гравця.' }, 400)
    const rawEvent = body?.event && typeof body.event === 'object'
      ? { ...body.event, playerId: visitorHash, name: player.name, profileId: player.profileId, level: player.level, prestige: player.prestige, at: now }
      : null
    const event = rawEvent ? normalizeCommunityEvent(rawEvent, now) : null
    const result = await this.storage.transaction(async transaction => {
      const state = normalizeCommunityState(await transaction.get('community:season'), now)
      state.players[visitorHash] = player
      if (event) state.events = [event, ...state.events.filter(entry => entry.id !== event.id)].slice(0, COMMUNITY_MAX_EVENTS)
      await transaction.put('community:season', state)
      return communityResponse(state, visitorHash)
    })
    return json(result)
  }

  async steamAuth(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const url = new URL(request.url)
    const origin = url.origin
    const claimedId = url.searchParams.get('openid.claimed_id')
    if (!claimedId) {
      const state = randomHex(32)
      const callback = new URL(`${origin}/api/steam/auth`)
      callback.searchParams.set('state', state)
      await this.storage.put(`steam-auth:${state}`, { origin, expiresAt: Date.now() + STEAM_AUTH_TTL })
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': callback.href,
        'openid.realm': origin,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      })
      const headers = new Headers({
        Location: `${STEAM_OPENID}?${params}`,
        'Cache-Control': 'no-store',
      })
      headers.append('Set-Cookie', sessionCookie(STEAM_AUTH_COOKIE, state, Math.floor(STEAM_AUTH_TTL / 1000), url.protocol === 'https:'))
      return new Response(null, { status: 302, headers })
    }

    const state = url.searchParams.get('state') || ''
    const authCookie = readCookie(request, STEAM_AUTH_COOKIE)
    const pending = /^[a-f0-9]{64}$/i.test(state) && equalHash(state, authCookie)
      ? await this.storage.get(`steam-auth:${state}`)
      : null
    const clearAuth = sessionCookie(STEAM_AUTH_COOKIE, '', 0, url.protocol === 'https:')
    if (!pending || pending.origin !== origin || Number(pending.expiresAt || 0) <= Date.now()) {
      if (pending) await this.storage.delete(`steam-auth:${state}`)
      const headers = new Headers({ Location: `${origin}/?steam_error=state`, 'Cache-Control': 'no-store' })
      headers.append('Set-Cookie', clearAuth)
      return new Response(null, { status: 302, headers })
    }
    // A state is intentionally single-use even when Steam validation fails.
    await this.storage.delete(`steam-auth:${state}`)

    const verify = new URLSearchParams()
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('openid.')) verify.append(key, value)
    })
    verify.set('openid.mode', 'check_authentication')
    let valid = false
    try {
      const response = await timedFetch(STEAM_OPENID, { method: 'POST', body: verify })
      valid = response.ok && (await response.text()).includes('is_valid:true')
    } catch {
      valid = false
    }
    const steamId = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/)?.[1]
    if (!valid || !steamId) {
      const headers = new Headers({ Location: `${origin}/?steam_error=verification`, 'Cache-Control': 'no-store' })
      headers.append('Set-Cookie', clearAuth)
      return new Response(null, { status: 302, headers })
    }
    const sessionToken = randomHex(32)
    const maxAge = Math.floor(STEAM_SESSION_TTL / 1000)
    const createdAt = Date.now()
    const sessionState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`steam:${sessionToken}`))
    const sessionResponse = await sessionState.fetch(new Request('https://internal/__internal/steam-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamId, createdAt, expiresAt: createdAt + STEAM_SESSION_TTL }),
    }))
    if (!sessionResponse.ok) {
      const headers = new Headers({ Location: `${origin}/?steam_error=session`, 'Cache-Control': 'no-store' })
      headers.append('Set-Cookie', clearAuth)
      return new Response(null, { status: 302, headers })
    }
    const headers = new Headers({
      Location: `${origin}/?steam_connected=1`,
      'Cache-Control': 'no-store',
    })
    headers.append('Set-Cookie', sessionCookie(STEAM_SESSION_COOKIE, `${STEAM_SESSION_VERSION}_${sessionToken}`, maxAge, url.protocol === 'https:'))
    headers.append('Set-Cookie', clearAuth)
    return new Response(null, { status: 302, headers })
  }

  async getSteamSession(request) {
    const parsed = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
    if (!parsed) return null
    const session = await this.storage.get(parsed.sharded ? 'steam-session' : `steam-session:${parsed.token}`)
    if (!/^\d{17}$/.test(String(session?.steamId || ''))) return null
    if (Number(session.expiresAt || 0) > Date.now()) return session
    await this.storage.delete(parsed.sharded ? 'steam-session' : `steam-session:${parsed.token}`)
    return null
  }

  async resolveSteamProfile(steamId) {
    const key = `steam-profile:${steamId}`
    const cached = await this.storage.get(key)
    if (cached?.steamId === steamId && cached.avatar && Date.now() - Number(cached.updatedAt || 0) < STEAM_PROFILE_TTL) return cached

    const fallback = {
      steamId,
      name: `Steam_${steamId.slice(-4)}`,
      avatar: '',
      profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
      visibility: 'unknown',
      updatedAt: Date.now(),
    }
    let profile = { ...fallback }
    const steamApiKey = cleanText(this.env?.STEAM_WEB_API_KEY, 256)
    if (steamApiKey) {
      try {
        const apiUrl = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/')
        apiUrl.searchParams.set('key', steamApiKey)
        apiUrl.searchParams.set('steamids', steamId)
        const response = await timedFetch(apiUrl.href, { headers: { Accept: 'application/json' } })
        const player = response.ok ? (await response.json())?.response?.players?.[0] : null
        if (player) {
          profile = {
            ...profile,
            name: cleanText(player.personaname, 48) || profile.name,
            avatar: cleanAvatar(player.avatarfull || player.avatarmedium || player.avatar) || profile.avatar,
            profileUrl: /^https:\/\/steamcommunity\.com\//i.test(String(player.profileurl || '')) ? String(player.profileurl) : profile.profileUrl,
            visibility: Number(player.communityvisibilitystate) === 3 ? 'public' : profile.visibility,
          }
        }
      } catch {
        // Steam's official API is optional. The public profile fallback below keeps
        // the sign-in usable while the API is temporarily unavailable.
      }
    }
    if (!profile.avatar || profile.name === fallback.name) {
      try {
        const response = await timedFetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
          headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' },
        })
        if (response.ok) {
          const xml = await response.text()
          profile = {
            ...profile,
            name: xmlTag(xml, 'steamID') || profile.name,
            avatar: cleanAvatar(xmlTag(xml, 'avatarFull') || xmlTag(xml, 'avatarMedium') || xmlTag(xml, 'avatarIcon')) || profile.avatar,
            visibility: cleanText(xmlTag(xml, 'privacyState'), 24).toLowerCase() || profile.visibility,
          }
        }
      } catch {
        // The public XML feed is not consistently available; use the HTML metadata below.
      }
    }
    if (!profile.avatar || profile.name === fallback.name) {
      try {
        const response = await timedFetch(`https://steamcommunity.com/profiles/${steamId}/`, {
          headers: { Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' },
        })
        if (response.ok) {
          const html = await response.text()
          const title = htmlMeta(html, 'og:title').replace(/^Steam Community\s*::\s*/i, '')
          profile = {
            ...profile,
            name: cleanText(title, 48) || profile.name,
            avatar: cleanAvatar(htmlMeta(html, 'og:image')) || profile.avatar,
          }
        }
      } catch {
        // A visual fallback is returned to the client if Steam is temporarily unavailable.
      }
    }
    profile.updatedAt = Date.now()
    await this.storage.put(key, profile)
    return profile
  }

  async steamProfile(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const session = await this.getSteamSession(request)
    if (!session) return json({ error: 'Сесія Steam завершилась. Увійди через Steam ще раз.' }, 401)
    return json(await this.resolveSteamProfile(session.steamId), 200, { 'Cache-Control': 'private, no-store' })
  }

  async steamAvatar(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const session = await this.getSteamSession(request)
    if (!session) return json({ error: 'Сесія Steam завершилась. Увійди через Steam ще раз.' }, 401)
    const profile = await this.resolveSteamProfile(session.steamId)
    const avatar = cleanAvatar(profile?.avatar)
    if (!avatar) return json({ error: 'Steam не повернув аватар для цього профілю.' }, 404)
    try {
      const response = await timedFetch(avatar, { headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } })
      const contentType = response.headers.get('Content-Type') || ''
      if (!response.ok || !/^image\//i.test(contentType) || !response.body) throw new Error('Invalid Steam avatar response')
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=300',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch {
      return json({ error: 'Steam тимчасово не віддає аватар.' }, 502)
    }
  }

  async steamSession(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const session = await this.getSteamSession(request)
    if (!session) return json({ connected: false, error: 'Сесія Steam завершилась. Увійди через Steam ще раз.' }, 401)
    return json({
      connected: true,
      profile: await this.resolveSteamProfile(session.steamId),
      expiresAt: session.expiresAt,
    }, 200, { 'Cache-Control': 'private, no-store' })
  }

  async steamLogout(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const url = new URL(request.url)
    const requestOrigin = request.headers.get('Origin')
    if (requestOrigin && requestOrigin !== url.origin) return json({ error: 'Некоректне походження запиту.' }, 403)
    const parsed = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
    if (parsed) await this.storage.delete(parsed.sharded ? 'steam-session' : `steam-session:${parsed.token}`)
    const headers = new Headers(JSON_HEADERS)
    headers.append('Set-Cookie', sessionCookie(STEAM_SESSION_COOKIE, '', 0, url.protocol === 'https:'))
    headers.append('Set-Cookie', sessionCookie(STEAM_AUTH_COOKIE, '', 0, url.protocol === 'https:'))
    return new Response(JSON.stringify({ connected: false }), { status: 200, headers })
  }

  async steamInventory(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const session = await this.getSteamSession(request)
    if (!session) return json({ error: 'Сесія Steam завершилась. Увійди через Steam ще раз.' }, 401)
    const steamId = session.steamId
    const cursor = new URL(request.url).searchParams.get('cursor') || ''
    if (cursor && !/^\d{1,24}$/.test(cursor)) return json({ error: 'Некоректна сторінка інвентарю Steam.' }, 400)
    const inventoryUrl = new URL(`https://steamcommunity.com/inventory/${steamId}/730/2`)
    inventoryUrl.searchParams.set('l', 'ukrainian')
    inventoryUrl.searchParams.set('count', '500')
    if (cursor) inventoryUrl.searchParams.set('start_assetid', cursor)
    let response
    try {
      response = await timedFetch(inventoryUrl.href)
    } catch {
      return json({ error: 'Steam тимчасово не віддає інвентар.' }, 502)
    }
    if (!response.ok) {
      const message = response.status === 403 ? 'Інвентар Steam закритий. Зроби його публічним у налаштуваннях приватності.' : 'Steam тимчасово не віддає інвентар.'
      return json({ error: message }, response.status === 403 ? 403 : 502)
    }
    let data
    try {
      data = await response.json()
    } catch {
      return json({ error: 'Steam повернув некоректну відповідь.' }, 502)
    }
    const descriptions = new Map((data.descriptions || []).map(item => [`${item.classid}_${item.instanceid}`, item]))
    const items = (data.assets || []).slice(0, 500).map(asset => {
      const item = descriptions.get(`${asset.classid}_${asset.instanceid}`)
      const rawIcon = item?.icon_url_large || item?.icon_url
      const icon = typeof rawIcon === 'string' && /^[A-Za-z0-9_\-/]+$/.test(rawIcon) ? rawIcon : ''
      if (!item || !icon) return null
      return {
        id: cleanText(asset.assetid, 64),
        name: cleanText(item.market_hash_name || item.name || 'CS2 Skin', 160),
        rarity: cleanText(item.tags?.find(tag => tag.category === 'Rarity')?.localized_tag_name || 'CS2', 48),
        rarityColor: cleanColor(item.tags?.find(tag => tag.category === 'Rarity')?.color),
        img: `https://community.cloudflare.steamstatic.com/economy/image/${icon}/360fx360f`,
        tradable: Boolean(item.tradable),
      }
    }).filter(Boolean)
    const hasMore = data.more_items === true || data.more_items === 1
    const nextCursor = hasMore && /^\d{1,24}$/.test(String(data.last_assetid || '')) ? String(data.last_assetid) : null
    return json({
      items,
      profile: await this.resolveSteamProfile(steamId),
      // Steam asset IDs may exceed Number.MAX_SAFE_INTEGER. Keep the cursor
      // opaque so pagination never loses precision for large inventories.
      cursor: cursor || null,
      hasMore: Boolean(nextCursor),
      nextCursor,
    }, 200, { 'Cache-Control': 'private, no-store' })
  }

  async skinCatalog(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const cacheKey = 'catalog:skins:v1'
    const cached = await this.storage.get(cacheKey)
    const cachedItems = Array.isArray(cached?.items) ? cached.items : []
    const cacheAge = Date.now() - Number(cached?.updatedAt || 0)
    if (cachedItems.length >= 50 && cacheAge >= 0 && cacheAge < CATALOG_TTL) {
      return json(cachedItems, 200, { 'Cache-Control': 'public, max-age=3600, s-maxage=21600' })
    }
    for (const source of CATALOG_SOURCES) {
      try {
        const response = await timedFetch(source, { headers: { Accept: 'application/json' } })
        if (!response.ok) continue
        const catalog = await response.json()
        if (!Array.isArray(catalog) || catalog.length === 0) continue
        const safeCatalog = catalog.slice(0, 5_000).map((skin, index) => ({
          id: cleanText(skin?.id || `cs2-${index}`, 128),
          name: cleanText(skin?.name, 160),
          weapon: { name: cleanText(skin?.weapon?.name, 64) },
          category: { name: cleanText(skin?.category?.name, 64) },
          rarity: { name: cleanText(skin?.rarity?.name || 'Consumer Grade', 48), color: cleanColor(skin?.rarity?.color) },
          image: cleanImage(skin?.image),
        })).filter(skin => skin.name && skin.weapon.name && skin.category.name && skin.image)
        if (safeCatalog.length >= 50) {
          await this.storage.put(cacheKey, { items: safeCatalog, updatedAt: Date.now() })
          return json(safeCatalog, 200, { 'Cache-Control': 'public, max-age=3600, s-maxage=21600' })
        }
      } catch {
        // Try the next public mirror.
      }
    }
    if (cachedItems.length >= 50 && cacheAge >= 0 && cacheAge < CATALOG_STALE_TTL) {
      return json(cachedItems, 200, {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Warning': '110 - "Каталог показано з локального кешу"',
      })
    }
    return json({ error: 'Каталог скінів тимчасово недоступний.' }, 502)
  }
}

export class RateLimiter {
  constructor(state) {
    this.storage = state.storage
  }

  async fetch(request) {
    const path = new URL(request.url).pathname
    const group = cleanText(path.split('/').pop(), 32)
    const config = RATE_LIMITS[group] || RATE_LIMITS.api
    const key = cleanText(request.headers.get('X-Potuzhno-Rate-Key'), 128)
    if (!key) return json({ allowed: false }, 400)

    const now = Date.now()
    const storageKey = `bucket:${group}:${key}`
    const current = await this.storage.get(storageKey)
    const startedAt = Number(current?.startedAt || 0)
    const fresh = startedAt > 0 && now - startedAt < config.windowMs
    const count = (fresh ? Number(current?.count || 0) : 0) + 1
    const resetAt = (fresh ? startedAt : now) + config.windowMs
    await this.storage.put(storageKey, { startedAt: fresh ? startedAt : now, count })
    await this.storage.setAlarm(resetAt + 1_000)
    return json({
      allowed: count <= config.limit,
      limit: config.limit,
      remaining: Math.max(0, config.limit - count),
      resetAt,
    }, count <= config.limit ? 200 : 429)
  }

  async alarm() {
    await this.storage.deleteAll()
  }
}

async function requestBodyForRouting(request) {
  try {
    return await request.clone().json()
  } catch {
    return null
  }
}

async function rateLimitResponse(request, env, path) {
  const group = rateLimitGroup(path)
  const address = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'local'
  const hashedAddress = await sha256(address)
  // Hash-prefix sharding prevents one global rate-limit object from becoming a
  // bottleneck while the full hash keeps different visitors isolated inside it.
  const shard = env.POTUZHNO_RATE_LIMIT.idFromName(`ip:${hashedAddress.slice(0, 6)}`)
  const response = await env.POTUZHNO_RATE_LIMIT.get(shard).fetch(new Request(`https://internal/limit/${group}`, {
    headers: { 'X-Potuzhno-Rate-Key': hashedAddress },
  }))
  const data = await response.json()
  if (data?.allowed) return null
  const retryAfter = Math.max(1, Math.ceil((Number(data?.resetAt || Date.now()) - Date.now()) / 1_000))
  return json({ error: 'Забагато запитів. Зачекай трохи та повтори спробу.' }, 429, {
    'Retry-After': String(retryAfter),
    'X-RateLimit-Limit': String(data?.limit || 0),
    'X-RateLimit-Remaining': '0',
  })
}

async function stateForRequest(request, env, path) {
  const url = new URL(request.url)
  let name = 'global'

  if (path === '/api/profile/sync' && request.method === 'POST') {
    const body = await requestBodyForRouting(request)
    if (ID.test(String(body?.accountId || ''))) name = `profile:${body.accountId}`
  } else if ((path === '/api/public-profile' && request.method === 'GET') || path === '/api/public-avatar') {
    const id = url.searchParams.get('id') || ''
    if (ID.test(id)) name = `public:${id}`
  } else if (path === '/api/public-profile' && request.method === 'POST') {
    const body = await requestBodyForRouting(request)
    if (ID.test(String(body?.id || ''))) name = `public:${body.id}`
  } else if (path.startsWith('/api/steam/') && path !== '/api/steam/auth') {
    const session = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
    if (session?.sharded) name = `steam:${session.token}`
  } else if (path === '/api/catalog/skins') {
    name = 'catalog'
  } else if (path === '/api/presence') {
    name = 'presence'
  } else if (path === '/api/community') {
    name = 'community'
  } else if (path === '/api/matchmaking' && request.method === 'POST') {
    const body = await requestBodyForRouting(request)
    const roomId = String(body?.roomId || '')
    if (ID.test(roomId)) name = `match-room:${roomId}`
  } else if (hasFairSecret(env) && path === '/api/fair/roll' && request.method === 'POST') {
    const body = await requestBodyForRouting(request)
    const deviceId = String(body?.deviceId || '')
    if (ID.test(deviceId)) name = `fair:${dayKey()}:${(await sha256(deviceId)).slice(0, 24)}`
  }

  return env.POTUZHNO_STATE.get(env.POTUZHNO_STATE.idFromName(name))
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    // This is a read-only, host-restricted image relay. It does not access
    // account data or mutate state, so it must not compete with game API calls
    // for the normal per-minute Durable Object rate-limit budget.
    if (path === '/api/skin-image') return skinImage(request)
    if (path.startsWith('/api/')) {
      if (request.method === 'POST') {
        const origin = request.headers.get('Origin')
        if (origin && origin !== url.origin) return json({ error: 'Некоректне походження запиту.' }, 403)
      }
      const limited = await rateLimitResponse(request, env, path)
      if (limited) return limited
      return (await stateForRequest(request, env, path)).fetch(request)
    }
    return env.ASSETS.fetch(request)
  },
}
