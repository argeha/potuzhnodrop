import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import worker, { PotuzhnoState } from '../src/worker.mjs';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = (from, to) => {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, from);
  return source.slice(start, end);
};
const nodes = new Map();
const node = id => { if (!nodes.has(id)) nodes.set(id, { textContent: '' }); return nodes.get(id); };
const stored = new Map(), messages = [];
let saves = 0, level = 27, runtimeTaskMultiplier = 1, earnedXp = 0;
const ctx = vm.createContext({
  document: { getElementById: node }, currentUser: { balance: 100 }, gameState: { prestige: 0 },
  STORAGE: { topup: 'fixture-topup', game: 'fixture-game' },
  localStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
  getPlayerLevel: () => level, roundPc: amount => Math.round(amount * 100) / 100,
  getRuntimeEconomy: () => ({ taskRewardMultiplier: runtimeTaskMultiplier }),
  getTodayKey: () => '2026-10-17', ensureDailyState: () => {}, ensureWeeklyState: () => {},
  addXp: amount => { earnedXp += amount; }, XP_DAILY_TASK: 25, XP_WEEKLY_TASK: 50,
  renderGameHub: () => {}, soundCoin: () => {}, setTimeout: callback => callback(),
  PRESTIGE_LEVEL_REQUIRED: 30, window: { confirm: () => true }, closeModal: () => {}, soundWin: () => {},
  formatCredits: amount => `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} PC`,
  updateBalanceUI: () => {}, saveState: () => { saves++; }, checkAchievements: () => {},
  showToast: (message, type) => messages.push({ message, type })
});
vm.runInContext(section('const ECONOMY_TASK_REWARD_MULTIPLIER', '// Return rates'), ctx);
vm.runInContext(section('async function openRewardedAd()', 'function estimateInventoryPrice('), ctx);
const policy = JSON.parse(vm.runInContext('JSON.stringify({ amount:REWARDED_COIN_AMOUNT, limit:REWARDED_DAILY_LIMIT, milestones:REFERRAL_MILESTONES })', ctx));
assert.equal(policy.amount, 25);
assert.equal(policy.limit, null, 'No application-level daily advertisement cap');
assert.deepEqual(policy.milestones.map(entry => entry.ownerReward), [20, 30, 50, 100]);
assert.equal(policy.milestones.reduce((sum, entry) => sum + entry.ownerReward, 0), 200);
ctx.updateTopupUI();
assert.equal(node('topupAdRewardLabel').textContent, '+25 PC · без ліміту');
assert.equal(node('topupReferralRewardLabel').textContent, '200 PC+');
assert.equal(node('topupLevelRewardLabel').textContent, '+50 PC');
assert.ok(html.includes('id="topupAdRewardLabel"') && html.includes('+25 PC · без ліміту'));
assert.ok(html.includes('id="rewardedAdStatus"') && html.includes('Рекламний слот ще не підключено.'));
assert.ok(html.includes('id="profileReferralReward">200 PC'));
assert.ok(!html.includes('+0.10 PC') && !html.includes('20/день') && !html.includes('170+ PC'));
for (let count = 0; count < 50; count++) await ctx.openRewardedAd();
assert.equal(messages.length, 50, 'No legacy twenty-click cap');
assert.equal(ctx.currentUser.balance, 100, 'A click or unavailable ad can never mint PC');
assert.equal(stored.size, 0); assert.equal(saves, 0);
assert.ok(messages.every(entry => entry.type === 'info' && entry.message.includes('+25 PC')
  && entry.message.includes('не підключено') && entry.message.includes('не нараховуються')));
ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 150);
ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 150, 'Repeated clicks cannot claim the same level');
// Re-evaluate the actual functions to model a reload using the saved receipt.
vm.runInContext(section('function topupLevelReward()', 'function doPrestige()'), ctx);
ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 150, 'A reload does not replay the level reward');
level = 28; ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 200, 'The next earned level pays exactly 50 PC');
level = 27; ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 200, 'A lower level cannot bypass the high-water mark');
ctx.gameState.prestige = 1; level = 1; ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 200, 'A prestige reset is not an earned level');
level = 2; ctx.topupLevelReward(); ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 250, 'New levels in a new prestige pay once');
ctx.gameState.prestige = 0; level = 28; ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 250, 'Returning to a previously claimed prestige cannot replay a reward');
stored.set('fixture-topup', JSON.stringify({levelClaimed:28}));
ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 250, 'Legacy level receipts are not paid again at the higher amount');
level = 29; ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 300, 'The next unclaimed level receives the new amount after migration');
stored.set('fixture-topup', JSON.stringify({levelClaimed:30}));
level = 30; ctx.doPrestige(); level = 2; ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 350, 'Prestige migrates legacy receipts before reset, so new levels are not blocked');
assert.equal(JSON.parse(stored.get('fixture-topup')).levelClaims['0'], 30);
ctx.topupLevelReward();
assert.equal(ctx.currentUser.balance, 350);

// Exercise the real task definitions, selection, reward math and claim guards.
vm.runInContext(section('function economyReward(', 'const FREE_CASE_COOLDOWN'), ctx);
vm.runInContext(section('const TASK_POOL = [', 'const ACHIEVEMENT_DEFINITIONS = ['), ctx);
vm.runInContext(section('function createDefaultDaily()', 'function createDefaultPowerRun()'), ctx);
vm.runInContext(section('function claimDailyTask(', 'function renderWeeklyTasks()'), ctx);
vm.runInContext(section('function claimWeeklyTask(', 'function renderAchievements()'), ctx);
assert.equal(vm.runInContext('TASK_COIN_REWARD_MULTIPLIER', ctx), 5);
assert.equal(ctx.economyReward(100), 0.4, 'Unrelated achievements and collection math must not be boosted');
const taskRanges = JSON.parse(vm.runInContext(`JSON.stringify({
  daily:TASK_POOL.map(task=>taskCoinReward(task.reward)),
  weekly:WEEKLY_TASK_POOL.map(task=>taskCoinReward(task.reward,WEEKLY_TASK_MIN_REWARD))
})`, ctx));
assert.equal(Math.min(...taskRanges.daily), 1); assert.equal(Math.max(...taskRanges.daily), 19);
assert.equal(Math.min(...taskRanges.weekly), 14); assert.equal(Math.max(...taskRanges.weekly), 30);
runtimeTaskMultiplier = 1.5;
assert.equal(ctx.taskCoinReward(100), 3, 'The published admin multiplier is applied once, not bypassed or doubled');
runtimeTaskMultiplier = 1;
const dailyIds = ['catalog_view', 'inventory_view', 'odds_view', 'cases_1', 'rolls_1'];
ctx.gameState.daily = { ...ctx.createDefaultDaily(), taskIds: dailyIds, taskTier: 'starter' };
ctx.gameState.weekly = ctx.createDefaultWeekly();
const selectedBefore = ctx.getDailyTasks();
assert.deepEqual(Array.from(selectedBefore, task => task.id), dailyIds, 'A reward increase must not reroll saved tasks');
const balanceBeforeTasks = ctx.currentUser.balance;
ctx.claimDailyTask('catalog_view'); ctx.claimWeeklyTask(ctx.getWeeklyTasks()[0].id);
assert.equal(ctx.currentUser.balance, balanceBeforeTasks, 'Incomplete missions cannot be claimed');
ctx.gameState.daily.catalogViews = 1;
ctx.claimDailyTask('catalog_view'); ctx.claimDailyTask('catalog_view');
assert.equal(ctx.currentUser.balance, balanceBeforeTasks + 1, 'Completed starter mission pays the boosted amount once');
assert.equal(earnedXp, 25, 'Task coin boosts must not multiply XP');
assert.deepEqual(Array.from(ctx.gameState.daily.claimed), ['catalog_view']);
for (const key of Object.keys(ctx.gameState.weekly)) {
  if (typeof ctx.gameState.weekly[key] === 'number') ctx.gameState.weekly[key] = 1_000_000;
}
const weekly = ctx.getWeeklyTasks()[0];
ctx.claimWeeklyTask(weekly.id); ctx.claimWeeklyTask(weekly.id);
assert.equal(ctx.currentUser.balance, balanceBeforeTasks + 1 + weekly.reward, 'Weekly missions pay the shown boosted amount once');
assert.equal(earnedXp, 75);
assert.deepEqual(Array.from(ctx.gameState.weekly.claimed), [weekly.id]);
ctx.gameState = JSON.parse(JSON.stringify(ctx.gameState));
ctx.claimDailyTask('catalog_view'); ctx.claimWeeklyTask(weekly.id);
assert.equal(ctx.currentUser.balance, balanceBeforeTasks + 1 + weekly.reward, 'Restored claim markers prevent re-paying completed missions');
assert.equal(earnedXp, 75);

// All identities, balances and receipts below are isolated test fixtures.
class MemoryStorage {
  values = new Map(); queue = Promise.resolve();
  async get(key) { return structuredClone(this.values.get(key)); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async transaction(fn) {
    const operation = this.queue.then(async () => {
      const copy = new Map(structuredClone([...this.values]));
      const result = await fn({ get: async key => structuredClone(copy.get(key)),
        put: async (key, value) => { copy.set(key, structuredClone(value)); } });
      this.values = copy; return result;
    });
    this.queue = operation.catch(() => {}); return operation;
  }
}
const createObject = () => {
  const storage = new MemoryStorage();
  const object = new PotuzhnoState({ storage }, {});
  object.indexGameProfile = async () => {};
  return { storage, object };
};
const internal = async (object, path, body) => {
  const response = await object.fetch(new Request(`https://fixture.invalid/__internal/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }));
  return { status: response.status, data: await response.json() };
};
const owner = '76561198000000001', recruit = '76561198000000002';
const ownerProfile = createObject(), recruitIdentity = createObject();
const actualNow = Date.now;
const startedAt = Date.parse('2026-10-17T12:00:00Z');
let clock = startedAt;
Date.now = () => clock;
try {
  await ownerProfile.storage.put('steam-account', { steamId: owner, revision: 1,
    payload: { balance: 100, gameState: {} } });
  assert.equal((await internal(recruitIdentity.object, 'referral-identity', {
    action: 'lock', steamId: owner, referrerAccountId: owner
  })).status, 400, 'Self-invites remain rejected');
  const lock = { action: 'lock', steamId: recruit, referrerAccountId: owner };
  assert.equal((await internal(recruitIdentity.object, 'referral-identity', lock)).data.locked, true);
  assert.equal((await internal(recruitIdentity.object, 'referral-identity', lock)).data.duplicate, true);
  assert.equal((await internal(recruitIdentity.object, 'referral-identity', {
    ...lock, referrerAccountId: '76561198000000003'
  })).status, 409, 'One Steam identity cannot be assigned to another inviter');
  const progress = () => internal(recruitIdentity.object, 'referral-identity', {
    action: 'claim-progress', steamId: recruit, progress: { level: 30, prestige: 1, totalXp: 0 }
  });
  assert.deepEqual((await progress()).data.claims, [], 'An invite link alone pays no milestones');
  const ages = [1, 7, 21, 30];
  for (const [index, milestone] of policy.milestones.entries()) {
    clock = startedAt + ages[index] * 24 * 60 * 60_000;
    const claims = (await progress()).data.claims;
    assert.equal(claims.length, 1, 'Age/progression gates and previous acknowledgements are preserved');
    assert.equal(claims[0].id, milestone.id);
    assert.equal(claims[0].ownerReward, milestone.ownerReward, 'Client and actual server payout must agree');
    assert.equal(claims[0].recruitReward, milestone.recruitReward, 'Recruit bonuses remain unchanged');
    const creditBody = { accountId: owner, referredSteamId: recruit,
      claim: { ...claims[0], ownerReward: 999999 } };
    const calls = await Promise.all(Array.from({ length: 8 }, () =>
      internal(ownerProfile.object, 'referral-credit', creditBody)));
    assert.equal(calls.filter(result => result.data.credited).length, 1, 'Concurrent delivery pays each milestone once');
    assert.equal(calls.find(result => result.data.credited).data.ownerReward, milestone.ownerReward,
      'The server ignores caller-supplied fixed reward amounts');
    assert.equal(calls.filter(result => result.data.duplicate).length, 7);
    await internal(recruitIdentity.object, 'referral-identity', { action: 'ack', steamId: recruit,
      claimId: milestone.id, ownerCredited: true, recruitCredited: true });
  }
  const completed = await ownerProfile.storage.get('steam-account');
  assert.equal(completed.payload.balance, 300, 'One completed referral program pays exactly 200 PC');
  assert.equal(completed.payload.gameState.referrals.totalDividends, 200);
  assert.equal(completed.payload.gameState.referrals.totalPartners, 1);
  assert.deepEqual((await progress()).data.claims, []);

  const legacy = createObject();
  await legacy.storage.put('steam-account', { steamId: owner, revision: 10, payload: {
    balance: 170, gameState: { referrals: { dividendReceipts: policy.milestones.map(entry => `${recruit}:${entry.id}`), totalDividends: 170 } }
  } });
  for (const claim of policy.milestones) {
    const result = await internal(legacy.object, 'referral-credit', { accountId: owner, referredSteamId: recruit, claim });
    assert.equal(result.data.duplicate, true, 'Updating amounts must never replay already-paid legacy milestones');
  }
  assert.equal((await legacy.storage.get('steam-account')).payload.balance, 170);
} finally { Date.now = actualNow; }

const publicResponse = await worker.fetch(new Request('https://fixture.invalid/__internal/referral-credit', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId: owner, referredSteamId: recruit, claim: policy.milestones[0] })
}), { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } });
assert.equal(publicResponse.status, 404, 'The browser cannot call internal reward-credit routes');
console.log('Bonus rewards passed: 50 PC level claims, reload/legacy/prestige guards, 5x daily/weekly coins with unchanged selection/XP/claim markers, 200 PC server milestones, Steam identity locks and no click-to-mint.');

// Optional visual QA uses the actual modal, constants, functions and styles,
// but only disposable in-memory data. No real saves, auth, ads or payouts.
if (process.argv.includes('--preview')) {
  const { createServer } = await import('node:http');
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const start = html.indexOf('<div id="topupModal"');
  const modal = html.slice(start, html.indexOf('\n', start));
  const setup = `
    const currentUser={balance:100};const gameState={prestige:0};const STORAGE={topup:'test-only'};const memory=new Map();
    const fixtureStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
    const getPlayerLevel=()=>27,roundPc=value=>Math.round(value*100)/100;
    const formatCredits=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:2})+' PC';
    const updateBalanceUI=()=>{},saveState=()=>{},checkAchievements=()=>{};
    const showToast=message=>{document.getElementById('fixtureStatus').textContent=message};
    const closeModal=()=>{};
    const topupShareSite=()=>showToast('Тестова копія: запрошення не надсилаються.');
    ${section('const REWARDED_COIN_AMOUNT', '// Return rates')}
    ${section('async function openRewardedAd()', 'function doPrestige()').replaceAll('localStorage.', 'fixtureStorage.')}
    updateTopupUI();document.getElementById('topupModal').classList.remove('hidden');
    document.getElementById('topupModal').classList.add('flex');
  `;
  const page = `<!doctype html><html lang="uk"><head>${head}<title>PC · перевірка бонусів</title></head>
    <body class="pd-rebrand"><div style="position:fixed;top:4px;left:8px;right:8px;z-index:100;color:#93c5fd;font:11px Arial;text-align:center">Тестова копія · без змін профілю</div>
    ${modal}<p id="fixtureStatus" role="status" style="position:fixed;bottom:12px;left:12px;right:12px;z-index:100;color:#cbd5e1;font:12px Arial;text-align:center"></p>
    <script>${setup}</script></body></html>`;
  createServer((request, response) => {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    if (path === '/') { response.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); response.end(page); return; }
    if (['/css/style.css','/css/tailwind.css'].includes(path)) {
      response.writeHead(200, {'Content-Type':'text/css'}); response.end(readFileSync(new URL(`..${path}`, import.meta.url))); return;
    }
    response.writeHead(404); response.end('Not found');
  }).listen(8792, '127.0.0.1', () => console.log('Bonus modal fixture: http://127.0.0.1:8792'));
}
