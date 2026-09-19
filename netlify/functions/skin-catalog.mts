import type { Config } from '@netlify/functions'

const SOURCES = [
  'https://cdn.jsdelivr.net/gh/ByMykel/CSGO-API@main/public/api/en/skins.json',
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
]

export default async () => {
  for (const source of SOURCES) {
    try {
      const response = await fetch(source, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) continue

      const catalog = await response.json()
      if (!Array.isArray(catalog) || catalog.length === 0) continue

      return new Response(JSON.stringify(catalog), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      })
    } catch {
      // Try the next public mirror.
    }
  }

  return Response.json(
    { error: 'Каталог скінів тимчасово недоступний.' },
    { status: 502 },
  )
}

export const config: Config = { path: '/api/catalog/skins', method: 'GET' }
