import type { Config } from '@netlify/functions'

export default async (request: Request) => {
  const steamId = new URL(request.url).searchParams.get('steamid') || ''
  if (!/^\d{17}$/.test(steamId)) return Response.json({ error: 'Некоректний Steam ID' }, { status: 400 })

  const response = await fetch(`https://steamcommunity.com/inventory/${steamId}/730/2?l=ukrainian&count=2000`, {
    headers: { 'User-Agent': 'PotuzhnoDrop/1.0' },
  })
  if (!response.ok) {
    const message = response.status === 403 ? 'Інвентар Steam закритий. Зроби його публічним у налаштуваннях приватності.' : 'Steam тимчасово не віддає інвентар.'
    return Response.json({ error: message }, { status: response.status === 403 ? 403 : 502 })
  }
  const data = await response.json()
  const descriptions = new Map((data.descriptions || []).map((item: any) => [`${item.classid}_${item.instanceid}`, item]))
  const items = (data.assets || []).map((asset: any) => {
    const item: any = descriptions.get(`${asset.classid}_${asset.instanceid}`)
    if (!item || !item.tradable) return null
    return {
      id: asset.assetid,
      name: item.market_hash_name || item.name,
      rarity: item.tags?.find((tag: any) => tag.category === 'Rarity')?.localized_tag_name || 'CS2',
      img: `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}/360fx360f`,
    }
  }).filter(Boolean)
  return Response.json({ items })
}

export const config: Config = { path: '/api/steam/inventory', method: 'GET' }
