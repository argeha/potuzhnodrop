import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
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
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        toggle(name, value = !classes.has(name)) { value ? classes.add(name) : classes.delete(name); return value; },
        contains: name => classes.has(name)
      },
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
  document: { getElementById: element, querySelectorAll: selector => selector === '.upg-preset-btn' ? [element('preset2x')] : [] },
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
  closeModal: id => { context.closedModal = id; },
  showToast: message => { context.toast = message; },
  getSkinByKey: () => ({ name: 'AWP | Atheris', img: 'test-skin.png', price: 12 }),
  getSkinKey: skin => skin.name,
  marketReadyCatalogSkin: skin => skin,
  getInputVal: () => 3.5,
  setImageSource: () => {},
  recalculateUpgrade: () => {},
  roundPc: value => Math.round(value * 100) / 100,
  currentUser: { balance: 4.01 },
  playerLevel: 2, caseCost: 5.08, tickets: 0, signalUpdates: 0
});
vm.runInContext(extract('const TASK_POOL = [', 'const WEEKLY_TASK_POOL = ['), context);
vm.runInContext(extract('function createDefaultDaily()', 'function createDefaultWeekly()'), context);
vm.runInContext(extract('function getCaseAvailability(', 'async function openCatalogCase('), context);
vm.runInContext(extract('async function openCatalogCase(', 'function renderCaseButtons()'), context);
vm.runInContext(extract('function toggleMobileMenu()', 'const modalReturnFocus ='), context);
vm.runInContext(extract('function applySuggestion(', 'function chainUpgradeWonSkin('), context);
vm.runInContext(extract('function selectTargetItem(', 'function addToMulti('), context);

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
assert.equal(context.toast, 'Для цього кейсу бракує 5.08 PC');

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

context.completeSkinCatalogReady = true;
context.getVisibleCaseEntries = () => [['farm', { name: 'Farm Rush', category: 'budget', desc: 'Fixture case' }]];
context.getCaseMetrics = () => ({ count: 1 });
context.getCaseCollectionProgress = () => ({ total: 5, count: 0, claimed: false });
context.getCaseWishlistMatches = () => [];
context.createCaseArtwork = () => '<svg></svg>';
context.escapeHtml = value => String(value);
context.renderCaseCatalog();
const openTag = element('casesCatalogGrid').innerHTML.match(/<button[^>]+class="case-catalog-open"[^>]*>/)[0];
assert.ok(!openTag.includes('disabled'), 'Keep the original usable gold action; explain shortfall on click');
assert.ok(openTag.includes('Farm Rush: Бракує 5.08 PC'));
assert.ok(element('casesCatalogGrid').innerHTML.includes('case-catalog-badge'));
assert.ok(element('casesCatalogGrid').innerHTML.includes('fa-box-open"></i> Відкрити'));
context.caseCost = 0;
context.renderCaseCatalog();
const unavailableTag = element('casesCatalogGrid').innerHTML.match(/<button[^>]+class="case-catalog-open"[^>]*>/)[0];
assert.ok(unavailableTag.includes('disabled'));
assert.ok(unavailableTag.includes('Ціна недоступна'));

element('mobileMenu').classList.add('hidden');
context.toggleMobileMenu();
assert.equal(element('menuToggle').attributes['aria-expanded'], 'true');
context.toggleMobileMenu();
assert.equal(element('menuToggle').attributes['aria-expanded'], 'false');

element('preset2x').classList.add('active');
context.applySuggestion('AWP | Atheris');
assert.equal(element('preset2x').classList.contains('active'), false, 'A quick target must not leave an old multiplier highlighted');
assert.equal(context.selectedTargetSkin.price, 12);
element('preset2x').classList.add('active');
context.selectTargetItem({ name: 'AK-47 | Crossfade', img: 'test-skin.png', price: 42.5 });
assert.equal(element('preset2x').classList.contains('active'), false, 'A manual target must not leave an old multiplier highlighted');
assert.equal(context.selectedTargetSkin.price, 42.5);

// Render inventory fixtures without touching the player's inventory or credits.
const inventoryContext = vm.createContext({
  document: { getElementById: element },
  renderProfileInventoryCategoryChips() {}, renderProfileInventorySelects() {}, renderProfileInventoryStats() {},
  userInventory: [{ id: 'expensive', name: 'AWP | Gungnir', price: 7000 }, { id: 'bound', name: 'FAMAS | Half Sleeve', price: 6.5, accountBound: true }],
  getFilteredProfileInventory: () => inventoryContext.userInventory,
  getShowcaseSelection: () => [],
  getWear: () => ({ code: 'FT' }), getItemRarity: () => ({ color: '#eb4b4b', name: 'Covert' }),
  verifiedInventoryMarketPrice: skin => skin.price,
  roundPc: context.roundPc, SELL_RATE: 0.9,
  cleanText: value => value.trim(), getInventorySource: () => 'drop',
  escapeHtml: value => String(value), getSkinImageSrc: () => 'test-skin.png', getSkinKey: skin => skin.name,
  formatCredits: value => `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} PC`
});
element('profileInventoryGrid').querySelectorAll = () => [];
vm.runInContext(extract('function rarityStripMarkup(', 'function priceWithWear('), inventoryContext);
vm.runInContext(extract('function renderProfileInventory()', 'function showItemDetail('), inventoryContext);
inventoryContext.renderProfileInventory();
const inventoryMarkup = element('profileInventoryGrid').innerHTML;
assert.equal((inventoryMarkup.match(/<article /g) || []).length, 2);
assert.equal((inventoryMarkup.match(/<\/div><\/div>\s*<div class="profile-inv-rarity"/g) || []).length, 2,
  'Rarity strips must be card children, not extra items in the action row');
assert.ok(inventoryMarkup.includes('title="7,000 PC"'), 'Keep the complete expensive-skin price available');
assert.ok(!inventoryMarkup.includes('data-profile-sell="bound"'), 'Bound skins stay unsellable');
assert.ok(css.includes('.profile-inv-card-footer{display:grid;width:100%;min-width:0;'));
assert.ok(css.includes('@container inventory-card (max-width:157px)'), 'Narrow card footers must stack instead of clipping controls');

// Guard the chosen concept: fixes must not quietly remove its core sections.
for (const id of ['hubLevelRing', 'hubSignalSeason', 'hubPulseStats', 'hubDailyFocus', 'hubCollectionPreview', 'steamNudge', 'caseDetailsMetrics', 'caseDetailsCollection', 'caseDetailsGrid']) {
  assert.equal(html.split(`id="${id}"`).length - 1, 1, `Preserve concept element: ${id}`);
}
assert.ok(html.includes('class="command-hub-level-orbit"'));
assert.ok(!html.includes('case-details-tabs'), 'Do not replace the original contents layout');
assert.ok(!html.includes('case-balance-hint'), 'Do not add a new catalogue layout');
assert.deepEqual(Array.from(html.matchAll(/data-nav="([^"]+)"/g), match => match[1]),
  ['hub', 'upgrader', 'case', 'battle', 'royale', 'contract', 'tasks', 'profile', 'about']);
const hub = extract('function renderCommandHub()', 'function getSignalCampaignProgress()');
for (const label of ['Баланс', 'Вартість колекції', 'Серія', 'Дублі']) assert.ok(hub.includes(`label: '${label}'`));
assert.ok(hub.includes('command-hub-collection-progress'));
assert.ok(hub.includes('renderSignalSeasonHub();'));
assert.ok(extract('function renderCaseCatalog()', 'function renderCaseButtons()').includes('case-catalog-badge'));
assert.ok(css.includes('height:596px!important'), 'Preserve original upgrader deck proportions');
assert.ok(css.includes('.upg-wheel-box{width:230px;height:230px;'), 'Preserve original desktop wheel');
console.log('Concept-preserving regressions passed: saved tasks, balances, ticket flow, catalogue loading, multiplier state, inventory footers and original layout.');
