import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

// Native layout, not AI UI editing: exact screenshot pixels are used as one
// uniformly scaled layer, with no invented skins, balances, buttons or results.
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = join(dirname(fileURLToPath(import.meta.url)), 'uk-UA', 'portrait-series-v1');
const slides = JSON.parse(await readFile(join(root, 'slides.json'), 'utf8'));
const output = join(root, 'png');
await mkdir(output, { recursive: true });
const WIDTH = 1080, HEIGHT = 1920;
const fontfile = process.env.POTUZHNO_PROMO_FONT_FILE
  || (process.platform === 'win32' ? 'C:/Windows/Fonts/segoeuiz.ttf' : undefined);
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const background = await sharp(join(root, 'backdrop-art-v1.png'))
  .resize(WIDTH, HEIGHT, { fit: 'cover' }).removeAlpha().png().toBuffer();
const brand = await readFile(join(resolve(root, '../../../..'), 'assets', 'brand', 'potuzhno-mark.svg'), 'utf8');
const brandPaths = brand.replace(/<svg[^>]*>|<\/svg>/g, '');

async function caption(text, color, size, top, italic = true) {
  const rendered = await sharp({ text: {
    text: `<span foreground="${color}" weight="bold"${italic ? ' style="italic"' : ''}>${escape(text)}</span>`,
    font: `Segoe UI ${size}`, ...(fontfile ? { fontfile } : {}),
    width: 944, align: 'center', dpi: 72, rgba: true
  } }).png().toBuffer({ resolveWithObject: true });
  assert.ok(rendered.info.width <= 944 && rendered.info.height <= 110, `Caption does not fit: ${text}`);
  return { input: rendered.data, left: Math.round((WIDTH - rendered.info.width) / 2), top };
}

const manifest = [];
for (const slide of slides) {
  assert.match(slide.id, /^0[1-8]-[a-z-]+$/);
  const sourcePath = resolve(root, slide.source);
  const withinRoot = relative(root, sourcePath);
  assert.ok(!withinRoot.startsWith('..') && !isAbsolute(withinRoot), 'Screenshot must stay inside the asset kit');
  const original = await readFile(sourcePath);
  const sourceInfo = await sharp(original).metadata();
  const { left, top, width, height } = slide.crop;
  for (const value of [left, top, width, height]) assert.ok(Number.isInteger(value) && value >= 0);
  assert.ok(width > 0 && height > 0 && left + width <= sourceInfo.width && top + height <= sourceInfo.height,
    `Crop is outside the supplied screenshot: ${slide.id}`);

  // Remove only the emulator bezel / OS status strip / exterior background.
  // Fit the complete app rectangle without hiding its navigation or game UI.
  const screenHeight = 1544;
  const screenWidth = Math.round(width / height * screenHeight);
  const screenLeft = Math.round((WIDTH - screenWidth) / 2), screenTop = 24;
  const screen = await sharp(original).extract(slide.crop)
    .resize(screenWidth, screenHeight, { fit: 'fill' }).removeAlpha().png().toBuffer();
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs><filter id="blur"><feGaussianBlur stdDeviation="25"/></filter></defs>
    <rect x="${screenLeft - 12}" y="${screenTop + 18}" width="${screenWidth + 24}" height="${screenHeight}"
      fill="#000" opacity=".75" filter="url(#blur)"/>
  </svg>`);
  const footer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#080F1A" stop-opacity="0"/>
      <stop offset=".35" stop-color="#080F1A" stop-opacity=".85"/>
      <stop offset="1" stop-color="#080F1A" stop-opacity=".97"/>
    </linearGradient></defs>
    <rect x="0" y="1570" width="1080" height="350" fill="url(#fade)"/>
    <rect x="480" y="1610" width="120" height="4" rx="2" fill="#F5B81D"/>
    <g transform="translate(518 1874) scale(.68)">${brandPaths}</g>
  </svg>`);
  const layers = [
    { input: shadow, left: 0, top: 0 },
    { input: screen, left: screenLeft, top: screenTop },
    { input: footer, left: 0, top: 0 },
    await caption(slide.headline[0], '#FFFFFF', 82, 1650),
    await caption(slide.headline[1], '#F5B81D', 82, 1744),
    await caption(slide.subtitle, '#CED6E2', 30, 1832, false)
  ];
  const path = join(output, `${slide.id}-1080x1920.png`);
  await sharp(background).composite(layers).removeAlpha().png().toFile(path);
  const finalInfo = await sharp(path).metadata();
  assert.equal(finalInfo.width, WIDTH);
  assert.equal(finalInfo.height, HEIGHT);
  assert.equal(finalInfo.channels, 3, 'Store images must be opaque RGB');
  const expectedPixels = await sharp(screen).removeAlpha().raw().toBuffer();
  const actualPixels = await sharp(path).extract({ left: screenLeft, top: screenTop,
    width: screenWidth, height: screenHeight }).removeAlpha().raw().toBuffer();
  assert.ok(expectedPixels.equals(actualPixels), 'The full fitted app rectangle must remain pixel-identical');
  assert.equal(hash(await readFile(sourcePath)), hash(original), 'Never mutate the supplied screenshot');
  manifest.push({ file: `png/${slide.id}-1080x1920.png`, width: WIDTH, height: HEIGHT,
    type: 'styled-user-supplied-android-screenshot', source: slide.source,
    sourceSha256: hash(original), sourceWidth: sourceInfo.width, sourceHeight: sourceInfo.height,
    crop: slide.crop, scaledAppWidth: screenWidth, scaledAppHeight: screenHeight,
    uiRegeneratedByAI: false, fittedUiPixelIdentityVerified: true, layoutVerified: true, playApprovalVerified: false,
    rawHighResolutionScreenshotRecommended: true, captionHeightFraction: 350 / HEIGHT, alt: slide.alt });
}

// A contact sheet is a viewing aid, not an extra Play Store screenshot.
const previewWidth = 480, previewHeight = Math.round(previewWidth * HEIGHT / WIDTH);
const contactLayers = [];
for (const [index, slide] of slides.entries()) {
  contactLayers.push({ input: await sharp(join(output, `${slide.id}-1080x1920.png`))
    .resize(previewWidth, previewHeight).png().toBuffer(), left: 24 + index * (previewWidth + 24), top: 24 });
}
await sharp({ create: { width: slides.length * (previewWidth + 24) + 24,
  height: previewHeight + 48, channels: 3, background: '#080E17' } })
  .composite(contactLayers).png().toFile(join(root, 'series-preview.png'));
await writeFile(join(root, 'manifest.json'), JSON.stringify({ locale: 'uk-UA',
  sourceKind: 'user-supplied-android-emulator-captures', decorativeBackdrop: 'built-in image_gen',
  uiProcessing: 'bezel-only crop plus proportional fitting; screenshot pixels are not AI-generated',
  files: manifest }, null, 2) + '\n');
console.log(JSON.stringify(manifest.map(({file, width, height, sourceWidth, sourceHeight}) =>
  ({file, width, height, sourceWidth, sourceHeight})), null, 2));
