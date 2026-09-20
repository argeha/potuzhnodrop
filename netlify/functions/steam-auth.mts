import type { Config } from '@netlify/functions'

const STEAM_OPENID = 'https://steamcommunity.com/openid/login'

export default async (request: Request) => {
  const url = new URL(request.url)
  const origin = url.origin
  const claimedId = url.searchParams.get('openid.claimed_id')

  if (!claimedId) {
    const callback = `${origin}/api/steam/auth`
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': callback,
      'openid.realm': origin,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    })
    return Response.redirect(`${STEAM_OPENID}?${params}`, 302)
  }

  const verify = new URLSearchParams(url.searchParams)
  verify.set('openid.mode', 'check_authentication')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  let valid = false
  try {
    const response = await fetch(STEAM_OPENID, { method: 'POST', body: verify, signal: controller.signal })
    valid = response.ok && (await response.text()).includes('is_valid:true')
  } catch {
    valid = false
  } finally {
    clearTimeout(timeout)
  }
  const steamId = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/)?.[1]
  if (!valid || !steamId) return Response.redirect(`${origin}/?steam_error=1`, 302)
  return Response.redirect(`${origin}/?steamid=${encodeURIComponent(steamId)}`, 302)
}

export const config: Config = { path: '/api/steam/auth', method: 'GET' }
