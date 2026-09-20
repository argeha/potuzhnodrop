import type { Config } from '@netlify/functions'

export default async (request: Request) => {
  const steamId = new URL(request.url).searchParams.get('steamid') || ''
  if (!/^\d{17}$/.test(steamId)) return Response.json({ error: 'Некоректний Steam ID' }, { status: 400 })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  let response: Response
  try {
    response = await fetch(`https://steamcommunity.com/inventory/${steamId}/730/2?l=ukrainian&count=500`, {
      headers: { 'User-Agent': 'PotuzhnoDrop/1.0' },
      signal: controller.signal,
    })
  } catch {
    return Response.json({ error: 'Steam тимчасово не віддає інвентар.' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) {
    const message = response.status === 403 ? 'Інвентар Steam закритий. Зроби його публічним у налаштуваннях приватності.' : 'Steam тимчасово не віддає інвентар.'
    return Response.json({ error: message }, { status: response.status === 403 ? 403 : 502 })
  }
  let data: any
  try {
    data = await response.json()
  } catch {
    return Response.json({ error: 'Steam повернув некоректну відповідь.' }, { status: 502 })
  }
  const descriptions = new Map((data.descriptions || []).map((item: any) => [`${item.classid}_${item.instanceid}`, item]))
  const items = (data.assets || []).slice(0, 500).map((asset: any) => {
    const item: any = descriptions.get(`${asset.classid}_${asset.instanceid}`)
    const icon = typeof item?.icon_url === 'string' && /^[A-Za-z0-9_\-/]+$/.test(item.icon_url) ? item.icon_url : ''
    if (!item || !item.tradable || !icon) return null
    return {
      id: asset.assetid,
      name: String(item.market_hash_name || item.name || 'CS2 Skin').slice(0, 160),
      rarity: String(item.tags?.find((tag: any) => tag.category === 'Rarity')?.localized_tag_name || 'CS2').slice(0, 48),
      img: `https://community.cloudflare.steamstatic.com/economy/image/${icon}/360fx360f`,
    }
  }).filter(Boolean)
  return Response.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export const config: Config = { path: '/api/steam/inventory', method: 'GET' }
