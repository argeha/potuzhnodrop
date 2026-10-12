import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createReleaseMetadata } from './release-metadata.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function publicFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await publicFiles(directory, path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unexpected non-file web asset: ${path}`);
  }
  return files.sort();
}

// Capacitor can report a copy error without returning a nonzero exit status.
// Check actual bytes, not timestamps or versionName, before Gradle packages them.
export async function verifyAndroidAssets(projectRoot = repositoryRoot) {
  const webRoot = join(projectRoot, 'dist');
  const assetsRoot = join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
  const nativeRoot = join(assetsRoot, 'public');
  const expected = await createReleaseMetadata(projectRoot);
  for (const directory of [webRoot, nativeRoot]) {
    const actual = JSON.parse(await readFile(join(directory, 'release.json'), 'utf8'));
    if (actual.id !== expected.id || actual.version !== expected.version || actual.buildId !== expected.buildId) {
      throw new Error(`Stale Android web bundle in ${directory}. Run npm run mobile:prepare.`);
    }
  }
  const files = await publicFiles(webRoot);
  for (const path of files) {
    const [web, native] = await Promise.all([
      readFile(join(webRoot, path)), readFile(join(nativeRoot, path))
    ]);
    if (!web.equals(native)) throw new Error(`Android asset differs from the web build: ${path}`);
  }
  const config = JSON.parse(await readFile(join(assetsRoot, 'capacitor.config.json'), 'utf8'));
  if (config.appId !== 'com.argeha.potuzhnodrop' || config.webDir !== 'dist' || config.server?.url) {
    throw new Error('Android must use the bundled client and the existing application ID, not a remote WebView.');
  }
  return { release: expected, fileCount: files.length };
}

export async function prepareAndroidAssets(projectRoot = repositoryRoot) {
  const require = createRequire(join(projectRoot, 'package.json'));
  function run(script, args = []) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: projectRoot, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Android asset preparation failed: ${script} (exit ${result.status}).`);
  }
  // Use installed local tools directly: no shell quoting or npx downloads.
  run(require.resolve('tailwindcss/lib/cli.js'), [
    '-c', 'tailwind.config.cjs', '-i', 'css/tailwind.input.css', '-o', 'css/tailwind.css', '--minify'
  ]);
  run(join(projectRoot, 'scripts', 'build-assets.mjs'));
  // copy refreshes only generated assets/config; sync would also rewrite Gradle
  // plugin files while Gradle is evaluating the current build.
  run(require.resolve('@capacitor/cli/bin/capacitor'), ['copy', 'android']);
  const verified = await verifyAndroidAssets(projectRoot);
  console.log(`Android bundle verified: ${verified.release.id} / ${verified.release.buildId.slice(0, 12)} (${verified.fileCount} files).`);
  return verified;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.includes('--verify-only')) {
      const verified = await verifyAndroidAssets();
      console.log(`Android bundle verified: ${verified.release.id} / ${verified.release.buildId.slice(0, 12)} (${verified.fileCount} files).`);
    } else {
      await prepareAndroidAssets();
    }
  } catch (error) {
    console.error(`Cannot package Android web assets: ${error.message}`);
    console.error('Install project dependencies with npm ci, then retry. Android Studio also needs Node.js on PATH.');
    process.exitCode = 1;
  }
}
