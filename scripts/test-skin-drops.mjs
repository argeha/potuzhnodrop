import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run production functions against disposable fixtures only: no player saves,
// account, transactions, network requests, or real random seeds are touched.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/worker.mjs', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = (text, from, to) => {
  const start = text.indexOf(from), end = text.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Missing production section: ${from}`);
  return text.slice(start, end);
};
const extract = (from, to) => section(source, from, to);
const image = 'https://community.akamai.steamstatic.com/economy/image/test';
const fixture = (id, name, rarity, wears) => ({ id, name, rarity, wears, weapon: name.split(' | ')[0], category: 'Rifles', rarityColor: '#eb4b4b', img: image });
const unrestricted = fixture('atheris', 'AWP | Atheris', 'Restricted');
const restricted = fixture('fade', 'Glock-18 | Fade', 'Restricted', ['Factory New', 'Minimal Wear']);
const catalog = [unrestricted, restricted,
  fixture('medusa', 'AWP | Medusa', 'Covert'),
  fixture('gungnir', 'AWP | Gungnir', 'Covert'),
  fixture('redline', 'AK-47 | Redline', 'Classified', ['MW', 'FT', 'WW', 'BS']),
  fixture('cheap', 'FAMAS | Fixture', 'Consumer Grade'),
  fixture('industrial', 'AK-47 | Fixture 2', 'Industrial Grade'),
  fixture('milspec', 'AK-47 | Fixture 3', 'Mil-Spec Grade'),
  fixture('classified', 'M4A4 | Fixture 4', 'Classified'),
  fixture('knife', '★ Karambit | Fixture 5', 'Extraordinary'),
];
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {
    value: '', textContent: '', innerHTML: '', dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    querySelectorAll: () => [], querySelector: () => null,
  });
  return elements.get(id);
};
let caseCandidates = catalog;
const noOp = () => {};
const context = vm.createContext({
  Math, Date, CS2_SKINS: catalog, MAX_STORED_ITEM_VALUE: 1_000_000,
  clampNumber: (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback,
  cleanText: (value, length = 160) => String(value || '').trim().slice(0, length),
  cleanImageUrl: value => String(value || ''), cleanColor: value => value || '#b0c3d9',
  normalizeSkinName: value => String(value || '').toLowerCase().trim(),
  categorizeWeapon: () => 'rifle', getSkinKey: skin => String(skin.id),
  formatCredits: value => `${Number(value).toFixed(2)} PC`,
  document: { getElementById: element, querySelectorAll: () => [] },
  setImageSource: noOp, closeModal: noOp, openModal: noOp, showToast: noOp,
  requestInventoryMarketPrice: noOp,
  _casePoolCache: new Map(), _caseCostCache: new Map(),
  CASE_TARGET_RETURN_RATE: .88, CASE_MAX_RETURN_RATE: .90, CASE_MIN_LOSS_PRICE_RATIO: .84,
  UPGRADE_RETURN_RATE: .9,
  CHANCE_MIN: .5, CHANCE_MAX: 80,
  resolveCaseConfig: id => ({ id, name: id }), getRuntimeEconomy: () => ({ casePriceMultiplier: 1 }),
  getCaseCatalogCandidates: () => caseCandidates, getFreeCaseCatalogCandidates: () => caseCandidates,
  getShopCatalogSource: () => catalog, isUsableSkin: skin => !!skin?.name,
  getPerformanceMode: () => 'balanced', getInputVal: () => context.inputValue,
  inputValue: 0, recalculateUpgrade: noOp,
  getSkinByKey: id => catalog.find(skin => String(skin.id) === String(id)),
  renderShopGrid: skins => { context.rendered = skins; },
  userInventory: [], currentUser: { balance: 100 },
  selectedInputSkin: null, selectedTargetSkin: null, multiInputSkins: [],
  pendingWager: null, isRolling: false, battleInProgress: false, royaleInProgress: false,
  battleStakeRequestInFlight: false, battleSearchTicket: null, battleAutoStartTimer: null,
  SELL_RATE: .9, gameState: { stats: {}, daily: {}, weekly: {}, battlePass: { premium: true, claimedFree: [], claimedPremium: [] } },
  ensureDailyState: noOp, ensureWeeklyState: noOp, updateAllTimeOnSell: noOp,
  updateBalanceUI: noOp, saveState: noOp, renderInventoryGrid: noOp, renderProfileInventory: noOp,
  renderMultiSlots: noOp, updateAvatarBadge: noOp, checkAchievements: noOp, renderGameHub: noOp,
  soundSell: noOp, soundWin: noOp, window: { confirm: () => true },
  BATTLE_PASS_REWARDS: [{ tier: 1, premium: { type: 'skin', skin: unrestricted } }],
  getBattlePassProgress: () => ({ unlocked: 1, pass: context.gameState.battlePass }),
  battlePassRewardCopy: reward => ({ title: reward.skin.name }),
});
for (const [from, to] of [
  ['const WEAR_TIERS = [', 'let CS2_SKINS = ['],
  ['function findWearTier(', 'let currentUser ='],
  ['function verifiedMarketPriceForWear(', 'function marketQuoteMeta('],
  ['function makeDemoItem(', 'const CANVAS_SIZE ='],
  ['function getCaseCost(', 'function getCaseWishlistMatches('],
  ['const _dropChanceCache =', 'function pickCaseSkin('],
  ['function pickCaseSkin(', 'function setCaseCategory('],
  ['function filterShop()', 'function showMoreSkins('],
  ['function getCatalogRenderPageSize()', 'function debounceFilterShop('],
  ['function selectTargetItem(', 'function addToMulti('],
  ['function getTargetVal()', 'function recalculateUpgrade('],
  ['function compactCloudInventoryItem(', 'function buildPortableSave('],
  ['function isInventoryMutationBusy(', 'function inventoryProtectionButton('],
  ['function getInventoryDuplicateKey(', 'function getInventorySource('],
  ['function sellInventoryItem(', 'function openInventoryOrFocus('],
  ['function claimBattlePassReward(', '/* ====='],
  ['function toPublicBattleStake(', 'function setBattleOpponent('],
]) vm.runInContext(extract(from, to), context);
context.verifiedInventoryMarketPrice = context.stableInventoryPrice;

const counts = { FN: 0, MW: 0, FT: 0, WW: 0, BS: 0 };
for (let index = 0; index < 10_000; index++) {
  const item = context.makeDemoItem(unrestricted, '-test', (index + .5) / 10_000);
  counts[item.wear.code]++;
  assert.equal(item.price, context.stableCatalogPrice(unrestricted, item.wear));
  assert.equal(item.rarity, 'Restricted', 'Wear must never change the rarity of the selected skin');
}
assert.deepEqual(counts, { FN: 1000, MW: 1800, FT: 4700, WW: 1500, BS: 1000 });
for (const [roll, code] of [[0, 'FN'], [.1, 'MW'], [.28, 'FT'], [.75, 'WW'], [.9, 'BS'], [.999999999, 'BS']]) {
  assert.equal(context.rollSkinWear(unrestricted, roll).code, code);
}
assert.equal(context.normalizeWear('Minimal Wear').code, 'MW');
assert.equal(context.normalizeWear({ code: 'bs' }).code, 'BS');
const restrictedCounts = { FN: 0, MW: 0 };
for (let index = 0; index < 2800; index++) restrictedCounts[context.makeDemoItem(restricted, '', (index + .5) / 2800).wear.code]++;
assert.deepEqual(restrictedCounts, { FN: 1000, MW: 1800 });
assert.equal(context.getCatalogWearVariants(restricted).length, 2, 'Never manufacture unavailable FT/WW/BS finishes');
assert.equal(context.marketReadyCatalogSkin(restricted).wear.code, 'FN');
assert.equal(context.makeDemoItem({ ...unrestricted, wear: { code: 'BS' } }, '', 0).wear.code, 'BS', 'An explicit target/stake may not be rerolled');

// Independent HMAC wear rolls stay paired with each x1/x2/x3/x5 skin roll.
const rolls = [0, .15, .5, .8, .99].map(wearRoll => ({ wearRoll }));
for (const size of [1, 2, 3, 5]) {
  const items = context.createCaseDropItems(Array(size).fill(unrestricted), rolls, false);
  assert.deepEqual(Array.from(items, item => item.wear.code), ['FN', 'MW', 'FT', 'WW', 'BS'].slice(0, size));
  assert.ok(items.every(item => item.id.endsWith('-case')));
}
assert.ok(context.createCaseDropItems([unrestricted], rolls, true)[0].id.endsWith('-freecase'));
assert.ok(source.includes('createCaseDropItems(winners, fairRolls.rolls, isFree)'));

// Price the same joint skin/exterior distribution that the reel awards.
for (const candidates of [catalog, catalog.map(skin => ({ ...skin, wears: ['FN', 'MW'] }))]) {
  caseCandidates = candidates;
  context._casePoolCache.clear(); context._caseCostCache.clear();
  vm.runInContext('_dropChanceCache.clear(); _caseMetricsCache.clear();', context);
  const pool = context.getCaseSkinPool('test');
  const cost = context.getCaseCost('test');
  const chances = context.buildCaseDropChanceMap(pool, cost);
  assert.ok(Math.abs(Array.from(chances.values()).reduce((sum, chance) => sum + chance, 0) - 100) < 1e-8);
  const metrics = context.getCaseMetrics('test');
  let expected = 0, breakEven = 0, rare = 0, max = 0;
  for (const skin of pool) {
    for (const variant of context.getSkinWearValues(skin)) {
      const chance = chances.get(String(skin.id)) * variant.probability;
      expected += variant.price * chance / 100;
      if (variant.price >= cost) breakEven += chance;
      if (variant.price >= cost * 3) rare += chance;
      max = Math.max(max, variant.price);
    }
  }
  assert.ok(Math.abs(expected - metrics.expectedValue) < 1e-8);
  assert.ok(Math.abs(breakEven - metrics.breakEvenChance) < 1e-8);
  assert.ok(Math.abs(rare - metrics.rareChance) < 1e-8);
  assert.equal(max, metrics.maxValue);
  assert.ok(metrics.returnRate <= .900001, `Actual all-wear RTP must remain capped: ${metrics.returnRate}`);
  assert.ok(metrics.lossChance > 0);
  const rarities = new Set();
  for (let index = 0; index < 1000; index++) rarities.add(context.pickCaseSkin('regular', 'test', (index + .5) / 1000).rarity);
  assert.ok(rarities.size >= 4, 'The case still produces multiple rarity classes, not only one');
}

// Shop filters run against exterior prices, not an FT surrogate.
element('shopWear').value = 'FN'; element('shopRarity').value = 'restricted';
context.filterShop();
assert.equal(context.rendered.length, 2);
assert.ok(context.rendered.every(skin => skin.wear.code === 'FN' && skin.rarity === 'Restricted'));
element('shopRarity').value = 'mil-spec';
context.filterShop(); assert.equal(context.rendered[0].rarity, 'Mil-Spec Grade');
element('shopWear').value = 'all'; element('shopRarity').value = 'all'; element('shopSearch').value = 'Atheris';
context.filterShop(); assert.equal(context.rendered.length, 5);
element('shopMinPrice').value = '13';
context.filterShop(); assert.ok(context.rendered.every(skin => skin.price >= 13));
assert.ok(!context.rendered.some(skin => skin.wear.code === 'FT'));
element('shopMinPrice').value = ''; context.inputValue = 12;
context.filterShop(); assert.ok(context.rendered.every(skin => skin.price > 12));
context.inputValue = 1;
const fnTarget = context.marketReadyCatalogSkin(unrestricted, 'FN');
context.selectTargetItem(fnTarget);
assert.equal(context.selectedTargetSkin.wear.code, 'FN');
assert.equal(context.getTargetVal(), fnTarget.price);
assert.ok(element('targetSkinRarity').textContent.endsWith('· FN'));
assert.equal(context.makeDemoItem(context.selectedTargetSkin).price, fnTarget.price);
assert.equal(context.calcChance(1, fnTarget.price), Math.min(90, 1 / fnTarget.price * 90));
assert.equal((extract('function executeUpgrade()', 'function getFreeCase').match(/makeDemoItem\(tgtSkin\)/g) || []).length, 2, 'Fast and animated victories use the selected exact variant');

// Preserve exact price + wear through refresh/cloud sync even with no catalogue.
const reward = context.makeDemoItem({ ...unrestricted, exclusive: true, accountBound: true, battlePassReward: true }, '-battle-pass', .99);
const compact = context.compactCloudInventoryItem(reward);
const savedCatalog = context.CS2_SKINS;
context.CS2_SKINS = [];
const restored = context.expandCloudInventoryItem(compact);
assert.equal(restored.wear.code, 'BS'); assert.equal(restored.price, reward.price);
assert.equal(restored.weapon, reward.weapon); assert.equal(restored.category, reward.category);
assert.equal(context.canSellInventoryItem(restored), true);
context.CS2_SKINS = savedCatalog;
const oldReward = context.expandCloudInventoryItem(compact.slice(0, 16));
assert.equal(oldReward.wear.code, 'BS'); assert.equal(context.canSellInventoryItem(oldReward), true);
assert.equal(context.normalizeStoredItem({ ...reward, wear: { code: 'FT' } }).wear.code, 'FT', 'Existing FT inventory must not be rerolled');
for (const id of ['old-battle-pass', 'old-daily-calendar', 'old-exclusive', 'old-halloween-2026']) {
  const old = context.normalizeStoredItem({ ...unrestricted, id, accountBound: true });
  assert.equal(context.canSellInventoryItem(old), true);
  assert.equal(context.canSellInventoryItem(context.expandCloudInventoryItem(context.compactCloudInventoryItem(old))), true);
}
const eventReward = context.makeDemoItem({ ...unrestricted, halloweenEvent: true, accountBound: true }, '-halloween-2026', .15);
assert.equal(context.canSellInventoryItem(eventReward), true);
assert.equal(context.expandCloudInventoryItem(context.compactCloudInventoryItem(eventReward)).exclusive, true);
for (const flag of ['battlePassReward', 'collectionReward', 'dailyCalendarReward', 'halloweenEvent']) {
  assert.equal(context.canSellInventoryItem({ id: `reward-${flag}`, accountBound: true, [flag]: true }), true);
}
assert.equal(context.canSellInventoryItem({ id: 'private-bound', accountBound: true }), false);

// Sale is once-only and never erases a claimed PASS tier to enable farming.
context.userInventory = [];
context.claimBattlePassReward('premium', 1);
const claimed = context.userInventory[0];
assert.ok(claimed.accountBound && context.canSellInventoryItem(claimed));
const balance = context.currentUser.balance;
const payout = context.roundPc(context.stableInventoryPrice(claimed) * .9);
context.sellInventoryItem(claimed.id);
assert.equal(context.currentUser.balance, context.roundPc(balance + payout));
assert.equal(context.userInventory.length, 0);
context.sellInventoryItem(claimed.id);
context.claimBattlePassReward('premium', 1);
assert.equal(context.userInventory.length, 0, 'Selling must not allow re-claiming the tier');
assert.equal(context.currentUser.balance, context.roundPc(balance + payout));
assert.deepEqual(Array.from(context.gameState.battlePass.claimedPremium), [1]);
const locked = context.normalizeStoredItem({ ...unrestricted, id: 'locked', accountBound: true });
context.userInventory = [locked]; context.sellInventoryItem(locked.id);
assert.equal(context.userInventory.length, 1);
context.userInventory = [restored, { ...restored, id: 'second-battle-pass' }];
const duplicateBalance = context.currentUser.balance;
context.sellAllDuplicates();
assert.equal(context.userInventory.length, 1);
assert.equal(context.currentUser.balance, context.roundPc(duplicateBalance + context.roundPc(restored.price * .9)));

// Both live modes pass the exterior through server validation unchanged.
const serverContext = vm.createContext({
  cleanText: context.cleanText, cleanImage: context.cleanImageUrl, MAX_PRICE: 1_000_000,
  boundedMoney: (price, min, max) => Math.max(min, Math.min(max, price)),
});
vm.runInContext(section(worker, 'function parseStake(', 'function parseRoyaleStakes('), serverContext);
for (const code of ['FN', 'MW', 'FT', 'WW', 'BS']) {
  const item = context.makeDemoItem({ ...unrestricted, wear: { code } });
  const wire = context.toPublicBattleStake(item);
  const parsed = serverContext.parseStake(JSON.parse(JSON.stringify(wire)));
  assert.equal(parsed.wear.code, code);
  assert.equal(parsed.price, item.price);
  assert.equal(context.makeDemoItem(parsed, '-battle').wear.code, code);
  assert.equal(context.makeDemoItem(parsed, '-royale').price, item.price);
}
assert.equal(serverContext.parseStake({ name: 'legacy', img: image, price: 10 }).wear.code, 'FT');
assert.equal(serverContext.parseStake({ name: 'invalid', img: image, price: 10, wear: { code: 'xx' } }).wear.code, 'FT');
assert.ok(html.includes('id="shopWear"') && html.includes('id="shopRarity"'));
assert.ok(source.includes("selectedInputMode === 'skin' && !canUseInventoryItem(inSkin)") && source.includes('owned.accountBound !== true'), 'Reward wagering remains locked');
assert.ok(source.includes('data-select-wear="${wear.code}"'));
// Optional read-only integration check against a running local catalogue.
if (process.argv[2]) {
  const url = new URL(process.argv[2]);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Integration fixtures must come from localhost');
  const response = await fetch(url);
  assert.ok(response.ok);
  const items = await response.json();
  context.CS2_SKINS = items.map(skin => context.normalizeCatalogSkin({
    ...skin, weapon: skin.weapon?.name || skin.weapon, category: skin.category?.name || skin.category,
    rarity: skin.rarity?.name || skin.rarity, rarityColor: skin.rarity?.color || skin.rarityColor, img: skin.image || skin.img,
  })).filter(Boolean);
  context.getRuntimeCaseConfig = () => null;
  vm.runInContext(extract('function skinNameIncludes(', '/* ===== ВБУДОВАНІ SVG-КЕЙСИ ===== */'), context);
  vm.runInContext(extract('function resolveCaseConfig(', 'async function ensureCaseMarketPrices('), context);
  context._casePoolCache.clear(); context._caseCostCache.clear();
  vm.runInContext('_dropChanceCache.clear(); _caseMetricsCache.clear();', context);
  const ids = vm.runInContext('Object.values(CASE_TYPES).filter(caseType => !caseType.aliasTo).map(caseType => caseType.id)', context);
  let checked = 0;
  for (const id of ids) {
    const pool = context.getCaseSkinPool(id);
    if (pool.length < 8) continue;
    const metrics = context.getCaseMetrics(id);
    assert.ok(metrics.returnRate <= .900001, `${id}: actual wear-aware RTP ${metrics.returnRate}`);
    assert.ok(metrics.lossChance > 0, `${id}: must retain a loss outcome`);
    const sum = pool.reduce((value, item) => value + context.getItemDropChance(item, id), 0);
    assert.ok(Math.abs(sum - 100) < 1e-8, `${id}: skin odds sum ${sum}`);
    checked++;
  }
  assert.ok(checked >= 10, 'Check real themed case pools, not only small fixtures');
  console.log(`Local integration: ${checked} themed cases passed all-wear RTP, loss-tier and 100% chance checks (${context.CS2_SKINS.length} skins).`);
}
console.log('Skin-drop regressions passed: 5 exteriors, supported variants, HMAC pairing, all-wear RTP, rarity filters, exact target prices, cloud/live preservation, exclusive sales and one-time PASS claims.');
