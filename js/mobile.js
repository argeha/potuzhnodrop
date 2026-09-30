/* Native Android bridge for Potuzhno Drop.
 *
 * It deliberately contains no game economy or identity logic. Game data is
 * still validated by the Cloudflare API. This script only makes the shared
 * web client feel like an Android game and redirects `/api/*` to the
 * configured Worker when the game is bundled in a Capacitor WebView.
 */
(() => {
  const capacitor = window.Capacitor
  const isNative = Boolean(capacitor?.isNativePlatform?.())
  const rawConfig = window.POTUZHNO_MOBILE_CONFIG || {}
  const apiOrigin = typeof rawConfig.apiOrigin === 'string'
    ? rawConfig.apiOrigin.replace(/\/$/, '')
    : ''
  const sessionStorageKey = 'potuzhno_mobile_access_v1'
  const authVerifierStorageKey = 'potuzhno_mobile_auth_verifier_v1'
  let accessToken = ''
  try {
    accessToken = String(localStorage.getItem(sessionStorageKey) || '')
  } catch {}

  const apiUrl = path => {
    const value = String(path || '')
    return /^\/api\//.test(value) && /^https:\/\//i.test(apiOrigin) ? `${apiOrigin}${value}` : value
  }
  const clearSession = () => {
    accessToken = ''
    try { localStorage.removeItem(sessionStorageKey) } catch {}
  }
  const isMobileAccessToken = value => /^m1_[a-f0-9]{64}$/i.test(String(value || ''))
  // The Steam token is the mobile identity, so disconnecting it clears only
  // the local app session; the server-side game account remains intact.
  const clearSteamSession = () => {
    if (!/^m1_[a-f0-9]{64}$/i.test(accessToken)) return
    clearSession()
  }
  const rememberAccessToken = token => {
    if (!isMobileAccessToken(token)) return false
    accessToken = String(token)
    try { localStorage.setItem(sessionStorageKey, accessToken) } catch {}
    return true
  }
  const randomHex = byteLength => {
    const bytes = new Uint8Array(byteLength)
    crypto.getRandomValues(bytes)
    return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
  }
  const sha256 = async value => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  }

  window.PotuzhnoMobile = {
    isNative,
    apiOrigin,
    isConfigured: !isNative || /^https:\/\//i.test(apiOrigin),
    platform: isNative ? capacitor.getPlatform?.() || 'android' : 'web',
    apiUrl,
    get accessToken() { return accessToken },
    clearSession,
    clearSteamSession,
  }

  if (!isNative) return

  document.documentElement.classList.add('native-android')
  document.addEventListener('DOMContentLoaded', () => {
    document.body?.classList.add('native-android')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#080A0F')
  }, { once: true })

  // The packaged client is served from https://localhost, while the game API
  // stays at the verified Worker origin. Only API requests are rewritten;
  // local CSS, scripts and visual assets remain inside the signed app bundle.
  if (/^https:\/\//i.test(apiOrigin)) {
    const nativeFetch = window.fetch.bind(window)
    const appPlugin = capacitor?.Plugins?.App
    const browserPlugin = capacitor?.Plugins?.Browser
    let mobileTicketInFlight = ''

    const resetSteamButton = () => {
      const button = document.getElementById('steamLoginContinueBtn')
      if (!button) return
      button.disabled = false
      button.innerHTML = '<i class="fa-brands fa-steam mr-2"></i>Увійти через Steam'
    }

    window.fetch = (input, init = {}) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      const isApiRequest = requestUrl.startsWith('/api/')
      const rewritten = isApiRequest ? apiUrl(requestUrl) : requestUrl
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined))
      if (isApiRequest && isMobileAccessToken(accessToken)) headers.set('Authorization', `Bearer ${accessToken}`)
      const nextInit = isApiRequest
        ? { ...init, credentials: 'include', headers }
        : init
      return nativeFetch(rewritten, nextInit)
    }

    const consumeMobileTicket = async ticket => {
      if (!/^[a-f0-9]{64}$/i.test(String(ticket || ''))) return
      try {
        const verifier = String(localStorage.getItem(authVerifierStorageKey) || '')
        if (!/^[a-f0-9]{64}$/i.test(verifier)) throw new Error('Вхід завершився. Відкрий Steam ще раз.')
        const response = await nativeFetch(apiUrl('/api/mobile/session'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket, verifier }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !/^m1_[a-f0-9]{64}$/i.test(String(data?.accessToken || ''))) throw new Error(data?.error || 'Не вдалося завершити вхід.')
        rememberAccessToken(data.accessToken)
        try {
          localStorage.removeItem(authVerifierStorageKey)
        } catch {}
        await browserPlugin?.close?.()
        window.closeModal?.('steamModal')
        window.showToast?.('Steam підключено до мобільного профілю.', 'success')
        window.setTimeout(() => window.restoreSteamSession?.(), 0)
      } catch (error) {
        window.showToast?.(error?.message || 'Не вдалося завершити мобільний вхід.', 'error')
      } finally {
        mobileTicketInFlight = ''
        resetSteamButton()
      }
    }

    const handleMobileAuthUrl = incomingUrl => {
      try {
        const incoming = new URL(incomingUrl)
        if (incoming.protocol === 'potuzhnodrop:' && incoming.hostname === 'auth') {
          const errorCode = incoming.searchParams.get('error') || ''
          if (errorCode) {
            try { localStorage.removeItem(authVerifierStorageKey) } catch {}
            void browserPlugin?.close?.()
            resetSteamButton()
            window.showToast?.('Steam не підтвердив вхід. Спробуй ще раз.', 'error')
            return
          }
          const ticket = incoming.searchParams.get('ticket') || ''
          if (!ticket || ticket === mobileTicketInFlight) return
          mobileTicketInFlight = ticket
          void consumeMobileTicket(ticket)
        }
      } catch {}
    }

    // appUrlOpen handles a return to an already running app. getLaunchUrl
    // covers the equally common case where Android had released the WebView
    // while the user was confirming Steam in the browser.
    appPlugin?.addListener?.('appUrlOpen', ({ url }) => handleMobileAuthUrl(url))
    void appPlugin?.getLaunchUrl?.().then(result => {
      if (result?.url) handleMobileAuthUrl(result.url)
    }).catch(() => {})

    // A user can close the Custom Tab before Steam is confirmed. Restore the
    // button so an interrupted attempt never leaves the mobile UI stuck.
    browserPlugin?.addListener?.('browserFinished', () => {
      if (!mobileTicketInFlight) resetSteamButton()
    })

    document.addEventListener('DOMContentLoaded', () => {
      const browserLogin = window.continueSteamLogin
      window.continueSteamLogin = async () => {
        if (!window.PotuzhnoMobile.isConfigured) {
          window.showToast?.('Мобільний сервер ще не налаштований для цього білду.', 'warn')
          return
        }
        const button = document.getElementById('steamLoginContinueBtn')
        if (button) {
          button.disabled = true
          button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Відкриваємо Steam…'
        }
        if (!browserPlugin?.open) {
          browserLogin?.()
          return
        }
        try {
          const verifier = randomHex(32)
          const challenge = await sha256(verifier)
          try { localStorage.setItem(authVerifierStorageKey, verifier) } catch {}
          await browserPlugin.open({ url: apiUrl(`/api/steam/auth?client=android&challenge=${challenge}`) })
        } catch (error) {
          resetSteamButton()
          window.showToast?.(error?.message || 'Не вдалося почати прив’язку Steam.', 'error')
        }
      }
    }, { once: true })
  }

  // Android's physical back key mirrors browser navigation inside the game.
  // It closes a modal/menu first, then returns to the hub instead of exiting
  // during an active session.
  capacitor?.Plugins?.App?.addListener?.('backButton', ({ canGoBack }) => {
    const visibleModal = [...document.querySelectorAll('.modal-backdrop:not(.hidden), #riskNotice:not(.hidden)')][0]
    if (visibleModal?.id && typeof window.closeModal === 'function') {
      window.closeModal(visibleModal.id)
      return
    }
    if (canGoBack && history.length > 1) {
      history.back()
      return
    }
    if (location.hash && location.hash !== '#upgrader' && typeof window.showPage === 'function') {
      window.showPage('upgrader')
    }
  })

  // Small tactile acknowledgement for actual interactions. It never changes
  // odds, outcomes or any server-side state.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button, [role="button"], a') : null
    if (!target || target.matches('[disabled]')) return
    capacitor?.Plugins?.Haptics?.impact?.({ style: 'LIGHT' }).catch(() => {})
  }, { passive: true })
})()
