import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extract = (from, to) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Missing source section: ${from}`);
  return source.slice(start, end);
};
const stored = new Map();
const elements = new Map();
const element = id => {
  if (!elements.has(id)) {
    const classes = new Set();
    elements.set(id, {
      id, attributes: {}, tabIndex: 0,
      setAttribute(name, value) { this.attributes[name] = value; },
      classList: { add: name => classes.add(name), toggle(name, value) { value ? classes.add(name) : classes.delete(name); }, contains: name => classes.has(name) },
      focus() { context.focusedId = id; }
    });
  }
  return elements.get(id);
};
const context = vm.createContext({
  localStorage: { setItem: (key, value) => stored.set(key, value) },
  STORAGE: { game: 'test-game' },
  getTodayKey: () => '2026-10-11',
  economyReward: value => value,
  getPlayerLevel: () => context.playerLevel,
  ensureDailyState: () => {},
  updateTaskRewardSignal: () => { context.signalUpdates++; },
  document: { getElementById: element, querySelectorAll: () => [] },
  getCaseCost: () => context.caseCost,
  getCaseTicketCount: () => context.tickets,
  getVisibleCaseEntries: () => [],
  getCaseCollectionTrophyCount: () => 0,
  isRuntimeFeatureEnabled: () => true,
  formatCredits: value => `${Number(value).toFixed(2)} PC`,
  setCaseMultiplier: value => { context.multiplier = value; },
  setCaseTicketMode: value => { context.ticketMode = value; },
  openPowerCase: async id => { context.currentActiveCaseId = id; element('caseReelModal').classList.add('flex'); },
  openModal: id => { context.openedModal = id; },
  roundPc: value => Math.round(value * 100) / 100,
  currentUser: { balance: 4.01 },
  playerLevel: 2, caseCost: 5.08, tickets: 0, signalUpdates: 0
});
vm.runInContext(extract('const TASK_POOL = [', 'const WEEKLY_TASK_POOL = ['), context);
vm.runInContext(extract('function createDefaultDaily()', 'function createDefaultWeekly()'), context);
vm.runInContext(extract('function getCaseAvailability(', 'async function openCatalogCase('), context);
vm.runInContext(extract('async function openCatalogCase(', 'function renderCaseButtons()'), context);
vm.runInContext(extract('function setCaseDetailsTab(', 'function updateCaseDetailsAction('), context);

const resetDaily = () => {
  context.gameState = { daily: context.createDefaultDaily(), stats: { rounds: 0, cases: 0 }, allTime: { rounds: 0, cases: 0 } };
};
const ids = tasks => Array.from(tasks, task => task.id);
resetDaily();
const starterIds = ['catalog_view', 'inventory_view', 'odds_view', 'cases_1', 'rolls_1'];
assert.deepEqual(ids(context.getDailyTasks()), starterIds);
assert.equal(context.gameState.daily.taskTier, 'starter');
assert.deepEqual(JSON.parse(stored.get('test-game')).daily.taskIds, starterIds);
context.gameState.allTime.rounds = 100;
context.playerLevel = 20;
assert.deepEqual(ids(context.getDailyTasks()), starterIds, 'Do not reroll tasks after progression');
context.recordStarterTaskVisit('catalogViews');
context.recordStarterTaskVisit('catalogViews');
context.recordStarterTaskVisit('unrecognizedField');
assert.equal(context.signalUpdates, 1);
assert.equal(context.gameState.daily.catalogViews, 1);
assert.equal(context.currentUser.balance, 4.01, 'Visits do not claim rewards automatically');

resetDaily();
const regularIds = ids(context.getDailyTasks());
assert.ok(regularIds.every(id => !starterIds.includes(id) || id === 'cases_1'));
assert.equal(context.gameState.daily.taskTier, 'regular');
assert.equal(new Set(regularIds).size, 5);

resetDaily();
context.playerLevel = 2;
context.gameState.daily.claimed = [regularIds[0]];
assert.deepEqual(ids(context.getDailyTasks()), regularIds, 'Preserve legacy claimed tasks');
resetDaily();
for (const key of Object.keys(context.gameState.daily)) {
  if (typeof context.gameState.daily[key] === 'number') context.gameState.daily[key] = 10000;
}
assert.deepEqual(ids(context.getDailyTasks()), regularIds, 'Preserve earned, unclaimed legacy tasks');

let availability = context.getCaseAvailability('farm');
assert.equal(availability.available, false);
assert.equal(availability.missing, 1.07);
context.currentUser.balance = 5.08;
assert.equal(context.getCaseAvailability('farm').available, true);
context.currentUser.balance = 0;
context.tickets = 1;
assert.equal(context.getCaseAvailability('farm').useTicket, true);
assert.equal(context.getCaseAvailability('farm').available, true);
context.multiplier = 5;
await context.openCatalogCase('farm');
assert.equal(context.multiplier, 1, 'A single-ticket action must not retain a previous 5x selection');
assert.equal(context.ticketMode, true);
context.caseCost = 0;
assert.equal(context.getCaseAvailability('farm').available, false, 'Tickets cannot bypass missing prices');
context.currentUser = null;
context.tickets = 0;
context.caseCost = 5.08;
assert.equal(context.getCaseAvailability('farm').balance, 0);
await context.openCatalogCase('farm');
assert.equal(context.openedModal, 'topupModal');

context.currentPage = 'case';
context.currentCaseCategory = 'all';
context.completeSkinCatalogReady = false;
context.loadCompleteSkinCatalog = () => {
  context.completeSkinCatalogReady = true;
  context.renderCaseCatalog();
  return Promise.resolve();
};
context.renderCaseCatalog();
await Promise.resolve();
assert.ok(!element('casesCatalogGrid').innerHTML.includes('Готуємо'), 'Cached completion must not be overwritten by loading markup');
assert.equal(element('caseCatalogCount').textContent, '0');
context.completeSkinCatalogReady = false;
context.loadCompleteSkinCatalog = () => Promise.resolve();
context.renderCaseCatalog();
await Promise.resolve();
assert.ok(element('casesCatalogGrid').innerHTML.includes('Спробувати ще раз'), 'Failed catalogue load must offer a retry');

context.setCaseDetailsTab('stats');
assert.equal(element('caseTabStats').attributes['aria-selected'], 'true');
assert.equal(element('caseTabStats').tabIndex, 0);
assert.equal(element('caseTabSkins').tabIndex, -1);
assert.equal(element('casePanelSkins').classList.contains('hidden'), true);
assert.equal(element('casePanelStats').classList.contains('hidden'), false);
context.handleCaseDetailsTabKey({ target: { id: 'caseTabCollection' }, key: 'ArrowRight', preventDefault() {} });
assert.equal(context.focusedId, 'caseTabSkins');
context.handleCaseDetailsTabKey({ target: { id: 'caseTabSkins' }, key: 'End', preventDefault() {} });
assert.equal(context.focusedId, 'caseTabCollection');
assert.equal(element('caseTabCollection').attributes['aria-selected'], 'true');

for (const id of ['caseTabSkins', 'caseTabStats', 'caseTabCollection', 'casePanelSkins', 'casePanelStats', 'casePanelCollection']) {
  assert.equal(html.split(`id="${id}"`).length - 1, 1, `Exactly one accessible element: ${id}`);
}
assert.ok(!html.includes('id="steamNudge"'));
assert.ok(!extract('function renderCaseCatalog()', 'function renderCaseButtons()').includes('case-catalog-badge'));
console.log('Product UX regressions passed: daily tasks, balances, ticket flow, cached/failed catalogue loads and accessible tabs.');
