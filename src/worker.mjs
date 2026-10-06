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
// The public CS2 data set is intentionally much larger than a game screen
// needs. Sending thousands of images and records to a phone was enough to
// freeze the renderer. The Worker keeps a balanced, game-ready slice instead.
const CATALOG_GAME_ITEM_LIMIT = 960
// Each Durable Object SQLite value is capped at 2 MB. The full catalogue is
// therefore cached as small server-side pages; a browser never receives it all
// at once.
const CATALOG_STORAGE_CHUNK = 220
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
const BATTLE_MATCH_START_DELAY = 5_000
const BATTLE_LISTING_TTL = 10 * 60_000
const BATTLE_LISTING_LIMIT = 60
// Open Bank is one shared, server-owned Royale lobby.  The result is decided
// by the Durable Object, never by an individual browser.
const ROYALE_LIVE_MAX_PLAYERS = 8
const ROYALE_LIVE_MAX_STAKES = 10
const ROYALE_LIVE_LOBBY_TTL = 12 * 60_000
// The live board may move on to a new round right after a draw. Keep a
// short-lived authoritative receipt separately so every participant can still
// receive the same result and virtual bank after a delayed poll or reload.
const ROYALE_LIVE_RESULT_TTL = 10 * 60_000
const ROYALE_LIVE_RECEIPT_TTL = 24 * 60 * 60_000
const ROYALE_LIVE_RECEIPT_LIMIT = 80
const ROYALE_LIVE_START_DELAY = 5_000
const PUBLIC_PROFILE_TTL = 90 * 24 * 60 * 60_000
const PUBLIC_PROFILE_TITLES = new Set(['night_hunter_2026', 'midnight_keeper_2026', 'rift_breaker_2026', 'aurora_conductor_2026', 'icewire_survivor_2026'])
const PUBLIC_PROFILE_FRAMES = new Set(['halloween_night_2026', 'aurora_frame_2026'])
const PUBLIC_PROFILE_STYLES = new Set(['standard', 'void', 'neon', 'arcade', 'prism'])
const PUBLIC_SHOWCASE_LIMIT = 3
const PUBLIC_ACHIEVEMENT_LIMIT = 8
const PUBLIC_ACHIEVEMENTS = new Set([
  'first-roll', 'first-win', 'streak-three', 'high-value', 'case-opener', 'seller', 'fighter', 'contractor',
  'prestige-once', 'roll-100', 'roll-500', 'streak-7', 'rich-50k', 'collector-10', 'collector-25',
  'case-10', 'case-30', 'battle-10', 'contract-10', 'seller-20', 'multi-10', 'credit-20', 'legendary',
  'prestige-3', 'free-case-7', 'all-collections', 'royale-1', 'royale-5',
])
const STEAM_PROFILE_TTL = 6 * 60 * 60_000
const STEAM_SESSION_TTL = 30 * 24 * 60 * 60_000
const CATALOG_TTL = 6 * 60 * 60_000
const CATALOG_STALE_TTL = 7 * 24 * 60 * 60_000
// The catalogue endpoint accepts a bounded batch to support older clients.
// It returns only the fixed in-game index defined below.
const CATALOG_PRICE_BATCH_LIMIT = 80
const STEAM_SESSION_COOKIE = 'potuzhno_steam_session'
const STEAM_AUTH_TTL = 10 * 60_000
const STEAM_AUTH_COOKIE = 'potuzhno_steam_auth'
const STEAM_SESSION_VERSION = 'v2'
// A native session is deliberately a separate, revocable credential. It is
// exchanged only after the Steam OpenID callback has completed in the system
// browser; the Android WebView never receives the HttpOnly website cookie.
const MOBILE_AUTH_TICKET_TTL = 5 * 60_000
const MOBILE_SESSION_TTL = 30 * 24 * 60 * 60_000
const MOBILE_SESSION_VERSION = 'm1'
const MOBILE_REDIRECT_URI = 'potuzhnodrop://auth'
const MOBILE_APP_ORIGINS = new Set(['https://localhost', 'capacitor://localhost'])
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
// Referral rewards are virtual and server-owned. A link can be shared freely,
// but only one verified Steam identity can ever become a recruit, and every
// milestone below has a permanent receipt.
const REFERRAL_DAILY_OWNER_LIMIT = 20
const REFERRAL_NEW_ACCOUNT_WINDOW = 7 * 24 * 60 * 60_000
const REFERRAL_IDENTITY_KEY = 'referral:identity'
const REFERRAL_MILESTONE_RECEIPT_LIMIT = 1_200
const REFERRAL_WEEKLY_XP_UNIT = 1_200
const REFERRAL_WEEKLY_OWNER_REWARD = 4
const REFERRAL_WEEKLY_OWNER_LIMIT = 40
const REFERRAL_WEEKLY_XP_LIMIT = 12_000
const REFERRAL_MILESTONES = Object.freeze([
  { id: 'level_3', level: 3, minAgeMs: 24 * 60 * 60_000, ownerReward: 10, recruitReward: 3, label: 'LVL 3' },
  { id: 'level_10', level: 10, minAgeMs: 7 * 24 * 60 * 60_000, ownerReward: 20, recruitReward: 5, label: 'LVL 10' },
  { id: 'level_20', level: 20, minAgeMs: 21 * 24 * 60 * 60_000, ownerReward: 40, recruitReward: 10, label: 'LVL 20' },
  { id: 'prestige_1', prestige: 1, minAgeMs: 30 * 24 * 60 * 60_000, ownerReward: 100, recruitReward: 25, label: 'Перший престиж' },
])
const REFERRAL_MILESTONE_BY_ID = new Map(REFERRAL_MILESTONES.map(entry => [entry.id, entry]))
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
  matchmaking: { limit: 140, windowMs: 60_000 },
  steamAuth: { limit: 8, windowMs: 10 * 60_000 },
  steamInventory: { limit: 16, windowMs: 60_000 },
  steam: { limit: 60, windowMs: 60_000 },
  catalog: { limit: 20, windowMs: 60_000 },
  presence: { limit: 12, windowMs: 60_000 },
  community: { limit: 24, windowMs: 60_000 },
  rewards: { limit: 12, windowMs: 60_000 },
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

function gameAccountType(accountId) {
  const id = cleanText(accountId, 64)
  if (ID.test(id)) return 'cloud'
  if (/^\d{17}$/.test(id)) return 'steam'
  return ''
}

function isGameAccountId(accountId) {
  return Boolean(gameAccountType(accountId))
}

function referralWeekKey(now = Date.now()) {
  const date = new Date(now)
  const offset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

function referralProgress(payload) {
  const gameState = payload?.gameState && typeof payload.gameState === 'object' && !Array.isArray(payload.gameState)
    ? payload.gameState
    : {}
  const xp = boundedInteger(gameState.xp, 0, ADMIN_GAME_MAX_XP, 0)
  const prestige = boundedInteger(gameState.prestige, 0, ADMIN_GAME_MAX_PRESTIGE, 0)
  const level = Math.floor(xp / ADMIN_GAME_PLAYER_LEVEL_XP) + 1
  // Prestige resets the visible level. This cumulative counter retains the
  // verified progress needed for weekly team dividends after that reset.
  const totalXp = Math.min(ADMIN_GAME_MAX_XP, xp + prestige * ADMIN_GAME_PLAYER_LEVEL_XP * 30)
  return { xp, prestige, level, totalXp }
}

function referralState(payload) {
  const value = payload?.gameState?.referrals
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function withServerReferralState(payload, previousPayload) {
  const previous = referralState(previousPayload)
  const next = structuredClone(payload)
  const gameState = next.gameState && typeof next.gameState === 'object' && !Array.isArray(next.gameState)
    ? next.gameState
    : {}
  // Referral attribution and payment receipts never come from the browser.
  // This prevents a stale tab from dropping them, or a caller from forging
  // "earned" referrals in a profile save.
  next.gameState = { ...gameState, referrals: previous }
  return next
}

function referralMilestoneView(claim) {
  const definition = REFERRAL_MILESTONE_BY_ID.get(claim?.id)
  if (definition) return { ...definition }
  if (/^weekly_xp:\d{4}-\d{2}-\d{2}:\d{1,6}$/.test(cleanText(claim?.id, 96))) {
    return {
      id: 'weekly_xp',
      ownerReward: boundedMoney(claim.ownerReward, 0, REFERRAL_WEEKLY_OWNER_LIMIT),
      recruitReward: 0,
      label: 'Командний дивіденд',
    }
  }
  return null
}

function cleanImage(value) {
  try {
    const url = new URL(cleanText(value, 2048))
    return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

async function catalogSkinImageSource(env, catalogId, catalogName) {
  const id = cleanText(catalogId, 128)
  const name = cleanText(catalogName, 160)
  if (!id && !name) return ''
  try {
    const catalog = env.POTUZHNO_STATE.get(env.POTUZHNO_STATE.idFromName('catalog'))
    const response = await catalog.fetch(new Request('https://internal/api/catalog/skins'))
    if (!response.ok) return ''
    const items = await response.json()
    if (!Array.isArray(items)) return ''
    const skin = items.find(item => (id && String(item?.id || '') === id) || (name && String(item?.name || '') === name))
    return cleanImage(skin?.image)
  } catch {
    return ''
  }
}

async function skinImage(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405)
  const url = new URL(request.url)
  // Steam image URLs can be longer than a CDN accepts in a query string.
  // Resolve the compact catalog reference server-side, then relay the actual
  // image. The `src` form remains a backwards-compatible fallback for old
  // browser bundles.
  const catalogId = cleanText(url.searchParams.get('id'), 128)
  const catalogName = cleanText(url.searchParams.get('name'), 160)
  const source = await catalogSkinImageSource(env, catalogId, catalogName)
    || cleanImage(url.searchParams.get('src'))
  if (!source) return json({ error: 'Некоректне джерело зображення.' }, 400)

  const cacheIdentity = catalogId
    ? `id=${encodeURIComponent(catalogId)}`
    : catalogName
      ? `name=${encodeURIComponent(catalogName)}`
      : `src=${await sha256(source)}`
  const cacheKey = new Request(`${url.origin}${url.pathname}?${cacheIdentity}`, { method: 'GET' })
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

function publicShowcaseItem(value) {
  const name = cleanText(value?.name, 160)
  if (!name) return null
  const price = Number(value?.price)
  return {
    name,
    img: cleanImage(value?.img),
    price: Number.isFinite(price) ? Math.round(Math.min(MAX_PRICE, Math.max(0, price)) * 100) / 100 : 0,
    rarity: cleanText(value?.rarity, 48) || 'CS2',
    rarityColor: cleanColor(value?.rarityColor),
  }
}

function publicProfilePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const stats = value.stats && typeof value.stats === 'object' && !Array.isArray(value.stats) ? value.stats : {}
  const cosmetics = value.cosmetics && typeof value.cosmetics === 'object' && !Array.isArray(value.cosmetics) ? value.cosmetics : {}
  const signal = value.signal && typeof value.signal === 'object' && !Array.isArray(value.signal) ? value.signal : {}
  const showcase = Array.isArray(value.showcase)
    ? value.showcase.map(publicShowcaseItem).filter(Boolean).slice(0, PUBLIC_SHOWCASE_LIMIT)
    : []
  const achievementIds = Array.isArray(value?.achievements?.unlocked)
    ? [...new Set(value.achievements.unlocked.map(id => cleanText(id, 48)).filter(id => PUBLIC_ACHIEVEMENTS.has(id)))].slice(0, PUBLIC_ACHIEVEMENT_LIMIT)
    : []
  const achievementCount = Math.max(
    achievementIds.length,
    boundedInteger(value?.achievements?.count, 0, PUBLIC_ACHIEVEMENTS.size, 0),
  )
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
      style: PUBLIC_PROFILE_STYLES.has(String(cosmetics.style || '')) ? String(cosmetics.style) : 'standard',
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
    showcase,
    achievements: { count: achievementCount, unlocked: achievementIds },
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

function mobileSessionToken(request) {
  const authorization = cleanText(request.headers.get('Authorization'), 180)
  const match = authorization.match(new RegExp(`^Bearer\\s+${MOBILE_SESSION_VERSION}_([a-f0-9]{64})$`, 'i'))
  return match ? match[1].toLowerCase() : ''
}

function isMobileAppOrigin(origin) {
  return MOBILE_APP_ORIGINS.has(String(origin || '').toLowerCase())
}

function mobileChallengeFromUrl(url) {
  const challenge = cleanText(url.searchParams.get('challenge'), 128).toLowerCase()
  return /^[a-f0-9]{64}$/.test(challenge) ? challenge : ''
}

function isMobileSteamRequest(url) {
  return url.searchParams.get('client') === 'android' && Boolean(mobileChallengeFromUrl(url))
}

// The callback target is fixed in the Android manifest. We never accept a
// client-supplied destination, so a Steam response cannot be used as an open
// redirect. It contains only a short-lived, single-use ticket or error code.
function mobileAuthRedirect(params = {}) {
  const target = new URL(MOBILE_REDIRECT_URI)
  for (const [key, value] of Object.entries(params)) {
    if (value) target.searchParams.set(key, String(value))
  }
  return target.href
}

function mobileCorsResponse(request, response) {
  const origin = request.headers.get('Origin') || ''
  if (!isMobileAppOrigin(origin)) return response
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.append('Vary', 'Origin')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function rateLimitGroup(path) {
  if (path === '/api/admin/login' || path === '/api/admin/activate-invite') return 'adminLogin'
  if (path.startsWith('/api/admin/')) return 'admin'
  if (path === '/api/profile/sync') return 'profile'
  if (path === '/api/rewards') return 'rewards'
  if (path === '/api/public-profile' || path === '/api/public-avatar') return 'publicProfile'
  if (path.startsWith('/api/fair/')) return 'fair'
  if (path === '/api/matchmaking' || path === '/api/royale') return 'matchmaking'
  if (path === '/api/steam/auth') return 'steamAuth'
  if (path === '/api/steam/inventory') return 'steamInventory'
  if (path.startsWith('/api/steam/')) return 'steam'
  if (path === '/api/catalog/skins' || path === '/api/catalog/market-prices') return 'catalog'
  if (path === '/api/presence') return 'presence'
  if (path === '/api/community' || path === '/api/community-avatar') return 'community'
  return 'api'
}

function hasFairSecret(env) {
  return typeof env?.FAIR_SEED_SECRET === 'string' && env.FAIR_SEED_SECRET.length >= 32
}

function parseStake(value) {
  const name = cleanText(value?.name, 160)
  const img = cleanImage(value?.img)
  const rawPrice = Number(value?.price)
  if (!name || !img || !Number.isFinite(rawPrice) || rawPrice < 0.01 || rawPrice > MAX_PRICE) return null
  const price = boundedMoney(rawPrice, 0.01, MAX_PRICE)
  const rarityColor = cleanText(value?.rarityColor, 16)
  return {
    name,
    img,
    price,
    rarity: cleanText(value?.rarity, 48) || 'CS2',
    rarityColor: /^#[0-9a-f]{3,8}$/i.test(rarityColor) ? rarityColor : '#b0c3d9',
  }
}

function parseRoyaleStakes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > ROYALE_LIVE_MAX_STAKES) return null
  const stakes = value.map(parseStake)
  return stakes.every(Boolean) ? stakes : null
}

function normalizeMatchState(value) {
  return {
    queue: Array.isArray(value?.queue) ? value.queue : [],
    matches: Array.isArray(value?.matches) ? value.matches : [],
    listings: Array.isArray(value?.listings) ? value.listings : [],
    royale: value?.royale && typeof value.royale === 'object' && !Array.isArray(value.royale) ? value.royale : null,
    royaleReceipts: Array.isArray(value?.royaleReceipts) ? value.royaleReceipts : [],
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

// PC is a virtual in-game balance. Prices use at most two fraction digits;
// counters and XP remain integers and continue using boundedInteger.
function boundedMoney(value, min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  const rounded = Math.round((number + Number.EPSILON) * 100) / 100
  return Math.max(min, Math.min(max, rounded))
}

// The economy deliberately does not use a live marketplace. A fixed catalogue
// index makes a skin worth the same in a case, upgrade, contract, battle and
// Royale regardless of Steam outages, cached quotes or regional prices.
const STABLE_ECONOMY_VERSION = 'stable-catalog-v1'
const STABLE_ECONOMY_SOURCE = 'Стабільний індекс ПОТУЖНО'
const STABLE_WEAR_MULTIPLIERS = Object.freeze({ FN: 1.18, MW: 1.09, FT: 1, WW: 0.87, BS: 0.76 })
const STABLE_RARITY_VALUES = Object.freeze({
  'Consumer Grade': 4,
  'Industrial Grade': 8,
  'Mil-Spec Grade': 16,
  Restricted: 35,
  Classified: 80,
  Covert: 180,
  Contraband: 2_500,
  Extraordinary: 700,
})
const STABLE_ANCHOR_VALUES = Object.freeze({
  'AK-47 | Wild Lotus': 6_500,
  'AWP | Gungnir': 7_000,
  'AWP | Dragon Lore': 6_000,
  'M4A4 | Howl': 4_000,
  'AWP | Medusa': 2_800,
  'AK-47 | Gold Arabesque': 1_200,
  'AWP | Desert Hydra': 1_000,
  'AK-47 | Fire Serpent': 950,
  'AK-47 | X-Ray': 900,
  'M4A1-S | Knight': 850,
  'AK-47 | Hydroponic': 650,
  'Glock-18 | Fade': 650,
  'M4A1-S | Blue Phosphor': 550,
  'Desert Eagle | Fennec Fox': 500,
  'M4A1-S | Printstream': 220,
  'AK-47 | Vulcan': 150,
  'USP-S | Kill Confirmed': 160,
  'Desert Eagle | Printstream': 120,
  'AWP | Asiimov': 75,
  'AK-47 | Neon Rider': 40,
  'AK-47 | Redline': 35,
  'Glock-18 | Water Elemental': 22,
  'AWP | Atheris': 12,
})

function stableCatalogField(skin, field, limit = 160) {
  const value = skin?.[field]
  return cleanText(typeof value === 'string' ? value : value?.name, limit)
}

function stableHash(value) {
  let hash = 2166136261
  for (const char of String(value || 'potuzhno')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function catalogPriority(skin) {
  const name = cleanText(skin?.name, 160)
  if (Object.hasOwn(STABLE_ANCHOR_VALUES, name)) return 3
  return /dragon lore|fire serpent|wild lotus|gungnir|medusa|howl|printstream|asiimov|neo-noir|wildfire|atheris|redline|case hardened|doppler|fade|marble fade|butterfly|karambit|sport gloves|moto gloves|specialist gloves|hand wraps/i.test(name)
    ? 2
    : 0
}

function selectGameCatalog(items) {
  const selected = new Map()
  const byPriority = (left, right) => {
    const priorityDiff = catalogPriority(right) - catalogPriority(left)
    if (priorityDiff) return priorityDiff
    return stableHash(left.id || left.name) - stableHash(right.id || right.name)
  }
  const add = (matches, limit) => {
    matches.sort(byPriority).slice(0, limit).forEach(item => selected.set(item.id, item))
  }
  const hasName = (skin, pattern) => pattern.test(skin.name)
  const isWeapon = skin => skin.category.name !== 'Knives' && skin.category.name !== 'Gloves'

  // Every named case receives enough candidates before the general fill. This
  // also prevents a first server response from showing "catalog unavailable".
  add(items.filter(skin => isWeapon(skin) && hasName(skin, /dragon lore|fire serpent|printstream|fade|howl|wild lotus|gungnir|medusa/i)), 32)
  add(items.filter(skin => isWeapon(skin) && hasName(skin, /ice coaled|winterized|whiteout|asiimov|vulcan|coolant|snow leopard|neo-noir/i)), 32)
  add(items.filter(skin => isWeapon(skin) && hasName(skin, /atheris|neo-noir|wildfire|see ya later|kill confirmed|printstream|case hardened|redline/i)), 32)
  add(items.filter(skin => isWeapon(skin) && hasName(skin, /hyper beast|asiimov|neo-noir|mecha|vaporwave|temukau|legion of anubis/i)), 32)
  add(items.filter(skin => /^AWP$/i.test(skin.weapon.name)), 70)
  add(items.filter(skin => /^AK-47$/i.test(skin.weapon.name)), 70)
  add(items.filter(skin => /^(M4A4|M4A1-S)$/i.test(skin.weapon.name)), 60)
  add(items.filter(skin => skin.category.name === 'Knives' && hasName(skin, /butterfly knife/i)), 32)
  add(items.filter(skin => skin.category.name === 'Knives' && hasName(skin, /karambit/i)), 32)
  add(items.filter(skin => skin.category.name === 'Knives'), 96)
  add(items.filter(skin => skin.category.name === 'Gloves' && hasName(skin, /sport gloves/i)), 32)
  add(items.filter(skin => skin.category.name === 'Gloves' && hasName(skin, /moto gloves|specialist gloves|hand wraps/i)), 48)
  add(items.filter(skin => skin.category.name === 'Gloves'), 96)
  add(items.filter(isWeapon), 256)

  if (selected.size < CATALOG_GAME_ITEM_LIMIT) {
    add(items.filter(item => !selected.has(item.id)), CATALOG_GAME_ITEM_LIMIT - selected.size)
  }
  return [...selected.values()].sort((left, right) => left.weapon.name.localeCompare(right.weapon.name) || left.name.localeCompare(right.name))
}

function stableWearCode(value) {
  const code = cleanText(typeof value === 'string' ? value : value?.code, 2).toUpperCase()
  return Object.hasOwn(STABLE_WEAR_MULTIPLIERS, code) ? code : 'FT'
}

function stableCatalogPrice(skin, wear = 'FT') {
  const name = stableCatalogField(skin, 'name') || 'CS2 Skin'
  const category = stableCatalogField(skin, 'category', 64)
  const weapon = stableCatalogField(skin, 'weapon', 64)
  const rarity = stableCatalogField(skin, 'rarity', 48) || 'Consumer Grade'
  const lowerName = name.toLowerCase()
  const inferredKnife = /^★/.test(name) || /knife|karambit|bayonet|talon|falchion|navaja|daggers/i.test(name)
  const inferredGloves = /gloves|wraps|hand wraps|hydra gloves|sport gloves|specialist gloves/i.test(name)
  const type = category || (inferredGloves ? 'Gloves' : inferredKnife ? 'Knives' : '')
  const hashFactor = 0.94 + (stableHash(`${name}:v1`) % 13) / 100
  const finishMultiplier = /doppler|sapphire|ruby|emerald|black pearl/i.test(lowerName)
    ? 3.2
    : /fade|marble fade|gamma doppler/i.test(lowerName)
      ? 2.25
      : /lore|slaughter|crimson web|tiger tooth/i.test(lowerName)
        ? 1.65
        : /printstream|vulcan|asiimov|neo-noir|kill confirmed|fuel injector|the empress|case hardened/i.test(lowerName)
          ? 1.45
          : 1
  let base = Number(STABLE_ANCHOR_VALUES[name]) || 0
  if (!base && type === 'Knives') {
    const knifeType = /butterfly/i.test(name) ? 1.7
      : /karambit/i.test(name) ? 1.55
        : /m9/i.test(name) ? 1.45
          : /talon/i.test(name) ? 1.3
            : /bayonet/i.test(name) ? 1.15
              : /falchion/i.test(name) ? 0.8
                : /gut/i.test(name) ? 0.72
                  : 1
    base = 260 * knifeType * finishMultiplier * hashFactor
  } else if (!base && type === 'Gloves') {
    const glovePremium = /pandora|vice|spearmint|hedge maze|superconductor/i.test(lowerName) ? 2.8 : finishMultiplier
    base = 180 * glovePremium * hashFactor
  } else if (!base) {
    const weaponFactor = /^(awp|ak-47|m4a1-s|m4a4|desert eagle)/i.test(weapon) ? 1.15
      : /^(usp-s|glock-18|five-seven|p250)/i.test(weapon) ? 1
        : 0.85
    base = (STABLE_RARITY_VALUES[rarity] || 16) * weaponFactor * finishMultiplier * hashFactor
  }
  const value = Math.round((base * (STABLE_WEAR_MULTIPLIERS[stableWearCode(wear)] || 1)) * 2) / 2
  return boundedMoney(value, 1, MAX_PRICE, 1)
}

function stableCatalogQuote(skin, wear) {
  const code = stableWearCode(wear)
  const now = Date.now()
  return {
    available: true,
    id: cleanText(skin?.id, 128),
    wear: code,
    // Kept for old clients that still expect this field; it is only a
    // catalogue label, not an external market reference.
    marketHashName: cleanText(skin?.name, 200),
    price: stableCatalogPrice(skin, code),
    medianPrice: stableCatalogPrice(skin, code),
    updatedAt: now,
    sourceUpdatedAt: now,
    source: STABLE_ECONOMY_SOURCE,
    pricingVersion: STABLE_ECONOMY_VERSION,
  }
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
    cloudProfileId: isGameAccountId(cloudProfileId) ? cloudProfileId : '',
    xp: boundedInteger(value?.xp, 0, 9_999_999),
    wins: boundedInteger(value?.wins, 0, 9_999_999),
    rounds: boundedInteger(value?.rounds, 0, 9_999_999),
    collectionValue: boundedInteger(value?.collectionValue, 0, MAX_PRICE * 10_000),
    inventoryTotal: boundedInteger(value?.inventoryTotal, 0, ADMIN_GAME_MAX_INVENTORY),
    level: boundedInteger(value?.level, 1, 9_999),
    prestige: boundedInteger(value?.prestige, 0, 99),
    // This is written by the Worker after it validates the Steam session. It
    // lets the live feed use a short-lived, server-owned avatar route without
    // publishing a Steam ID to other players.
    avatar: cleanAvatar(value?.avatar),
    // This marker is written only after the server matches the submitted
    // Steam ID to the authenticated Steam session for this exact request.
    // It is deliberately not trusted when it comes from the browser.
    steamVerifiedAt: boundedInteger(value?.steamVerifiedAt, 0, now, 0),
    hidden: value?.hidden === true,
    updatedAt: now,
  }
}

function isVerifiedSteamCommunityPlayer(player) {
  return /^\d{17}$/.test(String(player?.cloudProfileId || '')) && Number(player?.steamVerifiedAt || 0) > 0
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
  const rawPlayers = Object.entries(source.players && typeof source.players === 'object' ? source.players : {})
    .filter(([visitorHash, player]) => /^[a-f0-9]{64}$/i.test(visitorHash) && player && now - Number(player.updatedAt || 0) < COMMUNITY_PLAYER_TTL)
    .map(([visitorHash, player]) => [visitorHash, normalizeCommunityPlayer(player, visitorHash, boundedInteger(player.updatedAt, now - COMMUNITY_PLAYER_TTL, now, now))])
    .filter(([, player]) => Boolean(player))
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
  // A Steam account can play on both the site and Android. Those clients
  // have different anonymous browser IDs, but they must still occupy exactly
  // one place in the public ranking. The public profile ID covers an older
  // heartbeat written just before Steam storage became ready on that device.
  // A nickname is never used as an identity key.
  const seenAccounts = new Set()
  const seenProfiles = new Set()
  const players = rawPlayers
    .filter(([, player]) => {
      const accountId = player.cloudProfileId
      const profileId = player.profileId
      if ((accountId && seenAccounts.has(accountId)) || (profileId && seenProfiles.has(profileId))) return false
      if (accountId) seenAccounts.add(accountId)
      if (profileId) seenProfiles.add(profileId)
      return true
    })
    .slice(0, COMMUNITY_MAX_PLAYERS)
  const events = (Array.isArray(source.events) ? source.events : [])
    .map(event => normalizeCommunityEvent(event, now))
    .filter(event => event && now - event.at < COMMUNITY_EVENT_TTL)
    .sort((left, right) => right.at - left.at)
    .slice(0, COMMUNITY_MAX_EVENTS)
  return { season, players: Object.fromEntries(players), events, circuit: normalizeCommunityCircuit(source.circuit, now), rift: normalizeCommunityRift(source.rift, now) }
}

function communityResponse(state, visitorHash) {
  const isPublicPlayer = player => player?.hidden !== true && isVerifiedSteamCommunityPlayer(player)
  const avatarUrlFor = player => cleanAvatar(player?.avatar)
    ? `/api/community-avatar?player=${encodeURIComponent(player.id)}`
    : ''
  const rows = Object.values(state.players)
    .filter(isPublicPlayer)
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
    avatarUrl: avatarUrlFor(player),
    isMe: player.id === visitorHash,
  }))
  const ownRank = rows.findIndex(player => player.id === visitorHash) + 1
  const events = state.events
    .filter(event => isPublicPlayer(state.players[event.playerId]))
    .map(event => {
      const player = state.players[event.playerId]
      return {
        ...event,
        xp: player?.xp || 0,
        wins: player?.wins || 0,
        rounds: player?.rounds || 0,
        collectionValue: player?.collectionValue || 0,
        inventoryTotal: player?.inventoryTotal || 0,
        level: player?.level || event.level,
        prestige: player?.prestige || event.prestige,
        avatarUrl: avatarUrlFor(player),
      }
    })
  const circuit = normalizeCommunityCircuit(state.circuit, Date.now())
  const recent = circuit.recent
    .filter(entry => isPublicPlayer(state.players[entry.playerId]))
    .map(entry => ({ name: entry.name, at: entry.at }))
  const phase = Math.min(COMMUNITY_CIRCUIT_PHASES, Math.floor(circuit.total / COMMUNITY_CIRCUIT_PHASE_SIZE) + 1)
  const rift = normalizeCommunityRift(state.rift, Date.now())
  const riftRecent = rift.recent
    .filter(entry => isPublicPlayer(state.players[entry.playerId]))
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
    price: boundedMoney(compact ? (compact[12] || compact[7]) : (value.marketPrice ?? value.price ?? value.basePrice), 0.01, MAX_PRICE),
    addedAt: boundedInteger(compact ? compact[11] : value.addedAt, 0, Number.MAX_SAFE_INTEGER, index),
    exclusive: compact ? compact[10] === 1 : value.exclusive === true,
  }
}

function adminProfileSummary(accountId, entry, accountType = gameAccountType(accountId)) {
  const payload = entry?.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload) ? entry.payload : null
  if (!payload) return null
  const gameState = payload.gameState && typeof payload.gameState === 'object' && !Array.isArray(payload.gameState) ? payload.gameState : {}
  const pass = gameState.battlePass && typeof gameState.battlePass === 'object' && !Array.isArray(gameState.battlePass) ? gameState.battlePass : {}
  const inventory = Array.isArray(payload.inventory) ? payload.inventory : []
  const safeItems = inventory.map(safeAdminInventoryItem).filter(Boolean)
  const xp = boundedInteger(gameState.xp, 0, ADMIN_GAME_MAX_XP)
  return {
    accountId,
    accountType,
    name: cleanText(payload.account?.nick, 24) || 'Гравець',
    updatedAt: boundedInteger(entry.updatedAt, 0, Number.MAX_SAFE_INTEGER),
    revision: boundedInteger(entry.revision, 1, Number.MAX_SAFE_INTEGER, 1),
    balance: boundedMoney(payload.balance, 0, ADMIN_GAME_MAX_BALANCE),
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

function adminPlayerDirectoryEntry(accountId, entry, accountType = gameAccountType(accountId)) {
  const summary = adminProfileSummary(accountId, entry, accountType)
  if (!summary) return null
  return {
    accountId: summary.accountId,
    accountType: summary.accountType,
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

function normalizeAdminPlayerDirectoryEntry(value) {
  const accountId = cleanText(value?.accountId, 64)
  const accountType = gameAccountType(accountId)
  if (!accountType) return null
  const updatedAt = boundedInteger(value?.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  const firstSeenAt = boundedInteger(value?.firstSeenAt, 0, updatedAt || Number.MAX_SAFE_INTEGER, updatedAt)
  return {
    accountId,
    accountType,
    visitorId: '',
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
  // The public catalog uses nested API fields, while the admin gateway passes
  // the same verified record in a compact, flat shape. Accept both forms here
  // so a skin selected in the panel can never be rejected by the profile DO.
  const weapon = cleanText(typeof value.weapon === 'string' ? value.weapon : value.weapon?.name, 64)
  const category = cleanText(typeof value.category === 'string' ? value.category : value.category?.name, 64)
  const rarity = cleanText(typeof value.rarity === 'string' ? value.rarity : value.rarity?.name, 48) || 'Consumer Grade'
  const rarityColor = cleanColor(value.rarityColor || value.rarity?.color)
  const img = cleanImage(value.img || value.image)
  if (!id || !name || !weapon || !category || !img) return null
  return {
    id,
    name,
    weapon,
    category,
    rarity,
    rarityColor,
    img,
    price: stableCatalogPrice({ id, name, weapon, category, rarity }, 'FT'),
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

function normalizeBattleListing(value, now) {
  const id = cleanText(value?.id, 64)
  const ownerDeviceId = cleanText(value?.ownerDeviceId, 64)
  const ownerTicketId = cleanText(value?.ownerTicketId, 64)
  const stake = parseStake(value?.stake)
  const createdAt = boundedInteger(value?.createdAt, now - BATTLE_LISTING_TTL, now, now)
  const expiresAt = boundedInteger(value?.expiresAt, createdAt + 1, now + BATTLE_LISTING_TTL, createdAt + BATTLE_LISTING_TTL)
  if (!id || !ID.test(ownerDeviceId) || !ID.test(ownerTicketId) || !stake || expiresAt <= now) return null
  const profileId = cleanText(value?.profileId, 64)
  return {
    id,
    ownerDeviceId,
    ownerTicketId,
    name: cleanText(value?.name, 24) || 'Гравець',
    profileId: ID.test(profileId) ? profileId : '',
    stake,
    createdAt,
    expiresAt,
  }
}

function normalizeRoyaleParticipant(value, now) {
  const deviceId = cleanText(value?.deviceId, 64)
  const ticketId = cleanText(value?.ticketId, 64)
  const profileId = cleanText(value?.profileId, 64)
  // Accept the former single-stake shape while an old in-progress round
  // naturally expires. New rounds always use a set of 1–10 virtual skins.
  const stakes = parseRoyaleStakes(Array.isArray(value?.stakes) ? value.stakes : [value?.stake])
  const joinedAt = boundedInteger(value?.joinedAt, now - ROYALE_LIVE_LOBBY_TTL, now, now)
  if (!ID.test(deviceId) || !ID.test(ticketId) || !stakes) return null
  return {
    deviceId,
    ticketId,
    profileId: ID.test(profileId) ? profileId : '',
    name: cleanText(value?.name, 24) || 'Гравець',
    stakes,
    total: stakes.reduce((sum, stake) => sum + stake.price, 0),
    joinedAt,
  }
}

function normalizeRoyaleRound(value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const createdAt = boundedInteger(value.createdAt, now - ROYALE_LIVE_LOBBY_TTL, now, now)
  const participants = (Array.isArray(value.participants) ? value.participants : [])
    .map(entry => normalizeRoyaleParticipant(entry, now))
    .filter(Boolean)
    .filter((entry, index, all) => all.findIndex(candidate => candidate.deviceId === entry.deviceId) === index)
    .slice(0, ROYALE_LIVE_MAX_PLAYERS)
  const status = ['open', 'countdown', 'settled'].includes(value.status) ? value.status : 'open'
  const startAt = boundedInteger(value.startAt, createdAt, createdAt + ROYALE_LIVE_LOBBY_TTL, 0)
  const winnerTicketId = cleanText(value.winnerTicketId, 64)
  const isSettled = status === 'settled' || (status === 'countdown' && now >= startAt)
  const settledAt = isSettled ? boundedInteger(value.settledAt, startAt, now, startAt) : 0
  if (!participants.length) return null
  if (status === 'open' && now - createdAt > ROYALE_LIVE_LOBBY_TTL) return null
  if (isSettled && now - settledAt > ROYALE_LIVE_RESULT_TTL) return null
  if (status !== 'open' && (!startAt || !ID.test(winnerTicketId))) return null
  return {
    id: cleanText(value.id, 64) || randomHex(12),
    createdAt,
    status: isSettled ? 'settled' : status,
    startAt,
    settledAt,
    winnerTicketId,
    participants,
  }
}

function normalizeRoyaleReceipt(value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const id = cleanText(value.id, 64)
  const settledAt = boundedInteger(value.settledAt, now - ROYALE_LIVE_RECEIPT_TTL, now, 0)
  const winnerTicketId = cleanText(value.winnerTicketId, 64)
  const participants = (Array.isArray(value.participants) ? value.participants : [])
    .map(entry => normalizeRoyaleParticipant(entry, now))
    .filter(Boolean)
    .filter((entry, index, all) => all.findIndex(candidate => candidate.deviceId === entry.deviceId) === index)
    .slice(0, ROYALE_LIVE_MAX_PLAYERS)
  if (!id || !settledAt || !ID.test(winnerTicketId) || !participants.length) return null
  if (!participants.some(player => player.ticketId === winnerTicketId)) return null
  return {
    id,
    createdAt: boundedInteger(value.createdAt, 0, settledAt, settledAt),
    status: 'settled',
    startAt: boundedInteger(value.startAt, 0, settledAt, settledAt),
    settledAt,
    winnerTicketId,
    participants,
  }
}

function archiveRoyaleSettlement(state, now) {
  const round = state.royale
  if (!round || round.status !== 'settled') return
  const receipt = normalizeRoyaleReceipt(round, now)
  if (!receipt || state.royaleReceipts.some(entry => entry?.id === receipt.id)) return
  state.royaleReceipts.unshift(receipt)
}

function royaleReceiptForTicket(state, ticketId) {
  return state.royaleReceipts.find(round => round.participants.some(player => player.ticketId === ticketId)) || null
}

function publicRoyaleRound(round, deviceId, ticketId, now) {
  if (!round) return { status: 'idle', canJoin: true, maxPlayers: ROYALE_LIVE_MAX_PLAYERS }
  const isSettled = round.status === 'settled'
  return {
    id: round.id,
    status: round.status,
    createdAt: round.createdAt,
    startAt: round.startAt || 0,
    settledAt: isSettled ? round.settledAt || round.startAt || 0 : 0,
    startInMs: round.status === 'countdown' ? Math.max(0, round.startAt - now) : 0,
    // The winning ticket is intentionally withheld until the server starts
    // the draw, so the pre-spin wheel cannot reveal the outcome.
    winnerTicketId: isSettled ? round.winnerTicketId : '',
    canJoin: round.status === 'open' && round.participants.length < ROYALE_LIVE_MAX_PLAYERS,
    maxPlayers: ROYALE_LIVE_MAX_PLAYERS,
    participants: round.participants.map(player => ({
      ticketId: player.ticketId,
      name: player.name,
      profileId: player.profileId,
      stakes: player.stakes,
      total: player.total,
      joinedAt: player.joinedAt,
      isMine: player.deviceId === deviceId && player.ticketId === ticketId,
    })),
  }
}

function pickRoyaleWinner(participants) {
  const total = participants.reduce((sum, player) => sum + Math.max(1, Number(player.total || 0)), 0)
  let cursor = (crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000) * total
  for (const player of participants) {
    cursor -= Math.max(1, Number(player.total || 0))
    if (cursor <= 0) return player.ticketId
  }
  return participants[participants.length - 1].ticketId
}

function cleanMatchState(state, now) {
  state.queue = state.queue.filter(entry => entry && ID.test(String(entry.deviceId || '')) && ID.test(String(entry.ticketId || '')) && now - Number(entry.joinedAt || 0) < WAIT_TTL)
  state.matches = state.matches.filter(match => match && now - Number(match.createdAt || 0) < MATCH_TTL).slice(0, 40)
  state.listings = state.listings
    .map(entry => normalizeBattleListing(entry, now))
    .filter(Boolean)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, BATTLE_LISTING_LIMIT)
  state.royaleReceipts = state.royaleReceipts
    .map(entry => normalizeRoyaleReceipt(entry, now))
    .filter(Boolean)
    .sort((left, right) => right.settledAt - left.settledAt)
    .slice(0, ROYALE_LIVE_RECEIPT_LIMIT)
  state.royale = normalizeRoyaleRound(state.royale, now)
  archiveRoyaleSettlement(state, now)
}

function publicMatch(match, now) {
  const startAt = boundedInteger(match.startAt, match.createdAt, match.createdAt + BATTLE_MATCH_START_DELAY, match.createdAt)
  return {
    id: match.id,
    createdAt: match.createdAt,
    startAt,
    // The browser uses this server-calculated delay instead of trusting its
    // own clock. That keeps the visible countdown within five seconds even
    // when a player's device time is wrong.
    startInMs: Math.max(0, startAt - now),
    winnerTicketId: match.winnerTicketId,
    players: match.players.map(player => ({ ticketId: player.ticketId, name: player.name, profileId: player.profileId || '', stake: player.stake })),
  }
}

function publicBattleListing(listing, deviceId, now) {
  return {
    id: listing.id,
    name: listing.name,
    profileId: listing.profileId || '',
    stake: listing.stake,
    createdAt: listing.createdAt,
    expiresAt: listing.expiresAt,
    remainingMs: Math.max(0, listing.expiresAt - now),
    isMine: listing.ownerDeviceId === deviceId,
  }
}

function compatibleBattleStakes(first, second) {
  const ratio = Number(second?.price || 0) / Math.max(0.01, Number(first?.price || 0))
  return ratio >= 0.65 && ratio <= 1.45
}

function matchmakingResult(state, deviceId, ticketId, now) {
  const match = state.matches.find(candidate => candidate.players.some(player => player.deviceId === deviceId && player.ticketId === ticketId))
  if (match) return { status: 'matched', match: publicMatch(match, now) }
  const position = state.queue.findIndex(entry => entry.deviceId === deviceId && entry.ticketId === ticketId)
  if (position >= 0) return { status: 'waiting', position: position + 1, waitedMs: Math.max(0, now - state.queue[position].joinedAt) }
  return { status: 'idle' }
}

function battleListingResult(state, deviceId, ticketId, now) {
  const matched = matchmakingResult(state, deviceId, ticketId, now)
  if (matched.status === 'matched') return matched
  const listing = state.listings.find(entry => entry.ownerDeviceId === deviceId && entry.ownerTicketId === ticketId)
  return listing
    ? { status: 'listed', listing: publicBattleListing(listing, deviceId, now) }
    : { status: 'idle' }
}

async function timedFetch(url, options = {}) {
  const { timeoutMs = 10_000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal })
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
      if (path === '/__internal/mobile-session') return await this.internalMobileSession(request)
      if (path === '/__internal/session-subject') return await this.internalSessionSubject(request)
      if (path === '/__internal/steam-session-valid') return await this.internalSteamSessionValidity(request)
      if (path === '/__internal/steam-account') return await this.internalSteamAccount(request)
      if (path === '/__internal/referral-credit') return await this.internalReferralCredit(request)
      if (path === '/__internal/referral-identity') return await this.internalReferralIdentity(request)
      if (path === '/__internal/migrate-profile') return await this.internalProfileMigration(request)
      if (path === '/__internal/migrate-public-profile') return await this.internalPublicProfileMigration(request)
      if (path === '/__internal/delete-public-profile') return await this.internalDeletePublicProfile(request)
      if (path === '/__internal/profile-visibility') return await this.internalProfileVisibility(request)
      if (path === '/__internal/admin-profile') return await this.internalAdminProfile(request)
      if (path === '/__internal/admin-player-directory') return await this.internalAdminPlayerDirectory(request)
      if (path === '/__internal/community-visibility') return await this.internalCommunityVisibility(request)
      if (path === '/__internal/community-delete-account') return await this.internalCommunityDeleteAccount(request)
      if (path === '/api/profile/sync') return await this.profile(request)
      if (path === '/api/rewards') return await this.rewards(request)
      if (path === '/api/public-profile') return await this.publicProfile(request)
      if (path === '/api/public-avatar') return await this.publicAvatar(request)
      if (path === '/api/fair/roll') return await this.fairRoll(request)
      if (path === '/api/fair/verify') return await this.fairVerify(request)
      if (path === '/api/matchmaking') return await this.matchmaking(request)
      if (path === '/api/royale') return await this.royale(request)
      if (path === '/api/presence') return await this.presence(request)
      if (path === '/api/community') return await this.community(request)
      if (path === '/api/community-avatar') return await this.communityAvatar(request)
      if (path === '/api/steam/auth') return await this.steamAuth(request)
      if (path === '/api/mobile/session') return await this.mobileSession(request)
      if (path === '/api/steam/session') return await this.steamSession(request)
      if (path === '/api/steam/account') return await this.steamAccount(request)
      if (path === '/api/steam/logout') return await this.steamLogout(request)
      if (path === '/api/steam/profile') return await this.steamProfile(request)
      if (path === '/api/steam/avatar') return await this.steamAvatar(request)
      if (path === '/api/steam/inventory') return await this.steamInventory(request)
      if (path === '/api/catalog/skins') return await this.skinCatalog(request)
      if (path === '/api/catalog/market-prices') return await this.marketPrices(request)
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

  async internalMobileSession(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let session
    try {
      session = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректна мобільна сесія.' }, 400)
    }
    if (!/^\d{17}$/.test(String(session?.steamId || '')) || Number(session?.expiresAt || 0) <= Date.now()) {
      return json({ error: 'Некоректна мобільна сесія.' }, 400)
    }
    await this.storage.put('mobile-session', {
      steamId: String(session.steamId),
      createdAt: Number(session.createdAt) || Date.now(),
      expiresAt: Number(session.expiresAt),
    })
    return json({ stored: true })
  }

  // A community heartbeat is handled by its own Durable Object, so it cannot
  // read this session object's storage directly. This narrow internal route
  // proves the current session's Steam subject without exposing the token or
  // accepting a Steam ID supplied by the client.
  async internalSessionSubject(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректна перевірка Steam-сесії.' }, 400)
    }
    const legacyToken = cleanText(body?.legacyToken, 80)
    const session = await this.storage.get('steam-session')
      || await this.storage.get('mobile-session')
      || (/^[a-f0-9]{64}$/i.test(legacyToken) ? await this.storage.get(`steam-session:${legacyToken}`) : null)
    if (!/^\d{17}$/.test(String(session?.steamId || '')) || Number(session?.expiresAt || 0) <= Date.now() || !await this.isSteamSessionValid(session)) {
      return json({ error: 'Steam-сесія не підтверджена.' }, 401)
    }
    return json({ steamId: String(session.steamId) })
  }

  async internalSteamSessionValidity(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректна перевірка сесії.' }, 400)
    }
    const steamId = String(body?.steamId || '')
    const createdAt = Number(body?.createdAt || 0)
    if (!/^\d{17}$/.test(steamId) || !Number.isFinite(createdAt) || createdAt <= 0) return json({ error: 'Некоректна Steam-сесія.' }, 400)
    const deletedAt = Number(await this.storage.get('steam-account:deleted-at') || 0)
    return json({ valid: !(deletedAt > 0 && createdAt <= deletedAt) })
  }

  // A Steam account is deliberately stored in a stable object named after the
  // verified Steam ID, not in the short-lived browser-session object. The
  // browser never supplies a Steam ID for this endpoint: the session object
  // forwards the ID only after reading its HttpOnly Steam session cookie.
  async internalSteamAccount(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request)
    } catch (error) {
      return json({ error: error instanceof RangeError ? error.message : 'Некоректний запит.' }, error instanceof RangeError ? 413 : 400)
    }
    const steamId = String(body?.steamId || '')
    const action = String(body?.action || '')
    if (!/^\d{17}$/.test(steamId)) return json({ error: 'Некоректний Steam-акаунт.' }, 400)

    const key = 'steam-account'
    const entry = await this.storage.get(key)
    if (entry && entry.steamId !== steamId) return json({ error: 'Помилка ізоляції Steam-акаунта.' }, 403)

    if (action === 'load') {
      if (!entry || !isPayload(entry.payload)) return json({ error: 'Steam-акаунт ще не має збереження.' }, 404)
      await this.indexGameProfile(steamId, entry, 'steam')
      return json({ payload: entry.payload, updatedAt: entry.updatedAt, revision: Math.max(1, Math.floor(Number(entry.revision) || 1)) })
    }

    if (action === 'delete') {
      if (body?.confirmation !== 'DELETE') return json({ error: 'Підтверди видалення акаунта.' }, 400)
      const deletedAt = Date.now()
      const deleted = await this.storage.transaction(async transaction => {
        const current = await transaction.get(key)
        if (!current) return { existed: false, publicProfile: null }
        if (current.steamId !== steamId) return { error: 'Помилка ізоляції Steam-акаунта.', status: 403 }
        const identity = current?.payload?.account?.publicProfile
        const publicProfile = ID.test(String(identity?.id || '')) && SEED.test(String(identity?.writeKey || ''))
          ? { id: String(identity.id), writeKey: String(identity.writeKey) }
          : null
        await transaction.delete(key)
        await transaction.put('steam-account:deleted-at', deletedAt)
        return { existed: true, publicProfile }
      })
      if (deleted.error) return json({ error: deleted.error }, deleted.status)
      await this.cleanupDeletedSteamAccount(steamId, deleted.publicProfile)
      return json({ deleted: true, existed: deleted.existed })
    }

    if (action === 'create') {
      if (!isPayload(body?.payload)) return json({ error: 'Некоректне збереження.' }, 400)
      const created = await this.storage.transaction(async transaction => {
        const current = await transaction.get(key)
        if (current) return null
        const payload = withServerReferralState(body.payload, null)
        const next = { version: 1, steamId, revision: 1, payload, createdAt: Date.now(), updatedAt: Date.now() }
        await transaction.put(key, next)
        return next
      })
      if (!created) return json({ error: 'Steam-акаунт уже має збереження.' }, 409)
      await this.indexGameProfile(steamId, created, 'steam')
      return json({ created: true, updatedAt: created.updatedAt, revision: created.revision })
    }

    if (action === 'activate-referral') {
      const result = await this.activateReferralForAccount({
        accountId: steamId,
        accountType: 'steam',
        referrerAccountId: cleanText(body?.referrerAccountId, 64),
      })
      return json(result, result.status || 200)
    }

    if (action === 'set-visibility') {
      if (typeof body?.hidden !== 'boolean') return json({ error: 'Некоректна видимість профілю.' }, 400)
      const changed = await this.storage.transaction(async transaction => {
        const current = await transaction.get(key)
        if (!current || current.steamId !== steamId || !isPayload(current.payload)) {
          return { error: 'Steam-акаунт не знайдено.', status: 404 }
        }
        const updatedAt = Date.now()
        const visibility = { hidden: body.hidden === true, updatedAt }
        const payload = { ...current.payload, visibility }
        if (!isPayload(payload)) return { error: 'Профіль завеликий після зміни.', status: 413 }
        const next = {
          ...current,
          version: 1,
          revision: Math.max(1, Math.floor(Number(current.revision) || 1)) + 1,
          payload,
          updatedAt,
        }
        await transaction.put(key, next)
        return { updatedAt, revision: next.revision, hidden: visibility.hidden, entry: next }
      })
      if (changed.error) return json({ error: changed.error }, changed.status)
      await this.indexGameProfile(steamId, changed.entry, 'steam')
      return json({ updatedAt: changed.updatedAt, revision: changed.revision, hidden: changed.hidden })
    }

    if (action !== 'save' || !isPayload(body?.payload)) return json({ error: 'Некоректне збереження.' }, 400)
    const expectedRevision = Number(body?.revision)
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) return json({ error: 'Локальна версія застаріла. Спочатку завантаж актуальний Steam-прогрес.' }, 409)
    const saved = await this.storage.transaction(async transaction => {
      const current = await transaction.get(key)
      if (!current || current.steamId !== steamId || !isPayload(current.payload)) return { error: 'Steam-акаунт не знайдено.', status: 404 }
      const revision = Math.max(1, Math.floor(Number(current.revision) || 1))
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
      if (revision !== expectedRevision) {
        return {
          error: 'Прогрес змінився на іншому пристрої. Завантажуємо актуальну версію, щоб нічого не перетерти.',
          status: 409,
          revision,
        }
      }
      const payload = { ...withServerReferralState(body.payload, current.payload), moderation, visibility }
      if (!isPayload(payload)) return { error: 'Профіль завеликий після збереження.', status: 413 }
      const updatedAt = Date.now()
      const next = { ...current, version: 1, revision: revision + 1, payload, updatedAt }
      await transaction.put(key, next)
      return { updatedAt, revision: next.revision, entry: next }
    })
    if (saved.error) return json({ error: saved.error, code: saved.code, moderation: saved.moderation, revision: saved.revision }, saved.status)
    await this.indexGameProfile(steamId, saved.entry, 'steam')
    const referral = await this.processReferralProgressAfterSteamSave(steamId)
    const finalEntry = referral?.entry || saved.entry
    if (finalEntry && finalEntry !== saved.entry) await this.indexGameProfile(steamId, finalEntry, 'steam')
    return json({
      updatedAt: finalEntry?.updatedAt || saved.updatedAt,
      revision: Math.max(1, Number(finalEntry?.revision) || saved.revision),
      referral: referral ? { recipientReward: referral.recipientReward, settled: referral.settled, state: referral.state } : undefined,
    })
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

  async internalDeletePublicProfile(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит.' }, 400)
    }
    const id = String(body?.id || '')
    const writeKey = String(body?.writeKey || '')
    const legacyOnly = body?.legacyOnly === true
    if (!ID.test(id) || !SEED.test(writeKey)) return json({ error: 'Некоректні дані публічного профілю.' }, 400)
    const key = `public-profile:${id}`
    const writeHash = await sha256(writeKey)
    const existing = legacyOnly ? await this.storage.get(key) : await this.publicProfileEntry(id)
    if (existing && !equalHash(existing.writeHash, writeHash)) return json({ error: 'Неможливо підтвердити публічний профіль.' }, 403)
    if (existing) await this.storage.delete(key)
    if (!legacyOnly) {
      const global = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
      try {
        await global.fetch(new Request('https://internal/__internal/delete-public-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, writeKey, legacyOnly: true }),
        }))
      } catch {
        // The public shard was already cleared. A stale migration copy naturally
        // expires if the legacy cleanup request is temporarily unavailable.
      }
    }
    return json({ deleted: Boolean(existing) })
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
    const accountType = gameAccountType(accountId)
    if (!accountType) return json({ error: 'Некоректний ID гравця.' }, 400)
    const key = accountType === 'steam' ? 'steam-account' : `profile:${accountId}`
    const action = cleanText(body?.action, 24)
    if (action === 'summary') {
      const entry = await this.storage.get(key)
      const player = adminProfileSummary(accountId, entry, accountType)
      if (!player) return json({ error: 'Профіль гравця не знайдено.' }, 404)
      await this.indexGameProfile(accountId, entry, accountType)
      return json({ player })
    }
    if (action !== 'mutate') return json({ error: 'Невідома дія над профілем.' }, 400)
    const operation = cleanText(body?.operation, 32)
    const result = await this.storage.transaction(async transaction => {
      const entry = await transaction.get(key)
      const payload = entry?.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload) ? entry.payload : null
      if (!entry || !payload || (accountType === 'steam' && entry.steamId !== accountId)) return { error: 'Профіль гравця не знайдено.', status: 404 }
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
        const rawAmount = Number(body?.amount)
        if (!Number.isFinite(rawAmount) || rawAmount < 0 || rawAmount > ADMIN_GAME_MAX_BALANCE) return { error: 'Некоректна кількість PC.', status: 400 }
        const amount = boundedMoney(rawAmount, 0, ADMIN_GAME_MAX_BALANCE)
        next.balance = operation === 'pc_add'
          ? boundedMoney(boundedMoney(next.balance, 0, ADMIN_GAME_MAX_BALANCE) + amount, 0, ADMIN_GAME_MAX_BALANCE)
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
        version: accountType === 'steam' ? 1 : 2,
        revision: Math.max(1, boundedInteger(entry.revision, 1, Number.MAX_SAFE_INTEGER, 1)) + 1,
        payload: next,
        updatedAt,
      }
      if (!isPayload(next)) return { error: 'Профіль завеликий після зміни.', status: 413 }
      await transaction.put(key, nextEntry)
      return { player: adminProfileSummary(accountId, nextEntry, accountType), detail, entry: nextEntry }
    })
    if (result.error) return json({ error: result.error }, result.status)
    await this.indexGameProfile(accountId, result.entry, accountType)
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
    const accountType = gameAccountType(accountId)
    if (!accountType) return json({ error: 'Некоректний ID гравця.' }, 400)
    const entry = await this.storage.get(accountType === 'steam' ? 'steam-account' : `profile:${accountId}`)
    if (accountType === 'steam' && entry?.steamId !== accountId) return json({ hidden: false })
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
    if (action === 'delete-account') {
      const accountId = cleanText(body?.accountId, 64)
      if (!isGameAccountId(accountId)) return json({ error: 'Некоректний акаунт.' }, 400)
      await this.storage.transaction(async transaction => {
        const stored = await transaction.get(key)
        const existing = stored?.players && typeof stored.players === 'object' && !Array.isArray(stored.players) ? stored.players : {}
        const players = Object.entries(existing)
          .map(([entryKey, entry]) => [entryKey, normalizeAdminPlayerDirectoryEntry(entry)])
          .filter(([, player]) => player && player.accountId !== accountId)
        await transaction.put(key, { version: 2, players: Object.fromEntries(players) })
      })
      return json({ deleted: true })
    }
    if (action === 'upsert') {
      const player = normalizeAdminPlayerDirectoryEntry(body?.player)
      if (!player) return json({ error: 'Некоректний профіль гравця.' }, 400)
      // The administration directory is an account-management tool, not a
      // visitor tracker. Anonymous browser heartbeats have no durable account
      // and must never look like people an admin can manage.
      if (!player.accountId) return json({ indexed: false, skipped: 'anonymous_visitor' })
      await this.storage.transaction(async transaction => {
        const stored = await transaction.get(key)
        const existing = stored?.players && typeof stored.players === 'object' && !Array.isArray(stored.players) ? stored.players : {}
        const players = Object.fromEntries(Object.entries(existing)
          .map(([, entry]) => normalizeAdminPlayerDirectoryEntry(entry))
          .filter(entry => entry?.accountId)
          .map(entry => [entry.accountId, entry]))
        const recordKey = player.accountId
        const related = [players[recordKey]]
          .filter(Boolean)
          .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
        const previous = related[0] || null
        const knownFirstSeen = related.map(entry => Number(entry.firstSeenAt || 0)).filter(value => value > 0)
        const merged = normalizeAdminPlayerDirectoryEntry({
          ...previous,
          ...player,
          visitorId: '',
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
        const trimmed = Object.values(players)
          .sort((left, right) => right.updatedAt - left.updatedAt)
          .slice(0, ADMIN_PLAYER_DIRECTORY_MAX)
        await transaction.put(key, { version: 3, players: Object.fromEntries(trimmed.map(entry => [entry.accountId, entry])) })
      })
      return json({ indexed: true })
    }
    if (action === 'list') {
      const query = cleanText(body?.query, 100).toLocaleLowerCase()
      const players = (await this.storage.transaction(async transaction => {
        const stored = await transaction.get(key)
        // Clean records created by the old directory implementation. They are
        // only one-way anonymous visitor hashes and are not player accounts.
        const normalized = Object.values(stored?.players && typeof stored.players === 'object' && !Array.isArray(stored.players) ? stored.players : {})
          .map(normalizeAdminPlayerDirectoryEntry)
          .filter(player => player?.accountId)
        const next = Object.fromEntries(normalized.map(player => [player.accountId, player]))
        const previousCount = Object.keys(stored?.players && typeof stored.players === 'object' && !Array.isArray(stored.players) ? stored.players : {}).length
        if (previousCount !== normalized.length || Number(stored?.version || 0) < 3) {
          await transaction.put(key, { version: 3, players: next })
        }
        return normalized
      }))
        .filter(player => !query || `${player.name} ${player.accountId}`.toLocaleLowerCase().includes(query))
        .sort((left, right) => right.updatedAt - left.updatedAt)
      return json({ total: players.length, players: players.slice(0, ADMIN_PLAYER_DIRECTORY_PAGE_SIZE) })
    }
    return json({ error: 'Невідома дія каталогу гравців.' }, 400)
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
    if (!isGameAccountId(accountId) || typeof body?.hidden !== 'boolean') return json({ error: 'Некоректні дані видимості.' }, 400)
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

  async internalCommunityDeleteAccount(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит видалення.' }, 400)
    }
    const accountId = cleanText(body?.accountId, 64)
    if (!isGameAccountId(accountId)) return json({ error: 'Некоректний акаунт.' }, 400)
    const now = Date.now()
    await this.storage.transaction(async transaction => {
      const state = normalizeCommunityState(await transaction.get('community:season'), now)
      const removed = new Set(Object.entries(state.players)
        .filter(([, player]) => player?.cloudProfileId === accountId)
        .map(([visitorHash]) => visitorHash))
      for (const visitorHash of removed) delete state.players[visitorHash]
      if (removed.size) {
        state.events = state.events.filter(entry => !removed.has(entry.playerId))
        state.circuit.recent = state.circuit.recent.filter(entry => !removed.has(entry.playerId))
        state.rift.recent = state.rift.recent.filter(entry => !removed.has(entry.playerId))
      }
      await transaction.put('community:season', state)
    })
    return json({ deleted: true })
  }

  async cleanupDeletedSteamAccount(steamId, publicProfile) {
    const tasks = []
    if (publicProfile) {
      const profile = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`public:${publicProfile.id}`))
      tasks.push(profile.fetch(new Request('https://internal/__internal/delete-public-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publicProfile),
      })))
    }
    const community = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('community'))
    const global = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
    tasks.push(
      community.fetch(new Request('https://internal/__internal/community-delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: steamId }),
      })),
      global.fetch(new Request('https://internal/__internal/admin-player-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-account', accountId: steamId }),
      })),
    )
    await Promise.allSettled(tasks)
  }

  async indexGameProfile(accountId, entry, accountType = gameAccountType(accountId)) {
    const player = adminPlayerDirectoryEntry(accountId, entry, accountType)
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

  async indexCloudProfile(accountId, entry) {
    return this.indexGameProfile(accountId, entry, 'cloud')
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

  async internalReferralCredit(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректне запрошення.' }, 400)
    }
    const accountId = cleanText(body?.accountId, 64)
    const referredSteamId = cleanText(body?.referredSteamId, 64)
    const accountType = gameAccountType(accountId)
    const claimId = cleanText(body?.claim?.id, 96)
    const fixedMilestone = REFERRAL_MILESTONE_BY_ID.get(claimId)
    const isWeeklyDividend = /^weekly_xp:\d{4}-\d{2}-\d{2}:\d{1,6}$/.test(claimId)
    const requestedReward = boundedMoney(body?.claim?.ownerReward, 0, REFERRAL_WEEKLY_OWNER_LIMIT)
    const ownerReward = fixedMilestone
      ? fixedMilestone.ownerReward
      : isWeeklyDividend
        ? requestedReward
        : -1
    if (accountType !== 'steam' || !/^\d{17}$/.test(referredSteamId) || accountId === referredSteamId || ownerReward < 0) {
      return json({ error: 'Некоректне запрошення.' }, 400)
    }
    const key = accountType === 'steam' ? 'steam-account' : `profile:${accountId}`
    const now = Date.now()
    const today = dayKey()
    const result = await this.storage.transaction(async transaction => {
      const current = await transaction.get(key)
      if (!current || !isPayload(current.payload) || (accountType === 'steam' && current.steamId !== accountId)) {
        return { error: 'Профіль автора запрошення не знайдено.', status: 404 }
      }
      const moderation = adminProfileModeration(current.payload?.moderation, Number(current.updatedAt) || now)
      if (moderation.blocked) return { error: 'Профіль автора запрошення тимчасово недоступний.', status: 423 }
      const payload = structuredClone(current.payload)
      const gameState = payload.gameState && typeof payload.gameState === 'object' && !Array.isArray(payload.gameState) ? payload.gameState : {}
      payload.gameState = gameState
      const stored = gameState.referrals && typeof gameState.referrals === 'object' && !Array.isArray(gameState.referrals) ? gameState.referrals : {}
      const rewarded = Array.isArray(stored.rewardedAccounts)
        ? stored.rewardedAccounts.filter(value => isGameAccountId(cleanText(value, 64))).slice(-240)
        : []
      const receipts = Array.isArray(stored.dividendReceipts)
        ? stored.dividendReceipts.filter(value => /^[0-9]{17}:[a-z0-9:_-]{2,96}$/.test(cleanText(value, 128))).slice(-REFERRAL_MILESTONE_RECEIPT_LIMIT)
        : []
      const receipt = `${referredSteamId}:${claimId}`
      if (receipts.includes(receipt)) {
        return { credited: false, duplicate: true, balance: boundedMoney(payload.balance, 0, ADMIN_GAME_MAX_BALANCE) }
      }
      const rewardDate = cleanText(stored.rewardDate, 10) === today ? today : today
      const rewardCount = cleanText(stored.rewardDate, 10) === today
        ? boundedInteger(stored.rewardCount, 0, REFERRAL_DAILY_OWNER_LIMIT)
        : 0
      if (ownerReward > 0 && rewardCount >= REFERRAL_DAILY_OWNER_LIMIT) {
        return { error: 'Денний ліміт запрошень уже використано.', status: 429 }
      }
      const isFirstActiveMilestone = claimId === 'level_3' && !rewarded.includes(referredSteamId)
      const totalPartners = Math.max(0, boundedInteger(stored.totalPartners ?? stored.totalRewarded, 0, 1_000_000, 0)) + (isFirstActiveMilestone ? 1 : 0)
      gameState.referrals = {
        ...stored,
        rewardDate,
        rewardCount: rewardCount + (ownerReward > 0 ? 1 : 0),
        rewardedAccounts: isFirstActiveMilestone ? [...rewarded, referredSteamId].slice(-240) : rewarded,
        dividendReceipts: [...receipts, receipt].slice(-REFERRAL_MILESTONE_RECEIPT_LIMIT),
        totalPartners,
        totalRewarded: totalPartners,
        totalDividends: boundedMoney(boundedMoney(stored.totalDividends, 0, ADMIN_GAME_MAX_BALANCE) + ownerReward, 0, ADMIN_GAME_MAX_BALANCE),
        lastRewardAt: now,
        lastDividend: { id: claimId, amount: ownerReward, at: now },
      }
      payload.balance = boundedMoney(boundedMoney(payload.balance, 0, ADMIN_GAME_MAX_BALANCE) + ownerReward, 0, ADMIN_GAME_MAX_BALANCE)
      if (!isPayload(payload)) return { error: 'Профіль завеликий після нагороди.', status: 413 }
      const next = {
        ...current,
        version: Math.max(1, Number(current.version) || 1),
        revision: Math.max(1, Math.floor(Number(current.revision) || 1)) + 1,
        payload,
        updatedAt: now,
      }
      await transaction.put(key, next)
      return { credited: true, balance: payload.balance, ownerReward, revision: next.revision, entry: next }
    })
    if (result.error) return json({ error: result.error }, result.status)
    if (result.entry) await this.indexGameProfile(accountId, result.entry, accountType)
    return json({ credited: result.credited, duplicate: result.duplicate === true, balance: result.balance, ownerReward: result.ownerReward || 0, revision: result.revision })
  }

  async internalReferralIdentity(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 8_192)
    } catch {
      return json({ error: 'Некоректний стан запрошення.' }, 400)
    }
    const action = cleanText(body?.action, 32)
    const steamId = cleanText(body?.steamId, 64)
    if (!/^\d{17}$/.test(steamId)) return json({ error: 'Некоректний Steam-акаунт.' }, 400)
    const now = Date.now()

    if (action === 'lock') {
      const referrerAccountId = cleanText(body?.referrerAccountId, 64)
      if (!/^\d{17}$/.test(referrerAccountId) || referrerAccountId === steamId) return json({ error: 'Некоректне посилання-запрошення.' }, 400)
      const result = await this.storage.transaction(async transaction => {
        const existing = await transaction.get(REFERRAL_IDENTITY_KEY)
        if (existing?.steamId === steamId) {
          if (existing.referrerAccountId === referrerAccountId) return { locked: true, duplicate: true, referrerAccountId }
          return { locked: false, conflict: true }
        }
        const identity = {
          version: 1,
          steamId,
          referrerAccountId,
          lockedAt: now,
          maxTotalXp: 0,
          weekly: { week: referralWeekKey(now), xp: 0, earned: 0, carry: 0, sequence: 0 },
          claims: {},
        }
        await transaction.put(REFERRAL_IDENTITY_KEY, identity)
        return { locked: true, duplicate: false, referrerAccountId }
      })
      return json(result, result.conflict ? 409 : 200)
    }

    if (action === 'claim-progress') {
      const result = await this.storage.transaction(async transaction => {
        const identity = await transaction.get(REFERRAL_IDENTITY_KEY)
        if (!identity || identity.steamId !== steamId || !/^\d{17}$/.test(String(identity.referrerAccountId || ''))) {
          return { error: 'Запрошення не підтверджено.', status: 404 }
        }
        const rawProgress = body?.progress && typeof body.progress === 'object' ? body.progress : {}
        const progress = {
          level: boundedInteger(rawProgress.level, 1, ADMIN_GAME_MAX_LEVEL, 1),
          prestige: boundedInteger(rawProgress.prestige, 0, ADMIN_GAME_MAX_PRESTIGE, 0),
          totalXp: boundedInteger(rawProgress.totalXp, 0, ADMIN_GAME_MAX_XP, 0),
        }
        const claims = identity.claims && typeof identity.claims === 'object' && !Array.isArray(identity.claims) ? identity.claims : {}
        const age = Math.max(0, now - boundedInteger(identity.lockedAt, 0, now, now))
        for (const milestone of REFERRAL_MILESTONES) {
          const achieved = milestone.level ? progress.level >= milestone.level : progress.prestige >= milestone.prestige
          if (achieved && age >= milestone.minAgeMs && !claims[milestone.id]) {
            claims[milestone.id] = { ...milestone, createdAt: now, ownerCredited: false, recruitCredited: false }
          }
        }

        const week = referralWeekKey(now)
        const previousWeekly = identity.weekly && typeof identity.weekly === 'object' ? identity.weekly : {}
        const weekly = cleanText(previousWeekly.week, 10) === week
          ? {
              week,
              xp: boundedInteger(previousWeekly.xp, 0, REFERRAL_WEEKLY_XP_LIMIT, 0),
              earned: boundedMoney(previousWeekly.earned, 0, REFERRAL_WEEKLY_OWNER_LIMIT),
              carry: boundedInteger(previousWeekly.carry, 0, REFERRAL_WEEKLY_XP_UNIT - 1, 0),
              sequence: boundedInteger(previousWeekly.sequence, 0, 1_000_000, 0),
            }
          : { week, xp: 0, earned: 0, carry: 0, sequence: 0 }
        const previousTotalXp = boundedInteger(identity.maxTotalXp, 0, ADMIN_GAME_MAX_XP, 0)
        const xpGain = Math.max(0, progress.totalXp - previousTotalXp)
        const acceptedXp = progress.level >= 10 || progress.prestige >= 1
          ? Math.min(xpGain, Math.max(0, REFERRAL_WEEKLY_XP_LIMIT - weekly.xp))
          : 0
        if (acceptedXp > 0) {
          const availablePayout = Math.max(0, REFERRAL_WEEKLY_OWNER_LIMIT - weekly.earned)
          const units = Math.min(
            Math.floor((weekly.carry + acceptedXp) / REFERRAL_WEEKLY_XP_UNIT),
            Math.floor(availablePayout / REFERRAL_WEEKLY_OWNER_REWARD),
          )
          weekly.xp += acceptedXp
          weekly.carry = (weekly.carry + acceptedXp) % REFERRAL_WEEKLY_XP_UNIT
          if (units > 0) {
            weekly.sequence += 1
            const ownerReward = units * REFERRAL_WEEKLY_OWNER_REWARD
            const claimId = `weekly_xp:${week}:${weekly.sequence}`
            claims[claimId] = { id: claimId, ownerReward, recruitReward: 0, label: 'Командний дивіденд', createdAt: now, ownerCredited: false, recruitCredited: false }
            weekly.earned += ownerReward
          }
        }
        identity.claims = claims
        identity.weekly = weekly
        identity.maxTotalXp = Math.max(previousTotalXp, progress.totalXp)
        await transaction.put(REFERRAL_IDENTITY_KEY, identity)
        const pending = Object.values(claims).filter(claim => !claim.ownerCredited || !claim.recruitCredited)
        return { referrerAccountId: identity.referrerAccountId, claims: pending }
      })
      return result.error ? json({ error: result.error }, result.status) : json(result)
    }

    if (action === 'ack') {
      const claimId = cleanText(body?.claimId, 96)
      const result = await this.storage.transaction(async transaction => {
        const identity = await transaction.get(REFERRAL_IDENTITY_KEY)
        const claim = identity?.claims?.[claimId]
        if (!identity || identity.steamId !== steamId || !claim) return { error: 'Віха запрошення не знайдена.', status: 404 }
        if (body?.ownerCredited === true) claim.ownerCredited = true
        if (body?.recruitCredited === true) claim.recruitCredited = true
        identity.claims[claimId] = claim
        await transaction.put(REFERRAL_IDENTITY_KEY, identity)
        return { acknowledged: true }
      })
      return result.error ? json({ error: result.error }, result.status) : json(result)
    }

    return json({ error: 'Невідома дія запрошення.' }, 400)
  }

  async referralIdentityRequest(steamId, body) {
    const identity = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`referral-identity:${steamId}`))
    const response = await identity.fetch(new Request('https://internal/__internal/referral-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, steamId }),
    }))
    const data = await response.json().catch(() => ({ error: 'Не вдалося підтвердити запрошення.' }))
    return { ...data, status: response.status }
  }

  async creditReferralOwner(accountId, referredSteamId, claim) {
    const accountType = gameAccountType(accountId)
    if (!accountType) return { error: 'Профіль автора запрошення не знайдено.', status: 404 }
    const name = accountType === 'steam' ? `steam-account:${accountId}` : `profile:${accountId}`
    const profile = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(name))
    const response = await profile.fetch(new Request('https://internal/__internal/referral-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, referredSteamId, claim }),
    }))
    const data = await response.json().catch(() => ({ error: 'Не вдалося підтвердити запрошення.' }))
    return { ...data, status: response.status }
  }

  async creditReferralRecruit(steamId, claim) {
    const milestone = referralMilestoneView(claim)
    const claimId = cleanText(claim?.id, 96)
    if (!milestone || !claimId) return { error: 'Некоректна віха запрошення.', status: 400 }
    const reward = boundedMoney(milestone.recruitReward, 0, ADMIN_GAME_MAX_BALANCE)
    const now = Date.now()
    const result = await this.storage.transaction(async transaction => {
      const current = await transaction.get('steam-account')
      if (!current || current.steamId !== steamId || !isPayload(current.payload)) return { error: 'Steam-акаунт не знайдено.', status: 404 }
      const payload = structuredClone(current.payload)
      const gameState = payload.gameState && typeof payload.gameState === 'object' && !Array.isArray(payload.gameState) ? payload.gameState : {}
      payload.gameState = gameState
      const referrals = gameState.referrals && typeof gameState.referrals === 'object' && !Array.isArray(gameState.referrals) ? gameState.referrals : {}
      const received = Array.isArray(referrals.receivedMilestones)
        ? referrals.receivedMilestones.filter(value => /^[a-z0-9:_-]{2,96}$/.test(cleanText(value, 96))).slice(-REFERRAL_MILESTONE_RECEIPT_LIMIT)
        : []
      if (received.includes(claimId)) return { credited: false, duplicate: true, balance: boundedMoney(payload.balance, 0, ADMIN_GAME_MAX_BALANCE), entry: current }
      gameState.referrals = {
        ...referrals,
        receivedMilestones: [...received, claimId].slice(-REFERRAL_MILESTONE_RECEIPT_LIMIT),
        totalRecruitRewards: boundedMoney(boundedMoney(referrals.totalRecruitRewards, 0, ADMIN_GAME_MAX_BALANCE) + reward, 0, ADMIN_GAME_MAX_BALANCE),
        lastRecruitReward: { id: claimId, amount: reward, at: now },
      }
      payload.balance = boundedMoney(boundedMoney(payload.balance, 0, ADMIN_GAME_MAX_BALANCE) + reward, 0, ADMIN_GAME_MAX_BALANCE)
      if (!isPayload(payload)) return { error: 'Профіль завеликий після нагороди.', status: 413 }
      const next = {
        ...current,
        revision: Math.max(1, Math.floor(Number(current.revision) || 1)) + 1,
        payload,
        updatedAt: now,
      }
      await transaction.put('steam-account', next)
      return { credited: true, balance: payload.balance, reward, revision: next.revision, entry: next }
    })
    if (result.entry) await this.indexGameProfile(steamId, result.entry, 'steam')
    return result
  }

  async processReferralProgressAfterSteamSave(steamId) {
    const entry = await this.storage.get('steam-account')
    if (!entry || entry.steamId !== steamId || !isPayload(entry.payload)) return null
    const joinedFrom = referralState(entry.payload).joinedFrom
    const referrerAccountId = cleanText(joinedFrom?.accountId, 64)
    if (!/^\d{17}$/.test(referrerAccountId) || referrerAccountId === steamId) return null

    const claimed = await this.referralIdentityRequest(steamId, {
      action: 'claim-progress',
      progress: referralProgress(entry.payload),
    })
    if (claimed.status !== 200 || !Array.isArray(claimed.claims)) return null

    let recruitReward = 0
    const settled = []
    for (const claim of claimed.claims) {
      const milestone = referralMilestoneView(claim)
      if (!milestone) continue
      const ownerCredit = claim.ownerCredited === true
        ? { credited: true, duplicate: true }
        : await this.creditReferralOwner(referrerAccountId, steamId, claim)
      if (!ownerCredit.credited && !ownerCredit.duplicate) continue
      const recruitCredit = claim.recruitCredited === true
        ? { credited: true, duplicate: true, reward: 0 }
        : await this.creditReferralRecruit(steamId, claim)
      if (recruitCredit.error) continue
      await this.referralIdentityRequest(steamId, {
        action: 'ack',
        claimId: claim.id,
        ownerCredited: true,
        recruitCredited: true,
      })
      if (recruitCredit.credited) recruitReward += boundedMoney(recruitCredit.reward, 0, ADMIN_GAME_MAX_BALANCE)
      settled.push({ id: claim.id, label: milestone.label, ownerReward: milestone.ownerReward, recruitReward: milestone.recruitReward })
    }
    const current = await this.storage.get('steam-account')
    const state = current?.payload ? referralState(current.payload) : {}
    return { entry: current, recipientReward: recruitReward, settled, state }
  }

  async activateReferralForAccount({ accountId, accountType, referrerAccountId, recoveryHash = '' }) {
    if (accountType !== 'steam' || !/^\d{17}$/.test(accountId)) {
      return { error: 'Для участі в програмі напарників підключи Steam-акаунт.', status: 409 }
    }
    const key = 'steam-account'
    const now = Date.now()
    const referrer = cleanText(referrerAccountId, 64)
    if (!/^\d{17}$/.test(referrer) || referrer === accountId) return { error: 'Некоректне посилання-запрошення.', status: 400 }
    const existing = await this.storage.get(key)
    if (!existing || !isPayload(existing.payload) || existing.steamId !== accountId) {
      return { error: 'Профіль гравця не знайдено.', status: 404 }
    }
    const previousReferral = existing.payload?.gameState?.referrals?.joinedFrom
    if (isGameAccountId(cleanText(previousReferral?.accountId, 64))) {
      return { error: 'Запрошення для цього профілю вже активовано.', status: 409 }
    }
    const createdAt = boundedInteger(existing.createdAt, 0, Number.MAX_SAFE_INTEGER, boundedInteger(existing.updatedAt, 0, Number.MAX_SAFE_INTEGER, now))
    if (now - createdAt > REFERRAL_NEW_ACCOUNT_WINDOW) {
      return { error: 'Бонус доступний лише новим профілям протягом перших 7 днів.', status: 409 }
    }
    const identity = await this.referralIdentityRequest(accountId, { action: 'lock', referrerAccountId: referrer })
    if (identity.conflict) return { error: 'Цей Steam-акаунт уже закріплений за іншим запрошенням.', status: 409 }
    if (identity.status !== 200 || !identity.locked) return { error: identity.error || 'Не вдалося підтвердити Steam-акаунт.', status: identity.status || 502 }

    const activated = await this.storage.transaction(async transaction => {
      const current = await transaction.get(key)
      if (!current || !isPayload(current.payload) || current.steamId !== accountId) {
        return { error: 'Профіль гравця не знайдено.', status: 404 }
      }
      const payload = structuredClone(current.payload)
      const gameState = payload.gameState && typeof payload.gameState === 'object' && !Array.isArray(payload.gameState) ? payload.gameState : {}
      payload.gameState = gameState
      const stored = gameState.referrals && typeof gameState.referrals === 'object' && !Array.isArray(gameState.referrals) ? gameState.referrals : {}
      const joinedFrom = stored.joinedFrom && typeof stored.joinedFrom === 'object' ? stored.joinedFrom : null
      if (isGameAccountId(cleanText(joinedFrom?.accountId, 64))) {
        return { activated: false, duplicate: true, balance: boundedMoney(payload.balance, 0, ADMIN_GAME_MAX_BALANCE), revision: current.revision }
      }
      gameState.referrals = {
        ...stored,
        joinedFrom: { accountId: referrer, steamId: accountId, at: now, program: 2 },
        program: 2,
        programStatus: 'pending_level_3',
      }
      if (!isPayload(payload)) return { error: 'Профіль завеликий після нагороди.', status: 413 }
      const next = {
        ...current,
        version: Math.max(1, Number(current.version) || 1),
        revision: Math.max(1, Math.floor(Number(current.revision) || 1)) + 1,
        payload,
        updatedAt: now,
      }
      await transaction.put(key, next)
      return { activated: true, balance: payload.balance, revision: next.revision, entry: next }
    })
    if (activated.error) return activated
    if (activated.entry) await this.indexGameProfile(accountId, activated.entry, accountType)
    return {
      activated: activated.activated,
      duplicate: activated.duplicate === true,
      balance: activated.balance,
      revision: activated.revision,
      referral: { state: referralState(activated.entry?.payload) },
      status: 200,
    }
  }

  async rewards(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний запит нагород.' }, 400)
    }
    if (String(body?.action || '') !== 'activate-referral') return json({ error: 'Невідома дія нагороди.' }, 400)
    const referrerAccountId = cleanText(body?.referrerAccountId, 64)
    const cloudAccountId = cleanText(body?.accountId, 64)
    if (ID.test(cloudAccountId)) {
      const recoveryCode = String(body?.recoveryCode || '')
      if (!RECOVERY_CODE.test(recoveryCode)) return json({ error: 'Не вдалося підтвердити профіль.', status: 403 }, 403)
      const result = await this.activateReferralForAccount({
        accountId: cloudAccountId,
        accountType: 'cloud',
        referrerAccountId,
        recoveryHash: await sha256(recoveryCode),
      })
      return json(result, result.status || 200)
    }
    const session = await this.getSteamSession(request)
    if (!session) return json({ error: 'Спочатку увійди через Steam.', status: 401 }, 401)
    const profile = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`steam-account:${session.steamId}`))
    const response = await profile.fetch(new Request('https://internal/__internal/steam-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate-referral', steamId: session.steamId, referrerAccountId }),
    }))
    return new Response(response.body, { status: response.status, headers: JSON_HEADERS })
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
        const now = Date.now()
        const data = { version: 2, revision: 1, recoveryHash, payload: body.payload, createdAt: now, updatedAt: now }
        await transaction.put(key, data)
        return data
      })
      if (!result) return json({ error: 'Профіль уже існує.' }, 409)
      await this.indexCloudProfile(accountId, result)
      return json({ updatedAt: result.updatedAt, revision: result.revision })
    }

    if (!entry || !equalHash(entry.recoveryHash, recoveryHash)) return json({ error: 'Профіль не знайдено або код відновлення неправильний.' }, 403)
    const revision = Math.max(1, Math.floor(Number(entry.revision) || 1))
    if (action === 'activate-referral') {
      const result = await this.activateReferralForAccount({
        accountId,
        accountType: 'cloud',
        referrerAccountId: cleanText(body?.referrerAccountId, 64),
        recoveryHash,
      })
      return json(result, result.status || 200)
    }
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
    const action = cleanText(body?.action, 24)
    const deviceId = cleanText(body?.deviceId, 64)
    const ticketId = cleanText(body?.ticketId, 64)
    if (!ID.test(deviceId) || !ID.test(ticketId)) return json({ error: 'Некоректний matchmaking-квиток.' }, 400)

    if (action === 'list') {
      return json(await this.updateMatchState((state, now) => ({
        status: 'list',
        listings: state.listings.map(listing => publicBattleListing(listing, deviceId, now)),
      })))
    }
    if (action === 'listing-status') return json(await this.updateMatchState((state, now) => battleListingResult(state, deviceId, ticketId, now)))
    if (action === 'cancel-listing') {
      return json(await this.updateMatchState((state, now) => {
        const existing = battleListingResult(state, deviceId, ticketId, now)
        if (existing.status === 'matched') return existing
        state.listings = state.listings.filter(entry => !(entry.ownerDeviceId === deviceId && entry.ownerTicketId === ticketId))
        return { status: 'cancelled' }
      }))
    }

    if (action === 'create-listing') {
      const stake = parseStake(body?.stake)
      if (!stake) return json({ error: 'Некоректний предмет для відкритого бою.' }, 400)
      const name = cleanText(body?.name, 24) || 'Гравець'
      const profileId = cleanText(body?.profileId, 64)
      if (profileId && !ID.test(profileId)) return json({ error: 'Некоректний профіль гравця.' }, 400)
      return json(await this.updateMatchState((state, now) => {
        const existing = battleListingResult(state, deviceId, ticketId, now)
        if (existing.status === 'matched' || existing.status === 'listed') return existing
        state.queue = state.queue.filter(entry => entry.deviceId !== deviceId)
        state.listings = state.listings.filter(entry => entry.ownerDeviceId !== deviceId)
        const listing = {
          id: randomHex(12),
          ownerDeviceId: deviceId,
          ownerTicketId: ticketId,
          name,
          profileId,
          stake,
          createdAt: now,
          expiresAt: now + BATTLE_LISTING_TTL,
        }
        state.listings.unshift(listing)
        return { status: 'listed', listing: publicBattleListing(listing, deviceId, now) }
      }))
    }

    if (action === 'accept-listing') {
      const listingId = cleanText(body?.listingId, 64)
      const stake = parseStake(body?.stake)
      const name = cleanText(body?.name, 24) || 'Гравець'
      const profileId = cleanText(body?.profileId, 64)
      if (!listingId || !stake) return json({ error: 'Обери коректний предмет для прийняття бою.' }, 400)
      if (profileId && !ID.test(profileId)) return json({ error: 'Некоректний профіль гравця.' }, 400)
      const accepted = await this.updateMatchState((state, now) => {
        const existing = matchmakingResult(state, deviceId, ticketId, now)
        if (existing.status === 'matched') return existing
        const listingIndex = state.listings.findIndex(entry => entry.id === listingId)
        if (listingIndex < 0) return { error: 'Цей бій уже прийняли або він завершився.', status: 404 }
        const listing = state.listings[listingIndex]
        if (listing.ownerDeviceId === deviceId) return { error: 'Не можна прийняти власний бій.', status: 400 }
        if (!compatibleBattleStakes(listing.stake, stake)) {
          return { error: 'Твій предмет має коштувати від 65% до 145% ставки суперника.', status: 400 }
        }
        state.listings.splice(listingIndex, 1)
        state.queue = state.queue.filter(entry => entry.deviceId !== deviceId && entry.deviceId !== listing.ownerDeviceId)
        const entrant = { deviceId, ticketId, name, profileId, roomId: '', stake, joinedAt: now }
        const owner = {
          deviceId: listing.ownerDeviceId,
          ticketId: listing.ownerTicketId,
          name: listing.name,
          profileId: listing.profileId,
          roomId: '',
          stake: listing.stake,
          joinedAt: listing.createdAt,
        }
        const players = [owner, entrant]
        const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000
        state.matches.unshift({ id: randomHex(), createdAt: now, startAt: now + BATTLE_MATCH_START_DELAY, winnerTicketId: players[roll < 0.5 ? 0 : 1].ticketId, players })
        return matchmakingResult(state, deviceId, ticketId, now)
      })
      if (accepted.error) return json({ error: accepted.error }, accepted.status)
      return json(accepted)
    }

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
        state.matches.unshift({ id: randomHex(), createdAt: now, startAt: now + BATTLE_MATCH_START_DELAY, winnerTicketId: players[roll < 0.5 ? 0 : 1].ticketId, players })
      }
      return matchmakingResult(state, deviceId, ticketId, now)
    }))
  }

  async royale(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 16_384)
    } catch {
      return json({ error: 'Некоректний запит банку.' }, 400)
    }
    const action = cleanText(body?.action, 24)
    const deviceId = cleanText(body?.deviceId, 64)
    const ticketId = cleanText(body?.ticketId, 64)
    if (!ID.test(deviceId) || !ID.test(ticketId)) return json({ error: 'Некоректний квиток Royale.' }, 400)

    if (action === 'status') {
      return json(await this.updateMatchState((state, now) => {
        // A receipt wins over the active lobby only for its participant. This
        // prevents a freshly opened bank from hiding the previous bank's draw.
        const receipt = royaleReceiptForTicket(state, ticketId)
        return {
          ...publicRoyaleRound(receipt || state.royale, deviceId, ticketId, now),
          isSettlementReceipt: Boolean(receipt),
        }
      }))
    }

    if (action === 'leave') {
      return json(await this.updateMatchState((state, now) => {
        const receipt = royaleReceiptForTicket(state, ticketId)
        if (receipt) return { ...publicRoyaleRound(receipt, deviceId, ticketId, now), isSettlementReceipt: true }
        const round = state.royale
        if (!round) return { status: 'idle', canJoin: true, maxPlayers: ROYALE_LIVE_MAX_PLAYERS }
        if (round.status !== 'open') return publicRoyaleRound(round, deviceId, ticketId, now)
        round.participants = round.participants.filter(player => !(player.deviceId === deviceId && player.ticketId === ticketId))
        state.royale = round.participants.length ? round : null
        return { status: 'left', canJoin: true, maxPlayers: ROYALE_LIVE_MAX_PLAYERS }
      }))
    }

    if (action !== 'join') return json({ error: 'Невідома дія Open Bank.' }, 400)
    const stakes = parseRoyaleStakes(Array.isArray(body?.stakes) ? body.stakes : [body?.stake])
    const name = cleanText(body?.name, 24) || 'Гравець'
    const profileId = cleanText(body?.profileId, 64)
    if (!stakes) return json({ error: `Обери від 1 до ${ROYALE_LIVE_MAX_STAKES} коректних віртуальних скінів для банку.` }, 400)
    if (profileId && !ID.test(profileId)) return json({ error: 'Некоректний профіль гравця.' }, 400)

    const joined = await this.updateMatchState((state, now) => {
      // A completed bank stays visible to its participants for a short time.
      // A new join starts the next round without requiring manual cleanup.
      if (!state.royale || state.royale.status === 'settled') {
        state.royale = { id: randomHex(12), createdAt: now, status: 'open', startAt: 0, winnerTicketId: '', participants: [] }
      }
      const round = state.royale
      const existing = round.participants.find(player => player.deviceId === deviceId)
      if (existing) {
        if (existing.ticketId !== ticketId) return { error: 'Ти вже маєш активний внесок у цьому банку.', status: 409 }
        return publicRoyaleRound(round, deviceId, ticketId, now)
      }
      if (round.status !== 'open') return { error: 'Банк уже синхронізує запуск. Дочекайся наступного раунду.', status: 409 }
      if (round.participants.length >= ROYALE_LIVE_MAX_PLAYERS) return { error: 'Банк уже заповнений. Скоро відкриється новий.', status: 409 }
      round.participants.push({ deviceId, ticketId, name, profileId: ID.test(profileId) ? profileId : '', stakes, total: stakes.reduce((sum, stake) => sum + stake.price, 0), joinedAt: now })
      if (round.participants.length >= 2) {
        round.status = 'countdown'
        round.startAt = now + ROYALE_LIVE_START_DELAY
        round.winnerTicketId = pickRoyaleWinner(round.participants)
      }
      return publicRoyaleRound(round, deviceId, ticketId, now)
    })
    if (joined?.error) return json({ error: joined.error }, joined.status || 400)
    return json(joined)
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
    // Guests can use all single-player mechanics, but the public community is
    // reserved for a Steam identity authenticated for this very heartbeat.
    // A client-side cloud/profile ID is never sufficient proof of identity.
    const sessionSteamId = await this.authenticatedSteamIdForCommunity(request)
    const claimedSteamId = /^\d{17}$/.test(player.cloudProfileId) ? player.cloudProfileId : ''
    if (sessionSteamId && sessionSteamId === claimedSteamId) {
      player.cloudProfileId = sessionSteamId
      player.steamVerifiedAt = now
      // Never accept an avatar URL from the browser. Resolve it for the
      // authenticated Steam identity here, then expose only a short-lived
      // community image route in the public feed response.
      try {
        const steamProfile = await this.resolveSteamProfile(sessionSteamId)
        player.avatar = cleanAvatar(steamProfile?.avatar)
      } catch {
        player.avatar = ''
      }
      const profile = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`steam-account:${sessionSteamId}`))
      try {
        const visibilityResponse = await profile.fetch(new Request('https://internal/__internal/profile-visibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: sessionSteamId, accountType: 'steam' }) }))
        const visibility = await visibilityResponse.json()
        player.hidden = visibility?.hidden === true
      } catch {
        // The public sync must continue when a profile shard is momentarily unavailable.
      }
    } else {
      player.cloudProfileId = ''
      player.steamVerifiedAt = 0
      player.avatar = ''
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
      // Normalisation cleans old duplicate heartbeats when the state is read.
      // Do the same after writing this heartbeat so a player switching between
      // Android and the website is never rendered twice in this response.
      if (player.cloudProfileId || player.profileId) {
        for (const [id, entry] of Object.entries(state.players)) {
          const sameAccount = player.cloudProfileId && entry?.cloudProfileId === player.cloudProfileId
          const samePublicProfile = player.profileId && entry?.profileId === player.profileId
          if (id !== visitorHash && (sameAccount || samePublicProfile)) delete state.players[id]
        }
      }
      if (event) state.events = [event, ...state.events.filter(entry => entry.id !== event.id)].slice(0, COMMUNITY_MAX_EVENTS)
      if (circuitPulse && player.hidden !== true && isVerifiedSteamCommunityPlayer(player)) applyCommunityCircuitPulse(state.circuit, visitorHash, player, circuitPulse, now)
      if (riftPulse && player.hidden !== true && isVerifiedSteamCommunityPlayer(player)) applyCommunityRiftPulse(state.rift, visitorHash, player, riftPulse, now)
      await transaction.put('community:season', state)
      return communityResponse(state, visitorHash)
    })
    return json(result)
  }

  async communityAvatar(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const playerId = new URL(request.url).searchParams.get('player') || ''
    if (!/^[a-f0-9]{64}$/i.test(playerId)) return json({ error: 'Некоректний гравець.' }, 400)
    const now = Date.now()
    const state = normalizeCommunityState(await this.storage.get('community:season'), now)
    const player = state.players?.[playerId]
    const avatar = isVerifiedSteamCommunityPlayer(player) && player?.hidden !== true
      ? cleanAvatar(player.avatar)
      : ''
    if (!avatar) return json({ error: 'Аватар не знайдено.' }, 404)
    try {
      const response = await timedFetch(avatar, { headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } })
      const contentType = response.headers.get('Content-Type') || ''
      if (!response.ok || !/^image\//i.test(contentType) || !response.body) throw new Error('Invalid community avatar response')
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

  async authenticatedSteamIdForCommunity(request) {
    const mobileToken = mobileSessionToken(request)
    let sessionState = null
    let body = {}
    if (mobileToken) {
      sessionState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`mobile:${mobileToken}`))
    } else {
      const parsed = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
      if (!parsed) return ''
      if (parsed.sharded) {
        sessionState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`steam:${parsed.token}`))
      } else {
        // Compatibility with a pre-v2 cookie: those sessions were stored in
        // the global shard under a token-derived key.
        sessionState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName('global'))
        body = { legacyToken: parsed.token }
      }
    }
    try {
      const response = await sessionState.fetch(new Request('https://internal/__internal/session-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }))
      const data = await response.json().catch(() => ({}))
      return response.ok && /^\d{17}$/.test(String(data?.steamId || '')) ? String(data.steamId) : ''
    } catch {
      // The leaderboard must fail closed when the Steam-session shard is not
      // available, otherwise an unverified ID could appear as a real player.
      return ''
    }
  }

  async steamAuth(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const url = new URL(request.url)
    const origin = url.origin
    const claimedId = url.searchParams.get('openid.claimed_id')
    if (!claimedId) {
      const state = randomHex(32)
      const requestedMobile = url.searchParams.get('client') === 'android'
      const mobile = isMobileSteamRequest(url)
      const continuePath = !mobile && url.searchParams.get('continue') === '/account-delete.html'
        ? '/account-delete.html'
        : ''
      if (requestedMobile && !mobile) return json({ error: 'Некоректний мобільний запит входу.' }, 400)
      const callback = new URL(`${origin}/api/steam/auth`)
      callback.searchParams.set('state', state)
      await this.storage.put(`steam-auth:${state}`, {
        origin,
        mobile,
        continuePath,
        mobileChallenge: mobile ? mobileChallengeFromUrl(url) : '',
        expiresAt: Date.now() + STEAM_AUTH_TTL,
      })
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
      const destination = pending.mobile === true
        ? mobileAuthRedirect({ error: 'verification' })
        : `${origin}/?steam_error=verification`
      const headers = new Headers({ Location: destination, 'Cache-Control': 'no-store' })
      headers.append('Set-Cookie', clearAuth)
      return new Response(null, { status: 302, headers })
    }
    const createdAt = Date.now()
    const headers = new Headers({ 'Cache-Control': 'no-store' })
    if (pending.mobile === true) {
      // A ticket contains no account data and may be exchanged exactly once by
      // the app registered for our fixed custom URI. Never accept an arbitrary
      // redirect URI from a request parameter.
      const ticket = randomHex(32)
      await this.storage.put(`mobile-ticket:${ticket}`, {
        steamId,
        challenge: pending.mobileChallenge,
        createdAt,
        expiresAt: createdAt + MOBILE_AUTH_TICKET_TTL,
      })
      headers.set('Location', mobileAuthRedirect({ ticket }))
    } else {
      const sessionToken = randomHex(32)
      const maxAge = Math.floor(STEAM_SESSION_TTL / 1000)
      const sessionState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`steam:${sessionToken}`))
      const sessionResponse = await sessionState.fetch(new Request('https://internal/__internal/steam-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId, createdAt, expiresAt: createdAt + STEAM_SESSION_TTL }),
      }))
      if (!sessionResponse.ok) {
        headers.set('Location', `${origin}/?steam_error=session`)
        headers.append('Set-Cookie', clearAuth)
        return new Response(null, { status: 302, headers })
      }
      const destination = pending.continuePath === '/account-delete.html'
        ? `${origin}${pending.continuePath}?steam_connected=1`
        : `${origin}/?steam_connected=1`
      headers.set('Location', destination)
      headers.append('Set-Cookie', sessionCookie(STEAM_SESSION_COOKIE, `${STEAM_SESSION_VERSION}_${sessionToken}`, maxAge, url.protocol === 'https:'))
    }
    headers.append('Set-Cookie', clearAuth)
    return new Response(null, { status: 302, headers })
  }

  async isSteamSessionValid(session) {
    const steamId = String(session?.steamId || '')
    const createdAt = Number(session?.createdAt || 0)
    if (!/^\d{17}$/.test(steamId) || !Number.isFinite(createdAt) || createdAt <= 0) return false
    try {
      const accountState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`steam-account:${steamId}`))
      const response = await accountState.fetch(new Request('https://internal/__internal/steam-session-valid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId, createdAt }),
      }))
      const data = await response.json().catch(() => ({}))
      return response.ok && data?.valid === true
    } catch {
      // Failing closed ensures a just-deleted account cannot be revived by a
      // session whose validation status is temporarily unknown.
      return false
    }
  }

  async getSteamSession(request) {
    const mobileToken = mobileSessionToken(request)
    if (mobileToken) {
      const session = await this.storage.get('mobile-session')
      if (/^\d{17}$/.test(String(session?.steamId || '')) && Number(session.expiresAt || 0) > Date.now() && await this.isSteamSessionValid(session)) return session
      await this.storage.delete('mobile-session')
      return null
    }
    const parsed = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
    if (parsed) {
      const session = await this.storage.get(parsed.sharded ? 'steam-session' : `steam-session:${parsed.token}`)
      if (/^\d{17}$/.test(String(session?.steamId || '')) && Number(session.expiresAt || 0) > Date.now() && await this.isSteamSessionValid(session)) return session
      if (session) await this.storage.delete(parsed.sharded ? 'steam-session' : `steam-session:${parsed.token}`)
    }
    return null
  }

  async mobileSession(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 4_096)
    } catch {
      return json({ error: 'Некоректний мобільний вхід.' }, 400)
    }
    const ticket = cleanText(body?.ticket, 128).toLowerCase()
    const verifier = cleanText(body?.verifier, 128).toLowerCase()
    if (!/^[a-f0-9]{64}$/.test(ticket) || !/^[a-f0-9]{64}$/.test(verifier)) return json({ error: 'Некоректне або застаріле посилання входу.' }, 400)
    const consumed = await this.storage.transaction(async transaction => {
      const entry = await transaction.get(`mobile-ticket:${ticket}`)
      // Deleting before returning makes the ticket single-use even if the
      // mobile client retries because its network disappeared mid-response.
      await transaction.delete(`mobile-ticket:${ticket}`)
      const verifierHash = await sha256(verifier)
      if (!/^\d{17}$/.test(String(entry?.steamId || '')) || Number(entry?.expiresAt || 0) <= Date.now() || !equalHash(verifierHash, String(entry?.challenge || ''))) return null
      return { steamId: String(entry.steamId) }
    })
    if (!consumed) return json({ error: 'Посилання входу вже використане або завершилося.' }, 401)

    const token = randomHex(32)
    const createdAt = Date.now()
    const expiresAt = createdAt + MOBILE_SESSION_TTL
    const sessionState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`mobile:${token}`))
    const stored = await sessionState.fetch(new Request('https://internal/__internal/mobile-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamId: consumed.steamId, createdAt, expiresAt }),
    }))
    if (!stored.ok) return json({ error: 'Не вдалося завершити мобільний вхід. Повтори через Steam.' }, 503)
    return json({
      accessToken: `${MOBILE_SESSION_VERSION}_${token}`,
      expiresAt,
      profile: await this.resolveSteamProfile(consumed.steamId),
    })
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
    const requestedSteamId = new URL(request.url).searchParams.get('steamId') || ''
    const session = await this.getSteamSession(request)
    // Steam avatar URLs are public.  An image request from an Android WebView
    // cannot include the bearer token that protects the rest of the API, so a
    // validated SteamID is also allowed here as a narrowly scoped fallback.
    // The resolver still fetches only fixed Steam Community endpoints and
    // `cleanAvatar` allow-lists the final CDN host.
    const steamId = /^\d{17}$/.test(String(session?.steamId || ''))
      ? String(session.steamId)
      : /^\d{17}$/.test(requestedSteamId) ? requestedSteamId : ''
    if (!steamId) return json({ error: 'Потрібен підтверджений Steam-профіль.' }, 401)
    const profile = await this.resolveSteamProfile(steamId)
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

  async steamAccount(request) {
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const session = await this.getSteamSession(request)
    if (!session) return json({ error: 'Сесія Steam завершилась. Увійди через Steam ще раз.' }, 401)

    let body = { action: 'load' }
    if (request.method === 'POST') {
      try {
        body = await this.readBody(request)
      } catch (error) {
        return json({ error: error instanceof RangeError ? error.message : 'Некоректний запит.' }, error instanceof RangeError ? 413 : 400)
      }
    }
    const action = String(body?.action || '')
    if (!['load', 'create', 'save', 'set-visibility', 'activate-referral', 'delete'].includes(action)) return json({ error: 'Невідома дія Steam-акаунта.' }, 400)

    const accountState = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(`steam-account:${session.steamId}`))
    const response = await accountState.fetch(new Request('https://internal/__internal/steam-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, action, steamId: session.steamId }),
    }))
    const data = await response.json().catch(() => ({ error: 'Steam-акаунт повернув некоректну відповідь.' }))
    if (action === 'delete' && response.ok) {
      const headers = new Headers(JSON_HEADERS)
      const mobileToken = mobileSessionToken(request)
      if (mobileToken) {
        await this.storage.delete('mobile-session')
      } else {
        const parsed = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
        if (parsed) await this.storage.delete(parsed.sharded ? 'steam-session' : `steam-session:${parsed.token}`)
        headers.append('Set-Cookie', sessionCookie(STEAM_SESSION_COOKIE, '', 0, new URL(request.url).protocol === 'https:'))
        headers.append('Set-Cookie', sessionCookie(STEAM_AUTH_COOKIE, '', 0, new URL(request.url).protocol === 'https:'))
      }
      await this.storage.delete(`steam-profile:${session.steamId}`)
      return new Response(JSON.stringify(data), { status: response.status, headers })
    }
    return json(data, response.status)
  }

  async steamLogout(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const url = new URL(request.url)
    const requestOrigin = request.headers.get('Origin')
    if (requestOrigin && requestOrigin !== url.origin && !isMobileAppOrigin(requestOrigin)) return json({ error: 'Некоректне походження запиту.' }, 403)
    const mobileToken = mobileSessionToken(request)
    if (mobileToken) {
      await this.storage.delete('mobile-session')
      return json({ connected: false })
    }
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

  async readSkinCatalog() {
    const cacheKey = 'catalog:skins:v4-meta'
    const cached = await this.storage.get(cacheKey)
    const cachedItems = Array.isArray(cached?.items) ? cached.items : []
    const cacheAge = Date.now() - Number(cached?.updatedAt || 0)
    if (cachedItems.length >= 50 && cacheAge >= 0 && cacheAge < CATALOG_TTL) {
      return { items: cachedItems, total: Number(cached?.total) || cachedItems.length, stale: false }
    }

    for (const source of CATALOG_SOURCES) {
      try {
        const response = await timedFetch(source, { headers: { Accept: 'application/json' } })
        if (!response.ok) continue
        const catalog = await response.json()
        if (!Array.isArray(catalog) || catalog.length === 0) continue
        const safeCatalog = catalog.map((skin, index) => {
          const wears = Array.isArray(skin?.wears)
            ? [...new Set(skin.wears.map(wear => cleanText(wear?.name || wear, 32)).filter(Boolean))].slice(0, 5)
            : []
          return {
            id: cleanText(skin?.id || `cs2-${index}`, 128),
            name: cleanText(skin?.name, 160),
            weapon: { name: cleanText(skin?.weapon?.name, 64) },
            category: { name: cleanText(skin?.category?.name, 64) },
            rarity: { name: cleanText(skin?.rarity?.name || 'Consumer Grade', 48), color: cleanColor(skin?.rarity?.color) },
            image: cleanImage(skin?.image),
            wears,
          }
        }).filter(skin => skin.name && skin.weapon.name && skin.category.name && skin.image)
        const gameCatalog = selectGameCatalog(safeCatalog)
        if (gameCatalog.length >= 50) {
          const updatedAt = Date.now()
          const chunks = []
          for (let index = 0; index < safeCatalog.length; index += CATALOG_STORAGE_CHUNK) {
            chunks.push(safeCatalog.slice(index, index + CATALOG_STORAGE_CHUNK))
          }
          // Store data pages first and publish their metadata last. A reader
          // can therefore never observe a fresh page count with missing rows.
          await Promise.all(chunks.map((items, index) => this.storage.put(`catalog:skins:v4-page:${index}`, items)))
          const result = {
            items: gameCatalog,
            total: safeCatalog.length,
            pageSize: CATALOG_STORAGE_CHUNK,
            updatedAt,
          }
          await this.storage.put(cacheKey, result)
          return { items: result.items, total: result.total, stale: false }
        }
      } catch {
        // Try the next public mirror. The last known catalog is still useful
        // when an upstream mirror is temporarily unavailable.
      }
    }
    if (cachedItems.length >= 50 && cacheAge >= 0 && cacheAge < CATALOG_STALE_TTL) {
      return { items: cachedItems, total: Number(cached?.total) || cachedItems.length, stale: true }
    }
    return null
  }

  async readSkinCatalogPage(offset, limit) {
    const catalog = await this.readSkinCatalog()
    if (!catalog) return null
    const total = Math.max(0, Number(catalog.total) || 0)
    const safeOffset = Math.max(0, Math.min(total, Number(offset) || 0))
    const safeLimit = Math.max(24, Math.min(100, Number(limit) || 72))
    if (safeOffset >= total) return { items: [], total, offset: safeOffset, nextOffset: null, stale: catalog.stale }

    const pageSize = CATALOG_STORAGE_CHUNK
    const firstPage = Math.floor(safeOffset / pageSize)
    const lastPage = Math.floor(Math.min(total - 1, safeOffset + safeLimit - 1) / pageSize)
    const pages = await Promise.all(Array.from({ length: lastPage - firstPage + 1 }, (_, index) => (
      this.storage.get(`catalog:skins:v4-page:${firstPage + index}`)
    )))
    if (pages.some(page => !Array.isArray(page))) return null
    const flattened = pages.flat()
    const localOffset = safeOffset - firstPage * pageSize
    const items = flattened.slice(localOffset, localOffset + safeLimit)
    const nextOffset = safeOffset + items.length < total ? safeOffset + items.length : null
    return { items, total, offset: safeOffset, nextOffset, stale: catalog.stale }
  }

  async skinCatalog(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const url = new URL(request.url)
    if (url.searchParams.get('scope') === 'all') {
      const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10)
      const limit = Number.parseInt(url.searchParams.get('limit') || '72', 10)
      if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(limit) || limit < 1) {
        return json({ error: 'Некоректна сторінка каталогу.' }, 400)
      }
      const page = await this.readSkinCatalogPage(offset, limit)
      if (!page) return json({ error: 'Повний каталог скінів тимчасово недоступний.' }, 502)
      return json(page, 200, page.stale
        ? { 'Cache-Control': 'public, max-age=300, s-maxage=300', 'Warning': '110 - "Каталог показано з локального кешу"' }
        : { 'Cache-Control': 'public, max-age=300, s-maxage=3600' })
    }
    const catalog = await this.readSkinCatalog()
    if (!catalog) return json({ error: 'Каталог скінів тимчасово недоступний.' }, 502)
    return json(catalog.items, 200, catalog.stale
      ? { 'Cache-Control': 'public, max-age=300, s-maxage=300', 'Warning': '110 - "Каталог показано з локального кешу"' }
      : { 'Cache-Control': 'public, max-age=3600, s-maxage=21600' })
  }

  async marketPrices(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let body
    try {
      body = await this.readBody(request, 16_384)
    } catch {
      return json({ error: 'Некоректний запит цін.' }, 400)
    }
    const requested = Array.isArray(body?.items) ? body.items.slice(0, CATALOG_PRICE_BATCH_LIMIT) : []
    if (!requested.length) return json({ error: 'Вкажи до 8 скінів із каталогу.' }, 400)
    const catalog = await this.readSkinCatalog()
    if (!catalog) return json({ error: 'Каталог скінів тимчасово недоступний.' }, 502)
    const skinsById = new Map(catalog.items.map(skin => [skin.id, skin]))
    const unique = []
    const seen = new Set()
    for (const value of requested) {
      const id = cleanText(value?.id, 128)
      const wear = cleanText(value?.wear, 2).toUpperCase() || 'FT'
      const key = `${id}:${wear}`
      if (id && skinsById.has(id) && !seen.has(key)) {
        seen.add(key)
        unique.push({ skin: skinsById.get(id), wear })
      }
    }
    if (!unique.length) return json({ error: 'Не знайдено дозволених скінів у каталозі.' }, 400)
    // This endpoint deliberately returns the internal catalogue index. It is
    // retained for older web and Android bundles, but it never calls Steam or
    // a price feed: availability of an outside marketplace must not alter a
    // virtual round, inventory value or a player's payout.
    const quotes = unique.map(entry => stableCatalogQuote(entry.skin, entry.wear))
    return json({
      source: STABLE_ECONOMY_SOURCE,
      pricingVersion: STABLE_ECONOMY_VERSION,
      currency: 'PC',
      catalogStale: catalog.stale === true,
      quotes,
    }, 200, { 'Cache-Control': 'private, no-store' })
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
    const accountType = gameAccountType(accountId)
    const name = accountType === 'steam' ? `steam-account:${accountId}` : `profile:${accountId}`
    const profile = this.env.POTUZHNO_STATE.get(this.env.POTUZHNO_STATE.idFromName(name))
    const response = await profile.fetch(new Request('https://internal/__internal/admin-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, accountType, ...payload }),
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
    let response
    try {
      response = await global.fetch(new Request('https://internal/__internal/admin-player-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', query }),
      }))
    } catch {
      return { ok: false, status: 503, data: { error: 'Каталог гравців тимчасово недоступний.' } }
    }
    let data = null
    try { data = await response.json() } catch {}
    if (!response.ok) return { ok: false, status: response.status, data: data || {} }
    const players = (Array.isArray(data?.players) ? data.players : [])
      .map(normalizeAdminPlayerDirectoryEntry)
      .filter(player => player?.accountId)
    return { ok: true, status: 200, data: { total: players.length, players: players.slice(0, ADMIN_PLAYER_DIRECTORY_PAGE_SIZE) } }
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
    if (!isGameAccountId(accountId)) return json({ error: 'Вкажи правильний Steam ID або Cloud Profile ID.' }, 400)
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
    if (!isGameAccountId(accountId) || !canRunAdminGameOperation(actor, operation)) {
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
  } else if (path === '/api/rewards') {
    // Cloud profiles authenticate with their recovery code and can be routed
    // straight to their account object. Steam and Android sessions must stay
    // on their short-lived, authenticated session object.
    const body = await requestBodyForRouting(request)
    if (ID.test(String(body?.accountId || ''))) name = `profile:${body.accountId}`
    else {
      const mobileToken = mobileSessionToken(request)
      if (mobileToken) name = `mobile:${mobileToken}`
      else {
        const session = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
        if (session?.sharded) name = `steam:${session.token}`
      }
    }
  } else if ((path === '/api/public-profile' && request.method === 'GET') || path === '/api/public-avatar') {
    const id = url.searchParams.get('id') || ''
    if (ID.test(id)) name = `public:${id}`
  } else if (path === '/api/public-profile' && request.method === 'POST') {
    const body = await requestBodyForRouting(request)
    if (ID.test(String(body?.id || ''))) name = `public:${body.id}`
  } else if (path.startsWith('/api/steam/') && path !== '/api/steam/auth') {
    const mobileToken = mobileSessionToken(request)
    if (mobileToken) name = `mobile:${mobileToken}`
    else {
      const session = steamSessionToken(readCookie(request, STEAM_SESSION_COOKIE))
      if (session?.sharded) name = `steam:${session.token}`
    }
  } else if (path === '/api/mobile/session') {
    name = 'global'
  } else if (path === '/api/catalog/skins' || path === '/api/catalog/market-prices') {
    name = 'catalog'
  } else if (path === '/api/presence') {
    name = 'presence'
  } else if (path === '/api/community' || path === '/api/community-avatar') {
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
    const origin = request.headers.get('Origin') || ''
    const nativeRequest = isMobileAppOrigin(origin)
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
    if (path === '/api/skin-image') return mobileCorsResponse(request, await skinImage(request, env))
    if (path.startsWith('/api/')) {
      if (request.method === 'OPTIONS' && nativeRequest) {
        return mobileCorsResponse(request, new Response(null, { status: 204 }))
      }
      if (path === '/api/mobile/session' && !nativeRequest) {
        return json({ error: 'Цей маршрут доступний лише офіційному мобільному клієнту.' }, 403)
      }
      // Staff authentication never leaves the protected website. A native app
      // can play with a user session but cannot become an admin client.
      if (nativeRequest && path.startsWith('/api/admin/')) {
        return mobileCorsResponse(request, json({ error: 'Адмін-панель доступна лише у захищеній веб-версії.' }, 403))
      }
      if (request.method === 'POST') {
        if (origin && origin !== url.origin && !nativeRequest) return json({ error: 'Некоректне походження запиту.' }, 403)
      }
      const limited = await rateLimitResponse(request, env, path)
      if (limited) return mobileCorsResponse(request, limited)
      if (path.startsWith('/api/admin/')) return mobileCorsResponse(request, await adminResponse(request, env))
      return mobileCorsResponse(request, await (await stateForRequest(request, env, path)).fetch(request))
    }
    return env.ASSETS.fetch(request)
  },
}
