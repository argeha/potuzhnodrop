import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Disposable fixtures, never a player's save, inventory or online transaction.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = (from, to) => {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Missing production section: ${from}`);
  return source.slice(start, end);
};
const noop = () => {};
const elements = new Map();
const controls = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {
    innerHTML: '', value: '', textContent: '', scrollTop: 0,
    setAttribute: noop,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    querySelector: () => null,
    querySelectorAll(selector) {
      const attr = selector === '[data-shop-wear]' ? 'shop-wear' : selector === '[data-select-skin-id]' ? 'select-skin-id' : '';
      if (!attr) return [];
      const nodes = [...this.innerHTML.matchAll(new RegExp(`<[^>]+data-${attr}="([^"]+)"[^>]*>`, 'g'))].map(match => ({
        dataset: attr === 'shop-wear' ? { shopWear: match[1] } : { selectSkinId: match[1], selectWear: match[0].match(/data-select-wear="([^"]+)"/)[1] },
        value: '', events: {}, focus: noop,
        addEventListener(event, listener) { this.events[event] = listener; },
      }));
      controls.set(selector, nodes);
      return nodes;
    },
  });
  return elements.get(id);
};
const ctx = vm.createContext({
  Math, Date, MAX_STORED_ITEM_VALUE: 1_000_000,
  cleanText: (value, length = 160) => String(value || '').trim().slice(0, length),
  cleanColor: value => value || '#b0c3d9', cleanImageUrl: value => String(value || ''),
  clampNumber: (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback,
  normalizeSkinName: value => String(value || '').toLowerCase().trim(),
  escapeHtml: value => String(value), formatCredits: value => `${Number(value).toFixed(2)} PC`,
  getSkinImageSrc: item => item.img, getSkinKey: item => String(item.sourceSkinId || item.id),
  getItemRarity: () => ({ name: 'Covert', color: '#eb4b4b' }), rarityStripMarkup: () => '<div class="shop-rarity-bar"></div>',
  document: { getElementById: element, querySelectorAll: () => [] }, window: { confirm: () => true, setTimeout: noop },
  modalReturnFocus: new Map(), openModal: id => { ctx.opened = id; },
  showToast: message => { ctx.toast = message; },
  userInventory: [], CS2_SKINS: [], currentUser: { balance: 100 },
  lastWonCaseItems: [], lastWonUpgraderSkin: null,
  gameState: { stats: {}, daily: {}, weekly: {} }, SELL_RATE: .9,
  selectedInputSkin: null, selectedTargetSkin: null, multiInputSkins: [], selectedInputMode: 'skin',
  contractItems: [null, null, null, null, null], royalePlayerSkins: [], battlePlayerItem: null, battleBotItem: null,
  pendingWager: null, isRolling: false, battleInProgress: false, royaleInProgress: false,
  battleStakeRequestInFlight: false, battleSearchTicket: null, battleAutoStartTimer: null,
  isCaseOpening: false, isFreeCaseOpening: false, balanceStake: 0, MULTI_INPUT_MIN: 2, MULTI_INPUT_MAX: 10,
  inputValue: 1, targetValue: 20, getInputVal: () => ctx.inputValue, getTargetVal: () => ctx.targetValue,
  getSkinByKey: key => ctx.CS2_SKINS.find(item => item.id === key),
  saveState: noop, renderInventoryGrid: noop, renderProfileInventory: noop,
  renderMultiSlots: noop, renderContractSlots: noop, renderRoyaleDeck: noop, clearBattleOpponent: noop,
  renderGameHub: noop, recalculateUpgrade: noop, updateAvatarBadge: noop,
  ensureDailyState: noop, ensureWeeklyState: noop, updateAllTimeOnSell: noop,
  updateBalanceUI: noop, checkAchievements: noop, soundSell: noop, requestInventoryMarketPrice: noop,
  setImageSource: noop, beep: noop, updateTargetPlaceholder: noop, warmVisibleShopMarketPrices: noop,
  isUsableSkin: item => !!item?.name, isFavorite: () => false, visibleSkinCount: 80, shopCatalogHasMore: false,
  royaleMode: 'bots', royaleLiveTicket: null, royaleGenerateBots: noop, ROYALE_LIVE_MAX_SKINS: 10,
  wagerCalls: 0, beginPendingWager: () => { ctx.wagerCalls++; throw new Error('Protected stake reached wagering'); },
  battleRoom: null, battleListingJoin: null,
});
for (const [from, to] of [
  ['const WEAR_TIERS = [', 'let CS2_SKINS = ['],
  ['function findWearTier(', 'let currentUser ='],
  ['function verifiedMarketPriceForWear(', 'function marketQuoteMeta('],
  ['function compactCloudInventoryItem(', 'function buildPortableSave('],
  ['function makeDemoItem(', 'const CANVAS_SIZE ='],
  ['function canUseInventoryItem(', 'function renderInventoryGrid('],
  ['function closeModal(', 'function refreshInventoryModal('],
  ['function getInventoryDuplicateCounts(', 'function getInventorySource('],
  ['function sellInventoryItem(', 'function openInventoryOrFocus('],
  ['function selectInventoryItem(', 'function removeFromMulti('],
  ['function executeUpgrade()', 'function getFreeCaseCatalogCandidates('],
  ['function startBattle()', '/* ===== JACKPOT ROYALE'],
  ['async function joinLiveRoyale()', '/* ===== TRADE-UP CONTRACT'],
  ['async function executeContract()', '/* ===== LIVE SKIN STRIP'],
  ['function quickSellUpgradedSkin()', 'function showResultModal('],
  ['function quickSellCaseResult()', 'function sendCaseDropToUpgrader('],
  ['const shopSelectedWear =', '/* Initialization */'],
]) vm.runInContext(section(from, to), ctx);
ctx.verifiedInventoryMarketPrice = ctx.stableInventoryPrice;
const fixture = (id, phase = '', name = '★ Bayonet | Doppler') => ctx.normalizeCatalogSkin({
  id, name, weapon: 'Bayonet', category: 'Knives', rarity: 'Covert', phase,
  paintIndex: phase === 'Phase 1' ? '418' : '419', img: 'https://community.akamai.steamstatic.com/economy/image/test',
  wears: phase ? ['FN', 'MW'] : ['FN', 'MW', 'FT', 'WW', 'BS'],
});
ctx.CS2_SKINS = [fixture('phase1', 'Phase 1'), fixture('phase2', 'Phase 2'), fixture('atheris', '', 'AWP | Atheris')];
const item = ctx.makeDemoItem(ctx.CS2_SKINS[1], '-test', 0);
assert.equal(item.sourceSkinId, 'phase2', 'Do not replace a phase with the first same-name skin');
assert.equal(item.phase, 'Phase 2');
assert.equal(ctx.normalizeStoredItem(item).phase, 'Phase 2');
assert.equal(ctx.normalizeStoredItem({ ...item, id: 'legacy', sourceSkinId: 'unknown', phase: '', paintIndex: '' }).phase, '', 'An ambiguous legacy name must not invent a phase');
ctx.userInventory = [item];
const stale = { ...item };
ctx.selectedInputSkin = stale; ctx.multiInputSkins = [stale]; ctx.contractItems[0] = stale;
ctx.royalePlayerSkins = [stale]; ctx.battlePlayerItem = stale;
assert.equal(ctx.toggleInventoryProtection(item.id), true);
assert.equal(item.inventoryProtected, true);
assert.equal(ctx.selectedInputSkin, null);
assert.equal(ctx.multiInputSkins.length + ctx.royalePlayerSkins.length, 0);
assert.equal(ctx.contractItems[0], null); assert.equal(ctx.battlePlayerItem, null);
assert.equal(ctx.canUseInventoryItem(stale), false, 'Check current ownership, not the picker snapshot');
assert.equal(ctx.canSellInventoryItem(item), false);
const packed = ctx.compactCloudInventoryItem(item);
const savedCatalog = ctx.CS2_SKINS; ctx.CS2_SKINS = [];
const restored = ctx.expandCloudInventoryItem(packed);
assert.equal(restored.inventoryProtected, true); assert.equal(restored.phase, 'Phase 2');
assert.equal(restored.wear.code, item.wear.code); assert.equal(restored.price, item.price);
assert.equal(ctx.expandCloudInventoryItem(packed.slice(0, 18)).inventoryProtected, false, 'Old saves do not gain an invented lock');
const steam = { ...item, steamImported: true, steamAssetId: '123', steamOwnerId: '76561198000000000' };
assert.equal(ctx.expandCloudInventoryItem(ctx.compactCloudInventoryItem(steam)).inventoryProtected, true);
ctx.CS2_SKINS = savedCatalog;

const balance = ctx.currentUser.balance;
ctx.sellInventoryItem(item.id); ctx.selectInventoryItem(stale); ctx.addToMulti(stale);
assert.equal(ctx.currentUser.balance, balance); assert.equal(ctx.userInventory.length, 1);
assert.equal(ctx.selectedInputSkin, null); assert.equal(ctx.multiInputSkins.length, 0);
ctx.lastWonUpgraderSkin = stale; ctx.fixtureDrops = [stale]; vm.runInContext('lastWonCaseItems = fixtureDrops', ctx);
ctx.quickSellUpgradedSkin(); ctx.quickSellCaseResult();
assert.equal(ctx.currentUser.balance, balance, 'Quick-result sales may not bypass an owned-item lock');
ctx.selectedInputSkin = stale; ctx.inputValue = 1; ctx.selectedTargetSkin = ctx.CS2_SKINS[0];
ctx.executeUpgrade();
ctx.selectedInputMode = 'multi'; ctx.multiInputSkins = [stale, stale]; ctx.executeUpgrade();
ctx.battlePlayerItem = stale; ctx.battleBotItem = ctx.CS2_SKINS[0]; ctx.startBattle();
ctx.royalePlayerSkins = [stale]; ctx.startRoyale(); await ctx.joinLiveRoyale();
ctx.contractItems = [stale, stale, stale, stale, stale]; await ctx.executeContract();
assert.equal(ctx.wagerCalls, 0); assert.equal(ctx.userInventory.length, 1);
ctx.pendingWager = { id: 'active' };
assert.equal(ctx.toggleInventoryProtection(item.id), false, 'A live round may not change protection');
ctx.pendingWager = null;
assert.equal(ctx.toggleInventoryProtection(item.id), true);
assert.equal(ctx.canUseInventoryItem(stale), true);
const reward = { ...item, id: 'reward-battle-pass', accountBound: true, exclusive: true };
ctx.userInventory.push(reward);
assert.equal(ctx.canSellInventoryItem(reward), true, 'Exclusive reward sale remains unlocked');
assert.equal(ctx.canUseInventoryItem(reward), false, 'Reward wagering remains restricted');

// Opening/canceling is non-mutating; stale price/lock/ownership fails closed.
ctx.requestInventorySale(item.id);
assert.equal(ctx.opened, 'inventorySaleModal'); assert.equal(ctx.currentUser.balance, balance);
assert.ok(element('inventorySaleContent').innerHTML.includes(`${ctx.roundPc(item.price * .9).toFixed(2)} PC`));
ctx.closeModal('inventorySaleModal'); ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, balance);
ctx.requestInventorySale(item.id); item.inventoryProtected = true; ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, balance); item.inventoryProtected = false;
ctx.requestInventorySale(item.id);
const originalQuote = ctx.verifiedInventoryMarketPrice;
ctx.verifiedInventoryMarketPrice = skin => originalQuote(skin) + 1;
ctx.confirmInventorySale(); assert.equal(ctx.currentUser.balance, balance);
ctx.verifiedInventoryMarketPrice = originalQuote;
ctx.requestInventorySale(item.id);
const originalWear = item.wear;
item.wear = ctx.normalizeWear('MW');
ctx.confirmInventorySale(); assert.equal(ctx.currentUser.balance, balance);
item.wear = originalWear;
ctx.requestInventorySale(item.id); ctx.confirmInventorySale(); ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, ctx.roundPc(balance + ctx.roundPc(item.price * .9)), 'Confirmed sale pays exactly once');
assert.equal(ctx.userInventory.some(skin => skin.id === item.id), false);
ctx.fixtureDrops = [stale]; vm.runInContext('lastWonCaseItems = fixtureDrops', ctx); ctx.quickSellCaseResult();
assert.equal(ctx.currentUser.balance, ctx.roundPc(balance + ctx.roundPc(item.price * .9)), 'A stale result cannot pay for an already sold item');
const first = ctx.makeDemoItem(ctx.CS2_SKINS[0]);
ctx.userInventory = [first, { ...first, id: 'protected-dupe', inventoryProtected: true }, { ...first, id: 'sellable-dupe' }, ctx.makeDemoItem(ctx.CS2_SKINS[1])];
ctx.sellAllDuplicates();
assert.equal(ctx.userInventory.length, 4, 'Duplicate sale opens a quote, not an immediate sale');
assert.ok(element('inventorySaleContent').innerHTML.includes('Продати дублікати?'));
ctx.closeModal('inventorySaleModal'); ctx.confirmInventorySale();
assert.equal(ctx.userInventory.length, 4, 'Cancel preserves every duplicate');
ctx.sellAllDuplicates(); ctx.confirmInventorySale(); ctx.confirmInventorySale();
assert.equal(ctx.userInventory.length, 3);
assert.ok(ctx.userInventory.some(skin => skin.id === 'protected-dupe'));
assert.ok(ctx.userInventory.some(skin => skin.phase === 'Phase 2'), 'A different phase is not a duplicate');
const keeper = { ...first, id: 'keeper' }, extra = { ...first, id: 'extra' };
ctx.userInventory = [keeper, extra];
ctx.sellAllDuplicates(); ctx.userInventory = [extra]; ctx.confirmInventorySale();
assert.equal(ctx.userInventory.length, 1, 'A vanished keeper may not sell the final copy');

// Case/contract quick sales share the same non-mutating, once-only confirmation.
ctx.userInventory = [keeper, extra]; ctx.fixtureDrops = [keeper, extra]; vm.runInContext('lastWonCaseItems = fixtureDrops', ctx);
const dropBalance = ctx.currentUser.balance;
ctx.quickSellCaseResult();
assert.ok(element('inventorySaleContent').innerHTML.includes('Продати отриманий дроп?'));
assert.equal(ctx.currentUser.balance, dropBalance);
ctx.closeModal('inventorySaleModal'); ctx.confirmInventorySale();
assert.equal(vm.runInContext('lastWonCaseItems.length', ctx), 2, 'Cancel retains the drop and result actions');
ctx.quickSellCaseResult(); extra.inventoryProtected = true; ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, dropBalance, 'New protection cancels the entire quick-sale quote');
extra.inventoryProtected = false;
ctx.quickSellCaseResult(); ctx.confirmInventorySale(); ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, ctx.roundPc(dropBalance + ctx.roundPc(first.price * .9) * 2));
assert.equal(vm.runInContext('lastWonCaseItems.length', ctx), 0); assert.equal(ctx.userInventory.length, 0);

// Multi-select quotes skip ineligible items, survive filters, and settle atomically.
const batchA = { ...first, id: 'batch-a', price: 10 };
const batchB = { ...first, id: 'batch-b', price: 20 };
const batchLocked = { ...first, id: 'batch-locked', inventoryProtected: true };
const batchReward = { ...reward, id: 'batch-reward', price: 30 };
const unpriced = { ...first, id: 'batch-unpriced', price: 0 };
ctx.verifiedInventoryMarketPrice = skin => skin.price;
ctx.userInventory = [batchA, batchB, batchLocked, batchReward, unpriced];
const ids = ctx.userInventory.map(skin => skin.id);
const quote = ctx.getInventorySaleQuote([...ids, batchA.id]);
assert.equal(quote.items.length, 3); assert.equal(quote.skipped, 2); assert.equal(quote.total, 54);
ctx.getFilteredProfileInventory = () => [batchB, batchLocked];
ctx.toggleInventorySelectionMode(); ctx.selectVisibleInventory(); ctx.renderInventorySelection();
assert.ok(element('inventorySelectionSummary').textContent.includes('Обрано 1'));
ctx.setInventorySelection(batchReward.id, true);
ctx.getFilteredProfileInventory = () => [batchA]; ctx.renderInventorySelection();
assert.ok(element('inventorySelectionSummary').textContent.includes('Обрано 2'), 'Changing filters preserves the selection');
batchReward.inventoryProtected = true; ctx.renderInventorySelection();
assert.ok(element('inventorySelectionSummary').textContent.includes('Обрано 1'), 'A newly protected item leaves the selection');
batchReward.inventoryProtected = false;
const batchBalance = ctx.currentUser.balance;
ctx.requestInventoryBatchSale(ids);
assert.ok(element('inventorySaleContent').innerHTML.includes('54.00 PC'));
assert.ok(!element('inventorySaleContent').innerHTML.includes('batch-locked'));
ctx.closeModal('inventorySaleModal'); ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, batchBalance, 'Cancel is non-mutating');
ctx.requestInventoryBatchSale(ids); batchB.inventoryProtected = true; ctx.confirmInventorySale();
assert.equal(ctx.userInventory.length, 5); assert.equal(ctx.currentUser.balance, batchBalance, 'Lock changes cancel the WHOLE batch');
batchB.inventoryProtected = false;
ctx.requestInventoryBatchSale(ids);
const batchOriginalWear = batchB.wear; batchB.wear = ctx.normalizeWear(batchOriginalWear.code === 'MW' ? 'FN' : 'MW'); ctx.confirmInventorySale();
assert.equal(ctx.userInventory.length, 5, 'A changed exterior cancels the complete quote'); batchB.wear = batchOriginalWear;
ctx.requestInventoryBatchSale(ids); batchB.price = 21; ctx.confirmInventorySale();
assert.equal(ctx.userInventory.length, 5); batchB.price = 20;
ctx.requestInventoryBatchSale(ids); ctx.pendingWager = { id: 'new-round' }; ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, batchBalance); ctx.pendingWager = null;
ctx.requestInventoryBatchSale(ids);
ctx.userInventory = ctx.userInventory.filter(skin => skin.id !== batchB.id); ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, batchBalance, 'Lost ownership may not partially sell the remainder');
ctx.userInventory.push(batchB);
ctx.multiInputSkins = [batchA]; ctx.contractItems[0] = batchB; ctx.royalePlayerSkins = [batchA]; ctx.battlePlayerItem = batchB;
const saleCount = ctx.gameState.stats.sells;
ctx.requestInventoryBatchSale(ids); ctx.confirmInventorySale(); ctx.confirmInventorySale();
assert.equal(ctx.currentUser.balance, ctx.roundPc(batchBalance + 54), 'The summed per-item quote pays exactly once');
assert.equal(ctx.gameState.stats.sells, saleCount + 3);
assert.deepEqual(Array.from(ctx.userInventory, skin => skin.id).sort(), ['batch-locked', 'batch-unpriced']);
assert.equal(ctx.multiInputSkins.length + ctx.royalePlayerSkins.length, 0);
assert.equal(ctx.contractItems[0], null); assert.equal(ctx.battlePlayerItem, null);
ctx.renderInventorySelection(); assert.ok(element('inventorySelectionSummary').textContent.includes('Обрано 0'));
ctx.verifiedInventoryMarketPrice = originalQuote;

// One card per finish, separate phases, exact supported wear and target price.
const variants = ctx.CS2_SKINS.flatMap(ctx.getCatalogWearVariants);
ctx.renderShopGrid(variants);
assert.equal((element('shopGrid').innerHTML.match(/<article /g) || []).length, 3);
assert.equal((element('shopGrid').innerHTML.match(/<option /g) || []).length, 9);
assert.ok(element('shopGrid').innerHTML.includes('Phase 1') && element('shopGrid').innerHTML.includes('Phase 2'));
const wearControl = controls.get('[data-shop-wear]').find(control => control.dataset.shopWear === 'atheris');
wearControl.value = 'BS'; wearControl.events.change();
const targetControl = controls.get('[data-select-skin-id]').find(control => control.dataset.selectSkinId === 'atheris');
assert.equal(targetControl.dataset.selectWear, 'BS'); targetControl.events.click();
assert.equal(ctx.selectedTargetSkin.wear.code, 'BS');
assert.equal(ctx.selectedTargetSkin.price, ctx.stableCatalogPrice(ctx.CS2_SKINS[2], 'BS'));
ctx.renderShopGrid(variants.filter(skin => skin.wear.code === 'FN'));
assert.equal((element('shopGrid').innerHTML.match(/<option /g) || []).length, 3, 'Respect wear/price filters, even a remembered exterior');
assert.ok(html.includes('id="inventorySaleModal"'));
element('shopSort').value = 'price-desc';
ctx.renderShopGrid(variants);
const displayedPrices = [...element('shopGrid').innerHTML.matchAll(/aria-label="Обрати [^"]+ · ([\d.]+) PC"/g)].map(match => Number(match[1]));
assert.deepEqual(displayedPrices, [...displayedPrices].sort((a, b) => b - a), 'Sort by the displayed selected exterior price');
console.log('Inventory safety passed: persistent locks, all wagering guards, atomic multi-select sales, cancellation/stale quotes, once-only payout, phase identity and exact-wear targets.');
