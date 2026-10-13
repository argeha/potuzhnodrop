import { createRequire } from 'node:module';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Export-only tool: no image generation API, no game code/state changes.
// Use an installed Sharp package (or pass its absolute package directory).
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = dirname(fileURLToPath(import.meta.url));
const artwork = join(root, 'uk-UA');
const manifest = [];

for (const variant of ['v1', 'v2']) {
  const input = join(artwork, `feature-graphic-art-${variant}.png`);
  const output = join(artwork, `feature-graphic-1024x500-${variant}.png`);
  // Fit without cutting off Ukrainian copy or changing the artwork's geometry.
  await sharp(input).resize(1024, 500, {
    fit: 'contain', background: '#0B1220', kernel: 'lanczos3'
  }).removeAlpha().png().toFile(output);
  const info = await sharp(output).metadata();
  if (info.width !== 1024 || info.height !== 500 || info.channels !== 3) {
    throw new Error('Feature graphic must be exactly 1024 × 500 RGB with no alpha.');
  }
  manifest.push({ file: `feature-graphic-1024x500-${variant}.png`, type: 'feature-graphic',
    width: info.width, height: info.height, channels: info.channels });
}

// Preserve the repo-native brand mark instead of inventing a different AI logo.
const brand = await readFile(join(resolve(root, '..', '..'), 'assets', 'brand', 'potuzhno-mark.svg'), 'utf8');
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0B1220"/>
<circle cx="256" cy="256" r="215" fill="none" stroke="#284760" stroke-width="2"/>
<circle cx="256" cy="256" r="197" fill="none" stroke="#F5B81D" stroke-opacity=".42" stroke-width="2"/>
<g transform="translate(64 64) scale(6)">${brand.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
</svg>`;
const icon = join(artwork, 'app-icon-512.png');
await sharp(Buffer.from(iconSvg)).ensureAlpha().png().toFile(icon);
const iconInfo = await sharp(icon).metadata();
if (iconInfo.width !== 512 || iconInfo.height !== 512 || iconInfo.channels !== 4
    || (await stat(icon)).size > 1024 * 1024) throw new Error('Invalid Google Play app-icon export.');
manifest.push({ file: 'app-icon-512.png', type: 'app-icon', width: 512, height: 512, channels: 4 });

for (const file of ['01-cases-mobile.jpg', '02-upgrader-mobile.jpg', '03-collection-mobile.jpg']) {
  const info = await sharp(join(artwork, 'screenshots-web', file)).metadata();
  if (info.format !== 'jpeg' || Math.min(info.width, info.height) < 320
      || Math.max(info.width, info.height) > 3840
      || Math.max(info.width, info.height) > 2 * Math.min(info.width, info.height)) {
    throw new Error(`Invalid screenshot dimensions: ${file}`);
  }
  manifest.push({ file: `screenshots-web/${file}`, type: 'web-reference-not-native-apk',
    width: info.width, height: info.height, channels: info.channels });
}
await writeFile(join(artwork, 'asset-manifest.json'), JSON.stringify({
  locale: 'uk-UA', capturedClientRelease: '7.9.0-reliability.1',
  capturedBuildId: '3bd9909d9688ed1ed4dc5791dc3cfc87e6d5e0ada900790ecef931e3c6d31647',
  assets: manifest
}, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
