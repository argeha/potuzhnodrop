import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createReleaseMetadata } from './release-metadata.mjs';
import { verifyAndroidAssets } from './prepare-android-assets.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const gradle = await readFile(join(projectRoot, 'android', 'app', 'build.gradle'), 'utf8');
assert.match(gradle, /tasks\.register\('preparePotuzhnoWebAssets', Exec\)/);
assert.match(gradle, /tasks\.named\('preBuild'\)\s*\{\s*dependsOn preparePotuzhnoWebAssets/,
  'Android Studio Run and APK/AAB builds must refresh web assets before packaging');
assert.match(gradle, /prepare-android-assets\.mjs/);
assert.doesNotMatch(gradle, /onlyIf|ignoreExitValue\s*[= ]\s*true/,
  'Missing Node/dependencies or a failed copy must not silently package old UI');
const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
assert.ok(gradle.includes(`versionName "${packageJson.version}"`), 'Native version must match the shared client');
assert.equal(packageJson.scripts['mobile:prepare'], 'node scripts/prepare-android-assets.mjs');
assert.ok(packageJson.scripts.check.includes('node scripts/test-android-assets.mjs'));

const fixture = await mkdtemp(join(tmpdir(), 'potuzhno-android-assets-'));
try {
  const sources = {
    'release.json': JSON.stringify({ id: '7.9.0-test', version: '7.9.0', releasedOn: '2026-10-12', changes: [] }),
    'index.html': '<!doctype html><title>Current client</title>',
    'js/app.js': '/* current inventory, PASS and arena client */',
    'js/mobile.js': '/* native fetch bridge */',
    'css/style.css': '/* current gold checkboxes */',
    'css/tailwind.css': '/* generated styles */'
  };
  for (const [path, contents] of Object.entries(sources)) {
    await mkdir(dirname(join(fixture, path)), { recursive: true });
    await writeFile(join(fixture, path), contents);
  }
  const web = join(fixture, 'dist');
  const assets = join(fixture, 'android', 'app', 'src', 'main', 'assets');
  const native = join(assets, 'public');
  await mkdir(web, { recursive: true });
  for (const path of Object.keys(sources)) {
    await mkdir(dirname(join(web, path)), { recursive: true });
    await cp(join(fixture, path), join(web, path));
  }
  const manifest = await createReleaseMetadata(fixture);
  await writeFile(join(web, 'release.json'), JSON.stringify(manifest));
  await mkdir(join(web, 'assets', 'brand'), { recursive: true });
  await writeFile(join(web, 'assets', 'brand', 'test.png'), Buffer.from([137, 80, 78, 71]));
  await cp(web, native, { recursive: true });
  const nativeConfig = join(assets, 'capacitor.config.json');
  const config = { appId: 'com.argeha.potuzhnodrop', webDir: 'dist' };
  await writeFile(nativeConfig, JSON.stringify(config));
  assert.equal((await verifyAndroidAssets(fixture)).release.buildId, manifest.buildId);

  await writeFile(join(native, 'js', 'app.js'), '/* stale Android UI */');
  await assert.rejects(verifyAndroidAssets(fixture), /Android asset differs/,
    'Matching manifest alone cannot hide stale JavaScript');
  await cp(join(web, 'js', 'app.js'), join(native, 'js', 'app.js'));
  await writeFile(join(fixture, 'css', 'style.css'), '/* next website update */');
  await assert.rejects(verifyAndroidAssets(fixture), /Stale Android web bundle/,
    'An internally consistent but old bundle must not pass');
  await writeFile(join(fixture, 'css', 'style.css'), sources['css/style.css']);
  await rm(join(native, 'assets', 'brand', 'test.png'));
  await assert.rejects(verifyAndroidAssets(fixture), /ENOENT/, 'Art and audio are checked too');
  await cp(join(web, 'assets', 'brand', 'test.png'), join(native, 'assets', 'brand', 'test.png'));
  await writeFile(nativeConfig, JSON.stringify({ ...config, server: { url: 'https://example.test' } }));
  await assert.rejects(verifyAndroidAssets(fixture), /bundled client/, 'Do not replace the app with a remote WebView');
  await writeFile(nativeConfig, JSON.stringify({ ...config, appId: 'com.example.other' }));
  await assert.rejects(verifyAndroidAssets(fixture), /application ID/, 'Keep installed app identity and data');
  await writeFile(nativeConfig, JSON.stringify(config));
  await rm(join(native, 'release.json'));
  await assert.rejects(verifyAndroidAssets(fixture), /ENOENT/, 'Old pre-manifest Android copies must fail');
} finally {
  if (dirname(fixture) !== resolve(tmpdir()) || !basename(fixture).startsWith('potuzhno-android-assets-')) {
    throw new Error('Refusing to remove an unexpected test fixture directory.');
  }
  await rm(fixture, { recursive: true, force: true });
}
console.log('Android asset freshness and pre-build regression tests passed.');
