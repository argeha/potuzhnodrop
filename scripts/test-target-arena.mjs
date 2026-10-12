import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

// Exercise the production arena in isolation: no player storage, network or PC.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const extract = (from, to) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Missing section: ${from}`);
  return source.slice(start, end);
};
const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) {
    const classes = new Set();
    elements.set(selector, {
      innerHTML: '', style: {}, dataset: {}, attributes: {}, handlers: {},
      clientWidth: 1000, clientHeight: 272, offsetWidth: 100,
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        toggle(name, active) { active ? classes.add(name) : classes.delete(name); },
        contains: name => classes.has(name)
      },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, handler) { this.handlers[name] = handler; },
      focus() { context.focused = selector; },
      scrollIntoView(options) { context.scrolled = { selector, ...options }; },
      querySelector: element,
      querySelectorAll: selector => selector === '[data-arena-stake]' ? stakes : selector === '[data-arena-payout]' ? payoutCells : []
    });
  }
  return elements.get(selector);
};
const stakes = [25, 100, 250].map(stake => { const node = element(`[data-arena-stake="${stake}"]`); node.dataset.arenaStake = String(stake); return node; });
const payoutCells = [0, 5, 9, 13, 17, 21].map(score => { const node = element(`[data-arena-payout="${score}"]`); node.dataset.arenaPayout = String(score); return node; });
const timers = new Map();
let nextTimer = 0;
const context = vm.createContext({
  document: { getElementById: element },
  window: { setTimeout: (fn, ms) => { timers.set(++nextTimer, { fn, ms }); return nextTimer; }, clearTimeout: id => timers.delete(id) },
  Date: { now: () => context.clock }, clock: 1_000_000,
  Math, getTodayKey: () => context.day, getTodayUtc: () => context.day, day: '2026-10-11',
  account: { presenceId: randomUUID() }, hasSteamIdentity: () => false, isCloudProfile: () => false,
  makeUuid: randomUUID, escapeHtml: value => value,
  requestJson: async (_url, options) => {
    const body = JSON.parse(options.body);
    context.networkCalls++;
    if (context.networkFailure) throw new Error('Offline');
    if (context.serverDay !== context.day) { context.serverDay = context.day; context.serverUsed = 0; context.serverAttempts.clear(); }
    const quota = () => ({ day: context.day, limit: 10, used: context.serverUsed, remaining: 10 - context.serverUsed, resetAt: context.clock + 86_400_000 });
    if (body.action === 'start') {
      context.attemptIds.push(body.attemptId);
      if (!context.serverAttempts.has(body.attemptId)) {
        if (context.serverUsed === 10) { const error = new Error('Daily limit'); error.status = 429; error.quota = quota(); throw error; }
        context.serverUsed++; context.serverAttempts.add(body.attemptId);
      }
      if (context.lostResponse) { context.lostResponse = false; throw new Error('Lost server reply'); }
    }
    return { allowed: true, attemptId: body.attemptId, quota: quota() };
  },
  serverDay: '2026-10-11', serverUsed: 0, networkCalls: 0, networkFailure: false,
  serverAttempts: new Set(), lostResponse: false, attemptIds: [],
  getActiveSeason: () => context.season,
  clampNumber: (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback,
  roundPc: value => Math.round(value * 100) / 100,
  formatCredits: value => `${Number(value).toFixed(2)} PC`,
  MAX_STORED_BALANCE: 1_000_000, DEMO_STARTING_BALANCE: 12,
  gameState: {}, currentUser: { balance: 100 },
  saveState: () => context.saves++, updateBalanceUI: () => context.balanceUpdates++,
  showToast: message => { context.toast = message; }, openModal: id => { context.modal = id; },
  recordPulseCircuitStep: () => context.eventCalls++,
  awardHalloweenProgress: () => { context.eventCalls++; return { pumpkins: 0, coins: 0 }; },
  awardWinterShards: () => { context.eventCalls++; return 0; },
  renderSeasonalEvent() {}, soundWin() {}, soundLose() {}, beep() {},
  saves: 0, balanceUpdates: 0, eventCalls: 0
});
vm.runInContext(extract('const TARGET_ARENA_STAKES =', 'let powerRunExpanded ='), context);
vm.runInContext('let targetArenaExpanded = false;', context);
vm.runInContext(extract('function createDefaultTargetArena()', 'function createDefaultAllTime()'), context);
vm.runInContext(extract('function getTargetArenaIdentity()', 'function renderLegacyTargetArena()'), context);
vm.runInContext(extract('function targetArenaPayoutMarkup(', 'function getBattlePassProgress()'), context);
// Rendering fixtures never launch background network work; admissions still
// execute the production async request/validation code above.
context.refreshTargetArenaQuota = () => null;
const state = () => context.getTargetArenaState();
const session = () => vm.runInContext('targetArenaSession', context);
const reset = balance => {
  vm.runInContext('targetArenaSession = null; targetArenaLastResult = null; targetArenaExpanded = true;', context);
  vm.runInContext('targetArenaStartPending = false; targetArenaPendingAttempt = null;', context);
  timers.clear(); context.currentUser.balance = balance; context.gameState = { targetArena: context.createDefaultTargetArena() };
  context.saves = context.eventCalls = context.balanceUpdates = 0;
  context.serverUsed = 0; context.serverDay = context.day; context.networkFailure = false; context.networkCalls = 0;
  context.serverAttempts.clear(); context.lostResponse = false; context.attemptIds = [];
  context.applyTargetArenaQuota({quota: {day: context.day,limit: 10,used: 0,remaining: 10,resetAt: context.clock + 86_400_000}},context.getTargetArenaIdentity());
};

// Every boundary uses points, not hit count; profitable tiers are genuine gains.
for (const [score, multiplier] of [[0, 0], [4, 0], [5, .1], [8, .1], [9, .3], [12, .3], [13, 1], [16, 1], [17, 1.25], [20, 1.25], [21, 1.5], [999, 1.5]]) {
  assert.equal(context.getTargetArenaPayout(score).multiplier, multiplier);
}
for (const [score, expected] of [[4, 75], [5, 77.5], [9, 82.5], [13, 100], [17, 106.25], [21, 112.5]]) {
  reset(100);
  await context.startTargetArena(25);
  assert.equal(context.currentUser.balance, 75);
  const active = session();
  await context.startTargetArena(250);
  assert.equal(session(), active, 'Do not double-charge an active round');
  active.score = score; active.hits = 7; active.maxStreak = 4;
  context.finishTargetArena();
  assert.equal(context.currentUser.balance, expected);
  assert.equal(state().rounds, 1);
  assert.equal(state().dailyRounds, 1);
  assert.equal(state().bestScore, score);
  context.finishTargetArena();
  assert.equal(context.currentUser.balance, expected, 'Settlement must be idempotent');
}

reset(4.01);
context.renderTargetArena();
assert.ok(element('targetArena').innerHTML.includes('Бракує 20.99 PC'));
assert.ok(/data-arena-start disabled/.test(element('targetArena').innerHTML));
await context.startTargetArena(25);
assert.equal(session(), null);
assert.equal(state().dailyRounds, 0, 'Insufficient funds do not use a daily attempt');
assert.equal(context.saves, 0);
stakes[1].handlers.click();
assert.ok(element('targetArena').innerHTML.includes('Бракує 95.99 PC'));
assert.ok(element('targetArena').innerHTML.includes('aria-pressed="true" class="is-selected">100.00 PC'));
assert.ok(context.targetArenaPayoutMarkup(100).includes('+50.00 PC чистими'));
element('[data-arena-earn]').handlers.click();
assert.equal(context.modal, 'topupModal');

reset(100);
for (let attempt = 0; attempt < 10; attempt++) {
  await context.startTargetArena(25);
  session().score = 21;
  context.finishTargetArena();
}
assert.equal(state().dailyRounds, 10);
assert.equal(state().rounds, 10);
assert.equal(context.currentUser.balance, 225);
context.gameState = JSON.parse(JSON.stringify(context.gameState));
assert.equal(state().dailyRounds, 10, 'Reloading saved progress must not reset the daily cap');
await context.startTargetArena(25);
assert.equal(session(), null, 'The eleventh paid attempt must be rejected before charging');
assert.equal(context.currentUser.balance, 225);
assert.ok(element('targetArena').innerHTML.includes('10 спроб використано'));

const beforePractice = JSON.stringify(context.gameState);
const beforeEvents = context.eventCalls;
const beforeSaves = context.saves;
await context.startTargetArena(250, true);
assert.equal(session().stake, 0);
session().score = 999; session().hits = 100; session().maxStreak = 100;
context.finishTargetArena();
assert.equal(context.currentUser.balance, 225);
assert.equal(JSON.stringify(context.gameState), beforePractice, 'Practice cannot change records or paid progress');
assert.equal(context.eventCalls, beforeEvents, 'Practice cannot farm seasonal rewards');
assert.equal(context.saves, beforeSaves, 'Practice must not save or sync player progress');
assert.ok(context.targetArenaResultMarkup().includes('БЕЗ PC І НАГОРОД'));
context.day = '2026-10-12';
assert.equal(state().dailyRounds, 0);
assert.equal(state().rounds, 10, 'Daily reset preserves lifetime statistics');
await context.startTargetArena(25);
assert.equal(state().dailyRounds, 1);
assert.equal(context.currentUser.balance, 200);

// Existing profiles migrate without losing historical scores or money totals.
reset(100);
context.gameState.targetArena = { rounds: 9, bestScore: 28, totalSpent: 300, totalPayout: 250, lastPlayedAt: 123 };
assert.equal(state().bestScore, 28);
assert.equal(state().rounds, 9);
assert.equal(state().totalPayout, 250);
assert.equal(state().dailyRounds, 0);

// Keep season assets and scoring. Exercise the live hit/decoy feedback in memory.
for (const [kind, key] of [[undefined, 'zero-sight'], ['halloween', 'nightfall'], ['winter', 'icewire']]) {
  context.season = kind ? { kind } : null;
  assert.equal(context.getTargetArenaTheme().key, key);
}
context.season = null;
reset(0);
let decoy = false;
context.getTargetArenaDescriptor = () => ({key: decoy ? 'decoy' : 'elite', decoy, depth: {key:'far',label:'ДАЛЬНЯ ЛІНІЯ',scale:.4,minX:.64,maxX:.88,minY:.17,maxY:.53,nextMs:680},asset:'fixture.png',label:'Fixture',icon:'fa-bullseye',points:4,bonusMs:390});
await context.startTargetArena(25, true);
assert.equal(context.scrolled.selector, 'targetArena');
assert.equal(context.scrolled.block, 'start', 'Keep the timer below the sticky header at launch');
element('#targetArenaTarget').handlers.click();
assert.equal(session().score, 4);
assert.equal(session().streak, 1);
assert.equal(session().bonusMs, 390);
assert.equal(element('#targetArenaScore').textContent, '4');
assert.equal(element('#targetArenaHits').textContent, 'Влучань: 1');
assert.equal(element('#targetArenaMilestone').textContent, 'Очок до 10%: 1');
assert.equal(element('#targetArenaReturn').textContent, 'Без PC, XP та сезонних нагород');
decoy = true;
const showNext = [...timers.values()].find(timer => timer.ms === 125);
assert.ok(showNext);
showNext.fn();
element('#targetArenaTarget').handlers.click();
assert.equal(session().score, 4);
assert.equal(session().streak, 0);
assert.equal(session().decoys, 1);
context.clock += 20_000;
[...timers.values()].find(timer => timer.ms === 60).fn();
assert.equal(session(), null);
assert.equal(context.currentUser.balance, 0);
// Server rejection/network failure never charges PC or falls back to local rewards.
reset(100); context.networkFailure = true;
await context.startTargetArena(25);
assert.equal(session(), null); assert.equal(context.currentUser.balance, 100); assert.equal(context.saves, 0);
const offlineCalls = context.networkCalls;
await context.startTargetArena(25, true); context.finishTargetArena();
assert.equal(context.networkCalls, offlineCalls, 'Practice needs no server permission');
assert.equal(context.currentUser.balance, 100);
reset(100); context.serverUsed = 10;
context.gameState.targetArena.dailyRounds = 0;
await context.startTargetArena(25);
assert.equal(session(), null); assert.equal(context.currentUser.balance, 100, 'A stale/local counter cannot bypass server admission');
assert.ok(element('targetArena').innerHTML.includes('10 спроб використано'));

// Multiple clicks while the server request is pending consume/charge once.
reset(100);
const pendingStart = context.startTargetArena(25);
await context.startTargetArena(250);
assert.equal(context.currentUser.balance, 100, 'PC stays intact before server confirmation');
await pendingStart;
assert.equal(context.serverUsed, 1); assert.equal(context.currentUser.balance, 75);
session().score = 0; context.finishTargetArena();
reset(100); context.lostResponse = true;
await context.startTargetArena(25);
assert.equal(context.serverUsed, 1); assert.equal(context.currentUser.balance, 100);
assert.equal(session(), null);
await context.startTargetArena(25);
assert.equal(context.serverUsed, 1, 'Retrying a lost reply must reuse the same server admission');
assert.equal(context.attemptIds[0], context.attemptIds[1]);
assert.equal(context.currentUser.balance, 75);
session().score = 0; context.finishTargetArena();
console.log('Arena regressions passed: server-first admission, offline safety, once-only charges, payouts, daily reset, preserved records, practice and seasonal scoring.');
