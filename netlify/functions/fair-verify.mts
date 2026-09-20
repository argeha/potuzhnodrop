import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const seeds = getStore('potuzhno-fair-seeds', { consistency: 'strong' })
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

export default async (request: Request) => {
  const day = new URL(request.url).searchParams.get('day') || ''
  const today = new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return response({ error: 'Вкажи дату у форматі YYYY-MM-DD.' }, 400)
  if (day >= today) return response({ error: 'Поточний seed буде розкрито наступного дня.' }, 423)
  const entry = await seeds.get(`seed:${day}`, { type: 'json' }) as { seed?: string, hash?: string } | null
  if (!entry?.seed || !entry.hash) return response({ error: 'Для цієї дати ще немає раундів.' }, 404)
  return response({ day, serverSeed: entry.seed, serverSeedHash: entry.hash })
}

export const config: Config = { path: '/api/fair/verify', method: 'GET' }
