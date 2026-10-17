import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]$/, '');
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const section = (from, to, last = false) => {
  const start = last ? source.lastIndexOf(from) : source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Missing production section: ${from}`);
  return source.slice(start, end);
};
const policy = section('let lightweightMotionQuery;', 'let battlePlayerItem');
const pageSize = section('function getCatalogRenderPageSize()', 'function debounceFilterShop()');
const panel = section('function renderPerformancePanel()', 'function updateAccountUI()');
const canvases = section('const CANVAS_SIZE = 260;', 'function saveState(');
const royaleInit = section('function initRoyaleCanvas()', '// ── Compute values');
const royaleDraw = section('function drawRoyaleWheel(', 'function renderRoyaleParticipantList(', true);
const plain = value => JSON.parse(JSON.stringify(value));
const stored = new Map(), classes = new Set(), nodes = new Map();
const metrics = { saves: 0, resets: 0, caseRenders: 0, filters: 0, shopRenders: 0, mediaQueries: 0 };
let reduceMotion = false, shopOpen = false;
const drawLog = [];
const draw = new Proxy({}, {
  get: (_, key) => (...args) => {
    drawLog.push([key, ...args]);
    return String(key).startsWith('create') ? { addColorStop() {} } : undefined;
  },
  set: (_, key, value) => { drawLog.push([key, value]); return true; }
});
for (const id of ['upgradeCanvas', 'royaleWheelCanvas']) {
  nodes.set(id, { width: 0, height: 0, style: {}, getContext: () => draw });
}
nodes.set('shopModal', { classList: { contains: () => shopOpen } });
const ctx = vm.createContext({
  gameState: { performanceMode: 'auto', xp: 1865, daily: { claimed: ['earned'] } },
  currentUser: { balance: 123.45 }, userInventory: [{ id: 'owned', price: 7000 }],
  filteredSkins: [{ id: 'already-priced', price: 50 }], visibleSkinCount: 80,
  window: { devicePixelRatio: 2, matchMedia: () => {
    metrics.mediaQueries++; return { get matches() { return reduceMotion; } };
  } },
  navigator: { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: false } },
  document: {
    body: { classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name) } },
    documentElement: { dataset: {} }, getElementById: id => nodes.get(id) || null
  },
  STORAGE: { game: 'isolated-performance-test' },
  localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
  saveState: () => { metrics.saves++; stored.set('isolated-performance-test', JSON.stringify(ctx.gameState)); },
  renderPerformancePanel() {}, refreshPerformanceCanvases: () => { metrics.resets++; },
  renderCaseCatalog: () => { metrics.caseRenders++; }, filterShop: () => { metrics.filters++; },
  renderShopGrid: skins => { metrics.shopRenders++; assert.equal(skins, ctx.filteredSkins); }, showToast() {},
  isRolling: true, royaleWheelCtx: null, royaleWheelAngle: 0,
  royaleParticipants: () => [{ name: 'One', value: 25, color: '#ffcc00', isYou: true }, { name: 'Two', value: 75, color: '#7744ee' }],
  createDefaultGameState: () => ({ performanceMode: 'auto', daily: {}, weekly: {} }),
  clampNumber: (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback,
  ROUND_HISTORY_LIMIT: 60, normalizeShowcaseIds: () => [], ensureDailyState() {}, ensureWeeklyState() {}
});
for (const name of ['Daily', 'Weekly', 'PowerRun', 'HalloweenEvent', 'WinterEvent', 'SignalSeason', 'SeasonalCosmetics', 'PulseCircuit', 'TargetArena', 'AllTime', 'BattlePass']) {
  ctx[`createDefault${name}`] = () => ({});
}
vm.runInContext(policy + pageSize, ctx);
ctx.applyPerformanceMode();
assert.deepEqual(plain(ctx.getCaseReelConfig()), { cards: 34, winnerIndex: 27, duration: 3850 });
assert.equal(ctx.getCaseReelConfig(6000).duration, 6000);
assert.equal(ctx.getCatalogRenderPageSize(), 80);
assert.equal(ctx.getLiveFeedRenderLimit(), 14);
const before = JSON.stringify([ctx.currentUser, ctx.userInventory, ctx.gameState.xp, ctx.gameState.daily]);
shopOpen = true;
ctx.setPerformanceMode('lite');
assert.ok(classes.has('performance-lite'));
assert.equal(ctx.document.documentElement.dataset.performance, 'lite');
assert.equal(ctx.document.documentElement.dataset.renderQuality, 'lite');
assert.deepEqual(plain(ctx.getCaseReelConfig(6000)), { cards: 12, winnerIndex: 8, duration: 900 });
assert.equal(ctx.getCatalogRenderPageSize(), 24);
assert.equal(ctx.getLiveFeedRenderLimit(), 6);
assert.equal(ctx.visibleSkinCount, 24);
assert.equal(metrics.shopRenders, 1);
assert.equal(metrics.caseRenders, 0, 'Graphics switch must not rebuild all case cards');
assert.equal(metrics.filters, 0, 'Graphics switch must not reprice/refilter the catalogue');
assert.equal(JSON.stringify([ctx.currentUser, ctx.userInventory, ctx.gameState.xp, ctx.gameState.daily]), before);
const once = { ...metrics };
ctx.setPerformanceMode('lite'); ctx.applyPerformanceMode();
assert.deepEqual(metrics, once, 'Repeated mode selection must not allocate canvases or rerender');
vm.runInContext(section('function loadGameState()', 'function getXpMultiplier()'), ctx);
ctx.gameState = null; ctx.loadGameState(); ctx.applyPerformanceMode();
assert.equal(ctx.getPerformanceMode(), 'lite', 'Real save loader restores the setting');
shopOpen = false; ctx.setPerformanceMode('auto');
assert.equal(metrics.shopRenders, 1, 'Closed shop is not rendered');
for (const condition of ['reduce-motion', 'save-data', 'low-memory', 'few-cores']) {
  reduceMotion = condition === 'reduce-motion'; ctx.navigator.connection.saveData = condition === 'save-data';
  ctx.navigator.deviceMemory = condition === 'low-memory' ? 4 : 8;
  ctx.navigator.hardwareConcurrency = condition === 'few-cores' ? 2 : 8;
  ctx.applyPerformanceMode();
  assert.ok(classes.has('performance-lite'), condition);
  assert.equal(ctx.getCaseReelConfig().cards, 12, condition);
  assert.equal(ctx.getCatalogRenderPageSize(), 24, condition);
  assert.equal(ctx.document.documentElement.dataset.performance, 'auto');
}
reduceMotion = false; ctx.navigator.connection.saveData = false;
ctx.navigator.deviceMemory = undefined; ctx.navigator.hardwareConcurrency = undefined;
ctx.applyPerformanceMode();
assert.ok(!classes.has('performance-lite'), 'Unknown hardware must not be mistaken for weak hardware');
assert.equal(metrics.mediaQueries, 1, 'Reuse the media query rather than allocate one for every canvas frame');

let focusedAgain = false;
nodes.set('accountModal', {});
nodes.set('performanceModePanel', {
  contains: () => true,
  querySelector: selector => { assert.equal(selector, '[data-performance-mode="lite"]'); return { focus: options => { focusedAgain = options.preventScroll; } }; }
});
ctx.document.activeElement = { getAttribute: name => name === 'data-performance-mode' ? 'lite' : null };
vm.runInContext(panel, ctx); ctx.renderPerformancePanel();
assert.ok(focusedAgain, 'Changing graphics keeps keyboard focus without scrolling the dialog');
assert.ok(nodes.get('performanceModePanel').innerHTML.includes('aria-pressed="false"'));

vm.runInContext(canvases + royaleInit + royaleDraw, ctx);
function capture(mode) {
  ctx.gameState.performanceMode = mode; ctx.initCanvas(); ctx.initRoyaleCanvas(); drawLog.length = 0;
  ctx.renderCanvas(46.37, 1.75); ctx.drawRoyaleWheel(0.7);
  return [...drawLog];
}
const full = capture('auto');
assert.equal(nodes.get('upgradeCanvas').width, 520);
assert.equal(nodes.get('royaleWheelCanvas').width, 440);
const lite = capture('lite');
assert.equal(nodes.get('upgradeCanvas').width, 260);
assert.equal(nodes.get('royaleWheelCanvas').width, 300);
assert.equal(lite.filter(op => op[0] === 'shadowBlur' && op[1] > 0).length, 0);
assert.equal(lite.filter(op => String(op[0]).startsWith('create')).length, 0, 'No per-frame gradient creation in lite');
assert.ok(lite.length < full.length * 0.8, 'Lite reduces drawing work without capping animation FPS');
assert.deepEqual(lite.filter(op => op[0] === 'fillText'), full.filter(op => op[0] === 'fillText'), 'Same participant labels and odds');
const arc = ops => ops.filter(op => op[0] === 'arc' && op[3] === 112 && op[5] > op[4] && op[5] < 5);
assert.deepEqual(arc(lite), arc(full), 'Chance arc geometry is identical');

let renderedEvents = [];
nodes.set('liveFeed', { replaceChildren() { renderedEvents = []; } });
ctx.communityFeedKey = null; ctx.UUID_PATTERN = /^never$/;
ctx.buildCommunityProfile = event => ({ name: event.name });
ctx.addActivityEvent = event => renderedEvents.push(event);
vm.runInContext(section('function renderCommunityFeed(', 'function applyCommunitySnapshot('), ctx);
const events = Array.from({ length: 100 }, (_, id) => ({ id, name: 'Test', skin: { name: 'Skin' } }));
ctx.renderCommunityFeed(events); assert.equal(renderedEvents.length, 6); assert.equal(events.length, 100);
ctx.gameState.performanceMode = 'auto'; ctx.renderCommunityFeed(events); assert.equal(renderedEvents.length, 14);
assert.ok(!/content-visibility:\s*auto/.test(css), 'Remove the speculative off-screen layout optimization');
assert.ok(css.includes('*:not(.case-reel-track):not(#battleCoin)'), 'Preserve transitionend-driven game visuals');
for (const id of ['headerSettingsButton', 'profileSettingsButton', 'performanceModePanel', 'accountNickInput', 'steamProfileVisibilityPanel']) {
  assert.equal(html.split(`id="${id}"`).length - 1, 1, `Unique preserved settings control: ${id}`);
}
assert.match(html, /settings-dialog-content"><section id="performanceModePanel"/);
assert.ok(!html.match(/profile-identity-actions[^\n]+profile-edit-button[^\n]+Налаштування<\/button>/));
console.log(`Performance regression checks passed: no catalogue rebuild, saved mode, automatic policy, 12/24/6 card limits, canvas operations ${full.length}→${lite.length}, unchanged chance arc/participants and settings controls.`);

// Optional isolated UI fixture: production markup/CSS/render functions, no game
// boot, accounts, requests or real profile storage. Used for responsive QA.
if (process.argv.includes('--serve')) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const header = html.slice(html.indexOf('<header id="siteHeader"'), html.indexOf('</header>') + 9);
  const profileStart = html.indexOf('<article id="profileOverview"');
  const profile = html.slice(profileStart, html.indexOf('</article>', profileStart) + 10);
  const modal = html.match(/<div id="accountModal"[^\n]+/)[0];
  const modals = section('const modalReturnFocus =', 'function refreshInventoryModal()');
  const setup = `
    let gameState=JSON.parse(localStorage.getItem('isolated-performance-ui')||'{"performanceMode":"auto"}');
    let filteredSkins=[],visibleSkinCount=80;
    function saveState(){localStorage.setItem('isolated-performance-ui',JSON.stringify(gameState));}
    function renderShopGrid(){} function showToast(text){document.getElementById('qaMessage').textContent=text;}
    function updateAccountUI(){renderPerformancePanel();}
    function toggleMobileMenu(){const menu=document.getElementById('mobileMenu');menu.classList.toggle('hidden');}
    function showPage(){} function startSteamLogin(){} function handleSteamAvatarError(){}
    ${policy}${pageSize}${panel}${modals}
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal('accountModal');});
    applyPerformanceMode();renderPerformancePanel();
  `;
  const page = `<!doctype html><html lang="uk"><head>${head}</head><body class="pd-rebrand">${header}
    <main class="max-w-7xl mx-auto w-full p-4 sm:p-6"><p class="mb-4 text-xs text-cyan-200">Ізольована перевірка інтерфейсу — без справжнього профілю</p>${profile}
    <p id="qaMessage" role="status" class="text-xs text-cyan-200 my-4"></p>
    <div id="qaCard" class="case-catalog-card p-4 mb-4"><span class="case-hero-icon">◆</span> Перевірка звичайних карток</div>
    <div class="case-reel-track" id="qaReel" style="transition-property:transform!important;transition-duration:0.9s!important">Перевірка руху рулетки</div>
    </main>${modal}<script>${setup}</script></body></html>`;
  createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (path === '/') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(page); return; }
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + '\\') && !file.startsWith(root + '/')) { response.writeHead(403).end(); return; }
    try {
      const types = { '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
      if (!types[extname(file)]) throw new Error('Not a fixture asset');
      response.writeHead(200, { 'Content-Type': types[extname(file)] }); response.end(readFileSync(file));
    } catch { response.writeHead(404).end(); }
  }).listen(8793, '127.0.0.1', () => console.log('Isolated settings QA: http://127.0.0.1:8793'));
}
