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

Steam is the only game identity. Android opens Steam in the system browser and
returns through `potuzhnodrop://auth` with a one-time ticket and verifier
exchange. The Worker stores the game state under the confirmed Steam ID, so
signing in to the same Steam account on the website or Android loads the same
progress. A browser cookie is deliberately not copied into the app. If Steam
finishes in the browser without returning to the application, the deployed
Worker is older than the mobile-auth flow or an old APK is installed; deploy
the Worker and reinstall the current APK. Never put a Steam, Cloudflare or
admin secret in this repository or in the app bundle.

## Local development

```powershell
npm run mobile:sync
npm run mobile:open
```

Android Studio and the Android SDK are required to build an AAB. The AAB is
what gets uploaded to Play Console; an APK is only for local testing.

### Keeping Android Studio current

Android packages a local snapshot, not the live website. A Cloudflare deploy
alone cannot update an already installed APK. Stop the running app and use
**Run** in Android Studio to rebuild and install over it; do not uninstall or
clear storage, because that removes local guest progress and sign-in.

Every normal Gradle build (including Android Studio Run, debug APK and release
AAB) now runs `preparePotuzhnoWebAssets` before `preBuild`. It builds styles and
the shared client, runs local `cap copy android`, and checks every copied file
against `dist/` plus the source release fingerprint. A failed preparation stops
the build instead of silently shipping stale UI. The application ID, API origin
and installed user data remain unchanged. Version: `7.9.0`, Android code `36`.

Node.js 22.12–24 and project dependencies (`npm ci`) must be installed. Android
Studio must see `node` on PATH; restart the IDE after installing Node. If needed,
set `POTUZHNO_NODE_BINARY` to the absolute Node executable before launching the
IDE, or pass `-PpotuzhnoNodeExecutable=C:/Program Files/nodejs/node.exe` to
Gradle (quote the whole argument when running it in a shell).

For a manual refresh or diagnostic, from the repository root:

```powershell
npm run mobile:prepare
node scripts/prepare-android-assets.mjs --verify-only
```

Use `npm run mobile:sync` again when native plugins or their dependencies
change; the automatic build step deliberately copies assets without rewriting
the Gradle plugin configuration during a build. On an emulator/device, verify
the release/build ID in the profile matches `dist/release.json`. An already
installed app still needs Run or installation of a newly built APK for every
future code update; no over-the-air update system was added.

### Signed AAB

The Android Gradle Plugin in this project requires **JDK 21**. Install it,
then create one upload key and store its passwords and backup outside Git:

```powershell
cd android
Copy-Item keystore.properties.example keystore.properties
keytool -genkeypair -v -keystore play-upload.jks -alias potuzhno-drop-upload -keyalg RSA -keysize 4096 -validity 10000
```

Enter long unique passwords when `keytool` asks, put the same values into the
ignored `keystore.properties`, then build:

```powershell
cd ..
npm run mobile:sync
cd android
.\gradlew.bat bundleRelease
```

The resulting signed file is
`android/app/build/outputs/bundle/release/app-release.aab`. Keep a backup of
`play-upload.jks` and its passwords: replacing an upload key later requires a
Play Console key-reset procedure.

## Publication gates

1. Configure verified sign-in and mobile token exchange.
2. Verify in-app account deletion and the public `/account-delete.html` page.
3. Publish `/privacy.html`, then fill in the matching Play Data Safety declaration and a public developer contact email in Play Console.
4. Keep all items, PC and rewards virtual: no withdrawal, transfers or
   real-world prizes.
5. Run a closed test, then create a signed `.aab` in Android Studio.
