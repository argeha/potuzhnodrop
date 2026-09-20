import type { Config } from '@netlify/functions'

const SOURCES = [
  'https://cdn.jsdelivr.net/gh/ByMykel/CSGO-API@main/public/api/en/skins.json',
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
]
const IMAGE_HOSTS = new Set([
  'community.cloudflare.steamstatic.com',
  'community.akamai.steamstatic.com',
  'steamcdn-a.akamaihd.net',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
])

const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLength)

const cleanImage = (value: unknown) => {
  try {
    const url = new URL(cleanText(value, 2048))
    return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

const cleanColor = (value: unknown) => {
  const color = cleanText(value, 32)
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#b0c3d9'
}

export default async () => {
  for (const source of SOURCES) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch(source, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) continue

      const catalog = await response.json()
      if (!Array.isArray(catalog) || catalog.length === 0) continue

      // The client renders this data. Return a small, validated schema rather
      // than relaying arbitrary fields from a mutable public repository.
      const safeCatalog = catalog.slice(0, 5_000).map((skin: any, index: number) => ({
        id: cleanText(skin?.id || `cs2-${index}`, 128),
        name: cleanText(skin?.name, 160),
        weapon: { name: cleanText(skin?.weapon?.name, 64) },
        category: { name: cleanText(skin?.category?.name, 64) },
        rarity: {
          name: cleanText(skin?.rarity?.name || 'Consumer Grade', 48),
          color: cleanColor(skin?.rarity?.color),
        },
        image: cleanImage(skin?.image),
      })).filter((skin: any) => skin.name && skin.weapon.name && skin.category.name && skin.image)
      if (safeCatalog.length < 50) continue

      return new Response(JSON.stringify(safeCatalog), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      })
    } catch {
      // Try the next public mirror.
    } finally {
      clearTimeout(timeout)
    }
  }

  return Response.json(
    { error: 'Каталог скінів тимчасово недоступний.' },
    { status: 502 },
  )
}

export const config: Config = { path: '/api/catalog/skins', method: 'GET' }
