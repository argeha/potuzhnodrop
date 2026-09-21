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
const MAX_PAYLOAD_BYTES = 750_000
const MAX_PRICE = 1_000_000
const WAIT_TTL = 10_000
const MATCH_TTL = 10 * 60_000
const STEAM_PROFILE_TTL = 6 * 60 * 60_000
const STEAM_SESSION_TTL = 30 * 24 * 60 * 60_000
const STEAM_SESSION_COOKIE = 'potuzhno_steam_session'
const STEAM_AUTH_TTL = 10 * 60_000
const STEAM_AUTH_COOKIE = 'potuzhno_steam_auth'
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
    return encoder.encode(JSON.stringify(value)).byteLength <= MAX_PAYLOAD_BYTES
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

function cleanAvatar(value) {
  try {
    const url = new URL(cleanText(value, 2048))
    return url.protocol === 'https:' && AVATAR_HOSTS.has(url.hostname) ? url.href : ''
  } catch {
    return ''
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

function cleanMatchState(state, now) {
  state.queue = state.queue.filter(entry => entry && ID.test(String(entry.deviceId || '')) && ID.test(String(entry.ticketId || '')) && now - Number(entry.joinedAt || 0) < WAIT_TTL)
  state.matches = state.matches.filter(match => match && now - Number(match.createdAt || 0) < MATCH_TTL).slice(0, 40)
}

function publicMatch(match) {
  return {
    id: match.id,
    createdAt: match.createdAt,
    winnerTicketId: match.winnerTicketId,
    players: match.players.map(player => ({ ticketId: player.ticketId, name: player.name, stake: player.stake })),
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
  constructor(state) {
    this.storage = state.storage
  }

  async fetch(request) {
    const path = new URL(request.url).pathname
    try {
      if (path === '/api/profile/sync') return await this.profile(request)
      if (path === '/api/fair/roll') return await this.fairRoll(request)
      if (path === '/api/fair/verify') return await this.fairVerify(request)
      if (path === '/api/matchmaking') return await this.matchmaking(request)
      if (path === '/api/steam/auth') return await this.steamAuth(request)
      if (path === '/api/steam/session') return await this.steamSession(request)
      if (path === '/api/steam/logout') return await this.steamLogout(request)
      if (path === '/api/steam/profile') return await this.steamProfile(request)
      if (path === '/api/steam/inventory') return await this.steamInventory(request)
      if (path === '/api/catalog/skins') return await this.skinCatalog(request)
      return json({ error: 'Маршрут API не знайдено.' }, 404)
    } catch (error) {
      console.error('API error', path, error)
      return json({ error: 'Сервіс тимчасово недоступний. Повтори спробу.' }, 503)
    }
  }

  async readBody(request, limit = MAX_PAYLOAD_BYTES + 4_096) {
    const raw = await request.text()
    if (encoder.encode(raw).byteLength > limit) throw new RangeError('Збереження завелике.')
    return JSON.parse(raw)
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
    if (action === 'create') {
      if (!isPayload(body.payload)) return json({ error: 'Некоректне збереження.' }, 400)
      const result = await this.storage.transaction(async transaction => {
        if (await transaction.get(key)) return null
        const data = { version: 1, recoveryHash, payload: body.payload, updatedAt: Date.now() }
        await transaction.put(key, data)
        return data
      })
      return result ? json({ updatedAt: result.updatedAt }) : json({ error: 'Профіль уже існує.' }, 409)
    }

    const entry = await this.storage.get(key)
    if (!entry || !equalHash(entry.recoveryHash, recoveryHash)) return json({ error: 'Профіль не знайдено або код відновлення неправильний.' }, 403)
    if (action === 'load') return json({ payload: entry.payload, updatedAt: entry.updatedAt })
    if (action !== 'save' || !isPayload(body.payload)) return json({ error: 'Некоректне збереження.' }, 400)

    const updatedAt = Date.now()
    await this.storage.put(key, { ...entry, payload: body.payload, updatedAt })
    return json({ updatedAt })
  }

  async dailySeed(day) {
    const key = `seed:${day}`
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
    return json(await this.updateMatchState((state, now) => {
      const existing = matchmakingResult(state, deviceId, ticketId, now)
      if (existing.status === 'matched') return existing
      state.queue = state.queue.filter(entry => entry.deviceId !== deviceId)
      state.queue.push({ deviceId, ticketId, name, stake, joinedAt: now })
      if (state.queue.length >= 2) {
        const players = state.queue.splice(0, 2)
        const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000
        state.matches.unshift({ id: randomHex(), createdAt: now, winnerTicketId: players[roll < 0.5 ? 0 : 1].ticketId, players })
      }
      return matchmakingResult(state, deviceId, ticketId, now)
    }))
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
    await this.storage.put(`steam-session:${sessionToken}`, { steamId, createdAt: Date.now(), expiresAt: Date.now() + STEAM_SESSION_TTL })
    const headers = new Headers({
      Location: `${origin}/?steam_connected=1`,
      'Cache-Control': 'no-store',
    })
    headers.append('Set-Cookie', sessionCookie(STEAM_SESSION_COOKIE, sessionToken, maxAge, url.protocol === 'https:'))
    headers.append('Set-Cookie', clearAuth)
    return new Response(null, { status: 302, headers })
  }

  async getSteamSession(request) {
    const token = readCookie(request, STEAM_SESSION_COOKIE)
    if (!/^[a-f0-9]{64}$/i.test(token)) return null
    const session = await this.storage.get(`steam-session:${token}`)
    if (!/^\d{17}$/.test(String(session?.steamId || ''))) return null
    if (Number(session.expiresAt || 0) > Date.now()) return session
    await this.storage.delete(`steam-session:${token}`)
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
    const token = readCookie(request, STEAM_SESSION_COOKIE)
    if (/^[a-f0-9]{64}$/i.test(token)) await this.storage.delete(`steam-session:${token}`)
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
        if (safeCatalog.length >= 50) return json(safeCatalog, 200, { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' })
      } catch {
        // Try the next public mirror.
      }
    }
    return json({ error: 'Каталог скінів тимчасово недоступний.' }, 502)
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname
    if (path.startsWith('/api/')) {
      const id = env.POTUZHNO_STATE.idFromName('global')
      return env.POTUZHNO_STATE.get(id).fetch(request)
    }
    return env.ASSETS.fetch(request)
  },
}
