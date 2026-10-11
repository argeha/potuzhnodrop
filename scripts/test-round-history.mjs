import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Only disposable VM fixtures: never load the player's save or transact online.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const extract = (from, to) => {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, from);
  return source.slice(start, end);
};
const noop = () => {};
const nodes = new Map();
const element = id => {
  if (!id) return null;
  if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', checked: id === 'upgraderFastToggle',
    classList: { add: noop, remove: noop }, querySelector: () => null });
  return nodes.get(id);
};
const ctx = vm.createContext({
  Date, Math, ROUND_HISTORY_LIMIT: 60, SELL_RATE: .9,
  document: { getElementById: element, querySelector: () => null },
  cleanText: (value, max = 140) => String(value || '').trim().slice(0, max),
  escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
  formatCredits: value => `${Number(value).toFixed(2)} PC`,
  roundPc: value => Math.round((Number(value) + Number.EPSILON) * 100) / 100,
  getWear: item => item.wear,
  gameState: { rounds: [], stats: { rounds: 0, wins: 0, currentStreak: 0, bestStreak: 0, bestValue: 0 }, daily: {}, weekly: {}, allTime: {} },
  ensureDailyState: noop, ensureWeeklyState: noop, addXp: noop, updateAllTimeOnRound: noop,
  categorizeWeapon: () => 'other', XP_PER_ROUND: 1, XP_WIN_BONUS: 1,
  checkAchievements: noop, saveState: noop, renderGameHub: noop, syncCommunity: noop,
});
vm.runInContext(extract("let roundHistoryMode = 'all';", 'function renderStatsPage('), ctx);
vm.runInContext(extract('function recordRound(', 'function applyTheme('), ctx);
const target = { name: 'AWP | Atheris', price: 30, wear: { code: 'BS' }, phase: '' };
ctx.recordRound({ win: true, target, chance: 30, mode: 'under', inputValue: 10, bonus: 0,
  history: { inputKind: 'balance', inputItems: [], outputItems: [ctx.historySkinSnapshot(target)], balanceDelta: -10 } });
assert.equal(ctx.gameState.stats.rounds, 1);
assert.equal(ctx.gameState.rounds[0].balanceDelta, -10, 'An inventory prize is NOT a PC balance deposit');
let markup = ctx.roundHistoryRowMarkup(ctx.gameState.rounds[0]);
assert.ok(markup.includes('−10.00 PC') && markup.includes('BS') && markup.includes('30.00%'));
assert.ok(!markup.includes('+30.00 PC'));
const legacy = { win: false, mode: 'multi', at: Date.now(), inputValue: 5, targetValue: 12, targetName: '<img src=x onerror=alert(1)>' };
markup = ctx.roundHistoryRowMarkup(legacy);
assert.ok(markup.includes('Не збережено') && markup.includes('&lt;img'));
assert.ok(!markup.includes('>0.00 PC<'), 'Do not invent a balance delta for an old record');
assert.ok(markup.includes('Вартість цілі'));
ctx.appendRoundHistory(legacy);
ctx.appendRoundHistory({ win: true, mode: 'case', targetName: 'Case ×2', targetValue: 10, inputValue: 2, balanceDelta: -2, outputItems: [ctx.historySkinSnapshot(target)] });
ctx.appendRoundHistory({ win: true, mode: 'contract', targetValue: 12, inputValue: 10, balanceDelta: 0 });
ctx.appendRoundHistory({ win: false, mode: 'battle', targetValue: 15, inputValue: 10, balanceDelta: 0 });
ctx.appendRoundHistory({ win: true, mode: 'royale', targetValue: 80, inputValue: 20, balanceDelta: 0 });
assert.equal(ctx.gameState.stats.rounds, 1, 'Adding receipts must not inflate upgrader statistics or rewards');
ctx.setRoundHistoryFilter('mode', 'upgrade');
assert.equal(ctx.getFilteredRoundHistory().length, 2, 'Recognize legacy over/under/multi modes');
ctx.setRoundHistoryFilter('outcome', 'loss');
assert.equal(ctx.getFilteredRoundHistory().length, 1);
ctx.setRoundHistoryFilter('mode', 'case');
assert.equal(ctx.getFilteredRoundHistory().length, 0);
assert.ok(element('profileRoundHistory').innerHTML.includes('записів немає'));
ctx.setRoundHistoryFilter('mode', 'invalid'); ctx.setRoundHistoryFilter('outcome', 'invalid');
assert.equal(ctx.getFilteredRoundHistory().length, 6);
assert.ok(element('statsRecentRounds').innerHTML.includes('Показати ще 5'));
ctx.showMoreRoundHistory();
assert.ok(!element('statsRecentRounds').innerHTML.includes('Показати ще 5'));
assert.equal(element('profileRoundHistory').innerHTML, element('statsRecentRounds').innerHTML);
for (let i = 0; i < 100; i++) ctx.appendRoundHistory({ mode: 'case', win: true, targetName: `Fixture ${i}` });
assert.equal(ctx.gameState.rounds.length, 60);
assert.equal(ctx.gameState.rounds[0].targetName, 'Fixture 99');

// Exercise the actual fast AND animated upgrader settlement, not a copied formula.
Object.assign(ctx, {
  currentUser: { balance: 100 }, userInventory: [], selectedInputMode: 'balance', balanceStake: 10,
  selectedInputSkin: null, selectedTargetSkin: target, multiInputSkins: [], MULTI_INPUT_MIN: 2,
  isRolling: false, pendingWager: null, isCaseOpening: false, isFreeCaseOpening: false, rollMode: 'over',
  getInputVal: () => 10, getTargetVal: () => 30, getWinBonus: () => 0,
  calcChance: () => 30, beginPendingWager: () => 'test', completePendingWager: () => true,
  updateBalanceUI: noop, renderInventoryGrid: noop, renderProfileInventory: noop, updateAvatarBadge: noop,
  renderMultiSlots: noop, renderCanvas: noop, recalculateUpgrade: noop, soundWin: noop, soundLose: noop,
  addActivityEvent: noop, showResultModal: (win, skin, bonus, context) => { ctx.resultContext = context; }, beep: noop, showToast: noop,
  makeDemoItem: skin => ({ ...skin, id: 'won-test', wear: { code: 'BS' } }),
  performance: { now: () => 0 }, setInterval: () => 1, clearInterval: noop, setTimeout: callback => callback(),
  requestAnimationFrame: callback => callback(4000),
});
vm.runInContext(extract('function executeUpgrade()', '/* ===== ПУЛИ ТА ШАНСИ КЕЙСІВ'), ctx);
for (const fast of [true, false]) {
  for (const win of [true, false]) {
    element('upgraderFastToggle').checked = fast;
    ctx.Math = Object.create(Math); ctx.Math.random = () => win ? 0 : .99;
    ctx.currentUser.balance = 100; ctx.userInventory = []; ctx.isRolling = false;
    ctx.executeUpgrade();
    const round = ctx.gameState.rounds[0];
    assert.equal(round.win, win); assert.equal(round.inputKind, 'balance');
    assert.equal(round.balanceDelta, -10); assert.equal(ctx.currentUser.balance, 90);
    assert.equal(ctx.resultContext.balanceDelta, -10, 'The result uses the same frozen receipt as history');
    assert.equal(round.outputItems[0].wear, 'BS');
    assert.equal(ctx.userInventory.length, win ? 1 : 0);
  }
}
console.log('Round history passed: legacy-safe values, true PC deltas, mode/outcome filters, pagination, 60-entry retention, independent stats and fast/animated settlement.');

// A separate, read-only visual fixture. No app.js, localStorage, player data,
// game API, sale buttons or wagering are loaded on this preview origin.
if (process.argv.includes('--preview')) {
  const { createServer } = await import('node:http');
  const demoSkin = { name: 'AWP | Atheris', wear: 'BS', phase: '' };
  const demos = [
    { win: true, mode: 'over', targetName: 'AWP | Atheris', targetValue: 30, inputValue: 10, chance: 30, balanceDelta: -10, inputKind: 'balance', outputItems: [demoSkin] },
    { win: false, mode: 'multi', targetName: 'AK-47 | Crossfade', targetValue: 42.5, inputValue: 12, chance: 25.41, balanceDelta: 0, inputItems: [demoSkin], outputItems: [{ name: 'AK-47 | Crossfade', wear: 'MW' }] },
    { win: true, mode: 'case', targetName: 'Farm Rush · ×2', targetValue: 13, inputValue: 8, balanceDelta: -8, outputItems: [demoSkin, { name: 'FAMAS | Half Sleeve', wear: 'FN' }] },
    { win: true, mode: 'battle', targetName: 'AWP | Atheris vs Бот', targetValue: 20, inputValue: 10, chance: 50, balanceDelta: 0, inputItems: [demoSkin], outputItems: [demoSkin] },
    { win: true, mode: 'contract', targetName: '★ Bayonet | Doppler', targetValue: 60, inputValue: 50, balanceDelta: 0, outputItems: [{ name: '★ Bayonet | Doppler', wear: 'FN', phase: 'Phase 2' }] },
  ];
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const rows = demos.map((round, i) => ctx.roundHistoryRowMarkup({ ...round, at: Date.now() - i * 60_000 })).join('');
  const page = `<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Історія · демонстраційні дані</title><style>${css}</style><body class="pd-rebrand" style="margin:0;padding:24px;background:#070b12;color:#eef2f7;font-family:Arial,sans-serif"><main style="max-width:760px;margin:auto"><h1 style="font-size:24px">Історія раундів</h1><p style="color:#aab8ca;font-size:12px">Демонстраційні дані · жодних змін у твоєму акаунті</p><div style="display:grid;gap:10px;margin-top:20px">${rows}</div></main></body></html>`;
  createServer((request, response) => {
    if (request.url !== '/') { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(page);
  }).listen(8788, '127.0.0.1', () => console.log('Read-only history visual fixture: http://127.0.0.1:8788/'));
}
