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
const PUBLIC_PROFILE_TITLES = new Set(['night_hunter_2026', 'midnight_keeper_2026', 'rift_breaker_2026', 'aurora_conductor_2026', 'icewire_survivor_2026'])
const PUBLIC_PROFILE_FRAMES = new Set(['halloween_night_2026', 'aurora_frame_2026'])
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
const COMMUNITY_CIRCUIT_PHASE_SIZE = 18
const COMMUNITY_CIRCUIT_PHASES = 4
const COMMUNITY_CIRCUIT_DAILY_LIMIT = 1
const COMMUNITY_CIRCUIT_RECENT_LIMIT = 8
const COMMUNITY_RIFT_MAX_HEALTH = 2_500
const COMMUNITY_RIFT_DAILY_LIMIT = 3
const COMMUNITY_RIFT_RECENT_LIMIT = 8
const ADMIN_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADMIN_MAX_MEMBERS = 200
const ADMIN_MAX_AUDIT_EVENTS = 500
const ADMIN_MAX_SESSIONS = 600
const ADMIN_MAX_INVITES = 200
const ADMIN_OWNER_SUBJECT = 'owner'
const ADMIN_SESSION_COOKIE = 'potuzhno_admin_session'
const ADMIN_SESSION_TTL = 14 * 24 * 60 * 60_000
const ADMIN_INVITE_TTL = 24 * 60 * 60_000
const ADMIN_TOKEN = /^[a-f0-9]{64}$/i
const ADMIN_GAME_MAX_BALANCE = 10_000_000
const ADMIN_GAME_MAX_XP = 100_000_000
const ADMIN_GAME_MAX_TICKETS = 999
const ADMIN_GAME_MAX_PRESTIGE = 99
const ADMIN_GAME_MAX_INVENTORY = 10_000
const ADMIN_GAME_PLAYER_LEVEL_XP = 1_200
const ADMIN_GAME_PASS_MAX_XP = 30 * 750
const ADMIN_GAME_MAX_LEVEL = Math.floor(ADMIN_GAME_MAX_XP / ADMIN_GAME_PLAYER_LEVEL_XP) + 1
const ADMIN_GAME_BLOCK_REASON_MAX = 240
const ADMIN_PLAYER_DIRECTORY_MAX = 5_000
const ADMIN_PLAYER_DIRECTORY_PAGE_SIZE = 600
const ADMIN_ROLES = Object.freeze({
  owner: {
    label: 'Власник',
    rank: 5,
    description: 'Повний контроль і незмінний захист облікового запису.',
  },
  full_admin: {
    label: 'Повний адмін',
    rank: 4,
    description: 'Керує сайтом і нижчими ролями, але не власником чи іншими повними адмінами.',
  },
  admin: {
    label: 'Адмін',
    rank: 3,
    description: 'Операційне керування та модерація команди нижчого рівня.',
  },
  moderator: {
    label: 'Модератор',
    rank: 2,
    description: 'Модерація без доступу до ролей вищого рівня.',
  },
  support: {
    label: 'Підтримка',
    rank: 1,
    description: 'Перегляд панелі та робота з підтримкою без керування доступами.',
  },
})
const ADMIN_ASSIGNABLE_ROLES = Object.freeze({
  owner: ['full_admin', 'admin', 'moderator', 'support'],
  full_admin: ['admin', 'moderator', 'support'],
  admin: ['moderator', 'support'],
  moderator: [],
  support: [],
})
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
  adminLogin: { limit: 8, windowMs: 10 * 60_000 },
  admin: { limit: 60, windowMs: 60_000 },
  api: { limit: 120, windowMs: 60_000 },
}
const encoder = new TextEncoder()

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...JSON_HEADERS, ...headers },
})

const cleanText = (value, limit) => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, limit)
const dayKey = () => new Date().toISOString().slice(0, 10)

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase()
  return ADMIN_EMAIL.test(email) ? email : ''
}

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
  const cosmetics = value.cosmetics && typeof value.cosmetics === 'object' && !Array.isArray(value.cosmetics) ? value.cosmetics : {}
  const signal = value.signal && typeof value.signal === 'object' && !Array.isArray(value.signal) ? value.signal : {}
  const name = cleanText(value.name, 24)
  if (!name) return null
  return {
    name,
    avatar: cleanAvatar(value.avatar),
    level: Math.round(Math.min(9_999, Math.max(1, Number(value.level) || 1))),
    prestige: Math.round(Math.min(99, Math.max(0, Number(value.prestige) || 0))),
    steamConnected: value.steamConnected === true,
    cosmetics: {
      title: PUBLIC_PROFILE_TITLES.has(String(cosmetics.title || '')) ? String(cosmetics.title) : '',
      frame: PUBLIC_PROFILE_FRAMES.has(String(cosmetics.frame || '')) ? String(cosmetics.frame) : '',
    },
    signal: {
      forged: signal.forged === true,
      routes: Math.round(Math.min(9_999, Math.max(0, Number(signal.routes) || 0))),
    },
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

function adminSessionToken(value) {
  const token = String(value || '')
  return ADMIN_TOKEN.test(token) ? token.toLowerCase() : ''
}

function adminSessionCookie(value, maxAge, secure) {
  return `${ADMIN_SESSION_COOKIE}=${value}; Path=/api/admin; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`
}

function hasAdminOwnerPassword(env) {
  return typeof env?.ADMIN_OWNER_PASSWORD === 'string' && env.ADMIN_OWNER_PASSWORD.length >= 24
}

function steamSessionToken(value) {
  const session = String(value || '')
  const match = session.match(new RegExp(`^${STEAM_SESSION_VERSION}_([a-f0-9]{64})$`, 'i'))
  if (match) return { token: match[1].toLowerCase(), sharded: true }
  if (/^[a-f0-9]{64}$/i.test(session)) return { token: session.toLowerCase(), sharded: false }
  return null
}

function rateLimitGroup(path) {
  if (path === '/api/admin/login' || path === '/api/admin/activate-invite') return 'adminLogin'
  if (path.startsWith('/api/admin/')) return 'admin'
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

function communityCircuitWeekKey() {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function communityCircuitDayKey() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeCommunityCircuit(value, now) {
  const week = communityCircuitWeekKey()
  const source = value?.week === week && value && typeof value === 'object' ? value : {}
  const today = communityCircuitDayKey()
  const daily = Object.fromEntries(Object.entries(source.daily && typeof source.daily === 'object' ? source.daily : {})
    .map(([visitorHash, entry]) => {
      const validHash = /^[a-f0-9]{64}$/i.test(visitorHash)
      const count = boundedInteger(entry?.count, 0, COMMUNITY_CIRCUIT_DAILY_LIMIT)
      return validHash && entry?.date === today && count ? [visitorHash, { date: today, count }] : null
    })
    .filter(Boolean)
    .slice(0, COMMUNITY_MAX_PLAYERS))
  const recent = (Array.isArray(source.recent) ? source.recent : [])
    .map(entry => {
      const playerId = cleanText(entry?.playerId, 64)
      const name = cleanText(entry?.name, 24)
      const at = boundedInteger(entry?.at, now - 8 * 24 * 60 * 60_000, now, now)
      return /^[a-f0-9]{64}$/i.test(playerId) && name ? { id: cleanText(entry?.id, 48) || randomHex(12), playerId, name, at } : null
    })
    .filter(Boolean)
    .sort((left, right) => right.at - left.at)
    .slice(0, COMMUNITY_CIRCUIT_RECENT_LIMIT)
  return {
    week,
    total: boundedInteger(source.total, 0, 999_999),
    daily,
    recent,
  }
}

function applyCommunityCircuitPulse(circuit, visitorHash, player, pulse, now) {
  const id = cleanText(pulse?.id, 48)
  if (!id) return false
  const today = communityCircuitDayKey()
  const previous = circuit.daily[visitorHash]
  if (previous?.date === today && previous.count >= COMMUNITY_CIRCUIT_DAILY_LIMIT) return false
  if (circuit.recent.some(entry => entry.id === id)) return false
  circuit.daily[visitorHash] = { date: today, count: Math.min(COMMUNITY_CIRCUIT_DAILY_LIMIT, (previous?.date === today ? previous.count : 0) + 1) }
  circuit.total = Math.min(999_999, circuit.total + 1)
  circuit.recent = [{ id, playerId: visitorHash, name: player.name, at: now }, ...circuit.recent].slice(0, COMMUNITY_CIRCUIT_RECENT_LIMIT)
  return true
}

function normalizeCommunityRift(value, now) {
  const day = communityCircuitDayKey()
  const source = value?.day === day && value && typeof value === 'object' ? value : {}
  const daily = Object.fromEntries(Object.entries(source.daily && typeof source.daily === 'object' ? source.daily : {})
    .map(([visitorHash, entry]) => {
      const validHash = /^[a-f0-9]{64}$/i.test(visitorHash)
      const count = boundedInteger(entry?.count, 0, COMMUNITY_RIFT_DAILY_LIMIT)
      return validHash && count ? [visitorHash, { count }] : null
    })
    .filter(Boolean)
    .slice(0, COMMUNITY_MAX_PLAYERS))
  const recent = (Array.isArray(source.recent) ? source.recent : [])
    .map(entry => {
      const playerId = cleanText(entry?.playerId, 64)
      const name = cleanText(entry?.name, 24)
      const damage = boundedInteger(entry?.damage, 12, 90, 12)
      const at = boundedInteger(entry?.at, now - 24 * 60 * 60_000, now, now)
      return /^[a-f0-9]{64}$/i.test(playerId) && name ? { id: cleanText(entry?.id, 48) || randomHex(12), playerId, name, damage, at } : null
    })
    .filter(Boolean)
    .sort((left, right) => right.at - left.at)
    .slice(0, COMMUNITY_RIFT_RECENT_LIMIT)
  return {
    day,
    health: boundedInteger(source.health, 0, COMMUNITY_RIFT_MAX_HEALTH, COMMUNITY_RIFT_MAX_HEALTH),
    hits: boundedInteger(source.hits, 0, 999_999),
    daily,
    recent,
  }
}

function applyCommunityRiftPulse(rift, visitorHash, player, pulse, now) {
  const id = cleanText(pulse?.id, 48)
  if (!id || rift.health <= 0) return false
  const previous = rift.daily[visitorHash]
  if (previous?.count >= COMMUNITY_RIFT_DAILY_LIMIT || rift.recent.some(entry => entry.id === id)) return false
  const damage = boundedInteger(pulse?.damage, 12, 90, 12)
  rift.daily[visitorHash] = { count: Math.min(COMMUNITY_RIFT_DAILY_LIMIT, (previous?.count || 0) + 1) }
  rift.health = Math.max(0, rift.health - damage)
  rift.hits = Math.min(999_999, rift.hits + 1)
  rift.recent = [{ id, playerId: visitorHash, name: player.name, damage, at: now }, ...rift.recent].slice(0, COMMUNITY_RIFT_RECENT_LIMIT)
  return true
}

function normalizeCommunityPlayer(value, visitorHash, now) {
  const name = cleanText(value?.name, 24)
  if (!name) return null
  const profileId = cleanText(value?.profileId, 64)
  const cloudProfileId = cleanText(value?.cloudProfileId, 64)
  return {
    id: visitorHash,
    name,
    profileId: ID.test(profileId) ? profileId : '',
    cloudProfileId: ID.test(cloudProfileId) ? cloudProfileId : '',
    xp: boundedInteger(value?.xp, 0, 9_999_999),
    wins: boundedInteger(value?.wins, 0, 9_999_999),
    rounds: boundedInteger(value?.rounds, 0, 9_999_999),
    collectionValue: boundedInteger(value?.collectionValue, 0, MAX_PRICE * 10_000),
    inventoryTotal: boundedInteger(value?.inventoryTotal, 0, ADMIN_GAME_MAX_INVENTORY),
    level: boundedInteger(value?.level, 1, 9_999),
    prestige: boundedInteger(value?.prestige, 0, 99),
    hidden: value?.hidden === true,
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
  return { season, players: Object.fromEntries(players), events, circuit: normalizeCommunityCircuit(source.circuit, now), rift: normalizeCommunityRift(source.rift, now) }
}

function communityResponse(state, visitorHash) {
  const rows = Object.values(state.players)
    .filter(player => player.hidden !== true)
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
  const events = state.events.filter(event => state.players[event.playerId]?.hidden !== true)
  const circuit = normalizeCommunityCircuit(state.circuit, Date.now())
  const recent = circuit.recent
    .filter(entry => state.players[entry.playerId]?.hidden !== true)
    .map(entry => ({ name: entry.name, at: entry.at }))
  const phase = Math.min(COMMUNITY_CIRCUIT_PHASES, Math.floor(circuit.total / COMMUNITY_CIRCUIT_PHASE_SIZE) + 1)
  const rift = normalizeCommunityRift(state.rift, Date.now())
  const riftRecent = rift.recent
    .filter(entry => state.players[entry.playerId]?.hidden !== true)
    .map(entry => ({ name: entry.name, damage: entry.damage, at: entry.at }))
  return {
    season: state.season,
    leaderboard,
    rank: ownRank || null,
    events,
    circuit: {
      week: circuit.week,
      total: circuit.total,
      phase,
      phaseSize: COMMUNITY_CIRCUIT_PHASE_SIZE,
      phaseProgress: circuit.total % COMMUNITY_CIRCUIT_PHASE_SIZE,
      recent,
    },
    rift: {
      day: rift.day,
      maxHealth: COMMUNITY_RIFT_MAX_HEALTH,
      health: rift.health,
      hits: rift.hits,
      recent: riftRecent,
    },
  }
}

function adminRoleRank(role) {
  return ADMIN_ROLES[role]?.rank || 0
}

function adminRoleView(role) {
  const definition = ADMIN_ROLES[role] || ADMIN_ROLES.support
  return { id: role, label: definition.label, rank: definition.rank, description: definition.description }
}

function adminGameCapabilities(actor) {
  const rank = adminRoleRank(actor?.role)
  if (rank >= 4) return { read: true, grant: true, configure: true, inventory: true, moderate: true }
  if (rank === 3) return { read: true, grant: true, configure: false, inventory: false, moderate: false }
  if (rank === 2) return { read: true, grant: false, configure: false, inventory: false, moderate: false }
  return { read: false, grant: false, configure: false, inventory: false, moderate: false }
}

function canRunAdminGameOperation(actor, operation) {
  const capabilities = adminGameCapabilities(actor)
  if (!capabilities.read) return false
  if (['pc_add', 'xp_add', 'level_add', 'tickets_add', 'pass_xp_add', 'premium_enable', 'skin_grant'].includes(operation)) return capabilities.grant
  if (['pc_set', 'xp_set', 'level_set', 'tickets_set', 'pass_xp_set', 'premium_disable', 'prestige_set', 'site_hide', 'site_show'].includes(operation)) return capabilities.configure
  if (operation === 'skin_remove') return capabilities.inventory
  if (operation === 'block' || operation === 'unblock') return capabilities.moderate
  return false
}

function adminProfileModeration(value, now = Date.now()) {
  const blocked = value?.blocked === true
  return {
    blocked,
    reason: blocked ? cleanText(value?.reason, ADMIN_GAME_BLOCK_REASON_MAX) || 'Доступ до гри тимчасово обмежено адміністрацією.' : '',
    updatedAt: boundedInteger(value?.updatedAt, 0, Number.MAX_SAFE_INTEGER, now),
  }
}

function adminProfileVisibility(value, now = Date.now()) {
  return {
    hidden: value?.hidden === true,
    updatedAt: boundedInteger(value?.updatedAt, 0, Number.MAX_SAFE_INTEGER, now),
  }
}

function safeAdminInventoryItem(value, index = 0) {
  if (!value || typeof value !== 'object') return null
  const compact = Array.isArray(value) ? value : null
  const isSteam = compact?.[0] === 1
  const id = cleanText(compact ? (isSteam ? `steam-copy-${compact[2]}-${compact[1]}` : compact[1]) : value.id, 128)
  const name = cleanText(compact ? compact[3] : value.name, 160)
  if (!id || !name) return null
  return {
    id,
    name,
    sourceSkinId: cleanText(compact ? (isSteam ? compact[1] : compact[2]) : value.sourceSkinId, 128),
    rarity: cleanText(compact ? compact[4] : value.rarity, 48) || 'CS2',
    rarityColor: cleanColor(compact ? compact[5] : value.rarityColor),
    img: cleanImage(compact ? compact[6] : value.img),
    price: boundedInteger(compact ? compact[7] : (value.price ?? value.basePrice), 1, MAX_PRICE),
    addedAt: boundedInteger(compact ? compact[11] : value.addedAt, 0, Number.MAX_SAFE_INTEGER, index),
    exclusive: compact ? compact[10] === 1 : value.exclusive === true,
  }
}

function adminProfileSummary(accountId, entry) {
  const payload = entry?.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload) ? entry.payload : null
  if (!payload) return null
  const gameState = payload.gameState && typeof payload.gameState === 'object' && !Array.isArray(payload.gameState) ? payload.gameState : {}
  const pass = gameState.battlePass && typeof gameState.battlePass === 'object' && !Array.isArray(gameState.battlePass) ? gameState.battlePass : {}
  const inventory = Array.isArray(payload.inventory) ? payload.inventory : []
  const safeItems = inventory.map(safeAdminInventoryItem).filter(Boolean)
  const xp = boundedInteger(gameState.xp, 0, ADMIN_GAME_MAX_XP)
  return {
    accountId,
    name: cleanText(payload.account?.nick, 24) || 'Гравець',
    updatedAt: boundedInteger(entry.updatedAt, 0, Number.MAX_SAFE_INTEGER),
    revision: boundedInteger(entry.revision, 1, Number.MAX_SAFE_INTEGER, 1),
    balance: boundedInteger(payload.balance, 0, ADMIN_GAME_MAX_BALANCE),
    xp,
    level: Math.floor(xp / ADMIN_GAME_PLAYER_LEVEL_XP) + 1,
    prestige: boundedInteger(gameState.prestige, 0, ADMIN_GAME_MAX_PRESTIGE),
    caseTickets: boundedInteger(gameState.caseTickets, 0, ADMIN_GAME_MAX_TICKETS),
    battlePass: {
      season: cleanText(pass.season, 48) || 'season-01',
      xp: boundedInteger(pass.xp, 0, ADMIN_GAME_PASS_MAX_XP),
      premium: pass.premium === true,
    },
    moderation: adminProfileModeration(payload.moderation, entry.updatedAt),
    visibility: adminProfileVisibility(payload.visibility, entry.updatedAt),
    inventoryTotal: safeItems.length,
    inventory: safeItems.sort((left, right) => right.addedAt - left.addedAt).slice(0, 60),
  }
}

function adminPlayerDirectoryEntry(accountId, entry) {
  const summary = adminProfileSummary(accountId, entry)
  if (!summary) return null
  return {
    accountId: summary.accountId,
    visitorId: '',
    name: summary.name,
    level: summary.level,
    prestige: summary.prestige,
    inventoryTotal: summary.inventoryTotal,
    xp: summary.xp,
    wins: 0,
    rounds: 0,
    collectionValue: 0,
    firstSeenAt: summary.updatedAt,
    updatedAt: summary.updatedAt,
    blocked: summary.moderation.blocked,
    hidden: summary.visibility.hidden,
  }
}

function adminVisitorDirectoryEntry(visitorHash, player, firstSeenAt = 0) {
  if (!/^[a-f0-9]{64}$/i.test(visitorHash) || !player) return null
  return normalizeAdminPlayerDirectoryEntry({
    accountId: player.cloudProfileId,
    visitorId: visitorHash,
    name: player.name,
    level: player.level,
    prestige: player.prestige,
    inventoryTotal: player.inventoryTotal,
    xp: player.xp,
    wins: player.wins,
    rounds: player.rounds,
    collectionValue: player.collectionValue,
    firstSeenAt,
    updatedAt: player.updatedAt,
  })
}

function normalizeAdminPlayerDirectoryEntry(value) {
  const accountId = cleanText(value?.accountId, 64)
  const visitorId = cleanText(value?.visitorId, 64).toLowerCase()
  const hasCloudProfile = ID.test(accountId)
  const hasVisitor = /^[a-f0-9]{64}$/i.test(visitorId)
  if (!hasCloudProfile && !hasVisitor) return null
  const updatedAt = boundedInteger(value?.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  const firstSeenAt = boundedInteger(value?.firstSeenAt, 0, updatedAt || Number.MAX_SAFE_INTEGER, updatedAt)
  return {
    accountId: hasCloudProfile ? accountId : '',
    visitorId: hasVisitor ? visitorId : '',
    name: cleanText(value?.name, 24) || 'Гравець',
    level: boundedInteger(value?.level, 1, 99_999, 1),
    prestige: boundedInteger(value?.prestige, 0, ADMIN_GAME_MAX_PRESTIGE),
    inventoryTotal: boundedInteger(value?.inventoryTotal, 0, ADMIN_GAME_MAX_INVENTORY),
    xp: boundedInteger(value?.xp, 0, ADMIN_GAME_MAX_XP),
    wins: boundedInteger(value?.wins, 0, 9_999_999),
    rounds: boundedInteger(value?.rounds, 0, 9_999_999),
    collectionValue: boundedInteger(value?.collectionValue, 0, MAX_PRICE * 10_000),
    firstSeenAt,
    updatedAt,
    blocked: value?.blocked === true,
    hidden: value?.hidden === true,
  }
}

function adminCatalogSkin(value) {
  if (!value || typeof value !== 'object') return null
  const id = cleanText(value.id, 128)
  const name = cleanText(value.name, 160)
  const weapon = cleanText(value.weapon?.name, 64)
  const category = cleanText(value.category?.name, 64)
  const rarity = cleanText(value.rarity?.name, 48) || 'Consumer Grade'
  const img = cleanImage(value.image)
  if (!id || !name || !weapon || !category || !img) return null
  const idText = `${id}:${name}`
  let hash = 2166136261
  for (const char of idText) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  const roll = (hash >>> 0) / 4_294_967_295
  const premium = /Doppler|Fade|Marble|Gamma|Lore|Slaughter|Crimson|Tiger Tooth|Emerald|Ruby|Sapphire|Pandora|Vice/i.test(name)
  let price
  if (category === 'Knives') price = 650 + Math.round(Math.pow(roll, 1.75) * 12_500) + (premium ? 11_000 : 0)
  else if (category === 'Gloves') price = 450 + Math.round(Math.pow(roll, 1.6) * 7_000) + (premium ? 6_000 : 0)
  else {
    const base = ({ 'Consumer Grade': 12, 'Industrial Grade': 28, 'Mil-Spec Grade': 70, Restricted: 190, Classified: 520, Covert: 1_450, Contraband: 9_000, Extraordinary: 5_000 })[rarity] || 60
    price = base * (0.7 + roll * 1.35) + (premium ? base * 0.65 : 0)
  }
  return {
    id,
    name,
    weapon,
    category,
    rarity,
    rarityColor: cleanColor(value.rarity?.color),
    img,
    price: boundedInteger(price, 10, MAX_PRICE),
  }
}

function normalizeAdminMember(value, email, now) {
  const role = Object.hasOwn(ADMIN_ROLES, value?.role) && value.role !== 'owner' ? value.role : 'support'
  const status = value?.status === 'suspended' ? 'suspended' : 'active'
  return {
    id: email,
    email,
    name: cleanText(value?.name, 48),
    role,
    status,
    createdAt: boundedInteger(value?.createdAt, 0, now, now),
    updatedAt: boundedInteger(value?.updatedAt, 0, now, now),
    updatedBy: cleanEmail(value?.updatedBy),
  }
}

function normalizeAdminAuditEntry(value, now) {
  const action = cleanText(value?.action, 48)
  const actor = cleanText(value?.actor || value?.actorEmail, 48)
  if (!action || !actor) return null
  return {
    id: cleanText(value?.id, 48) || randomHex(12),
    at: boundedInteger(value?.at, 0, now, now),
    actor,
    action,
    target: cleanText(value?.target || value?.targetEmail, 96),
    detail: cleanText(value?.detail, 160),
  }
}

function normalizeAdminState(value, now) {
  const rawMembers = value?.members && typeof value.members === 'object' && !Array.isArray(value.members) ? value.members : {}
  const members = Object.entries(rawMembers)
    .map(([rawEmail, member]) => {
      const email = cleanEmail(rawEmail)
      return email ? [email, normalizeAdminMember(member, email, now)] : null
    })
    .filter(Boolean)
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, ADMIN_MAX_MEMBERS)
  const memberMap = Object.fromEntries(members)
  const rawSessions = value?.sessions && typeof value.sessions === 'object' && !Array.isArray(value.sessions) ? value.sessions : {}
  const sessions = Object.entries(rawSessions)
    .map(([hash, session]) => {
      const tokenHash = /^[a-f0-9]{64}$/i.test(hash) ? hash.toLowerCase() : ''
      const subject = cleanText(session?.subject, 254)
      const expiresAt = boundedInteger(session?.expiresAt, 0, now + ADMIN_SESSION_TTL, 0)
      if (!tokenHash || !subject || expiresAt <= now || (subject !== ADMIN_OWNER_SUBJECT && !memberMap[subject])) return null
      return [tokenHash, {
        subject,
        createdAt: boundedInteger(session?.createdAt, 0, now, now),
        expiresAt,
      }]
    })
    .filter(Boolean)
    .sort(([, left], [, right]) => right.createdAt - left.createdAt)
    .slice(0, ADMIN_MAX_SESSIONS)
  const rawInvites = Array.isArray(value?.invites) ? value.invites : []
  const invites = rawInvites
    .map(invite => {
      const tokenHash = /^[a-f0-9]{64}$/i.test(invite?.tokenHash) ? invite.tokenHash.toLowerCase() : ''
      const targetEmail = cleanEmail(invite?.targetEmail)
      const expiresAt = boundedInteger(invite?.expiresAt, 0, now + ADMIN_INVITE_TTL, 0)
      if (!tokenHash || !targetEmail || !memberMap[targetEmail] || expiresAt <= now) return null
      return {
        id: cleanText(invite?.id, 48) || randomHex(12),
        tokenHash,
        targetEmail,
        createdAt: boundedInteger(invite?.createdAt, 0, now, now),
        expiresAt,
        createdBy: cleanText(invite?.createdBy, 48),
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, ADMIN_MAX_INVITES)
  const audit = (Array.isArray(value?.audit) ? value.audit : [])
    .map(entry => normalizeAdminAuditEntry(entry, now))
    .filter(Boolean)
    .sort((left, right) => right.at - left.at)
    .slice(0, ADMIN_MAX_AUDIT_EVENTS)
  return { version: 2, members: memberMap, sessions: Object.fromEntries(sessions), invites, audit }
}

function adminActorFromState(state, subject) {
  if (subject === ADMIN_OWNER_SUBJECT) return { id: ADMIN_OWNER_SUBJECT, email: '', name: 'Власник', role: 'owner', status: 'active', protected: true }
  const member = state.members[subject]
  if (!member || member.status !== 'active') return null
  return { ...member, protected: false }
}

function canAssignAdminRole(actor, role) {
  return Boolean(ADMIN_ASSIGNABLE_ROLES[actor?.role]?.includes(role))
}

function canManageAdminMember(actor, target) {
  if (!actor || !target || target.role === 'owner') return false
  return canAssignAdminRole(actor, target.role) && adminRoleRank(actor.role) > adminRoleRank(target.role)
}

function publicAdminMember(member, actor) {
  const protectedAccount = member.role === 'owner'
  return {
    id: member.id || member.email || ADMIN_OWNER_SUBJECT,
    email: member.email,
    name: member.name || '',
    role: adminRoleView(member.role),
    status: protectedAccount ? 'active' : member.status,
    createdAt: member.createdAt || 0,
    updatedAt: member.updatedAt || 0,
    protected: protectedAccount,
    canManage: !protectedAccount && canManageAdminMember(actor, member),
    isCurrent: (member.id || member.email || ADMIN_OWNER_SUBJECT) === actor?.id,
  }
}

function adminSnapshot(state, actor) {
  const owner = { id: ADMIN_OWNER_SUBJECT, email: '', name: 'Власник', role: 'owner', status: 'active', createdAt: 0, updatedAt: 0 }
  const members = [owner, ...Object.values(state.members)]
    .sort((left, right) => adminRoleRank(right.role) - adminRoleRank(left.role) || (left.name || left.email).localeCompare(right.name || right.email))
    .map(member => publicAdminMember(member, actor))
  return {
    me: publicAdminMember(actor, actor),
    members,
    roles: Object.entries(ADMIN_ROLES).map(([id]) => adminRoleView(id)),
    assignableRoles: ADMIN_ASSIGNABLE_ROLES[actor.role] || [],
    audit: state.audit.slice(0, 80),
  }
}

function adminForbidden(message = 'Недостатньо прав для цієї дії.') {
  return json({ error: message }, 403)
}

function adminUnauthenticated(message = 'Увійди до адмін-панелі.') {
  return json({ error: message }, 401)
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
      if (path === '/__internal/profile-visibility') return await this.internalProfileVisibility(request)
      if (path === '/__internal/admin-profile') return await this.internalAdminProfile(request)
      if (path === '/__internal/admin-player-directory') return await this.internalAdminPlayerDirectory(request)
      if (path === '/__internal/admin-community-players') return await this.internalCommunityPlayers(request)
      if (path === '/__internal/community-visibility') return await this.internalCommunityVisibility(request)
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

  async internalAdminProfile(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 16_384)
    } catch {
      return json({ error: 'Некоректний запит до профілю.' }, 400)
    }
    const accountId = String(body?.accountId || '')
    if (!ID.test(accountId)) return json({ error: 'Некоректний Cloud Profile ID.' }, 400)
    const key = `profile:${accountId}`
    const action = cleanText(body?.action, 24)
    if (action === 'summary') {
      const entry = await this.storage.get(key)
      const player = adminProfileSummary(accountId, entry)
      if (!player) return json({ error: 'Хмарний профіль не знайдено.' }, 404)
      await this.indexCloudProfile(accountId, entry)
      return json({ player })
    }
    if (action !== 'mutate') return json({ error: 'Невідома дія над профілем.' }, 400)
    const operation = cleanText(body?.operation, 32)
    const result = await this.storage.transaction(async transaction => {
      const entry = await transaction.get(key)
      const payload = entry?.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload) ? entry.payload : null
      if (!entry || !payload) return { error: 'Хмарний профіль не знайдено.', status: 404 }
      const next = structuredClone(payload)
      const gameState = next.gameState && typeof next.gameState === 'object' && !Array.isArray(next.gameState) ? next.gameState : {}
      next.gameState = gameState
      const integer = (minimum, maximum) => {
        const raw = Number(body?.amount)
        return Number.isFinite(raw) && Number.isInteger(raw) && raw >= minimum && raw <= maximum ? raw : null
      }
      const addOrSet = (keyName, max, allowAdd = true) => {
        const amount = integer(0, max)
        if (amount === null) return false
        const add = operation.endsWith('_add')
        if (!add && !operation.endsWith('_set')) return false
        if (add && !allowAdd) return false
        gameState[keyName] = add
          ? Math.min(max, boundedInteger(gameState[keyName], 0, max) + amount)
          : amount
        return true
      }
      let detail = ''
      if (operation === 'pc_add' || operation === 'pc_set') {
        const amount = integer(0, ADMIN_GAME_MAX_BALANCE)
        if (amount === null) return { error: 'Некоректна кількість PC.', status: 400 }
        next.balance = operation === 'pc_add'
          ? Math.min(ADMIN_GAME_MAX_BALANCE, boundedInteger(next.balance, 0, ADMIN_GAME_MAX_BALANCE) + amount)
          : amount
        detail = `${operation === 'pc_add' ? '+' : '='}${amount} PC`
      } else if (operation === 'xp_add' || operation === 'xp_set') {
        if (!addOrSet('xp', ADMIN_GAME_MAX_XP)) return { error: 'Некоректна кількість XP.', status: 400 }
        detail = `${operation === 'xp_add' ? '+' : '='}${body.amount} XP`
      } else if (operation === 'level_add' || operation === 'level_set') {
        const amount = integer(1, ADMIN_GAME_MAX_LEVEL)
        if (amount === null) return { error: 'Некоректний рівень.', status: 400 }
        const currentLevel = Math.floor(boundedInteger(gameState.xp, 0, ADMIN_GAME_MAX_XP) / ADMIN_GAME_PLAYER_LEVEL_XP) + 1
        const level = operation === 'level_add' ? Math.min(ADMIN_GAME_MAX_LEVEL, currentLevel + amount) : amount
        gameState.xp = Math.min(ADMIN_GAME_MAX_XP, (level - 1) * ADMIN_GAME_PLAYER_LEVEL_XP)
        detail = operation === 'level_add' ? `+${amount} рівнів (LVL ${level})` : `рівень = ${level}`
      } else if (operation === 'tickets_add' || operation === 'tickets_set') {
        if (!addOrSet('caseTickets', ADMIN_GAME_MAX_TICKETS)) return { error: 'Некоректна кількість квитків.', status: 400 }
        detail = `${operation === 'tickets_add' ? '+' : '='}${body.amount} квитків`
      } else if (operation === 'pass_xp_add' || operation === 'pass_xp_set') {
        const pass = gameState.battlePass && typeof gameState.battlePass === 'object' && !Array.isArray(gameState.battlePass) ? gameState.battlePass : {}
        gameState.battlePass = pass
        const amount = integer(0, ADMIN_GAME_PASS_MAX_XP)
        if (amount === null) return { error: 'Некоректна кількість XP пропуску.', status: 400 }
        pass.season = cleanText(pass.season, 48) || 'season-01'
        pass.xp = operation === 'pass_xp_add'
          ? Math.min(ADMIN_GAME_PASS_MAX_XP, boundedInteger(pass.xp, 0, ADMIN_GAME_PASS_MAX_XP) + amount)
          : amount
        pass.premium = pass.premium === true
        pass.claimedFree = Array.isArray(pass.claimedFree) ? pass.claimedFree : []
        pass.claimedPremium = Array.isArray(pass.claimedPremium) ? pass.claimedPremium : []
        detail = `${operation === 'pass_xp_add' ? '+' : '='}${amount} XP пропуску`
      } else if (operation === 'premium_enable' || operation === 'premium_disable') {
        const pass = gameState.battlePass && typeof gameState.battlePass === 'object' && !Array.isArray(gameState.battlePass) ? gameState.battlePass : {}
        gameState.battlePass = pass
        pass.season = cleanText(pass.season, 48) || 'season-01'
        pass.xp = boundedInteger(pass.xp, 0, ADMIN_GAME_PASS_MAX_XP)
        pass.claimedFree = Array.isArray(pass.claimedFree) ? pass.claimedFree : []
        pass.claimedPremium = Array.isArray(pass.claimedPremium) ? pass.claimedPremium : []
        pass.premium = operation === 'premium_enable'
        detail = operation === 'premium_enable' ? 'POTUZHNO PASS активовано' : 'POTUZHNO PASS вимкнено'
      } else if (operation === 'prestige_set') {
        const amount = integer(0, ADMIN_GAME_MAX_PRESTIGE)
        if (amount === null) return { error: 'Некоректний престиж.', status: 400 }
        gameState.prestige = amount
        detail = `престиж = ${amount}`
      } else if (operation === 'block') {
        const reason = cleanText(body?.reason, ADMIN_GAME_BLOCK_REASON_MAX)
        if (!reason) return { error: 'Вкажи причину блокування.', status: 400 }
        next.moderation = { blocked: true, reason, updatedAt: Date.now() }
        detail = `блокування: ${reason}`
      } else if (operation === 'unblock') {
        next.moderation = { blocked: false, reason: '', updatedAt: Date.now() }
        detail = 'блокування знято'
      } else if (operation === 'site_hide') {
        next.visibility = { hidden: true, updatedAt: Date.now() }
        detail = 'профіль приховано з публічних рейтингів і live-стрічки'
      } else if (operation === 'site_show') {
        next.visibility = { hidden: false, updatedAt: Date.now() }
        detail = 'профіль повернуто на сайт'
      } else if (operation === 'skin_grant') {
        const skin = adminCatalogSkin(body?.skin)
        if (!skin) return { error: 'Вибраний скін недоступний у каталозі.', status: 400 }
        const inventory = Array.isArray(next.inventory) ? next.inventory : []
        if (inventory.length >= ADMIN_GAME_MAX_INVENTORY) return { error: 'Інвентар профілю досяг ліміту.', status: 409 }
        const id = `admin-${randomHex(16)}`
        const addedAt = Date.now()
        inventory.push(next.inventoryEncoding === 'compact-v1'
          ? [0, id, skin.id, skin.name, skin.rarity, skin.rarityColor, skin.img, skin.price, 'FT', 1, 0, addedAt]
          : {
            id,
            sourceSkinId: skin.id,
            name: skin.name,
            rarity: skin.rarity,
            rarityColor: skin.rarityColor,
            img: skin.img,
            basePrice: skin.price,
            wear: { code: 'FT' },
            virtual: true,
            exclusive: false,
            addedAt,
          })
        next.inventory = inventory
        detail = `скін: ${skin.name}`
      } else if (operation === 'skin_remove') {
        const itemId = cleanText(body?.itemId, 128)
        const inventory = Array.isArray(next.inventory) ? next.inventory : []
        const nextInventory = inventory.filter((item, index) => safeAdminInventoryItem(item, index)?.id !== itemId)
        if (!itemId || nextInventory.length === inventory.length) return { error: 'Скін не знайдено у профілі.', status: 404 }
        next.inventory = nextInventory
        detail = `скін прибрано: ${itemId.slice(0, 20)}`
      } else {
        return { error: 'Невідома дія над профілем.', status: 400 }
      }
      const updatedAt = Date.now()
      const nextEntry = {
        ...entry,
        version: 2,
        revision: Math.max(1, boundedInteger(entry.revision, 1, Number.MAX_SAFE_INTEGER, 1)) + 1,
        payload: next,
        updatedAt,
      }
      if (!isPayload(next)) return { error: 'Профіль завеликий після зміни.', status: 413 }
      await transaction.put(key, nextEntry)
      return { player: adminProfileSummary(accountId, nextEntry), detail, entry: nextEntry }
    })
    if (result.error) return json({ error: result.error }, result.status)
    await this.indexCloudProfile(accountId, result.entry)
    return json({ player: result.player, detail: result.detail })
  }

  async internalProfileVisibility(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит профілю.' }, 400)
    }
    const accountId = cleanText(body?.accountId, 64)
    if (!ID.test(accountId)) return json({ error: 'Некоректний Cloud Profile ID.' }, 400)
    const entry = await this.storage.get(`profile:${accountId}`)
    return json({ hidden: adminProfileVisibility(entry?.payload?.visibility, entry?.updatedAt).hidden })
  }

  async internalAdminPlayerDirectory(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 16_384)
    } catch {
      return json({ error: 'Некоректний запит до каталогу гравців.' }, 400)
    }
    const key = 'admin:player-directory:v1'
    const action = cleanText(body?.action, 16)
    if (action === 'upsert') {
      const player = normalizeAdminPlayerDirectoryEntry(body?.player)
      if (!player) return json({ error: 'Некоректний профіль гравця.' }, 400)
      await this.storage.transaction(async transaction => {
        const stored = await transaction.get(key)
        const existing = stored?.players && typeof stored.players === 'object' && !Array.isArray(stored.players) ? stored.players : {}
        const players = Object.fromEntries(Object.entries(existing)
          .map(([, entry]) => normalizeAdminPlayerDirectoryEntry(entry))
          .filter(Boolean)
          .map(entry => [entry.accountId || `visitor:${entry.visitorId}`, entry]))
        const recordKey = player.accountId || `visitor:${player.visitorId}`
        const anonymousKey = player.visitorId ? `visitor:${player.visitorId}` : ''
        const related = [players[recordKey], anonymousKey ? players[anonymousKey] : null]
          .filter(Boolean)
          .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
        const previous = related[0] || null
        const knownFirstSeen = related.map(entry => Number(entry.firstSeenAt || 0)).filter(value => value > 0)
        const merged = normalizeAdminPlayerDirectoryEntry({
          ...previous,
          ...player,
          visitorId: player.visitorId || previous?.visitorId,
          wins: player.wins || previous?.wins,
          rounds: player.rounds || previous?.rounds,
          collectionValue: player.collectionValue || previous?.collectionValue,
          // Community heartbeats do not know a player's moderation status, so
          // they must never accidentally clear a block written by the admin.
          blocked: typeof body?.player?.blocked === 'boolean' ? player.blocked : previous?.blocked === true,
          hidden: typeof body?.player?.hidden === 'boolean' ? player.hidden : previous?.hidden === true,
          firstSeenAt: knownFirstSeen.length ? Math.min(...knownFirstSeen, player.firstSeenAt || Number.MAX_SAFE_INTEGER) : player.firstSeenAt,
          updatedAt: Math.max(Number(previous?.updatedAt || 0), Number(player.updatedAt || 0)),
        })
        players[recordKey] = merged
        if (anonymousKey && anonymousKey !== recordKey) delete players[anonymousKey]
        const trimmed = Object.values(players)
          .sort((left, right) => right.updatedAt - left.updatedAt)
          .slice(0, ADMIN_PLAYER_DIRECTORY_MAX)
        await transaction.put(key, { version: 2, players: Object.fromEntries(trimmed.map(entry => [entry.accountId || `visitor:${entry.visitorId}`, entry])) })
      })
      return json({ indexed: true })
    }
    if (action === 'list') {
      const query = cleanText(body?.query, 100).toLocaleLowerCase()
      const stored = await this.storage.get(key)
      const players = Object.values(stored?.players && typeof stored.players === 'object' && !Array.isArray(stored.players) ? stored.players : {})
        .map(normalizeAdminPlayerDirectoryEntry)
        .filter(Boolean)
        .filter(player => !query || `${player.name} ${player.accountId} ${player.visitorId}`.toLocaleLowerCase().includes(query))
        .sort((left, right) => right.updatedAt - left.updatedAt)
      return json({ total: players.length, players: players.slice(0, ADMIN_PLAYER_DIRECTORY_PAGE_SIZE) })
    }
    return json({ error: 'Невідома дія каталогу гравців.' }, 400)
  }

  async internalCommunityPlayers(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const state = normalizeCommunityState(await this.storage.get('community:season'), Date.now())
    return json({ players: Object.values(state.players).slice(0, COMMUNITY_MAX_PLAYERS) })
  }

  async internalCommunityVisibility(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит видимості.' }, 400)
    }
    const accountId = cleanText(body?.accountId, 64)
    if (!ID.test(accountId) || typeof body?.hidden !== 'boolean') return json({ error: 'Некоректні дані видимості.' }, 400)
    const now = Date.now()
    await this.storage.transaction(async transaction => {
      const state = normalizeCommunityState(await transaction.get('community:season'), now)
      for (const player of Object.values(state.players)) {
        if (player.cloudProfileId === accountId) player.hidden = body.hidden
      }
      await transaction.put('community:season', state)
    })
    return json({ updated: true })
  }

  async indexCloudProfile(accountId, entry) {
    const player = adminPlayerDirectoryEntry(accountId, entry)
    if (!player) return
    try {
      const global = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
      await global.fetch(new Request('https://internal/__internal/admin-player-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', player }),
      }))
    } catch {
      // The profile save itself must stay reliable if the administrative index
      // is temporarily unavailable; the next load/save will add it again.
    }
  }

  async indexVisitedPlayer(visitorHash, player) {
    const visitor = adminVisitorDirectoryEntry(visitorHash, player, Date.now())
    if (!visitor) return
    try {
      const global = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
      await global.fetch(new Request('https://internal/__internal/admin-player-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', player: visitor }),
      }))
    } catch {
      // Visitor tracking is auxiliary. A network hiccup must never block the game.
    }
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
      if (!result) return json({ error: 'Профіль уже існує.' }, 409)
      await this.indexCloudProfile(accountId, result)
      return json({ updatedAt: result.updatedAt, revision: result.revision })
    }

    if (!entry || !equalHash(entry.recoveryHash, recoveryHash)) return json({ error: 'Профіль не знайдено або код відновлення неправильний.' }, 403)
    const revision = Math.max(1, Math.floor(Number(entry.revision) || 1))
    if (action === 'load') {
      await this.indexCloudProfile(accountId, entry)
      return json({ payload: entry.payload, updatedAt: entry.updatedAt, revision })
    }
    if (action !== 'save' || !isPayload(body.payload)) return json({ error: 'Некоректне збереження.' }, 400)
    const expectedRevision = Number(body?.revision)
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) return json({ error: 'Профіль застарів. Онови його перед збереженням.' }, 409)

    const saved = await this.storage.transaction(async transaction => {
      const current = await transaction.get(key)
      const currentRevision = Math.max(1, Math.floor(Number(current?.revision) || 1))
      if (!current || !equalHash(current.recoveryHash, recoveryHash)) return { error: 'Профіль не знайдено або код відновлення неправильний.', status: 403 }
      if (currentRevision !== expectedRevision) return { error: 'Профіль було змінено в іншій вкладці або на іншому пристрої. Спочатку завантаж актуальну версію.', status: 409, revision: currentRevision }
      const moderation = adminProfileModeration(current.payload?.moderation, Number(current.updatedAt) || Date.now())
      const visibility = adminProfileVisibility(current.payload?.visibility, Number(current.updatedAt) || Date.now())
      if (moderation.blocked) {
        return {
          error: `Профіль заблоковано. Причина: ${moderation.reason}`,
          code: 'player_blocked',
          moderation,
          status: 423,
        }
      }
      const payload = { ...body.payload, moderation, visibility }
      if (!isPayload(payload)) return { error: 'Профіль завеликий після збереження.', status: 413 }
      const updatedAt = Date.now()
      const next = { ...current, version: 2, revision: currentRevision + 1, payload, updatedAt }
      await transaction.put(key, next)
      return { updatedAt, revision: next.revision, entry: next }
    })
    if (saved.error) return json({ error: saved.error, code: saved.code, moderation: saved.moderation, revision: saved.revision }, saved.status)
    await this.indexCloudProfile(accountId, saved.entry)
    return json({ updatedAt: saved.updatedAt, revision: saved.revision })
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
    if (player.cloudProfileId) {
      const profile = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`profile:${player.cloudProfileId}`))
      try {
        const visibilityResponse = await profile.fetch(new Request('https://internal/__internal/profile-visibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: player.cloudProfileId }) }))
        const visibility = await visibilityResponse.json()
        player.hidden = visibility?.hidden === true
      } catch {
        // The public sync must continue when a profile shard is momentarily unavailable.
      }
    }
    const rawEvent = body?.event && typeof body.event === 'object'
      ? { ...body.event, playerId: visitorHash, name: player.name, profileId: player.profileId, level: player.level, prestige: player.prestige, at: now }
      : null
    const event = rawEvent ? normalizeCommunityEvent(rawEvent, now) : null
    const circuitPulse = body?.circuitPulse && typeof body.circuitPulse === 'object' ? body.circuitPulse : null
    const riftPulse = body?.riftPulse && typeof body.riftPulse === 'object' ? body.riftPulse : null
    const result = await this.storage.transaction(async transaction => {
      const state = normalizeCommunityState(await transaction.get('community:season'), now)
      state.players[visitorHash] = player
      if (event) state.events = [event, ...state.events.filter(entry => entry.id !== event.id)].slice(0, COMMUNITY_MAX_EVENTS)
      if (circuitPulse && player.hidden !== true) applyCommunityCircuitPulse(state.circuit, visitorHash, player, circuitPulse, now)
      if (riftPulse && player.hidden !== true) applyCommunityRiftPulse(state.rift, visitorHash, player, riftPulse, now)
      await transaction.put('community:season', state)
      return communityResponse(state, visitorHash)
    })
    await this.indexVisitedPlayer(visitorHash, player)
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

export class PotuzhnoAdmin {
  constructor(state, env) {
    this.storage = state.storage
    this.env = env
  }

  async fetch(request) {
    const path = new URL(request.url).pathname
    if (!hasAdminOwnerPassword(this.env)) return json({ error: 'Адмін-панель ще не налаштована: додай секрет ADMIN_OWNER_PASSWORD.' }, 503)

    try {
      if (path === '/api/admin/login' && request.method === 'POST') return await this.login(request)
      if (path === '/api/admin/activate-invite' && request.method === 'POST') return await this.activateInvite(request)
      if (path === '/api/admin/logout' && request.method === 'POST') return await this.logout(request)

      const state = normalizeAdminState(await this.storage.get('admin:state'), Date.now())
      const actor = await this.actorForRequest(request, state)
      if (!actor) return adminUnauthenticated('Увійди паролем власника або активуй одноразове запрошення.')
      if (path === '/api/admin/me' && request.method === 'GET') return this.me(actor)
      if (path === '/api/admin/team' && request.method === 'GET') return this.team(state, actor)
      if (path === '/api/admin/audit' && request.method === 'GET') return this.audit(state, actor)
      if (path === '/api/admin/members' && request.method === 'POST') return await this.members(request)
      if (path === '/api/admin/game/players' && request.method === 'GET') return await this.gamePlayers(request, actor)
      if (path === '/api/admin/game/player' && request.method === 'GET') return await this.gamePlayer(request, actor)
      if (path === '/api/admin/game/catalog' && request.method === 'GET') return await this.gameCatalog(request, actor)
      if (path === '/api/admin/game/mutate' && request.method === 'POST') return await this.gameMutation(request, actor)
      return json({ error: 'Маршрут адмін-панелі не знайдено.' }, 404)
    } catch (error) {
      console.error('Admin API error', path, error)
      return json({ error: 'Адмін-панель тимчасово недоступна. Повтори спробу.' }, 503)
    }
  }

  async readBody(request) {
    const raw = await request.text()
    if (encoder.encode(raw).byteLength > 12_288) throw new RangeError('Запит завеликий.')
    return JSON.parse(raw)
  }

  sessionHeaders(request, token, maxAge) {
    return { 'Set-Cookie': adminSessionCookie(token, maxAge, new URL(request.url).protocol === 'https:') }
  }

  async createSession(state, subject, now) {
    const token = randomHex(32)
    const tokenHash = await sha256(token)
    state.sessions[tokenHash] = { subject, createdAt: now, expiresAt: now + ADMIN_SESSION_TTL }
    const entries = Object.entries(state.sessions)
      .sort(([, left], [, right]) => right.createdAt - left.createdAt)
      .slice(0, ADMIN_MAX_SESSIONS)
    state.sessions = Object.fromEntries(entries)
    return token
  }

  async actorForRequest(request, state) {
    const token = adminSessionToken(readCookie(request, ADMIN_SESSION_COOKIE))
    if (!token) return null
    const session = state.sessions[await sha256(token)]
    if (!session || session.expiresAt <= Date.now()) return null
    return adminActorFromState(state, session.subject)
  }

  removeSessionsForSubject(state, subject) {
    state.sessions = Object.fromEntries(Object.entries(state.sessions).filter(([, session]) => session.subject !== subject))
  }

  me(actor) {
    return json({
      me: publicAdminMember(actor, actor),
      roles: Object.entries(ADMIN_ROLES).map(([id]) => adminRoleView(id)),
      assignableRoles: ADMIN_ASSIGNABLE_ROLES[actor.role] || [],
      gameCapabilities: adminGameCapabilities(actor),
      protectedOwner: true,
    })
  }

  team(state, actor) {
    const snapshot = adminSnapshot(state, actor)
    return json({ members: snapshot.members, roles: snapshot.roles, assignableRoles: snapshot.assignableRoles })
  }

  audit(state, actor) {
    return json({
      audit: state.audit.slice(0, 160),
      canView: Boolean(actor),
    })
  }

  async profileAdminRequest(accountId, payload) {
    const profile = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`profile:${accountId}`))
    const response = await profile.fetch(new Request('https://internal/__internal/admin-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ...payload }),
    }))
    let data = null
    try { data = await response.json() } catch {}
    return { ok: response.ok, status: response.status, data: data || {} }
  }

  async setCommunityVisibility(accountId, hidden) {
    const community = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('community'))
    try {
      await community.fetch(new Request('https://internal/__internal/community-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, hidden }),
      }))
    } catch {
      // The profile change is still authoritative. Future community heartbeats
      // verify visibility with the profile shard before they enter the ranking.
    }
  }

  async playerDirectory(query = '') {
    const global = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
    const community = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('community'))
    const [directoryResult, communityResult] = await Promise.allSettled([
      global.fetch(new Request('https://internal/__internal/admin-player-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', query }),
      })),
      community.fetch(new Request('https://internal/__internal/admin-community-players', { method: 'POST' })),
    ])
    if (directoryResult.status !== 'fulfilled') {
      return { ok: false, status: 503, data: { error: 'Каталог гравців тимчасово недоступний.' } }
    }
    const response = directoryResult.value
    const communityResponse = communityResult.status === 'fulfilled' ? communityResult.value : null
    let data = null
    let communityData = null
    try { data = await response.json() } catch {}
    try { communityData = communityResponse ? await communityResponse.json() : null } catch {}
    if (!response.ok) return { ok: false, status: response.status, data: data || {} }
    const players = new Map((Array.isArray(data?.players) ? data.players : [])
      .map(normalizeAdminPlayerDirectoryEntry)
      .filter(Boolean)
      .map(player => [player.accountId || `visitor:${player.visitorId}`, player]))
    if (communityResponse?.ok) {
      for (const communityPlayer of Array.isArray(communityData?.players) ? communityData.players : []) {
        const visitor = adminVisitorDirectoryEntry(communityPlayer?.id, communityPlayer, communityPlayer?.updatedAt)
        if (!visitor) continue
        const key = visitor.accountId || `visitor:${visitor.visitorId}`
        const previous = players.get(key)
        players.set(key, normalizeAdminPlayerDirectoryEntry({
          ...previous,
          ...visitor,
          visitorId: visitor.visitorId || previous?.visitorId,
          firstSeenAt: previous?.firstSeenAt > 0 ? Math.min(previous.firstSeenAt, visitor.firstSeenAt || previous.firstSeenAt) : visitor.firstSeenAt,
          updatedAt: Math.max(Number(previous?.updatedAt || 0), Number(visitor.updatedAt || 0)),
        }))
      }
    }
    const normalizedQuery = cleanText(query, 100).toLocaleLowerCase()
    const all = [...players.values()]
      .filter(player => !normalizedQuery || `${player.name} ${player.accountId} ${player.visitorId}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => right.updatedAt - left.updatedAt)
    return { ok: true, status: 200, data: { total: all.length, players: all.slice(0, ADMIN_PLAYER_DIRECTORY_PAGE_SIZE) } }
  }

  async catalogItems() {
    const catalog = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('catalog'))
    const response = await catalog.fetch(new Request('https://internal/api/catalog/skins'))
    if (!response.ok) return null
    try {
      const data = await response.json()
      return Array.isArray(data) ? data.map(adminCatalogSkin).filter(Boolean) : null
    } catch {
      return null
    }
  }

  async gamePlayer(request, actor) {
    if (!adminGameCapabilities(actor).read) return adminForbidden('Твоя роль не має доступу до керування грою.')
    const accountId = new URL(request.url).searchParams.get('accountId') || ''
    if (!ID.test(accountId)) return json({ error: 'Вкажи правильний Cloud Profile ID.' }, 400)
    const response = await this.profileAdminRequest(accountId, { action: 'summary' })
    return response.ok ? json(response.data) : json({ error: response.data?.error || 'Не вдалося завантажити профіль.' }, response.status)
  }

  async gamePlayers(request, actor) {
    if (!adminGameCapabilities(actor).read) return adminForbidden('Твоя роль не має доступу до списку гравців.')
    const query = cleanText(new URL(request.url).searchParams.get('q'), 100)
    const response = await this.playerDirectory(query)
    return response.ok
      ? json({ total: boundedInteger(response.data?.total, 0, ADMIN_PLAYER_DIRECTORY_MAX), players: Array.isArray(response.data?.players) ? response.data.players : [] })
      : json({ error: response.data?.error || 'Не вдалося завантажити список гравців.' }, response.status)
  }

  async gameCatalog(request, actor) {
    if (!adminGameCapabilities(actor).read) return adminForbidden('Твоя роль не має доступу до каталогу.')
    const query = cleanText(new URL(request.url).searchParams.get('q'), 100).toLocaleLowerCase()
    if (query.length < 2) return json({ items: [] })
    const catalog = await this.catalogItems()
    if (!catalog) return json({ error: 'Каталог скінів тимчасово недоступний.' }, 502)
    const items = catalog
      .filter(item => `${item.name} ${item.weapon} ${item.category}`.toLocaleLowerCase().includes(query))
      .slice(0, 18)
    return json({ items })
  }

  async recordGameAudit(actor, accountId, operation, detail) {
    await this.storage.transaction(async transaction => {
      const now = Date.now()
      const state = normalizeAdminState(await transaction.get('admin:state'), now)
      state.audit.unshift({
        id: randomHex(12),
        at: now,
        actor: actor.name,
        action: `game_${operation}`,
        target: accountId,
        detail: cleanText(detail, 160),
      })
      state.audit = state.audit.slice(0, ADMIN_MAX_AUDIT_EVENTS)
      await transaction.put('admin:state', state)
    })
  }

  async gameMutation(request, actor) {
    let body
    try {
      body = await this.readBody(request)
    } catch (error) {
      return json({ error: error instanceof RangeError ? error.message : 'Некоректний запит.' }, error instanceof RangeError ? 413 : 400)
    }
    const accountId = cleanText(body?.accountId, 64)
    const operation = cleanText(body?.operation, 32)
    if (!ID.test(accountId) || !canRunAdminGameOperation(actor, operation)) {
      return adminForbidden('Твоя роль не може виконати цю дію.')
    }
    const payload = { action: 'mutate', operation, amount: body?.amount, itemId: body?.itemId, reason: body?.reason }
    if (operation === 'skin_grant') {
      const skinId = cleanText(body?.skinId, 128)
      const catalog = await this.catalogItems()
      const skin = catalog?.find(item => item.id === skinId)
      if (!skin) return json({ error: 'Вибраний скін не знайдено у каталозі.' }, 404)
      payload.skin = skin
    }
    const response = await this.profileAdminRequest(accountId, payload)
    if (!response.ok) return json({ error: response.data?.error || 'Не вдалося змінити профіль.' }, response.status)
    if (operation === 'site_hide' || operation === 'site_show') await this.setCommunityVisibility(accountId, operation === 'site_hide')
    await this.recordGameAudit(actor, accountId, operation, response.data.detail || '')
    return json({ ok: true, player: response.data.player, detail: response.data.detail || '' })
  }

  async login(request) {
    let body
    try {
      body = await this.readBody(request)
    } catch (error) {
      return json({ error: error instanceof RangeError ? error.message : 'Некоректний запит.' }, error instanceof RangeError ? 413 : 400)
    }
    const password = String(body?.password ?? '')
    if (!equalHash(password, this.env.ADMIN_OWNER_PASSWORD)) return adminUnauthenticated('Неправильний пароль власника.')

    const result = await this.storage.transaction(async transaction => {
      const now = Date.now()
      const state = normalizeAdminState(await transaction.get('admin:state'), now)
      const token = await this.createSession(state, ADMIN_OWNER_SUBJECT, now)
      await transaction.put('admin:state', state)
      return token
    })
    return json({ authenticated: true }, 200, this.sessionHeaders(request, result, Math.floor(ADMIN_SESSION_TTL / 1000)))
  }

  async activateInvite(request) {
    let body
    try {
      body = await this.readBody(request)
    } catch (error) {
      return json({ error: error instanceof RangeError ? error.message : 'Некоректний запит.' }, error instanceof RangeError ? 413 : 400)
    }
    const inviteToken = adminSessionToken(body?.invite)
    if (!inviteToken) return json({ error: 'Запрошення некоректне або вже недійсне.' }, 400)

    const result = await this.storage.transaction(async transaction => {
      const now = Date.now()
      const state = normalizeAdminState(await transaction.get('admin:state'), now)
      const tokenHash = await sha256(inviteToken)
      const invite = state.invites.find(entry => entry.tokenHash === tokenHash)
      const member = invite ? state.members[invite.targetEmail] : null
      if (!invite || !member || member.status !== 'active') return { response: adminUnauthenticated('Запрошення недійсне, використане або доступ призупинений.') }
      state.invites = state.invites.filter(entry => entry.tokenHash !== tokenHash)
      const token = await this.createSession(state, member.id, now)
      state.audit.unshift({
        id: randomHex(12),
        at: now,
        actor: member.name || member.email,
        action: 'invite_accepted',
        target: member.email,
        detail: adminRoleView(member.role).label,
      })
      state.audit = state.audit.slice(0, ADMIN_MAX_AUDIT_EVENTS)
      await transaction.put('admin:state', state)
      return { response: json({ activated: true }, 200, this.sessionHeaders(request, token, Math.floor(ADMIN_SESSION_TTL / 1000))) }
    })
    return result.response
  }

  async logout(request) {
    const token = adminSessionToken(readCookie(request, ADMIN_SESSION_COOKIE))
    if (token) {
      await this.storage.transaction(async transaction => {
        const now = Date.now()
        const state = normalizeAdminState(await transaction.get('admin:state'), now)
        delete state.sessions[await sha256(token)]
        await transaction.put('admin:state', state)
      })
    }
    return json({ loggedOut: true }, 200, this.sessionHeaders(request, '', 0))
  }

  async members(request) {
    let body
    try {
      body = await this.readBody(request)
    } catch (error) {
      return json({ error: error instanceof RangeError ? error.message : 'Некоректний запит.' }, error instanceof RangeError ? 413 : 400)
    }
    const action = cleanText(body?.action, 24)
    const targetEmail = cleanEmail(body?.email)
    if (!['grant', 'suspend', 'activate', 'revoke'].includes(action) || !targetEmail) return json({ error: 'Некоректна дія з доступом.' }, 400)

    const result = await this.storage.transaction(async transaction => {
      const now = Date.now()
      const state = normalizeAdminState(await transaction.get('admin:state'), now)
      const actor = await this.actorForRequest(request, state)
      if (!actor) return { response: adminUnauthenticated('Твоя сесія завершилася. Увійди знову.') }
      const existing = state.members[targetEmail]
      let invite = null

      if (action === 'grant') {
        const role = cleanText(body?.role, 24)
        if (!Object.hasOwn(ADMIN_ROLES, role) || role === 'owner' || !canAssignAdminRole(actor, role)) {
          return { response: adminForbidden('Цю роль ти не можеш призначати.') }
        }
        if (existing && !canManageAdminMember(actor, existing)) {
          return { response: adminForbidden('Ти не можеш змінювати цього учасника.') }
        }
        if (!existing && Object.keys(state.members).length >= ADMIN_MAX_MEMBERS) {
          return { response: json({ error: 'Досягнуто ліміту команди.' }, 409) }
        }
        const name = cleanText(body?.name, 48)
        state.members[targetEmail] = {
          email: targetEmail,
          id: targetEmail,
          name: name || existing?.name || '',
          role,
          status: 'active',
          createdAt: existing?.createdAt || now,
          updatedAt: now,
          updatedBy: actor.id,
        }
        const inviteToken = randomHex(32)
        invite = {
          id: randomHex(12),
          tokenHash: await sha256(inviteToken),
          targetEmail,
          createdAt: now,
          expiresAt: now + ADMIN_INVITE_TTL,
          createdBy: actor.name,
          url: new URL(`/admin?invite=${inviteToken}`, request.url).href,
        }
        state.invites = [{ ...invite, url: undefined }, ...state.invites.filter(entry => entry.targetEmail !== targetEmail)].slice(0, ADMIN_MAX_INVITES)
        state.audit.unshift({
          id: randomHex(12),
          at: now,
          actor: actor.name,
          action: existing ? 'role_updated' : 'access_granted',
          target: targetEmail,
          detail: `${adminRoleView(role).label}${name ? ` · ${name}` : ''}`,
        })
      } else {
        if (!existing || !canManageAdminMember(actor, existing)) {
          return { response: adminForbidden('Ти не можеш змінювати цього учасника.') }
        }
        if (action === 'revoke') {
          delete state.members[targetEmail]
          state.invites = state.invites.filter(entry => entry.targetEmail !== targetEmail)
        } else {
          state.members[targetEmail] = {
            ...existing,
            status: action === 'suspend' ? 'suspended' : 'active',
            updatedAt: now,
            updatedBy: actor.id,
          }
        }
        if (action === 'suspend' || action === 'revoke') this.removeSessionsForSubject(state, targetEmail)
        state.audit.unshift({
          id: randomHex(12),
          at: now,
          actor: actor.name,
          action: action === 'revoke' ? 'access_revoked' : action === 'suspend' ? 'access_suspended' : 'access_activated',
          target: targetEmail,
          detail: existing.name || adminRoleView(existing.role).label,
        })
      }

      state.audit = state.audit.slice(0, ADMIN_MAX_AUDIT_EVENTS)
      await transaction.put('admin:state', state)
      const updatedActor = await this.actorForRequest(request, state)
      const snapshot = adminSnapshot(state, updatedActor)
      return { response: json({ ok: true, members: snapshot.members, audit: snapshot.audit, assignableRoles: snapshot.assignableRoles, invite: invite ? { url: invite.url, expiresAt: invite.expiresAt, target: invite.targetEmail } : null }) }
    })
    return result.response
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

async function adminResponse(request, env) {
  const admin = env.POTUZHNO_ADMIN.get(env.POTUZHNO_ADMIN.idFromName('admin:global'))
  return admin.fetch(request)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    if (path === '/admin' || path === '/admin/') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405)
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url), {
        method: request.method,
        headers: request.headers,
      }))
    }
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
      if (path.startsWith('/api/admin/')) return adminResponse(request, env)
      return (await stateForRequest(request, env, path)).fetch(request)
    }
    return env.ASSETS.fetch(request)
  },
}
