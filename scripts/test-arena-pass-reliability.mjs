import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import worker, { PotuzhnoState } from '../src/worker.mjs';

// All accounts, storage, sessions and rewards below are disposable fixtures.
class MemoryStorage {
  values = new Map();
  queue = Promise.resolve();
  async get(key) { return structuredClone(this.values.get(key)); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async transaction(fn) {
    const work = this.queue.then(async () => {
      const copy = new Map(structuredClone([...this.values]));
      const result = await fn({
        get: async key => structuredClone(copy.get(key)),
        put: async (key, value) => { copy.set(key, structuredClone(value)); },
        delete: async key => { copy.delete(key); }
      });
      this.values = copy;
      return result;
    });
    this.queue = work.catch(() => {});
    return work;
  }
}
const objects = new Map(), sessions = new Map();
const env = {
  POTUZHNO_RATE_LIMIT: { idFromName: name => name, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) },
  POTUZHNO_STATE: { idFromName: name => name, get(name) {
    if (!objects.has(name)) {
      const storage = new MemoryStorage();
      const object = new PotuzhnoState({ storage }, env);
      object.getSteamSession = async () => sessions.get(name) || null;
      object.indexCloudProfile = async () => {};
      objects.set(name, { storage, object });
    }
    return { fetch: request => objects.get(name).object.fetch(request) };
  } }
};
const post = async (body, headers = {}, path = '/api/arena') => {
  const response = await worker.fetch(new Request(`https://fixture.invalid${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
  }), env);
  return { status: response.status, data: await response.json() };
};
const storageFor = name => { env.POTUZHNO_STATE.get(name); return objects.get(name).storage; };
const actualNow = Date.now;
let clock = Date.parse('2026-10-12T23:59:00Z');
Date.now = () => clock;
try {
  const steamId = '76561198000000001';
  const webToken = 'a'.repeat(64), mobileToken = 'b'.repeat(64);
  sessions.set(`steam:${webToken}`, { steamId });
  sessions.set(`mobile:${mobileToken}`, { steamId });
  const web = { Cookie: `potuzhno_steam_session=v2_${webToken}` };
  const mobile = { Authorization: `Bearer m1_${mobileToken}`, Origin: 'https://localhost' };
  const storage = storageFor(`steam-account:${steamId}`);
  const originalProfile = { steamId, revision: 44, payload: { balance: 100, gameState: { targetArena: { rounds: 20, bestScore: 37, dailyDate: '2026-10-12', dailyRounds: 0 } } } };
  await storage.put('steam-account', originalProfile);
  const start = () => ({ identity: 'steam', action: 'start', stake: 25, attemptId: randomUUID(), steamId: '76561198999999999' });
  const simultaneous = await Promise.all(Array.from({ length: 25 }, (_, index) => post(start(), index % 2 ? web : mobile)));
  assert.equal(simultaneous.filter(result => result.status === 200).length, 10, 'Web and Android share exactly ten atomic admissions');
  assert.equal(simultaneous.filter(result => result.status === 429).length, 15);
  for (const headers of [web, mobile]) {
    const status = await post({ identity: 'steam', action: 'status' }, headers);
    assert.equal(status.data.quota.remaining, 0);
    assert.equal(status.data.quota.resetAt, Date.parse('2026-10-13T00:00:00Z'));
  }
  assert.deepEqual(await storage.get('steam-account'), originalProfile, 'Admission does not touch balances, records or save revisions');
  const first = simultaneous.find(result => result.status === 200).data.attemptId;
  const retry = await post({ identity: 'steam', action: 'start', stake: 25, attemptId: first }, mobile);
  assert.equal(retry.status, 200); assert.equal(retry.data.duplicate, true); assert.equal(retry.data.quota.used, 10);
  assert.equal((await post({ identity: 'steam', action: 'start', stake: 250, attemptId: first }, web)).status, 409);
  const stale = structuredClone(originalProfile); stale.payload.gameState.targetArena.dailyRounds = 0;
  await storage.put('steam-account', stale);
  assert.equal((await post(start(), web)).status, 429, 'An old device save cannot reset the separate ledger');
  assert.equal((await post({ identity: 'steam', action: 'status', steamId }, {})).status, 401, 'A browser-provided Steam ID is not authentication');
  assert.equal((await post({ identity: 'steam', action: 'start', stake: -1, attemptId: randomUUID() }, web)).status, 400);
  clock += 60_000;
  const tomorrow = await post({ identity: 'steam', action: 'status' }, mobile);
  assert.equal(tomorrow.data.quota.used, 0); assert.equal(tomorrow.data.quota.day, '2026-10-13');
  assert.equal((await post(start(), web)).data.quota.used, 1);
  assert.equal((await storage.get('steam-account')).payload.gameState.targetArena.bestScore, 37);

  // Authenticated legacy Cloud Profiles use the same account shard as saves.
  const cloudId = randomUUID(), recoveryCode = 'q'.repeat(48);
  const cloudStorage = storageFor(`profile:${cloudId}`);
  const payload = { balance: 250, gameState: { targetArena: { dailyDate: '2026-10-13', dailyRounds: 8, bestScore: 29 } } };
  await cloudStorage.put(`profile:${cloudId}`, { recoveryHash: createHash('sha256').update(recoveryCode).digest('hex'), revision: 1, payload });
  const cloudBody = { identity: 'cloud', accountId: cloudId, recoveryCode, action: 'status' };
  assert.equal((await post({ ...cloudBody, recoveryCode: 'w'.repeat(48) })).status, 403);
  assert.equal((await post(cloudBody)).data.quota.used, 8, 'The first admission migrates only the existing server counter');
  const cloudStart = () => ({ ...cloudBody, action: 'start', stake: 100, attemptId: randomUUID(), dailyRounds: 0, day: '2099-01-01' });
  assert.equal((await post(cloudStart())).data.quota.used, 9);
  const saved = await post({ action: 'save', accountId: cloudId, recoveryCode, revision: 1, payload: { ...payload, gameState: { targetArena: { dailyRounds: 0 } } } }, {}, '/api/profile/sync');
  assert.equal(saved.status, 200);
  assert.equal((await post(cloudStart())).data.quota.used, 10);
  assert.equal((await post(cloudStart())).status, 429);
  const blocked = await cloudStorage.get(`profile:${cloudId}`);
  blocked.payload.moderation = { blocked: true }; await cloudStorage.put(`profile:${cloudId}`, blocked);
  assert.equal((await post(cloudBody)).status, 423);

  const guestId = randomUUID();
  assert.equal((await post({ identity: 'guest', deviceId: guestId, action: 'start', stake: 25, attemptId: randomUUID() })).data.quota.used, 1);
  assert.equal((await post({ identity: 'guest', deviceId: guestId, action: 'status' })).data.quota.used, 1);
  assert.equal((await post({ identity: 'guest', deviceId: randomUUID(), action: 'status' })).data.quota.used, 0, 'Guests are explicitly per-device, not fake cross-device accounts');
} finally { Date.now = actualNow; }

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const section = (from, to) => { const start = source.indexOf(from), end = source.indexOf(to, start); assert.ok(start >= 0 && end > start); return source.slice(start, end); };
let context, viewport, cells = new Map(), markup = '';
const noop = () => {};
const root = {
  classList: { add: noop, remove: noop }, contains: node => node?.owner === root,
  get innerHTML() { return markup; },
  set innerHTML(value) {
    markup = value; cells = new Map();
    // Model native scroll reset when the viewport node is replaced.
    viewport = { owner: root, scrollLeft: 0, scrollTop: 0, focus(options) { context.document.activeElement = this; context.focusOptions = options; } };
    for (const match of value.matchAll(/<button[^>]*data-bp-cell="([^"]+)"[^>]*>/g)) {
      const node = { owner: root, dataset: { bpCell: match[1] }, disabled: /\sdisabled(?:\s|>)/.test(match[0]), events: {}, addEventListener(event, handler) { this.events[event] = handler; },
        focus(options) { context.document.activeElement = this; context.focusOptions = options; } };
      cells.set(match[1], node);
    }
  },
  querySelector(selector) {
    if (selector === '.bp-track-viewport') return viewport;
    if (selector.startsWith('[data-bp-cell=')) return cells.get(selector.match(/"([^"]+)"/)[1]);
    return { addEventListener: noop };
  },
  querySelectorAll(selector) {
    if (selector === '[data-bp-claim]') return [...cells.values()].filter(node => !node.disabled).map(node => { node.dataset.bpClaim = node.dataset.bpCell; return node; });
    return [];
  }
};
context = vm.createContext({
  document: { getElementById: id => id === 'battlePass' ? root : null, activeElement: null },
  window: { scrollX: 0, scrollY: 850, scrollTo(options) { this.scrollX = options.left; this.scrollY = options.top; } },
  BATTLE_PASS_SEASON: { tiers: 30, tierXp: 750, name: 'Fixture', price: 100 },
  BATTLE_PASS_REWARDS: Array.from({ length: 30 }, (_, index) => ({ tier: index + 1, free: { type: 'pc', amount: 7 }, premium: { type: 'ticket', amount: 1 } })),
  pass: { xp: 22500, premium: true, claimedFree: [], claimedPremium: [] },
  gameState: { caseTickets: 0 }, currentUser: { balance: 100 }, userInventory: [],
  getBattlePassState: () => context.pass, getRuntimeBattlePass: () => ({ title: 'POTUZHNO PASS', subtitle: 'Fixture' }),
  isRuntimeFeatureEnabled: () => true, escapeHtml: value => value, formatCredits: value => `${value} PC`,
  getCaseTicketCount: () => context.gameState.caseTickets, getSkinImageSrc: skin => skin.img,
  makeDemoItem: skin => ({ ...skin, id: randomUUID() }), roundPc: value => value,
  checkAchievements: noop, saveState: noop, updateBalanceUI: noop, renderInventoryGrid: noop,
  renderProfileInventory: noop, updateAvatarBadge: noop, soundWin: noop, soundCoin: noop, showToast: noop,
  renderGameHub: () => context.renderBattlePass()
});
vm.runInContext('let battlePassExpanded = true;', context);
vm.runInContext(section('function getBattlePassProgress()', 'function loadAccount()'), context);
context.renderBattlePass();
viewport.scrollLeft = 1870; viewport.scrollTop = 13;
context.document.activeElement = cells.get('free:30');
cells.get('free:30').events.click();
assert.equal(viewport.scrollLeft, 1870); assert.equal(viewport.scrollTop, 13);
assert.equal(context.window.scrollY, 850);
assert.equal(context.currentUser.balance, 107); assert.equal(cells.get('free:30').disabled, true);
assert.equal(context.document.activeElement, viewport); assert.equal(context.focusOptions.preventScroll, true);
context.renderBattlePass();
assert.equal(viewport.scrollLeft, 1870, 'A later hub/background render retains the claimed reward position too');
context.claimBattlePassReward('free', 30); assert.equal(context.currentUser.balance, 107);
context.document.activeElement = cells.get('premium:27');
cells.get('premium:27').events.click();
assert.equal(viewport.scrollLeft, 1870); assert.equal(context.gameState.caseTickets, 1);
context.BATTLE_PASS_REWARDS[19].premium = { type: 'skin', skin: { name: 'AWP | Fixture', img: 'fixture.png' } };
context.renderBattlePass(); cells.get('premium:20').events.click();
assert.equal(viewport.scrollLeft, 1870); assert.equal(context.userInventory.length, 1);
context.claimBattlePassReward('premium', 20); assert.equal(context.userInventory.length, 1);
console.log('Reliability passed: atomic shared Steam/Android and Cloud quota, authentication, idempotent retries, migration, UTC reset, stale-save isolation; PASS keeps scroll/focus for PC, tickets and skins.');

// Optional native-browser QA: production renderer/claim code and styles, but
// disposable PC/ticket fixtures only. No saves, login, APIs or player storage.
if (process.argv.includes('--preview')) {
  const { createServer } = await import('node:http');
  const head = readFileSync(new URL('../index.html', import.meta.url), 'utf8').match(/<head>([\s\S]*?)<\/head>/)[1];
  const harness = `
    const BATTLE_PASS_SEASON = { tiers:30, tierXp:750, name:'Тест прокрутки', price:100 };
    const BATTLE_PASS_REWARDS = Array.from({length:30},(_,i)=>({tier:i+1,free:{type:'pc',amount:i+1},premium:{type:'ticket',amount:1}}));
    let battlePassExpanded = true;
    const gameState = {caseTickets:0,battlePass:{xp:22500,premium:true,claimedFree:[],claimedPremium:[]}};
    const currentUser = {balance:100}, userInventory = [];
    const getBattlePassState = () => gameState.battlePass;
    const getRuntimeBattlePass = () => ({title:'POTUZHNO PASS',subtitle:'Тестова копія стрічки — реальний профіль не змінюється.'});
    const isRuntimeFeatureEnabled = () => true;
    const escapeHtml = value => String(value).replace(/[&<>\x22']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\x22':'&quot;',"'":'&#39;'}[ch]));
    const formatCredits = value => value+' PC';
    const getCaseTicketCount = () => gameState.caseTickets;
    const getSkinImageSrc = skin => skin.img;
    const makeDemoItem = skin => ({...skin,id:crypto.randomUUID()});
    const roundPc = value => Math.round(value*100)/100;
    const checkAchievements = () => {}, saveState = () => {}, updateBalanceUI = () => {}, renderInventoryGrid = () => {},
      renderProfileInventory = () => {}, updateAvatarBadge = () => {}, soundWin = () => {}, soundCoin = () => {};
    const renderGameHub = () => renderBattlePass();
    const showToast = text => {document.getElementById('fixtureStatus').textContent=text;};
    ${section('function getBattlePassProgress()', 'function loadAccount()')}
    renderBattlePass();
    document.getElementById('jumpToEnd').onclick = () => {
      const viewport = document.querySelector('.bp-track-viewport');
      viewport.scrollLeft=viewport.scrollWidth;
      document.getElementById('battlePass').scrollIntoView({block:'center',behavior:'instant'});
    };
    document.getElementById('rerenderPass').onclick = () => {renderGameHub();showToast('Панель оновлено — позиція збереглася.');};
  `;
  const page = `<!doctype html><html lang="uk"><head>${head}<title>PASS · тест прокрутки</title></head>
    <body class="pd-rebrand"><header style="position:sticky;top:0;z-index:20;padding:16px;background:#0b121d;border-bottom:1px solid #354154;color:#dbe5f0">Тестова копія PASS · нагороди лише в пам’яті · без змін профілю</header>
    <main style="max-width:1120px;margin:0 auto;padding:18px"><div style="height:420px;padding-top:35px"><h1>Перевірка отримання нагород</h1><p>Перейди до останніх рівнів і натисни «Забрати».</p>
    <button id="jumpToEnd" class="product-action-secondary" style="max-width:340px;margin-top:16px">Перейти до рівнів 25–30</button>
    <button id="rerenderPass" class="product-action-secondary" style="max-width:340px;margin-top:10px">Оновити панель</button></div>
    <section id="battlePass"></section><p id="fixtureStatus" role="status" style="padding:20px;color:#a7f3d0">Нагороди ще не отримані.</p><div style="height:500px"></div></main>
    <script>${harness}</script></body></html>`;
  createServer((request, response) => {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    const cssFile = path === '/css/style.css' ? '../css/style.css' : path === '/css/tailwind.css' ? '../css/tailwind.css' : null;
    response.setHeader('Cache-Control', 'no-store');
    if (cssFile) { response.setHeader('Content-Type', 'text/css'); response.end(readFileSync(new URL(cssFile, import.meta.url))); }
    else if (path === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(page); }
    else { response.writeHead(404); response.end(); }
  }).listen(8791, '127.0.0.1', () => console.log('Disposable PASS preview: http://127.0.0.1:8791/'));
}
