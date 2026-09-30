# Potuzhno Drop for Android

This folder documents the Android packaging of the full Potuzhno Drop web
client. The Android project itself is generated in `android/` by Capacitor.
It contains the same `index.html`, JavaScript, styles, event art and local
audio as the Cloudflare release.

## What is shared

- One codebase for UI, cases, Zero-Sight, battles, Royale, events, profile and
  accessibility.
- One Cloudflare Worker for game state. The Android app must never maintain a
  second inventory, balance, roll result or admin state.
- The website remains the staff back office. `/admin` is intentionally not a
  mobile navigation destination.

## Before a signed Android release

The project defaults to the verified production Worker
`https://potuzhnodrop.argeha3.workers.dev`. Only override it when creating a
separate signed staging or production release; never commit a personal,
preview, localhost or staging URL.

```powershell
$env:POTUZHNO_MOBILE_API_ORIGIN = 'https://your-production-worker.example'
npm run mobile:sync
```

The sign-in order is Google first, Steam second. Configure the public
`GOOGLE_OAUTH_CLIENT_ID` Worker variable with a **Web application** client ID
and authorize the Worker domain in Google Cloud before testing. Android opens
the system Google account chooser and sends its short ID token to the Worker;
the Worker verifies it and issues the app a revocable Google session. Steam
then opens in the system browser and returns through `potuzhnodrop://auth`
with a one-time ticket and verifier exchange. A browser cookie is deliberately
not copied into the app. If Steam finishes in the browser without returning to
the application, the deployed Worker is older than the mobile-auth flow or an
old APK is installed; deploy the Worker and reinstall the current APK.
Never put a Steam, Google, Cloudflare or admin secret in this repository or in
the app bundle.

## Local development

```powershell
npm run mobile:sync
npm run mobile:open
```

Android Studio and the Android SDK are required to build an AAB. The AAB is
what gets uploaded to Play Console; an APK is only for local testing.

## Publication gates

1. Configure verified sign-in and mobile token exchange.
2. Add in-app account deletion plus a public deletion page.
3. Finish privacy policy and Play Data Safety declaration.
4. Keep all items, PC and rewards virtual: no withdrawal, transfers or
   real-world prizes.
5. Run a closed test, then create a signed `.aab` in Android Studio.
