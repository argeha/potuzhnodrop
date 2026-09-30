import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android shell for the complete Potuzhno Drop client.
 *
 * `dist` is generated from the same files Cloudflare serves, so a mobile
 * release never drifts visually from the website. The game API origin is
 * injected only for native builds by `scripts/build-assets.mjs`.
 */
const config: CapacitorConfig = {
  appId: 'com.argeha.potuzhnodrop',
  appName: 'Потужно Drop',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#080A0FFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#080A0F',
      style: 'DARK',
      overlaysWebView: false,
    },
  },
}

export default config
