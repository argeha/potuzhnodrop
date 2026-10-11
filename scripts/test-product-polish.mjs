import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createReleaseMetadata } from './release-metadata.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const release = await createReleaseMetadata(root);
const secondBuild = await createReleaseMetadata(root);
assert.equal(release.buildId, secondBuild.buildId, 'The same public sources have one deterministic build ID');
assert.equal(release.id, JSON.parse(readFileSync(new URL('../release.json', import.meta.url))).id);
for (const file of ['tailwind.css', 'style.css', 'release.js', 'app.js']) {
  assert.ok(html.includes(`${file}?v=${release.id}`), `${file} must use the same release cache token`);
}
assert.ok(readFileSync(new URL('../_headers', import.meta.url), 'utf8').includes('/release.json\n  Cache-Control: no-store')
  || readFileSync(new URL('../_headers', import.meta.url), 'utf8').includes('/release.json\r\n  Cache-Control: no-store'));
const extract = (from, to) => {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, from);
  return source.slice(start, end);
};
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) {
    const classes = new Set();
    nodes.set(id, { id, classes, innerHTML: '', textContent: '', attributes: {}, hidden: false,
      className: '', disabled: false, scrollTop: 0, scrollLeft: 0, clientWidth: 400, clientHeight: 300,
      style: { removeProperty(name) { delete this[name]; } }, events: {},
      addEventListener(name, listener) { this.events[name] = listener; },
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 400, height: 300 }),
      setPointerCapture(id) { this.captured = id; }, focus() { this.focused = true; },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      querySelectorAll: () => [], querySelector: selector => node(`${id}/${selector}`),
      classList: { contains: name => classes.has(name),
        toggle(name, on = !classes.has(name)) { on ? classes.add(name) : classes.delete(name); return on; } }
    });
  }
  return nodes.get(id);
}
const stored = new Map();
let storageThrows = false;
let fetchCalls = 0, lastFetchOptions, reloads = 0;
let nextResponse = release, nextContentType = 'application/json', nextError = false;
const ctx = vm.createContext({
  window: { POTUZHNO_RELEASE: release, PotuzhnoMobile: { isNative: false }, location: { reload: () => reloads++ }, matchMedia: () => ({ matches: true }) },
  document: { getElementById: node }, navigator: { onLine: true }, AbortSignal, Date,
  PAGES: ['profile', 'hub', 'upgrader', 'case', 'tasks'],
  currentUser: { balance: 4.01, steamId: '' }, account: {}, gameState: {}, userInventory: [],
  hasSteamIdentity: () => Boolean(ctx.currentUser.steamId), hasReadySteamAccount: () => ctx.steamReady,
  isCloudProfile: value => Boolean(value?.id), isInventoryMutationBusy: () => ctx.busy,
  busy: false, steamReady: false, isCaseOpening: false, isFreeCaseOpening: false, targetArenaSession: null,
  cloudAutoSyncStarted: false, cloudAutoSyncDirty: false, cloudAutoSyncInFlight: false, cloudAutoSyncLastError: '', cloudAutoSyncLastAt: 0,
  steamAccountAutoSyncDirty: false, steamAccountAutoSyncInFlight: false, steamAccountAutoSyncPending: false,
  steamAccountAutoSyncVersion: 0, steamAccountAutoSyncLastError: '', steamAccountAutoSyncLastAt: 0,
  steamAccountRemoteRefreshInFlight: false, steamAccountBootstrapPromise: null,
  formatSyncTime: timestamp => `saved:${timestamp}`,
  showToast: message => { ctx.toast = message; }, openModal: id => { ctx.opened = id; }, closeModal: () => {},
  fetch: async (url, options) => {
    assert.equal(url, '/release.json'); fetchCalls++; lastFetchOptions = options;
    if (nextError) throw new Error('Network unavailable');
    return { ok: true, headers: { get: () => nextContentType }, json: async () => nextResponse };
  },
  localStorage: { setItem: (key, value) => { if (storageThrows) throw new Error('Quota exceeded'); stored.set(key, value); } },
  STORAGE: { steamId: 'sid', balance: 'pc', inventory: 'skins', started: 'started', game: 'game', account: 'account' },
  queuePublicProfilePublish: () => {}, captureSteamProgressDuringBootstrap: () => {},
  queueSteamAccountAutoSync: () => {}, queueCloudAutoSync: () => {}, scheduleSteamAccountAutoSync: () => {},
  STEAM_ACCOUNT_AUTOSAVE_RETRY_MS: 25_000,
  getWear: item => item.wear, getItemRarity: () => ({ name: 'Covert', color: '#eb4b4b' }),
  verifiedInventoryMarketPrice: item => item.price,
  roundPc: value => Math.round(value * 100) / 100, SELL_RATE: .9,
  formatCredits: value => `${Number(value).toFixed(2)} PC`,
  canSellInventoryItem: item => !item.inventoryProtected && (!item.accountBound || item.exclusive),
  categorizeWeapon: () => 'sniper', getInventorySource: item => item.exclusive ? 'exclusive' : 'drop',
  getSkinImageSrc: item => item.img,
  inventoryProtectionButton: () => '<button data-inventory-protect="fixture">Захист</button>'
});
const escapeStart = source.indexOf('function escapeHtml(');
const escapeEnd = source.indexOf('\n}', escapeStart) + 2;
vm.runInContext(source.slice(escapeStart, escapeEnd), ctx);
vm.runInContext(extract('/* Product status:', 'function formatSyncTime('), ctx);
vm.runInContext(extract('function skinInspectionMarkup(', 'function showItemDetail('), ctx);
vm.runInContext(extract('function saveState(', 'function beginPendingWager('), ctx);
vm.runInContext(extract('async function syncSteamAccountAutomatically(', 'function startSteamAccountAutoSync('), ctx);
const setPrivate = code => vm.runInContext(code, ctx);

assert.equal(ctx.getProgressSaveStatus().state, 'local');
ctx.currentUser.steamId = '76561198000000000';
assert.equal(ctx.getProgressSaveStatus().state, 'syncing', 'An identity alone is not confirmed storage');
ctx.steamReady = true; ctx.account.steamAccount = { updatedAt: 123 };
assert.equal(ctx.getProgressSaveStatus().state, 'saved');
ctx.account.steamAccount.updatedAt = 1e50;
assert.equal(ctx.getProgressSaveStatus().state, 'local', 'Invalid timestamps cannot prove a server save or crash the UI');
ctx.account.steamAccount.updatedAt = 123;
ctx.steamAccountAutoSyncDirty = true;
assert.equal(ctx.getProgressSaveStatus().state, 'pending', 'Never claim server saved while changes are queued');
ctx.steamAccountAutoSyncInFlight = true;
assert.equal(ctx.getProgressSaveStatus().state, 'syncing');
ctx.steamAccountAutoSyncInFlight = false; ctx.steamAccountAutoSyncLastError = 'Сервер тимчасово недоступний';
assert.equal(ctx.getProgressSaveStatus().state, 'error');
ctx.navigator.onLine = false;
assert.equal(ctx.getProgressSaveStatus().state, 'offline');
ctx.steamAccountAutoSyncLastError = 'Є новіша версія на іншому пристрої';
assert.equal(ctx.getProgressSaveStatus().state, 'conflict', 'A revision conflict must stay visible even offline');
ctx.navigator.onLine = true; ctx.steamAccountAutoSyncLastError = ''; ctx.steamAccountAutoSyncDirty = false;
setPrivate('localProgressSaveError = true');
assert.equal(ctx.getProgressSaveStatus().state, 'error');
assert.ok(ctx.getProgressSaveStatus().label.includes('Локальне'));
setPrivate('localProgressSaveError = false');
ctx.currentUser.steamId = ''; ctx.account = { cloud: { id: 'test', updatedAt: 456 } };
assert.equal(ctx.getProgressSaveStatus().state, 'local', 'A historical anonymous backup is not proof that current guest edits reached the server');
ctx.cloudAutoSyncStarted = true;
assert.equal(ctx.getProgressSaveStatus().state, 'saved');
ctx.cloudAutoSyncDirty = true;
assert.equal(ctx.getProgressSaveStatus().state, 'pending');
ctx.cloudAutoSyncDirty = false;
ctx.renderProgressSaveStatus();
assert.equal(node('profileSaveStatus').attributes['data-state'], 'saved');
assert.ok(!node('profileSaveDetails').textContent.includes('test'), 'No account IDs in the public-facing status');

ctx.saveState();
assert.equal(stored.get('pc'), '4.01');
storageThrows = true;
assert.throws(() => ctx.saveState(), /Quota exceeded/, 'Preserve the existing failure; do not pretend a write succeeded');
assert.ok(ctx.getAppReloadBlocker().includes('локально'));
storageThrows = false; ctx.saveState();
assert.equal(ctx.currentUser.balance, 4.01);

ctx.currentUser.steamId = '76561198000000000'; ctx.account = { steamAccount: { updatedAt: 123 } };
ctx.steamAccountAutoSyncDirty = true; ctx.steamAccountAutoSyncVersion = 1;
let completeSave;
ctx.saveSteamAccount = () => new Promise(resolve => { completeSave = resolve; });
ctx.renderCloudSyncUI = () => ctx.renderProgressSaveStatus();
const saving = ctx.syncSteamAccountAutomatically();
assert.equal(ctx.getProgressSaveStatus().state, 'syncing');
ctx.steamAccountAutoSyncVersion += 1;
completeSave(true); await saving;
assert.equal(ctx.getProgressSaveStatus().state, 'pending', 'Edits made during a save still await server confirmation');
const finalSave = ctx.syncSteamAccountAutomatically(); completeSave(true); await finalSave;
assert.equal(ctx.getProgressSaveStatus().state, 'saved');

assert.equal(await ctx.checkAppUpdate(true), true);
assert.equal(lastFetchOptions.cache, 'no-store');
assert.equal(lastFetchOptions.credentials, 'omit', 'Checking a version sends no account credentials');
assert.equal(ctx.hasAppUpdate(), false);
assert.ok(node('appUpdateNotice').classes.has('hidden'));
assert.equal(node('appUpdateReloadBtn').hidden, true);
const callsBeforeThrottle = fetchCalls;
await ctx.checkAppUpdate();
assert.equal(fetchCalls, callsBeforeThrottle, 'Background focus checks are throttled');
nextResponse = { ...release, buildId: 'a'.repeat(64), changes: [{ title: '<img src=x>', description: '<script>secret</script>', page: 'javascript:alert(1)' }] };
await ctx.checkAppUpdate(true);
assert.equal(ctx.hasAppUpdate(), true);
assert.equal(reloads, 0, 'Detecting an update never reloads automatically');
assert.equal(node('appUpdateReloadBtn').hidden, false);
assert.ok(node('appReleaseNotes').innerHTML.includes('&lt;img'));
assert.ok(!node('appReleaseNotes').innerHTML.includes('<script>'));
assert.ok(!node('appReleaseNotes').innerHTML.includes('javascript:'), 'Untrusted notes cannot add navigation or executable URLs');
for (const flag of ['busy', 'isCaseOpening', 'isFreeCaseOpening', 'targetArenaSession', 'steamAccountAutoSyncDirty', 'steamAccountAutoSyncInFlight', 'steamAccountBootstrapPromise']) {
  ctx[flag] = true;
  assert.ok(ctx.getAppReloadBlocker(), flag);
  assert.equal(ctx.reloadAppForUpdate(), false, `Recheck ${flag} at click time, not only at render time`);
  ctx[flag] = false;
}
assert.equal(reloads, 0);
assert.equal(ctx.reloadAppForUpdate(), true);
assert.equal(reloads, 1);
ctx.dismissAppUpdateNotice();
assert.ok(node('appUpdateNotice').classes.has('hidden'));
nextResponse = { ...release, buildId: 'b'.repeat(64) };
await ctx.checkAppUpdate(true);
assert.ok(!node('appUpdateNotice').classes.has('hidden'), 'A different build is not silenced by a previous dismissal');
nextResponse = release; await ctx.checkAppUpdate(true);
assert.equal(ctx.hasAppUpdate(), false);
nextError = true; await ctx.checkAppUpdate(true);
assert.ok(node('appUpdateCheckStatus').textContent.includes('не означає'), 'A failed check must not claim up-to-date');
nextError = false; nextContentType = 'text/html';
assert.equal(await ctx.checkAppUpdate(true), false, 'SPA fallback HTML is not release metadata');
nextContentType = 'application/json'; nextResponse = {};
assert.equal(await ctx.checkAppUpdate(true), false);
assert.equal(ctx.normalizePublicRelease({ ...release, buildId: '<script>' }), null);
ctx.window.PotuzhnoMobile.isNative = true;
const nativeFetchCalls = fetchCalls;
assert.equal(await ctx.checkAppUpdate(true), false);
assert.equal(fetchCalls, nativeFetchCalls, 'An Android bundle cannot be updated by reloading remote web assets');
ctx.renderAppReleaseUI();
assert.ok(node('appUpdateCheckStatus').textContent.includes('Android'));
assert.equal(node('appUpdateReloadBtn').hidden, true);
ctx.window.PotuzhnoMobile.isNative = false;

const skin = { id: 'fixture', name: 'AWP | Atheris', img: 'https://example.test/actual-skin.png', price: 30, wear: { code: 'BS', name: 'Battle-Scarred' }, phase: 'Phase 2' };
let markup = ctx.skinInspectionMarkup(skin);
assert.ok(markup.includes(skin.img));
assert.ok(markup.includes('BS · Battle-Scarred'));
assert.ok(markup.includes('Phase 2'));
assert.ok(markup.includes('Продати за 27.00 PC'));
assert.ok(markup.includes('data-detail-sell-id="fixture"'));
assert.ok(!markup.includes('confirmInventorySale'), 'Inspection only opens the existing sale confirmation');
assert.ok(ctx.skinInspectionMarkup({ ...skin, inventoryProtected: true }).includes('Скін захищено'));
assert.ok(!ctx.skinInspectionMarkup({ ...skin, inventoryProtected: true }).includes('data-detail-sell-id'));
assert.ok(!ctx.skinInspectionMarkup({ ...skin, accountBound: true }).includes('data-detail-sell-id'));
assert.ok(ctx.skinInspectionMarkup({ ...skin, accountBound: true, exclusive: true }).includes('data-detail-sell-id'));
assert.ok(!ctx.skinInspectionMarkup({ ...skin, price: 0 }).includes('0.00 PC'), 'Unresolved pricing is not a zero-price quote');
ctx.busy = true;
assert.ok(!ctx.skinInspectionMarkup(skin).includes('data-detail-sell-id'));
ctx.busy = false;
markup = ctx.skinInspectionMarkup({ ...skin, name: '<script>name</script>', phase: '<b>phase</b>' });
assert.ok(markup.includes('&lt;script&gt;name'));
assert.ok(markup.includes('&lt;b&gt;phase'));
assert.ok(!markup.includes('<script>'));
const stage = node('skinInspectStage'), image = node('skinInspectImage'), viewer = node('skinInspectViewer');
image.naturalWidth = 1024; image.naturalHeight = 512; image.currentSrc = skin.img;
node('skinInspectZoomPane').clientWidth = 320;
ctx.bindSkinInspectionZoom({ querySelector: selector => node(selector.slice(1)) });
const pointer = (type, clientX, clientY, id = 1) => ({ pointerType: type, clientX, clientY, pointerId: id, button: 0, preventDefault() {} });
stage.events.pointerenter(pointer('mouse', 210, 170));
assert.ok(viewer.classes.has('is-peeking'), 'Hover opens a separate magnified pane');
assert.equal(node('skinInspectLens').style.width, `${320 / 3}px`);
assert.equal(node('skinInspectZoomImage').style.width, '1068px', 'Use the contained source image dimensions, including letterboxing');
const centerLeft = node('skinInspectZoomImage').style.left;
stage.events.pointermove(pointer('mouse', 399, 170));
assert.notEqual(node('skinInspectZoomImage').style.left, centerLeft, 'The lens follows the pointer');
stage.events.pointerleave(); assert.ok(!viewer.classes.has('is-peeking'));
stage.events.pointerenter(pointer('touch', 210, 170)); assert.ok(!viewer.classes.has('is-peeking'), 'Touch never activates desktop hover');
image.events.load(); assert.equal(node('skinInspectZoomImage').src, skin.img);
ctx.toggleSkinInspectionZoom();
assert.equal(node('skinInspectZoomBtn').attributes['aria-pressed'], 'true');
assert.equal(stage.scrollLeft, 0, 'Inline zoom is panned without image scrollbars');
assert.ok(stage.focused, 'Keyboard panning works immediately after entering zoom');
const zoomLeft = image.style.left;
stage.events.pointerdown(pointer('touch', 210, 170));
stage.events.pointermove(pointer('touch', 150, 170));
assert.notEqual(image.style.left, zoomLeft, 'Touch drag pans the enlarged image');
stage.events.pointercancel(pointer('touch', 150, 170));
const afterCancel = image.style.left;
stage.events.pointermove(pointer('touch', 90, 170));
assert.equal(image.style.left, afterCancel, 'Canceled pointers cannot keep dragging');
const key = key => ({ key, preventDefault() {}, stopPropagation() {} });
stage.events.keydown(key('ArrowRight')); assert.notEqual(image.style.left, afterCancel);
stage.events.keydown(key('Home')); assert.equal(image.style.left, zoomLeft);
stage.events.keydown(key('Escape'));
assert.equal(node('skinInspectZoomBtn').attributes['aria-pressed'], 'false');
assert.equal(image.style.width, undefined, 'Exiting zoom restores object-fit contain');
stage.events.keydown(key('+'));
ctx.toggleSkinInspectionZoom();
assert.equal(node('skinInspectZoomBtn').attributes['aria-pressed'], 'false');
assert.equal(node('skinInspectStage').scrollLeft, 0);
for (const [x, y] of [[0, 0], [1, 1], [-1, 2], [.5, .5]]) {
  const geometry = ctx.skinInspectionZoomGeometry(400, 300, 1024, 512, 320, 300, x, y);
  assert.ok(geometry.left >= 0 && geometry.left + geometry.lensWidth <= 400);
  assert.ok(geometry.top >= 0 && geometry.top + geometry.lensHeight <= 300);
}
assert.ok(markup.includes('skinInspectZoomPane') && markup.includes('skinInspectHelp'));
assert.ok(css.includes('.skin-inspect-stage{position:relative;height:330px;overflow:hidden;'));
assert.ok(css.includes('.app-update-notice.hidden,.product-action-primary[hidden]{display:none}'));
assert.ok(css.includes('.skin-inspect-layout{grid-template-columns:minmax(0,1fr)'));
assert.ok(css.includes('max-height:calc(100dvh - 32px)'));
assert.equal(ctx.currentUser.balance, 4.01, 'Status, release checks and inspection do not change PC');
assert.equal(ctx.userInventory.length, 0);
console.log('Product polish passed: actual skin previews, zoom, safe sale actions, factual save states, concurrent saves, release fingerprints, uncached checks, failures, Android and guarded manual reloads.');
