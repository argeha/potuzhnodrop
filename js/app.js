/* ============ ПОТУЖНО DROP 7.9.0 ============ */
const STORAGE = {
  consent: 'potuzhno_v5_notice',
  page: 'potuzhno_v5_page',
  steamId: 'potuzhno_v2_steamid',
  balance: 'potuzhno_v2_balance',
  inventory: 'potuzhno_v2_inventory',
  started: 'potuzhno_v2_started',
  bonusAt: 'potuzhno_v2_last_bonus',
  sound: 'potuzhno_v2_sound',
  music: 'potuzhno_v79_music',
  musicTrack: 'potuzhno_v79_music_track',
  haptics: 'potuzhno_v7_haptics',
  game: 'potuzhno_v6_game',
  account: 'potuzhno_v6_account',
  topup: 'potuzhno_v5_topup',
  pendingReferral: 'potuzhno_v7_pending_referral',
  economyVersion: 'potuzhno_v72_stable_economy',
  freeCase: 'potuzhno_v5_freecase',
  // v42 deliberately discards the former multi-thousand-record browser cache.
  // It could stall mobile browsers before the Cases interface was interactive.
  catalogCache: 'potuzhno_catalog_cache_v42',
  pendingWager: 'potuzhno_v6_pending_wager',
  fair: 'potuzhno_v9_fair',
  steamNudge: 'potuzhno_v10_steam_nudge',
  profileTab: 'potuzhno_v79_profile_tab',
  adminProfileRefresh: 'potuzhno_v6_admin_profile_refresh',
  adminGameRefresh: 'potuzhno_v6_admin_game_refresh'
};

const PAGES = ['hub', 'upgrader', 'case', 'battle', 'royale', 'contract', 'tasks', 'profile', 'stats', 'about'];
const RUNTIME_PAGE_FEATURES = Object.freeze({
  upgrader: 'upgrader',
  case: 'cases',
  battle: 'battle',
  royale: 'royale',
  contract: 'contract',
  tasks: 'tasks'
});
const RUNTIME_CONTENT_FEATURES = Object.freeze(['cases', 'upgrader', 'battle', 'royale', 'contract', 'tasks', 'battlePass', 'seasonalEvents']);
const RUNTIME_CASE_CATEGORIES = new Set(['hot', 'knives', 'gloves', 'weapons', 'budget']);
const RUNTIME_CASE_THEMES = new Set(['gray', 'blue', 'purple', 'gold', 'red', 'pink', 'emerald']);
const RUNTIME_CASE_POOL_KINDS = new Set(['all', 'weapons', 'knives', 'gloves']);
const RUNTIME_CASE_RARITIES = new Set(['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert', 'Contraband', 'Extraordinary']);
const RUNTIME_CONTENT_TONES = new Set(['cyan', 'amber', 'violet', 'rose', 'emerald']);
const RUNTIME_CONTENT_PAGES = new Set(['hub', 'case', 'upgrader', 'battle', 'royale', 'contract', 'tasks', 'profile', 'stats']);
const DEFAULT_RUNTIME_CONTENT = Object.freeze({
  revision: 0,
  features: Object.freeze(Object.fromEntries(RUNTIME_CONTENT_FEATURES.map(feature => [feature, true]))),
  hiddenCaseIds: Object.freeze([]),
  customCases: Object.freeze([]),
  announcement: Object.freeze({ enabled: false, tone: 'cyan', title: '', body: '', ctaLabel: '', ctaPage: 'hub', startsAt: 0, endsAt: 0 }),
  promos: Object.freeze([]),
  battlePass: Object.freeze({ title: 'POTUZHNO PASS', subtitle: 'Грай, заробляй XP і забирай сезонні нагороди.', startsAt: 0, endsAt: 0 }),
  season: Object.freeze({ title: 'Сезон: Сигнал', subtitle: 'Збирай вузли та залишай слід у своєму профілі.', startsAt: 0, endsAt: 0 }),
  economy: Object.freeze({ casePriceMultiplier: 1, taskRewardMultiplier: 1 })
});
let runtimeContent = DEFAULT_RUNTIME_CONTENT;
let runtimeContentLoaded = false;

let currentPage = null;
function showPage(id) {
  renderHalloweenSeasonShell();
  if (!PAGES.includes(id)) id = 'hub';
  const requestedId = id;
  if (!isRuntimePageEnabled(id)) {
    id = 'hub';
    if (requestedId !== 'hub') showToast('Цей режим зараз приховано адміністрацією.', 'info');
  }
  if (currentPage === id && document.querySelector(`[data-page="${id}"]:not(.hidden)`)) {
    return;
  }
  currentPage = id;

  document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('hidden', el.dataset.page !== id));
  document.querySelectorAll('[data-nav]').forEach(el => {
    const active = el.dataset.nav === id;
    el.classList.toggle('active', active);
    el.setAttribute('aria-current', active ? 'page' : 'false');
  });
  document.querySelectorAll('[data-mobile-nav]').forEach(el => {
    const active = el.dataset.mobileNav === id;
    el.classList.toggle('active', active);
    el.setAttribute('aria-current', active ? 'page' : 'false');
  });

  document.title = `${getPageDisplayTitle(id)} · ${getActiveBrandName()}`;

  localStorage.setItem(STORAGE.page, id);
  if (location.hash.replace('#', '') !== id) {
    location.hash = id;
  }

  document.getElementById('mobileMenu')?.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'hub') renderCommandHub();
  if (id === 'case') {
    updateFreeCaseBtn();
    renderCaseCatalog();
  }
  if (id === 'tasks') renderGameHub();
  if (id === 'profile') {
    renderProfileProgress();
    renderProfileInventory();
    renderProfileTabs();
    updateAccountUI();
  }
  if (id === 'stats') renderStatsPage();
  if (id === 'battle') {
    resetCoinVisual();
    renderBattleRoom();
    renderBattleLobby();
    void refreshBattleListings();
  }
  if (id === 'royale') {
    // An Open Bank lobby belongs to the server; reopening this page must never
    // erase its participants or replace them with local AI data.
    if (royaleMode === 'bots' && !royaleInProgress) resetRoyale();
    setTimeout(initRoyalePage, 30);
  }
  syncBackgroundMusic();
}

window.addEventListener('hashchange', () => {
  const h = location.hash.replace('#', '') || 'hub';
  if (PAGES.includes(h) && h !== currentPage) showPage(h);
});

const PROFILE_SECTION_TABS = Object.freeze(['collection', 'showcase', 'achievements', 'style']);

function getProfileTab() {
  try {
    const saved = localStorage.getItem(STORAGE.profileTab);
    return PROFILE_SECTION_TABS.includes(saved) ? saved : 'collection';
  } catch {
    return 'collection';
  }
}

function renderProfileTabs() {
  const active = getProfileTab();
  document.querySelectorAll('[data-profile-tab]').forEach(button => {
    const selected = button.dataset.profileTab === active;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  document.querySelectorAll('[data-profile-section]').forEach(section => {
    section.classList.toggle('profile-tab-hidden', section.dataset.profileSection !== active);
  });
}

function setProfileTab(tab) {
  const next = PROFILE_SECTION_TABS.includes(tab) ? tab : 'collection';
  try { localStorage.setItem(STORAGE.profileTab, next); } catch {}
  renderProfileTabs();
}

window.setProfileTab = setProfileTab;

function openInventoryPage() {
  // The inventory lives in the collection part of the profile, but it is a
  // core game surface — never make a player search through profile tabs for it.
  setProfileTab('collection');
  if (currentPage !== 'profile') showPage('profile');
  else {
    renderProfileInventory();
    renderProfileTabs();
  }
  requestAnimationFrame(() => {
    document.getElementById('profileInventoryPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

window.openInventoryPage = openInventoryPage;

function toggleThemeMenu() {
  document.getElementById('themeMenu')?.classList.toggle('hidden');
}

function pickTheme(id) {
  setTheme(id);
  document.getElementById('themeMenu')?.classList.add('hidden');
  updateThemeMenuState();
}

function updateThemeMenuState() {
  const t = gameState?.theme || 'amber';
  document.querySelectorAll('[data-theme-pick]').forEach(b => b.classList.toggle('is-active', b.dataset.themePick === t));
}

document.addEventListener('click', e => {
  const m = document.getElementById('themeMenu');
  const d = document.querySelector('.theme-drop');
  if (m && d && !d.contains(e.target)) m.classList.add('hidden');
});

const WEAR_TIERS = [
  { code: 'FN', name: 'Factory New', min: 0, max: 0.07, mult: 1.35 },
  { code: 'MW', name: 'Minimal Wear', min: 0.07, max: 0.15, mult: 1.15 },
  { code: 'FT', name: 'Field-Tested', min: 0.15, max: 0.38, mult: 1.0 },
  { code: 'WW', name: 'Well-Worn', min: 0.38, max: 0.45, mult: 0.85 },
  { code: 'BS', name: 'Battle-Scarred', min: 0.45, max: 1, mult: 0.70 }
];

// PC is a virtual game balance. It is not money, cannot be withdrawn and
// cannot be exchanged for Steam inventory.
const LEGACY_ECONOMY_SCALE = 0.01;
const USD_ECONOMY_VERSION = 'usd-v1';
const STABLE_ECONOMY_VERSION = 'stable-catalog-v1';
const BALANCED_ECONOMY_VERSION = 'balanced-v2';
const STABLE_ECONOMY_SOURCE = 'Стабільний індекс ПОТУЖНО';
const STABLE_WEAR_MULTIPLIERS = Object.freeze({ FN: 1.18, MW: 1.09, FT: 1, WW: 0.87, BS: 0.76 });
const STABLE_RARITY_VALUES = Object.freeze({
  'Consumer Grade': 4,
  'Industrial Grade': 8,
  'Mil-Spec Grade': 16,
  Restricted: 35,
  Classified: 80,
  Covert: 180,
  Contraband: 2500,
  Extraordinary: 700
});
const STABLE_ANCHOR_VALUES = Object.freeze({
  'AK-47 | Wild Lotus': 6500,
  'AWP | Gungnir': 7000,
  'AWP | Dragon Lore': 6000,
  'M4A4 | Howl': 4000,
  'AWP | Medusa': 2800,
  'AK-47 | Gold Arabesque': 1200,
  'AWP | Desert Hydra': 1000,
  'AK-47 | Fire Serpent': 950,
  'AK-47 | X-Ray': 900,
  'M4A1-S | Knight': 850,
  'AK-47 | Hydroponic': 650,
  'Glock-18 | Fade': 650,
  'M4A1-S | Blue Phosphor': 550,
  'Desert Eagle | Fennec Fox': 500,
  'M4A1-S | Printstream': 220,
  'AK-47 | Vulcan': 150,
  'USP-S | Kill Confirmed': 160,
  'Desert Eagle | Printstream': 120,
  'AWP | Asiimov': 75,
  'AK-47 | Neon Rider': 40,
  'AK-47 | Redline': 35,
  'Glock-18 | Water Elemental': 22,
  'AWP | Atheris': 12
});

function roundPc(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function legacyPc(value, fallback = 0) {
  return roundPc((Number(value) || fallback) * LEGACY_ECONOMY_SCALE);
}

function stableCatalogField(skin, field, maxLength = 160) {
  const value = skin?.[field];
  return String(typeof value === 'string' ? value : value?.name || '').trim().slice(0, maxLength);
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || 'potuzhno')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableWearCode(value) {
  const code = String(typeof value === 'string' ? value : value?.code || 'FT').trim().toUpperCase();
  return Object.hasOwn(STABLE_WEAR_MULTIPLIERS, code) ? code : 'FT';
}

// The small fixed variation makes catalogue tiers readable without reacting
// to supply, demand, a browser cache or any external marketplace.
const stableCatalogPriceCache = new Map();
function stableCatalogPrice(skin, wear = 'FT') {
  const name = stableCatalogField(skin, 'name') || 'CS2 Skin';
  const category = stableCatalogField(skin, 'category', 64);
  const weapon = stableCatalogField(skin, 'weapon', 64);
  const rarity = stableCatalogField(skin, 'rarity', 48) || 'Consumer Grade';
  const wearCode = stableWearCode(wear);
  const cacheKey = `${name}|${category}|${weapon}|${rarity}|${wearCode}`;
  const cached = stableCatalogPriceCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const lowerName = name.toLowerCase();
  const inferredKnife = /^★/.test(name) || /knife|karambit|bayonet|talon|falchion|navaja|daggers/i.test(name);
  const inferredGloves = /gloves|wraps|hand wraps|hydra gloves|sport gloves|specialist gloves/i.test(name);
  const type = category || (inferredGloves ? 'Gloves' : inferredKnife ? 'Knives' : '');
  const hashFactor = 0.94 + (stableHash(`${name}:v1`) % 13) / 100;
  const finishMultiplier = /doppler|sapphire|ruby|emerald|black pearl/i.test(lowerName)
    ? 3.2
    : /fade|marble fade|gamma doppler/i.test(lowerName)
      ? 2.25
      : /lore|slaughter|crimson web|tiger tooth/i.test(lowerName)
        ? 1.65
        : /printstream|vulcan|asiimov|neo-noir|kill confirmed|fuel injector|the empress|case hardened/i.test(lowerName)
          ? 1.45
          : 1;
  let base = Number(STABLE_ANCHOR_VALUES[name]) || 0;
  if (!base && type === 'Knives') {
    const knifeType = /butterfly/i.test(name) ? 1.7
      : /karambit/i.test(name) ? 1.55
        : /m9/i.test(name) ? 1.45
          : /talon/i.test(name) ? 1.3
            : /bayonet/i.test(name) ? 1.15
              : /falchion/i.test(name) ? 0.8
                : /gut/i.test(name) ? 0.72
                  : 1;
    base = 260 * knifeType * finishMultiplier * hashFactor;
  } else if (!base && type === 'Gloves') {
    const glovePremium = /pandora|vice|spearmint|hedge maze|superconductor/i.test(lowerName) ? 2.8 : finishMultiplier;
    base = 180 * glovePremium * hashFactor;
  } else if (!base) {
    const weaponFactor = /^(awp|ak-47|m4a1-s|m4a4|desert eagle)/i.test(weapon) ? 1.15
      : /^(usp-s|glock-18|five-seven|p250)/i.test(weapon) ? 1
        : 0.85;
    base = (STABLE_RARITY_VALUES[rarity] || 16) * weaponFactor * finishMultiplier * hashFactor;
  }
  const value = Math.max(1, Math.min(1_000_000, roundPc(Math.round(base * (STABLE_WEAR_MULTIPLIERS[wearCode] || 1) * 2) / 2, 1)));
  if (stableCatalogPriceCache.size >= 12_000) stableCatalogPriceCache.clear();
  stableCatalogPriceCache.set(cacheKey, value);
  return value;
}

function rollWear(randomValue = Math.random()) {
  const r = clampNumber(randomValue, 0, 0.999999999, Math.random());
  if (r < 0.10) return WEAR_TIERS[0];
  if (r < 0.28) return WEAR_TIERS[1];
  if (r < 0.75) return WEAR_TIERS[2];
  if (r < 0.90) return WEAR_TIERS[3];
  return WEAR_TIERS[4];
}

function getWear(i) {
  return normalizeWear(i?.wear);
}

const CS2_RARITY_META = Object.freeze({
  'consumer grade': { name: 'ШИРВЖИТОК', color: '#b0c3d9', tier: 'consumer' },
  'industrial grade': { name: 'ПРОМИСЛОВЕ', color: '#5e98d9', tier: 'industrial' },
  'mil spec grade': { name: 'АРМІЙСЬКЕ', color: '#4b69ff', tier: 'mil-spec' },
  restricted: { name: 'ЗАБОРОНЕНЕ', color: '#8847ff', tier: 'restricted' },
  classified: { name: 'ЗАСЕКРЕЧЕНЕ', color: '#d32ce6', tier: 'classified' },
  covert: { name: 'ТАЄМНЕ', color: '#eb4b4b', tier: 'covert' },
  contraband: { name: 'КОНТРАБАНДА', color: '#e4ae39', tier: 'contraband' },
  extraordinary: { name: 'НАДЗВИЧАЙНЕ', color: '#e4ae39', tier: 'extraordinary' }
});

function getItemRarity(item) {
  const rawRarity = item?.rarity;
  const sourceName = cleanText(rawRarity?.name || rawRarity || 'CS2', 48) || 'CS2';
  const lookupKey = sourceName.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  const mapped = CS2_RARITY_META[lookupKey];
  return {
    name: mapped?.name || sourceName.toUpperCase(),
    sourceName,
    color: mapped?.color || cleanColor(rawRarity?.color || item?.rarityColor),
    tier: mapped?.tier || 'default'
  };
}

function rarityStripMarkup(rarity, className) {
  return `<div class="${className}" role="img" aria-label="Рідкість: ${escapeHtml(rarity.name)}" title="Рідкість: ${escapeHtml(rarity.name)}"></div>`;
}

function priceWithWear(b, w) {
  return Math.max(0.01, roundPc((Number(b) || 0) * (w?.mult || 1), 0.01));
}

let CS2_SKINS = [
  { id: 1, name: "★ Butterfly Knife | Doppler", price: 76000, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJn7-HnvDzMITElyUIu5Vz2-yWq9mh2VaxrRE9YW2gJ46ccVZoZgzZ_wLskb_qjJ66u8vAnXc1viRzsniMlwv330_Z8iZt/360fx360f", rarity: "Extraordinary", rarityColor: "#eb4b4b" },
  { id: 2, name: "★ Karambit | Fade", price: 88000, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJn7-HnvDzMITElyUIu5Vz2-yWq9mh2VaxrRE9YW2gJ46ccVZoZgzZ_wLskb_qjJ66u8vAnXc1viRzsniMlwv330_Z8iZt/360fx360f", rarity: "Extraordinary", rarityColor: "#eb4b4b" },
  { id: 3, name: "★ M9 Bayonet | Marble Fade", price: 54000, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJn7-HnvDzMITElyUIu5Vz2-yWq9mh2VaxrRE9YW2gJ46ccVZoZgzZ_wLskb_qjJ66u8vAnXc1viRzsniMlwv330_Z8iZt/360fx360f", rarity: "Extraordinary", rarityColor: "#eb4b4b" },
  { id: 4, name: "★ Karambit | Doppler", price: 62000, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJn7-HnvDzMITElyUIu5Vz2-yWq9mh2VaxrRE9YW2gJ46ccVZoZgzZ_wLskb_qjJ66u8vAnXc1viRzsniMlwv330_Z8iZt/360fx360f", rarity: "Extraordinary", rarityColor: "#eb4b4b" },
  { id: 5, name: "AWP | Dragon Lore", price: 145000, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FBRw7P7NYghD_tW1n4mOmPjjOr7VglRd4cJ5nqeW8ois2Qbj-0A-YGHzLdCccVZoZwvYr1G3kLrt0ZO5vJ2bzHdksnRx53fD30v33096y2vPmw/360fx360f", rarity: "Covert", rarityColor: "#eb4b4b" },
  { id: 6, name: "AWP | Asiimov", price: 3200, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FBRw7P7NYghD_tW1n4mOmPjjOr7VglRd4cJ5nqeW8ois2Qbj-0A-YGHzLdCccVZoZwvYr1G3kLrt0ZO5vJ2bzHdksnRx53fD30v33096y2vPmw/360fx360f", rarity: "Covert", rarityColor: "#eb4b4b" },
  { id: 7, name: "AWP | Atheris", price: 180, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FBRw7P7NYghD_tW1n4mOmPjjOr7VglRd4cJ5nqeW8ois2Qbj-0A-YGHzLdCccVZoZwvYr1G3kLrt0ZO5vJ2bzHdksnRx53fD30v33096y2vPmw/360fx360f", rarity: "Restricted", rarityColor: "#8847ff" },
  { id: 8, name: "AK-47 | Case Hardened", price: 28000, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09u_mI-ImfbmNqjCnDBp68hyied3jNqi2wSy-hc9MDr0cdeccFU7ZVjY-Vfsxr3qg8O-v8udy3Ng7CV35yvemhax0xhEPLY9j8-qfA/360fx360f", rarity: "Classified", rarityColor: "#d32ce6" },
  { id: 10, name: "AK-47 | Redline", price: 650, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09u_mI-ImfbmNqjCnDBp68hyied3jNqi2wSy-hc9MDr0cdeccFU7ZVjY-Vfsxr3qg8O-v8udy3Ng7CV35yvemhax0xhEPLY9j8-qfA/360fx360f", rarity: "Classified", rarityColor: "#d32ce6" },
  { id: 11, name: "M4A1-S | Printstream", price: 4200, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpOwMR1LjJf2PLacDBA5ciJn7-HnvDzMITElyUIu5Vz2-yWq9mh2VaxrRE9YW2gJ46ccVZoZgzZ_wLskb_qjJ66u8vAnXc1viRzsniMlwv330_Z8iZt/360fx360f", rarity: "Covert", rarityColor: "#eb4b4b" },
  { id: 12, name: "M4A4 | Howl", price: 85000, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpOwMR1LjJf2PLacDBA5ciJn7-HnvDzMITElyUIu5Vz2-yWq9mh2VaxrRE9YW2gJ46ccVZoZgzZ_wLskb_qjJ66u8vAnXc1viRzsniMlwv330_Z8iZt/360fx360f", rarity: "Contraband", rarityColor: "#e4ae39" },
  { id: 13, name: "Desert Eagle | Printstream", price: 1800, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PLZTjlH_9mkgL-OkvnxN7LEmyUE68Yl2-rA89ii2VHkqhQ9ZTqhdtOSdFNoaV-CqALvl-_vjJS6uMvKnHY37iVz4GGdwUInhQ/360fx360f", rarity: "Classified", rarityColor: "#d32ce6" },
  { id: 14, name: "USP-S | Kill Confirmed", price: 3100, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpoovrFEeflxyT3eTBH_9mkgL-OlvnxN7LEmyUGu5Yoj7jDrY6l3wO2rkZsNj3xd9SRJwU3Z1rWr1O_xr27hMfqvsnKynQw6Cc8pCvD30v3308VwA7j/360fx360f", rarity: "Covert", rarityColor: "#eb4b4b" },
  { id: 15, name: "Glock-18 | Water Elemental", price: 350, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxl7PLKYQJH_uO1gb-Gw_alIITGnXBX7fp3i-vJ8Ij33wKxrhVuMW7wd9SWcAQ7ZAzYr1K2xb3rh8S6t5ibynE16HYl53rfnRbpgg/360fx360f", rarity: "Restricted", rarityColor: "#8847ff" },
  { id: 18, name: "AWP | Neo-Noir", price: 850, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FBRw7P7NYghD_tW1n4mOmPjjOr7VglRd4cJ5nqeW8ois2Qbj-0A-YGHzLdCccVZoZwvYr1G3kLrt0ZO5vJ2bzHdksnRx53fD30v33096y2vPmw/360fx360f", rarity: "Classified", rarityColor: "#d32ce6" },
  { id: 20, name: "AWP | Wildfire", price: 5200, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FBRw7P7NYghD_tW1n4mOmPjjOr7VglRd4cJ5nqeW8ois2Qbj-0A-YGHzLdCccVZoZwvYr1G3kLrt0ZO5vJ2bzHdksnRx53fD30v33096y2vPmw/360fx360f", rarity: "Covert", rarityColor: "#eb4b4b" },
  { id: 21, name: "AK-47 | Asiimov", price: 1100, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09u_mI-ImfbmNqjCnDBp68hyied3jNqi2wSy-hc9MDr0cdeccFU7ZVjY-Vfsxr3qg8O-v8udy3Ng7CV35yvemhax0xhEPLY9j8-qfA/360fx360f", rarity: "Covert", rarityColor: "#eb4b4b" },
  { id: 22, name: "Glock-18 | Fade", price: 8500, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxl7PLKYQJH_uO1gb-Gw_alIITGnXBX7fp3i-vJ8Ij33wKxrhVuMW7wd9SWcAQ7ZAzYr1K2xb3rh8S6t5ibynE16HYl53rfnRbpgg/360fx360f", rarity: "Restricted", rarityColor: "#8847ff" },
  { id: 23, name: "P250 | See Ya Later", price: 420, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpopujwezhoys3BJQJH_uO1gb-Gw_alIITGnXBX7fp3i-vJ8Ij33wKxrhVuMW7wd9SWcAQ7ZAzYr1K2xb3rh8S6t5ibynE16HYl53rfnRbpgg/360fx360f", rarity: "Restricted", rarityColor: "#8847ff" }
];

const CATEGORY_LABELS = {
  Rifles: 'Гвинтівки',
  Pistols: 'Пістолети',
  SMGs: 'ПП',
  Heavy: 'Важка зброя',
  Knives: 'Ножі',
  Gloves: 'Рукавиці',
  Equipment: 'Спорядження'
};

// Never fetch the multi-megabyte public mirror in a browser. The Worker
// returns a compact, balanced game catalogue and is the sole client source.
const CS2_SKINS_APIS = ['/api/catalog/skins'];

// These images are kept locally as URLs for the first painted case catalog.
// They are current Steam CDN locations; the previous legacy CDN paths return
// 404 before the full remote catalog has finished loading.
const FEATURED_SKIN_IMAGES = Object.freeze({
  '★ Butterfly Knife | Doppler': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Z-ua6bbZrLOmsD2qvw-J3s-p5SiihmSIqsi-HlorwOy7DAVRPVssnHaMUuhe9xIHlMuvqtgPf2IoTyC383Sod7CY-sr4DVfZ2qKPU3g-TNuE-545DeqjFvb87vg',
  '★ Karambit | Fade': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Q7uCvZaZkNM-SD1iWwOpzj-1gSCGn20tztm_UyIn_JHKUbgYlWMcmQ-ZcskSwldS0MOnntAfd3YlMzH35jntXrnE8SOGRGG8',
  '★ M9 Bayonet | Marble Fade': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Wts2sab1iLvWHMWad_uN3ouNlSha1lBkijDGMnYftb3OTbVRyD8Z1RrNctkS6kobkZLzi7gTW2NpFxH33hi9Nuno65uxXAqs7uvqA7lyFHH4',
  '★ Karambit | Doppler': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Q7uCvZaZkNM-SA1iSze91u_FsTju_qhAmoT-Jn4bjJC_4Ml93UtZuRLQPsBawkNfiMbnl5AKMiopCnin7iCJBv31j4rkBBKEg-6zUjV3GY6p9v8dpLWT3Fg',
  'AWP | Dragon Lore': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk4veqYaF7IfysCnWRxuF4j-B-Xxa_nBovp3Pdwtj9cC_GaAd0DZdwQu9fuhS4kNy0NePntVTbjYpCyyT_3CgY5i9j_a9cBkcCWUKV',
  'AWP | Asiimov': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V6V-Kf2cGFidxOp_pewnF3nhxEt0sGnSzN76dH3GOg9xC8FyEORftRe-x9PuYurq71bW3d8UnjK-0H0YSTpMGQ',
  'AWP | Atheris': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V7JkMPWBMWuZxuZi_rZsS3zgzU8isW3dnIr6eHKfPVAhDpojEe9YsUW4xta1Nuzm5FDci4NbjXKpmWVQppo',
  'AK-47 | Case Hardened': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiNK0P2nZKFpH_yaCW-Ej7sk5bE8Sn-2lEpz4zndzoyvdHuUPwFzWZYiE7EK4Bi4k9TlY-y24FbAy9USGSiZd5Q',
  'AK-47 | Redline': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSI_-RHGavzedxuPUnFniykEtzsWWBzoyuIiifaAchDZUjTOZe4RC_w4buM-6z7wzbgokUyzK-0H08hRGDMA',
  'M4A1-S | Printstream': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwjFS4_ega6F_H_OGMWrEwL9lj_F7Rienhgk1tjyIpYPwJiPTcAAoCpsiEO5ZsUbpm9C2Zuni4VHW3o5EzSX62HxP7Sg96-hWVqYi_6TJz1aW0nxrkGs',
  'M4A4 | Howl': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwiFO0P_6afVSKP-EAm6extF6ueZhW2exwkl2tmTXwt39eCiUPQR2DMN4TOVetUK8xoLgM-K341eM2otDnC6okGoXufBz_TAB',
  'Desert Eagle | Printstream': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL1m5fn8Sdk7OeRbKFsJ8-DHG6e1f1iouRoQha_nBovp3OGmdeqInyVP1V0XsYlRbEI50a5wNyzZr605AyI3t5MmCSohylAuC89_a9cBoMY9UkV',
  'USP-S | Kill Confirmed': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLkjYbf7itX6vytbbZSI-WsG3SA_uV_vO1WTCa9kxQ1vjiBpYPwJiPTcFB2Xpp5TO5cskG9lYCxZu_jsVCL3o4Xnij23ClO5ik9tegFA_It8qHJz1aWe-uc160',
  'Glock-18 | Water Elemental': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL2kpnj9h1Y-s2pZKtuK72fB3aFxP11te99cCW6khUz_TjVyompc3-QOFR2DJQkFOMJtBbqk9LlY-7n5QLZjtkTxCWqhixPv311o7FVIf8eASQ',
  'AWP | Neo-Noir': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V6poL_6cB3WvzedxuPUnHirrxR4l423SyI39I3KXPwdxWZclQeNZ5EXskYfnNeyw71OMi9lNzDK-0H3r66pOTw',
  'AWP | Wildfire': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V7NkLPSVB3WV_uJ_t-l9AX7rxhl-tmzSwomtdC6TPwQnW5UkR-YD5kK-ltCzP-Ox4FfXiNoQyyrgznQeu9L0PzQ',
  'AK-47 | Asiimov': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSIeOaB2qf19F6ueZhW2e2wEt-t2jcytf6dymSO1JxA5oiRecLsRa5kIfkYr-241aLgotHz3-rkGoXuUp8oX57',
  'Glock-18 | Fade': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL2kpnj9h1a7s2oaaBoH_yaCW-Ej-8u5bZvHnq1w0Vz62TUzNj4eCiVblMmXMAkROJeskLpkdXjMrzksVTAy9US8PY25So',
  'P250 | See Ya Later': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLhzMOwwiFO0OL8PfRSI-mRC3WT0-F1j-1gSCGn2x9ytmzWnN6pInjGOwMlDZp0EORe5BHsx93lP7zr5wzbiI5AyXr_jS9XrnE8gQrIgng'
});

function applyFeaturedSkinMetadata(skin) {
  const ftPrice = stableCatalogPrice(skin, 'FT');
  return {
    ...skin,
    img: FEATURED_SKIN_IMAGES[skin.name] || skin.img,
    marketPrices: { ...(skin.marketPrices || {}), FT: ftPrice },
    marketPrice: ftPrice,
    marketUpdatedAt: 0,
    marketSource: STABLE_ECONOMY_SOURCE,
    pricingVersion: STABLE_ECONOMY_VERSION,
    price: ftPrice,
    fallbackPrice: ftPrice
  };
}

CS2_SKINS = CS2_SKINS
  .map(applyFeaturedSkinMetadata);

const MAX_STORED_ITEM_VALUE = 1_000_000;
const MAX_STORED_BALANCE = 10_000_000;
const TRUSTED_IMAGE_HOSTS = new Set([
  'community.cloudflare.steamstatic.com',
  'community.akamai.steamstatic.com',
  'avatars.steamstatic.com',
  'avatars.akamai.steamstatic.com',
  'avatars.fastly.steamstatic.com',
  'steamcdn-a.akamaihd.net',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net'
]);

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function cleanText(value, maxLength = 160) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

function cleanImageUrl(value) {
  const source = cleanText(value, 2048);
  if (!source) return '';
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && TRUSTED_IMAGE_HOSTS.has(url.hostname) ? url.href : '';
  } catch {
    return '';
  }
}

// The browser keeps relative API paths. The signed Android client supplies a
// verified Worker origin through its native bridge, so image URLs continue to
// work when the UI itself is loaded from the local app bundle.
function gameApiUrl(path) {
  const mobile = window.PotuzhnoMobile;
  return mobile?.isNative && typeof mobile.apiUrl === 'function' ? mobile.apiUrl(path) : path;
}

// Images are ordinary HTTPS assets. An <img> can load them directly without
// CORS permission, whereas routing a multi-kilobyte Steam URL through an API
// query can be rejected by an edge before the server ever sees it. Keeping the
// trusted CDN URL intact makes weapon art work in the site and Android client.
function getKnownSkinImageUrl(skin) {
  const direct = cleanImageUrl(skin?.img);
  if (direct) return direct;
  const name = cleanText(skin?.name || '', 160);
  const sourceSkinId = cleanText(skin?.sourceSkinId || skin?.id || '', 128);
  const known = CS2_SKINS.find(candidate => (
    (sourceSkinId && String(candidate?.id || '') === sourceSkinId)
    || (name && candidate?.name === name)
  ));
  return cleanImageUrl(known?.img || FEATURED_SKIN_IMAGES[name] || '');
}

function getSkinImageSrc(skin) {
  return getKnownSkinImageUrl(skin) || createSkinPreview(skin?.name || 'CS2 SKIN');
}

function cleanColor(value) {
  const color = cleanText(value, 32);
  return /^#[0-9a-f]{3,8}$/i.test(color) || /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/i.test(color)
    ? color
    : '#b0c3d9';
}

function normalizeWear(wear) {
  return WEAR_TIERS.find(tier => tier.code === wear?.code) || WEAR_TIERS[2];
}

function normalizeStoredItem(item, index = 0) {
  if (!item || typeof item !== 'object') return null;
  const id = cleanText(item.id || `import-${Date.now()}-${index}`, 128);
  const name = cleanText(item.name || 'CS2 Skin', 160);
  const wear = normalizeWear(item.wear);
  const stablePrice = stableCatalogPrice(item, wear);
  return {
    id,
    sourceSkinId: cleanText(item.sourceSkinId || item.id || '', 128),
    steamAssetId: cleanText(item.steamAssetId || '', 64),
    steamOwnerId: /^\d{17}$/.test(String(item.steamOwnerId || '')) ? String(item.steamOwnerId) : '',
    steamImported: item.steamImported === true,
    name,
    weapon: cleanText(item.weapon, 64),
    category: cleanText(item.category, 64),
    rarity: cleanText(item.rarity || 'CS2', 48),
    rarityColor: cleanColor(item.rarityColor),
    img: cleanImageUrl(item.img),
    basePrice: stablePrice,
    wear,
    marketPrice: stablePrice,
    marketHashName: name,
    marketUpdatedAt: 0,
    marketSource: STABLE_ECONOMY_SOURCE,
    pricingVersion: STABLE_ECONOMY_VERSION,
    price: stablePrice,
    virtual: item.virtual !== false,
    exclusive: item.exclusive === true,
    // Season and collection rewards are cosmetic achievements.  Keeping them
    // in the catalogue is useful for a consistent collection value, but they
    // must not become a hidden source of sellable PC.
    accountBound: item.accountBound === true || item.battlePassReward === true || item.collectionReward === true || item.dailyCalendarReward === true || Boolean(item.halloweenEvent) || /-(?:battle-pass|halloween-\d{4}|daily-calendar|exclusive)$/.test(id),
    battlePassReward: item.battlePassReward === true,
    collectionReward: item.collectionReward === true,
    dailyCalendarReward: item.dailyCalendarReward === true,
    halloweenEvent: item.halloweenEvent === true,
    addedAt: clampNumber(item.addedAt, 0, Number.MAX_SAFE_INTEGER, Date.now())
  };
}

function normalizeCatalogSkin(skin, index = 0) {
  if (!skin || typeof skin !== 'object') return null;
  const name = cleanText(skin.name, 160);
  const weapon = cleanText(skin.weapon, 64);
  const category = cleanText(skin.category, 64);
  const img = cleanImageUrl(skin.img);
  if (!name || !weapon || !category || !img) return null;
  const catalogSkin = {
    id: cleanText(skin.id || `cs2-${index}`, 128),
    name,
    weapon,
    category,
    rarity: cleanText(skin.rarity || 'Consumer Grade', 48),
    rarityColor: cleanColor(skin.rarityColor),
    img,
    wears: Array.isArray(skin.wears) ? skin.wears.map(wear => cleanText(wear?.name || wear, 32)).filter(Boolean).slice(0, 5) : [],
    marketPrices: {},
    marketUpdatedAt: 0,
    marketSource: STABLE_ECONOMY_SOURCE,
    pricingVersion: STABLE_ECONOMY_VERSION,
    price: 1
  };
  const ftPrice = stableCatalogPrice(catalogSkin, 'FT');
  return { ...catalogSkin, marketPrices: { FT: ftPrice }, marketPrice: ftPrice, price: ftPrice };
}

function marketPriceForWear(skin, wear) {
  // The catalogue index is the single source of virtual values everywhere.
  return verifiedMarketPriceForWear(skin, wear);
}

function stableCatalogSourceForItem(item) {
  const sourceSkinId = cleanText(item?.sourceSkinId || item?.id, 128);
  const name = cleanText(item?.name, 160);
  const catalogSkin = CS2_SKINS.find(candidate => (
    (sourceSkinId && String(candidate?.id || '') === sourceSkinId)
    || (name && candidate?.name === name)
  ));
  return catalogSkin
    ? {
      ...item,
      weapon: item?.weapon || catalogSkin.weapon,
      category: item?.category || catalogSkin.category,
      rarity: item?.rarity && item.rarity !== 'CS2' ? item.rarity : catalogSkin.rarity
    }
    : item;
}

function stableInventoryPrice(item) {
  return stableCatalogPrice(stableCatalogSourceForItem(item), getWear(item));
}

let currentUser = null;
let userInventory = [];
let soundEnabled = true;
let musicEnabled = true;
let musicInteractionUnlocked = false;
let hapticsEnabled = true;
let filteredSkins = CS2_SKINS;
let visibleSkinCount = 80;
// Cases only need a fast compact catalogue. The full collection is kept
// separate and grows page by page only inside the skin shop.
const SHOP_CATALOG_PAGE_SIZE = 72;
let shopCatalogSkins = [];
let shopCatalogTotal = 0;
let shopCatalogNextOffset = 0;
let shopCatalogHasMore = true;
let shopCatalogPagePromise = null;
let selectedInputMode = 'skin';
let selectedInputSkin = null;
let balanceStake = 50;
let selectedTargetSkin = null;
let rollMode = 'over';
let isRolling = false;
let multiInputSkins = [];
const MULTI_INPUT_MAX = 10;
const MULTI_INPUT_MIN = 2;

let gameState = null;
let isCaseOpening = false;
let isFreeCaseOpening = false;
let account = null;
let pendingWager = null;
let fairState = null;
let lastCaseFairAudit = [];
let lastDropContext = 'case';
let steamSyncPromise = null;
let steamConnectionState = 'disconnected';
let steamConnectionMessage = '';
let publicProfilePublishTimer = null;
let publicProfilePublishPromise = null;
let activePublicProfile = null;
let profileModeration = { blocked: false, reason: '', updatedAt: 0 };
let profileVisibility = { hidden: false, updatedAt: 0 };
function normalizeProfileModeration(value) {
  const blocked = value?.blocked === true;
  return {
    blocked,
    reason: blocked ? cleanText(value?.reason || 'Доступ до гри тимчасово обмежено адміністрацією.', 240) : '',
    updatedAt: clampNumber(value?.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0)
  };
}

function isProfileBlocked() {
  return profileModeration?.blocked === true;
}

function renderProfileBlockOverlay() {
  const existing = document.getElementById('profileBlockOverlay');
  if (!isProfileBlocked()) {
    existing?.remove();
    return;
  }
  const reason = profileModeration.reason || 'Доступ до гри тимчасово обмежено адміністрацією.';
  if (existing) {
    existing.querySelector('[data-block-reason]').textContent = reason;
    return;
  }
  const overlay = document.createElement('section');
  overlay.id = 'profileBlockOverlay';
  overlay.className = 'profile-block-overlay';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Доступ до гри обмежено');
  overlay.innerHTML = '<div class="profile-block-card"><span><i class="fa-solid fa-ban"></i></span><p>ДОСТУП ОБМЕЖЕНО</p><h2>Профіль заблоковано</h2><strong data-block-reason></strong><small>Якщо це помилка — звернися до адміністрації. Після зняття блокування профіль оновиться автоматично.</small></div>';
  overlay.querySelector('[data-block-reason]').textContent = reason;
  document.body.append(overlay);
}

function setProfileModeration(value) {
  profileModeration = normalizeProfileModeration(value);
  renderProfileBlockOverlay();
}

function normalizeProfileVisibility(value) {
  return {
    hidden: value?.hidden === true,
    updatedAt: clampNumber(value?.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0)
  };
}

function isProfileHidden() {
  return profileVisibility?.hidden === true;
}

function setProfileVisibility(value) {
  profileVisibility = normalizeProfileVisibility(value);
  if (account) account.profileVisibility = profileVisibility;
}

// Case reels are deliberately lighter on entry-level phones and on devices
// where the visitor explicitly asks the browser to reduce motion. This keeps
// the result visible and centred instead of dropping frames while dozens of
// remote skin previews are decoded at once.
function prefersLightweightMotion() {
  if (gameState?.performanceMode === 'lite') return true;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const saveData = navigator.connection?.saveData === true;
  const lowMemory = Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 2;
  const fewCores = Number(navigator.hardwareConcurrency) > 0 && Number(navigator.hardwareConcurrency) <= 2;
  return Boolean(reduceMotion || saveData || lowMemory || fewCores);
}

function getPerformanceMode() {
  return gameState?.performanceMode === 'lite' ? 'lite' : 'auto';
}

function applyPerformanceMode() {
  const isLite = getPerformanceMode() === 'lite';
  document.body.classList.toggle('performance-lite', isLite);
  document.documentElement.dataset.performance = isLite ? 'lite' : 'auto';
}

function setPerformanceMode(mode) {
  if (!gameState) return;
  gameState.performanceMode = mode === 'lite' ? 'lite' : 'auto';
  applyPerformanceMode();
  saveState();
  renderPerformancePanel();
  if (currentPage === 'case') renderCaseCatalog();
  if (document.getElementById('shopModal')?.classList.contains('flex')) filterShop();
  showToast(gameState.performanceMode === 'lite'
    ? 'Легкий режим увімкнено: менше анімацій і карток у рулетці.'
    : 'Автоматичний режим продуктивності увімкнено.', 'success');
}

function getCaseReelConfig(soundDurationMs = 0) {
  const manualLite = getPerformanceMode() === 'lite';
  const base = prefersLightweightMotion()
    ? { cards: manualLite ? 18 : 24, winnerIndex: manualLite ? 13 : 18, duration: manualLite ? 1_450 : 2_350 }
    : { cards: 34, winnerIndex: 27, duration: 3_850 };
  const soundtrackDuration = Math.round(Number(soundDurationMs) || 0);
  return {
    ...base,
    // A valid soundtrack duration always wins: the reel reaches its result
    // exactly when its music ends. The fallback keeps offline playback fluid.
    duration: !manualLite && soundtrackDuration >= 1_000 ? soundtrackDuration : base.duration
  };
}

// The Steam community endpoint returns up to 500 assets at a time. Keeping the
// work bounded gives the UI a responsive, recoverable sync even for huge inventories.
const STEAM_SYNC_PAGE_LIMIT = 6;

let battlePlayerItem = null;
let battleBotItem = null;
let battleInProgress = false;
let battleRoom = null;

let contractItems = [null, null, null, null, null];
let contractActiveSlot = -1;

let profileInvFilter = 'all';
let profileInvSort = 'price-desc';
let profileInvSource = 'all';
let profileInvWear = 'all';
let profileInvCollection = 'all';

const DEMO_STARTING_BALANCE = 12;
const ECONOMY_TASK_REWARD_MULTIPLIER = 0.004;
const DAILY_TASK_MIN_REWARD = 0.20;
const WEEKLY_TASK_MIN_REWARD = 1;
const REWARDED_COIN_AMOUNT = 0.10;
const REWARDED_DAILY_LIMIT = 20;
const REFERRAL_MILESTONES = Object.freeze([
  { id: 'level_3', label: 'LVL 3', ownerReward: 10, recruitReward: 3 },
  { id: 'level_10', label: 'LVL 10', ownerReward: 20, recruitReward: 5 },
  { id: 'level_20', label: 'LVL 20', ownerReward: 40, recruitReward: 10 },
  { id: 'prestige_1', label: 'Перший престиж', ownerReward: 100, recruitReward: 25 },
]);
const REFERRAL_WEEKLY_OWNER_REWARD = 4;
const REFERRAL_WEEKLY_XP_UNIT = 1200;
const REFERRAL_WEEKLY_OWNER_LIMIT = 40;
// Return rates keep the virtual economy progressing without creating an
// endless PC farm. They are applied consistently in every economy mode.
const CASE_TARGET_RETURN_RATE = 0.88;
// The solver aims for 88%, but the final price is also capped at 90% after
// rounding and chance-band changes. A paid case must never settle at 100%.
const CASE_MAX_RETURN_RATE = 0.90;
// A paid case must always contain a genuine losing outcome. This ceiling is
// applied after the RTP calculation so sparse themed pools cannot accidentally
// turn into a 100% break-even case through rounding or empty probability tiers.
const CASE_MIN_LOSS_PRICE_RATIO = 0.84;
const UPGRADE_RETURN_RATE = 0.90;
const CONTRACT_RETURN_MIN = 0.55;
const CONTRACT_RETURN_MAX = 0.85;
const DAILY_CALENDAR_REWARDS = Object.freeze([
  { day: 1, credits: 1, icon: 'fa-coins', title: '+1 PC' },
  { day: 2, credits: 1.1, icon: 'fa-coins', title: '+1.10 PC' },
  { day: 3, credits: 1.25, icon: 'fa-bolt', title: '+1.25 PC' },
  { day: 4, credits: 1.45, icon: 'fa-fire', title: '+1.45 PC' },
  { day: 5, credits: 1.7, icon: 'fa-shield-halved', title: '+1.70 PC' },
  { day: 6, credits: 2, icon: 'fa-ticket', title: '+2 PC' },
  { day: 7, credits: 3, icon: 'fa-gem', title: '+3 PC + колекційний скін', collectible: true }
]);
const DAILY_CALENDAR_COLLECTIBLES = Object.freeze([
  'Glock-18 | Water Elemental',
  'AWP | Atheris',
  'P250 | See Ya Later'
]);
const DAILY_STREAK_REWARDS = Object.freeze(DAILY_CALENDAR_REWARDS.map(reward => reward.credits));

function economyReward(amount, minimum = DAILY_TASK_MIN_REWARD) {
  const base = Math.max(minimum, roundPc((Math.max(0, Number(amount) || 0) * ECONOMY_TASK_REWARD_MULTIPLIER)));
  return roundPc(base * getRuntimeEconomy().taskRewardMultiplier);
}
const FREE_CASE_COOLDOWN = 24 * 60 * 60 * 1000;
// Progression is intentionally long-term: levels and the seasonal pass should
// represent steady play, not a few quick rounds.
const PLAYER_LEVEL_XP = 1_200;
const PRESTIGE_LEVEL_REQUIRED = 30;
const XP_PER_ROUND = 55;
const XP_WIN_BONUS = 45;
const XP_PER_CASE = 30;
const XP_DAILY_TASK = 25;
const XP_WEEKLY_TASK = 50;
const XP_COLLECTION = 130;
const XP_ACHIEVEMENT = 50;
const XP_BATTLE_WIN = 100;
const XP_BATTLE_LOSS = 25;
const XP_ROYALE_WIN = 330;
const XP_ROYALE_LOSS = 40;
const XP_CONTRACT = 80;
const ROUND_HISTORY_LIMIT = 20;
const SELL_RATE = 0.9;
const CHANCE_MAX = 80;
const CHANCE_MIN = 0.50;

/* ===== КАТАЛОГ КЕЙСІВ ===== */
function skinNameIncludes(skin, ...parts) {
  const name = String(skin?.name || '').toLowerCase();
  return parts.some(part => name.includes(String(part).toLowerCase()));
}

function isGloveSkin(skin) {
  return skin?.category === 'Gloves' || skinNameIncludes(skin, 'Gloves', 'Hand Wraps', 'Hydra Gloves', 'Bloodhound Gloves');
}

function isKnifeSkin(skin) {
  return skin?.category === 'Knives' || (/^★\s/.test(String(skin?.name || '')) && !isGloveSkin(skin));
}

function isWeaponSkin(skin) {
  return !isKnifeSkin(skin) && !isGloveSkin(skin);
}

const CASE_TYPES = {
  // HOT & LIMITED
  icewire_cache: {
    id: 'icewire_cache',
    name: 'ICEWIRE Cache',
    cost: 720,
    category: 'hot',
    badge: 'ZERO HOUR',
    badgeClass: 'badge-exclusive',
    theme: 'blue',
    seasonal: 'icewire-2026',
    desc: 'Контейнер з чорного льоду: Ice Coaled, Whiteout, Asiimov та полярні сигнали',
    filter: s => isWeaponSkin(s) && skinNameIncludes(s, 'Ice Coaled', 'Winterized', 'Whiteout', 'Asiimov', 'Vulcan', 'Printstream', 'Coolant', 'Snow Leopard', 'Neo-Noir')
  },
  halloween_night: {
    id: 'halloween_night',
    name: 'Нічний кейс',
    cost: 650,
    category: 'hot',
    badge: 'HALLOWEEN',
    badgeClass: 'badge-exclusive',
    theme: 'gold',
    seasonal: 'halloween-2026',
    desc: 'Темна добірка: Atheris, Neo-Noir, Wildfire та рідкісні дропи',
    filter: s => isWeaponSkin(s) && skinNameIncludes(s, 'Atheris', 'Neo-Noir', 'Wildfire', 'See Ya Later', 'Kill Confirmed', 'Printstream', 'Case Hardened', 'Redline')
  },
  dragon_lair: {
    id: 'dragon_lair',
    name: "Dragon's Lair",
    cost: 3200,
    category: 'hot',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'red',
    desc: 'AWP Dragon Lore, Fire Serpent та топові скіни',
    filter: s => isWeaponSkin(s) && skinNameIncludes(s, 'Dragon Lore', 'Fire Serpent', 'Printstream', 'Fade', 'Howl', 'Wild Lotus', 'Gungnir', 'Medusa')
  },
  covert_ops: {
    id: 'covert_ops',
    name: 'Covert Ops',
    cost: 1600,
    category: 'hot',
    badge: 'EXCLUSIVE',
    badgeClass: 'badge-exclusive',
    theme: 'purple',
    desc: 'Тільки таємна зброя найвищого рангу',
    filter: s => isWeaponSkin(s) && ['Covert', 'Contraband'].includes(s.rarity)
  },
  beast_mode: {
    id: 'beast_mode',
    name: 'Beast Mode',
    cost: 750,
    category: 'hot',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'pink',
    desc: 'Hyper Beast, Asiimov, Neo-Noir та неонові скіни',
    filter: s => isWeaponSkin(s) && skinNameIncludes(s, 'Hyper Beast', 'Asiimov', 'Neo-Noir', 'Mecha', 'Vaporwave', 'Temukau', 'Legion of Anubis')
  },

  // KNIVES
  butterfly_fever: {
    id: 'butterfly_fever',
    name: 'Butterfly Fever',
    cost: 2600,
    category: 'knives',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'gold',
    desc: 'Шанс на Butterfly Knife: Doppler, Fade, Marble',
    filter: s => isKnifeSkin(s) && skinNameIncludes(s, 'Butterfly Knife')
  },
  karambit_rush: {
    id: 'karambit_rush',
    name: 'Karambit Rush',
    cost: 2400,
    category: 'knives',
    badge: 'EXCLUSIVE',
    badgeClass: 'badge-exclusive',
    theme: 'blue',
    desc: 'Легендарні керамбіти від Fade до Autotronic',
    filter: s => isKnifeSkin(s) && skinNameIncludes(s, 'Karambit')
  },
  knife_club: {
    id: 'knife_club',
    name: 'Knife Club',
    cost: 1000,
    category: 'knives',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'gold',
    desc: 'Ножі різної цінності та рідкісний шанс на топ-дроп',
    filter: isKnifeSkin
  },

  // GLOVES
  sport_gloves: {
    id: 'sport_gloves',
    name: 'Sport Edition',
    cost: 1900,
    category: 'gloves',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'blue',
    desc: 'Рідкісні Sport Gloves: Vice, Pandora, Amphibious',
    filter: s => isGloveSkin(s) && skinNameIncludes(s, 'Sport Gloves')
  },
  moto_special: {
    id: 'moto_special',
    name: 'Moto & Specialist',
    cost: 1000,
    category: 'gloves',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'purple',
    desc: 'Стильні рукавиці Moto, Specialist та Hand Wraps',
    filter: s => isGloveSkin(s) && skinNameIncludes(s, 'Moto Gloves', 'Specialist Gloves', 'Hand Wraps')
  },

  // WEAPONS
  awp_king: {
    id: 'awp_king',
    name: 'AWP King',
    cost: 900,
    category: 'weapons',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'purple',
    desc: 'Снайперська еліта: Dragon Lore, Gungnir, Asiimov',
    filter: s => isWeaponSkin(s) && (s.weapon === 'AWP' || skinNameIncludes(s, 'AWP |'))
  },
  ak47_master: {
    id: 'ak47_master',
    name: 'AK-47 Master',
    cost: 700,
    category: 'weapons',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'gold',
    desc: 'Wild Lotus, Case Hardened, Vulcan, Fuel Injector',
    filter: s => isWeaponSkin(s) && (s.weapon === 'AK-47' || skinNameIncludes(s, 'AK-47 |'))
  },
  m4_storm: {
    id: 'm4_storm',
    name: 'M4A4 / M4A1-S',
    cost: 500,
    category: 'weapons',
    badge: 'NEW',
    badgeClass: 'badge-new',
    theme: 'blue',
    desc: 'Howl, Printstream, Player Two, Decimator, Hot Rod',
    filter: s => isWeaponSkin(s) && (s.weapon === 'M4A4' || s.weapon === 'M4A1-S' || skinNameIncludes(s, 'M4A4 |', 'M4A1-S |'))
  },

  // BUDGET / FARM
  budget_covert: {
    id: 'budget_covert',
    name: 'Budget Covert',
    cost: 300,
    category: 'budget',
    badge: 'BEST VALUE',
    badgeClass: 'badge-popular',
    theme: 'gold',
    desc: 'Збалансований пул зі зрозумілим ризиком та рідкісними дропами',
    filter: s => isWeaponSkin(s) && ['Mil-Spec Grade', 'Restricted', 'Classified'].includes(s.rarity)
  },
  lucky_strike: {
    id: 'lucky_strike',
    name: 'Lucky Strike',
    cost: 150,
    category: 'budget',
    badge: 'LUCKY',
    badgeClass: 'badge-new',
    theme: 'emerald',
    desc: 'Невеликий ризик з шансом на дроп за 5000+ PC',
    filter: s => isWeaponSkin(s) && ['Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert'].includes(s.rarity)
  },
  farm_rush: {
    id: 'farm_rush',
    name: 'Farm Rush',
    cost: 60,
    category: 'budget',
    badge: 'FARM',
    badgeClass: 'badge-exclusive',
    theme: 'gray',
    desc: 'Швидкий фарм для щоденних місій та контрактів',
    filter: s => isWeaponSkin(s) && ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade'].includes(s.rarity)
  },

  // Backwards compatibility aliases
  budget: { id: 'budget', aliasTo: 'farm_rush', cost: 100, name: 'Бюджетний кейс', category: 'budget', theme: 'gray' },
  standard: { id: 'standard', aliasTo: 'budget_covert', cost: 300, name: 'Стандартний кейс', category: 'budget', theme: 'gold' },
  premium: { id: 'premium', aliasTo: 'awp_king', cost: 1000, name: 'Преміум кейс', category: 'weapons', theme: 'purple' },
  legendary: { id: 'legendary', aliasTo: 'dragon_lair', cost: 5000, name: 'Легендарний кейс', category: 'hot', theme: 'red' }
};

// Legacy case labels are retained for saved routes. Their actual cost is
// always calculated from the stable catalogue pool below.
Object.values(CASE_TYPES).forEach(config => {
  config.cost = legacyPc(config.cost, 0.01);
});

/* ===== ВБУДОВАНІ SVG-КЕЙСИ ===== */
function createCaseSVG(theme) {
  const themes = {
    gray:    { c1: '#4b5563', c2: '#1f2937', accent: '#9ca3af' },
    blue:    { c1: '#06b6d4', c2: '#0e3a4e', accent: '#38bdf8' },
    purple:  { c1: '#8b5cf6', c2: '#3b0764', accent: '#c4b5fd' },
    gold:    { c1: '#f59e0b', c2: '#78350f', accent: '#fbbf24' },
    red:     { c1: '#ef4444', c2: '#7f1d1d', accent: '#f87171' },
    pink:    { c1: '#ec4899', c2: '#831843', accent: '#f472b6' },
    emerald: { c1: '#10b981', c2: '#064e3b', accent: '#6ee7b7' }
  };
  const t = themes[theme] || themes.gold;
  const uid = theme + '_' + Math.random().toString(36).slice(2, 7);
  return `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="case-art w-full h-full" aria-hidden="true">
  <defs>
    <linearGradient id="body-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/>
    </linearGradient>
    <linearGradient id="lid-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.c1}"/>
    </linearGradient>
    <radialGradient id="glow-${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${t.accent}" stop-opacity=".85"/>
      <stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="60" cy="62" r="52" fill="url(#glow-${uid})" opacity=".6"/>
  <rect x="22" y="48" width="76" height="52" rx="8"
        fill="url(#body-${uid})" stroke="${t.accent}" stroke-width="2.5"/>
  <path d="M18 48 Q18 34 32 34 L88 34 Q102 34 102 48 Z"
        fill="url(#lid-${uid})" stroke="${t.accent}" stroke-width="2.5"/>
  <rect x="52" y="60" width="16" height="20" rx="3"
        fill="#0b0e14" stroke="${t.accent}" stroke-width="1.5"/>
  <circle cx="60" cy="68" r="2.5" fill="${t.accent}"/>
  <rect x="58.5" y="70" width="3" height="8" rx="1.5" fill="${t.accent}"/>
  <circle cx="30" cy="90" r="2.5" fill="${t.accent}"/>
  <circle cx="90" cy="90" r="2.5" fill="${t.accent}"/>
  <circle cx="30" cy="58" r="2" fill="${t.accent}" opacity=".8"/>
  <circle cx="90" cy="58" r="2" fill="${t.accent}" opacity=".8"/>
  <path d="M28 42 L92 42" stroke="rgba(255,255,255,.3)" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}

const CASE_ARTWORK = Object.freeze({
  icewire_cache:    '/assets/cases/icewire-cache-v2.png',
  halloween_night:  '/assets/cases/halloween-night-v1.png',
  dragon_lair:      '/assets/cases/dragon-lair-v3.png',
  covert_ops:       '/assets/cases/covert-ops-v3.png',
  beast_mode:       '/assets/cases/beast-mode-v3.png',
  butterfly_fever:  '/assets/cases/butterfly-fever-v3.png',
  karambit_rush:    '/assets/cases/karambit-rush-v3.png',
  knife_club:       '/assets/cases/knife-club-v3.png',
  sport_gloves:     '/assets/cases/sport-gloves-v3.png',
  moto_special:     '/assets/cases/moto-special-v3.png',
  awp_king:         '/assets/cases/awp-king-v3.png',
  ak47_master:      '/assets/cases/ak47-master-v3.png',
  m4_storm:         '/assets/cases/m4-storm-v3.png',
  budget_covert:    '/assets/cases/budget-covert-v3.png',
  lucky_strike:     '/assets/cases/lucky-strike-v3.png',
  farm_rush:        '/assets/cases/farm-rush-v3.png'
});

function createCaseArtwork(caseId, caseName, theme, customArtwork = '') {
  const artwork = customArtwork || CASE_ARTWORK[caseId];
  if (!artwork) return createCaseSVG(theme || 'gold');
  return `<img src="${artwork}" alt="${escapeHtml(caseName)}" class="case-art" loading="lazy" onerror="handleCaseArtworkError(this, '${escapeHtml(theme || 'gold')}')">`;
}

function handleCaseArtworkError(image, theme = 'gold') {
  if (!image || image.dataset.caseFallbackApplied === '1') return;
  image.dataset.caseFallbackApplied = '1';
  const template = document.createElement('template');
  template.innerHTML = createCaseSVG(theme);
  const fallback = template.content.firstElementChild;
  if (fallback) image.replaceWith(fallback);
}

function normalizeRuntimeWindow(value) {
  const clean = candidate => {
    const timestamp = Number(candidate);
    return Number.isFinite(timestamp) && timestamp > 0 ? Math.round(timestamp) : 0;
  };
  const startsAt = clean(value?.startsAt);
  const rawEndsAt = clean(value?.endsAt);
  return { startsAt, endsAt: rawEndsAt && (!startsAt || rawEndsAt > startsAt) ? rawEndsAt : 0 };
}

function isRuntimeWindowOpen(value, now = Date.now()) {
  return (!value?.startsAt || now >= value.startsAt) && (!value?.endsAt || now < value.endsAt);
}

function normalizeRuntimeCampaign(value, fallback) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    title: cleanText(source.title, 72) || fallback.title,
    subtitle: cleanText(source.subtitle, 180) || fallback.subtitle,
    ...normalizeRuntimeWindow(source)
  };
}

function normalizeRuntimeContent(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const rawFeatures = source.features && typeof source.features === 'object' && !Array.isArray(source.features) ? source.features : {};
  const features = Object.fromEntries(RUNTIME_CONTENT_FEATURES.map(feature => [feature, rawFeatures[feature] !== false]));
  const hiddenCaseIds = [...new Set((Array.isArray(source.hiddenCaseIds) ? source.hiddenCaseIds : [])
    .map(id => cleanText(id, 40).toLowerCase())
    .filter(id => /^[a-z0-9][a-z0-9_-]{1,39}$/.test(id)))].slice(0, 32);
  const customCases = (Array.isArray(source.customCases) ? source.customCases : [])
    .map((entry, index) => {
      const id = cleanText(entry?.id, 40).toLowerCase();
      const name = cleanText(entry?.name, 64);
      if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(id) || !name || CASE_TYPES[id]) return null;
      const unique = (values, limit = 8) => [...new Set(values)].slice(0, limit);
      const artworkSource = cleanText(entry?.artwork, 1024);
      let artwork = '';
      if (/^\/assets\/[A-Za-z0-9_./-]+$/i.test(artworkSource)) artwork = artworkSource;
      else {
        try {
          const url = new URL(artworkSource);
          if (url.protocol === 'https:') artwork = url.href;
        } catch {}
      }
      const category = cleanText(entry?.category, 24);
      const theme = cleanText(entry?.theme, 24);
      const poolKind = cleanText(entry?.poolKind, 24);
      return {
        id,
        name,
        desc: cleanText(entry?.description, 220) || 'Авторський кейс із віртуальною колекцією.',
        category: RUNTIME_CASE_CATEGORIES.has(category) ? category : 'hot',
        theme: RUNTIME_CASE_THEMES.has(theme) ? theme : 'gold',
        badge: cleanText(entry?.badge, 24) || 'LIMITED',
        badgeClass: 'badge-exclusive',
        artwork,
        poolKind: RUNTIME_CASE_POOL_KINDS.has(poolKind) ? poolKind : 'weapons',
        weapons: unique((Array.isArray(entry?.weapons) ? entry.weapons : []).map(value => cleanText(value, 64)).filter(Boolean)),
        rarities: unique((Array.isArray(entry?.rarities) ? entry.rarities : []).map(value => cleanText(value, 48)).filter(value => RUNTIME_CASE_RARITIES.has(value))),
        terms: unique((Array.isArray(entry?.terms) ? entry.terms : []).map(value => cleanText(value, 48)).filter(Boolean)),
        enabled: entry?.enabled !== false,
        order: clampNumber(entry?.order, 0, 9_999, index),
        ...normalizeRuntimeWindow(entry)
      };
    })
    .filter(Boolean)
    .filter((entry, index, all) => all.findIndex(candidate => candidate.id === entry.id) === index)
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, 'uk'))
    .slice(0, 24);
  const announcementSource = source.announcement && typeof source.announcement === 'object' && !Array.isArray(source.announcement) ? source.announcement : {};
  const announcementTone = cleanText(announcementSource.tone, 16);
  const announcementPage = cleanText(announcementSource.ctaPage, 24);
  const announcement = {
    enabled: announcementSource.enabled === true,
    tone: RUNTIME_CONTENT_TONES.has(announcementTone) ? announcementTone : 'cyan',
    title: cleanText(announcementSource.title, 72),
    body: cleanText(announcementSource.body, 280),
    ctaLabel: cleanText(announcementSource.ctaLabel, 32),
    ctaPage: RUNTIME_CONTENT_PAGES.has(announcementPage) ? announcementPage : 'hub',
    ...normalizeRuntimeWindow(announcementSource)
  };
  const promos = (Array.isArray(source.promos) ? source.promos : [])
    .map((entry, index) => {
      const id = cleanText(entry?.id, 40).toLowerCase();
      const title = cleanText(entry?.title, 72);
      if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(id) || !title) return null;
      const tone = cleanText(entry?.tone, 16);
      const ctaPage = cleanText(entry?.ctaPage, 24);
      return {
        id,
        title,
        body: cleanText(entry?.body, 280) || 'Спеціальна подія вже доступна у грі.',
        label: cleanText(entry?.label, 32) || 'LIVE',
        ctaLabel: cleanText(entry?.ctaLabel, 32) || 'Відкрити',
        ctaPage: RUNTIME_CONTENT_PAGES.has(ctaPage) ? ctaPage : 'hub',
        tone: RUNTIME_CONTENT_TONES.has(tone) ? tone : 'cyan',
        enabled: entry?.enabled !== false,
        order: clampNumber(entry?.order, 0, 9_999, index),
        ...normalizeRuntimeWindow(entry)
      };
    })
    .filter(Boolean)
    .filter((entry, index, all) => all.findIndex(candidate => candidate.id === entry.id) === index)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, 'uk'))
    .slice(0, 6);
  const economySource = source.economy && typeof source.economy === 'object' && !Array.isArray(source.economy) ? source.economy : {};
  return {
    revision: clampNumber(source.revision, 0, Number.MAX_SAFE_INTEGER, 0),
    features,
    hiddenCaseIds,
    customCases,
    announcement,
    promos,
    battlePass: normalizeRuntimeCampaign(source.battlePass, DEFAULT_RUNTIME_CONTENT.battlePass),
    season: normalizeRuntimeCampaign(source.season, DEFAULT_RUNTIME_CONTENT.season),
    economy: {
      casePriceMultiplier: clampNumber(economySource.casePriceMultiplier, .5, 2, 1),
      taskRewardMultiplier: clampNumber(economySource.taskRewardMultiplier, .5, 2, 1)
    }
  };
}

function isRuntimeFeatureEnabled(feature) {
  if (runtimeContent?.features?.[feature] === false) return false;
  if (feature === 'battlePass') return isRuntimeWindowOpen(runtimeContent?.battlePass);
  if (feature === 'seasonalEvents') return isRuntimeWindowOpen(runtimeContent?.season);
  return true;
}

function getRuntimeEconomy() {
  return runtimeContent?.economy || DEFAULT_RUNTIME_CONTENT.economy;
}

function getRuntimeBattlePass() {
  return runtimeContent?.battlePass || DEFAULT_RUNTIME_CONTENT.battlePass;
}

function getRuntimeSeason() {
  return runtimeContent?.season || DEFAULT_RUNTIME_CONTENT.season;
}

function isRuntimePageEnabled(page) {
  const feature = RUNTIME_PAGE_FEATURES[page];
  return !feature || isRuntimeFeatureEnabled(feature);
}

function runtimeCustomCaseConfig(caseType) {
  return runtimeContent.customCases.find(config => config.id === caseType) || null;
}

function runtimeCaseFilter(config) {
  return skin => {
    if (config.poolKind === 'weapons' && !isWeaponSkin(skin)) return false;
    if (config.poolKind === 'knives' && !isKnifeSkin(skin)) return false;
    if (config.poolKind === 'gloves' && !isGloveSkin(skin)) return false;
    if (config.weapons.length && !config.weapons.some(weapon => cleanText(skin?.weapon, 64).toLowerCase() === weapon.toLowerCase())) return false;
    if (config.rarities.length && !config.rarities.includes(cleanText(skin?.rarity, 48))) return false;
    if (config.terms.length && !config.terms.some(term => skinNameIncludes(skin, term))) return false;
    return true;
  };
}

function getRuntimeCaseConfig(caseType) {
  const config = runtimeCustomCaseConfig(caseType);
  return config ? { ...config, filter: runtimeCaseFilter(config) } : null;
}

function isRuntimeCaseVisible(caseType) {
  const custom = runtimeCustomCaseConfig(caseType);
  if (custom) return custom.enabled !== false && isRuntimeWindowOpen(custom) && isRuntimeFeatureEnabled('cases');
  return isRuntimeFeatureEnabled('cases') && !runtimeContent.hiddenCaseIds.includes(caseType);
}

function getVisibleCaseEntries() {
  const builtIn = Object.entries(CASE_TYPES)
    .filter(([id, config]) => !config.aliasTo && isRuntimeCaseVisible(id) && (!config.seasonal || getSeasonalEventStatus(config.seasonal).active));
  const custom = runtimeContent.customCases
    .filter(config => isRuntimeCaseVisible(config.id))
    .map(config => [config.id, getRuntimeCaseConfig(config.id)]);
  return [...builtIn, ...custom];
}

function renderRuntimeAnnouncement() {
  const root = document.getElementById('runtimeAnnouncement');
  if (!root) return;
  const announcement = runtimeContent?.announcement;
  const visible = Boolean(announcement?.enabled && announcement.title && isRuntimeWindowOpen(announcement));
  root.classList.toggle('hidden', !visible);
  root.replaceChildren();
  if (!visible) return;
  root.dataset.tone = announcement.tone || 'cyan';
  root.innerHTML = `<div class="runtime-announcement-copy"><span><i class="fa-solid fa-tower-broadcast"></i> ОГОЛОШЕННЯ</span><strong>${escapeHtml(announcement.title)}</strong>${announcement.body ? `<p>${escapeHtml(announcement.body)}</p>` : ''}</div>${announcement.ctaLabel ? `<button type="button" data-runtime-announcement-open>${escapeHtml(announcement.ctaLabel)} <i class="fa-solid fa-arrow-right"></i></button>` : ''}`;
  root.querySelector('[data-runtime-announcement-open]')?.addEventListener('click', () => showPage(announcement.ctaPage || 'hub'));
}

function renderRuntimePromos() {
  const root = document.getElementById('hubPromos');
  if (!root) return;
  const promos = (runtimeContent?.promos || []).filter(promo => promo.enabled && isRuntimeWindowOpen(promo));
  root.replaceChildren();
  root.classList.toggle('hidden', !promos.length);
  if (!promos.length) return;
  root.innerHTML = promos.map(promo => `<article class="runtime-promo-card" data-tone="${escapeHtml(promo.tone)}"><div><span>${escapeHtml(promo.label)}</span><strong>${escapeHtml(promo.title)}</strong><p>${escapeHtml(promo.body)}</p></div><button type="button" data-runtime-promo="${escapeHtml(promo.id)}">${escapeHtml(promo.ctaLabel)} <i class="fa-solid fa-arrow-right"></i></button></article>`).join('');
  root.querySelectorAll('[data-runtime-promo]').forEach(button => button.addEventListener('click', () => {
    const promo = promos.find(entry => entry.id === button.dataset.runtimePromo);
    if (promo) showPage(promo.ctaPage || 'hub');
  }));
}

function applyRuntimeContent() {
  Object.entries(RUNTIME_PAGE_FEATURES).forEach(([page, feature]) => {
    const hidden = !isRuntimeFeatureEnabled(feature);
    document.querySelectorAll(`[data-nav="${page}"], [data-mobile-nav="${page}"]`).forEach(element => element.classList.toggle('hidden', hidden));
    document.querySelectorAll(`[onclick*="showPage('${page}')"]`).forEach(element => element.classList.toggle('hidden', hidden));
  });
  if (!isRuntimeFeatureEnabled('battlePass')) document.getElementById('battlePass')?.replaceChildren();
  if (currentPage && !isRuntimePageEnabled(currentPage)) showPage('hub');
  renderRuntimeAnnouncement();
  renderRuntimePromos();
  renderCaseCatalog();
  renderBattlePass();
  renderGameHub();
}

async function loadRuntimeContent() {
  try {
    const response = await fetch(gameApiUrl('/api/runtime-config'), { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const data = await response.json();
    runtimeContent = normalizeRuntimeContent(data?.config);
    runtimeContentLoaded = true;
    applyRuntimeContent();
  } catch {
    // Built-in content remains available while an offline Android session or a
    // temporary Worker issue prevents the latest published configuration.
  }
}

const TASK_POOL = [
  { id: 'rolls_3', title: 'Зроби 3 ролли', goal: 3, reward: 100, icon: 'fa-dice', value: s => s.rolls },
  { id: 'rolls_5', title: 'Зроби 5 роллів', goal: 5, reward: 180, icon: 'fa-dice', value: s => s.rolls },
  { id: 'rolls_10', title: 'Зроби 10 роллів', goal: 10, reward: 380, icon: 'fa-dice', value: s => s.rolls },
  { id: 'wins_1', title: 'Переможи 1 раз', goal: 1, reward: 120, icon: 'fa-trophy', value: s => s.wins },
  { id: 'wins_3', title: 'Переможи 3 рази', goal: 3, reward: 320, icon: 'fa-trophy', value: s => s.wins },
  { id: 'wins_5', title: 'Переможи 5 разів', goal: 5, reward: 500, icon: 'fa-trophy', value: s => s.wins },
  { id: 'cases_1', title: 'Відкрий 1 кейс', goal: 1, reward: 130, icon: 'fa-box-open', value: s => s.cases },
  { id: 'cases_3', title: 'Відкрий 3 кейси', goal: 3, reward: 380, icon: 'fa-box-open', value: s => s.cases },
  { id: 'cases_5', title: 'Відкрий 5 кейсів', goal: 5, reward: 600, icon: 'fa-box-open', value: s => s.cases },
  { id: 'pistol_1', title: 'Виграй пістолет', goal: 1, reward: 200, icon: 'fa-gun', value: s => s.pistolWins },
  { id: 'rifle_1', title: 'Виграй гвинтівку', goal: 1, reward: 220, icon: 'fa-gun', value: s => s.rifleWins },
  { id: 'sniper_1', title: 'Виграй снайперську', goal: 1, reward: 250, icon: 'fa-crosshairs', value: s => s.sniperWins },
  { id: 'smg_1', title: 'Виграй ПП', goal: 1, reward: 200, icon: 'fa-gun', value: s => s.smgWins },
  { id: 'heavy_1', title: 'Виграй важку зброю', goal: 1, reward: 200, icon: 'fa-bomb', value: s => s.heavyWins },
  { id: 'sell_1', title: 'Продай 1 предмет', goal: 1, reward: 110, icon: 'fa-sack-dollar', value: s => s.sells },
  { id: 'sell_3', title: 'Продай 3 предмети', goal: 3, reward: 260, icon: 'fa-sack-dollar', value: s => s.sells },
  { id: 'sell_5', title: 'Продай 5 предметів', goal: 5, reward: 420, icon: 'fa-sack-dollar', value: s => s.sells },
  { id: 'sellv_2000', title: 'Продай на 2 000 PC', goal: 2000, reward: 260, icon: 'fa-coins', value: s => s.sellValue },
  { id: 'sellv_10000', title: 'Продай на 10 000 PC', goal: 10000, reward: 580, icon: 'fa-coins', value: s => s.sellValue },
  { id: 'battle_1', title: 'Зіграй 1 бій', goal: 1, reward: 150, icon: 'fa-swords', value: s => s.battles },
  { id: 'battle_win_1', title: 'Переможи в бою', goal: 1, reward: 320, icon: 'fa-swords', value: s => s.battleWins },
  { id: 'battle_win_3', title: 'Переможи в 3 боях', goal: 3, reward: 650, icon: 'fa-swords', value: s => s.battleWins },
  { id: 'contract_1', title: 'Уклади 1 контракт', goal: 1, reward: 280, icon: 'fa-boxes-packing', value: s => s.contracts },
  { id: 'contract_3', title: 'Уклади 3 контракти', goal: 3, reward: 680, icon: 'fa-boxes-packing', value: s => s.contracts },
  { id: 'credit_1', title: 'Апгрейд кредитами', goal: 1, reward: 90, icon: 'fa-coins', value: s => s.creditInputs },
  { id: 'multi_1', title: 'Мульти-апгрейд (2+)', goal: 1, reward: 150, icon: 'fa-layer-group', value: s => s.multiInputs },
  { id: 'multi_3', title: 'Мульти-апгрейд 3 рази', goal: 3, reward: 360, icon: 'fa-layer-group', value: s => s.multiInputs },
  { id: 'bigwin_500', title: 'Виграй предмет від 500 PC', goal: 500, reward: 180, icon: 'fa-gem', value: s => s.bestWinValue },
  { id: 'bigwin_2000', title: 'Виграй предмет від 2 000 PC', goal: 2000, reward: 420, icon: 'fa-gem', value: s => s.bestWinValue },
  { id: 'bigwin_10000', title: 'Виграй предмет від 10 000 PC', goal: 10000, reward: 950, icon: 'fa-gem', value: s => s.bestWinValue },
  { id: 'target_3000', title: 'Сума виграшів 3 000 PC', goal: 3000, reward: 300, icon: 'fa-coins', value: s => s.targetValue },
  { id: 'target_20000', title: 'Сума виграшів 20 000 PC', goal: 20000, reward: 850, icon: 'fa-coins', value: s => s.targetValue },
  { id: 'streak_3', title: 'Серія з 3 перемог', goal: 3, reward: 470, icon: 'fa-fire', value: s => s.bestStreak },
  { id: 'streak_5', title: 'Серія з 5 перемог', goal: 5, reward: 950, icon: 'fa-fire', value: s => s.bestStreak }
];

const DAILY_TASK_COUNT = 5;

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

function getDailyTasks() {
  const date = getTodayKey();
  const rng = seededRandom(date + '|potuzhno');
  const pool = TASK_POOL.map(task => ({
    ...task,
    reward: economyReward(task.reward)
  }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DAILY_TASK_COUNT);
}

const WEEKLY_TASK_POOL = [
  { id: 'w_rolls_20', title: '20 роллів за тиждень', goal: 20, reward: 800, icon: 'fa-dice', value: s => s.rolls },
  { id: 'w_wins_10', title: '10 перемог за тиждень', goal: 10, reward: 1200, icon: 'fa-trophy', value: s => s.wins },
  { id: 'w_cases_10', title: '10 кейсів за тиждень', goal: 10, reward: 1500, icon: 'fa-box-open', value: s => s.cases },
  { id: 'w_battles_5', title: '5 боїв за тиждень', goal: 5, reward: 900, icon: 'fa-swords', value: s => s.battles },
  { id: 'w_contracts_5', title: '5 контрактів за тиждень', goal: 5, reward: 1400, icon: 'fa-boxes-packing', value: s => s.contracts },
  { id: 'w_sells_10', title: '10 продажів за тиждень', goal: 10, reward: 700, icon: 'fa-sack-dollar', value: s => s.sells },
  { id: 'w_bigwin_5k', title: 'Виграш на 5 000 PC за тиждень', goal: 5000, reward: 1000, icon: 'fa-gem', value: s => s.bestWinValue },
  { id: 'w_streak_5', title: 'Серія з 5 перемог за тиждень', goal: 5, reward: 1300, icon: 'fa-fire', value: s => s.bestStreak }
];

const WEEKLY_TASK_COUNT = 3;

function getWeekKey() {
  const now = new Date();
  const day = now.getDay() || 7;
  const thu = new Date(now);
  thu.setDate(now.getDate() - day + 4);
  const y = thu.getFullYear();
  const start = new Date(y, 0, 1);
  const w = Math.ceil(((thu - start) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

function getWeeklyTasks() {
  const key = getWeekKey();
  const rng = seededRandom(key + '|potuzhno-w');
  const pool = WEEKLY_TASK_POOL.map(task => ({
    ...task,
    reward: economyReward(task.reward, WEEKLY_TASK_MIN_REWARD)
  }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, WEEKLY_TASK_COUNT);
}

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first-roll', title: 'Перший крок', description: 'Зроби перший ролл', reward: 100, icon: 'fa-flag-checkered', met: () => (gameState?.stats?.rounds || 0) >= 1 },
  { id: 'first-win', title: 'Є контакт', description: 'Здобудь першу перемогу', reward: 180, icon: 'fa-trophy', met: () => (gameState?.stats?.wins || 0) >= 1 },
  { id: 'streak-three', title: 'На потужному ходу', description: '3 перемоги поспіль', reward: 350, icon: 'fa-fire', met: () => (gameState?.stats?.bestStreak || 0) >= 3 },
  { id: 'high-value', title: 'Велика ціль', description: 'Виграй предмет від 10 000 PC', reward: 500, icon: 'fa-gem', met: () => (gameState?.stats?.bestValue || 0) >= 10000 },
  { id: 'case-opener', title: 'Кейсоман', description: 'Відкрий 3 кейси', reward: 250, icon: 'fa-boxes-stacked', met: () => (gameState?.stats?.cases || 0) >= 3 },
  { id: 'seller', title: 'Торговець', description: 'Продай 5 предметів', reward: 300, icon: 'fa-sack-dollar', met: () => (gameState?.stats?.sells || 0) >= 5 },
  { id: 'fighter', title: 'Боєць', description: 'Виграй 3 бої', reward: 400, icon: 'fa-swords', met: () => (gameState?.stats?.battles || 0) >= 3 },
  { id: 'contractor', title: 'Контрактер', description: 'Уклади 3 контракти', reward: 350, icon: 'fa-boxes-packing', met: () => (gameState?.stats?.contracts || 0) >= 3 },
  { id: 'prestige-once', title: 'Корона', description: 'Зроби перший престиж', reward: 1000, icon: 'fa-crown', met: () => (gameState?.prestige || 0) >= 1 },
  { id: 'roll-100', title: 'Роллер-легенда', description: '100 роллів за весь час', reward: 800, icon: 'fa-dice', met: () => (gameState?.allTime?.rounds || 0) >= 100 },
  { id: 'roll-500', title: 'Невтомний', description: '500 роллів за весь час', reward: 2500, icon: 'fa-dice', met: () => (gameState?.allTime?.rounds || 0) >= 500 },
  { id: 'streak-7', title: 'Нестримний', description: '7 перемог поспіль', reward: 900, icon: 'fa-fire', met: () => (gameState?.stats?.bestStreak || 0) >= 7 },
  { id: 'rich-50k', title: 'Багатій', description: 'Баланс 50 000 PC', reward: 1500, icon: 'fa-coins', met: () => currentUser && currentUser.balance >= 50000 },
  { id: 'collector-10', title: 'Колекціонер', description: '10 предметів в інвентарі', reward: 500, icon: 'fa-boxes-stacked', met: () => userInventory.length >= 10 },
  { id: 'collector-25', title: 'Скарбничка', description: '25 предметів в інвентарі', reward: 1200, icon: 'fa-boxes-stacked', met: () => userInventory.length >= 25 },
  { id: 'case-10', title: 'Кейсоманія', description: '10 кейсів за весь час', reward: 800, icon: 'fa-box-open', met: () => (gameState?.allTime?.cases || 0) >= 10 },
  { id: 'case-30', title: 'Маніяк кейсів', description: '30 кейсів за весь час', reward: 2000, icon: 'fa-box-open', met: () => (gameState?.allTime?.cases || 0) >= 30 },
  { id: 'battle-10', title: 'Чемпіон боїв', description: '10 перемог в боях', reward: 1000, icon: 'fa-swords', met: () => (gameState?.allTime?.battleWins || 0) >= 10 },
  { id: 'contract-10', title: 'Король контрактів', description: '10 контрактів', reward: 900, icon: 'fa-boxes-packing', met: () => (gameState?.allTime?.contracts || 0) >= 10 },
  { id: 'seller-20', title: 'Профі-продавець', description: '20 продажів', reward: 700, icon: 'fa-sack-dollar', met: () => (gameState?.allTime?.sells || 0) >= 20 },
  { id: 'multi-10', title: 'Майстер мульти', description: '10 мульти-апгрейдів', reward: 900, icon: 'fa-layer-group', met: () => (gameState?.allTime?.multiInputs || 0) >= 10 },
  { id: 'credit-20', title: 'Кредитний маг', description: '20 апгрейдів кредитами', reward: 800, icon: 'fa-coins', met: () => (gameState?.allTime?.creditInputs || 0) >= 20 },
  { id: 'legendary', title: 'Мисливець за легендами', description: 'Отримай легендарний предмет з кейсу', reward: 2000, icon: 'fa-gem', met: () => (gameState?.allTime?.legendaryDrops || 0) >= 1 },
  { id: 'prestige-3', title: 'Трійна корона', description: 'Престиж 3', reward: 3000, icon: 'fa-crown', met: () => (gameState?.prestige || 0) >= 3 },
  { id: 'free-case-7', title: 'Щасливчик', description: '7 безкоштовних кейсів', reward: 600, icon: 'fa-calendar-check', met: () => (gameState?.allTime?.freeCases || 0) >= 7 },
  {
    id: 'all-collections',
    title: 'Мега-колекціонер',
    description: 'Завершити всі 3 колекції',
    reward: 5000,
    icon: 'fa-trophy',
    met: () => {
      if (!gameState?.collectionRewards) return false;
      return COLLECTION_DEFINITIONS.every(c => gameState.collectionRewards[c.id] === true);
    }
  },
  { id: 'royale-1', title: 'Король арени', description: 'Переможи в Battle Royale', reward: 1500, icon: 'fa-crown', met: () => (gameState?.allTime?.royaleWins || 0) >= 1 },
  { id: 'royale-5', title: 'Безсмертний', description: '5 перемог у Royale', reward: 5000, icon: 'fa-crown', met: () => (gameState?.allTime?.royaleWins || 0) >= 5 }
];

const COLLECTION_DEFINITIONS = [
  {
    id: 'snipers',
    title: 'Точний постріл',
    description: 'Збери 5 різних AWP',
    items: ['AWP | Atheris', 'AWP | Asiimov', 'AWP | Neo-Noir', 'AWP | Wildfire', 'AWP | Dragon Lore'],
    reward: { dc: 6500, skin: { id: 'excl-awp', name: '★ AWP | Paragon (Exclusive)', price: 9500, img: '', rarity: 'Extraordinary', rarityColor: '#eb4b4b' } }
  },
  {
    id: 'rifles',
    title: 'Основний склад',
    description: 'Збери 5 гвинтівок',
    items: ['AK-47 | Redline', 'AK-47 | Case Hardened', 'M4A1-S | Printstream', 'M4A4 | Howl', 'AK-47 | Asiimov'],
    reward: { dc: 5000, skin: { id: 'excl-ak', name: '★ AK-47 | Prime (Exclusive)', price: 7200, img: '', rarity: 'Extraordinary', rarityColor: '#eb4b4b' } }
  },
  {
    id: 'pistols',
    title: 'Другий шанс',
    description: 'Збери 5 пістолетів',
    items: ['Glock-18 | Water Elemental', 'USP-S | Kill Confirmed', 'Desert Eagle | Printstream', 'Glock-18 | Fade', 'P250 | See Ya Later'],
    reward: { dc: 2800, skin: { id: 'excl-deagle', name: '★ Desert Eagle | Crown (Exclusive)', price: 3900, img: '', rarity: 'Extraordinary', rarityColor: '#eb4b4b' } }
  }
];

const BATTLE_PASS_SEASON = Object.freeze({
  id: 'season-01',
  name: 'СЕЗОН 01',
  title: 'БОЙОВИЙ ПРОПУСК',
  tiers: 30,
  tierXp: 750,
  price: 100,
});

// A small daily loop for 6.0. Rewards stay deliberately modest: it is a
// reason to return, not a shortcut through player levels or the Battle Pass.
const POWER_RUN_REWARDS = Object.freeze([
  { credits: 2, xp: 35, icon: 'fa-bolt', label: '+2 PC' },
  { credits: 2.5, xp: 40, icon: 'fa-coins', label: '+2.50 PC' },
  { credits: 3, xp: 45, icon: 'fa-crosshairs', label: '+3 PC' },
  { credits: 3.5, xp: 50, icon: 'fa-fire', label: '+3.50 PC' },
  { credits: 4.5, xp: 55, icon: 'fa-shield-halved', label: '+4.50 PC' },
  { credits: 5.5, xp: 60, icon: 'fa-gem', label: '+5.50 PC' },
  { credits: 9, xp: 75, tickets: 1, icon: 'fa-ticket', label: '+9 PC · квиток' }
]);

const HALLOWEEN_EVENT = Object.freeze({
  id: 'halloween-2026',
  timeZone: 'Europe/Kyiv',
  startDate: '2026-10-18',
  endDate: '2026-11-03',
  dailyCaps: Object.freeze({ case: 2, battle: 1, arena: 1 })
});
const WINTER_EVENT = Object.freeze({
  id: 'icewire-2026',
  timeZone: 'Europe/Kyiv',
  startDate: '2026-12-12',
  endDate: '2027-01-17',
  dailyCaps: Object.freeze({ case: 2, battle: 1, arena: 1 })
});
const HALLOWEEN_REWARDS = Object.freeze([
  { pumpkins: 3, type: 'credits', amount: 12, icon: 'fa-coins', title: '12 PC' },
  { pumpkins: 7, type: 'ticket', amount: 1, icon: 'fa-ticket', title: 'Потужний квиток' },
  { pumpkins: 13, type: 'skin', skinName: 'P250 | See Ya Later', icon: 'fa-ghost', title: 'Halloween skin' }
]);
// Pumpkins are the progress track. Pumpkin Coins are a separate, spendable
// event currency, so a player never has to choose between finishing the event
// and buying a cosmetic. All rewards below are virtual and account-bound.
const HALLOWEEN_COIN_REWARDS = Object.freeze({ case: 2, battle: 3, arena: 3 });
const HALLOWEEN_TREAT_COST = 3;
const HALLOWEEN_COSMETICS = Object.freeze({
  night_hunter_2026: { id: 'night_hunter_2026', kind: 'title', icon: 'fa-crosshairs', title: 'Нічний мисливець', note: 'Постійний титул Halloween 2026' },
  midnight_keeper_2026: { id: 'midnight_keeper_2026', kind: 'title', icon: 'fa-moon', title: 'Сторож опівночі', note: 'Постійний титул за ритуал' },
  rift_breaker_2026: { id: 'rift_breaker_2026', kind: 'title', icon: 'fa-burst', title: 'Руйнівник Розлому', note: 'Постійний титул за майстерний удар у Розломі' },
  halloween_night_2026: { id: 'halloween_night_2026', kind: 'frame', icon: 'fa-ghost', title: 'Гарбузова ніч', note: 'Постійна рамка профілю' }
});
const HALLOWEEN_SHOP_ITEMS = Object.freeze([
  { id: 'halloween_ticket', kind: 'ticket', icon: 'fa-ticket', title: 'Потужний квиток', note: 'Одна безкоштовна прокрутка', cost: 14, limit: 2 },
  { id: 'night_hunter_2026', kind: 'cosmetic', icon: 'fa-crosshairs', title: 'Нічний мисливець', note: 'Постійний титул профілю', cost: 32, limit: 1 },
  { id: 'halloween_night_2026', kind: 'cosmetic', icon: 'fa-ghost', title: 'Гарбузова ніч', note: 'Постійна рамка профілю', cost: 48, limit: 1 }
]);
const HALLOWEEN_TREAT_OPTIONS = Object.freeze([
  { id: 'pc', icon: 'fa-coins', title: '+4 PC', note: 'Візьми невелику миттєву нагороду', credits: 4 },
  { id: 'ticket', icon: 'fa-ticket', title: '+1 квиток', note: 'Відкрий кейс без PC', tickets: 1 },
  { id: 'shard', icon: 'fa-moon', title: 'Уламок ритуалу', note: '3 уламки → титул назавжди', shard: 1 }
]);
// Nightfall is deliberately not a roll or a wager. It turns three real game
// actions into one co-operative route through the Halloween city.
const PULSE_CIRCUIT = Object.freeze({
  dailyXp: 90,
  badgeAt: 3,
  steps: Object.freeze([
    { id: 'case', icon: 'fa-box-open', title: 'Ліхтарний базар', note: 'Відкрий будь-який звичайний кейс', action: 'До кейсів', page: 'case', district: 'market' },
    { id: 'battle', icon: 'fa-hand-fist', title: 'Арена примар', note: 'Виграй один бій 1v1', action: 'До бою', page: 'battle', district: 'arena' },
    { id: 'arena', icon: 'fa-tower-broadcast', title: 'Вежа сигналу', note: 'Набери 13 влучань у тирі', action: 'До вежі', page: 'tasks', district: 'tower' }
  ])
});
const HALLOWEEN_PAGE_COPY = Object.freeze({
  upgrader: { nav: 'Алхімія', title: 'Алхімія тіней', eyebrow: 'НІЧНА АЛХІМІЯ', heading: 'Пробуди <em>силу тіней</em>', description: 'Поєднуй віртуальні предмети та PC у ритуалі Nightfall. Ти завжди бачиш шанс перед запуском.' },
  case: { nav: 'Ліхтарі', title: 'Ліхтарі Nightfall', eyebrow: 'СВІТЛО В ТУМАНІ', heading: 'Сховище <em>Nightfall</em>', description: 'Відкривай тематичні кейси Нічного міста та шукай рідкісні сигнали в кожному дропі.' },
  battle: { nav: 'Дуелі', title: 'Дуель примар', eyebrow: 'АРЕНА ПРИМАР', heading: 'Дуель <em>примар</em>', description: 'Кинь виклик іншому гравцю під світлом повного місяця. Пошук і результат лишаються чесною віртуальною грою.' },
  royale: { nav: 'Місячний круг', title: 'Місячний круг', eyebrow: 'КОЛО ПОВНОГО МІСЯЦЯ', heading: 'Коло <em>повного місяця</em>', description: 'Збери віртуальний банк, займи місце в колі й дивись, кого обере ніч.' },
  contract: { nav: 'Ритуал', title: 'Ритуал ночі', eyebrow: 'РИТУАЛ ОБМІНУ', heading: 'Ритуал <em>обміну</em>', description: 'П’ять предметів входять у коло — один результат виходить з туману.' },
  tasks: { nav: 'Нічна мапа', title: 'Карта Нічного міста', eyebrow: 'МІСТО ПРОКИНУЛОСЯ', heading: 'Карта <em>Нічного міста</em>', description: 'Йди за сигналами, відкривай райони та збирай сезонний прогрес щодня.' },
  profile: { nav: 'Досьє', title: 'Нічне досьє' },
  about: { nav: 'Кодекс', title: 'Кодекс Nightfall', eyebrow: 'ПРАВИЛА НІЧНОГО МІСТА', heading: 'Кодекс <em>Nightfall</em>', description: 'Сезонна пригода лишається віртуальною грою: без ставок, платежів чи реальних призів.' }
});
const WINTER_PAGE_COPY = Object.freeze({
  upgrader: { nav: 'Кріосинтез', title: 'Кріосинтез', eyebrow: 'ПОЛЯРНА ЛАБОРАТОРІЯ', heading: 'Збери <em>чистий сигнал</em>', description: 'Поєднуй віртуальні предмети та FC під холодним світлом реактора. Шанс завжди видно до запуску.' },
  case: { nav: 'Контейнери', title: 'Крижані контейнери', eyebrow: 'КРИЖАНИЙ ДОК', heading: 'Відкрий <em>ICEWIRE</em>', description: 'Шукай сигнали в контейнерах, які винесло на чорний лід після полярної бурі.' },
  battle: { nav: 'Чорний лід', title: 'Дуелі чорного льоду', eyebrow: 'ПОЛЯРНА АРЕНА', heading: 'Утримай <em>покриття</em>', description: 'Чесна віртуальна дуель на льоду: без ставок реальних грошей і без справжніх призів.' },
  royale: { nav: 'Біла орбіта', title: 'Біла орбіта', eyebrow: 'КОЛО СЯЙВА', heading: 'Увійди в <em>білу орбіту</em>', description: 'Збери віртуальний банк у світлі полярного сяйва та подивись, кому дістанеться сигнал.' },
  contract: { nav: 'Кріоконтракт', title: 'Кріоконтракт', eyebrow: 'СТАНЦІЯ НУЛЬ', heading: 'Перезбери <em>контур</em>', description: 'П’ять предметів входять у кріоконтур — один результат повертається з морозної темряви.' },
  tasks: { nav: 'ICEWIRE', title: 'ICEWIRE: Zero Hour', eyebrow: 'ЕКСПЕДИЦІЯ У ХОЛОД', heading: 'Станція <em>Нуль</em>', description: 'Заряджай Ядро полярного сяйва разом з усіма гравцями та проводь сигнали крізь заметіль.' },
  profile: { nav: 'Капсула', title: 'Крижана капсула' },
  about: { nav: 'Протокол', title: 'Протокол ICEWIRE', eyebrow: 'ПРАВИЛА ПОЛЯРНОЇ СТАНЦІЇ', heading: 'Протокол <em>Zero Hour</em>', description: 'Сезонна експедиція — віртуальна гра без ставок, платежів чи реальних призів.' }
});
const WINTER_COSMETICS = Object.freeze({
  aurora_conductor_2026: { id: 'aurora_conductor_2026', kind: 'title', icon: 'fa-satellite-dish', title: 'Провідник сяйва', note: 'Постійний титул за майстерний маршрут крізь заметіль' },
  icewire_survivor_2026: { id: 'icewire_survivor_2026', kind: 'title', icon: 'fa-snowflake', title: 'Той, хто пережив заметіль', note: 'Постійний титул за сезонний прогрес' },
  aurora_frame_2026: { id: 'aurora_frame_2026', kind: 'frame', icon: 'fa-wand-magic-sparkles', title: 'Aurora', note: 'Постійна рамка профілю' }
});
// The Signal campaign is always available.  Its rewards are only cosmetic,
// so every player can keep progressing between limited-time events without
// affecting their balance, drop odds or game power.
const SIGNAL_SEASON_COSMETICS = Object.freeze({
  signal_pathfinder_2026: { id: 'signal_pathfinder_2026', kind: 'title', icon: 'fa-satellite-dish', title: 'Провідник Сигналу', note: 'Постійний титул за 4 вузли кампанії' },
  signal_resonance_2026: { id: 'signal_resonance_2026', kind: 'frame', icon: 'fa-wave-square', title: 'Резонанс', note: 'Постійна рамка за завершення маршруту' }
});
const SIGNAL_SEASON = Object.freeze({ id: 'signal-2026', title: 'СЕЗОН: СИГНАЛ', rewardSteps: Object.freeze([2, 4, 6]) });
const SEASONAL_COSMETICS = Object.freeze({ ...HALLOWEEN_COSMETICS, ...WINTER_COSMETICS, ...SIGNAL_SEASON_COSMETICS });
const HALLOWEEN_ADMIN_PREVIEW_QUERY = 'adminPreview';
let halloweenAdminPreviewRequested = new URLSearchParams(window.location.search).get(HALLOWEEN_ADMIN_PREVIEW_QUERY) === HALLOWEEN_EVENT.id;
let halloweenAdminPreviewAuthorized = false;
let winterAdminPreviewRequested = new URLSearchParams(window.location.search).get(HALLOWEEN_ADMIN_PREVIEW_QUERY) === WINTER_EVENT.id;
let winterAdminPreviewAuthorized = false;
const MIDNIGHT_RIFT_RUN_MS = 15_000;
const MIDNIGHT_RIFT_MAX_RUNS = 3;
let midnightRiftRun = null;
const ICEWIRE_ROUTE_RUN_MS = 20_000;
const ICEWIRE_ROUTE_MAX_RUNS = 3;
let icewireRouteRun = null;

const TARGET_ARENA_STAKES = Object.freeze([25, 100, 250]);
const TARGET_ARENA_DURATION_MS = 15_000;
const TARGET_ARENA_HIT_BONUS_MS = 220;
const TARGET_ARENA_MAX_BONUS_MS = 5_000;
const TARGET_ARENA_ASSETS = Object.freeze({
  backdrop: '/assets/arena/zero-sight-range-v1.png',
  standard: '/assets/arena/zero-sight-standard-target-v1.png',
  elite: '/assets/arena/zero-sight-elite-target-v1.png',
  decoy: '/assets/arena/zero-sight-decoy-target-v1.png',
  nightfallBackdrop: '/assets/arena/nightfall-range-v1.png',
  nightfallTarget: '/assets/arena/nightfall-pumpkin-target-v1.png',
  icewireBackdrop: '/assets/arena/icewire-range-v1.png',
  icewireTarget: '/assets/arena/icewire-core-target-v1.png'
});
const TARGET_ARENA_THEMES = Object.freeze({
  default: Object.freeze({
    key: 'zero-sight',
    cardClass: 'is-zero-sight',
    name: 'ЕЛІТНИЙ ТИР',
    kicker: 'ZERO-SIGHT · ОСНОВНИЙ ПОЛІГОН',
    icon: 'fa-crosshairs',
    boardCopy: 'ОБЕРИ ЛІНІЮ · ВЛУЧИ ТОЧНО',
    liveHint: 'Наводься на мішені різної дальності. Далека лінія дає більше очок і часу.',
    backdrop: TARGET_ARENA_ASSETS.backdrop,
    targetAsset: '',
    targetLabels: Object.freeze({})
  }),
  halloween: Object.freeze({
    key: 'nightfall',
    cardClass: 'is-halloween',
    name: 'ГАРБУЗОВИЙ ТИР',
    kicker: 'NIGHTFALL · ПОЛЮВАННЯ НА СИГНАЛИ',
    icon: 'fa-ghost',
    boardCopy: 'ПОЛЮВАННЯ В ТУМАНІ',
    liveHint: 'Гарбузові маяки й хибні сигнали ховаються у тумані. Правила та баланс лишаються чесними.',
    backdrop: TARGET_ARENA_ASSETS.nightfallBackdrop,
    targetAsset: TARGET_ARENA_ASSETS.nightfallTarget,
    targetLabels: Object.freeze({ standard: 'ГАРБУЗОВИЙ МАЯК', elite: 'КОРОЛІВСЬКИЙ ГАРБУЗ', decoy: 'ПРОКЛЯТИЙ ГАРБУЗ' })
  }),
  winter: Object.freeze({
    key: 'icewire',
    cardClass: 'is-icewire',
    name: 'ПОЛЯРНИЙ ТИР',
    kicker: 'ICEWIRE · ZERO HOUR',
    icon: 'fa-snowflake',
    boardCopy: 'КРИЖАНІ ЛІНІЇ НАВЕДЕННЯ',
    liveHint: 'Крижані ядра станції світяться крізь мороз. Правила та баланс лишаються чесними.',
    backdrop: TARGET_ARENA_ASSETS.icewireBackdrop,
    targetAsset: TARGET_ARENA_ASSETS.icewireTarget,
    targetLabels: Object.freeze({ standard: 'КРИЖАНЕ ЯДРО', elite: 'ПОЛЯРНИЙ МАЯК', decoy: 'ТРІСНУТЕ ЯДРО' })
  })
});
const TARGET_ARENA_DEPTHS = Object.freeze([
  Object.freeze({ key: 'near', label: 'БЛИЖНЯ ЛІНІЯ', points: 1, bonusMs: 190, scale: 0.78, minX: 0.06, maxX: 0.32, minY: 0.36, maxY: 0.63, nextMs: 1_050 }),
  Object.freeze({ key: 'mid', label: 'СЕРЕДНЯ ЛІНІЯ', points: 2, bonusMs: TARGET_ARENA_HIT_BONUS_MS, scale: 0.57, minX: 0.34, maxX: 0.59, minY: 0.28, maxY: 0.59, nextMs: 850 }),
  Object.freeze({ key: 'far', label: 'ДАЛЬНЯ ЛІНІЯ', points: 3, bonusMs: 290, scale: 0.40, minX: 0.64, maxX: 0.88, minY: 0.17, maxY: 0.53, nextMs: 680 })
]);
const TARGET_ARENA_TARGETS = Object.freeze({
  standard: Object.freeze({ key: 'standard', label: 'ТАКТИЧНА МІШЕНЬ', icon: 'fa-bullseye', asset: TARGET_ARENA_ASSETS.standard, scoreBonus: 0, bonusMs: 0 }),
  elite: Object.freeze({ key: 'elite', label: 'ЕЛІТНИЙ МАЯК', icon: 'fa-gem', asset: TARGET_ARENA_ASSETS.elite, scoreBonus: 1, bonusMs: 100 }),
  decoy: Object.freeze({ key: 'decoy', label: 'ХИБНИЙ СИГНАЛ', icon: 'fa-triangle-exclamation', asset: TARGET_ARENA_ASSETS.decoy, scoreBonus: 0, bonusMs: 0 })
});
const TARGET_ARENA_PAYOUTS = Object.freeze([
  { minimumScore: 21, multiplier: 0.95, label: 'ЕЛІТА · 95%' },
  { minimumScore: 17, multiplier: 0.75, label: 'МАЙСТЕР · 75%' },
  { minimumScore: 13, multiplier: 0.55, label: 'СТАБІЛЬНО · 55%' },
  { minimumScore: 9, multiplier: 0.30, label: 'ЧАСТКОВО · 30%' },
  { minimumScore: 5, multiplier: 0.10, label: 'РОЗІГРІВ · 10%' },
  { minimumScore: 0, multiplier: 0, label: 'ПРОМАХ · 0%' }
]);
let targetArenaSelectedStake = TARGET_ARENA_STAKES[0];
let targetArenaSession = null;
let targetArenaTimer = 0;
let targetArenaMoveTimer = 0;
let powerRunExpanded = false;
let targetArenaExpanded = false;
let battlePassExpanded = false;
let halloweenEventDateKey = '';
let halloweenShopExpanded = false;
let halloweenTreatExpanded = false;

// Battle Pass rewards deliberately reuse the real skins already present in
// the catalogue. This keeps their artwork, name, rarity and inventory data
// consistent with the shop and case pools instead of creating fake variants.
function getBattlePassCatalogSkin(name, fallback) {
  const catalogSkin = CS2_SKINS.find(skin => skin.name === name);
  return catalogSkin
    ? { ...catalogSkin, sourceSkinId: catalogSkin.id }
    : { ...fallback, id: `battle-pass-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 72)}`, sourceSkinId: '' };
}

const BATTLE_PASS_FREE_SKINS = Object.freeze({
  10: getBattlePassCatalogSkin('Glock-18 | Water Elemental', { name: 'Glock-18 | Water Elemental', price: 240, img: '', rarity: 'Restricted', rarityColor: '#8847ff' }),
  20: getBattlePassCatalogSkin('AK-47 | Redline', { name: 'AK-47 | Redline', price: 500, img: '', rarity: 'Classified', rarityColor: '#d32ce6' }),
  30: getBattlePassCatalogSkin('AWP | Asiimov', { name: 'AWP | Asiimov', price: 1_550, img: '', rarity: 'Covert', rarityColor: '#eb4b4b' }),
});

const BATTLE_PASS_PREMIUM_SKINS = Object.freeze({
  5: getBattlePassCatalogSkin('P250 | See Ya Later', { name: 'P250 | See Ya Later', price: 260, img: '', rarity: 'Restricted', rarityColor: '#8847ff' }),
  10: getBattlePassCatalogSkin('Desert Eagle | Printstream', { name: 'Desert Eagle | Printstream', price: 1_000, img: '', rarity: 'Classified', rarityColor: '#d32ce6' }),
  15: getBattlePassCatalogSkin('USP-S | Kill Confirmed', { name: 'USP-S | Kill Confirmed', price: 1_300, img: '', rarity: 'Covert', rarityColor: '#eb4b4b' }),
  20: getBattlePassCatalogSkin('M4A1-S | Printstream', { name: 'M4A1-S | Printstream', price: 1_800, img: '', rarity: 'Covert', rarityColor: '#eb4b4b' }),
  25: getBattlePassCatalogSkin('Glock-18 | Fade', { name: 'Glock-18 | Fade', price: 2_600, img: '', rarity: 'Restricted', rarityColor: '#8847ff' }),
  30: getBattlePassCatalogSkin('★ Butterfly Knife | Doppler', { name: '★ Butterfly Knife | Doppler', price: 8_600, img: '', rarity: 'Extraordinary', rarityColor: '#eb4b4b' }),
});

const BATTLE_PASS_FREE_PC = [90, 110, 130, 150, 170, 190, 210, 230, 260, 0, 290, 320, 350, 380, 410, 440, 470, 500, 540, 0, 580, 620, 660, 700, 750, 800, 860, 920, 1_000, 0];
const BATTLE_PASS_PREMIUM_PC = [150, 180, 210, 240, 0, 300, 340, 380, 420, 0, 500, 550, 600, 650, 0, 750, 820, 890, 960, 0, 1_050, 1_150, 1_250, 1_350, 0, 1_500, 1_650, 1_800, 2_000, 0];
const BATTLE_PASS_FREE_TICKETS = new Set([7, 18]);
const BATTLE_PASS_PREMIUM_TICKETS = new Set([4, 12, 22]);

for (const rewards of [BATTLE_PASS_FREE_PC, BATTLE_PASS_PREMIUM_PC]) {
  rewards.forEach((amount, index) => { rewards[index] = legacyPc(amount); });
}

const BATTLE_PASS_REWARDS = Object.freeze(Array.from({ length: BATTLE_PASS_SEASON.tiers }, (_, index) => {
  const tier = index + 1;
  const rewardFor = (skin, amount, ticket) => skin
    ? { type: 'skin', skin }
    : ticket
      ? { type: 'ticket', amount: 1 }
      : { type: 'pc', amount };
  return {
    tier,
    free: rewardFor(BATTLE_PASS_FREE_SKINS[tier], BATTLE_PASS_FREE_PC[index], BATTLE_PASS_FREE_TICKETS.has(tier)),
    premium: rewardFor(BATTLE_PASS_PREMIUM_SKINS[tier], BATTLE_PASS_PREMIUM_PC[index], BATTLE_PASS_PREMIUM_TICKETS.has(tier)),
  };
}));

function createDefaultBattlePass() {
  return { season: BATTLE_PASS_SEASON.id, xp: 0, premium: false, claimedFree: [], claimedPremium: [] };
}

function createSteamAvatarFallback(name = 'Steam') {
  const label = escapeSvgText(cleanText(name, 1).toUpperCase() || 'S');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#66c0f4"/><stop offset="1" stop-color="#171a21"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><circle cx="91" cy="39" r="23" fill="none" stroke="#fff" stroke-width="8" opacity=".9"/><circle cx="91" cy="39" r="7" fill="#fff"/><path d="M78 56 44 82" stroke="#fff" stroke-width="10" stroke-linecap="round"/><circle cx="37" cy="88" r="17" fill="#fff" opacity=".95"/><text x="64" y="119" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="20" font-weight="900">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getSteamAvatarRelayUrl(steamId) {
  const safeSteamId = /^\d{17}$/.test(String(steamId || '')) ? String(steamId) : '';
  return safeSteamId ? `${gameApiUrl('/api/steam/avatar')}?steamId=${encodeURIComponent(safeSteamId)}` : '';
}

function handleSteamAvatarError(image) {
  if (!image) return;
  const directAvatar = cleanImageUrl(image.dataset.steamAvatar || '');
  const relayAvatar = String(image.dataset.steamAvatarRelay || '');
  const attempted = image.dataset.steamAvatarAttempt || '';
  // Prefer the server-supplied Steam CDN URL. If a browser, WebView, or CDN
  // blocks it temporarily, retry once through our narrow Steam-only relay.
  // This avoids turning a working public photo into the generic Steam icon.
  if (attempted !== 'direct' && directAvatar) {
    image.dataset.steamAvatarAttempt = 'direct';
    image.src = directAvatar;
    return;
  }
  if (attempted !== 'relay' && relayAvatar) {
    image.dataset.steamAvatarAttempt = 'relay';
    image.src = relayAvatar;
    return;
  }
  image.src = createSteamAvatarFallback(image.dataset.steamName || image.alt || 'Steam');
  image.classList.add('fallback-skin');
}

function setSteamAvatarSource(image, steamId, avatar, name = 'Steam') {
  if (!image) return;
  image.dataset.steamName = name || 'Steam';
  const directAvatar = cleanImageUrl(avatar);
  if (directAvatar) image.dataset.steamAvatar = directAvatar;
  else delete image.dataset.steamAvatar;
  const relayAvatar = getSteamAvatarRelayUrl(steamId);
  if (relayAvatar) image.dataset.steamAvatarRelay = relayAvatar;
  else delete image.dataset.steamAvatarRelay;
  image.classList.remove('fallback-skin');
  // The session payload is resolved by the Worker, so this URL is safe to
  // place in an image element and works without CORS. The relay is only the
  // fallback for a stale/missing URL or an occasional Steam CDN image failure.
  image.dataset.steamAvatarAttempt = directAvatar ? 'direct' : relayAvatar ? 'relay' : 'fallback';
  image.src = directAvatar || relayAvatar || createSteamAvatarFallback(image.dataset.steamName);
}

function normalizeSteamProfile(profile, steamId = '') {
  const sid = /^\d{17}$/.test(String(profile?.steamId || steamId || '')) ? String(profile?.steamId || steamId) : '';
  if (!sid) return null;
  return {
    steamId: sid,
    name: cleanText(profile?.name, 48) || `Steam_${sid.slice(-4)}`,
    avatar: cleanImageUrl(profile?.avatar),
    profileUrl: `https://steamcommunity.com/profiles/${sid}/`,
    visibility: cleanText(profile?.visibility, 24) || 'unknown',
    updatedAt: clampNumber(profile?.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now())
  };
}

function normalizeSteamImportRecord(record, steamId = '') {
  const sid = /^\d{17}$/.test(String(record?.steamId || steamId || '')) ? String(record?.steamId || steamId) : '';
  if (!sid) return null;
  const assetIds = Array.isArray(record?.assetIds)
    ? [...new Set(record.assetIds.map(id => cleanText(id, 64)).filter(Boolean))].slice(-5_000)
    : [];
  return {
    steamId: sid,
    assetIds,
    lastSyncAt: clampNumber(record?.lastSyncAt, 0, Number.MAX_SAFE_INTEGER, 0)
  };
}

function normalizeSteamImportMap(rawRecords, legacyRecord = null) {
  const imports = {};
  if (rawRecords && typeof rawRecords === 'object' && !Array.isArray(rawRecords)) {
    Object.entries(rawRecords).slice(-4).forEach(([steamId, record]) => {
      const normalized = normalizeSteamImportRecord(record, steamId);
      if (normalized) imports[normalized.steamId] = normalized;
    });
  }
  const legacy = normalizeSteamImportRecord(legacyRecord);
  if (legacy && !imports[legacy.steamId]) imports[legacy.steamId] = legacy;
  return imports;
}

function getSteamImportMap() {
  return normalizeSteamImportMap(account?.steamImports, account?.steamImport);
}

function setSteamImportRecord(steamId, record) {
  const normalized = normalizeSteamImportRecord(record, steamId);
  if (!normalized || !account) return normalized;
  const imports = getSteamImportMap();
  imports[normalized.steamId] = normalized;
  account.steamImports = imports;
  account.steamImport = normalized;
  return normalized;
}

const CURRENCY_TOKEN = 'PC';

function getCurrencyToken() {
  const season = getActiveSeason();
  return season?.kind === 'winter' ? 'FC' : season?.kind === 'halloween' ? 'NC' : CURRENCY_TOKEN;
}

function formatCreditValue(v) {
  const value = Math.max(0, roundPc(v));
  return value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function formatCredits(v) {
  return `${formatCreditValue(v)} ${getCurrencyToken()}`;
}

function escapeHtml(v) {
  return String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function escapeSvgText(v) {
  return String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c]));
}

function createDefaultDaily() {
  return { date: '', rolls: 0, wins: 0, cases: 0, pistolWins: 0, rifleWins: 0, sniperWins: 0, smgWins: 0, heavyWins: 0, sells: 0, sellValue: 0, battles: 0, battleWins: 0, contracts: 0, creditInputs: 0, multiInputs: 0, targetValue: 0, bestWinValue: 0, bestStreak: 0, claimed: [] };
}

function createDefaultWeekly() {
  return { week: '', rolls: 0, wins: 0, cases: 0, battles: 0, contracts: 0, sells: 0, bestWinValue: 0, bestStreak: 0, claimed: [] };
}

function createDefaultPowerRun() {
  return { lastClaimDate: '', streak: 0, totalClaims: 0 };
}

function createDefaultHalloweenEvent() {
  return {
    pumpkins: 0,
    pumpkinCoins: 0,
    claimed: [],
    dailyDate: '',
    dailySources: { case: 0, battle: 0, arena: 0 },
    treatDate: '',
    treatChoice: '',
    ritualShards: 0,
    riftDate: '',
    riftRuns: 0,
    riftBest: 0,
    purchases: [],
    cosmetics: { titles: [], frames: [], activeTitle: '', activeFrame: '' }
  };
}

function createDefaultWinterEvent() {
  return {
    shards: 0,
    dailyDate: '',
    dailySources: { case: 0, battle: 0, arena: 0 },
    routeDate: '',
    routeRuns: 0,
    bestRoute: 0,
    claimed: [],
    cosmetics: { titles: [], frames: [], activeTitle: '', activeFrame: '' }
  };
}

function createDefaultSignalSeason() {
  return {
    claimed: [],
    cosmetics: { titles: [], frames: [], activeTitle: '', activeFrame: '' },
    moments: [],
    startedAt: Date.now()
  };
}

function createDefaultSeasonalCosmetics() {
  return { activeTitle: '', activeFrame: '' };
}

function createDefaultPulseCircuit() {
  return { date: '', step: 0, completed: 0, completedDate: '', badgeUnlocked: false, lastCompletedAt: 0 };
}

function createDefaultTargetArena() {
  return { rounds: 0, bestScore: 0, totalSpent: 0, totalPayout: 0, lastPlayedAt: 0 };
}

function createDefaultAllTime() {
  return { rounds: 0, wins: 0, cases: 0, battles: 0, battleWins: 0, contracts: 0, sells: 0, sellValue: 0, freeCases: 0, biggestWin: 0, legendaryDrops: 0, multiInputs: 0, creditInputs: 0, royaleWins: 0 };
}

function createDefaultGameState() {
  return {
    xp: 0,
    theme: 'amber',
    prestige: 0,
    stats: { rounds: 0, wins: 0, currentStreak: 0, bestStreak: 0, bestValue: 0, cases: 0, pistolWins: 0, sells: 0, battles: 0, battleWins: 0, contracts: 0 },
    daily: createDefaultDaily(),
    weekly: createDefaultWeekly(),
    powerRun: createDefaultPowerRun(),
    halloweenEvent: createDefaultHalloweenEvent(),
    winterEvent: createDefaultWinterEvent(),
    signalSeason: createDefaultSignalSeason(),
    seasonalCosmetics: createDefaultSeasonalCosmetics(),
    profileStyle: 'standard',
    pulseCircuit: createDefaultPulseCircuit(),
    targetArena: createDefaultTargetArena(),
    allTime: createDefaultAllTime(),
    achievements: {},
    favorites: [],
    performanceMode: 'auto',
    showcase: [],
    caseCollectionTrophies: {},
    dailyStreak: { current: 0, best: 0, lastDay: '' },
    battlePass: createDefaultBattlePass(),
    caseTickets: 0,
    rounds: [],
    collectionRewards: {}
  };
}

function getTodayKey() {
  const n = new Date();
  const o = n.getTimezoneOffset() * 60000;
  return new Date(n.getTime() - o).toISOString().slice(0, 10);
}

function ensureDailyState() {
  if (!gameState) gameState = createDefaultGameState();
  if (gameState.daily.date !== getTodayKey()) {
    gameState.daily = createDefaultDaily();
    gameState.daily.date = getTodayKey();
  }
}

function ensureWeeklyState() {
  if (!gameState) gameState = createDefaultGameState();
  if (gameState.weekly.week !== getWeekKey()) {
    gameState.weekly = createDefaultWeekly();
    gameState.weekly.week = getWeekKey();
  }
}

function loadGameState() {
  const d = createDefaultGameState();
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE.game) || 'null');
    gameState = s ? {
      ...d,
      ...s,
      stats: { ...d.stats, ...(s.stats || {}) },
      daily: { ...createDefaultDaily(), ...(s.daily || {}) },
      weekly: { ...createDefaultWeekly(), ...(s.weekly || {}) },
      powerRun: { ...createDefaultPowerRun(), ...(s.powerRun || {}) },
      halloweenEvent: { ...createDefaultHalloweenEvent(), ...(s.halloweenEvent || {}) },
      winterEvent: { ...createDefaultWinterEvent(), ...(s.winterEvent || {}) },
      signalSeason: { ...createDefaultSignalSeason(), ...(s.signalSeason || {}) },
      seasonalCosmetics: { ...createDefaultSeasonalCosmetics(), ...(s.seasonalCosmetics || {}) },
      pulseCircuit: { ...createDefaultPulseCircuit(), ...(s.pulseCircuit || {}) },
      targetArena: { ...createDefaultTargetArena(), ...(s.targetArena || {}) },
      allTime: { ...createDefaultAllTime(), ...(s.allTime || {}) },
      achievements: s.achievements || {},
      favorites: Array.isArray(s.favorites) ? s.favorites.map(String) : [],
      performanceMode: s.performanceMode === 'lite' ? 'lite' : 'auto',
      showcase: normalizeShowcaseIds(s.showcase),
      dailyStreak: { ...d.dailyStreak, ...(s.dailyStreak || {}) },
      battlePass: { ...createDefaultBattlePass(), ...(s.battlePass || {}) },
      caseTickets: clampNumber(s.caseTickets, 0, 999, 0),
      rounds: Array.isArray(s.rounds) ? s.rounds.slice(0, ROUND_HISTORY_LIMIT) : [],
      collectionRewards: s.collectionRewards || {},
      caseCollectionTrophies: s.caseCollectionTrophies && typeof s.caseCollectionTrophies === 'object' ? s.caseCollectionTrophies : {}
    } : d;
  } catch {
    gameState = d;
  }
  ensureDailyState();
  ensureWeeklyState();
}

function getXpMultiplier() {
  return 1 + (gameState?.prestige || 0) * 0.10;
}

function getPlayerLevel() {
  return Math.floor((gameState?.xp || 0) / PLAYER_LEVEL_XP) + 1;
}

const PLAYER_RANKS = [
  { min: 1, title: 'Новачок', icon: 'fa-seedling', tone: 'slate' },
  { min: 6, title: 'Розвідник', icon: 'fa-compass', tone: 'cyan' },
  { min: 15, title: 'Оператор', icon: 'fa-crosshairs', tone: 'amber' },
  { min: 30, title: 'Еліта', icon: 'fa-shield-halved', tone: 'violet' },
  { min: 50, title: 'Легенда', icon: 'fa-crown', tone: 'emerald' }
];

function getPlayerRank(level = getPlayerLevel()) {
  return PLAYER_RANKS.reduce((current, candidate) => level >= candidate.min ? candidate : current, PLAYER_RANKS[0]);
}

const PROFILE_STYLE_DEFINITIONS = Object.freeze([
  { id: 'standard', title: 'Стандарт', note: 'Базове оформлення профілю', icon: 'fa-user-shield' },
  { id: 'void', title: 'Void', note: 'Досягни 5 рівня', icon: 'fa-moon', unlock: () => getPlayerLevel() >= 5 },
  { id: 'neon', title: 'Neon', note: 'Відкрий 10 кейсів', icon: 'fa-bolt', unlock: () => (gameState?.allTime?.cases || 0) >= 10 },
  { id: 'arcade', title: 'Arcade', note: 'Відкрий 3 досягнення', icon: 'fa-gamepad', unlock: () => Object.keys(gameState?.achievements || {}).length >= 3 },
  { id: 'prism', title: 'Prism', note: 'Заверши одну колекцію', icon: 'fa-gem', unlock: () => Object.values(gameState?.collectionRewards || {}).some(Boolean) }
]);

function getProfileStyleDefinition(styleId = gameState?.profileStyle) {
  return PROFILE_STYLE_DEFINITIONS.find(style => style.id === styleId) || PROFILE_STYLE_DEFINITIONS[0];
}

function isProfileStyleUnlocked(style) {
  return style.id === 'standard' || style.unlock?.() === true;
}

function renderProfileStyleSummary() {
  const profile = document.getElementById('profileOverview');
  const button = document.getElementById('profileCosmeticsButton');
  const label = document.getElementById('profileCosmeticsLabel');
  if (!profile || !button || !label) return;
  const style = getProfileStyleDefinition();
  PROFILE_STYLE_DEFINITIONS.forEach(entry => profile.classList.toggle(`profile-style-${entry.id}`, entry.id === style.id));
  const icon = button.querySelector('i');
  if (icon) icon.className = `fa-solid ${style.icon}`;
  button.classList.remove('hidden');
  label.textContent = style.title;
}

function localDayKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function claimDailyStreak() {
  const streak = gameState.dailyStreak = { current: 0, best: 0, lastDay: '', ...(gameState.dailyStreak || {}) };
  const today = localDayKey();
  if (streak.lastDay === today) return { current: streak.current, reward: 0, cycleDay: 0 };
  streak.current = streak.lastDay === localDayKey(-1) ? Math.max(0, Number(streak.current) || 0) + 1 : 1;
  streak.best = Math.max(Number(streak.best) || 0, streak.current);
  streak.lastDay = today;
  const cycleDay = (streak.current - 1) % DAILY_STREAK_REWARDS.length;
  return { current: streak.current, reward: DAILY_STREAK_REWARDS[cycleDay], cycleDay: cycleDay + 1 };
}

function getDailyCalendarProgress() {
  const streak = gameState?.dailyStreak || {};
  const current = Math.max(0, Number(streak.current) || 0);
  const claimedToday = String(streak.lastDay || '') === localDayKey();
  const cycleDay = claimedToday
    ? ((Math.max(1, current) - 1) % DAILY_CALENDAR_REWARDS.length) + 1
    : (current % DAILY_CALENDAR_REWARDS.length) + 1;
  return { current, claimedToday, cycleDay, reward: DAILY_CALENDAR_REWARDS[cycleDay - 1] };
}

function getDailyCalendarCollectible(streak) {
  const cycle = Math.max(1, Math.floor((Math.max(1, Number(streak) || 1) - 1) / DAILY_CALENDAR_REWARDS.length));
  return DAILY_CALENDAR_COLLECTIBLES[(cycle - 1) % DAILY_CALENDAR_COLLECTIBLES.length];
}

function getLevelProgress() {
  const xp = gameState?.xp || 0;
  return { current: xp % PLAYER_LEVEL_XP, total: PLAYER_LEVEL_XP, percent: ((xp % PLAYER_LEVEL_XP) / PLAYER_LEVEL_XP) * 100 };
}

function addXp(v) {
  if (!gameState) return;
  const gained = Math.max(0, Math.round((v || 0) * getXpMultiplier()));
  gameState.xp = Math.max(0, gameState.xp + gained);
  addBattlePassXp(gained);
}

function getBattlePassState() {
  if (!gameState) return createDefaultBattlePass();
  const stored = gameState.battlePass && typeof gameState.battlePass === 'object' ? gameState.battlePass : {};
  const pass = stored.season === BATTLE_PASS_SEASON.id
    ? { ...createDefaultBattlePass(), ...stored }
    : createDefaultBattlePass();
  pass.xp = clampNumber(pass.xp, 0, BATTLE_PASS_SEASON.tiers * BATTLE_PASS_SEASON.tierXp, 0);
  pass.premium = pass.premium === true;
  pass.claimedFree = Array.isArray(pass.claimedFree) ? [...new Set(pass.claimedFree.map(Number).filter(tier => Number.isInteger(tier) && tier >= 1 && tier <= BATTLE_PASS_SEASON.tiers))] : [];
  pass.claimedPremium = Array.isArray(pass.claimedPremium) ? [...new Set(pass.claimedPremium.map(Number).filter(tier => Number.isInteger(tier) && tier >= 1 && tier <= BATTLE_PASS_SEASON.tiers))] : [];
  gameState.battlePass = pass;
  return pass;
}

function addBattlePassXp(amount) {
  if (!gameState || amount <= 0) return;
  const pass = getBattlePassState();
  pass.xp = Math.min(BATTLE_PASS_SEASON.tiers * BATTLE_PASS_SEASON.tierXp, pass.xp + Math.round(amount));
}

function getCaseTicketCount() {
  if (!gameState) return 0;
  gameState.caseTickets = clampNumber(gameState.caseTickets, 0, 999, 0);
  return gameState.caseTickets;
}

function getDateKeyWithOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDateKeyInTimeZone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return getTodayKey();
  }
}

function getHalloweenEventStatus() {
  const date = getDateKeyInTimeZone(HALLOWEEN_EVENT.timeZone);
  const scheduledActive = date >= HALLOWEEN_EVENT.startDate && date <= HALLOWEEN_EVENT.endDate;
  const preview = halloweenAdminPreviewAuthorized && !scheduledActive;
  return { date, active: scheduledActive || preview, scheduledActive, preview, upcoming: date < HALLOWEEN_EVENT.startDate, ended: date > HALLOWEEN_EVENT.endDate };
}

function getWinterEventStatus() {
  const date = getDateKeyInTimeZone(WINTER_EVENT.timeZone);
  const scheduledActive = date >= WINTER_EVENT.startDate && date <= WINTER_EVENT.endDate;
  const preview = winterAdminPreviewAuthorized && !scheduledActive;
  return { date, active: scheduledActive || preview, scheduledActive, preview, upcoming: date < WINTER_EVENT.startDate, ended: date > WINTER_EVENT.endDate };
}

function getSeasonalEventStatus(eventId) {
  if (eventId === HALLOWEEN_EVENT.id) return getHalloweenEventStatus();
  if (eventId === WINTER_EVENT.id) return getWinterEventStatus();
  return { active: false, scheduledActive: false, preview: false, date: getTodayKey() };
}

function getActiveSeason() {
  const winter = getWinterEventStatus();
  if (winter.active) return { id: WINTER_EVENT.id, kind: 'winter', event: WINTER_EVENT, status: winter, copy: WINTER_PAGE_COPY };
  const halloween = getHalloweenEventStatus();
  if (halloween.active) return { id: HALLOWEEN_EVENT.id, kind: 'halloween', event: HALLOWEEN_EVENT, status: halloween, copy: HALLOWEEN_PAGE_COPY };
  return null;
}

function getPageDisplayTitle(id) {
  const standard = {
    hub: 'Ігровий центр', upgrader: 'Апгрейд', case: 'Кейси', battle: 'Бій', royale: 'Battle Royale',
    contract: 'Контракт', tasks: 'Завдання', profile: 'Профіль', stats: 'Статистика', about: 'Про гру'
  };
  const season = getActiveSeason();
  return season ? (season.copy[id]?.title || standard[id] || 'Гра') : (standard[id] || 'Гра');
}

function getActiveBrandName() {
  const season = getActiveSeason();
  if (season?.kind === 'winter') return 'ICEWIRE DROP';
  if (season?.kind === 'halloween') return 'NIGHTFALL DROP';
  return 'ПОТУЖНО DROP';
}

function setSeasonalText(element, seasonalText, active) {
  if (!element || !seasonalText) return;
  const textNode = [...element.childNodes].find(node => node.nodeType === 3 && node.textContent.trim());
  if (!textNode) return;
  if (!Object.prototype.hasOwnProperty.call(element.dataset, 'normalText')) element.dataset.normalText = textNode.textContent.trim();
  textNode.textContent = ` ${active ? seasonalText : element.dataset.normalText}`;
}

function setSeasonalHtml(element, seasonalHtml, active) {
  if (!element || !seasonalHtml) return;
  if (!Object.prototype.hasOwnProperty.call(element.dataset, 'normalHtml')) element.dataset.normalHtml = element.innerHTML;
  element.innerHTML = active ? seasonalHtml : element.dataset.normalHtml;
}

function setSeasonalParagraph(element, seasonalText, active) {
  if (!element || !seasonalText) return;
  if (!Object.prototype.hasOwnProperty.call(element.dataset, 'normalText')) element.dataset.normalText = element.textContent;
  element.textContent = active ? seasonalText : element.dataset.normalText;
}

function applySeasonCopy(copyMap, active) {
  Object.entries(copyMap).forEach(([id, copy]) => {
    document.querySelectorAll(`[data-nav="${id}"], [data-mobile-nav="${id}"]`).forEach(element => setSeasonalText(element, copy.nav, active));
    const section = document.querySelector(`[data-page="${id}"]`);
    const intro = section?.querySelector('.mode-intro');
    if (!intro) return;
    setSeasonalHtml(intro.querySelector('h1'), copy.heading, active);
    setSeasonalText(intro.querySelector('span'), copy.eyebrow, active);
    setSeasonalParagraph(intro.querySelector('p'), copy.description, active);
  });
}

function applyHalloweenSeasonCopy(active) {
  // Restore the inactive season first. Both copy maps touch the same nav and
  // page-intro nodes, so applying the active one last preserves its text.
  if (active?.kind === 'halloween') {
    applySeasonCopy(WINTER_PAGE_COPY, false);
    applySeasonCopy(HALLOWEEN_PAGE_COPY, true);
  } else if (active?.kind === 'winter') {
    applySeasonCopy(HALLOWEEN_PAGE_COPY, false);
    applySeasonCopy(WINTER_PAGE_COPY, true);
  } else {
    applySeasonCopy(HALLOWEEN_PAGE_COPY, false);
    applySeasonCopy(WINTER_PAGE_COPY, false);
  }
  const release = document.getElementById('brandRelease');
  if (release) release.textContent = active?.kind === 'winter' ? 'ZERO HOUR' : active?.kind === 'halloween' ? 'THE 13TH' : 'COLLECTION';
  const brand = document.getElementById('brandName');
  if (brand) brand.textContent = active?.kind === 'winter' ? 'ICEWIRE DROP' : active?.kind === 'halloween' ? 'NIGHTFALL DROP' : 'ПОТУЖНО DROP';
  const riskText = active?.kind === 'winter'
    ? 'ICEWIRE DROP — це тимчасове ігрове перевтілення. Тут немає реальних виграшів, депозитів, трейдів або виведення скінів. Усі предмети та frost credits існують лише у віртуальній грі.'
    : 'NIGHTFALL DROP — це тимчасове ігрове перевтілення. Тут немає реальних виграшів, депозитів, трейдів або виведення скінів. Усі предмети та нічні кредити існують лише у віртуальній грі.';
  setSeasonalParagraph(document.getElementById('brandRiskText'), riskText, Boolean(active));
  const footerHtml = active?.kind === 'winter'
    ? 'ICEWIRE DROP · ZERO HOUR — тимчасова віртуальна зимова подія без реальних грошей, скінів або призів. <a href="#about" onclick="showPage(\'about\');return false" class="text-cyan-300 hover:text-cyan-200">Правила й безпека</a> · <a href="privacy.html" class="text-cyan-300 hover:text-cyan-200">Приватність</a>'
    : 'NIGHTFALL DROP · THE 13TH SIGNAL — тимчасова віртуальна Halloween-подія без реальних грошей, скінів або призів. <a href="#about" onclick="showPage(\'about\');return false" class="text-cyan-300 hover:text-cyan-200">Правила й безпека</a> · <a href="privacy.html" class="text-cyan-300 hover:text-cyan-200">Приватність</a>';
  setSeasonalHtml(document.getElementById('brandFooterText'), footerHtml, Boolean(active));
}

function renderHalloweenSeasonShell() {
  if (!isRuntimeFeatureEnabled('seasonalEvents')) {
    document.body.classList.remove('halloween-season', 'winter-season');
    document.body.dataset.nightfallPhase = '';
    document.body.dataset.icewirePhase = '';
    document.getElementById('seasonSignal')?.classList.add('hidden');
    applyHalloweenSeasonCopy(null);
    return;
  }
  const season = getActiveSeason();
  const status = season?.status;
  document.body.classList.toggle('halloween-season', season?.kind === 'halloween');
  document.body.classList.toggle('winter-season', season?.kind === 'winter');
  applyHalloweenSeasonCopy(season);
  const signal = document.getElementById('seasonSignal');
  const label = document.getElementById('liveFeedLabelText');
  const labelWrap = document.getElementById('liveFeedLabel');
  const active = Boolean(season?.status?.active);
  if (signal) {
    signal.classList.toggle('hidden', !active);
    signal.classList.toggle('is-icewire', season?.kind === 'winter');
    signal.title = season?.kind === 'winter' ? 'Відкрити карту події ICEWIRE' : 'Відкрити карту події Nightfall';
    signal.innerHTML = season?.kind === 'winter'
      ? '<i class="fa-solid fa-map-location-dot"></i><span>КАРТА</span><small>Подія ICEWIRE</small>'
      : '<i class="fa-solid fa-map-location-dot"></i><span>КАРТА</span><small>Подія Nightfall</small>';
  }
  if (label) label.textContent = season?.kind === 'winter' ? 'Aurora signal' : season?.kind === 'halloween' ? 'Nightfall signal' : 'Live skins';
  if (labelWrap) labelWrap.classList.toggle('is-nightfall', season?.kind === 'halloween');
  if (labelWrap) labelWrap.classList.toggle('is-icewire', season?.kind === 'winter');
  document.body.dataset.nightfallPhase = season?.kind === 'halloween' ? String(getPulseCircuitCommunity().phase) : '';
  document.body.dataset.icewirePhase = season?.kind === 'winter' ? String(getIcewireReactorCommunity().phase) : '';
}

async function enableHalloweenAdminPreview() {
  if ((!halloweenAdminPreviewRequested && !winterAdminPreviewRequested) || (halloweenAdminPreviewAuthorized || winterAdminPreviewAuthorized)) return;
  const requestedEvent = winterAdminPreviewRequested ? 'ICEWIRE' : 'Nightfall';
  const clearPreviewParameter = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete(HALLOWEEN_ADMIN_PREVIEW_QUERY);
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  };
  try {
    const response = await fetch('/api/admin/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('admin-session-missing');
    const data = await response.json();
    const roleId = String(data?.me?.role?.id || data?.me?.roleId || data?.me?.role || '');
    const canPreview = data?.gameCapabilities?.configure === true || roleId === 'owner' || roleId === 'full_admin';
    if (!canPreview) throw new Error('admin-role-insufficient');
    if (halloweenAdminPreviewRequested) halloweenAdminPreviewAuthorized = true;
    if (winterAdminPreviewRequested) winterAdminPreviewAuthorized = true;
    clearPreviewParameter();
    renderHalloweenSeasonShell();
    renderGameHub();
    if (currentPage) document.title = `${getPageDisplayTitle(currentPage)} · ${getActiveBrandName()}`;
    showToast(winterAdminPreviewRequested ? 'ICEWIRE відкрито лише для твого приватного перегляду.' : 'Halloween відкрито лише для твого приватного перегляду.', 'info');
  } catch {
    // Do not leave a shareable preview URL behind if the protected check fails.
    clearPreviewParameter();
    showToast(`${requestedEvent} не відкрито: повернись в адмін-панель і онови захищену сесію.`, 'error');
  }
}

function getHalloweenEventState() {
  if (!gameState) return createDefaultHalloweenEvent();
  const stored = gameState.halloweenEvent && typeof gameState.halloweenEvent === 'object' ? gameState.halloweenEvent : {};
  const defaults = createDefaultHalloweenEvent();
  const storedCosmetics = stored.cosmetics && typeof stored.cosmetics === 'object' ? stored.cosmetics : {};
  const normalizeCosmeticIds = (value, kind) => Array.isArray(value)
    ? [...new Set(value.map(String).filter(id => HALLOWEEN_COSMETICS[id]?.kind === kind))]
    : [];
  const titles = normalizeCosmeticIds(storedCosmetics.titles, 'title');
  const frames = normalizeCosmeticIds(storedCosmetics.frames, 'frame');
  const activeTitle = titles.includes(String(storedCosmetics.activeTitle || '')) ? String(storedCosmetics.activeTitle) : '';
  const activeFrame = frames.includes(String(storedCosmetics.activeFrame || '')) ? String(storedCosmetics.activeFrame) : '';
  const state = {
    pumpkins: clampNumber(stored.pumpkins, 0, 999, 0),
    pumpkinCoins: clampNumber(stored.pumpkinCoins, 0, 9_999, 0),
    claimed: Array.isArray(stored.claimed) ? [...new Set(stored.claimed.map(Number).filter(Number.isInteger))] : [],
    dailyDate: /^\d{4}-\d{2}-\d{2}$/.test(String(stored.dailyDate || '')) ? String(stored.dailyDate) : '',
    dailySources: { ...defaults.dailySources, ...(stored.dailySources || {}) },
    treatDate: /^\d{4}-\d{2}-\d{2}$/.test(String(stored.treatDate || '')) ? String(stored.treatDate) : '',
    treatChoice: HALLOWEEN_TREAT_OPTIONS.some(item => item.id === stored.treatChoice) ? stored.treatChoice : '',
    ritualShards: clampNumber(stored.ritualShards, 0, 3, 0),
    riftDate: /^\d{4}-\d{2}-\d{2}$/.test(String(stored.riftDate || '')) ? String(stored.riftDate) : '',
    riftRuns: clampNumber(stored.riftRuns, 0, MIDNIGHT_RIFT_MAX_RUNS, 0),
    riftBest: clampNumber(stored.riftBest, 0, 99, 0),
    purchases: Array.isArray(stored.purchases) ? stored.purchases.map(String).filter(id => HALLOWEEN_SHOP_ITEMS.some(item => item.id === id)).slice(0, 8) : [],
    cosmetics: { titles, frames, activeTitle, activeFrame }
  };
  for (const source of Object.keys(HALLOWEEN_EVENT.dailyCaps)) state.dailySources[source] = clampNumber(state.dailySources[source], 0, HALLOWEEN_EVENT.dailyCaps[source], 0);
  gameState.halloweenEvent = state;
  return state;
}

function getWinterEventState() {
  if (!gameState) return createDefaultWinterEvent();
  const stored = gameState.winterEvent && typeof gameState.winterEvent === 'object' ? gameState.winterEvent : {};
  const defaults = createDefaultWinterEvent();
  const storedCosmetics = stored.cosmetics && typeof stored.cosmetics === 'object' ? stored.cosmetics : {};
  const normalizeCosmeticIds = (value, kind) => Array.isArray(value)
    ? [...new Set(value.map(String).filter(id => WINTER_COSMETICS[id]?.kind === kind))]
    : [];
  const titles = normalizeCosmeticIds(storedCosmetics.titles, 'title');
  const frames = normalizeCosmeticIds(storedCosmetics.frames, 'frame');
  const activeTitle = titles.includes(String(storedCosmetics.activeTitle || '')) ? String(storedCosmetics.activeTitle) : '';
  const activeFrame = frames.includes(String(storedCosmetics.activeFrame || '')) ? String(storedCosmetics.activeFrame) : '';
  const state = {
    shards: clampNumber(stored.shards, 0, 999, 0),
    dailyDate: /^\d{4}-\d{2}-\d{2}$/.test(String(stored.dailyDate || '')) ? String(stored.dailyDate) : '',
    dailySources: { ...defaults.dailySources, ...(stored.dailySources || {}) },
    routeDate: /^\d{4}-\d{2}-\d{2}$/.test(String(stored.routeDate || '')) ? String(stored.routeDate) : '',
    routeRuns: clampNumber(stored.routeRuns, 0, ICEWIRE_ROUTE_MAX_RUNS, 0),
    bestRoute: clampNumber(stored.bestRoute, 0, 99, 0),
    claimed: Array.isArray(stored.claimed) ? [...new Set(stored.claimed.map(Number).filter(Number.isInteger))] : [],
    cosmetics: { titles, frames, activeTitle, activeFrame }
  };
  for (const source of Object.keys(WINTER_EVENT.dailyCaps)) state.dailySources[source] = clampNumber(state.dailySources[source], 0, WINTER_EVENT.dailyCaps[source], 0);
  gameState.winterEvent = state;
  return state;
}

function getSignalSeasonState() {
  if (!gameState) return createDefaultSignalSeason();
  const stored = gameState.signalSeason && typeof gameState.signalSeason === 'object' ? gameState.signalSeason : {};
  const defaults = createDefaultSignalSeason();
  const storedCosmetics = stored.cosmetics && typeof stored.cosmetics === 'object' ? stored.cosmetics : {};
  const idsFor = kind => Array.isArray(storedCosmetics[kind === 'title' ? 'titles' : 'frames'])
    ? [...new Set(storedCosmetics[kind === 'title' ? 'titles' : 'frames'].map(String).filter(id => SIGNAL_SEASON_COSMETICS[id]?.kind === kind))]
    : [];
  const titles = idsFor('title');
  const frames = idsFor('frame');
  const state = {
    claimed: Array.isArray(stored.claimed) ? [...new Set(stored.claimed.map(Number).filter(step => SIGNAL_SEASON.rewardSteps.includes(step)))] : [],
    cosmetics: {
      titles,
      frames,
      activeTitle: titles.includes(String(storedCosmetics.activeTitle || '')) ? String(storedCosmetics.activeTitle) : '',
      activeFrame: frames.includes(String(storedCosmetics.activeFrame || '')) ? String(storedCosmetics.activeFrame) : ''
    },
    moments: Array.isArray(stored.moments) ? stored.moments.filter(moment => moment && typeof moment === 'object').slice(0, 12) : [],
    startedAt: clampNumber(stored.startedAt, 0, Number.MAX_SAFE_INTEGER, defaults.startedAt)
  };
  gameState.signalSeason = state;
  return state;
}

function getSeasonalCosmeticSelection(titles, frames, halloween, winter, signal = getSignalSeasonState()) {
  const stored = gameState?.seasonalCosmetics && typeof gameState.seasonalCosmetics === 'object'
    ? gameState.seasonalCosmetics
    : {};
  const activeSeason = getActiveSeason()?.kind;
  const valid = (id, entries) => entries.some(entry => entry.id === id) ? id : '';
  const legacyChoice = (key, entries) => {
    const preferred = activeSeason === 'winter'
      ? [winter.cosmetics[key], halloween.cosmetics[key], signal.cosmetics[key]]
      : activeSeason === 'halloween'
        ? [halloween.cosmetics[key], winter.cosmetics[key], signal.cosmetics[key]]
        : [signal.cosmetics[key], winter.cosmetics[key], halloween.cosmetics[key]];
    return preferred.map(id => valid(String(id || ''), entries)).find(Boolean) || '';
  };
  const selection = {
    activeTitle: valid(String(stored.activeTitle || ''), titles) || legacyChoice('activeTitle', titles),
    activeFrame: valid(String(stored.activeFrame || ''), frames) || legacyChoice('activeFrame', frames)
  };
  if (gameState) gameState.seasonalCosmetics = selection;
  return selection;
}

function activateSeasonalCosmetic(id, { toggle = false } = {}) {
  const cosmetic = SEASONAL_COSMETICS[id];
  if (!cosmetic || !gameState) return '';
  const halloween = getHalloweenEventState();
  const winter = getWinterEventState();
  const signal = getSignalSeasonState();
  const owner = SIGNAL_SEASON_COSMETICS[id] ? signal : WINTER_COSMETICS[id] ? winter : halloween;
  const collection = cosmetic.kind === 'title' ? owner.cosmetics.titles : owner.cosmetics.frames;
  if (!collection.includes(id)) return '';
  const titles = [...new Set([...halloween.cosmetics.titles, ...winter.cosmetics.titles, ...signal.cosmetics.titles])].map(entry => SEASONAL_COSMETICS[entry]).filter(Boolean);
  const frames = [...new Set([...halloween.cosmetics.frames, ...winter.cosmetics.frames, ...signal.cosmetics.frames])].map(entry => SEASONAL_COSMETICS[entry]).filter(Boolean);
  const selection = getSeasonalCosmeticSelection(titles, frames, halloween, winter, signal);
  const key = cosmetic.kind === 'title' ? 'activeTitle' : 'activeFrame';
  const next = toggle && selection[key] === id ? '' : id;
  selection[key] = next;
  halloween.cosmetics[key] = '';
  winter.cosmetics[key] = '';
  signal.cosmetics[key] = '';
  if (next) owner.cosmetics[key] = next;
  gameState.seasonalCosmetics = selection;
  return next;
}

function awardHalloweenPumpkins(source, amount = 1) {
  const status = getHalloweenEventStatus();
  if (!status.scheduledActive || !Object.prototype.hasOwnProperty.call(HALLOWEEN_EVENT.dailyCaps, source)) return 0;
  const state = getHalloweenEventState();
  if (state.dailyDate !== status.date) {
    state.dailyDate = status.date;
    state.dailySources = { case: 0, battle: 0, arena: 0 };
  }
  const available = Math.max(0, HALLOWEEN_EVENT.dailyCaps[source] - state.dailySources[source]);
  const granted = Math.min(Math.max(0, Math.floor(amount)), available);
  if (!granted) return 0;
  state.dailySources[source] += granted;
  state.pumpkins += granted;
  return granted;
}

function awardHalloweenProgress(source, amount = 1) {
  const pumpkins = awardHalloweenPumpkins(source, amount);
  if (!pumpkins) return { pumpkins: 0, coins: 0 };
  const state = getHalloweenEventState();
  const coins = Math.max(0, Math.round(Number(HALLOWEEN_COIN_REWARDS[source]) || 0)) * pumpkins;
  state.pumpkinCoins = clampNumber(state.pumpkinCoins + coins, 0, 9_999, 0);
  return { pumpkins, coins };
}

function awardWinterShards(source, amount = 1) {
  const status = getWinterEventStatus();
  if (!status.scheduledActive || !Object.prototype.hasOwnProperty.call(WINTER_EVENT.dailyCaps, source)) return 0;
  const state = getWinterEventState();
  if (state.dailyDate !== status.date) {
    state.dailyDate = status.date;
    state.dailySources = { case: 0, battle: 0, arena: 0 };
  }
  const available = Math.max(0, WINTER_EVENT.dailyCaps[source] - state.dailySources[source]);
  const granted = Math.min(Math.max(0, Math.floor(amount)), available);
  if (!granted) return 0;
  state.dailySources[source] += granted;
  state.shards = clampNumber(state.shards + granted, 0, 999, 0);
  if (state.shards >= 13 && !state.cosmetics.titles.includes('icewire_survivor_2026')) {
    state.cosmetics.titles.push('icewire_survivor_2026');
    activateSeasonalCosmetic('icewire_survivor_2026');
  }
  return granted;
}

function getHalloweenCosmetics() {
  const state = getHalloweenEventState();
  const winter = getWinterEventState();
  const signal = getSignalSeasonState();
  const titles = [...new Set([...state.cosmetics.titles, ...winter.cosmetics.titles, ...signal.cosmetics.titles])].map(id => SEASONAL_COSMETICS[id]).filter(Boolean);
  const frames = [...new Set([...state.cosmetics.frames, ...winter.cosmetics.frames, ...signal.cosmetics.frames])].map(id => SEASONAL_COSMETICS[id]).filter(Boolean);
  const selection = getSeasonalCosmeticSelection(titles, frames, state, winter, signal);
  const activeTitle = SEASONAL_COSMETICS[selection.activeTitle] || null;
  const activeFrame = SEASONAL_COSMETICS[selection.activeFrame] || null;
  return { state, winter, signal, selection, activeTitle, activeFrame, titles, frames };
}

function getProfileAvatarPreviewSource() {
  const profile = currentUser?.steamProfile || account?.steamProfile;
  return cleanImageUrl(currentUser?.avatar || profile?.avatar) || createSteamAvatarFallback(currentUser?.name || account?.nick || 'Гравець');
}

function getFramePresentationClass(frame) {
  if (!frame) return '';
  if (SIGNAL_SEASON_COSMETICS[frame.id]) return 'is-signal-frame';
  return WINTER_COSMETICS[frame.id] ? 'is-winter-frame' : 'is-halloween-frame';
}

function renderProfileFramePresentation(cosmetics = getHalloweenCosmetics()) {
  const signalForge = getPulseCircuitState().badgeUnlocked === true && !cosmetics.activeFrame;
  const frameClass = getFramePresentationClass(cosmetics.activeFrame);
  const targets = [
    document.querySelector('.profile-portrait'),
    document.getElementById('headerAvatarShell'),
    document.getElementById('profileSteamAvatarShell')
  ].filter(Boolean);
  targets.forEach(target => {
    target.classList.toggle('is-halloween-frame', frameClass === 'is-halloween-frame');
    target.classList.toggle('is-winter-frame', frameClass === 'is-winter-frame');
    target.classList.toggle('is-signal-frame', frameClass === 'is-signal-frame');
    target.classList.toggle('is-signal-forge-frame', signalForge);
    if (cosmetics.activeFrame) target.dataset.frameName = cosmetics.activeFrame.title;
    else delete target.dataset.frameName;
  });
  return { signalForge, frameClass };
}

function renderProfileCosmeticsSummary() {
  const button = document.getElementById('profileCosmeticsButton');
  const label = document.getElementById('profileCosmeticsLabel');
  if (!button || !label) return;
  const cosmetics = getHalloweenCosmetics();
  const winterFrame = Boolean(cosmetics.activeFrame && WINTER_COSMETICS[cosmetics.activeFrame.id]);
  const signalFrame = Boolean(cosmetics.activeFrame && SIGNAL_SEASON_COSMETICS[cosmetics.activeFrame.id]);
  button.classList.toggle('has-frame', Boolean(cosmetics.activeFrame));
  button.classList.toggle('is-winter', winterFrame);
  button.classList.toggle('is-signal', signalFrame);
  button.classList.remove('hidden');
  label.textContent = cosmetics.activeTitle?.title || cosmetics.activeFrame?.title || getProfileStyleDefinition().title;
  renderProfileFramePresentation(cosmetics);
  renderProfileStyleSummary();
  renderProfileStylePreview(cosmetics);
}

function renderProfileStylePreview(cosmetics = getHalloweenCosmetics()) {
  const root = document.getElementById('profileStylePreview');
  if (!root) return;
  const style = getProfileStyleDefinition();
  const title = cosmetics.activeTitle?.title || 'Титул ще не обрано';
  const frame = cosmetics.activeFrame?.title || 'Рамка ще не обрана';
  const unlockedStyles = PROFILE_STYLE_DEFINITIONS.filter(isProfileStyleUnlocked).length;
  root.innerHTML = `<div class="profile-style-preview-main"><span class="profile-style-preview-icon"><i class="fa-solid ${escapeHtml(style.icon)}"></i></span><div><strong>${escapeHtml(style.title)}</strong><p>${escapeHtml(style.note)}</p></div></div><div class="profile-style-preview-stats"><span><i class="fa-solid fa-id-badge"></i>${escapeHtml(title)}</span><span><i class="fa-solid fa-border-all"></i>${escapeHtml(frame)}</span><span><i class="fa-solid fa-unlock"></i>${unlockedStyles} / ${PROFILE_STYLE_DEFINITIONS.length} стилів</span></div>`;
}

function renderSignalForgeProfile() {
  const state = getPulseCircuitState();
  const badge = document.getElementById('profileSignalForgeBadge');
  if (badge) {
    badge.classList.toggle('hidden', !state.badgeUnlocked);
    badge.title = state.badgeUnlocked ? `Signal Forge · ${state.completed} маршрут(ів) Nightfall` : '';
  }
  renderProfileFramePresentation();
}

function renderProfileCosmeticsModal() {
  const content = document.getElementById('profileCosmeticsContent');
  if (!content) return;
  const cosmetics = getHalloweenCosmetics();
  const activeStyle = getProfileStyleDefinition();
  const avatarPreview = getProfileAvatarPreviewSource();
  const renderGroup = (entries, activeId, kind, empty) => entries.length
    ? entries.map(entry => {
      const framePreview = kind === 'frame'
        ? `<span class="cosmetic-frame-preview ${getFramePresentationClass(entry)}"><img src="${escapeHtml(avatarPreview)}" alt="Твій Steam-аватар" onerror="handleSteamAvatarError(this)"></span>`
        : `<i class="fa-solid ${entry.icon}"></i>`;
      const note = kind === 'frame' ? `${entry.note} · видно на Steam-аватарі` : entry.note;
      return `<button type="button" class="halloween-cosmetic-choice ${entry.id === activeId ? 'is-active' : ''}" data-halloween-equip="${entry.id}">${framePreview}<span><b>${escapeHtml(entry.title)}</b><small>${escapeHtml(note)}</small></span><em>${entry.id === activeId ? 'Активно' : 'Обрати'}</em></button>`;
    }).join('')
    : `<p class="halloween-cosmetic-empty"><i class="fa-solid ${kind === 'title' ? 'fa-crosshairs' : 'fa-ghost'}"></i>${empty}</p>`;
  const styles = PROFILE_STYLE_DEFINITIONS.map(style => {
    const unlocked = isProfileStyleUnlocked(style);
    const active = style.id === activeStyle.id;
    return `<button type="button" class="profile-style-choice profile-style-choice-${style.id} ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}" ${unlocked ? `data-profile-style="${style.id}"` : 'disabled'}><i class="fa-solid ${style.icon}"></i><span><b>${escapeHtml(style.title)}</b><small>${escapeHtml(style.note)}</small></span><em>${active ? 'Активно' : unlocked ? 'Обрати' : 'Заблоковано'}</em></button>`;
  }).join('');
  content.innerHTML = `<div class="halloween-cosmetics-heading"><p>ПРОФІЛЬ · ОФОРМЛЕННЯ</p><h3>СТИЛЬ, ТИТУЛ І РАМКА</h3><span>Стилі відкриваються лише за прогрес. Вони не дають PC, шансів або переваги в грі.</span></div><section class="halloween-cosmetic-group"><h4><i class="fa-solid fa-palette"></i> Стиль профілю</h4><div class="profile-style-choice-grid">${styles}</div></section><section class="halloween-cosmetic-group"><h4><i class="fa-solid fa-id-badge"></i> Сезонні титули</h4>${renderGroup(cosmetics.titles, cosmetics.activeTitle?.id, 'title', 'Отримай титули у сезонних подіях.')}</section><section class="halloween-cosmetic-group"><h4><i class="fa-solid fa-border-all"></i> Сезонні рамки</h4>${renderGroup(cosmetics.frames, cosmetics.activeFrame?.id, 'frame', 'Рамки з’являються у сезонних подіях.')}</section>`;
  content.querySelectorAll('[data-halloween-equip]').forEach(button => button.addEventListener('click', () => setHalloweenCosmetic(button.dataset.halloweenEquip)));
  content.querySelectorAll('[data-profile-style]').forEach(button => button.addEventListener('click', () => setProfileStyle(button.dataset.profileStyle)));
}

function openProfileCosmeticsModal() {
  renderProfileCosmeticsModal();
  openModal('profileCosmeticsModal');
}

function setProfileStyle(styleId) {
  const style = getProfileStyleDefinition(styleId);
  if (!isProfileStyleUnlocked(style)) {
    showToast(`Ще не відкрито: ${style.note}.`, 'info');
    return;
  }
  gameState.profileStyle = style.id;
  saveState();
  renderProfileCosmeticsSummary();
  renderProfileCosmeticsModal();
  showToast(`Стиль «${style.title}» активовано.`, 'success');
}

function setHalloweenCosmetic(id) {
  const cosmetic = SEASONAL_COSMETICS[id];
  if (!cosmetic) return;
  const state = SIGNAL_SEASON_COSMETICS[id] ? getSignalSeasonState() : WINTER_COSMETICS[id] ? getWinterEventState() : getHalloweenEventState();
  const collection = cosmetic.kind === 'title' ? state.cosmetics.titles : state.cosmetics.frames;
  if (!collection.includes(id)) return;
  const activeId = activateSeasonalCosmetic(id, { toggle: true });
  saveState();
  renderProfileCosmeticsSummary();
  renderProfileCosmeticsModal();
  showToast(activeId ? 'Косметику активовано в профілі.' : 'Косметику вимкнено в профілі.', 'success');
}

function getHalloweenPurchaseCount(state, itemId) {
  return state.purchases.filter(id => id === itemId).length;
}

function renderHalloweenShop(state, status) {
  const items = HALLOWEEN_SHOP_ITEMS.map(item => {
    const bought = getHalloweenPurchaseCount(state, item.id);
    const soldOut = bought >= item.limit;
    const canBuy = status.scheduledActive && !soldOut && state.pumpkinCoins >= item.cost;
    const action = status.preview ? 'Лише перегляд' : soldOut ? 'Вже є' : state.pumpkinCoins < item.cost ? `Ще ${item.cost - state.pumpkinCoins} 🪙` : 'Взяти';
    return `<button type="button" class="halloween-shop-item ${soldOut ? 'is-owned' : ''}" ${canBuy ? `data-halloween-buy="${item.id}"` : 'disabled'}><i class="fa-solid ${item.icon}"></i><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.note)}</small></span><em>${soldOut ? '✓' : `${item.cost} 🪙`}</em><strong>${action}</strong></button>`;
  }).join('');
  return `<div class="halloween-shop" aria-label="Нічна крамниця"><div class="halloween-shop-heading"><div><i class="fa-solid fa-store"></i><b>НІЧНА КРАМНИЦЯ</b><span>Нагороди прив’язані до профілю назавжди</span></div><strong>${state.pumpkinCoins} 🪙</strong></div><div class="halloween-shop-list">${items}</div></div>`;
}

function renderHalloweenTreat(state, status) {
  const todayClaimed = state.treatDate === status.date;
  const options = HALLOWEEN_TREAT_OPTIONS.map(option => {
    const isSelected = todayClaimed && state.treatChoice === option.id;
    const ready = status.scheduledActive && !todayClaimed && state.pumpkinCoins >= HALLOWEEN_TREAT_COST;
    return `<button type="button" class="halloween-treat-option ${isSelected ? 'is-selected' : ''}" ${ready ? `data-halloween-treat="${option.id}"` : 'disabled'}><i class="fa-solid ${option.icon}"></i><b>${escapeHtml(option.title)}</b><small>${escapeHtml(option.note)}</small>${isSelected ? '<em>Забрано</em>' : ''}</button>`;
  }).join('');
  const ritual = state.cosmetics.titles.includes('midnight_keeper_2026')
    ? 'Титул «Сторож опівночі» вже у колекції'
    : `Ритуал: ${state.ritualShards} / 3 уламки`;
  return `<div class="halloween-treat" aria-label="Trick or Treat"><div class="halloween-treat-heading"><div><i class="fa-solid fa-candy-cane"></i><b>TRICK OR TREAT</b><span>${todayClaimed ? 'Твій вибір на сьогодні вже зроблено' : `Обери одну чесну нагороду за ${HALLOWEEN_TREAT_COST} 🪙`}</span></div><em>${ritual}</em></div><div class="halloween-treat-options">${options}</div></div>`;
}

function renderHalloweenEvent() {
  const root = document.getElementById('halloweenEvent');
  if (!root) return;
  const status = getHalloweenEventStatus();
  if (!status.active || !gameState) {
    root.innerHTML = '';
    return;
  }
  const state = getHalloweenEventState();
  const progress = Math.min(13, state.pumpkins);
  const sourceLabel = (source, label) => `${label} ${state.dailySources[source]} / ${HALLOWEEN_EVENT.dailyCaps[source]}`;
  const rewards = HALLOWEEN_REWARDS.map(reward => {
    const claimed = state.claimed.includes(reward.pumpkins);
    const ready = state.pumpkins >= reward.pumpkins && !claimed && !status.preview;
    const statusText = status.preview ? 'Лише перегляд' : claimed ? 'Забрано' : ready ? 'Забрати' : `${reward.pumpkins} 🎃`;
    return `<button type="button" class="halloween-reward ${claimed ? 'is-claimed' : ready ? 'is-ready' : ''}" ${ready ? `data-halloween-claim="${reward.pumpkins}"` : 'disabled'}><span>${reward.pumpkins} 🎃</span><i class="fa-solid ${reward.icon}"></i><b>${escapeHtml(reward.title)}</b><em>${statusText}</em></button>`;
  }).join('');
  const previewNotice = status.preview ? '<div class="halloween-preview-notice"><i class="fa-solid fa-eye"></i> ПРИВАТНИЙ ПЕРЕГЛЯД АДМІНА · ГРАВЦЯМ ПОДІЯ ДОСІ НЕДОСТУПНА</div>' : '';
  const shopToggle = `<button type="button" class="halloween-utility-button" data-halloween-shop-toggle><i class="fa-solid fa-store"></i>${halloweenShopExpanded ? 'Сховати крамницю' : 'Нічна крамниця'} <b>${state.pumpkinCoins} 🪙</b></button>`;
  const treatToggle = `<button type="button" class="halloween-utility-button" data-halloween-treat-toggle><i class="fa-solid fa-candy-cane"></i>${halloweenTreatExpanded ? 'Сховати Trick or Treat' : 'Trick or Treat'} <b>${state.treatDate === status.date ? '✓ сьогодні' : `${HALLOWEEN_TREAT_COST} 🪙`}</b></button>`;
  root.innerHTML = `<article class="halloween-event-card ${status.preview ? 'is-admin-preview' : ''}" aria-label="Nightfall Drop: The 13th Signal"><div class="halloween-event-top"><div class="halloween-pumpkin">🎃</div><div><p>18 ЖОВТНЯ — 3 ЛИСТОПАДА · КИЇВ</p><h2>NIGHTFALL DROP <small>· THE 13TH SIGNAL</small></h2><span>Місто відповідає на сигнал: гарбузи — прогрес, а нічні монетки — валюта крамниці.</span></div><div class="halloween-progress"><span>${progress} / 13 🎃</span><div><i style="width:${Math.round((progress / 13) * 100)}%"></i></div><small>До ${Object.values(HALLOWEEN_EVENT.dailyCaps).reduce((sum, cap) => sum + cap, 0)} 🎃 / день</small></div></div>${previewNotice}<div class="halloween-event-body"><div id="pulseCircuit" class="halloween-nightfall-slot" aria-live="polite"></div><div class="halloween-sources"><span>${sourceLabel('case', 'Кейси')} · +${HALLOWEEN_COIN_REWARDS.case} 🪙</span><span>${sourceLabel('battle', 'Перемога в бою')} · +${HALLOWEEN_COIN_REWARDS.battle} 🪙</span><span>${sourceLabel('arena', 'Тир 13+')} · +${HALLOWEEN_COIN_REWARDS.arena} 🪙</span></div><div class="halloween-rewards">${rewards}</div><div class="halloween-utility-row">${shopToggle}${treatToggle}</div>${halloweenShopExpanded ? renderHalloweenShop(state, status) : ''}${halloweenTreatExpanded ? renderHalloweenTreat(state, status) : ''}</div></article>`;
  root.querySelectorAll('[data-halloween-claim]').forEach(button => button.addEventListener('click', () => claimHalloweenReward(Number(button.dataset.halloweenClaim))));
  root.querySelector('[data-halloween-shop-toggle]')?.addEventListener('click', () => {
    halloweenShopExpanded = !halloweenShopExpanded;
    renderHalloweenEvent();
  });
  root.querySelector('[data-halloween-treat-toggle]')?.addEventListener('click', () => {
    halloweenTreatExpanded = !halloweenTreatExpanded;
    renderHalloweenEvent();
  });
  root.querySelectorAll('[data-halloween-buy]').forEach(button => button.addEventListener('click', () => buyHalloweenShopItem(button.dataset.halloweenBuy)));
  root.querySelectorAll('[data-halloween-treat]').forEach(button => button.addEventListener('click', () => chooseHalloweenTreat(button.dataset.halloweenTreat)));
  root.querySelector('#pulseCircuit')?.insertAdjacentHTML('afterend', '<section id="midnightRift" class="halloween-rift-slot" aria-live="polite"></section>');
  renderPulseCircuit();
  renderMidnightRift();
}

function getIcewireReactorCommunity() {
  const shared = getMidnightRiftCommunity();
  const charge = Math.max(0, shared.maxHealth - shared.health);
  const phase = Math.min(4, Math.floor((charge / Math.max(1, shared.maxHealth)) * 4) + 1);
  return { ...shared, charge, phase, complete: shared.health <= 0 };
}

function renderWinterEvent() {
  const root = document.getElementById('halloweenEvent');
  if (!root) return;
  const status = getWinterEventStatus();
  if (!status.active || !gameState) {
    root.innerHTML = '';
    return;
  }
  const state = getWinterEventState();
  const reactor = getIcewireReactorCommunity();
  const runs = state.routeDate === status.date ? state.routeRuns : 0;
  const chargePercent = Math.min(100, Math.round((reactor.charge / reactor.maxHealth) * 100));
  const source = (key, label) => `${label} ${state.dailySources[key]} / ${WINTER_EVENT.dailyCaps[key]}`;
  const recent = reactor.recent.length
    ? reactor.recent.map(entry => `<span><i class="fa-solid fa-snowflake"></i>${escapeHtml(cleanText(entry?.name, 20) || 'Експедитор')} <b>+${clampNumber(entry?.damage, 0, 99, 0)}</b></span>`).join('')
    : '<span class="is-empty">Станція чекає на перший сигнал.</span>';
  const rewardTitle = state.cosmetics.titles.includes('icewire_survivor_2026') ? 'Титул «Той, хто пережив заметіль» у колекції' : `${state.shards} / 13 Frost Shards до постійного титулу`;
  const routeDisabled = status.preview || !status.scheduledActive || reactor.complete || runs >= ICEWIRE_ROUTE_MAX_RUNS;
  const routeAction = status.preview ? 'Лише перегляд' : reactor.complete ? 'Ядро заряджено до завтра' : runs >= ICEWIRE_ROUTE_MAX_RUNS ? 'Маршрути на сьогодні завершено' : 'Провести сигнал';
  const previewNotice = status.preview ? '<div class="icewire-preview-notice"><i class="fa-solid fa-eye"></i> ПРИВАТНИЙ ПЕРЕГЛЯД АДМІНА · ГРАВЦЯМ ICEWIRE ЩЕ НЕ ВИДНО</div>' : '';
  root.innerHTML = `<article class="icewire-event-card ${status.preview ? 'is-admin-preview' : ''}" aria-label="ICEWIRE: Zero Hour"><div class="icewire-art" aria-hidden="true"></div><div class="icewire-shade" aria-hidden="true"></div><header class="icewire-event-head"><div class="icewire-mark"><i class="fa-solid fa-snowflake"></i></div><div><p>12 ГРУДНЯ 2026 — 17 СІЧНЯ 2027 · КИЇВ</p><h2>ICEWIRE <small>· ZERO HOUR</small></h2><span>Полярна станція прокинулась. Заряджай Ядро разом із усіма експедиторами.</span></div><div class="icewire-route-count"><span>ТВОЇ МАРШРУТИ</span><strong>${runs}<small> / ${ICEWIRE_ROUTE_MAX_RUNS}</small></strong><em>кращий: ${state.bestRoute} сигналів</em></div></header>${previewNotice}<div class="icewire-event-body"><section class="icewire-reactor"><div class="icewire-reactor-copy"><p><i class="fa-solid fa-satellite-dish"></i> СПІЛЬНИЙ РЕАКТОР</p><h3>${reactor.complete ? 'AURORA ONLINE' : 'ЯДРО ПОЛЯРНОГО СЯЙВА'}</h3><span>${reactor.complete ? 'Місто пережило бурю. Нова зарядка з’явиться завтра.' : 'Кожен успішний маршрут дає справжній внесок у спільний заряд.'}</span></div><div class="icewire-reactor-meter"><div><b>${reactor.charge.toLocaleString('uk-UA')} <small>/ ${reactor.maxHealth.toLocaleString('uk-UA')}</small></b><span>ЕНЕРГІЇ</span></div><div class="icewire-reactor-track"><i style="width:${chargePercent}%"></i></div><em>Фаза ${reactor.phase} · ${chargePercent}% заряджено</em></div><div class="icewire-recent"><b><i class="fa-solid fa-tower-broadcast"></i> СВІЖІ СИГНАЛИ</b>${recent}</div></section><section class="icewire-sectors" aria-label="Райони станції"><button type="button" data-icewire-go="case"><i class="fa-solid fa-box-open"></i><span>КРИЖАНИЙ ДОК</span><small>${source('case', 'Контейнери')}</small></button><button type="button" data-icewire-go="battle"><i class="fa-solid fa-mountain"></i><span>ЧОРНИЙ ЛІД</span><small>${source('battle', 'Дуелі')}</small></button><button type="button" data-icewire-go="tasks"><i class="fa-solid fa-compass"></i><span>СТАНЦІЯ НУЛЬ</span><small>${source('arena', 'Тир 13+')}</small></button></section><section class="icewire-route-game" id="icewireRouteGame"><div class="icewire-route-copy"><i class="fa-solid fa-route"></i><div><p>МІНІГРА · СЛІД У ЗАМЕТІЛІ</p><h3>Запам’ятай маршрут, поки його не сховала буря.</h3><span>20 секунд. Кожна правильно проведена ділянка заряджає Ядро.</span></div></div><button type="button" class="icewire-route-start" data-icewire-start ${routeDisabled ? 'disabled' : ''}><i class="fa-solid fa-play"></i>${routeAction}<small>${status.preview ? 'Нагороди та заряд вимкнені' : 'Frost Shards + XP + внесок у реактор'}</small></button></section><footer class="icewire-event-foot"><div><i class="fa-solid fa-gem"></i><b>FROST SHARDS</b><strong>${state.shards}</strong><span>${rewardTitle}</span></div><p><i class="fa-solid fa-shield-heart"></i> ICEWIRE — кооперативна віртуальна подія без реальних ставок та призів.</p></footer></div></article>`;
  root.querySelectorAll('[data-icewire-go]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.icewireGo)));
  root.querySelector('[data-icewire-start]')?.addEventListener('click', startIcewireRoute);
}

function startIcewireRoute() {
  const status = getWinterEventStatus();
  const state = getWinterEventState();
  const reactor = getIcewireReactorCommunity();
  const runs = state.routeDate === status.date ? state.routeRuns : 0;
  if (!status.scheduledActive || icewireRouteRun?.active || reactor.complete || runs >= ICEWIRE_ROUTE_MAX_RUNS) return;
  if (state.routeDate !== status.date) {
    state.routeDate = status.date;
    state.routeRuns = 0;
  }
  const stage = document.getElementById('icewireRouteGame');
  if (!stage) return;
  const run = { active: true, score: 0, position: 0, sequence: [], startedAt: Date.now(), interval: null, timeout: null, revealTimer: null };
  icewireRouteRun = run;
  stage.innerHTML = `<div class="icewire-route-hud"><span>БУРЯ <b id="icewireTime">20.0</b></span><span>СИГНАЛИ <b id="icewireScore">0</b></span></div><p id="icewireRouteHint" class="icewire-route-hint">Запам’ятай траєкторію…</p><div class="icewire-route-grid">${['fa-arrow-up', 'fa-arrow-right', 'fa-arrow-down', 'fa-arrow-left'].map((icon, index) => `<button type="button" class="icewire-route-node" data-icewire-node="${index}" disabled aria-label="Ділянка маршруту ${index + 1}"><i class="fa-solid ${icon}"></i></button>`).join('')}</div>`;
  const time = document.getElementById('icewireTime');
  const score = document.getElementById('icewireScore');
  const hint = document.getElementById('icewireRouteHint');
  const nodes = [...stage.querySelectorAll('[data-icewire-node]')];
  const nextRoute = () => {
    run.position = 0;
    run.sequence.push(Math.floor(Math.random() * nodes.length));
    nodes.forEach(node => { node.disabled = true; node.classList.remove('is-lit', 'is-wrong'); });
    if (hint) hint.textContent = 'Запам’ятай траєкторію…';
    let step = 0;
    run.revealTimer = window.setInterval(() => {
      nodes.forEach(node => node.classList.remove('is-lit'));
      if (step >= run.sequence.length) {
        window.clearInterval(run.revealTimer);
        run.revealTimer = null;
        nodes.forEach(node => { node.disabled = false; });
        if (hint) hint.textContent = 'Проведи сигнал крізь заметіль.';
        return;
      }
      nodes[run.sequence[step]]?.classList.add('is-lit');
      step += 1;
    }, 420);
  };
  nodes.forEach(node => node.addEventListener('click', () => {
    if (!run.active || run.revealTimer) return;
    const nodeId = Number(node.dataset.icewireNode);
    const expected = run.sequence[run.position];
    if (nodeId !== expected) {
      node.classList.add('is-wrong');
      run.score = Math.max(0, run.score - 1);
      if (score) score.textContent = String(run.score);
      return;
    }
    run.position += 1;
    node.classList.add('is-lit');
    if (run.position < run.sequence.length) return;
    run.score += run.sequence.length;
    if (score) score.textContent = String(run.score);
    nextRoute();
  }));
  nextRoute();
  const finish = () => finishIcewireRoute(run);
  run.interval = window.setInterval(() => {
    const left = Math.max(0, ICEWIRE_ROUTE_RUN_MS - (Date.now() - run.startedAt));
    if (time) time.textContent = (left / 1000).toFixed(1);
    if (!left) finish();
  }, 80);
  run.timeout = window.setTimeout(finish, ICEWIRE_ROUTE_RUN_MS + 60);
}

function finishIcewireRoute(run) {
  if (!run?.active || icewireRouteRun !== run) return;
  run.active = false;
  window.clearInterval(run.interval);
  window.clearTimeout(run.timeout);
  if (run.revealTimer) window.clearInterval(run.revealTimer);
  icewireRouteRun = null;
  const status = getWinterEventStatus();
  const state = getWinterEventState();
  const score = clampNumber(run.score, 0, 99, 0);
  const energy = clampNumber(16 + score * 5, 16, 90, 16);
  state.routeDate = status.date;
  state.routeRuns = clampNumber(state.routeRuns + 1, 0, ICEWIRE_ROUTE_MAX_RUNS, 0);
  state.bestRoute = Math.max(state.bestRoute, score);
  state.shards = clampNumber(state.shards + Math.max(1, Math.min(7, Math.floor(score / 3) + 1)), 0, 999, 0);
  if (score >= 12 && !state.cosmetics.titles.includes('aurora_conductor_2026')) {
    state.cosmetics.titles.push('aurora_conductor_2026');
    activateSeasonalCosmetic('aurora_conductor_2026');
  }
  if (state.shards >= 24 && !state.cosmetics.frames.includes('aurora_frame_2026')) {
    state.cosmetics.frames.push('aurora_frame_2026');
    activateSeasonalCosmetic('aurora_frame_2026');
  }
  addXp(18 + score * 3);
  saveState();
  updateBalanceUI();
  renderProfileCosmeticsSummary();
  renderWinterEvent();
  void syncCommunity(null, null, { id: makeUuid(), damage: energy });
  soundWin();
  showToast(`ICEWIRE: ${score} сигналів · +${energy} до Ядра · Frost Shards додано.`, score >= 12 ? 'success' : 'info');
}

function renderSeasonalEvent() {
  if (!isRuntimeFeatureEnabled('seasonalEvents')) {
    document.getElementById('halloweenEvent')?.replaceChildren();
    document.getElementById('winterEvent')?.replaceChildren();
    return;
  }
  const season = getActiveSeason();
  if (season?.kind === 'winter') return renderWinterEvent();
  if (season?.kind === 'halloween') return renderHalloweenEvent();
  const root = document.getElementById('halloweenEvent');
  if (root) root.innerHTML = '';
}

function claimHalloweenReward(pumpkins) {
  const status = getHalloweenEventStatus();
  const state = getHalloweenEventState();
  const reward = HALLOWEEN_REWARDS.find(item => item.pumpkins === pumpkins);
  if (!status.scheduledActive || !reward || state.claimed.includes(pumpkins) || state.pumpkins < pumpkins || !currentUser) return;
  if (reward.type === 'credits') currentUser.balance = clampNumber(currentUser.balance + reward.amount, 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE);
  if (reward.type === 'ticket') gameState.caseTickets = getCaseTicketCount() + reward.amount;
  if (reward.type === 'skin') {
    const skin = CS2_SKINS.find(item => item.name === reward.skinName);
    if (!skin) {
      showToast('Halloween skin ще завантажується. Спробуй за мить.', 'warn');
      return;
    }
    const item = makeDemoItem({ ...skin, accountBound: true, halloweenEvent: true }, `-${HALLOWEEN_EVENT.id}`);
    userInventory.push(item);
    renderInventoryGrid();
    renderProfileInventory();
  }
  state.claimed.push(pumpkins);
  saveState();
  updateBalanceUI();
  renderHalloweenEvent();
  soundWin();
  showToast(`Halloween: нагороду «${reward.title}» додано.`, 'success');
}

function buyHalloweenShopItem(itemId) {
  const status = getHalloweenEventStatus();
  const item = HALLOWEEN_SHOP_ITEMS.find(entry => entry.id === itemId);
  const state = getHalloweenEventState();
  if (!status.scheduledActive || !item || !currentUser) return;
  if (getHalloweenPurchaseCount(state, item.id) >= item.limit) {
    showToast('Ця нагорода вже є у твоїй колекції.', 'info');
    return;
  }
  if (state.pumpkinCoins < item.cost) {
    showToast(`Потрібно ще ${item.cost - state.pumpkinCoins} гарбузових монеток.`, 'warn');
    return;
  }
  state.pumpkinCoins -= item.cost;
  state.purchases.push(item.id);
  if (item.kind === 'ticket') gameState.caseTickets = getCaseTicketCount() + 1;
  if (item.kind === 'cosmetic') {
    const cosmetic = HALLOWEEN_COSMETICS[item.id];
    if (cosmetic.kind === 'title') {
      state.cosmetics.titles.push(cosmetic.id);
    } else {
      state.cosmetics.frames.push(cosmetic.id);
    }
    activateSeasonalCosmetic(cosmetic.id);
  }
  saveState();
  updateCaseTicketOption();
  renderGameHub();
  soundWin();
  showToast(`Нічна крамниця: «${item.title}» додано.`, 'success');
}

function chooseHalloweenTreat(optionId) {
  const status = getHalloweenEventStatus();
  const option = HALLOWEEN_TREAT_OPTIONS.find(entry => entry.id === optionId);
  const state = getHalloweenEventState();
  if (!status.scheduledActive || !option || !currentUser) return;
  if (state.treatDate === status.date) {
    showToast('Trick or Treat уже забрано сьогодні.', 'info');
    return;
  }
  if (state.pumpkinCoins < HALLOWEEN_TREAT_COST) {
    showToast(`Для Trick or Treat потрібно ${HALLOWEEN_TREAT_COST} гарбузові монетки.`, 'warn');
    return;
  }
  state.pumpkinCoins -= HALLOWEEN_TREAT_COST;
  state.treatDate = status.date;
  state.treatChoice = option.id;
  if (option.credits) currentUser.balance = clampNumber(currentUser.balance + option.credits, 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE);
  if (option.tickets) gameState.caseTickets = getCaseTicketCount() + option.tickets;
  if (option.shard) {
    state.ritualShards = Math.min(3, state.ritualShards + option.shard);
    if (state.ritualShards >= 3 && !state.cosmetics.titles.includes('midnight_keeper_2026')) {
      state.cosmetics.titles.push('midnight_keeper_2026');
      activateSeasonalCosmetic('midnight_keeper_2026');
      showToast('Ритуал завершено: титул «Сторож опівночі» назавжди твій.', 'success');
    }
  }
  saveState();
  updateBalanceUI();
  updateCaseTicketOption();
  renderGameHub();
  soundCoin();
  showToast(`Trick or Treat: «${option.title}» додано.`, 'success');
}

function getPulseCircuitState() {
  if (!gameState) return createDefaultPulseCircuit();
  const stored = gameState.pulseCircuit && typeof gameState.pulseCircuit === 'object' ? gameState.pulseCircuit : {};
  const today = getTodayKey();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(stored.date || '')) ? String(stored.date) : '';
  const completedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(stored.completedDate || '')) ? String(stored.completedDate) : '';
  const state = {
    date,
    step: date === today ? clampNumber(stored.step, 0, PULSE_CIRCUIT.steps.length, 0) : 0,
    completed: clampNumber(stored.completed, 0, 9_999, 0),
    completedDate,
    badgeUnlocked: stored.badgeUnlocked === true || clampNumber(stored.completed, 0, 9_999, 0) >= PULSE_CIRCUIT.badgeAt,
    lastCompletedAt: clampNumber(stored.lastCompletedAt, 0, Number.MAX_SAFE_INTEGER, 0)
  };
  gameState.pulseCircuit = state;
  return state;
}

function getPulseCircuitCommunity() {
  const circuit = communitySnapshot?.circuit && typeof communitySnapshot.circuit === 'object' ? communitySnapshot.circuit : {};
  const phaseSize = clampNumber(circuit.phaseSize, 1, 100, 18);
  const total = clampNumber(circuit.total, 0, 999_999, 0);
  const phase = clampNumber(circuit.phase, 1, 4, Math.min(4, Math.floor(total / phaseSize) + 1));
  const phaseProgress = clampNumber(circuit.phaseProgress, 0, phaseSize, total % phaseSize);
  const recent = Array.isArray(circuit.recent) ? circuit.recent.slice(0, 6) : [];
  return { total, phaseSize, phase, phaseProgress, recent, week: cleanText(circuit.week, 16) };
}

function renderPulseCircuit() {
  const root = document.getElementById('pulseCircuit');
  if (!root || !gameState) return;
  const eventStatus = getHalloweenEventStatus();
  if (!eventStatus.active) {
    root.innerHTML = '';
    return;
  }
  const state = getPulseCircuitState();
  const community = getPulseCircuitCommunity();
  const doneToday = state.completedDate === getTodayKey();
  const expected = PULSE_CIRCUIT.steps[state.step] || null;
  const districts = PULSE_CIRCUIT.steps.map((step, index) => {
    const completed = !doneToday && index < state.step;
    const active = !doneToday && index === state.step;
    const status = doneToday ? 'is-resting' : completed ? 'is-complete' : active ? 'is-active' : 'is-locked';
    const copy = doneToday ? 'Маршрут уже збережено' : completed ? 'Сигнал прийнято' : active ? step.note : 'Чекає на сигнал';
    return `<article class="nightfall-district nightfall-district-${step.district} ${status}"><div class="nightfall-district-icon"><i class="fa-solid ${completed ? 'fa-check' : step.icon}"></i></div><div class="nightfall-district-copy"><span>РАЙОН 0${index + 1}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(copy)}</p></div><button type="button" data-nightfall-go="${step.id}" aria-label="${escapeHtml(step.action)}: ${escapeHtml(step.title)}"><i class="fa-solid ${active ? 'fa-location-arrow' : 'fa-arrow-up-right-from-square'}"></i>${escapeHtml(step.action)}</button></article>`;
  }).join('');
  const recent = community.recent.length
    ? community.recent.map(entry => `<span><i class="fa-solid fa-bolt"></i>${escapeHtml(cleanText(entry?.name, 24) || 'Гравець')}</span>`).join('')
    : '<span class="is-empty">Перший маршрут Нічного міста може бути твоїм.</span>';
  const percent = Math.round((community.phaseProgress / community.phaseSize) * 100);
  const status = doneToday
    ? 'Маршрут на сьогодні збережено. Завтра місто знову покличе.'
    : expected
      ? `Наступна точка: ${expected.title}`
      : 'Сховище готове прийняти твій маршрут.';
  const routeProgress = doneToday ? 3 : state.step;
  const rewardCopy = state.badgeUnlocked
    ? 'Відбиток Signal Forge у профілі назавжди'
    : `Ще ${Math.max(0, PULSE_CIRCUIT.badgeAt - state.completed)} маршрут(и) до рамки Signal Forge`;
  const shareButton = state.completed > 0 ? '<button type="button" class="nightfall-share" data-nightfall-share><i class="fa-solid fa-share-nodes"></i>Показати маршрут</button>' : '';
  const playerLocation = doneToday ? 'vault' : expected?.district || 'vault';
  const playerMarker = doneToday ? 'СХОВИЩЕ' : 'ТИ ТУТ';
  root.innerHTML = `<section class="nightfall-map ${eventStatus.preview ? 'is-preview' : ''}" aria-label="Nightfall: карта Нічного міста"><div class="nightfall-map-head"><div><p><i class="fa-solid fa-map"></i> NIGHTFALL · ЖИВА МАПА ПОДІЇ</p><h2>КАРТА НІЧНОГО МІСТА</h2><span>${status}</span></div><div class="nightfall-map-meter"><span>ТВІЙ МАРШРУТ</span><strong>${routeProgress} <small>/ 3</small></strong><em>${doneToday ? 'ЗАВЕРШЕНО' : 'СЬОГОДНІ'}</em></div></div><div class="nightfall-map-scene"><div class="nightfall-map-atmosphere" aria-hidden="true"></div><div class="nightfall-route-line" aria-hidden="true"><i style="width:${doneToday ? 100 : routeProgress * 33.333}%"></i></div><div class="nightfall-city-signal"><span>СИГНАЛ МІСТА</span><strong>${community.total.toLocaleString('uk-UA')}</strong><small>Фаза ${community.phase} · ${community.phaseProgress} / ${community.phaseSize}</small><div><i style="width:${percent}%"></i></div></div><div class="nightfall-map-districts">${districts}</div><div class="nightfall-vault ${doneToday ? 'is-open' : ''} ${state.badgeUnlocked ? 'is-forged' : ''}"><i class="fa-solid ${doneToday ? 'fa-vault' : 'fa-lock'}"></i><span>${doneToday ? 'СХОВИЩЕ ВІДКРИТО' : 'СХОВИЩЕ НІЧНОГО МІСТА'}</span><b>${state.badgeUnlocked ? 'SIGNAL FORGE · ВІДБИТОК ЗБЕРЕЖЕЖЕНО' : `+${PULSE_CIRCUIT.dailyXp} XP · МАРШРУТ №${state.completed + 1}`}</b></div><div class="nightfall-player-pin is-at-${playerLocation}"><i class="fa-solid fa-user"></i><span>${playerMarker}</span></div></div><div class="nightfall-map-foot"><p><i class="fa-solid fa-shield-heart"></i> Один маршрут на день. Жодних ставок: лише гра, шлях і спільне місто.</p><div class="nightfall-map-live"><b><i class="fa-solid fa-satellite-dish"></i> СВІЖІ СИГНАЛИ</b>${recent}</div><div class="nightfall-map-reward ${state.badgeUnlocked ? 'is-unlocked' : ''}"><i class="fa-solid ${state.badgeUnlocked ? 'fa-wand-magic-sparkles' : 'fa-border-all'}"></i><span>${state.completed} / ${PULSE_CIRCUIT.badgeAt}</span><small>${rewardCopy}</small>${shareButton}</div></div></section>`;
  if (state.badgeUnlocked) root.querySelector('.nightfall-vault b').textContent = 'SIGNAL FORGE · ВІДБИТОК ЗБЕРЕЖЕНО';
  root.querySelectorAll('[data-nightfall-go]').forEach(button => button.addEventListener('click', () => goToNightfallDistrict(button.dataset.nightfallGo)));
  root.querySelector('[data-nightfall-share]')?.addEventListener('click', () => { void shareNightfallRoute(); });
}

function getMidnightRiftCommunity() {
  const rift = communitySnapshot?.rift && typeof communitySnapshot.rift === 'object' ? communitySnapshot.rift : {};
  const maxHealth = clampNumber(rift.maxHealth, 100, 100_000, 2_500);
  const health = clampNumber(rift.health, 0, maxHealth, maxHealth);
  const hits = clampNumber(rift.hits, 0, 999_999, 0);
  const recent = Array.isArray(rift.recent) ? rift.recent.slice(0, 5) : [];
  return { maxHealth, health, hits, recent, defeated: health <= 0 };
}

function renderMidnightRift() {
  const root = document.getElementById('midnightRift');
  if (!root || !gameState || midnightRiftRun?.active) return;
  const status = getHalloweenEventStatus();
  if (!status.active) {
    root.innerHTML = '';
    return;
  }
  const state = getHalloweenEventState();
  const runs = state.riftDate === status.date ? state.riftRuns : 0;
  const rift = getMidnightRiftCommunity();
  const healthPercent = Math.max(0, Math.round((rift.health / rift.maxHealth) * 100));
  const recent = rift.recent.length
    ? rift.recent.map(entry => `<span><i class="fa-solid fa-burst"></i>${escapeHtml(cleanText(entry?.name, 20) || 'Гравець')} <b>−${clampNumber(entry?.damage, 0, 99, 0)}</b></span>`).join('')
    : '<span class="is-empty">Розлом ще не торкнувся жоден мисливець.</span>';
  const disabled = status.preview || !status.scheduledActive || rift.defeated || runs >= MIDNIGHT_RIFT_MAX_RUNS;
  const action = status.preview ? 'Лише перегляд' : rift.defeated ? 'Розлом закрито до завтра' : runs >= MIDNIGHT_RIFT_MAX_RUNS ? 'Твої удари на сьогодні вичерпано' : 'Увійти в Розлом';
  root.innerHTML = `<article class="midnight-rift" aria-label="Розлом опівночі"><div class="midnight-rift-art" aria-hidden="true"></div><div class="midnight-rift-shade" aria-hidden="true"></div><header class="midnight-rift-head"><div><p><i class="fa-solid fa-circle-exclamation"></i> СПІЛЬНА ТРИВОГА · УСІ ГРАВЦІ</p><h2>РОЗЛОМ ОПІВНОЧІ</h2><span>15 секунд на руну. Кожен влучний сигнал зменшує спільну силу Розлому.</span></div><div class="midnight-rift-count"><span>ТВОЇ СПРОБИ</span><strong>${runs} <small>/ ${MIDNIGHT_RIFT_MAX_RUNS}</small></strong><em>${rift.hits.toLocaleString('uk-UA')} ударів міста</em></div></header><div class="midnight-rift-core"><div class="midnight-rift-entity"><span>THE 13TH SIGNAL</span><b>${rift.defeated ? 'ЗАКРИТИЙ' : 'АКТИВНИЙ'}</b><small>${rift.defeated ? 'Місто витримало цю ніч.' : 'Вартовий туману чекає на спільний удар.'}</small></div><div class="midnight-rift-health"><div><span>СТАБІЛЬНІСТЬ РОЗЛОМУ</span><b>${rift.health.toLocaleString('uk-UA')} <small>/ ${rift.maxHealth.toLocaleString('uk-UA')}</small></b></div><div class="midnight-rift-health-track"><i style="width:${healthPercent}%"></i></div><em>${100 - healthPercent}% очищено спільнотою</em></div><div class="midnight-rift-game" id="midnightRiftGame"><div class="midnight-rift-game-copy"><i class="fa-solid fa-wand-magic-sparkles"></i><b>СТАБІЛІЗУЙ РУНИ</b><span>Злови якомога більше рухомих знаків за 15 секунд.</span></div><button type="button" class="midnight-rift-start" data-rift-start ${disabled ? 'disabled' : ''}><i class="fa-solid fa-play"></i>${action}<small>${status.preview ? 'Нагороди та шкода вимкнені' : 'Нагорода: гарбузові монетки + XP'}</small></button></div></div><footer class="midnight-rift-foot"><div><b><i class="fa-solid fa-satellite-dish"></i> ОСТАННІ УДАРИ</b>${recent}</div><p><i class="fa-solid fa-shield-heart"></i> Це кооперативна skill-активність без ставок і без реальних призів.</p></footer></article>`;
  root.querySelector('[data-rift-start]')?.addEventListener('click', startMidnightRift);
}

function positionMidnightRiftTarget(target) {
  if (!target) return;
  target.style.left = `${8 + Math.random() * 76}%`;
  target.style.top = `${12 + Math.random() * 68}%`;
  target.style.transform = `translate(-50%,-50%) rotate(${Math.round(-18 + Math.random() * 36)}deg)`;
}

function startMidnightRift() {
  const status = getHalloweenEventStatus();
  const state = getHalloweenEventState();
  const rift = getMidnightRiftCommunity();
  const todayRuns = state.riftDate === status.date ? state.riftRuns : 0;
  if (!status.scheduledActive || midnightRiftRun?.active || rift.defeated || todayRuns >= MIDNIGHT_RIFT_MAX_RUNS) return;
  if (state.riftDate !== status.date) {
    state.riftDate = status.date;
    state.riftRuns = 0;
  }
  const stage = document.getElementById('midnightRiftGame');
  if (!stage) return;
  const run = { active: true, score: 0, startedAt: Date.now(), interval: null, timeout: null };
  midnightRiftRun = run;
  stage.innerHTML = `<div class="midnight-rift-hud"><span>ЧАС <b id="riftTime">15.0</b></span><span>РУНИ <b id="riftScore">0</b></span></div><button type="button" class="midnight-rift-target" id="midnightRiftTarget" aria-label="Спіймати руну"><i class="fa-solid fa-ankh"></i><span>СПІЙМАТИ</span></button>`;
  const target = document.getElementById('midnightRiftTarget');
  const score = document.getElementById('riftScore');
  const time = document.getElementById('riftTime');
  const finish = () => finishMidnightRift(run);
  positionMidnightRiftTarget(target);
  target?.addEventListener('click', () => {
    if (!run.active) return;
    run.score += 1;
    if (score) score.textContent = String(run.score);
    positionMidnightRiftTarget(target);
    target.classList.remove('is-hit');
    requestAnimationFrame(() => target.classList.add('is-hit'));
  });
  run.interval = window.setInterval(() => {
    const left = Math.max(0, MIDNIGHT_RIFT_RUN_MS - (Date.now() - run.startedAt));
    if (time) time.textContent = (left / 1000).toFixed(1);
    if (!left) finish();
  }, 80);
  run.timeout = window.setTimeout(finish, MIDNIGHT_RIFT_RUN_MS + 60);
}

function finishMidnightRift(run) {
  if (!run?.active || midnightRiftRun !== run) return;
  run.active = false;
  window.clearInterval(run.interval);
  window.clearTimeout(run.timeout);
  midnightRiftRun = null;
  const status = getHalloweenEventStatus();
  const state = getHalloweenEventState();
  const score = clampNumber(run.score, 0, 99, 0);
  const damage = clampNumber(16 + score * 7, 16, 90, 16);
  state.riftDate = status.date;
  state.riftRuns = clampNumber(state.riftRuns + 1, 0, MIDNIGHT_RIFT_MAX_RUNS, 0);
  state.riftBest = Math.max(state.riftBest, score);
  const coins = Math.max(1, Math.min(7, Math.floor(score / 2) + 1));
  state.pumpkinCoins = clampNumber(state.pumpkinCoins + coins, 0, 9_999, 0);
  addXp(12 + score * 3);
  if (score >= 10 && !state.cosmetics.titles.includes('rift_breaker_2026')) {
    state.cosmetics.titles.push('rift_breaker_2026');
    activateSeasonalCosmetic('rift_breaker_2026');
  }
  saveState();
  updateBalanceUI();
  renderProfileCosmeticsSummary();
  renderHalloweenEvent();
  void syncCommunity(null, null, { id: makeUuid(), damage });
  soundWin();
  showToast(`Розлом: ${score} рун · −${damage} спільної сили · +${coins} 🪙`, score >= 10 ? 'success' : 'info');
}

function goToNightfallDistrict(stepId) {
  const step = PULSE_CIRCUIT.steps.find(entry => entry.id === stepId);
  if (!step) return;
  showPage(step.page);
  if (step.id === 'arena') {
    window.setTimeout(() => document.getElementById('targetArena')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 220);
  }
}

async function shareNightfallRoute() {
  const state = getPulseCircuitState();
  if (!state.completed) return;
  const player = cleanText(account?.nick || currentUser?.name || 'Гравець', 24) || 'Гравець';
  const text = `${player} запалив ${state.completed} маршрут(ів) на карті Nightfall у ПОТУЖНО DROP. Сховище Нічного міста вже чекає. 🎃⚡`;
  const shareData = { title: 'Nightfall · ПОТУЖНО DROP', text, url: location.href.split('#')[0] };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${shareData.url}`);
    showToast('Текст для посту скопійовано — додай свій скрін карти.', 'success');
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Не вдалося підготувати пост. Спробуй ще раз.', 'warn');
  }
}

function recordPulseCircuitStep(stepId) {
  if (!gameState || !currentUser) return { progressed: false, completed: false };
  if (!getHalloweenEventStatus().scheduledActive) return { progressed: false, completed: false };
  const state = getPulseCircuitState();
  const today = getTodayKey();
  if (state.completedDate === today) return { progressed: false, completed: false };
  const expected = PULSE_CIRCUIT.steps[state.step];
  if (!expected || expected.id !== stepId) return { progressed: false, completed: false };
  state.date = today;
  state.step += 1;
  if (state.step < PULSE_CIRCUIT.steps.length) {
    saveState();
    renderPulseCircuit();
    return { progressed: true, completed: false, step: state.step };
  }
  state.step = 0;
  state.completedDate = today;
  state.completed += 1;
  state.lastCompletedAt = Date.now();
  state.badgeUnlocked = state.completed >= PULSE_CIRCUIT.badgeAt;
  addXp(PULSE_CIRCUIT.dailyXp);
  void syncCommunity(null, { id: makeUuid() });
  saveState();
  renderPulseCircuit();
  renderProfileProgress();
  showToast(`Nightfall: маршрут завершено. +${PULSE_CIRCUIT.dailyXp} XP і живий сигнал для міста.`, 'success');
  return { progressed: true, completed: true, badgeUnlocked: state.badgeUnlocked };
}

function getPowerRunState() {
  if (!gameState) return createDefaultPowerRun();
  const stored = gameState.powerRun && typeof gameState.powerRun === 'object' ? gameState.powerRun : {};
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(String(stored.lastClaimDate || '')) ? String(stored.lastClaimDate) : '';
  const powerRun = {
    lastClaimDate: validDate,
    streak: clampNumber(stored.streak, 0, POWER_RUN_REWARDS.length, 0),
    totalClaims: clampNumber(stored.totalClaims, 0, 1_000_000, 0)
  };
  gameState.powerRun = powerRun;
  return powerRun;
}

function getPowerRunProgress() {
  const powerRun = getPowerRunState();
  const today = getTodayKey();
  const alreadyClaimed = powerRun.lastClaimDate === today;
  const continuedYesterday = powerRun.lastClaimDate === getDateKeyWithOffset(-1);
  const nextDay = alreadyClaimed
    ? Math.max(1, powerRun.streak)
    : continuedYesterday && powerRun.streak < POWER_RUN_REWARDS.length
      ? powerRun.streak + 1
      : 1;
  const completedDays = alreadyClaimed ? powerRun.streak : nextDay === 1 ? 0 : powerRun.streak;
  return { powerRun, today, alreadyClaimed, nextDay, completedDays };
}

function renderPowerRun() {
  const root = document.getElementById('powerRun');
  if (!root || !gameState) return;
  const progress = getPowerRunProgress();
  const reward = POWER_RUN_REWARDS[progress.nextDay - 1];
  const dayCards = POWER_RUN_REWARDS.map((entry, index) => {
    const day = index + 1;
    const isClaimed = day <= progress.completedDays;
    const isCurrent = !progress.alreadyClaimed && day === progress.nextDay;
    const state = isClaimed ? 'is-claimed' : isCurrent ? 'is-current' : '';
    const marker = isClaimed
      ? '<i class="fa-solid fa-check"></i>'
      : isCurrent
        ? '<i class="fa-solid fa-arrow-down"></i>'
        : `<span>${day}</span>`;
    return `<div class="power-run-day ${state}">
      <b>ДЕНЬ ${day}</b><i class="fa-solid ${entry.icon}"></i><strong>${entry.label}</strong><em>${marker}</em>
    </div>`;
  }).join('');
  const action = progress.alreadyClaimed
    ? '<div class="power-run-complete"><i class="fa-solid fa-circle-check"></i><span>Сьогодні забрано</span><small>Нова нагорода опівночі</small></div>'
    : `<button type="button" class="power-run-claim" data-power-run-claim><i class="fa-solid fa-gift"></i>Забрати: ${reward.label}<small>+${reward.xp} XP</small></button>`;

  root.innerHTML = `<article class="power-run-card ${powerRunExpanded ? 'is-expanded' : 'is-compact'}" aria-label="Power Run, щоденна серія">
    <div class="power-run-top">
      <div class="power-run-mark"><i class="fa-solid fa-bolt"></i><b>6.0</b></div>
      <div class="power-run-copy"><p>ПОВЕРНЕННЯ В ГРУ</p><h2>POWER RUN</h2><span>Забирай одну нагороду щодня. Пропустив день — серія починається знову.</span><button type="button" class="power-run-toggle" data-power-run-toggle><i class="fa-solid fa-calendar-days"></i>${powerRunExpanded ? 'Сховати графік' : 'Графік на 7 днів'}</button></div>
      <div class="power-run-streak"><span>ПОТОЧНА СЕРІЯ</span><b>${progress.alreadyClaimed ? progress.powerRun.streak : Math.max(0, progress.nextDay - 1)} <small>/ ${POWER_RUN_REWARDS.length}</small></b><em>${progress.powerRun.totalClaims} всього</em></div>
      ${action}
    </div>
    <div class="power-run-details"><div class="power-run-days">${dayCards}</div><div class="power-run-footer"><span><i class="fa-solid fa-cloud"></i> Прогрес зберігається у Cloud Profile</span><div><button type="button" data-power-run-go="case"><i class="fa-solid fa-box-open"></i> Кейси</button><button type="button" data-power-run-go="upgrader"><i class="fa-solid fa-bolt"></i> Апгрейд</button><button type="button" data-power-run-go="battle"><i class="fa-solid fa-swords"></i> Бій</button></div></div></div>
  </article>`;
  root.querySelector('[data-power-run-claim]')?.addEventListener('click', claimPowerRun);
  root.querySelector('[data-power-run-toggle]')?.addEventListener('click', () => {
    powerRunExpanded = !powerRunExpanded;
    renderPowerRun();
  });
  root.querySelectorAll('[data-power-run-go]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.powerRunGo)));
}

function claimPowerRun() {
  if (!gameState || !currentUser) return;
  const progress = getPowerRunProgress();
  if (progress.alreadyClaimed) {
    showToast('Нагороду Power Run на сьогодні вже забрано.', 'info');
    return;
  }
  const reward = POWER_RUN_REWARDS[progress.nextDay - 1];
  progress.powerRun.lastClaimDate = progress.today;
  progress.powerRun.streak = progress.nextDay;
  progress.powerRun.totalClaims += 1;
  currentUser.balance = clampNumber(currentUser.balance + reward.credits, 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE);
  addXp(reward.xp);
  if (reward.tickets) gameState.caseTickets = getCaseTicketCount() + reward.tickets;
  saveState();
  updateBalanceUI();
  updateCaseTicketOption();
  renderGameHub();
  soundWin();
  showToast(`Power Run: ${reward.label} і +${reward.xp} XP додано.`, 'success');
}

function getTargetArenaState() {
  if (!gameState) return createDefaultTargetArena();
  const stored = gameState.targetArena && typeof gameState.targetArena === 'object' ? gameState.targetArena : {};
  const arena = {
    rounds: clampNumber(stored.rounds, 0, 1_000_000, 0),
    bestScore: clampNumber(stored.bestScore, 0, 999, 0),
    totalSpent: clampNumber(stored.totalSpent, 0, MAX_STORED_BALANCE, 0),
    totalPayout: clampNumber(stored.totalPayout, 0, MAX_STORED_BALANCE, 0),
    lastPlayedAt: clampNumber(stored.lastPlayedAt, 0, Number.MAX_SAFE_INTEGER, 0)
  };
  gameState.targetArena = arena;
  return arena;
}

function getTargetArenaPayout(score) {
  return TARGET_ARENA_PAYOUTS.find(tier => score >= tier.minimumScore) || TARGET_ARENA_PAYOUTS[TARGET_ARENA_PAYOUTS.length - 1];
}

function getTargetArenaTheme() {
  const season = getActiveSeason();
  if (season?.kind === 'halloween') return TARGET_ARENA_THEMES.halloween;
  if (season?.kind === 'winter') return TARGET_ARENA_THEMES.winter;
  return TARGET_ARENA_THEMES.default;
}

function getTargetArenaDescriptor(theme = getTargetArenaTheme()) {
  const depthRoll = Math.random();
  const depth = depthRoll < 0.42
    ? TARGET_ARENA_DEPTHS[0]
    : depthRoll < 0.79
      ? TARGET_ARENA_DEPTHS[1]
      : TARGET_ARENA_DEPTHS[2];
  const targetRoll = Math.random();
  const target = targetRoll < 0.09
    ? TARGET_ARENA_TARGETS.decoy
    : targetRoll > 0.82
      ? TARGET_ARENA_TARGETS.elite
      : TARGET_ARENA_TARGETS.standard;
  const decoy = target.key === 'decoy';
  return {
    ...target,
    depth,
    decoy,
    asset: theme.targetAsset || target.asset,
    label: theme.targetLabels?.[target.key] || target.label,
    points: decoy ? 0 : depth.points + target.scoreBonus,
    bonusMs: decoy ? 0 : depth.bonusMs + target.bonusMs
  };
}

function clearTargetArenaTimers() {
  if (targetArenaTimer) window.clearTimeout(targetArenaTimer);
  if (targetArenaMoveTimer) window.clearTimeout(targetArenaMoveTimer);
  targetArenaTimer = 0;
  targetArenaMoveTimer = 0;
}

function renderLegacyTargetArena() {
  const root = document.getElementById('targetArena');
  if (!root || !gameState) return;
  if (targetArenaSession) {
    renderActiveTargetArena(root);
    return;
  }
  const arena = getTargetArenaState();
  const season = getActiveSeason();
  const halloweenActive = season?.kind === 'halloween';
  const winterActive = season?.kind === 'winter';
  const arenaName = halloweenActive ? 'ГАРБУЗОВИЙ ТИР' : winterActive ? 'ПОЛЯРНИЙ ТИР' : 'ЕЛІТНИЙ ТИР';
  const compactAction = `<div class="target-arena-compact"><span><i class="fa-solid ${halloweenActive ? 'fa-ghost' : winterActive ? 'fa-snowflake' : 'fa-coins'}"></i> Внески від ${formatCredits(TARGET_ARENA_STAKES[0])} · +220 мс за влучання</span><button type="button" data-arena-open><i class="fa-solid fa-crosshairs"></i> Відкрити тир</button></div>`;
  const fullControls = `<div class="target-arena-body"><div class="target-arena-stakes"><span>ОБЕРИ ВНЕСОК</span><div>${TARGET_ARENA_STAKES.map(stake => `<button type="button" data-arena-stake="${stake}" class="${targetArenaSelectedStake === stake ? 'is-selected' : ''}">${formatCredits(stake)}</button>`).join('')}</div><small>Невдала спроба не повертає PC. Тут немає реальних грошей чи призів.</small></div><div class="target-arena-rules"><span>ПОВЕРНЕННЯ ЗА ВЛУЧАННЯ</span><div><b>0–4</b><b>5–8</b><b>9–12</b><b>13–16</b><b>17–20</b><b>21+</b></div><div><em>0%</em><em>10%</em><em>30%</em><em>55%</em><em>75%</em><em>95%</em></div></div><div class="target-arena-actions"><button type="button" class="target-arena-start" data-arena-start><i class="fa-solid fa-play"></i>ПОЧАТИ ЗА ${formatCredits(targetArenaSelectedStake)}<small>без cooldown</small></button><button type="button" class="target-arena-collapse" data-arena-close>Згорнути</button></div></div>`;
  root.innerHTML = `<article class="target-arena-card ${halloweenActive ? 'is-halloween' : winterActive ? 'is-icewire' : ''} ${targetArenaExpanded ? 'is-expanded' : 'is-compact'}" aria-label="${arenaName}">
    <div class="target-arena-head"><div class="target-arena-icon">${halloweenActive ? '🎃' : winterActive ? '❄️' : '<i class="fa-solid fa-crosshairs"></i>'}</div><div><p>${halloweenActive ? 'HALLOWEEN · ДО 3 ЛИСТОПАДА' : winterActive ? 'ICEWIRE · ZERO HOUR' : 'ДЛЯ ВЕЛИКОГО БАЛАНСУ'}</p><h2>${arenaName}</h2><span>15 секунд на рухомі мішені. Чим краща точність — тим більша частина ставки повертається.</span></div><div class="target-arena-record"><span>РЕКОРД</span><b>${arena.bestScore}</b><small>${arena.rounds} спроб</small></div></div>
    ${targetArenaExpanded ? fullControls : compactAction}
  </article>`;
  root.querySelector('[data-arena-open]')?.addEventListener('click', () => {
    targetArenaExpanded = true;
    renderTargetArena();
  });
  root.querySelector('[data-arena-close]')?.addEventListener('click', () => {
    targetArenaExpanded = false;
    renderTargetArena();
  });
  root.querySelectorAll('[data-arena-stake]').forEach(button => button.addEventListener('click', () => {
    targetArenaSelectedStake = Number(button.dataset.arenaStake);
    renderTargetArena();
  }));
  root.querySelector('[data-arena-start]')?.addEventListener('click', () => startTargetArena(targetArenaSelectedStake));
}

function renderLegacyActiveTargetArena(root) {
  clearTargetArenaTimers();
  const season = getActiveSeason();
  const halloweenActive = season?.kind === 'halloween';
  const winterActive = season?.kind === 'winter';
  const liveName = halloweenActive ? 'ГАРБУЗОВИЙ ТИР' : winterActive ? 'ПОЛЯРНИЙ ТИР' : 'ЕЛІТНИЙ ТИР';
  root.innerHTML = `<article class="target-arena-card ${halloweenActive ? 'is-halloween' : winterActive ? 'is-icewire' : ''} is-active" aria-label="${liveName}, активна спроба"><div class="target-arena-live-head"><div><p>${halloweenActive ? '🎃' : winterActive ? '❄️' : '<i class="fa-solid fa-crosshairs"></i>'} ${liveName} · СПРОБА ТРИВАЄ</p><strong id="targetArenaTimer">15.0 с</strong></div><div><span>ВНЕСОК</span><b>${formatCredits(targetArenaSession.stake)}</b></div><div><span>ВЛУЧАННЯ</span><b id="targetArenaScore">${targetArenaSession.score}</b><small id="targetArenaBonus">+${(Number(targetArenaSession.bonusMs) || 0) / 1000} с</small></div></div><div class="target-arena-board" id="targetArenaBoard"><span class="target-arena-board-copy">${halloweenActive ? 'Полюй на гарбузи' : winterActive ? 'Лови крижані маяки' : 'Тисни по мішені'}</span><button type="button" class="target-arena-target" id="targetArenaTarget" aria-label="Влучити в мішень">${halloweenActive ? '🎃' : winterActive ? '❄️' : '<i class="fa-solid fa-crosshairs"></i>'}</button></div><p class="target-arena-live-note">Кожне влучання додає +220 мс (до +5 с). Максимальне повернення за 21+ — 95% внеску.</p></article>`;
  const board = root.querySelector('#targetArenaBoard');
  const target = root.querySelector('#targetArenaTarget');
  const moveTarget = () => {
    if (!targetArenaSession || !board || !target) return;
    const maxLeft = Math.max(8, board.clientWidth - target.offsetWidth - 8);
    const maxTop = Math.max(8, board.clientHeight - target.offsetHeight - 8);
    target.style.left = `${8 + Math.random() * Math.max(0, maxLeft - 8)}px`;
    target.style.top = `${8 + Math.random() * Math.max(0, maxTop - 8)}px`;
  };
  target?.addEventListener('click', () => {
    if (!targetArenaSession) return;
    if (Date.now() >= targetArenaSession.endsAt) {
      finishTargetArena();
      return;
    }
    targetArenaSession.score += 1;
    const previousEnd = targetArenaSession.endsAt;
    targetArenaSession.endsAt = Math.min(targetArenaSession.maxEndsAt, targetArenaSession.endsAt + TARGET_ARENA_HIT_BONUS_MS);
    targetArenaSession.bonusMs = clampNumber((Number(targetArenaSession.bonusMs) || 0) + (targetArenaSession.endsAt - previousEnd), 0, TARGET_ARENA_MAX_BONUS_MS, 0);
    const score = root.querySelector('#targetArenaScore');
    if (score) score.textContent = String(targetArenaSession.score);
    const bonus = root.querySelector('#targetArenaBonus');
    if (bonus) bonus.textContent = `+${(targetArenaSession.bonusMs / 1000).toFixed(2)} с`;
    target.classList.remove('is-hit');
    void target.offsetWidth;
    target.classList.add('is-hit');
    beep(720 + Math.min(420, targetArenaSession.score * 14), 0.035, 'square');
    moveTarget();
  });
  moveTarget();
  targetArenaMoveTimer = window.setInterval(moveTarget, 690);
  const updateTimer = () => {
    if (!targetArenaSession) return;
    const remaining = Math.max(0, targetArenaSession.endsAt - Date.now());
    const timer = root.querySelector('#targetArenaTimer');
    if (timer) timer.textContent = `${(remaining / 1000).toFixed(1)} с`;
    if (remaining <= 0) {
      finishTargetArena();
      return;
    }
    targetArenaTimer = window.setTimeout(updateTimer, 60);
  };
  updateTimer();
}

function renderTargetArena() {
  const root = document.getElementById('targetArena');
  if (!root || !gameState) return;
  if (targetArenaSession) {
    renderActiveTargetArena(root);
    return;
  }
  const arena = getTargetArenaState();
  const theme = getTargetArenaTheme();
  const iconHtml = '<i class="fa-solid ' + theme.icon + '"></i>';
  const payoutRanges = [
    ['0–4', '0%'],
    ['5–8', '10%'],
    ['9–12', '30%'],
    ['13–16', '55%'],
    ['17–20', '75%'],
    ['21+', '95%']
  ];
  const payoutMarkup = payoutRanges.map(range => '<div><b>' + range[0] + '</b><em>' + range[1] + '</em></div>').join('');
  const stakeMarkup = TARGET_ARENA_STAKES.map(stake => '<button type="button" data-arena-stake="' + stake + '" class="' + (targetArenaSelectedStake === stake ? 'is-selected' : '') + '">' + formatCredits(stake) + '</button>').join('');
  const compactAction = '<div class="target-arena-compact"><span>' + iconHtml + ' Внески від ' + formatCredits(TARGET_ARENA_STAKES[0]) + ' · різні лінії та бонуси часу</span><button type="button" data-arena-open><i class="fa-solid fa-crosshairs"></i> Відкрити тир</button></div>';
  const fullControls = '<div class="target-arena-body"><div class="target-arena-stakes"><span>ОБЕРИ ВНЕСОК</span><div>' + stakeMarkup + '</div><small>Віртуальна мінігра: без реальних грошей, предметів чи призів.</small></div><div class="target-arena-rules"><span>ВИПЛАТА ЗА ОЧКИ</span><div class="target-arena-payout-scale">' + payoutMarkup + '</div><small>Далека мішень і елітний маяк дають більше очок. Хибний сигнал обриває стрік.</small></div><div class="target-arena-actions"><button type="button" class="target-arena-start" data-arena-start>' + iconHtml + ' ПОЧАТИ ЗА ' + formatCredits(targetArenaSelectedStake) + '<small>15 с · + час за точні влучання</small></button><button type="button" class="target-arena-collapse" data-arena-close>Згорнути</button></div></div>';
  root.innerHTML = '<article class="target-arena-card arena-theme-' + theme.key + ' ' + theme.cardClass + ' ' + (targetArenaExpanded ? 'is-expanded' : 'is-compact') + '" aria-label="' + theme.name + '"><div class="target-arena-head"><div class="target-arena-icon">' + iconHtml + '</div><div><p>' + theme.kicker + '</p><h2>' + theme.name + '</h2><span>2.5D-полігон із трьома лініями дальності. Точний постріл повертає частину віртуального внеску.</span></div><div class="target-arena-record"><span>РЕКОРД</span><b>' + arena.bestScore + '</b><small>' + arena.rounds + ' спроб</small></div></div>' + (targetArenaExpanded ? fullControls : compactAction) + '</article>';
  root.querySelector('[data-arena-open]')?.addEventListener('click', () => {
    targetArenaExpanded = true;
    renderTargetArena();
  });
  root.querySelector('[data-arena-close]')?.addEventListener('click', () => {
    targetArenaExpanded = false;
    renderTargetArena();
  });
  root.querySelectorAll('[data-arena-stake]').forEach(button => button.addEventListener('click', () => {
    targetArenaSelectedStake = Number(button.dataset.arenaStake);
    renderTargetArena();
  }));
  root.querySelector('[data-arena-start]')?.addEventListener('click', () => startTargetArena(targetArenaSelectedStake));
}

function renderActiveTargetArena(root) {
  clearTargetArenaTimers();
  const theme = getTargetArenaTheme();
  const session = targetArenaSession;
  if (!session) return;
  const iconHtml = '<i class="fa-solid ' + theme.icon + '"></i>';
  root.innerHTML = '<article class="target-arena-card arena-theme-' + theme.key + ' ' + theme.cardClass + ' is-active" aria-label="' + theme.name + ', активна спроба"><div class="target-arena-live-head"><div><p>' + iconHtml + ' ' + theme.name + ' · СЕАНС ТРИВАЄ</p><strong id="targetArenaTimer">15.0 с</strong></div><div><span>ВНЕСОК</span><b>' + formatCredits(session.stake) + '</b></div><div><span>ОЧКИ</span><b id="targetArenaScore">0</b><small id="targetArenaHits">0 влучань</small></div><div><span>СТРІК</span><b id="targetArenaStreak">×0</b><small id="targetArenaBonus">+0.00 с</small></div></div><div class="target-arena-board" id="targetArenaBoard" style="--arena-backdrop-image:url(' + theme.backdrop + ')"><div class="target-arena-lane-grid" aria-hidden="true"><span>БЛИЖНЯ</span><span>СЕРЕДНЯ</span><span>ДАЛЬНЯ</span></div><span class="target-arena-board-copy">' + theme.boardCopy + '</span><div class="target-arena-board-status" id="targetArenaCallout" aria-live="polite"><i class="fa-solid fa-satellite-dish"></i> СКАНУВАННЯ ЛІНІЇ...</div><button type="button" class="target-arena-target target-kind-standard" id="targetArenaTarget" aria-label="Влучити в мішень"><span class="target-arena-target-ring" aria-hidden="true"></span><img class="target-arena-target-image" id="targetArenaTargetImage" src="' + TARGET_ARENA_ASSETS.standard + '" alt=""><span class="target-arena-target-meta" id="targetArenaTargetMeta">СИГНАЛ</span></button><span class="target-arena-shot-flash" id="targetArenaFlash" aria-hidden="true"></span></div><p class="target-arena-live-note">' + theme.liveHint + ' Ближня: +1, середня: +2, дальня: +3; елітний маяк дає ще +1.</p></article>';

  const board = root.querySelector('#targetArenaBoard');
  const target = root.querySelector('#targetArenaTarget');
  const targetImage = root.querySelector('#targetArenaTargetImage');
  const targetMeta = root.querySelector('#targetArenaTargetMeta');
  const callout = root.querySelector('#targetArenaCallout');
  const flash = root.querySelector('#targetArenaFlash');
  let activeTarget = null;

  const updateStats = () => {
    if (!targetArenaSession) return;
    const score = root.querySelector('#targetArenaScore');
    const hits = root.querySelector('#targetArenaHits');
    const streak = root.querySelector('#targetArenaStreak');
    const bonus = root.querySelector('#targetArenaBonus');
    if (score) score.textContent = String(targetArenaSession.score);
    if (hits) hits.textContent = String(targetArenaSession.hits || 0) + ' влучань';
    if (streak) streak.textContent = '×' + String(targetArenaSession.streak || 0);
    if (bonus) bonus.textContent = '+' + ((Number(targetArenaSession.bonusMs) || 0) / 1000).toFixed(2) + ' с';
  };

  const scheduleTarget = delay => {
    if (targetArenaMoveTimer) window.clearTimeout(targetArenaMoveTimer);
    targetArenaMoveTimer = window.setTimeout(showTarget, delay);
  };

  const showTarget = () => {
    if (!targetArenaSession || !board || !target) return;
    activeTarget = getTargetArenaDescriptor(theme);
    const boardWidth = Math.max(board.clientWidth, 1);
    const boardHeight = Math.max(board.clientHeight, 1);
    const size = clampNumber(Math.round(Math.min(boardWidth, boardHeight) * activeTarget.depth.scale), 48, 154, 86);
    const minLeft = Math.max(6, Math.round(boardWidth * activeTarget.depth.minX));
    const maxLeft = Math.max(minLeft, Math.min(boardWidth - size - 6, Math.round(boardWidth * activeTarget.depth.maxX)));
    const minTop = Math.max(8, Math.round(boardHeight * activeTarget.depth.minY));
    const maxTop = Math.max(minTop, Math.min(boardHeight - size - 7, Math.round(boardHeight * activeTarget.depth.maxY)));
    const left = minLeft + Math.random() * Math.max(0, maxLeft - minLeft);
    const top = minTop + Math.random() * Math.max(0, maxTop - minTop);
    target.className = 'target-arena-target target-kind-' + activeTarget.key + ' target-depth-' + activeTarget.depth.key;
    target.style.width = String(size) + 'px';
    target.style.height = String(size) + 'px';
    target.style.left = String(Math.round(left)) + 'px';
    target.style.top = String(Math.round(top)) + 'px';
    target.disabled = false;
    target.setAttribute('aria-label', activeTarget.decoy ? 'Хибний сигнал, не натискати' : 'Влучити: ' + activeTarget.label + ', ' + activeTarget.depth.label);
    if (targetImage) targetImage.src = activeTarget.asset;
    if (targetMeta) targetMeta.textContent = activeTarget.decoy ? 'ОБМАНКА' : '+' + activeTarget.points + ' · ' + activeTarget.depth.label.replace(' ЛІНІЯ', '');
    if (callout) callout.innerHTML = '<i class="fa-solid ' + activeTarget.icon + '"></i> ' + activeTarget.label + ' · ' + activeTarget.depth.label;
    board.dataset.depth = activeTarget.depth.key;
    scheduleTarget(activeTarget.depth.nextMs);
  };

  target?.addEventListener('click', () => {
    if (!targetArenaSession || !activeTarget || target.disabled) return;
    if (Date.now() >= targetArenaSession.endsAt) {
      finishTargetArena();
      return;
    }
    target.disabled = true;
    target.classList.remove('is-hit', 'is-decoy-hit');
    void target.offsetWidth;
    target.classList.add(activeTarget.decoy ? 'is-decoy-hit' : 'is-hit');
    flash?.classList.remove('is-visible');
    void flash?.offsetWidth;
    flash?.classList.add(activeTarget.decoy ? 'is-danger' : 'is-visible');
    if (activeTarget.decoy) {
      targetArenaSession.streak = 0;
      targetArenaSession.decoys = (targetArenaSession.decoys || 0) + 1;
      if (callout) callout.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ХИБНИЙ СИГНАЛ · стрік скинуто';
      beep(165, 0.055, 'sawtooth');
      updateStats();
      scheduleTarget(250);
      return;
    }
    targetArenaSession.hits = (targetArenaSession.hits || 0) + 1;
    targetArenaSession.streak = (targetArenaSession.streak || 0) + 1;
    targetArenaSession.maxStreak = Math.max(targetArenaSession.maxStreak || 0, targetArenaSession.streak);
    targetArenaSession.score += activeTarget.points;
    const previousEnd = targetArenaSession.endsAt;
    targetArenaSession.endsAt = Math.min(targetArenaSession.maxEndsAt, targetArenaSession.endsAt + activeTarget.bonusMs);
    targetArenaSession.bonusMs = clampNumber((Number(targetArenaSession.bonusMs) || 0) + (targetArenaSession.endsAt - previousEnd), 0, TARGET_ARENA_MAX_BONUS_MS, 0);
    if (callout) callout.innerHTML = '<i class="fa-solid fa-check"></i> ТОЧНО · +' + activeTarget.points + ' очки · +' + activeTarget.bonusMs + ' мс';
    beep(590 + Math.min(650, targetArenaSession.score * 19), 0.042, 'square');
    updateStats();
    scheduleTarget(125);
  });

  showTarget();
  updateStats();
  const updateTimer = () => {
    if (!targetArenaSession) return;
    const remaining = Math.max(0, targetArenaSession.endsAt - Date.now());
    const timer = root.querySelector('#targetArenaTimer');
    if (timer) timer.textContent = (remaining / 1000).toFixed(1) + ' с';
    if (remaining <= 0) {
      finishTargetArena();
      return;
    }
    targetArenaTimer = window.setTimeout(updateTimer, 60);
  };
  updateTimer();
}

function startTargetArena(stake) {
  const safeStake = TARGET_ARENA_STAKES.includes(Number(stake)) ? Number(stake) : TARGET_ARENA_STAKES[0];
  if (targetArenaSession || !currentUser || !gameState) return;
  if (currentUser.balance < safeStake) {
    showToast(`Для Елітного тиру потрібно ${formatCredits(safeStake)}.`, 'warn');
    return;
  }
  currentUser.balance = roundPc(currentUser.balance - safeStake);
  const startedAt = Date.now();
  targetArenaSession = {
    stake: safeStake,
    score: 0,
    hits: 0,
    streak: 0,
    maxStreak: 0,
    decoys: 0,
    bonusMs: 0,
    endsAt: startedAt + TARGET_ARENA_DURATION_MS,
    maxEndsAt: startedAt + TARGET_ARENA_DURATION_MS + TARGET_ARENA_MAX_BONUS_MS
  };
  saveState();
  updateBalanceUI();
  renderTargetArena();
}

function finishTargetArena() {
  if (!targetArenaSession || !currentUser || !gameState) return;
  const session = targetArenaSession;
  const tier = getTargetArenaPayout(session.score);
  const payout = Math.round(session.stake * tier.multiplier);
  const arena = getTargetArenaState();
  arena.rounds += 1;
  arena.bestScore = Math.max(arena.bestScore, session.score);
  arena.totalSpent = clampNumber(arena.totalSpent + session.stake, 0, MAX_STORED_BALANCE, 0);
  arena.totalPayout = clampNumber(arena.totalPayout + payout, 0, MAX_STORED_BALANCE, 0);
  arena.lastPlayedAt = Date.now();
  recordPulseCircuitStep(session.score >= 13 ? 'arena' : '');
  const halloweenProgress = session.score >= 13 ? awardHalloweenProgress('arena') : { pumpkins: 0, coins: 0 };
  const winterShards = session.score >= 13 ? awardWinterShards('arena') : 0;
  currentUser.balance = clampNumber(currentUser.balance + payout, 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE);
  targetArenaSession = null;
  clearTargetArenaTimers();
  saveState();
  updateBalanceUI();
  renderTargetArena();
  if (halloweenProgress.pumpkins || winterShards) renderSeasonalEvent();
  if (payout > session.stake) soundWin(); else soundLose();
  const net = payout - session.stake;
  const netLabel = net > 0 ? `прибуток +${formatCredits(net)}` : net < 0 ? `втрачено ${formatCredits(Math.abs(net))}` : 'повернення внеску';
  showToast(`Тир: ${session.score} влучань · ${tier.label} · ${netLabel}${halloweenProgress.pumpkins ? ` · +${halloweenProgress.pumpkins} 🎃 · +${halloweenProgress.coins} 🪙` : ''}${winterShards ? ` · +${winterShards} Frost Shard` : ''}.`, payout >= session.stake ? 'success' : 'warn');
}

function getBattlePassProgress() {
  const pass = getBattlePassState();
  const maxXp = BATTLE_PASS_SEASON.tiers * BATTLE_PASS_SEASON.tierXp;
  const unlocked = Math.min(BATTLE_PASS_SEASON.tiers, Math.floor(pass.xp / BATTLE_PASS_SEASON.tierXp));
  const currentTier = Math.min(BATTLE_PASS_SEASON.tiers, unlocked + 1);
  const inTier = pass.xp >= maxXp ? BATTLE_PASS_SEASON.tierXp : pass.xp % BATTLE_PASS_SEASON.tierXp;
  return { pass, unlocked, currentTier, inTier, maxXp, percent: Math.round((pass.xp / maxXp) * 100) };
}

function battlePassRewardCopy(reward) {
  if (reward?.type === 'skin') return { icon: 'fa-gem', title: reward.skin.name, value: 'Фіксована ціна каталогу', skin: true };
  if (reward?.type === 'ticket') return { icon: 'fa-ticket', title: 'Потужний квиток', value: '1 прокрут кейса', ticket: true };
  return { icon: 'fa-coins', title: `+${formatCredits(reward?.amount || 0)}`, value: 'Potuzhno Coin' };
}

function renderBattlePass() {
  const root = document.getElementById('battlePass');
  if (!root || !gameState) return;
  if (!isRuntimeFeatureEnabled('battlePass')) {
    root.replaceChildren();
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  const progress = getBattlePassProgress();
  const { pass, unlocked, currentTier, inTier } = progress;
  const runtimePass = getRuntimeBattlePass();
  const rewardCell = (lane, entry) => {
    const reward = entry[lane];
    const copy = battlePassRewardCopy(reward);
    const claimed = lane === 'free' ? pass.claimedFree.includes(entry.tier) : pass.claimedPremium.includes(entry.tier);
    const premiumLocked = lane === 'premium' && !pass.premium;
    const unlockedTier = entry.tier <= unlocked;
    const state = claimed ? 'claimed' : premiumLocked ? 'premium-locked' : unlockedTier ? 'ready' : 'locked';
    const action = claimed
      ? '<span class="bp-reward-state"><i class="fa-solid fa-check"></i></span>'
      : premiumLocked
        ? '<span class="bp-reward-state"><i class="fa-solid fa-lock"></i></span>'
        : unlockedTier
          ? '<span class="bp-reward-state">Забрати</span>'
          : `<span class="bp-reward-state">LVL ${entry.tier}</span>`;
    const data = premiumLocked
      ? 'data-bp-locked="premium"'
      : unlockedTier && !claimed
        ? `data-bp-claim="${lane}:${entry.tier}"`
        : '';
    const disabled = !premiumLocked && (!unlockedTier || claimed) ? 'disabled' : '';
    const visual = copy.skin
      ? `<img class="bp-reward-skin" src="${escapeHtml(getSkinImageSrc(reward.skin))}" alt="" data-skin-name="${escapeHtml(reward.skin.name)}" decoding="async" onerror="handleSkinImageError(this)">`
      : `<i class="fa-solid ${copy.icon}"></i>`;
    return `<button type="button" class="bp-reward bp-${lane} ${copy.ticket ? 'bp-ticket' : ''} is-${state}" ${data} ${disabled} title="${escapeHtml(copy.title)}">
      <span class="bp-reward-tier">${entry.tier}</span>
      ${visual}
      <strong>${escapeHtml(copy.skin ? copy.title.replace(/^★\s*/, '').split('|').pop().trim() : copy.title)}</strong>
      <small>${escapeHtml(copy.value)}</small>
      ${action}
    </button>`;
  };
  const tierNumbers = BATTLE_PASS_REWARDS.map(entry => `<span class="bp-tier-number ${entry.tier === currentTier ? 'is-current' : entry.tier <= unlocked ? 'is-open' : ''}">${entry.tier}</span>`).join('');
  root.innerHTML = `<article class="battle-pass-card ${battlePassExpanded ? 'is-expanded' : 'is-compact'}" aria-label="Бойовий пропуск ${escapeHtml(runtimePass.title)}">
    <div class="battle-pass-hero">
      <div class="bp-coin-mark"><i class="fa-solid fa-coins"></i><b>PC</b></div>
      <div class="bp-hero-copy"><p>${escapeHtml(BATTLE_PASS_SEASON.name)} · БЕЗ РЕАЛЬНИХ ОПЛАТ</p><h2>${escapeHtml(runtimePass.title)}</h2><span>${escapeHtml(runtimePass.subtitle)}</span><button type="button" class="bp-expand-btn" data-bp-toggle><i class="fa-solid fa-layer-group"></i>${battlePassExpanded ? 'Сховати нагороди' : 'Показати 30 рівнів'}</button></div>
      <div class="bp-progress-box"><div class="bp-progress-label"><span>LVL ${currentTier} / ${BATTLE_PASS_SEASON.tiers}</span><b>${pass.xp.toLocaleString('uk-UA')} XP</b></div><div class="bp-progress-track"><span style="width:${progress.percent}%"></span></div><small>${inTier.toLocaleString('uk-UA')} / ${BATTLE_PASS_SEASON.tierXp.toLocaleString('uk-UA')} XP до наступного рівня</small></div>
      <button type="button" id="battlePassBuyBtn" class="bp-buy-btn ${pass.premium ? 'is-owned' : ''}"><i class="fa-solid ${pass.premium ? 'fa-circle-check' : 'fa-crown'}"></i>${pass.premium ? 'POTUZHNO PASS АКТИВНИЙ' : `ВІДКРИТИ ЗА ${formatCredits(BATTLE_PASS_SEASON.price)}`}</button>
    </div>
    <div class="bp-track-note"><span><i class="fa-solid fa-bolt"></i> Кожен ігровий XP зараховується у пропуск</span><span><i class="fa-solid fa-ticket"></i> Квитків: <b>${getCaseTicketCount()}</b></span><span>Відкрито рівнів: <b>${unlocked} / ${BATTLE_PASS_SEASON.tiers}</b></span></div>
    <div class="bp-track-viewport"><div class="bp-track">
      <div class="bp-tier-spacer"></div><div class="bp-tier-numbers">${tierNumbers}</div>
      <div class="bp-lane-label bp-lane-free"><i class="fa-solid fa-angle-double-down"></i><strong>FREE</strong><small>базові нагороди</small></div><div class="bp-reward-row">${BATTLE_PASS_REWARDS.map(entry => rewardCell('free', entry)).join('')}</div>
      <div class="bp-lane-label bp-lane-premium"><i class="fa-solid fa-crown"></i><strong>POTUZHNO PASS</strong><small>${pass.premium ? 'преміум активний' : formatCredits(BATTLE_PASS_SEASON.price)}</small></div><div class="bp-reward-row">${BATTLE_PASS_REWARDS.map(entry => rewardCell('premium', entry)).join('')}</div>
    </div></div>
  </article>`;

  root.querySelector('#battlePassBuyBtn')?.addEventListener('click', buyBattlePass);
  root.querySelector('[data-bp-toggle]')?.addEventListener('click', () => {
    battlePassExpanded = !battlePassExpanded;
    renderBattlePass();
  });
  root.querySelectorAll('[data-bp-claim]').forEach(button => button.addEventListener('click', () => {
    const [lane, tier] = String(button.dataset.bpClaim || '').split(':');
    claimBattlePassReward(lane, Number(tier));
  }));
  root.querySelectorAll('[data-bp-locked]').forEach(button => button.addEventListener('click', () => {
    showToast(`Відкрий Potuzhno Pass за ${formatCredits(BATTLE_PASS_SEASON.price)}.`, 'info');
  }));
}

function buyBattlePass() {
  if (!gameState || !currentUser) return;
  const pass = getBattlePassState();
  if (pass.premium) {
    showToast('Potuzhno Pass уже активний.', 'info');
    return;
  }
  if (currentUser.balance < BATTLE_PASS_SEASON.price) {
    showToast(`Потрібно ${formatCredits(BATTLE_PASS_SEASON.price)} для Potuzhno Pass.`, 'warn');
    return;
  }
  currentUser.balance = roundPc(currentUser.balance - BATTLE_PASS_SEASON.price);
  pass.premium = true;
  saveState();
  updateBalanceUI();
  renderGameHub();
  soundCoin();
  showToast('Potuzhno Pass активовано. Преміум-нагороди відкриті!', 'success');
}

function claimBattlePassReward(lane, tier) {
  if (!gameState || !currentUser || !['free', 'premium'].includes(lane)) return;
  const entry = BATTLE_PASS_REWARDS.find(item => item.tier === tier);
  if (!entry) return;
  const progress = getBattlePassProgress();
  const pass = progress.pass;
  const claimedKey = lane === 'free' ? 'claimedFree' : 'claimedPremium';
  if (lane === 'premium' && !pass.premium) {
    showToast('Спершу відкрий Potuzhno Pass.', 'warn');
    return;
  }
  if (tier > progress.unlocked || pass[claimedKey].includes(tier)) return;
  const reward = entry[lane];
  if (reward.type === 'skin') {
    const item = makeDemoItem({ ...reward.skin, exclusive: true, accountBound: true, battlePassReward: true }, '-battle-pass');
    userInventory.push(item);
  } else if (reward.type === 'ticket') {
    gameState.caseTickets = getCaseTicketCount() + Math.max(1, reward.amount || 1);
  } else {
    currentUser.balance += reward.amount;
  }
  pass[claimedKey].push(tier);
  checkAchievements();
  saveState();
  updateBalanceUI();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  renderGameHub();
  soundWin();
  const copy = battlePassRewardCopy(reward);
  showToast(`Нагорода рівня ${tier}: ${copy.title}`, 'success');
}

function loadAccount() {
  try {
    const r = localStorage.getItem(STORAGE.account);
    if (r) account = JSON.parse(r);
  } catch {}
  if (!account) {
    // A browser can play locally before sign-in. This is deliberately a
    // generic guest label, never a generated player identity or server account.
    account = { nick: 'Гість', isGuest: true, createdAt: Date.now() };
    localStorage.setItem(STORAGE.account, JSON.stringify(account));
  }
  setProfileVisibility(account.profileVisibility);
  const steamImports = normalizeSteamImportMap(account.steamImports, account.steamImport);
  if (Object.keys(steamImports).length) {
    account.steamImports = steamImports;
    if (account.steamId && steamImports[account.steamId]) account.steamImport = steamImports[account.steamId];
  }
  if (account.steamId && !account.steamProfile) {
    account.steamProfile = normalizeSteamProfile(null, account.steamId);
  }
  if (!isSteamAccount(account.steamAccount, account.steamId)) {
    delete account.steamAccount;
  } else {
    account.steamAccount = {
      steamId: String(account.steamId),
      revision: Math.max(1, Math.floor(Number(account.steamAccount.revision))),
      updatedAt: clampNumber(account.steamAccount.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0)
    };
  }
  if (!isPublicProfileIdentity(account.publicProfile)) {
    account.publicProfile = {
      id: makeUuid(),
      writeKey: makeRandomSecret(32),
      enabled: false,
      updatedAt: 0
    };
  }
  if (!UUID_PATTERN.test(String(account.presenceId || ''))) account.presenceId = makeUuid();
  if (!UUID_PATTERN.test(String(account.communityId || ''))) account.communityId = makeUuid();
  localStorage.setItem(STORAGE.account, JSON.stringify(account));
}

function saveAccountNick() {
  const i = document.getElementById('accountNickInput');
  const nick = String(i?.value || '').trim().slice(0, 24);
  if (!nick) {
    showToast('Введи нікнейм', 'warn');
    return;
  }
  account.nick = nick;
  delete account.isGuest;
  localStorage.setItem(STORAGE.account, JSON.stringify(account));
  if (currentUser) currentUser.name = nick;
  updateAccountUI();
  saveState();
  renderGameHub();
  showToast('Нікнейм збережено', 'success');
}

function renderSteamAccountPanel() {
  const modal = document.getElementById('accountModal');
  if (!modal) return;
  let panel = document.getElementById('steamAccountPanel');
  if (!panel) {
    const nickLabel = modal.querySelector('label');
    if (!nickLabel) return;
    panel = document.createElement('div');
    panel.id = 'steamAccountPanel';
    panel.className = 'mb-4 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-3';
    panel.innerHTML = '<div class="flex items-center justify-between gap-3"><div class="min-w-0"><p class="text-[11px] font-extrabold text-cyan-50"><i class="fa-brands fa-steam mr-1.5 text-cyan-300"></i>Steam — головний акаунт</p><p id="steamAccountStatus" class="mt-1 break-words text-[10px] leading-4 text-gray-400"></p></div><button id="steamAccountPanelLoginBtn" class="shrink-0 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-[10px] font-extrabold text-cyan-100 hover:bg-cyan-400/20"></button></div>';
    nickLabel.before(panel);
  }
  let privacyPanel = document.getElementById('accountPrivacyPanel');
  if (!privacyPanel) {
    privacyPanel = document.createElement('div');
    privacyPanel.id = 'accountPrivacyPanel';
    privacyPanel.className = 'mb-4 rounded-xl border border-white/10 bg-black/15 p-3';
    privacyPanel.innerHTML = '<p class="text-[10px] leading-4 text-gray-400">Керуєш даними самостійно: <a href="privacy.html" class="font-bold text-cyan-300 hover:text-cyan-200">політика приватності</a>.</p><button id="steamAccountDeleteBtn" class="mt-2 hidden rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-[10px] font-extrabold text-red-100 hover:bg-red-500/20"><i class="fa-solid fa-trash-can mr-1"></i>Видалити акаунт і прогрес</button>';
    panel.after(privacyPanel);
  }
  const status = panel.querySelector('#steamAccountStatus');
  const button = panel.querySelector('#steamAccountPanelLoginBtn');
  const deleteButton = privacyPanel.querySelector('#steamAccountDeleteBtn');
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  const connected = /^\d{17}$/.test(steamId);
  if (status) status.textContent = connected
    ? `Steam ID ${steamId} · сайт і Android синхронізовані`
    : 'Увійди через Steam, щоб один профіль працював на сайті й Android.';
  if (button) {
    button.textContent = connected ? 'Підключено' : 'Увійти';
    button.disabled = connected;
    button.classList.toggle('opacity-60', connected);
    button.onclick = connected
      ? () => showToast('Steam-акаунт підключено. Прогрес уже зберігається на сервері.', 'info')
      : startSteamLogin;
  }
  if (deleteButton) {
    deleteButton.classList.toggle('hidden', !connected);
    deleteButton.onclick = deleteSteamAccount;
  }
}

function renderPerformancePanel() {
  const modal = document.getElementById('accountModal');
  if (!modal) return;
  let panel = document.getElementById('performanceModePanel');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'performanceModePanel';
    panel.className = 'mb-4 rounded-xl border border-violet-400/25 bg-violet-500/5 p-3';
    const privacy = document.getElementById('accountPrivacyPanel');
    if (privacy) privacy.after(panel);
    else modal.querySelector('#accountNickInput')?.closest('label')?.after(panel);
  }
  const mode = getPerformanceMode();
  const automaticSavings = mode === 'auto' && prefersLightweightMotion();
  panel.innerHTML = `<div class="flex items-start justify-between gap-3"><div><p class="text-[11px] font-extrabold text-violet-100"><i class="fa-solid fa-gauge-high mr-1.5 text-violet-300"></i>Швидкодія</p><p class="mt-1 text-[10px] leading-4 text-gray-400">Легкий режим прибирає декоративні прев’ю поза екраном і скорочує рулетку. Шанси, ціни та результати не змінюються.</p></div><span class="shrink-0 rounded-md border ${mode === 'lite' ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200' : 'border-gray-600/50 bg-black/20 text-gray-300'} px-2 py-1 text-[8px] font-extrabold">${mode === 'lite' ? 'ЛЕГКИЙ' : automaticSavings ? 'АВТО · ЕКОНОМНО' : 'АВТО'}</span></div><div class="mt-3 grid grid-cols-2 gap-2"><button type="button" onclick="setPerformanceMode('auto')" class="rounded-lg border px-2 py-2 text-[10px] font-extrabold transition ${mode === 'auto' ? 'border-cyan-400/45 bg-cyan-400/10 text-cyan-100' : 'border-gray-700 bg-black/20 text-gray-400 hover:border-gray-500'}">Автоматично</button><button type="button" onclick="setPerformanceMode('lite')" class="rounded-lg border px-2 py-2 text-[10px] font-extrabold transition ${mode === 'lite' ? 'border-emerald-400/45 bg-emerald-500/10 text-emerald-100' : 'border-gray-700 bg-black/20 text-gray-400 hover:border-gray-500'}">Легкий режим</button></div>`;
}

function updateAccountUI() {
  renderSteamAccountPanel();
  renderPerformancePanel();
  const n = document.getElementById('profileName');
  if (n) n.textContent = account?.nick || 'Гість';
  const headerName = document.getElementById('headerSteamName');
  if (headerName && currentUser?.steamId) {
    headerName.textContent = cleanText(currentUser.name || account?.nick || 'Steam', 20) || 'Steam';
  }
  const avatarLarge = document.getElementById('profileAvatarLarge');
  if (avatarLarge) {
    const avatarName = currentUser?.name || account?.nick || 'Гравець';
    setSteamAvatarSource(avatarLarge, currentUser?.steamId, currentUser?.avatar, avatarName);
  }
  const connectionText = document.getElementById('profileConnectionText');
  if (connectionText) connectionText.textContent = currentUser?.steamId ? 'STEAM ПРОФІЛЬ ПІДКЛЮЧЕНО' : 'ПРОФІЛЬ ГРИ';
  const connectionIcon = document.getElementById('profileConnectionIcon');
  if (connectionIcon) {
    connectionIcon.classList.toggle('is-steam', Boolean(currentUser?.steamId));
    connectionIcon.innerHTML = currentUser?.steamId ? '<i class="fa-brands fa-steam"></i>' : '<i class="fa-solid fa-gamepad"></i>';
    connectionIcon.title = currentUser?.steamId ? 'Steam підключено' : 'Профіль гри';
  }
  const profileBalance = document.getElementById('profileBalance');
  if (profileBalance) profileBalance.textContent = formatCredits(currentUser?.balance ?? 0);
  const i = document.getElementById('accountNickInput');
  if (i && !i.value) i.value = account?.nick || '';
  const s = document.getElementById('accountSteamId');
  if (s) s.textContent = currentUser?.steamId || 'не підключено';
  const x = document.getElementById('accountXp');
  if (x) x.textContent = String(gameState?.xp || 0);
  const lv = document.getElementById('accountLevel');
  if (lv) lv.textContent = String(getPlayerLevel());
  updatePrestigeUI();
  renderCloudSyncUI();
  renderFairUI();
  renderSteamProfileCard();
  renderSteamNudge();
  renderLegendProfile();
}

function setSteamConnectionState(state, message = '') {
  steamConnectionState = ['checking', 'connected', 'syncing', 'expired', 'error', 'disconnected'].includes(state)
    ? state
    : 'disconnected';
  steamConnectionMessage = cleanText(message, 180);
  applyLoggedInUI();
  renderSteamProfileCard();
}

function renderSteamProfileCard() {
  const card = document.getElementById('steamProfileCard');
  if (!card) return;
  const profile = normalizeSteamProfile(currentUser?.steamProfile || account?.steamProfile, currentUser?.steamId || account?.steamId);
  card.classList.toggle('hidden', !profile);
  if (!profile) return;

  const avatar = document.getElementById('profileSteamAvatar');
  if (avatar) {
    setSteamAvatarSource(avatar, profile.steamId, profile.avatar, profile.name);
  }
  const name = document.getElementById('profileSteamName');
  if (name) name.textContent = profile.name;
  const id = document.getElementById('profileSteamId');
  if (id) id.textContent = profile.steamId;
  const status = document.getElementById('profileSteamStatus');
  const statusText = {
    checking: 'Перевіряємо з’єднання зі Steam…',
    connected: profile.visibility === 'public'
      ? 'Публічний профіль · підключено'
      : 'Steam підключено · доступність інвентарю залежить від приватності',
    syncing: 'Steam синхронізується — перевіряємо нові предмети…',
    expired: 'Сесія Steam завершилась. Увійди знову, щоб синхронізувати предмети.',
    error: steamConnectionMessage || 'Steam тимчасово недоступний. Профіль збережено локально.',
    disconnected: 'Steam відключено від цього браузера.'
  };
  if (status) {
    status.textContent = statusText[steamConnectionState] || statusText.disconnected;
    status.classList.toggle('text-cyan-100/75', ['checking', 'connected', 'syncing'].includes(steamConnectionState));
    status.classList.toggle('text-amber-200', steamConnectionState === 'expired');
    status.classList.toggle('text-red-200', steamConnectionState === 'error');
  }
  const count = document.getElementById('profileSteamImportedCount');
  if (count) count.textContent = String(getSteamImportRecord(profile.steamId).assetIds.length);
  const link = document.getElementById('profileSteamLink');
  if (link) link.href = profile.profileUrl;
  const sync = document.getElementById('steamProfileSyncBtn');
  const reconnect = document.getElementById('steamProfileReconnectBtn');
  const disconnect = document.getElementById('steamDisconnectBtn');
  const canSync = steamConnectionState === 'connected';
  if (sync && !steamSyncPromise) {
    sync.disabled = !canSync;
    sync.classList.toggle('opacity-50', !canSync);
    sync.classList.toggle('cursor-not-allowed', !canSync);
  }
  if (reconnect) reconnect.classList.toggle('hidden', !['expired', 'error'].includes(steamConnectionState));
  if (disconnect) disconnect.disabled = steamConnectionState === 'syncing';
}

/* ===== SERVER PROFILE + VERIFIABLE CASE ROLLS ===== */
const UUID_PATTERN = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{24,160}$/;

function makeRandomSecret(bytesLength = 32) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  bytes.forEach(value => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function makeUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0'));
  hex[6] = `4${hex[6][1]}`;
  hex[8] = `${(Number.parseInt(hex[8][0], 16) & 0x3 | 0x8).toString(16)}${hex[8][1]}`;
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function getTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function isCloudProfile(value) {
  return Boolean(value && UUID_PATTERN.test(String(value.id || '')) && SECRET_PATTERN.test(String(value.recoveryCode || '')));
}

function isSteamAccount(value, steamId = currentUser?.steamId || account?.steamId) {
  return Boolean(
    value
    && /^\d{17}$/.test(String(steamId || ''))
    && String(value.steamId || '') === String(steamId)
    && Number.isSafeInteger(Number(value.revision))
    && Number(value.revision) >= 1
  );
}

function isPublicProfileIdentity(value) {
  return Boolean(value && UUID_PATTERN.test(String(value.id || '')) && SECRET_PATTERN.test(String(value.writeKey || '')));
}

function buildPublicShowcasePayload() {
  return getShowcaseItems().slice(0, 3).map(item => ({
    name: cleanText(item?.name, 160),
    img: cleanImageUrl(getKnownSkinImageUrl(item)),
    price: roundPc(clampNumber(verifiedInventoryMarketPrice(item), 0, MAX_STORED_ITEM_VALUE, 0)),
    rarity: cleanText(item?.rarity?.name || item?.rarity, 48) || 'CS2',
    rarityColor: cleanColor(item?.rarity?.color || item?.rarityColor)
  })).filter(item => item.name);
}

function buildPublicAchievementsPayload() {
  const unlocked = ACHIEVEMENT_DEFINITIONS
    .filter(achievement => gameState?.achievements?.[achievement.id])
    .sort((left, right) => Number(gameState.achievements[right.id]) - Number(gameState.achievements[left.id]))
    .slice(0, 8)
    .map(achievement => achievement.id);
  return { count: ACHIEVEMENT_DEFINITIONS.filter(achievement => gameState?.achievements?.[achievement.id]).length, unlocked };
}

function buildPublicProfilePayload() {
  const stats = gameState?.stats || {};
  const cosmetics = getHalloweenCosmetics();
  const signalForge = getPulseCircuitState();
  const campaign = getSignalCampaignProgress();
  const profileStyle = getProfileStyleDefinition();
  return {
    name: cleanText(account?.nick || currentUser?.name || 'Гравець', 24) || 'Гравець',
    avatar: cleanImageUrl(currentUser?.avatar || account?.steamProfile?.avatar),
    level: getPlayerLevel(),
    prestige: clampNumber(gameState?.prestige, 0, 99, 0),
    steamConnected: Boolean(currentUser?.steamId),
    cosmetics: { title: cosmetics.activeTitle?.id || '', frame: cosmetics.activeFrame?.id || '', style: profileStyle.id },
    signal: {
      forged: signalForge.badgeUnlocked === true,
      routes: clampNumber(signalForge.completed, 0, 9_999, 0),
      campaign: clampNumber(campaign.completed, 0, campaign.total, 0),
      claimed: campaign.state.claimed.slice(0, 3)
    },
    stats: {
      rounds: clampNumber(stats.rounds, 0, 9_999_999, 0),
      cases: clampNumber(stats.cases, 0, 9_999_999, 0),
      battles: clampNumber(stats.battles, 0, 9_999_999, 0),
      bestValue: clampNumber(stats.bestValue, 0, MAX_STORED_ITEM_VALUE, 0)
    },
    showcase: buildPublicShowcasePayload(),
    achievements: buildPublicAchievementsPayload()
  };
}

function publicProfileUrl(profileId = account?.publicProfile?.id) {
  if (!UUID_PATTERN.test(String(profileId || ''))) return '';
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('profile', profileId);
  return url.href;
}

function queuePublicProfilePublish() {
  if (!account?.publicProfile?.enabled || !isPublicProfileIdentity(account.publicProfile) || !currentUser) return;
  window.clearTimeout(publicProfilePublishTimer);
  publicProfilePublishTimer = window.setTimeout(() => { void publishPublicProfile(); }, 900);
}

async function publishPublicProfile({ announce = false } = {}) {
  if (!account?.publicProfile?.enabled || !isPublicProfileIdentity(account.publicProfile) || !currentUser) return null;
  if (publicProfilePublishPromise) return publicProfilePublishPromise;
  const identity = account.publicProfile;
  publicProfilePublishPromise = requestJson('/api/public-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'publish', id: identity.id, writeKey: identity.writeKey, profile: buildPublicProfilePayload() })
  }, 6_000).then(data => {
    account.publicProfile = { ...identity, enabled: true, updatedAt: Number(data?.profile?.updatedAt) || Date.now() };
    localStorage.setItem(STORAGE.account, JSON.stringify(account));
    if (announce) showToast('Профіль оновлено та доступний за посиланням.', 'success');
    return data?.profile || null;
  }).catch(error => {
    if (announce) showToast(error?.message || 'Не вдалося опублікувати профіль.', 'error');
    return null;
  }).finally(() => {
    publicProfilePublishPromise = null;
  });
  return publicProfilePublishPromise;
}

async function copyPublicProfileLink() {
  if (!account || !currentUser) return false;
  if (!isPublicProfileIdentity(account.publicProfile)) {
    account.publicProfile = { id: makeUuid(), writeKey: makeRandomSecret(32), enabled: false, updatedAt: 0 };
  }
  account.publicProfile.enabled = true;
  localStorage.setItem(STORAGE.account, JSON.stringify(account));
  const profile = await publishPublicProfile({ announce: true });
  if (!profile) return false;
  const url = publicProfileUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('Посилання на профіль скопійовано.', 'success');
  } catch {
    showToast('Профіль відкрито. Скопіюй посилання з адресного рядка.', 'info');
  }
  return true;
}

async function unpublishPublicProfile({ announce = true } = {}) {
  if (!isPublicProfileIdentity(account?.publicProfile)) return;
  const identity = account.publicProfile;
  try {
    await requestJson('/api/public-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unpublish', id: identity.id, writeKey: identity.writeKey })
    }, 6_000);
  } catch (error) {
    // A missing record is already private. Other failures must not pretend that a
    // remotely published profile was hidden.
    if (!/профіль не знайдено/i.test(String(error?.message || ''))) {
      if (announce) showToast(error?.message || 'Не вдалося приховати публічний профіль. Спробуй ще раз.', 'error');
      return false;
    }
  }
  account.publicProfile = { ...identity, enabled: false, updatedAt: 0 };
  localStorage.setItem(STORAGE.account, JSON.stringify(account));
  if (announce) showToast('Публічне посилання вимкнено.', 'info');
  return true;
}

function profileIdFromInput(value) {
  const raw = String(value || '').trim();
  if (UUID_PATTERN.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const id = url.searchParams.get('profile') || '';
    return UUID_PATTERN.test(id) ? id : '';
  } catch {
    return '';
  }
}

function getPublicAvatarSource(profile) {
  const avatarPath = cleanText(profile?.avatarUrl, 512);
  const isPublicAvatar = /^\/api\/public-avatar\?id=[a-f0-9-]{36}$/i.test(avatarPath);
  const isCommunityAvatar = /^\/api\/community-avatar\?player=[a-f0-9]{64}$/i.test(avatarPath);
  if (isPublicAvatar || isCommunityAvatar) return gameApiUrl(avatarPath);
  // The current player's local live event has an already verified Steam CDN
  // avatar. Keep it visible while the public profile request is in flight.
  if (profile?.isOwn === true) {
    const ownAvatar = cleanImageUrl(profile?.avatar || currentUser?.avatar || account?.steamProfile?.avatar);
    if (ownAvatar) return ownAvatar;
  }
  return createSteamAvatarFallback(profile?.name || 'Гравець');
}

function renderPublicProfileModal(profile, { demo = false } = {}) {
  const content = document.getElementById('publicProfileContent');
  if (!content || !profile) return;
  const stats = profile.stats || {};
  const communityProfile = profile.community === true;
  const level = clampNumber(profile.level, 1, 9_999, 1);
  const prestige = clampNumber(profile.prestige, 0, 99, 0);
  const avatar = getPublicAvatarSource(profile);
  const safeName = escapeHtml(cleanText(profile.name, 24) || 'Гравець');
  const publicTitle = SEASONAL_COSMETICS[profile?.cosmetics?.title] || null;
  const publicFrame = SEASONAL_COSMETICS[profile?.cosmetics?.frame] || null;
  const publicStyle = PROFILE_STYLE_DEFINITIONS.find(style => style.id === profile?.cosmetics?.style) || PROFILE_STYLE_DEFINITIONS[0];
  const publicFrameClass = getFramePresentationClass(publicFrame);
  const signalForge = profile?.signal?.forged === true;
  const signalRoutes = clampNumber(profile?.signal?.routes, 0, 9_999, 0);
  const signalCampaign = clampNumber(profile?.signal?.campaign, 0, 6, 0);
  const isOwnProfile = profile.isOwn === true || (profile.id && profile.id === account?.publicProfile?.id);
  const canJoinBattle = !demo && !communityProfile && !isOwnProfile && UUID_PATTERN.test(String(profile.id || ''));
  const showcase = Array.isArray(profile.showcase) ? profile.showcase.slice(0, 3) : [];
  const showcaseMarkup = showcase.length
    ? showcase.map(item => {
      const itemName = cleanText(item?.name, 160) || 'CS2 Skin';
      const image = getSkinImageSrc(item);
      const rarity = getItemRarity(item);
      return `<article class="public-profile-skin rarity-surface" style="--rarity-color:${rarity.color}" title="${escapeHtml(itemName)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(itemName)}" data-skin-name="${escapeHtml(itemName)}" loading="lazy" onerror="handleSkinImageError(this)"><strong>${escapeHtml(itemName)}</strong><small>${formatCredits(clampNumber(item?.price, 0, MAX_STORED_ITEM_VALUE, 0))}</small>${rarityStripMarkup(rarity, 'public-profile-rarity')}</article>`;
    }).join('')
    : '<p class="public-profile-empty"><i class="fa-solid fa-gem"></i> Вітрина поки порожня</p>';
  const unlockedAchievementIds = [...new Set(Array.isArray(profile?.achievements?.unlocked) ? profile.achievements.unlocked.map(String) : [])];
  const achievementCards = unlockedAchievementIds
    .map(id => ACHIEVEMENT_DEFINITIONS.find(achievement => achievement.id === id))
    .filter(Boolean)
    .map(achievement => `<span class="public-profile-achievement" title="${escapeHtml(achievement.description)}"><i class="fa-solid ${achievement.icon}"></i><b>${escapeHtml(achievement.title)}</b></span>`)
    .join('');
  const achievementCount = clampNumber(profile?.achievements?.count, unlockedAchievementIds.length, ACHIEVEMENT_DEFINITIONS.length, unlockedAchievementIds.length);
  const cosmeticsMarkup = [
    `<span><i class="fa-solid ${publicStyle.icon}"></i><b>${escapeHtml(publicStyle.title)}</b><small>стиль</small></span>`,
    publicTitle ? `<span><i class="fa-solid ${publicTitle.icon}"></i><b>${escapeHtml(publicTitle.title)}</b><small>титул</small></span>` : '',
    publicFrame ? `<span><i class="fa-solid ${publicFrame.icon}"></i><b>${escapeHtml(publicFrame.title)}</b><small>рамка</small></span>` : '',
    signalForge ? '<span><i class="fa-solid fa-tower-broadcast"></i><b>Signal Forge</b><small>ефект</small></span>' : '',
    signalCampaign >= 2 ? `<span><i class="fa-solid fa-satellite-dish"></i><b>Сигнал ${signalCampaign}/6</b><small>кампанія</small></span>` : ''
  ].filter(Boolean).join('');
  const statsMarkup = communityProfile
    ? `<div><span>XP</span><strong>${Math.round(Number(profile.xp) || 0).toLocaleString('uk-UA')}</strong></div>
      <div><span>Перемог</span><strong>${Math.round(Number(profile.wins) || 0).toLocaleString('uk-UA')}</strong></div>
      <div><span>Раундів</span><strong>${Math.round(Number(stats.rounds) || 0).toLocaleString('uk-UA')}</strong></div>
      <div><span>Колекція</span><strong>${formatCredits(Number(stats.bestValue) || 0)}</strong></div>`
    : `<div><span>Роллів</span><strong>${Math.round(Number(stats.rounds) || 0).toLocaleString('uk-UA')}</strong></div>
      <div><span>Кейсів</span><strong>${Math.round(Number(stats.cases) || 0).toLocaleString('uk-UA')}</strong></div>
      <div><span>Боїв</span><strong>${Math.round(Number(stats.battles) || 0).toLocaleString('uk-UA')}</strong></div>
      <div><span>Рекорд</span><strong>${formatCredits(Number(stats.bestValue) || 0)}</strong></div>`;
  content.innerHTML = `
    <div class="public-profile-card public-profile-style-${escapeHtml(publicStyle.id)}">
    <div class="public-profile-hero">
      <div class="public-profile-avatar-shell ${publicFrame ? publicFrameClass : ''} ${signalForge ? 'is-signal-forge-frame' : ''}"><img src="${escapeHtml(avatar)}" alt="Аватар ${safeName}" onerror="handleSteamAvatarError(this)"></div>
      <div class="min-w-0"><p class="public-profile-kicker">${demo ? 'ДЕМО-АКТИВНІСТЬ' : communityProfile ? 'ПРОФІЛЬ У СПІЛЬНОТІ' : 'ПРОФІЛЬ ГРАВЦЯ'}</p><h3>${safeName}</h3><p class="public-profile-level">LVL ${level}${prestige ? ` · P${prestige}` : ''}${profile.steamConnected ? ' · <i class="fa-brands fa-steam"></i> Steam' : ''}</p>${publicTitle ? `<span class="public-profile-title"><i class="fa-solid ${publicTitle.icon}"></i>${escapeHtml(publicTitle.title)}</span>` : ''}</div>
    </div>
    <div class="public-profile-stats">${statsMarkup}</div>
    ${signalForge || signalCampaign >= 2 ? `<p class="public-profile-signal"><i class="fa-solid ${signalForge ? 'fa-tower-broadcast' : 'fa-satellite-dish'}"></i><span><b>${signalForge ? 'SIGNAL FORGE' : 'СЕЗОН: СИГНАЛ'}</b><small>${signalForge ? `Nightfall-маршрутів: ${signalRoutes}` : `${signalCampaign} / 6 вузлів легенди активовано`}</small></span></p>` : ''}
    ${!demo && (!communityProfile || profile.communityPresentation === true) ? `<section class="public-profile-section"><header><span><i class="fa-solid fa-wand-magic-sparkles"></i> ОФОРМЛЕННЯ</span><small>Екіпіровано</small></header><div class="public-profile-cosmetics">${cosmeticsMarkup}</div></section><section class="public-profile-section"><header><span><i class="fa-solid fa-gem"></i> ВІТРИНА СКІНІВ</span><small>${showcase.length} / 3</small></header><div class="public-profile-showcase">${showcaseMarkup}</div></section><section class="public-profile-section"><header><span><i class="fa-solid fa-medal"></i> ДОСЯГНЕННЯ</span><small>${achievementCount} / ${ACHIEVEMENT_DEFINITIONS.length}</small></header><div class="public-profile-achievements">${achievementCards || '<p class="public-profile-empty"><i class="fa-solid fa-medal"></i> Ще немає відкритих досягнень</p>'}</div></section>` : ''}
    <p class="public-profile-note"><i class="fa-solid fa-shield-halved"></i>${demo ? ' Це візуальна демонстрація стрічки: дані не належать реальному користувачу.' : communityProfile ? ' Це картка зі спільноти: видно лише вибрані скіни, оформлення та досягнення. Баланс, повний інвентар і Steam ID приховані.' : ' Видимі лише публічні дані: стиль, рамка, титул, вітрина та досягнення. Баланс, повний інвентар і Steam ID приховані.'}</p>
    ${canJoinBattle ? '<button type="button" onclick="joinPublicProfileBattle()" class="public-profile-battle"><i class="fa-solid fa-dice"></i> Приєднатися до 1v1</button>' : ''}
    ${!demo && isOwnProfile && !communityProfile ? '<button type="button" onclick="openOwnBattleRoom()" class="public-profile-battle"><i class="fa-solid fa-dice"></i> Відкрити мою кімнату 1v1</button>' : ''}
    </div>`;
  activePublicProfile = { ...profile, demo };
  openModal('publicProfileModal');
}

async function openPublicProfile(profileId, { fallbackProfile = null } = {}) {
  const id = profileIdFromInput(profileId);
  if (!id) {
    showToast('Встав коректне посилання на профіль.', 'warn');
    return null;
  }
  const content = document.getElementById('publicProfileContent');
  if (content) content.innerHTML = '<div class="public-profile-loading"><i class="fa-solid fa-spinner fa-spin"></i> Завантажуємо профіль…</div>';
  openModal('publicProfileModal');
  try {
    const data = await requestJson(`/api/public-profile?id=${encodeURIComponent(id)}`, {}, 6_000);
    if (!data?.profile) throw new Error('Профіль не знайдено.');
    const profile = !data.profile.avatarUrl && fallbackProfile?.avatarUrl
      ? { ...data.profile, avatarUrl: fallbackProfile.avatarUrl }
      : data.profile;
    renderPublicProfileModal(profile);
    return profile;
  } catch (error) {
    if (content) content.innerHTML = `<div class="public-profile-loading is-error"><i class="fa-solid fa-link-slash"></i>${escapeHtml(error?.message || 'Профіль не знайдено.')}</div>`;
    return null;
  }
}

function openPublicProfileSearch() {
  const input = document.getElementById('publicProfileLookupInput');
  if (input) input.value = '';
  openModal('publicProfileLookupModal');
  window.setTimeout(() => input?.focus(), 0);
}

function submitPublicProfileSearch() {
  const input = document.getElementById('publicProfileLookupInput');
  const id = profileIdFromInput(input?.value);
  if (!id) return showToast('Встав посилання або ID профілю.', 'warn');
  closeModal('publicProfileLookupModal');
  void openPublicProfile(id);
}

function loadFairState() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORAGE.fair) || 'null'); } catch {}
  const audits = Array.isArray(stored?.audits)
    ? stored.audits.filter(audit => audit && /^\d{4}-\d{2}-\d{2}$/.test(String(audit.day || '')) && Number.isSafeInteger(audit.nonce) && Number.isFinite(Number(audit.roll)) && SECRET_PATTERN.test(String(audit.serverSeedHash || ''))).slice(0, 20)
    : [];
  fairState = {
    deviceId: UUID_PATTERN.test(String(stored?.deviceId || '')) ? stored.deviceId : makeUuid(),
    clientSeed: SECRET_PATTERN.test(String(stored?.clientSeed || '')) ? stored.clientSeed : makeRandomSecret(),
    nonce: Math.floor(clampNumber(stored?.nonce, 0, 1_000_000_000, 0)),
    audits
  };
  lastCaseFairAudit = audits.slice(0, 5);
  saveFairState();
}

function saveFairState() {
  if (fairState) localStorage.setItem(STORAGE.fair, JSON.stringify(fairState));
}

function formatSyncTime(timestamp) {
  const time = Number(timestamp);
  if (!Number.isFinite(time) || time <= 0) return 'ще не збережено';
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(time));
}

function setCloudBusy(busy) {
  ['cloudCreateBtn', 'cloudSaveBtn', 'cloudLoadBtn', 'cloudConnectBtn'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = busy;
  });
}

function renderCloudSyncUI() {
  const steamId = currentUser?.steamId || account?.steamId || '';
  const steamLinked = /^\d{17}$/.test(String(steamId));
  const steamReady = steamLinked && steamAccountReady && isSteamAccount(account?.steamAccount, steamId);
  const status = document.getElementById('cloudSyncStatus');
  const details = document.getElementById('cloudSyncDetails');
  const create = document.getElementById('cloudCreateBtn');
  const save = document.getElementById('cloudSaveBtn');
  const load = document.getElementById('cloudLoadBtn');
  const code = document.getElementById('cloudRecoveryBtn');
  const legacyConnect = document.getElementById('cloudConnectLegacyBtn');
  const steamLogin = document.getElementById('steamAccountLoginBtn');
  const steamSave = document.getElementById('steamAccountSaveBtn');
  const steamLoad = document.getElementById('steamAccountLoadBtn');
  const visibilityPanel = document.getElementById('steamProfileVisibilityPanel');
  const visibilityStatus = document.getElementById('steamProfileVisibilityStatus');
  const makePublic = document.getElementById('steamProfilePublicBtn');
  const makePrivate = document.getElementById('steamProfilePrivateBtn');
  const updateVisibility = () => {
    const canChange = steamReady && !isProfileBlocked();
    if (visibilityPanel) visibilityPanel.classList.toggle('hidden', !steamLinked);
    if (visibilityStatus) {
      visibilityStatus.textContent = isProfileHidden() ? 'ПРИХОВАНИЙ' : 'ПУБЛІЧНИЙ';
      visibilityStatus.className = `rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isProfileHidden() ? 'bg-gray-700/70 text-gray-200' : 'bg-emerald-500/15 text-emerald-200'}`;
    }
    if (makePublic) {
      makePublic.disabled = !canChange || !isProfileHidden();
      makePublic.classList.toggle('opacity-50', !isProfileHidden());
    }
    if (makePrivate) {
      makePrivate.disabled = !canChange || isProfileHidden();
      makePrivate.classList.toggle('opacity-50', isProfileHidden());
    }
  };
  if (steamLinked) {
    if (status) status.textContent = steamReady
      ? (steamAccountAutoSyncLastError ? 'Steam-збереження очікує повторної спроби' : 'Steam-акаунт захищає прогрес')
      : 'Підключаємо серверне збереження Steam…';
    if (details) details.textContent = steamReady
      ? `${steamAccountAutoSyncLastError ? 'Попередня копія лишається доступною. ' : ''}Steam ID ${steamId}. Остання синхронізація: ${formatSyncTime(account.steamAccount.updatedAt)}. Сайт і Android автооновлюють цей самий прогрес.`
      : 'Після перевірки Steam ID сайт безпечно завантажить або створить твій серверний прогрес.';
    if (steamLogin) {
      steamLogin.onclick = startSteamLogin;
      steamLogin.innerHTML = '<i class="fa-brands fa-steam mr-1"></i>Прив’язати Steam';
      steamLogin.classList.toggle('hidden', steamReady || steamConnectionState === 'checking' || steamConnectionState === 'syncing');
    }
    if (steamSave) steamSave.classList.toggle('hidden', !steamReady);
    if (steamLoad) steamLoad.classList.toggle('hidden', !steamReady);
    [create, save, load, code, legacyConnect].forEach(button => button?.classList.add('hidden'));
    updateVisibility();
    return;
  }
  if (steamLogin) {
    steamLogin.onclick = startSteamLogin;
    steamLogin.innerHTML = '<i class="fa-brands fa-steam mr-1"></i>Прив’язати Steam';
    steamLogin.classList.remove('hidden');
  }
  if (steamSave) steamSave.classList.add('hidden');
  if (steamLoad) steamLoad.classList.add('hidden');
  if (status) status.textContent = 'Увійди через Steam, щоб увімкнути серверне збереження';
  if (details) details.textContent = 'Твій Steam ID стане ключем до серверного прогресу. Увійди тим самим Steam на сайті чи Android — прогрес синхронізується автоматично.';
  [create, save, load, code, legacyConnect].forEach(button => button?.classList.add('hidden'));
  updateVisibility();
}

function renderFairUI() {
  const audit = fairState?.audits?.[0] || lastCaseFairAudit?.[0];
  const state = document.getElementById('fairStatus');
  const details = document.getElementById('fairDetails');
  const verify = document.getElementById('fairVerifyBtn');
  if (state) state.textContent = audit ? 'Є серверний запис останнього дропа' : 'Серверна перевірка з’явиться після відкриття кейсу';
  if (details) details.textContent = audit
    ? `${audit.caseId || 'Кейс'} · ${audit.day} · nonce #${audit.nonce} · hash ${String(audit.serverSeedHash).slice(0, 12)}…`
    : 'Для локальної розробки без Cloudflare сайт чесно використовує локальну випадковість.';
  if (verify) verify.disabled = !audit || audit.day >= getTodayUtc();
}

async function requestJson(url, options = {}, timeout = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(cleanText(data?.error || 'Сервер не відповів коректно.', 180));
      error.status = response.status;
      error.code = cleanText(data?.code || '', 48);
      error.moderation = data?.moderation;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const PRESENCE_HEARTBEAT_MS = 25_000;
let presenceTrackingStarted = false;
let presenceRequestInFlight = false;

function updateOnlineCounter(online, available = true) {
  const badge = document.getElementById('onlineCounter');
  const count = document.getElementById('onlineCount');
  const dot = document.getElementById('onlineCounterDot');
  const pulse = document.getElementById('onlineCounterPulse');
  if (!badge || !count || !dot || !pulse) return;

  const safeOnline = Number(online);
  const hasCount = available && Number.isSafeInteger(safeOnline) && safeOnline >= 0;
  count.textContent = hasCount ? String(safeOnline) : '—';
  badge.setAttribute('aria-label', hasCount ? `${safeOnline} онлайн` : 'Кількість гравців онлайн тимчасово недоступна');
  badge.title = hasCount
    ? 'Активні браузери за останню хвилину'
    : 'Онлайн тимчасово недоступний — повторюємо синхронізацію';
  badge.classList.toggle('border-emerald-500/30', hasCount);
  badge.classList.toggle('bg-emerald-500/10', hasCount);
  badge.classList.toggle('text-emerald-200', hasCount);
  badge.classList.toggle('border-slate-600/70', !hasCount);
  badge.classList.toggle('bg-slate-800/60', !hasCount);
  badge.classList.toggle('text-slate-300', !hasCount);
  dot.classList.toggle('bg-emerald-400', hasCount);
  dot.classList.toggle('bg-slate-500', !hasCount);
  pulse.classList.toggle('bg-emerald-400', hasCount);
  pulse.classList.toggle('hidden', !hasCount);
}

async function refreshOnlinePresence() {
  if (document.hidden || presenceRequestInFlight || !UUID_PATTERN.test(String(account?.presenceId || ''))) return;
  presenceRequestInFlight = true;
  try {
    const response = await requestJson('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.presenceId })
    }, 5_000);
    if (!Number.isSafeInteger(response?.online) || response.online < 0) throw new Error('Некоректна відповідь онлайну.');
    updateOnlineCounter(response.online);
  } catch {
    updateOnlineCounter(null, false);
  } finally {
    presenceRequestInFlight = false;
  }
}

function startPresenceTracking() {
  if (presenceTrackingStarted) return;
  presenceTrackingStarted = true;
  void refreshOnlinePresence();
  window.setInterval(() => void refreshOnlinePresence(), PRESENCE_HEARTBEAT_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refreshOnlinePresence();
  });
  window.addEventListener('pageshow', () => void refreshOnlinePresence());
}

const CLOUD_PROFILE_MAX_BYTES = 1_700_000;
const CLOUD_INVENTORY_ENCODING = 'compact-v1';
const CLOUD_AUTOSAVE_DEBOUNCE_MS = 8_000;
const CLOUD_AUTOSAVE_MIN_INTERVAL_MS = 18_000;
const CLOUD_AUTOSAVE_RETRY_MS = 45_000;
const STEAM_ACCOUNT_AUTOSAVE_DEBOUNCE_MS = 3_000;
const STEAM_ACCOUNT_AUTOSAVE_MIN_INTERVAL_MS = 8_000;
const STEAM_ACCOUNT_AUTOSAVE_RETRY_MS = 25_000;
// Website and Android intentionally use the same Steam-bound save. A quiet
// periodic revision check lets an already-open client adopt progress made on
// the other device without ever overwriting unsaved local actions.
const STEAM_ACCOUNT_REMOTE_REFRESH_MS = 12_000;
let cloudAutoSyncStarted = false;
let cloudAutoSyncDirty = false;
let cloudAutoSyncTimer = null;
let cloudAutoSyncInFlight = false;
let cloudAutoSyncPending = false;
let cloudAutoSyncVersion = 0;
let cloudAutoSyncLastAt = 0;
let cloudAutoSyncLastError = '';
let steamAccountReady = false;
let steamAccountBootstrapPromise = null;
let steamAccountAutoSyncStarted = false;
let steamAccountAutoSyncDirty = false;
let steamAccountAutoSyncTimer = null;
let steamAccountAutoSyncInFlight = false;
let steamAccountAutoSyncPending = false;
let steamAccountAutoSyncVersion = 0;
let steamAccountAutoSyncLastAt = 0;
let steamAccountAutoSyncLastError = '';
let steamAccountRemoteRefreshInFlight = false;
let steamAccountBootstrapApplyingRemote = false;
let steamAccountPendingLocalSnapshot = null;

function hasSteamIdentity() {
  return /^\d{17}$/.test(String(currentUser?.steamId || account?.steamId || ''));
}

function hasReadySteamAccount() {
  return steamAccountReady && hasSteamIdentity() && isSteamAccount(account?.steamAccount);
}

// The Android bridge restores its Steam session asynchronously. A player may
// tap a case before that request returns; keep a snapshot of any progress
// made in that tiny window so the older server copy cannot erase a fresh drop.
function captureSteamProgressDuringBootstrap() {
  if (!steamAccountBootstrapPromise || steamAccountBootstrapApplyingRemote || !hasSteamIdentity()) return;
  try {
    steamAccountPendingLocalSnapshot = buildSteamAccountSave();
  } catch {
    // The local copy remains available and the next ordinary autosave retries.
  }
}

function compactCloudInventoryItem(item, index = 0) {
  const normalized = normalizeStoredItem(item, index);
  if (!normalized) return null;
  const isSteamItem = Boolean(normalized.steamImported && normalized.steamAssetId && normalized.steamOwnerId);
  return isSteamItem
    ? [1, normalized.steamAssetId, normalized.steamOwnerId, normalized.name, normalized.rarity, normalized.rarityColor, normalized.img, normalized.basePrice, normalized.wear.code, normalized.virtual ? 1 : 0, normalized.exclusive ? 1 : 0, normalized.addedAt, normalized.marketPrice || 0, normalized.marketHashName || '', normalized.marketUpdatedAt || 0, normalized.accountBound ? 1 : 0]
    : [0, normalized.id, normalized.sourceSkinId, normalized.name, normalized.rarity, normalized.rarityColor, normalized.img, normalized.basePrice, normalized.wear.code, normalized.virtual ? 1 : 0, normalized.exclusive ? 1 : 0, normalized.addedAt, normalized.marketPrice || 0, normalized.marketHashName || '', normalized.marketUpdatedAt || 0, normalized.accountBound ? 1 : 0];
}

function expandCloudInventoryItem(record, index = 0) {
  if (!Array.isArray(record) || record.length < 12) return null;
  const [isSteamItem, primaryId, secondaryId, name, rarity, rarityColor, img, basePrice, wearCode, virtual, exclusive, addedAt, marketPrice, marketHashName, marketUpdatedAt, accountBound] = record;
  const steamImported = isSteamItem === 1;
  return normalizeStoredItem({
    id: steamImported ? `steam-copy-${secondaryId}-${primaryId}` : primaryId,
    sourceSkinId: steamImported ? primaryId : secondaryId,
    steamAssetId: steamImported ? primaryId : '',
    steamOwnerId: steamImported ? secondaryId : '',
    steamImported,
    name,
    rarity,
    rarityColor,
    img,
    basePrice,
    marketPrice,
    marketHashName,
    marketUpdatedAt,
    wear: { code: wearCode },
    virtual: virtual !== 0,
    exclusive: exclusive === 1,
    accountBound: accountBound === 1,
    addedAt
  }, index);
}

function buildPortableSave() {
  return {
    version: '7.9.0',
    exportedAt: Date.now(),
    balance: currentUser?.balance ?? 0,
    inventory: userInventory,
    gameState,
    moderation: profileModeration,
    visibility: profileVisibility,
    account: {
      nick: account?.nick || 'Гравець',
      steamId: account?.steamId || null,
      steamProfile: account?.steamProfile || null,
      steamImport: account?.steamImport || null,
      steamImports: account?.steamImports || null,
      publicProfile: isPublicProfileIdentity(account?.publicProfile) ? account.publicProfile : null,
      createdAt: account?.createdAt || Date.now()
    }
  };
}

function buildCloudSave() {
  const portable = buildPortableSave();
  const cloudSave = {
    ...portable,
    version: '7.9.0-cloud',
    inventoryEncoding: CLOUD_INVENTORY_ENCODING,
    inventory: userInventory.map(compactCloudInventoryItem).filter(Boolean)
  };
  const size = new TextEncoder().encode(JSON.stringify(cloudSave)).byteLength;
  if (size > CLOUD_PROFILE_MAX_BYTES) {
    throw new Error('Інвентар завеликий для хмарного профілю. Експортуй резервну копію та звільни місце в інвентарі.');
  }
  return cloudSave;
}

function expandCloudSave(data) {
  if (!data || typeof data !== 'object' || data.inventoryEncoding !== CLOUD_INVENTORY_ENCODING || !Array.isArray(data.inventory)) return data;
  return { ...data, inventory: data.inventory.map(expandCloudInventoryItem).filter(Boolean) };
}

function setSteamAccountMeta(steamId, data = {}) {
  if (!/^\d{17}$/.test(String(steamId || ''))) return;
  account = {
    ...(account || {}),
    steamAccount: {
      steamId: String(steamId),
      revision: Math.max(1, Math.floor(Number(data.revision) || 1)),
      updatedAt: clampNumber(data.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now())
    }
  };
}

async function requestSteamAccount(action, { payload, revision, hidden, confirmation, keepalive = false } = {}) {
  const options = action === 'load'
    ? { method: 'GET', credentials: 'same-origin', cache: 'no-store' }
    : {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, revision, hidden, confirmation }),
      ...(keepalive ? { keepalive: true } : {})
    };
  return requestJson('/api/steam/account', options, 12_000);
}

function clearLocalGameDataAfterAccountDeletion() {
  Object.values(STORAGE).forEach(key => {
    try { localStorage.removeItem(key); } catch {}
  });
  try { localStorage.removeItem('potuzhno_mobile_access_v1'); } catch {}
  try { localStorage.removeItem('potuzhno_mobile_auth_verifier_v1'); } catch {}
  window.PotuzhnoMobile?.clearSteamSession?.();
}

async function deleteSteamAccount() {
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  if (!/^\d{17}$/.test(steamId)) {
    showToast('Спочатку увійди через Steam.', 'warn');
    return;
  }
  const approved = window.confirm('Видалити Steam-акаунт, віртуальний інвентар, прогрес, публічний профіль і запис у рейтингу? Це неможливо скасувати.');
  if (!approved) return;
  const deleteButton = document.getElementById('steamAccountDeleteBtn');
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Видаляємо…';
  }
  try {
    await requestSteamAccount('delete', { confirmation: 'DELETE' });
    clearLocalGameDataAfterAccountDeletion();
    window.location.replace('account-delete.html?deleted=1');
  } catch (error) {
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = '<i class="fa-solid fa-trash-can mr-1"></i>Видалити акаунт і прогрес';
    }
    showToast(error?.message || 'Не вдалося видалити акаунт. Спробуй ще раз.', 'error');
  }
}

function buildSteamAccountSave() {
  const snapshot = buildCloudSave();
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  if (!/^\d{17}$/.test(steamId)) throw new Error('Steam-акаунт не підтверджено.');
  return {
    ...snapshot,
    version: '7.9.0-steam',
    account: {
      ...snapshot.account,
      steamId,
      steamProfile: normalizeSteamProfile(currentUser?.steamProfile || account?.steamProfile, steamId)
    }
  };
}

async function createSteamAccount({ silent = false } = {}) {
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  if (!/^\d{17}$/.test(steamId)) return false;
  try {
    const data = await requestSteamAccount('create', { payload: buildSteamAccountSave() });
    setSteamAccountMeta(steamId, data);
    steamAccountAutoSyncLastAt = Date.now();
    steamAccountAutoSyncLastError = '';
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
    renderCloudSyncUI();
    if (!silent) showToast('Прогрес прив’язано до Steam-акаунта.', 'success');
    return true;
  } catch (error) {
    if (!silent) showToast(error?.message || 'Не вдалося створити Steam-збереження.', 'error');
    return false;
  }
}

async function loadSteamAccount({ silent = false } = {}) {
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  if (!/^\d{17}$/.test(steamId)) {
    if (!silent) startSteamLogin();
    return false;
  }
  const profile = normalizeSteamProfile(currentUser?.steamProfile || account?.steamProfile, steamId) || fallbackSteamProfile(steamId);
  try {
    const data = await requestSteamAccount('load');
    applyPortableSave(data.payload, { skipCloudAutoSync: true, skipSteamAutoSync: true });
    // A stored game snapshot is never allowed to replace the Steam identity
    // that has just been verified by the server session.
    applySteamIdentity(steamId, profile, { skipAutoSync: true });
    setSteamAccountMeta(steamId, data);
    steamAccountAutoSyncLastAt = Date.now();
    steamAccountAutoSyncLastError = '';
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
    renderCloudSyncUI();
    if (!silent) showToast('Прогрес відновлено зі Steam-акаунта.', 'success');
    return true;
  } catch (error) {
    if (!silent) showToast(error?.message || 'Не вдалося завантажити Steam-прогрес.', 'error');
    throw error;
  }
}

async function refreshSteamAccountFromServer({ announce = false } = {}) {
  // A local action always wins until it reaches the server. Pulling while the
  // client is dirty could silently replace a case opening, sale or reward
  // that is waiting for its autosave window.
  if (!hasReadySteamAccount() || steamAccountAutoSyncDirty || steamAccountAutoSyncInFlight || steamAccountRemoteRefreshInFlight) return false;
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  if (!/^\d{17}$/.test(steamId)) return false;
  steamAccountRemoteRefreshInFlight = true;
  try {
    const data = await requestSteamAccount('load');
    const localRevision = Number(account?.steamAccount?.revision || 0);
    const remoteRevision = Number(data?.revision || 0);
    if (!Number.isSafeInteger(remoteRevision) || remoteRevision <= localRevision) return false;

    const profile = normalizeSteamProfile(currentUser?.steamProfile || account?.steamProfile, steamId) || fallbackSteamProfile(steamId);
    applyPortableSave(data.payload, { skipCloudAutoSync: true, skipSteamAutoSync: true });
    // Keep the identity verified by this device's current Steam session even
    // if a very old stored snapshot contains an obsolete profile picture.
    applySteamIdentity(steamId, profile, { skipAutoSync: true });
    setSteamAccountMeta(steamId, data);
    steamAccountAutoSyncLastAt = Date.now();
    steamAccountAutoSyncLastError = '';
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
    renderCloudSyncUI();
    void syncCommunity();
    if (announce) showToast('Прогрес синхронізовано з іншого пристрою.', 'info');
    return true;
  } catch {
    // This is a background convenience check. A temporary network failure
    // must not make gameplay look broken or replace the last good local copy.
    return false;
  } finally {
    steamAccountRemoteRefreshInFlight = false;
  }
}

async function saveSteamAccount({ silent = false, keepalive = false } = {}) {
  if (!hasReadySteamAccount()) {
    if (!silent) showToast('Зачекай, доки Steam-акаунт підключиться.', 'info');
    return false;
  }
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  try {
    const body = buildSteamAccountSave();
    const data = await requestSteamAccount('save', {
      payload: body,
      revision: Number(account.steamAccount.revision),
      keepalive: keepalive && new TextEncoder().encode(JSON.stringify(body)).byteLength <= 60_000
    });
    setSteamAccountMeta(steamId, data);
    applyServerReferralProgress(data?.referral);
    steamAccountAutoSyncLastAt = Date.now();
    steamAccountAutoSyncLastError = '';
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
    renderCloudSyncUI();
    if (!silent) showToast('Прогрес збережено у Steam-акаунті.', 'success');
    return true;
  } catch (error) {
    if (error?.code === 'player_blocked') {
      setProfileModeration(error.moderation);
      steamAccountAutoSyncDirty = false;
      steamAccountAutoSyncLastError = '';
      renderCloudSyncUI();
      if (!silent) showToast(error?.message || 'Профіль заблоковано.', 'warn');
      return false;
    }
    if (error?.status === 409) {
      steamAccountAutoSyncLastError = 'Є новіша версія на іншому пристрої';
      steamAccountAutoSyncDirty = false;
      renderCloudSyncUI();
      // Saving is optimistic. If another device won the revision race, adopt
      // its copy immediately after the in-flight save has released its lock.
      window.setTimeout(() => void refreshSteamAccountFromServer({ announce: true }), 0);
      if (!silent) showToast('На іншому пристрої є новіший прогрес. Завантажуємо актуальну копію…', 'info');
      return false;
    }
    steamAccountAutoSyncLastError = 'Steam-збереження тимчасово недоступне';
    renderCloudSyncUI();
    if (!silent) showToast(error?.message || 'Не вдалося зберегти Steam-прогрес.', 'error');
    return false;
  }
}

async function setSteamProfileVisibility(hidden) {
  if (!hasReadySteamAccount()) {
    showToast('Спочатку дочекайся підключення Steam-акаунта.', 'info');
    return false;
  }
  const nextHidden = hidden === true;
  if (nextHidden === isProfileHidden()) return true;
  const steamId = String(currentUser?.steamId || account?.steamId || '');
  try {
    const data = await requestSteamAccount('set-visibility', { hidden: nextHidden });
    setProfileVisibility({ hidden: nextHidden, updatedAt: data.updatedAt || Date.now() });
    setSteamAccountMeta(steamId, data);
    steamAccountAutoSyncLastError = '';
    if (nextHidden && account?.publicProfile?.enabled) await unpublishPublicProfile({ announce: false });
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
    renderCloudSyncUI();
    // A forced heartbeat immediately replaces any older public entry on the
    // server. Later periodic syncs stay off while the profile is hidden.
    void syncCommunity(null, null, null, { force: true });
    showToast(nextHidden
      ? 'Профіль приховано з рейтингу, стрічки та пошуку.'
      : 'Профіль знову видно у спільноті.', 'success');
    return true;
  } catch (error) {
    showToast(error?.message || 'Не вдалося змінити видимість профілю.', 'error');
    return false;
  }
}

async function bootstrapSteamAccount(profile, { announce = false } = {}) {
  const steamId = String(profile?.steamId || currentUser?.steamId || account?.steamId || '');
  if (!/^\d{17}$/.test(steamId)) return false;
  if (steamAccountBootstrapPromise) return steamAccountBootstrapPromise;
  steamAccountReady = false;
  renderCloudSyncUI();
  steamAccountBootstrapPromise = (async () => {
    const loadServerProgress = async () => {
      steamAccountBootstrapApplyingRemote = true;
      try {
        return await loadSteamAccount({ silent: true });
      } finally {
        steamAccountBootstrapApplyingRemote = false;
      }
    };
    const restoreLocalProgressMadeDuringBootstrap = () => {
      const pending = steamAccountPendingLocalSnapshot;
      steamAccountPendingLocalSnapshot = null;
      if (!pending) return false;

      const serverMeta = account?.steamAccount;
      const serverProfile = normalizeSteamProfile(currentUser?.steamProfile || account?.steamProfile, steamId) || fallbackSteamProfile(steamId);
      applyPortableSave(pending, { skipCloudAutoSync: true, skipSteamAutoSync: true });
      applySteamIdentity(steamId, serverProfile, { skipAutoSync: true });
      if (serverMeta) setSteamAccountMeta(steamId, serverMeta);
      return true;
    };
    try {
      await loadServerProgress();
      const hasPendingLocalProgress = restoreLocalProgressMadeDuringBootstrap();
      steamAccountReady = true;
      startSteamAccountAutoSync();
      if (hasPendingLocalProgress) {
        steamAccountAutoSyncDirty = true;
        steamAccountAutoSyncVersion += 1;
        scheduleSteamAccountAutoSync({ urgent: true });
      }
      renderCloudSyncUI();
      if (announce) showToast('Steam-акаунт підключено: прогрес доступний на будь-якому пристрої.', 'success');
      return true;
    } catch (error) {
      if (error?.status !== 404) throw error;
      const created = await createSteamAccount({ silent: true });
      // Two fresh tabs can complete Steam login together. In that case the
      // second create is rejected, then safely adopts the first saved copy.
      if (!created) await loadServerProgress();
      const hasPendingLocalProgress = restoreLocalProgressMadeDuringBootstrap();
      steamAccountReady = true;
      startSteamAccountAutoSync();
      if (hasPendingLocalProgress) {
        steamAccountAutoSyncDirty = true;
        steamAccountAutoSyncVersion += 1;
        scheduleSteamAccountAutoSync({ urgent: true });
      }
      renderCloudSyncUI();
      if (announce) showToast('Steam-акаунт створено: цей прогрес тепер прив’язаний до Steam.', 'success');
      return true;
    }
  })().catch(error => {
    steamAccountReady = false;
    steamAccountAutoSyncLastError = error?.message || 'Steam-збереження тимчасово недоступне';
    renderCloudSyncUI();
    if (announce) showToast(steamAccountAutoSyncLastError, 'warn');
    return false;
  }).finally(() => {
    steamAccountBootstrapPromise = null;
  });
  return steamAccountBootstrapPromise;
}

function applyPortableSave(data, { skipCloudAutoSync = false, skipSteamAutoSync = false } = {}) {
  const portable = expandCloudSave(data);
  if (!portable || typeof portable !== 'object' || !Array.isArray(portable.inventory) || !portable.gameState || typeof portable.gameState !== 'object') {
    throw new Error('Bad format');
  }
  setProfileModeration(portable.moderation);
  setProfileVisibility(portable.visibility);
  userInventory = portable.inventory.map((item, index) => normalizeStoredItem(item, index)).filter(Boolean);

  const defaults = createDefaultGameState();
  gameState = {
    ...defaults,
    ...portable.gameState,
    stats: { ...defaults.stats, ...(portable.gameState.stats || {}) },
    daily: { ...createDefaultDaily(), ...(portable.gameState.daily || {}) },
    weekly: { ...createDefaultWeekly(), ...(portable.gameState.weekly || {}) },
    powerRun: { ...createDefaultPowerRun(), ...(portable.gameState.powerRun || {}) },
    halloweenEvent: { ...createDefaultHalloweenEvent(), ...(portable.gameState.halloweenEvent || {}) },
    winterEvent: { ...createDefaultWinterEvent(), ...(portable.gameState.winterEvent || {}) },
    signalSeason: { ...createDefaultSignalSeason(), ...(portable.gameState.signalSeason || {}) },
    seasonalCosmetics: { ...createDefaultSeasonalCosmetics(), ...(portable.gameState.seasonalCosmetics || {}) },
    // Cloud saves from earlier releases could preserve numeric or no-longer
    // existing inventory IDs here. Convert and validate them against the
    // restored inventory before the profile UI reads the showcase.
    showcase: normalizeShowcaseIds(portable.gameState.showcase, userInventory),
    pulseCircuit: { ...createDefaultPulseCircuit(), ...(portable.gameState.pulseCircuit || {}) },
    targetArena: { ...createDefaultTargetArena(), ...(portable.gameState.targetArena || {}) },
    allTime: { ...createDefaultAllTime(), ...(portable.gameState.allTime || {}) },
    performanceMode: portable.gameState.performanceMode === 'lite' ? 'lite' : 'auto',
    collectionRewards: portable.gameState.collectionRewards || {},
    caseCollectionTrophies: portable.gameState.caseCollectionTrophies && typeof portable.gameState.caseCollectionTrophies === 'object' ? portable.gameState.caseCollectionTrophies : {}
  };
  const savedCloud = isCloudProfile(account?.cloud) ? account.cloud : null;
  const savedPublicProfile = isPublicProfileIdentity(account?.publicProfile) ? account.publicProfile : null;
  if (portable.account && typeof portable.account === 'object') {
    const restoredSteamId = /^\d{17}$/.test(String(portable.account.steamId || '')) ? String(portable.account.steamId) : account?.steamId;
    const restoredProfile = normalizeSteamProfile(portable.account.steamProfile, restoredSteamId);
    const restoredImports = normalizeSteamImportMap(portable.account.steamImports, portable.account.steamImport);
    const mergedImports = { ...getSteamImportMap(), ...restoredImports };
    const restoredImport = mergedImports[restoredSteamId] || null;
    const preservedProfile = account?.steamProfile?.steamId === restoredSteamId ? account.steamProfile : null;
    account = {
      ...account,
      nick: cleanText(portable.account.nick || account?.nick || 'Гравець', 24),
      steamId: restoredSteamId,
      steamProfile: restoredProfile || preservedProfile,
      steamImports: mergedImports,
      steamImport: restoredImport,
      publicProfile: isPublicProfileIdentity(portable.account.publicProfile) ? portable.account.publicProfile : savedPublicProfile,
      createdAt: clampNumber(portable.account.createdAt, 0, Number.MAX_SAFE_INTEGER, account?.createdAt || Date.now())
    };
  }
  if (savedCloud) account.cloud = savedCloud;
  if (!isPublicProfileIdentity(account?.publicProfile)) {
    account.publicProfile = savedPublicProfile || { id: makeUuid(), writeKey: makeRandomSecret(32), enabled: false, updatedAt: 0 };
  }
  if (currentUser) {
    const profile = normalizeSteamProfile(account?.steamProfile, account?.steamId);
    currentUser = {
      ...currentUser,
      steamId: profile?.steamId || account?.steamId || null,
      name: profile?.name || account?.nick || currentUser.name,
      avatar: profile?.avatar || '',
      steamProfile: profile,
      balance: clampNumber(portable.balance, 0, MAX_STORED_BALANCE, currentUser.balance)
    };
  }
  migrateToUsdEconomy();
  migrateToStableEconomy();
  ensureDailyState();
  ensureWeeklyState();
  applyPerformanceMode();
  saveState({ skipCloudAutoSync, skipSteamAutoSync });
  updateBalanceUI();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  applyLoggedInUI();
  renderGameHub();
  updateAccountUI();
}

async function createCloudProfile({ silent = false, keepalive = false } = {}) {
  if (isCloudProfile(account?.cloud)) return true;
  const cloud = { id: makeUuid(), recoveryCode: makeRandomSecret(32), updatedAt: 0, revision: 0 };
  if (!silent) setCloudBusy(true);
  try {
    const body = JSON.stringify({ action: 'create', accountId: cloud.id, recoveryCode: cloud.recoveryCode, payload: buildCloudSave() });
    const canKeepAlive = keepalive && new TextEncoder().encode(body).byteLength <= 60_000;
    const data = await requestJson('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      ...(canKeepAlive ? { keepalive: true } : {})
    });
    account.cloud = { ...cloud, updatedAt: Number(data.updatedAt) || Date.now(), revision: Number(data.revision) || 1 };
    cloudAutoSyncLastError = '';
    saveState({ skipCloudAutoSync: true });
    void syncCommunity();
    renderCloudSyncUI();
    if (!silent) {
      openCloudRecoveryModal();
      showToast('Серверний профіль створено. Збережи код відновлення.', 'success');
    }
    return true;
  } catch (error) {
    if (!silent) showToast(error?.message || 'Не вдалося створити серверний профіль.', 'error');
    return false;
  } finally {
    if (!silent) setCloudBusy(false);
  }
}

async function saveCloudProfile({ silent = false, keepalive = false } = {}) {
  if (!isCloudProfile(account?.cloud)) {
    if (!silent) openCloudConnectModal();
    return false;
  }
  if (!silent) setCloudBusy(true);
  try {
    const body = JSON.stringify({
      action: 'save',
      accountId: account.cloud.id,
      recoveryCode: account.cloud.recoveryCode,
      revision: Number(account.cloud.revision) || 1,
      payload: buildCloudSave()
    });
    const canKeepAlive = keepalive && new TextEncoder().encode(body).byteLength <= 60_000;
    const data = await requestJson('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      ...(canKeepAlive ? { keepalive: true } : {})
    });
    account.cloud.updatedAt = Number(data.updatedAt) || Date.now();
    account.cloud.revision = Number(data.revision) || (Number(account.cloud.revision) || 1) + 1;
    cloudAutoSyncLastError = '';
    saveState({ skipCloudAutoSync: true });
    renderCloudSyncUI();
    if (!silent) showToast('Прогрес збережено на сервері.', 'success');
    return true;
  } catch (error) {
    if (error?.code === 'player_blocked') {
      setProfileModeration(error.moderation);
      cloudAutoSyncDirty = false;
      cloudAutoSyncLastError = '';
    }
    if (!silent) showToast(error?.message || 'Не вдалося синхронізувати профіль.', 'error');
    return false;
  } finally {
    if (!silent) setCloudBusy(false);
  }
}

async function loadCloudProfile({ silent = false } = {}) {
  if (!isCloudProfile(account?.cloud)) {
    if (!silent) openCloudConnectModal();
    return false;
  }
  if (!silent) setCloudBusy(true);
  try {
    const data = await requestJson('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load', accountId: account.cloud.id, recoveryCode: account.cloud.recoveryCode })
    });
    applyPortableSave(data.payload, { skipCloudAutoSync: true });
    account.cloud.updatedAt = Number(data.updatedAt) || account.cloud.updatedAt;
    account.cloud.revision = Number(data.revision) || 1;
    cloudAutoSyncLastError = '';
    saveState({ skipCloudAutoSync: true });
    renderCloudSyncUI();
    if (!silent) showToast('Прогрес відновлено із серверного профілю.', 'success');
    return true;
  } catch (error) {
    if (!silent) showToast(error?.message || 'Не вдалося відновити профіль.', 'error');
    return false;
  } finally {
    if (!silent) setCloudBusy(false);
  }
}

function scheduleCloudAutoSync({ urgent = false, delay = null } = {}) {
  if (!cloudAutoSyncStarted || !cloudAutoSyncDirty || !account || hasSteamIdentity()) return;
  if (cloudAutoSyncTimer) window.clearTimeout(cloudAutoSyncTimer);
  const elapsed = Date.now() - cloudAutoSyncLastAt;
  const intervalDelay = urgent ? 0 : Math.max(CLOUD_AUTOSAVE_DEBOUNCE_MS, CLOUD_AUTOSAVE_MIN_INTERVAL_MS - elapsed);
  const wait = Number.isFinite(delay) ? Math.max(0, delay) : intervalDelay;
  cloudAutoSyncTimer = window.setTimeout(() => {
    cloudAutoSyncTimer = null;
    void syncCloudProfileAutomatically({ finalAttempt: urgent });
  }, wait);
}

function queueCloudAutoSync() {
  if (!cloudAutoSyncStarted || !account || hasSteamIdentity()) return;
  cloudAutoSyncDirty = true;
  cloudAutoSyncVersion += 1;
  scheduleCloudAutoSync();
}

async function syncCloudProfileAutomatically({ finalAttempt = false } = {}) {
  if (!cloudAutoSyncStarted || !cloudAutoSyncDirty || !account) return false;
  if (hasSteamIdentity()) {
    cloudAutoSyncDirty = false;
    return false;
  }
  if (cloudAutoSyncInFlight) {
    cloudAutoSyncPending = true;
    return false;
  }

  cloudAutoSyncInFlight = true;
  const snapshotVersion = cloudAutoSyncVersion;
  let synced = false;
  try {
    synced = isCloudProfile(account?.cloud)
      ? await saveCloudProfile({ silent: true, keepalive: finalAttempt })
      : await createCloudProfile({ silent: true, keepalive: finalAttempt });
    if (synced) {
      cloudAutoSyncLastAt = Date.now();
      cloudAutoSyncLastError = '';
      if (cloudAutoSyncVersion === snapshotVersion) cloudAutoSyncDirty = false;
      renderCloudSyncUI();
      return true;
    }
    cloudAutoSyncLastError = 'Сервер тимчасово недоступний';
    return false;
  } finally {
    cloudAutoSyncInFlight = false;
    if (cloudAutoSyncPending) {
      cloudAutoSyncPending = false;
      scheduleCloudAutoSync({ urgent: finalAttempt });
    } else if (!synced && cloudAutoSyncDirty) {
      scheduleCloudAutoSync({ delay: CLOUD_AUTOSAVE_RETRY_MS });
    } else if (cloudAutoSyncDirty) {
      scheduleCloudAutoSync();
    }
  }
}

function startCloudAutoSync() {
  if (cloudAutoSyncStarted) return;
  renderCloudSyncUI();
  if (hasSteamIdentity()) return;
  cloudAutoSyncStarted = true;
  queueCloudAutoSync();

  const refreshFromAdminChange = () => {
    if (!isCloudProfile(account?.cloud)) return;
    try {
      const change = JSON.parse(localStorage.getItem(STORAGE.adminProfileRefresh) || 'null');
      if (change?.accountId !== account.cloud.id || Number(change?.revision) <= Number(account.cloud.revision || 0)) return;
      void loadCloudProfile({ silent: true }).then(loaded => {
        if (loaded) showToast('Профіль оновлено адміністрацією.', isProfileBlocked() ? 'warn' : 'info');
      });
    } catch {}
  };

  window.addEventListener('storage', event => {
    if (event.key === STORAGE.adminProfileRefresh) refreshFromAdminChange();
  });
  window.addEventListener('pageshow', refreshFromAdminChange);
  refreshFromAdminChange();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && cloudAutoSyncDirty) void syncCloudProfileAutomatically({ finalAttempt: true });
  });
  window.addEventListener('pagehide', () => {
    if (cloudAutoSyncDirty) void syncCloudProfileAutomatically({ finalAttempt: true });
  });
}

function scheduleSteamAccountAutoSync({ urgent = false, delay = null } = {}) {
  if (!hasReadySteamAccount() || !steamAccountAutoSyncDirty) return;
  if (steamAccountAutoSyncTimer) window.clearTimeout(steamAccountAutoSyncTimer);
  const elapsed = Date.now() - steamAccountAutoSyncLastAt;
  const intervalDelay = urgent ? 0 : Math.max(STEAM_ACCOUNT_AUTOSAVE_DEBOUNCE_MS, STEAM_ACCOUNT_AUTOSAVE_MIN_INTERVAL_MS - elapsed);
  const wait = Number.isFinite(delay) ? Math.max(0, delay) : intervalDelay;
  steamAccountAutoSyncTimer = window.setTimeout(() => {
    steamAccountAutoSyncTimer = null;
    void syncSteamAccountAutomatically({ finalAttempt: urgent });
  }, wait);
}

function queueSteamAccountAutoSync() {
  if (!hasReadySteamAccount()) return;
  steamAccountAutoSyncDirty = true;
  steamAccountAutoSyncVersion += 1;
  scheduleSteamAccountAutoSync();
}

async function syncSteamAccountAutomatically({ finalAttempt = false } = {}) {
  if (!hasReadySteamAccount() || !steamAccountAutoSyncDirty) return false;
  if (steamAccountAutoSyncInFlight) {
    steamAccountAutoSyncPending = true;
    return false;
  }
  steamAccountAutoSyncInFlight = true;
  const snapshotVersion = steamAccountAutoSyncVersion;
  let synced = false;
  try {
    synced = await saveSteamAccount({ silent: true, keepalive: finalAttempt });
    if (synced) {
      steamAccountAutoSyncLastAt = Date.now();
      steamAccountAutoSyncLastError = '';
      if (steamAccountAutoSyncVersion === snapshotVersion) steamAccountAutoSyncDirty = false;
      renderCloudSyncUI();
      return true;
    }
    return false;
  } finally {
    steamAccountAutoSyncInFlight = false;
    if (steamAccountAutoSyncPending) {
      steamAccountAutoSyncPending = false;
      scheduleSteamAccountAutoSync({ urgent: finalAttempt });
    } else if (!synced && steamAccountAutoSyncDirty && !/іншому пристрої/i.test(steamAccountAutoSyncLastError)) {
      scheduleSteamAccountAutoSync({ delay: STEAM_ACCOUNT_AUTOSAVE_RETRY_MS });
    } else if (steamAccountAutoSyncDirty) {
      scheduleSteamAccountAutoSync();
    }
  }
}

function startSteamAccountAutoSync() {
  if (steamAccountAutoSyncStarted) return;
  steamAccountAutoSyncStarted = true;
  const refreshFromAdminChange = () => {
    if (!hasReadySteamAccount()) return;
    try {
      const change = JSON.parse(localStorage.getItem(STORAGE.adminGameRefresh) || 'null');
      const steamId = String(currentUser?.steamId || account?.steamId || '');
      if (change?.accountId !== steamId || Number(change?.revision) <= Number(account?.steamAccount?.revision || 0)) return;
      void loadSteamAccount({ silent: true }).then(loaded => {
        if (loaded) showToast('Steam-профіль оновлено адміністрацією.', isProfileBlocked() ? 'warn' : 'info');
      });
    } catch {}
  };
  const refreshFromOtherDevice = () => {
    if (!hasReadySteamAccount() || steamAccountAutoSyncDirty) return;
    void refreshSteamAccountFromServer({ announce: true });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && steamAccountAutoSyncDirty) void syncSteamAccountAutomatically({ finalAttempt: true });
    if (!document.hidden) {
      refreshFromAdminChange();
      refreshFromOtherDevice();
    }
  });
  window.addEventListener('pagehide', () => {
    if (steamAccountAutoSyncDirty) void syncSteamAccountAutomatically({ finalAttempt: true });
  });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE.adminGameRefresh) refreshFromAdminChange();
  });
  window.addEventListener('pageshow', () => {
    refreshFromAdminChange();
    refreshFromOtherDevice();
  });
  window.setInterval(() => {
    if (!document.hidden) refreshFromOtherDevice();
  }, STEAM_ACCOUNT_REMOTE_REFRESH_MS);
  refreshFromAdminChange();
  refreshFromOtherDevice();
}

function openCloudRecoveryModal() {
  if (!isCloudProfile(account?.cloud)) return;
  const id = document.getElementById('cloudRecoveryAccountId');
  const code = document.getElementById('cloudRecoveryCode');
  if (id) id.textContent = account.cloud.id;
  if (code) code.textContent = account.cloud.recoveryCode;
  openModal('cloudRecoveryModal');
}

async function copyCloudRecoveryCode() {
  if (!isCloudProfile(account?.cloud)) return;
  try {
    await navigator.clipboard.writeText(`ПОТУЖНО DROP\nID: ${account.cloud.id}\nКод: ${account.cloud.recoveryCode}`);
    showToast('Дані відновлення скопійовано.', 'success');
  } catch {
    showToast('Скопіюй ID і код вручну.', 'warn');
  }
}

function openCloudConnectModal() {
  openModal('cloudConnectModal');
}

async function connectCloudProfile() {
  const id = String(document.getElementById('cloudConnectId')?.value || '').trim();
  const recoveryCode = String(document.getElementById('cloudConnectCode')?.value || '').trim();
  if (!UUID_PATTERN.test(id) || !SECRET_PATTERN.test(recoveryCode)) {
    showToast('Введи коректні ID профілю та код відновлення.', 'warn');
    return;
  }
  const previousCloud = account?.cloud;
  account.cloud = { id, recoveryCode, updatedAt: 0, revision: 0 };
  const loaded = await loadCloudProfile();
  if (loaded) {
    closeModal('cloudConnectModal');
  } else {
    account.cloud = previousCloud;
    saveState();
    renderCloudSyncUI();
  }
}

async function sha256Hex(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function getVerifiedCaseRoll(caseId, nonce) {
  const proof = `${fairState.clientSeed}:${fairState.deviceId}:${nonce}:${caseId}`;
  const data = await requestJson('/api/fair/roll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: fairState.deviceId, clientSeed: fairState.clientSeed, caseId, nonce })
  });
  const roll = Number(data?.roll);
  const wearRoll = Number(data?.wearRoll);
  if (data?.nonce !== nonce || data?.proof !== proof || !/^\d{4}-\d{2}-\d{2}$/.test(String(data?.day || '')) || !SECRET_PATTERN.test(String(data?.serverSeedHash || '')) || !Number.isFinite(roll) || roll < 0 || roll >= 1 || !Number.isFinite(wearRoll) || wearRoll < 0 || wearRoll >= 1) {
    throw new Error('Сервер повернув неперевірюваний раунд.');
  }
  return { roll, wearRoll, audit: { caseId, day: data.day, nonce, roll, wearRoll, serverSeedHash: data.serverSeedHash, proof, at: Date.now() } };
}

async function getCaseRolls(caseId, count) {
  const nonces = Array.from({ length: count }, () => fairState.nonce++);
  saveFairState();
  const attempts = await Promise.allSettled(nonces.map(nonce => getVerifiedCaseRoll(caseId, nonce)));
  const hasFailedRequest = attempts.some(result => result.status === 'rejected');
  const isLocalDevelopment = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);

  // A production case must never be resolved with an unverifiable browser roll.
  // Keeping the fallback exclusively for local UI work also makes a Worker outage
  // recoverable: startCaseReel restores the balance/cooldown before showing an error.
  if (hasFailedRequest && !isLocalDevelopment) {
    lastCaseFairAudit = [];
    renderFairUI();
    throw new Error('Не вдалося підтвердити серверний раунд.');
  }

  const rolls = attempts.map(result => result.status === 'fulfilled'
    ? result.value
    : { roll: Math.random(), wearRoll: Math.random(), audit: null });
  const audits = rolls.map(result => result.audit).filter(Boolean);
  lastCaseFairAudit = audits;
  if (audits.length) {
    fairState.audits = [...audits.reverse(), ...(fairState.audits || [])].slice(0, 20);
    saveFairState();
  }
  renderFairUI();
  return { rolls, verified: audits.length === count };
}

async function calculateHmacRoll(serverSeed, proof) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(serverSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(proof));
  const view = new DataView(signature);
  return { roll: view.getUint32(0, false) / 0x1_0000_0000, wearRoll: view.getUint32(4, false) / 0x1_0000_0000 };
}

async function verifyLastFairRound() {
  const audit = fairState?.audits?.[0] || lastCaseFairAudit?.[0];
  if (!audit) return showToast('Ще немає серверного раунду для перевірки.', 'warn');
  if (audit.day >= getTodayUtc()) return showToast('Поточний seed розкриється наступного дня.', 'info');
  try {
    const data = await requestJson(`/api/fair/verify?day=${encodeURIComponent(audit.day)}`);
    const seedHash = await sha256Hex(String(data.serverSeed || ''));
    const calculated = await calculateHmacRoll(String(data.serverSeed || ''), audit.proof);
    if (seedHash !== audit.serverSeedHash || Math.abs(calculated.roll - Number(audit.roll)) > 1e-12 || Math.abs(calculated.wearRoll - Number(audit.wearRoll)) > 1e-12) {
      throw new Error('Перевірка не збіглася.');
    }
    showToast(`Раунд #${audit.nonce} підтверджено: hash і HMAC збігаються.`, 'success');
  } catch (error) {
    showToast(error?.message || 'Неможливо перевірити раунд.', 'error');
  }
}

function updatePrestigeUI() {
  const p = gameState?.prestige || 0;
  const badge = document.getElementById('prestigeBadge');
  const lbl = document.getElementById('prestigeLevelLabel');
  if (badge && lbl) {
    if (p > 0) {
      badge.classList.remove('hidden');
      lbl.textContent = `P${p}`;
    } else {
      badge.classList.add('hidden');
    }
  }
  const multi = document.getElementById('xpMultiplierLabel');
  if (multi) multi.textContent = p > 0 ? `(x${getXpMultiplier().toFixed(2)})` : '';
  const cl = document.getElementById('prestigeCurLevel');
  if (cl) cl.textContent = String(getPlayerLevel());
  const cp = document.getElementById('prestigeCurPrestige');
  if (cp) cp.textContent = `P${p}`;
  const btn = document.getElementById('prestigeConfirmBtn');
  if (btn) btn.disabled = getPlayerLevel() < PRESTIGE_LEVEL_REQUIRED;
  const pBtn = document.getElementById('prestigeBtn');
  if (pBtn) pBtn.disabled = getPlayerLevel() < PRESTIGE_LEVEL_REQUIRED;
}

function getSkinPreviewType(name) {
  const v = String(name || '').toLowerCase();
  if (/(knife|bayonet|karambit|daggers|falchion|bowie|butterfly|navaja|kukri|talon|stiletto|ursus|nomad|paracord|skeleton)/.test(v)) return 'KNIFE';
  if (/glove|wraps|hydra/.test(v)) return 'GLOVES';
  if (/(awp|ssg 08|g3sg1|scar-20)/.test(v)) return 'SNIPER';
  if (/(ak-47|m4a|m4a1|galil|famas|aug|sg 553)/.test(v)) return 'RIFLE';
  if (/(glock|usp|p2000|deagle|revolver|tec-9|five-seven|cz75|dual berettas|p250)/.test(v)) return 'PISTOL';
  if (/(mp9|mac-10|ump-45|p90|mp7|mp5)/.test(v)) return 'SMG';
  return 'CS2';
}

function createSkinPreview(name) {
  const title = String(name || 'CS2 Skin');
  const seed = [...title].reduce((t, c) => t + c.charCodeAt(0), 0);
  const palettes = [
    ['#f59e0b', '#7c2d12'],
    ['#38bdf8', '#1d4ed8'],
    ['#f472b6', '#831843'],
    ['#a78bfa', '#4c1d95'],
    ['#34d399', '#065f46'],
    ['#fb7185', '#9f1239']
  ];
  const [bright, dark] = palettes[seed % palettes.length];
  const type = getSkinPreviewType(title);
  const design = title.includes('|') ? title.split('|').slice(1).join('|').trim() : title;
  const glyph = type === 'KNIFE' ? '◆' : type === 'GLOVES' ? '✦' : type === 'SNIPER' ? '◎' : type === 'RIFLE' ? '▰' : type === 'PISTOL' ? '◖' : type === 'SMG' ? '▱' : '✹';
  const safe = escapeSvgText(design.slice(0, 20));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bright}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><rect width="320" height="200" rx="22" fill="#111722"/><path d="M-20 175L135 20 340 76 340 220H-20z" fill="url(#g)" opacity=".92"/><path d="M0 38L320 142M-12 77L298 180M46 -2L320 85" stroke="#fff" stroke-opacity=".14" stroke-width="10"/><circle cx="254" cy="46" r="58" fill="#fff" fill-opacity=".09"/><text x="32" y="116" fill="#fff" font-family="Arial, sans-serif" font-size="66" font-weight="900">${glyph}</text><text x="32" y="151" fill="#fff" font-family="Arial, sans-serif" font-size="28" font-weight="800">${type}</text><text x="32" y="177" fill="#fff" fill-opacity=".82" font-family="Arial, sans-serif" font-size="16" font-weight="700">${safe}</text><text x="288" y="178" text-anchor="end" fill="#fff" fill-opacity=".6" font-family="Arial, sans-serif" font-size="12" font-weight="700">POTUZHNO</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function useImageFallback(image) {
  if (!image) return;
  image.src = createSkinPreview(image.dataset.skinName || image.alt || 'CS2 Skin');
  image.classList.add('image-skeleton', 'fallback-skin');
}

function setImageSource(image, source, skinName = '', skinId = '') {
  if (!image) return;
  delete image.dataset.fallbackApplied;
  image.classList.remove('image-skeleton', 'fallback-skin');
  image.dataset.skinName = skinName || image.alt || 'CS2 Skin';
  image.dataset.skinId = skinId ? String(skinId) : '';
  image.src = source
    ? getSkinImageSrc({ img: source, name: image.dataset.skinName })
    : createSkinPreview(image.dataset.skinName);
}

function getSkinKey(s) {
  return String(s?.sourceSkinId || s?.id || '');
}

function isUsableSkin(s) {
  return Boolean(s && getSkinKey(s));
}

function handleSkinImageError(image, location = 'card') {
  if (image) {
    image.src = createSkinPreview(image.dataset.skinName || image.alt || 'CS2 Skin');
    image.classList.add('image-skeleton', 'fallback-skin');
  }
  if (location === 'input' && selectedInputSkin) {
    const el = document.getElementById('inputSkinImg');
    if (el) el.src = createSkinPreview(selectedInputSkin.name);
  }
  if (location === 'target' && selectedTargetSkin) {
    const el = document.getElementById('targetSkinImg');
    if (el) el.src = createSkinPreview(selectedTargetSkin.name);
  }
  if (location === 'result') {
    const el = document.getElementById('resultImg');
    if (el && selectedTargetSkin) el.src = createSkinPreview(selectedTargetSkin.name);
  }
  if (location === 'case' && image) {
    image.src = createSkinPreview(image.dataset.skinName || 'CS2');
  }
}

function makeDemoItem(skin, suffix = '', wearRandom = null) {
  const safeSkin = normalizeCatalogSkin({
    ...skin,
    weapon: skin.weapon || categorizeWeapon(skin.name) || 'CS2',
    category: skin.category || 'Інше',
    img: skin.img || ''
  }) || {
    id: cleanText(skin?.id || 'demo', 128),
    name: cleanText(skin?.name || 'CS2 Skin', 160),
    rarity: cleanText(skin?.rarity || 'CS2', 48),
    rarityColor: cleanColor(skin?.rarityColor),
    img: cleanImageUrl(skin?.img),
    price: clampNumber(skin?.basePrice ?? skin?.price, 0.01, MAX_STORED_ITEM_VALUE, 0.01)
  };
  // Reward definitions and Steam imports sometimes carry a display name but
  // not the catalogue ID. Resolve it before applying the shared stable index.
  const catalogSkin = CS2_SKINS.find(candidate => normalizeSkinName(candidate.name) === normalizeSkinName(safeSkin.name));
  const quoteSkin = catalogSkin || safeSkin;
  // Issue new virtual items only in the exact wear whose price was checked.
  // Rolling an unquoted float used to manufacture a value with a multiplier.
  const wear = skin.wear ? normalizeWear(skin.wear) : WEAR_TIERS[2];
  const quotedPrice = marketPriceForWear(quoteSkin, wear);
  const basePrice = quotedPrice;
  const item = {
    ...safeSkin,
    sourceSkinId: cleanText(catalogSkin?.id || skin.sourceSkinId || safeSkin.id, 128),
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${suffix}`,
    basePrice,
    wear,
    marketPrice: quotedPrice,
    marketHashName: cleanText(quoteSkin.marketHashName, 200),
    marketUpdatedAt: clampNumber(quoteSkin.marketUpdatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    price: quotedPrice,
    virtual: true,
    exclusive: skin.exclusive === true,
    accountBound: skin.accountBound === true,
    battlePassReward: skin.battlePassReward === true,
    collectionReward: skin.collectionReward === true,
    dailyCalendarReward: skin.dailyCalendarReward === true,
    halloweenEvent: skin.halloweenEvent === true,
    addedAt: Date.now()
  };
  return item;
}

function createStarterInventory() {
  const p = [CS2_SKINS[5], CS2_SKINS[6], CS2_SKINS[8] || CS2_SKINS[7], CS2_SKINS[12], CS2_SKINS[13]].filter(Boolean);
  return p.map((s, i) => makeDemoItem(s, `-${i}`));
}

const CANVAS_SIZE = 260;
let canvasCtx = null;

function initCanvas() {
  const c = document.getElementById('upgradeCanvas');
  if (!c) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = CANVAS_SIZE * dpr;
  c.height = CANVAS_SIZE * dpr;
  c.style.width = CANVAS_SIZE + 'px';
  c.style.height = CANVAS_SIZE + 'px';
  canvasCtx = c.getContext('2d');
  canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderCanvas(chancePercent, pointerAngle = 0) {
  if (!canvasCtx) return;
  const ctx = canvasCtx, size = CANVAS_SIZE, cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 4;   // tick ring
  const arcR   = size / 2 - 18;  // main coloured arc
  const innerR = size / 2 - 34;  // inner dark ring

  ctx.clearRect(0, 0, size, size);

  // ── Outer dark ring ──────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, arcR, 0, Math.PI * 2);
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#0d1117';
  ctx.stroke();

  // ── Degree tick marks ───────────────────────────────────────────────────
  const TICKS = 60;
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const r1 = outerR - (isMajor ? 8 : 4);
    const r2 = outerR;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.strokeStyle = isMajor ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)';
    ctx.stroke();
  }

  // ── Win-chance arc ───────────────────────────────────────────────────────
  if (chancePercent > 0) {
    const sweepFrac = Math.min(chancePercent, 100) / 100;
    const sweep = sweepFrac * Math.PI * 2;
    const st = -Math.PI / 2;

    // neon glow shadow
    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.75)';
    ctx.shadowBlur = 22;

    ctx.beginPath();
    // Arc always drawn starting from top (-Math.PI/2) clockwise matching the rotation
    ctx.arc(cx, cy, arcR, st, st + sweep);
    ctx.lineWidth = 22;
    ctx.lineCap = sweepFrac >= 0.98 ? 'butt' : 'round';
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#f59e0b');
    g.addColorStop(0.35, '#fde047');
    g.addColorStop(0.7, '#fbbf24');
    g.addColorStop(1, '#f97316');
    ctx.strokeStyle = g;
    ctx.stroke();
    ctx.restore();
  }

  // ── Inner decorative ring ────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.stroke();

  // ── Spinning laser pointer ───────────────────────────────────────────────
  if (isRolling || pointerAngle !== 0) {
    const a = -Math.PI / 2 + pointerAngle;
    const px = cx + Math.cos(a) * arcR;
    const py = cy + Math.sin(a) * arcR;

    // motion trail (3 fading dots)
    for (let t = 1; t <= 3; t++) {
      const ta = a - (t * 0.07);
      const tx = cx + Math.cos(ta) * arcR;
      const ty = cy + Math.sin(ta) * arcR;
      ctx.beginPath();
      ctx.arc(tx, ty, 5 - t, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${0.15 - t * 0.04})`;
      ctx.fill();
    }

    // line from centre to dot
    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(251,191,36,0.35)';
    ctx.stroke();
    ctx.restore();

    // glow dot
    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.restore();
  }
}

function saveState({ skipCloudAutoSync = false, skipSteamAutoSync = false, urgentSteamAutoSync = false } = {}) {
  if (currentUser) {
    if (currentUser.steamId) localStorage.setItem(STORAGE.steamId, currentUser.steamId);
    localStorage.setItem(STORAGE.balance, String(currentUser.balance));
  }
  localStorage.setItem(STORAGE.inventory, JSON.stringify(userInventory));
  localStorage.setItem(STORAGE.started, '1');
  if (gameState) localStorage.setItem(STORAGE.game, JSON.stringify(gameState));
  if (account) localStorage.setItem(STORAGE.account, JSON.stringify(account));
  queuePublicProfilePublish();
  if (!skipSteamAutoSync) {
    captureSteamProgressDuringBootstrap();
    queueSteamAccountAutoSync();
    if (urgentSteamAutoSync) scheduleSteamAccountAutoSync({ urgent: true });
  }
  if (!skipCloudAutoSync) queueCloudAutoSync();
}

function beginPendingWager({ inventory = [], balance = 0 }) {
  const wager = {
    id: `wager-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: Date.now(),
    inventory: inventory.map((item, index) => normalizeStoredItem(item, index)).filter(Boolean),
    balance: clampNumber(balance, 0, MAX_STORED_BALANCE, 0)
  };
  pendingWager = wager;
  localStorage.setItem(STORAGE.pendingWager, JSON.stringify(wager));
  return wager.id;
}

function isPendingWager(id) {
  return Boolean(pendingWager && pendingWager.id === id);
}

function completePendingWager(id) {
  if (!isPendingWager(id)) return false;
  pendingWager = null;
  localStorage.removeItem(STORAGE.pendingWager);
  return true;
}

function cancelPendingWager() {
  pendingWager = null;
  localStorage.removeItem(STORAGE.pendingWager);
}

function recoverInterruptedWager() {
  let wager = null;
  try {
    wager = JSON.parse(localStorage.getItem(STORAGE.pendingWager) || 'null');
  } catch {}
  if (!wager || !currentUser) return;

  // A live Royale reservation may still be resolving on the server. Keep it
  // locked locally until the shared round reports its result instead of
  // returning it early on a browser refresh.
  if (gameState?.royaleLiveTicket?.wagerId === wager.id) {
    pendingWager = wager;
    return;
  }

  const restored = Array.isArray(wager.inventory)
    ? wager.inventory.map((item, index) => normalizeStoredItem(item, index)).filter(Boolean)
    : [];
  const owned = new Set(userInventory.map(item => String(item.id)));
  restored.forEach(item => {
    if (!owned.has(String(item.id))) userInventory.push(item);
  });
  currentUser.balance = clampNumber(currentUser.balance + clampNumber(wager.balance, 0, MAX_STORED_BALANCE, 0), 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE);
  cancelPendingWager();
  saveState();
  showToast('Незавершений раунд скасовано: ставку повернено.', 'info');
}

function migrateToUsdEconomy() {
  // Stable catalogue users must never be rescaled again on every launch.
  // Only pre-USD saves require the legacy cents-to-PC conversion.
  if (!currentUser || !gameState || [USD_ECONOMY_VERSION, STABLE_ECONOMY_VERSION, BALANCED_ECONOMY_VERSION].includes(gameState.economyVersion)) return false;
  currentUser.balance = legacyPc(currentUser.balance, DEMO_STARTING_BALANCE);
  userInventory = userInventory.map((item, index) => normalizeStoredItem({
    ...item,
    basePrice: legacyPc(item.basePrice ?? item.price, 0.01),
    price: legacyPc(item.price ?? item.basePrice, 0.01),
    marketPrice: item.marketPrice ? legacyPc(item.marketPrice, 0.01) : 0
  }, index)).filter(Boolean);

  const scaleFields = (source, fields) => {
    if (!source || typeof source !== 'object') return;
    fields.forEach(field => {
      if (Number.isFinite(Number(source[field]))) source[field] = legacyPc(source[field]);
    });
  };
  scaleFields(gameState.stats, ['bestValue']);
  scaleFields(gameState.daily, ['sellValue', 'targetValue', 'bestWinValue']);
  scaleFields(gameState.weekly, ['bestWinValue']);
  scaleFields(gameState.allTime, ['bestValue']);
  gameState.economyVersion = USD_ECONOMY_VERSION;
  try { localStorage.setItem(STORAGE.economyVersion, USD_ECONOMY_VERSION); } catch {}
  return true;
}

function migrateToStableEconomy() {
  if (!currentUser || !gameState || [STABLE_ECONOMY_VERSION, BALANCED_ECONOMY_VERSION].includes(gameState.economyVersion)) return false;
  userInventory = userInventory.map((item, index) => {
    const source = stableCatalogSourceForItem(item);
    // Keep IDs and progression flags while replacing only the old volatile
    // quote. Otherwise a legacy Battle Pass or collection trophy could lose
    // its account-bound status during the one-time catalogue migration.
    return normalizeStoredItem({
      ...source,
      ...item,
      wear: getWear(item),
      accountBound: item.accountBound === true || item.battlePassReward === true || item.collectionReward === true || Boolean(item.halloweenEvent) || /-(?:battle-pass|halloween-\d{4}|exclusive)$/.test(String(item.id || ''))
    }, index);
  }).filter(Boolean);
  gameState.economyVersion = STABLE_ECONOMY_VERSION;
  gameState.pricingVersion = STABLE_ECONOMY_VERSION;
  try { localStorage.setItem(STORAGE.economyVersion, STABLE_ECONOMY_VERSION); } catch {}
  return true;
}

function migrateToBalancedEconomy() {
  if (!currentUser || !gameState || gameState.economyVersion === BALANCED_ECONOMY_VERSION) return false;
  // Existing balances stay intact. This release changes future sources and
  // sinks of PC; it does not confiscate a player's earned virtual credits.
  gameState.economyVersion = BALANCED_ECONOMY_VERSION;
  gameState.pricingVersion = STABLE_ECONOMY_VERSION;
  try { localStorage.setItem(STORAGE.economyVersion, BALANCED_ECONOMY_VERSION); } catch {}
  return true;
}

function loadState() {
  loadGameState();
  applyPerformanceMode();
  loadAccount();
  loadFairState();
  const sid = account?.steamId || localStorage.getItem(STORAGE.steamId);
  const started = localStorage.getItem(STORAGE.started) === '1';
  const bal = clampNumber(localStorage.getItem(STORAGE.balance), 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE);
  soundEnabled = localStorage.getItem(STORAGE.sound) !== 'off';
  musicEnabled = localStorage.getItem(STORAGE.music) !== 'off';
  backgroundMusicTrackIndex = getStoredMusicTrackIndex();
  hapticsEnabled = localStorage.getItem(STORAGE.haptics) !== 'off';
  updateSoundUI();
  updateHapticsUI();

  try {
    userInventory = JSON.parse(localStorage.getItem(STORAGE.inventory) || '[]');
  } catch {
    userInventory = [];
  }

  userInventory = Array.isArray(userInventory)
    ? userInventory.map((item, index) => normalizeStoredItem(item, index)).filter(Boolean)
    : [];

  const steamProfile = normalizeSteamProfile(account?.steamProfile, sid);
  currentUser = {
    steamId: steamProfile?.steamId || sid || null,
    name: steamProfile?.name || account?.nick || 'Гість',
    balance: bal,
    avatar: steamProfile?.avatar || '',
    steamProfile
  };
  steamConnectionState = steamProfile ? 'checking' : 'disconnected';
  steamConnectionMessage = '';

  if (!started) {
    currentUser.balance = DEMO_STARTING_BALANCE;
    userInventory = createStarterInventory();
    gameState.economyVersion = BALANCED_ECONOMY_VERSION;
    gameState.pricingVersion = STABLE_ECONOMY_VERSION;
    saveState();
  } else if (migrateToUsdEconomy()) {
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
  }

  recoverInterruptedWager();
  if (migrateToStableEconomy()) {
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
  }
  if (migrateToBalancedEconomy()) {
    saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
  }

  applyLoggedInUI();
  updateAccountUI();
  renderGameHub();
  updateGiftButtonUI();
  updateThemeMenuState();
  updateAvatarBadge();
}

function applyLoggedInUI() {
  if (!currentUser) return;
  const sb = document.getElementById('steamAuthBtn');
  const ab = document.getElementById('userAvatarBox');
  if (currentUser.steamId) {
    sb?.classList.add('hidden');
    if (sb) sb.style.display = 'none';
    ab?.classList.remove('hidden');
    ab.title = `${currentUser.name || 'Steam'} · Steam підключено`;
    const avatar = document.getElementById('userAvatarImg');
    if (avatar) {
      setSteamAvatarSource(avatar, currentUser.steamId, currentUser.avatar, currentUser.name || 'Steam');
    }
    const headerName = document.getElementById('headerSteamName');
    const headerLevel = document.getElementById('headerSteamLevel');
    if (headerName) headerName.textContent = cleanText(currentUser.name || 'Steam', 20) || 'Steam';
    if (headerLevel) headerLevel.textContent = `LVL ${getPlayerLevel()}`;
    const dot = document.getElementById('steamConnectionDot');
    if (dot) {
      const isConnected = steamConnectionState === 'connected';
      const isWorking = ['checking', 'syncing'].includes(steamConnectionState);
      dot.classList.toggle('bg-cyan-300', isConnected);
      dot.classList.toggle('bg-amber-400', !isConnected && !isWorking);
      dot.classList.toggle('bg-violet-400', isWorking);
      dot.title = isConnected
        ? 'Steam підключено'
        : steamConnectionState === 'syncing'
          ? 'Steam синхронізується'
          : steamConnectionState === 'checking'
            ? 'Перевіряємо сесію Steam'
            : 'Потрібно повторно увійти в Steam';
    }
  } else {
    if (sb) {
      sb.style.removeProperty('display');
      sb.classList.remove('hidden');
    }
    ab?.classList.add('hidden');
    const headerName = document.getElementById('headerSteamName');
    const headerLevel = document.getElementById('headerSteamLevel');
    if (headerName) headerName.textContent = 'Steam';
    if (headerLevel) headerLevel.textContent = 'Не підключено';
    const dot = document.getElementById('steamConnectionDot');
    if (dot) dot.title = '';
  }
  updateBalanceUI();
  if (gameState) renderProfileProgress();
}

function updateBalanceUI() {
  if (currentUser) {
    const el = document.getElementById('userBalance');
    if (el) el.textContent = formatCredits(currentUser.balance);
    const profileBalance = document.getElementById('profileBalance');
    if (profileBalance) profileBalance.textContent = formatCredits(currentUser.balance);
  }
}

function updateAvatarBadge() {
  const b = document.getElementById('avatarBadge');
  if (!b) return;
  const n = userInventory.length;
  if (n > 0) {
    b.textContent = n > 99 ? '99+' : String(n);
    b.classList.remove('hidden');
  } else {
    b.classList.add('hidden');
  }
}

function updateGiftButtonUI() {
  const btn = document.getElementById('giftBtn');
  const timer = document.getElementById('giftTimer');
  const icon = document.getElementById('giftIcon');
  if (!btn || !timer) return;
  const streakDays = Math.max(0, Number(gameState?.dailyStreak?.current) || 0);
  btn.title = `Щоденний календар · серія ${streakDays} дн.`;
  btn.setAttribute('aria-label', btn.title);
  const last = parseInt(localStorage.getItem(STORAGE.bonusAt) || '0', 10);
  const cd = 24 * 60 * 60 * 1000;
  const left = cd - (Date.now() - last);
  if (left > 0 && left < cd) {
    btn.classList.add('gift-cooldown');
    btn.classList.remove('bg-amber-500', 'hover:bg-amber-400', 'text-black');
    btn.classList.add('bg-gray-800', 'text-gray-500', 'border', 'border-gray-700');
    if (icon) icon.className = 'fa-solid fa-clock text-xs';
    timer.classList.remove('hidden');
    const totalMin = Math.max(1, Math.ceil(left / 60000));
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    timer.textContent = h > 0 ? `${h}г${m > 0 ? ' ' + m + 'хв' : ''}` : `${m}хв`;
  } else {
    btn.classList.remove('gift-cooldown');
    btn.classList.add('bg-amber-500', 'hover:bg-amber-400', 'text-black');
    btn.classList.remove('bg-gray-800', 'text-gray-500', 'border', 'border-gray-700');
    if (icon) icon.className = 'fa-solid fa-gift text-xs';
    timer.classList.add('hidden');
  }
}

function normalizeSkinName(name) {
  return String(name || '')
    .replace(/^★\s*/, '')
    .replace(/^StatTrak™\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getOwnedSkinNames() {
  return new Set(userInventory.map(it => normalizeSkinName(it?.name)));
}

function getCollectionProgress(collection) {
  const total = collection.items.length;
  const owned = getOwnedSkinNames();
  let count = 0;
  for (const name of collection.items) {
    if (owned.has(normalizeSkinName(name))) count++;
  }
  count = Math.min(count, total);
  return { count, total, complete: count >= total };
}

function renderProfileProgress() {
  if (!gameState) return;
  const level = getPlayerLevel(), p = getLevelProgress(), s = gameState.stats;
  const wr = s.rounds ? Math.round((s.wins / s.rounds) * 100) : 0;
  const name = account?.nick || currentUser?.name || 'Гість';
  const n = document.getElementById('profileName');
  if (n) n.textContent = name;
  const pl = document.getElementById('profileLevel');
  if (pl) pl.textContent = `LVL ${level}`;
  const headerLevel = document.getElementById('headerSteamLevel');
  if (headerLevel && currentUser?.steamId) headerLevel.textContent = `LVL ${level}`;
  const xt = document.getElementById('xpText');
  if (xt) xt.textContent = `${p.current.toLocaleString('uk-UA')} / ${p.total} XP`;
  const xb = document.getElementById('xpBar');
  if (xb) xb.style.width = `${p.percent}%`;
  const sr = document.getElementById('statRounds');
  if (sr) sr.textContent = String(s.rounds);
  const sw = document.getElementById('statWinRate');
  if (sw) sw.textContent = `${wr}%`;
  const ss = document.getElementById('statStreak');
  if (ss) ss.textContent = String(s.currentStreak);
  const sb = document.getElementById('statBestValue');
  if (sb) sb.textContent = formatCredits(s.bestValue);
  renderProfileCosmeticsSummary();
  renderSignalForgeProfile();
}

function renderDailyTasks() {
  if (!gameState) return;
  ensureDailyState();
  const h = document.getElementById('dailyTasks');
  if (!h) return;
  if (!isRuntimeFeatureEnabled('tasks')) {
    h.replaceChildren();
    return;
  }
  const tasks = getDailyTasks();
  const doneCount = tasks.filter(t => gameState.daily.claimed.includes(t.id)).length;
  h.innerHTML = tasks.map(t => {
    const raw = Number(t.value(gameState.daily)) || 0;
    const prog = Math.min(t.goal, Math.max(0, raw));
    const done = prog >= t.goal;
    const claimed = gameState.daily.claimed.includes(t.id);
    const pct = Math.round((prog / t.goal) * 100);
    const btn = claimed
      ? '<span class="rounded-lg bg-green-500/15 px-2 py-1 text-[10px] font-extrabold uppercase text-green-300">Готово</span>'
      : done
        ? `<button onclick="claimDailyTask('${t.id}')" class="rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-extrabold uppercase text-black hover:bg-amber-400">Забрати</button>`
        : `<span class="text-[11px] font-bold text-amber-300">+${formatCredits(t.reward)}</span>`;
    const goalLabel = t.goal >= 1000 ? formatCredits(t.goal) : String(t.goal);
    const progLabel = t.goal >= 1000 ? formatCredits(prog) : String(prog);
    return `<div class="rounded-xl border ${claimed ? 'border-green-500/25 bg-green-500/5' : done ? 'border-amber-500/40 bg-amber-500/5' : 'border-gray-800 bg-black/20'} p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="min-w-0 truncate text-xs font-bold text-gray-200"><i class="fa-solid ${t.icon} mr-1.5 text-amber-400"></i>${t.title}</p>${btn}
      </div>
      <div class="mt-2 flex items-center gap-2">
        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
          <div class="h-full rounded-full ${claimed ? 'bg-green-400' : 'bg-amber-400'} transition-all duration-500" style="width:${pct}%"></div>
        </div>
        <span class="shrink-0 text-right text-[10px] font-bold text-gray-400">${progLabel} / ${goalLabel}</span>
      </div>
    </div>`;
  }).join('');

  const summary = document.createElement('div');
  summary.className = 'col-span-full mt-2 flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs';
  summary.innerHTML = `<span class="font-bold text-amber-200"><i class="fa-solid fa-list-check mr-1"></i>Виконано ${doneCount} / ${tasks.length}</span><span class="text-gray-400">Скидання о 00:00</span>`;
  h.appendChild(summary);
}

function getClaimableTaskRewardsCount() {
  if (!gameState) return 0;
  ensureDailyState();
  ensureWeeklyState();
  const daily = getDailyTasks().filter(task => !gameState.daily.claimed.includes(task.id)
    && (Number(task.value(gameState.daily)) || 0) >= task.goal).length;
  const weekly = getWeeklyTasks().filter(task => !gameState.weekly.claimed.includes(task.id)
    && (Number(task.value(gameState.weekly)) || 0) >= task.goal).length;
  return daily + weekly;
}

function updateTaskRewardSignal() {
  const count = getClaimableTaskRewardsCount();
  const label = count > 9 ? '9+' : String(count);
  document.querySelectorAll('[data-nav="tasks"], [data-mobile-nav="tasks"]').forEach(link => {
    link.classList.toggle('has-claimable-reward', count > 0);
    if (count > 0) {
      link.dataset.taskRewards = label;
      link.title = `Є ${count} невиданих нагород`;
      link.setAttribute('aria-label', `Завдання — доступно нагород: ${count}`);
    } else {
      delete link.dataset.taskRewards;
      link.removeAttribute('title');
      link.removeAttribute('aria-label');
    }
  });
}

function claimDailyTask(id) {
  if (!gameState || !currentUser) return;
  ensureDailyState();
  const t = getDailyTasks().find(x => x.id === id);
  if (!t) return;
  if (gameState.daily.claimed.includes(t.id)) return;
  if ((Number(t.value(gameState.daily)) || 0) < t.goal) return;

  gameState.daily.claimed.push(t.id);
  currentUser.balance += t.reward;
  addXp(XP_DAILY_TASK);
  updateBalanceUI();
  saveState();
  renderGameHub();
  checkAchievements();
  soundCoin();
  showToast(`Завдання виконано: +${formatCredits(t.reward)}`, 'success');
}

function renderWeeklyTasks() {
  if (!gameState) return;
  ensureWeeklyState();
  const h = document.getElementById('weeklyTasks');
  if (!h) return;
  if (!isRuntimeFeatureEnabled('tasks')) {
    h.replaceChildren();
    return;
  }
  const now = new Date();
  const day = now.getDay() || 7;
  const daysLeft = 8 - day;
  const wl = document.getElementById('weeklyResetText');
  if (wl) wl.textContent = `Скидання через ${daysLeft} д.`;

  const tasks = getWeeklyTasks();
  const doneCount = tasks.filter(t => gameState.weekly.claimed.includes(t.id)).length;
  h.innerHTML = tasks.map(t => {
    const raw = Number(t.value(gameState.weekly)) || 0;
    const prog = Math.min(t.goal, Math.max(0, raw));
    const done = prog >= t.goal;
    const claimed = gameState.weekly.claimed.includes(t.id);
    const pct = Math.round((prog / t.goal) * 100);
    const btn = claimed
      ? '<span class="rounded-lg bg-green-500/15 px-2 py-1 text-[10px] font-extrabold uppercase text-green-300">Готово</span>'
      : done
        ? `<button onclick="claimWeeklyTask('${t.id}')" class="rounded-lg bg-violet-500 px-2 py-1 text-[10px] font-extrabold uppercase text-black hover:bg-violet-400">Забрати</button>`
        : `<span class="text-[11px] font-bold text-violet-300">+${formatCredits(t.reward)}</span>`;
    const goalLabel = t.goal >= 1000 ? formatCredits(t.goal) : String(t.goal);
    const progLabel = t.goal >= 1000 ? formatCredits(prog) : String(prog);
    return `<div class="rounded-xl border ${claimed ? 'border-green-500/25 bg-green-500/5' : done ? 'border-violet-500/40 bg-violet-500/5' : 'border-gray-800 bg-black/20'} p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="min-w-0 truncate text-xs font-bold text-gray-200"><i class="fa-solid ${t.icon} mr-1.5 text-violet-400"></i>${t.title}</p>${btn}
      </div>
      <div class="mt-2 flex items-center gap-2">
        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
          <div class="h-full rounded-full ${claimed ? 'bg-green-400' : 'bg-violet-400'} transition-all duration-500" style="width:${pct}%"></div>
        </div>
        <span class="shrink-0 text-right text-[10px] font-bold text-gray-400">${progLabel} / ${goalLabel}</span>
      </div>
    </div>`;
  }).join('');

  const summary = document.createElement('div');
  summary.className = 'col-span-full mt-2 flex items-center justify-between rounded-xl border border-violet-500/25 bg-violet-500/5 p-3 text-xs';
  summary.innerHTML = `<span class="font-bold text-violet-200"><i class="fa-solid fa-calendar-week mr-1"></i>Виконано ${doneCount} / ${tasks.length}</span><span class="text-gray-400">Скидання в понеділок</span>`;
  h.appendChild(summary);
}

function claimWeeklyTask(id) {
  if (!gameState || !currentUser) return;
  ensureWeeklyState();
  const t = getWeeklyTasks().find(x => x.id === id);
  if (!t) return;
  if (gameState.weekly.claimed.includes(t.id)) return;
  if ((Number(t.value(gameState.weekly)) || 0) < t.goal) return;

  gameState.weekly.claimed.push(t.id);
  currentUser.balance += t.reward;
  addXp(XP_WEEKLY_TASK);
  updateBalanceUI();
  saveState();
  renderGameHub();
  checkAchievements();
  soundCoin();
  setTimeout(() => soundCoin(), 150);
  showToast(`Тижнева місія: +${formatCredits(t.reward)}`, 'success');
}

function renderAchievements() {
  if (!gameState) return;
  const h = document.getElementById('achievementsGrid');
  if (!h) return;
  const unlocked = ACHIEVEMENT_DEFINITIONS.filter(a => gameState.achievements[a.id]).length;
  const ac = document.getElementById('achievementCount');
  if (ac) ac.textContent = `${unlocked} / ${ACHIEVEMENT_DEFINITIONS.length}`;
  h.innerHTML = ACHIEVEMENT_DEFINITIONS.map(a => {
    const active = Boolean(gameState.achievements[a.id]);
    return `<div class="rounded-xl border p-3 ${active ? 'border-amber-500/35 bg-amber-500/10' : 'border-gray-800 bg-black/20 opacity-60'}">
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-500'}">
          <i class="fa-solid ${a.icon}"></i>
        </span>
        <div class="min-w-0">
          <p class="text-xs font-extrabold ${active ? 'text-amber-100' : 'text-gray-300'}">${a.title}</p>
          <p class="mt-0.5 text-[10px] leading-4 text-gray-500">${a.description}</p>
          <p class="mt-1 text-[10px] font-bold ${active ? 'text-amber-300' : 'text-gray-600'}">${active ? 'Отримано' : `+${formatCredits(economyReward(a.reward))}`}</p>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderCollections() {
  if (!gameState) return;
  const h = document.getElementById('collectionsGrid');
  if (!h) return;
  const completed = COLLECTION_DEFINITIONS.filter(c => getCollectionProgress(c).complete).length;
  const cc = document.getElementById('collectionCount');
  if (cc) cc.textContent = `${completed} / ${COLLECTION_DEFINITIONS.length}`;
  const owned = new Set(userInventory.map(it => normalizeSkinName(it.name)));
  h.innerHTML = COLLECTION_DEFINITIONS.map(c => {
    const p = getCollectionProgress(c);
    const pct = p.total ? Math.round((p.count / p.total) * 100) : 0;
    const claimed = gameState.collectionRewards?.[c.id] === true;
    const mini = c.items.map(name => {
      const norm = normalizeSkinName(name);
      const have = owned.has(norm);
      const catalogItem = CS2_SKINS.find(s => normalizeSkinName(s.name) === norm);
      return `<div class="coll-mini-item ${have ? 'owned' : 'locked'}" title="${escapeHtml(name)}">
        ${catalogItem?.img ? `<img src="${escapeHtml(getSkinImageSrc(catalogItem))}" alt="" onerror="useImageFallback(this)">` : ''}
      </div>`;
    }).join('');

    let rewardHTML = '';
    if (claimed) {
      rewardHTML = `<div class="mt-3 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-2.5">
        <i class="fa-solid fa-circle-check text-green-400"></i>
        <span class="text-[11px] font-bold text-green-300">Нагороду отримано</span>
      </div>`;
    } else if (p.complete) {
      rewardHTML = `<button onclick="openCollectionReward('${c.id}')" class="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 text-black font-extrabold text-xs uppercase tracking-wider py-3 transition flex items-center justify-center gap-2">
        <i class="fa-solid fa-gift"></i>Забрати таємничу нагороду
      </button>`;
    } else {
      rewardHTML = `<div class="mt-3 rounded-xl border border-violet-500/25 bg-violet-500/5 p-2.5 text-center">
        <span class="text-[10px] font-bold text-gray-500">Нагорода: </span>
        <span class="text-[11px] font-extrabold text-violet-300">???</span>
        <span class="text-[10px] text-gray-500"> (приховано, поки не збереш усі 5)</span>
      </div>`;
    }

    return `<div class="rounded-xl border border-gray-800 bg-black/20 p-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-extrabold text-gray-200">${c.title}</p>
          <p class="mt-0.5 text-[10px] text-gray-500">${c.description}</p>
        </div>
        <span class="text-xs font-extrabold ${p.complete ? 'text-green-400' : 'text-amber-300'}">${p.count}/${p.total}</span>
      </div>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div class="h-full rounded-full ${p.complete ? 'bg-green-400' : 'bg-amber-400'} transition-all duration-500" style="width:${pct}%"></div>
      </div>
      <div class="coll-mini">${mini}</div>
      ${rewardHTML}
    </div>`;
  }).join('');
}

function openCollectionReward(collId) {
  const coll = COLLECTION_DEFINITIONS.find(c => c.id === collId);
  if (!coll) return;
  const progress = getCollectionProgress(coll);
  if (!progress.complete) {
    showToast('Спочатку заверши колекцію', 'warn');
    return;
  }
  if (gameState.collectionRewards?.[collId]) {
    showToast('Нагороду вже отримано', 'info');
    return;
  }
  const box = document.getElementById('mysteryBox');
  box?.classList.remove('opening');
  if (box) box.innerHTML = '<span>?</span>';
  const title = document.getElementById('collectionRewardTitle');
  if (title) title.textContent = 'Таємнича нагорода';
  const sub = document.getElementById('collectionRewardSubtitle');
  if (sub) sub.textContent = `За колекцію «${coll.title}»`;

  const btn = document.getElementById('collectionRewardBtn');
  if (btn) {
    btn.classList.remove('hidden');
    btn.innerHTML = '<i class="fa-solid fa-gift mr-2"></i>Відкрити';
    btn.onclick = () => doRevealCollectionReward(collId);
  }
  const rev = document.getElementById('collectionRewardRevealed');
  if (rev) {
    rev.classList.add('hidden');
    rev.innerHTML = '';
  }
  openModal('collectionRewardModal');
}

function doRevealCollectionReward(collId) {
  const coll = COLLECTION_DEFINITIONS.find(c => c.id === collId);
  if (!coll) return;
  const reward = coll.reward;
  const box = document.getElementById('mysteryBox');
  box?.classList.add('opening');
  const btn = document.getElementById('collectionRewardBtn');
  btn?.classList.add('hidden');

  let n = 0;
  const tick = setInterval(() => {
    beep(600 + Math.random() * 400, 0.03, 'square');
    n++;
    if (n > 10) clearInterval(tick);
  }, 60);

  setTimeout(() => {
    clearInterval(tick);
    if (box) box.innerHTML = '<i class="fa-solid fa-gift"></i>';
    const title = document.getElementById('collectionRewardTitle');
    if (title) title.textContent = '🎉 Нагороду відкрито!';
    if (!gameState.collectionRewards) gameState.collectionRewards = {};
    gameState.collectionRewards[collId] = true;

    const exclusiveItem = makeDemoItem({
      id: reward.skin.id,
      sourceSkinId: reward.skin.id,
      name: reward.skin.name,
      // Collection items are cosmetics, not Steam listings. They must never
      // inject a hand-authored price into the tradable economy.
      price: 0,
      basePrice: 0.01,
      img: '',
      rarity: reward.skin.rarity,
      rarityColor: reward.skin.rarityColor,
      exclusive: true,
      accountBound: true,
      collectionReward: true
    }, '-exclusive');

    userInventory.push(exclusiveItem);
    // Collection progress is a one-time milestone.  Its old 500 PC floor
    // dwarfed normal play and made collecting the best coin printer.
    const coinReward = economyReward(reward.dc, 5);
    currentUser.balance += coinReward;
    addXp(XP_COLLECTION);

    const reveal = document.getElementById('collectionRewardRevealed');
    if (reveal) {
      reveal.classList.remove('hidden');
      reveal.innerHTML = `
        <div class="mt-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-violet-500/15 p-4">
          <p class="text-[10px] font-extrabold uppercase tracking-widest text-amber-400"><i class="fa-solid fa-star mr-1"></i>Ексклюзивний предмет</p>
          <img src="${createSkinPreview(reward.skin.name)}" class="h-32 mx-auto my-3 object-contain" />
          <p class="font-heading text-2xl font-extrabold text-white leading-tight">${escapeHtml(reward.skin.name)}</p>
          <p class="text-sm font-bold text-violet-200 mt-1">Колекційний · фіксована ціна</p>
          <p class="text-[10px] text-gray-500 mt-2 italic">Цей предмет неможливо отримати інакше — тільки за колекцію та не продається за PC.</p>
        </div>
        <div class="mt-3 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-center">
          <p class="text-xs font-extrabold text-green-200 uppercase tracking-wider">Бонусні кредити</p>
          <p class="font-heading text-3xl font-extrabold text-green-300 mt-1">+ ${formatCredits(coinReward)}</p>
        </div>
        <button onclick="closeModal('collectionRewardModal'); renderGameHub(); renderInventoryGrid(); renderProfileInventory(); updateAvatarBadge(); updateBalanceUI();" class="mt-4 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm tracking-wider transition"><i class="fa-solid fa-check mr-2"></i>Забрати все</button>
      `;
    }
    soundWin();
    checkAchievements();
    saveState();
  }, 800);
}

function getSkinByKey(k) {
  const key = String(k);
  return shopCatalogSkins.find(s => getSkinKey(s) === key)
    || CS2_SKINS.find(s => getSkinKey(s) === key);
}

function isFavorite(s) {
  return Boolean(gameState?.favorites?.includes(getSkinKey(s)));
}

function getWishlistSkins() {
  const keys = Array.isArray(gameState?.favorites) ? gameState.favorites.map(String) : [];
  const seen = new Set();
  return keys.map(getSkinByKey).filter(skin => {
    const key = getSkinKey(skin);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderProfileWishlist() {
  const root = document.getElementById('profileWishlistPreview');
  if (!root) return;
  const favorites = getWishlistSkins();
  if (!favorites.length) {
    root.innerHTML = '<button type="button" class="profile-wishlist-empty" onclick="openWishlistCatalog()"><i class="fa-regular fa-heart"></i><span>Ще немає цілей. Відкрий каталог і познач скіни, які хочеш знайти.</span><b>Відкрити каталог <i class="fa-solid fa-arrow-right"></i></b></button>';
    return;
  }
  root.innerHTML = `${favorites.slice(0, 6).map(skin => `<button type="button" class="profile-wishlist-item" data-wishlist-item="${escapeHtml(getSkinKey(skin))}" title="${escapeHtml(skin.name)}"><img src="${escapeHtml(getSkinImageSrc(skin))}" alt="" data-skin-name="${escapeHtml(skin.name)}" loading="lazy" onerror="handleSkinImageError(this)"><span>${escapeHtml(skin.name)}</span></button>`).join('')}<button type="button" class="profile-wishlist-more" onclick="openWishlistModal()"><i class="fa-solid fa-heart"></i><strong>${favorites.length}/12</strong><span>Відкрити список</span></button>`;
  root.querySelectorAll('[data-wishlist-item]').forEach(button => button.addEventListener('click', () => openWishlistModal()));
}

function renderWishlistManager() {
  const grid = document.getElementById('wishlistManagerGrid');
  const status = document.getElementById('wishlistManagerStatus');
  if (!grid || !status) return;
  const keys = Array.isArray(gameState?.favorites) ? gameState.favorites.map(String) : [];
  const favorites = getWishlistSkins();
  status.innerHTML = `<i class="fa-solid fa-heart mr-1 text-rose-300"></i> ${keys.length} / 12 скінів у списку`;
  if (!favorites.length) {
    grid.innerHTML = '<div class="wishlist-manager-empty"><i class="fa-regular fa-heart"></i><strong>Список бажаного порожній</strong><span>У каталозі натисни сердечко на потрібному скіні — ми покажемо кейси, де він є.</span></div>';
    return;
  }
  grid.innerHTML = favorites.map(skin => `<button type="button" class="wishlist-manager-item" data-wishlist-remove="${escapeHtml(getSkinKey(skin))}" title="Прибрати зі списку"><img src="${escapeHtml(getSkinImageSrc(skin))}" alt="" data-skin-name="${escapeHtml(skin.name)}" loading="lazy" onerror="handleSkinImageError(this)"><span><b>${escapeHtml(skin.name)}</b><small>${formatCredits(verifiedMarketPriceForWear(skin))}</small></span><i class="fa-solid fa-heart-crack"></i></button>`).join('');
  grid.querySelectorAll('[data-wishlist-remove]').forEach(button => button.addEventListener('click', () => toggleFavorite(button.dataset.wishlistRemove)));
}

function openWishlistModal() {
  if (!gameState) return;
  renderWishlistManager();
  openModal('wishlistModal');
}

function openWishlistCatalog() {
  closeModal('wishlistModal');
  openModal('shopModal');
}

function toggleFavorite(k) {
  if (!gameState) return;
  if (!Array.isArray(gameState.favorites)) gameState.favorites = [];
  const key = String(k);
  const pos = gameState.favorites.indexOf(key);
  if (pos === -1) {
    if (gameState.favorites.length >= 12) {
      showToast('Максимум 12 улюблених', 'warn');
      return;
    }
    gameState.favorites.push(key);
  } else {
    gameState.favorites.splice(pos, 1);
  }
  saveState();
  renderProfileWishlist();
  renderWishlistManager();
  if (currentPage === 'case') renderCaseCatalog();
  if (document.getElementById('caseDetailsModal')?.classList.contains('flex')) {
    renderCaseWishlistSignal(currentDetailsCaseId);
  }
  if (document.getElementById('shopModal')?.classList.contains('flex')) filterShop();
}

let communitySnapshot = { leaderboard: [], events: [], rank: null, season: '', circuit: null, rift: null };
let communitySyncStarted = false;
let communitySyncInFlight = false;
let queuedCommunityEvents = [];
let communityFeedKey = null;
// The live strip is shared state. Keep its refresh short enough that a drop
// made on Android appears on the site (and vice versa) without a manual
// reload, while staying well inside the Worker community rate limit.
const COMMUNITY_SYNC_MS = 12_000;

function getCommunityPlayerPayload() {
  const stats = gameState?.stats || {};
  const collectionValue = userInventory.reduce((total, item) => total + verifiedInventoryMarketPrice(item), 0);
  const publicPresentation = buildPublicProfilePayload();
  return {
    name: cleanText(account?.nick || currentUser?.name || 'Гравець', 24) || 'Гравець',
    profileId: account?.publicProfile?.enabled ? account.publicProfile.id : '',
    // Steam identity is already verified before its game-state snapshot has
    // finished loading. Send it immediately so a just-opened Android client
    // and the website collapse into one community entry instead of briefly
    // creating two anonymous records.
    cloudProfileId: hasSteamIdentity()
      ? String(currentUser?.steamId || account?.steamId || '')
      : (isCloudProfile(account?.cloud) ? account.cloud.id : ''),
    xp: clampNumber(gameState?.xp, 0, 9_999_999, 0),
    wins: clampNumber(stats.wins, 0, 9_999_999, 0),
    rounds: clampNumber(stats.rounds, 0, 9_999_999, 0),
    collectionValue: clampNumber(collectionValue, 0, MAX_STORED_ITEM_VALUE * 10_000, 0),
    inventoryTotal: clampNumber(userInventory.length, 0, 10_000, 0),
    level: getPlayerLevel(),
    prestige: clampNumber(gameState?.prestige, 0, 99, 0),
    // A community heartbeat contains only the selections a player can show
    // off: equipped cosmetics, up to three showcase skins and achievements.
    // It intentionally excludes balance, Steam ID and the rest of inventory.
    presentation: {
      cosmetics: publicPresentation.cosmetics,
      signal: publicPresentation.signal,
      showcase: publicPresentation.showcase,
      achievements: publicPresentation.achievements
    },
    hidden: isProfileHidden()
  };
}

function buildCommunityProfile(player) {
  const source = player && typeof player === 'object' ? player : {};
  const presentation = source.presentation && typeof source.presentation === 'object' && !Array.isArray(source.presentation)
    ? source.presentation
    : null;
  return {
    id: '',
    community: true,
    isOwn: source.isMe === true,
    name: cleanText(source.name, 24) || 'Гравець',
    level: clampNumber(source.level, 1, 9_999, 1),
    prestige: clampNumber(source.prestige, 0, 99, 0),
    steamConnected: Boolean(cleanText(source.avatarUrl, 512)),
    avatarUrl: cleanText(source.avatarUrl, 512),
    communityPresentation: Boolean(presentation),
    cosmetics: presentation?.cosmetics || {},
    signal: presentation?.signal || {},
    showcase: Array.isArray(presentation?.showcase) ? presentation.showcase.slice(0, 3) : [],
    achievements: presentation?.achievements || {},
    xp: clampNumber(source.xp, 0, 9_999_999, 0),
    wins: clampNumber(source.wins, 0, 9_999_999, 0),
    stats: {
      rounds: clampNumber(source.rounds, 0, 9_999_999, 0),
      cases: clampNumber(source.inventoryTotal, 0, 9_999, 0),
      battles: clampNumber(source.wins, 0, 9_999_999, 0),
      bestValue: clampNumber(source.collectionValue, 0, MAX_STORED_ITEM_VALUE * 10_000, 0)
    }
  };
}

function openCommunityProfile(player) {
  const profile = buildCommunityProfile(player);
  renderPublicProfileModal(profile);
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  const rows = Array.isArray(communitySnapshot?.leaderboard) ? communitySnapshot.leaderboard : [];
  const rankLabel = document.getElementById('myRankLabel');
  if (rankLabel) rankLabel.textContent = communitySnapshot?.rank ? `#${communitySnapshot.rank}` : '#—';
  const seasonLabel = document.getElementById('leaderboardSeason');
  if (seasonLabel) seasonLabel.textContent = communitySnapshot?.season ? `Сезон ${communitySnapshot.season}` : 'Сезонний топ';

  if (!rows.length) {
    list.innerHTML = '<div class="rounded-xl border border-dashed border-gray-700 px-4 py-6 text-center text-xs font-bold text-gray-500">Рейтинг з’явиться після входу першого гравця через Steam.</div>';
    return;
  }
  list.innerHTML = rows.map((row, index) => {
    const rank = Number(row.rank) || index + 1;
    const level = clampNumber(row.level, 1, 9_999, 1);
    const cls = rank <= 3 ? `lb-rank-${rank}` : 'text-gray-500';
    const prestige = clampNumber(row.prestige, 0, 99, 0);
    const pBadge = prestige > 0 ? `<span class="prestige-badge ml-1"><i class="fa-solid fa-crown text-[8px]"></i>P${prestige}</span>` : '';
    const canOpen = Boolean(cleanText(row?.name, 24));
    return `<button type="button" class="lb-row w-full text-left ${row.isMe ? 'is-me' : ''} ${canOpen ? 'cursor-pointer hover:border-cyan-400/35' : ''}" data-community-row="${index}" ${canOpen ? `title="Відкрити профіль ${escapeHtml(row.name)}"` : ''}>
      <div class="lb-rank ${cls}">#${rank}</div>
      <div class="min-w-0"><p class="truncate text-sm font-extrabold ${row.isMe ? 'text-amber-200' : 'text-white'}">${escapeHtml(row.name)}${pBadge}${row.isMe ? ' <span class="text-[10px] font-bold text-amber-400">(ти)</span>' : ''}</p><p class="text-[11px] font-bold text-gray-500">${Number(row.xp || 0).toLocaleString('uk-UA')} XP · LVL ${level}</p></div>
      <div class="font-heading text-xl font-extrabold text-amber-300">${prestige > 0 ? `P${prestige}` : '—'}</div>
    </button>`;
  }).join('');
  list.querySelectorAll('[data-community-row]').forEach(button => button.addEventListener('click', () => {
    const row = rows[Number(button.dataset.communityRow)];
    if (!row) return;
    if (UUID_PATTERN.test(String(row.profileId || ''))) {
      void openPublicProfile(row.profileId).then(profile => {
        if (!profile) openCommunityProfile(row);
      });
      return;
    }
    openCommunityProfile(row);
  }));
}

function renderCommunityFeed(events) {
  const feed = document.getElementById('liveFeed');
  if (!feed || !Array.isArray(events)) return;
  const key = events.map(event => event?.id || '').join('|');
  if (key === communityFeedKey) return;
  communityFeedKey = key;
  feed.replaceChildren();
  const validEvents = events.filter(event => event?.skin?.name && event?.name);
  if (!validEvents.length) {
    feed.innerHTML = '<p class="px-2 text-[11px] font-bold text-gray-500">Поки тихо — відкрий кейс першим.</p>';
    return;
  }
  [...validEvents].reverse().forEach(event => {
    addActivityEvent({
      player: event.name,
      skin: { ...event.skin, id: event.id },
      outcome: 'win',
      activityKind: event.kind,
      profile: UUID_PATTERN.test(String(event.profileId || ''))
        ? { ...buildCommunityProfile(event), id: event.profileId, community: false, communityFallback: true }
        : buildCommunityProfile(event)
    });
  });
}

function applyCommunitySnapshot(data) {
  communitySnapshot = {
    leaderboard: Array.isArray(data?.leaderboard) ? data.leaderboard : [],
    events: Array.isArray(data?.events) ? data.events : [],
    rank: Number.isSafeInteger(data?.rank) ? data.rank : null,
    season: cleanText(data?.season, 16),
    circuit: data?.circuit && typeof data.circuit === 'object' ? data.circuit : null,
    rift: data?.rift && typeof data.rift === 'object' ? data.rift : null
  };
  renderLeaderboard();
  renderCommunityFeed(communitySnapshot.events);
  renderPulseCircuit();
  renderMidnightRift();
  renderSeasonalEvent();
  renderHalloweenSeasonShell();
}

async function syncCommunity(event = null, circuitPulse = null, riftPulse = null, { force = false } = {}) {
  if (!account?.communityId || !gameState || document.hidden || isProfileBlocked() || (isProfileHidden() && !force)) return;
  if (communitySyncInFlight) {
    if (event || circuitPulse || riftPulse) queuedCommunityEvents = [...queuedCommunityEvents, { event, circuitPulse, riftPulse }].slice(-8);
    return;
  }
  communitySyncInFlight = true;
  try {
    const data = await requestJson('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.communityId, player: getCommunityPlayerPayload(), ...(event ? { event } : {}), ...(circuitPulse ? { circuitPulse } : {}), ...(riftPulse ? { riftPulse } : {}) })
    }, 6_000);
    applyCommunitySnapshot(data);
  } catch {
    // The rest of the game stays usable while a Worker is redeploying.
  } finally {
    communitySyncInFlight = false;
    const nextEvent = queuedCommunityEvents.shift();
    if (nextEvent) void syncCommunity(nextEvent.event, nextEvent.circuitPulse, nextEvent.riftPulse);
  }
}

function announceCommunityActivity(kind, skin) {
  if (!skin?.name) return;
  const image = cleanImageUrl(skin.img || skin.image || '');
  void syncCommunity({
    id: makeUuid(),
    kind,
    skin: {
      name: cleanText(skin.name, 160),
      img: image,
      price: clampNumber(verifiedInventoryMarketPrice(skin) || verifiedMarketPriceForWear(skin), 0, MAX_STORED_ITEM_VALUE, 0),
      rarity: cleanText(skin.rarity?.name || skin.rarity, 48) || 'CS2',
      rarityColor: cleanColor(skin.rarity?.color || skin.rarityColor)
    }
  });
}

function startCommunitySync() {
  if (communitySyncStarted) return;
  communitySyncStarted = true;
  void syncCommunity();
  window.setInterval(() => void syncCommunity(), COMMUNITY_SYNC_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void syncCommunity();
  });
}

function normalizeShowcaseIds(value, inventory = null) {
  const ids = [...new Set((Array.isArray(value) ? value : [])
    .map(id => String(id || '').trim())
    .filter(Boolean))]
    .slice(0, 3);
  if (!Array.isArray(inventory)) return ids;
  const available = new Set(inventory.map(item => String(item?.id || '').trim()).filter(Boolean));
  return ids.filter(id => available.has(id));
}

function getShowcaseSelection() {
  return normalizeShowcaseIds(gameState?.showcase, userInventory);
}

function reconcileShowcaseSelection() {
  if (!gameState) return { ids: [], changed: false };
  const ids = getShowcaseSelection();
  const stored = Array.isArray(gameState.showcase) ? gameState.showcase.map(id => String(id || '').trim()).filter(Boolean) : [];
  const changed = stored.length !== ids.length || stored.some((id, index) => id !== ids[index]);
  if (changed) gameState.showcase = ids;
  return { ids, changed };
}

function getShowcaseItems() {
  const selected = getShowcaseSelection();
  return selected
    .map(id => userInventory.find(item => String(item.id) === String(id)))
    .filter(Boolean)
    .slice(0, 3);
}

function toggleShowcaseItem(itemId) {
  if (!gameState || !userInventory.some(item => String(item.id) === String(itemId))) return;
  const showcase = reconcileShowcaseSelection().ids;
  const key = String(itemId);
  const index = showcase.indexOf(key);
  if (index >= 0) {
    showcase.splice(index, 1);
    showToast('Предмет прибрано з вітрини.', 'info');
  } else {
    if (showcase.length >= 3) {
      showToast('На вітрині може бути максимум 3 предмети.', 'warn');
      return;
    }
    showcase.push(key);
    showToast('Предмет додано на вітрину.', 'success');
  }
  gameState.showcase = showcase;
  saveState();
  renderProfileSocial();
  renderProfileInventory();
  renderShowcaseManager();
}

function renderShowcaseManager() {
  const grid = document.getElementById('showcaseManagerGrid');
  const status = document.getElementById('showcaseManagerStatus');
  if (!grid || !status) return;
  const selected = new Set(getShowcaseSelection());
  status.innerHTML = `<i class="fa-solid fa-star mr-1 text-amber-300"></i> Вибрано ${selected.size} / 3`;
  if (!userInventory.length) {
    grid.innerHTML = '<div class="showcase-manager-empty"><i class="fa-solid fa-box-open"></i><strong>Інвентар ще порожній</strong><span>Відкрий кейс або отримай предмет, щоб додати його до вітрини.</span></div>';
    return;
  }
  const items = [...userInventory].sort((left, right) => verifiedInventoryMarketPrice(right) - verifiedInventoryMarketPrice(left));
  grid.innerHTML = items.map(item => {
    const active = selected.has(String(item.id));
    const unavailable = !active && selected.size >= 3;
    return `<button type="button" class="showcase-manager-item ${active ? 'is-selected' : ''}" data-showcase-toggle="${escapeHtml(String(item.id))}" aria-pressed="${active}" ${unavailable ? 'disabled aria-disabled="true" title="Спершу прибери один зі скінів з вітрини"' : ''}><img src="${escapeHtml(getSkinImageSrc(item))}" alt="" width="46" height="39" data-skin-name="${escapeHtml(item.name)}" loading="lazy" decoding="async" onerror="handleSkinImageError(this)"><span><b>${escapeHtml(item.name)}</b><small>${formatCredits(verifiedInventoryMarketPrice(item))}</small></span><i class="fa-solid ${active ? 'fa-star' : 'fa-plus'}"></i></button>`;
  }).join('');
  grid.querySelectorAll('[data-showcase-toggle]').forEach(button => button.addEventListener('click', () => toggleShowcaseItem(button.dataset.showcaseToggle)));
}

function openShowcaseManager() {
  if (!gameState) return;
  const repaired = reconcileShowcaseSelection();
  if (repaired.changed) saveState();
  renderShowcaseManager();
  openModal('showcaseModal');
}

function getLegendTitle(snapshot) {
  if (snapshot.prestige >= 3) return { label: 'ТРІЙНА КОРОНА', note: 'Три престижі — це вже не випадковість.', icon: 'fa-crown', tone: 'violet' };
  if (snapshot.rank.title === 'Легенда') return { label: 'ЛЕГЕНДА АРЕНИ', note: 'Профіль, який говорить сам за себе.', icon: 'fa-trophy', tone: 'emerald' };
  if (snapshot.collections > 0) return { label: 'КОЛЕКЦІОНЕР СИГНАЛУ', note: 'Повна добірка — рідкісна форма терпіння.', icon: 'fa-gem', tone: 'cyan' };
  if (snapshot.bestValue >= 500) return { label: 'ВЕЛИКА ЦІЛЬ', note: 'У колекції вже є предмет, яким варто пишатися.', icon: 'fa-bullseye', tone: 'amber' };
  if (snapshot.achievements >= 3) return { label: 'ЗБИРАЧ ВІДЗНАК', note: 'Досягнення тут не для галочки.', icon: 'fa-medal', tone: 'cyan' };
  if (snapshot.rounds >= 10) return { label: 'УТРИМУЄ ТЕМП', note: 'Вже достатньо раундів, щоб формувати стиль гри.', icon: 'fa-fire', tone: 'amber' };
  return { label: 'ПЕРШИЙ СИГНАЛ', note: 'Кожна сильна колекція починається з одного предмета.', icon: 'fa-satellite-dish', tone: 'cyan' };
}

function getLegendSnapshot() {
  const level = getPlayerLevel();
  const rank = getPlayerRank(level);
  const prestige = Math.max(0, Number(gameState?.prestige) || 0);
  const stats = gameState?.stats || {};
  const allTime = gameState?.allTime || {};
  const inventory = [...userInventory].sort((left, right) => verifiedInventoryMarketPrice(right) - verifiedInventoryMarketPrice(left));
  const showcase = getShowcaseItems();
  const signatureItems = (showcase.length ? showcase : inventory).slice(0, 3);
  const best = inventory[0] || null;
  const collections = COLLECTION_DEFINITIONS.filter(collection => getCollectionProgress(collection).complete).length;
  const snapshot = {
    player: cleanText(account?.nick || currentUser?.name || 'Гравець', 28) || 'Гравець',
    avatar: getProfileAvatarPreviewSource(),
    connectedSteam: Boolean(currentUser?.steamId),
    level,
    rank,
    prestige,
    rounds: Math.max(0, Number(allTime.rounds) || Number(stats.rounds) || 0),
    bestValue: Math.max(0, Number(stats.bestValue) || verifiedInventoryMarketPrice(best)),
    collectionValue: inventory.reduce((sum, item) => sum + verifiedInventoryMarketPrice(item), 0),
    achievements: ACHIEVEMENT_DEFINITIONS.filter(achievement => gameState?.achievements?.[achievement.id]).length,
    collections,
    streak: Math.max(0, Number(stats.bestStreak) || 0),
    best,
    signatureItems,
    latest: Array.isArray(gameState?.rounds) ? gameState.rounds[0] : null,
    style: getProfileStyleDefinition(),
    frame: getHalloweenCosmetics().activeFrame,
    title: null
  };
  snapshot.title = getLegendTitle(snapshot);
  return snapshot;
}

function getLegendNarrative(snapshot) {
  if (snapshot.latest?.win) return `Останній запис: перемога за ${formatCredits(snapshot.latest.targetValue || 0)} у режимі «${cleanText(snapshot.latest.mode, 24) || 'гра'}».`;
  if (snapshot.prestige) return `Престиж P${snapshot.prestige} підсилює XP-потік назавжди. Наступний сигнал уже формується.`;
  if (snapshot.best) return `Яскравий експонат — ${cleanText(snapshot.best.name, 52)}. Колекція має своє обличчя.`;
  return 'Зіграні раунди, скіни та досягнення автоматично збираються у твою історію.';
}

function legendSkinMarkup(item) {
  if (!item) return '<div class="legend-skin is-empty"><i class="fa-solid fa-plus"></i><span>Твій перший дроп</span></div>';
  const rarity = getItemRarity(item);
  const tone = cleanColor(rarity.color) || '#67e8f9';
  return `<div class="legend-skin" style="--legend-rarity:${tone}"><img src="${escapeHtml(getSkinImageSrc(item))}" alt="${escapeHtml(item.name)}" data-skin-name="${escapeHtml(item.name)}" loading="lazy" onerror="handleSkinImageError(this)"><span>${escapeHtml(cleanText(item.name, 36))}</span><small>${formatCredits(verifiedInventoryMarketPrice(item))}</small><i class="legend-skin-rarity" aria-label="Рідкість: ${escapeHtml(rarity.name)}"></i></div>`;
}

function legendDossierMarkup(snapshot, { expanded = false } = {}) {
  const bestRarity = snapshot.best ? getItemRarity(snapshot.best) : null;
  const bestTone = cleanColor(bestRarity?.color) || '#67e8f9';
  const badge = snapshot.prestige ? `<span class="legend-prestige"><i class="fa-solid fa-crown"></i>P${snapshot.prestige}</span>` : '';
  const frame = snapshot.frame ? `<span class="legend-frame-label"><i class="fa-solid fa-wand-magic-sparkles"></i>${escapeHtml(snapshot.frame.title)}</span>` : `<span class="legend-frame-label"><i class="fa-solid ${snapshot.style.icon}"></i>${escapeHtml(snapshot.style.title)}</span>`;
  const bestMarkup = snapshot.best
    ? `<img src="${escapeHtml(getSkinImageSrc(snapshot.best))}" alt="${escapeHtml(snapshot.best.name)}" data-skin-name="${escapeHtml(snapshot.best.name)}" loading="lazy" onerror="handleSkinImageError(this)"><div><p>ГОЛОВНИЙ ЕКСПОНАТ</p><strong>${escapeHtml(cleanText(snapshot.best.name, 48))}</strong><small>${formatCredits(verifiedInventoryMarketPrice(snapshot.best))} · ${escapeHtml(bestRarity.name)}</small></div>`
    : `<i class="fa-solid fa-box-open"></i><div><p>ГОЛОВНИЙ ЕКСПОНАТ</p><strong>Твій перший дроп</strong><small>Відкрий кейс — і він з’явиться тут.</small></div>`;
  return `<section class="legend-dossier ${expanded ? 'is-expanded' : ''}" data-style="${escapeHtml(snapshot.style.id)}" style="--legend-tone:${bestTone}">
    <div class="legend-dossier-glow" aria-hidden="true"></div>
    <header class="legend-dossier-head"><p><i class="fa-solid fa-fingerprint"></i> ПАСПОРТ ЛЕГЕНДИ</p><span>PD // ${String(snapshot.level).padStart(2, '0')}</span></header>
    <div class="legend-dossier-main">
      <div class="legend-identity"><div class="legend-avatar"><img src="${escapeHtml(snapshot.avatar)}" alt="Аватар ${escapeHtml(snapshot.player)}" onerror="handleSteamAvatarError(this)"><i class="fa-solid ${snapshot.connectedSteam ? 'fa-steam' : 'fa-gamepad'}"></i></div><div><p class="legend-kicker">${snapshot.connectedSteam ? 'STEAM · СИНХРОНІЗОВАНО' : 'ПРОФІЛЬ ГРИ · АКТИВНИЙ'}</p><h3>${escapeHtml(snapshot.player)} ${badge}</h3><span class="legend-rank"><i class="fa-solid ${snapshot.rank.icon}"></i>${escapeHtml(snapshot.rank.title)} · LVL ${snapshot.level}</span></div></div>
      <div class="legend-title-seal is-${snapshot.title.tone}"><i class="fa-solid ${snapshot.title.icon}"></i><div><p>СТАТУС</p><strong>${escapeHtml(snapshot.title.label)}</strong><span>${escapeHtml(snapshot.title.note)}</span></div></div>
    </div>
    <div class="legend-spotlight" style="--legend-rarity:${bestTone}">${bestMarkup}</div>
    <div class="legend-stats"><div><span>КОЛЕКЦІЯ</span><strong>${formatCredits(snapshot.collectionValue)}</strong></div><div><span>РАУНДИ</span><strong>${snapshot.rounds}</strong></div><div><span>СЕРІЯ</span><strong>${snapshot.streak || '—'}</strong></div><div><span>ВІДЗНАКИ</span><strong>${snapshot.achievements}/${ACHIEVEMENT_DEFINITIONS.length}</strong></div></div>
    <div class="legend-bottom"><div class="legend-lineup"><span>СИГНАТУРНА ЛІНІЙКА</span><div>${[0, 1, 2].map(index => legendSkinMarkup(snapshot.signatureItems[index])).join('')}</div></div><div class="legend-summary"><p>${escapeHtml(getLegendNarrative(snapshot))}</p>${frame}</div></div>
    ${expanded ? `<div class="legend-dossier-actions"><button type="button" onclick="shareLegendDossier()"><i class="fa-solid fa-share-nodes"></i> Поділитися легендою</button><button type="button" class="legend-copy-action" onclick="copyLegendDossierLink()"><i class="fa-solid fa-link"></i> Скопіювати посилання</button></div>` : `<button type="button" class="legend-open-action" onclick="openLegendDossier()"><span>Відкрити досьє</span><i class="fa-solid fa-arrow-up-right-from-square"></i></button>`}
  </section>`;
}

function renderLegendProfile() {
  const root = document.getElementById('profileLegendCard');
  if (!root || !gameState) return;
  root.innerHTML = legendDossierMarkup(getLegendSnapshot());
}

function renderLegendDossier() {
  const root = document.getElementById('legendDossierContent');
  if (!root || !gameState) return;
  root.innerHTML = legendDossierMarkup(getLegendSnapshot(), { expanded: true });
}

function openLegendDossier() {
  renderLegendDossier();
  openModal('legendModal');
}

async function copyLegendDossierLink() {
  const url = getPublicShareUrl();
  url.hash = 'profile';
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url.href);
    showToast('Посилання на профіль скопійовано.', 'success');
  } catch {
    window.prompt('Скопіюй посилання на профіль:', url.href);
  }
}

async function shareLegendDossier() {
  const snapshot = getLegendSnapshot();
  const url = getPublicShareUrl();
  url.hash = 'profile';
  const title = `Паспорт легенди · ${snapshot.player}`;
  const mainSkin = snapshot.best ? ` · ${cleanText(snapshot.best.name, 56)}` : '';
  const text = `${snapshot.player} · ${snapshot.title.label} · LVL ${snapshot.level}${snapshot.prestige ? ` · P${snapshot.prestige}` : ''}${mainSkin}. Колекція: ${formatCredits(snapshot.collectionValue)}.`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url: url.href });
      showToast('Паспорт легенди готовий до поширення.', 'success');
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text}\n${url.href}`);
      showToast('Текст і посилання на паспорт скопійовано.', 'success');
      return;
    }
    window.prompt('Скопіюй паспорт легенди:', `${text}\n${url.href}`);
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Не вдалося відкрити поширення.', 'warn');
  }
}

function renderProfileSocial() {
  renderLegendProfile();
  const rank = getPlayerRank();
  const rankBadge = document.getElementById('profileRankBadge');
  if (rankBadge) rankBadge.innerHTML = `<i class="fa-solid ${rank.icon}"></i>${escapeHtml(rank.title)}`;
  const streakBadge = document.getElementById('profileDailyStreak');
  const streak = gameState?.dailyStreak || {};
  if (streakBadge) streakBadge.innerHTML = `<i class="fa-solid fa-fire"></i>${Math.max(0, Number(streak.current) || 0)} дн.`;
  const passBadge = document.getElementById('profilePassBadge');
  if (passBadge) passBadge.classList.toggle('hidden', !getBattlePassState().premium);

  const referral = gameState?.referrals && typeof gameState.referrals === 'object' ? gameState.referrals : {};
  const referralCount = Math.max(0, Number(referral.totalPartners ?? referral.totalRewarded) || 0);
  const referralDividends = Math.max(0, Number(referral.totalDividends) || 0);
  const joinedFrom = referral.joinedFrom && typeof referral.joinedFrom === 'object' ? referral.joinedFrom : null;
  const referralCountNode = document.getElementById('profileReferralCount');
  const referralRewardNode = document.getElementById('profileReferralReward');
  const referralStatusNode = document.getElementById('profileReferralStatus');
  const referralDividendsNode = document.getElementById('profileReferralDividends');
  const referralWeeklyNode = document.getElementById('profileReferralWeekly');
  if (referralCountNode) referralCountNode.textContent = String(referralCount);
  if (referralRewardNode) referralRewardNode.textContent = `${formatCredits(REFERRAL_MILESTONES.reduce((sum, milestone) => sum + milestone.ownerReward, 0))}`;
  if (referralDividendsNode) referralDividendsNode.textContent = formatCredits(referralDividends);
  if (referralWeeklyNode) referralWeeklyNode.textContent = `+${formatCredits(REFERRAL_WEEKLY_OWNER_REWARD)}`;
  if (referralStatusNode) {
    referralStatusNode.textContent = pendingReferralAccountId()
      ? 'Підключи Steam, щоб прийняти запрошення'
      : joinedFrom
        ? 'Твій старт: LVL 3 відкриє перший бонус'
      : referralCount
        ? `Команда: ${referralCount}`
        : hasReadySteamAccount()
          ? 'Твоя команда'
          : 'Підключи Steam для програми';
  }

  const showcase = document.getElementById('profileShowcase');
  if (showcase) {
    const items = getShowcaseItems();
    const selectedSlots = items.map(item => {
      const rarity = getItemRarity(item);
      return `<button type="button" class="profile-showcase-item rarity-surface" style="--rarity-color:${rarity.color}" data-showcase-detail="${escapeHtml(String(item.id))}" title="Деталі: ${escapeHtml(item.name)}"><img src="${escapeHtml(getSkinImageSrc(item))}" alt="${escapeHtml(item.name)}" data-skin-id="${escapeHtml(getSkinKey(item))}" data-skin-name="${escapeHtml(item.name)}" loading="lazy" onerror="handleSkinImageError(this)"><strong>${escapeHtml(item.name)}</strong><small>${formatCredits(verifiedInventoryMarketPrice(item))}</small>${rarityStripMarkup(rarity, 'profile-showcase-rarity')}</button>`;
    });
    const emptySlots = Array.from({ length: Math.max(0, 3 - selectedSlots.length) }, () => '<button type="button" class="profile-showcase-empty profile-showcase-add" data-showcase-manage><i class="fa-solid fa-plus"></i><span>Обрати скін</span></button>');
    showcase.innerHTML = [...selectedSlots, ...emptySlots].join('');
    showcase.querySelectorAll('[data-showcase-detail]').forEach(button => button.addEventListener('click', () => showItemDetail(button.dataset.showcaseDetail)));
    showcase.querySelectorAll('[data-showcase-manage]').forEach(button => button.addEventListener('click', openShowcaseManager));
  }
  renderProfileWishlist();

  const history = document.getElementById('profileRoundHistory');
  const summary = document.getElementById('profileHistorySummary');
  const rounds = Array.isArray(gameState?.rounds) ? gameState.rounds.slice(0, 5) : [];
  if (summary) summary.textContent = `краща серія ${Math.max(0, Number(gameState?.stats?.bestStreak) || 0)}`;
  if (history) {
    history.innerHTML = rounds.length
      ? rounds.map(round => `<div class="profile-history-item ${round.win ? 'is-win' : 'is-loss'}"><i class="fa-solid ${round.win ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><div><strong>${escapeHtml(cleanText(round.targetName, 70) || 'Раунд')}</strong><small>${escapeHtml(cleanText(round.mode, 20) || 'гра')} · ${new Date(round.at || Date.now()).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</small></div><em>${round.win ? '+' : ''}${formatCredits(round.targetValue || 0)}</em></div>`).join('')
      : '<div class="profile-showcase-empty">Зіграний раунд з’явиться тут.</div>';
  }
}

function getInventoryDuplicateCounts(items = userInventory) {
  const counts = new Map();
  (Array.isArray(items) ? items : []).forEach(item => {
    const wear = getWear(item);
    const key = `${normalizeSkinName(item?.name)}|${wear.code || ''}`;
    if (!key || key === '|') return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function getInventoryDuplicateKey(item) {
  const wear = getWear(item);
  return `${normalizeSkinName(item?.name)}|${wear.code || ''}`;
}

function getInventorySource(item) {
  if (item?.steamImported) return 'steam';
  if (item?.exclusive) return 'exclusive';
  return 'drop';
}

function getCollectionForInventoryItem(item) {
  const name = normalizeSkinName(item?.name);
  return COLLECTION_DEFINITIONS.find(collection => collection.items.some(entry => normalizeSkinName(entry) === name)) || null;
}

function getNewcomerGuide() {
  const allTime = gameState?.allTime || {};
  const stats = gameState?.stats || {};
  const totalRounds = Math.max(0, Number(allTime.rounds) || Number(stats.rounds) || 0);
  const hasClaimedTask = Array.isArray(gameState?.daily?.claimed) && gameState.daily.claimed.length > 0;
  const hasShowcase = getShowcaseItems().length > 0;
  if (!totalRounds) return { step: 1, target: 'case', icon: 'fa-box-open', title: 'Зроби перший дроп' };
  if (!hasClaimedTask) return { step: 2, target: 'tasks', icon: 'fa-bullseye', title: 'Забери першу нагороду' };
  if (!hasShowcase) return { step: 3, target: 'showcase', icon: 'fa-gem', title: 'Додай скін у вітрину', profileTab: 'showcase' };
  return null;
}

function renderNewcomerGuide() {
  const targets = document.querySelectorAll('[data-onboarding-target]');
  targets.forEach(target => {
    target.classList.remove('is-onboarding-target');
    target.removeAttribute('aria-describedby');
    target.querySelector('.newcomer-action-hint')?.remove();
  });
  if (!gameState) return;
  const guide = getNewcomerGuide();
  if (!guide) return;
  const target = document.querySelector(`[data-onboarding-target="${guide.target}"]`);
  if (!target) return;
  if (guide.profileTab) target.addEventListener('click', () => setProfileTab(guide.profileTab), { once: true });
  const hintId = `newcomerHint${guide.step}`;
  target.classList.add('is-onboarding-target');
  target.setAttribute('aria-describedby', hintId);
  target.insertAdjacentHTML('beforeend', `<span id="${hintId}" class="newcomer-action-hint" role="status"><b>${guide.step}/3</b><span><i class="fa-solid ${escapeHtml(guide.icon)}"></i>${escapeHtml(guide.title)}</span></span>`);
}

function renderCommandHub() {
  if (!gameState) return;
  ensureDailyState();
  const tasksEnabled = isRuntimeFeatureEnabled('tasks');
  const level = getPlayerLevel();
  const progress = getLevelProgress();
  const name = cleanText(account?.nick || currentUser?.name || 'Гравець', 28) || 'Гравець';
  const collectionValue = userInventory.reduce((sum, item) => sum + verifiedInventoryMarketPrice(item), 0);
  const taskList = tasksEnabled ? getDailyTasks() : [];
  const claimed = new Set(gameState.daily?.claimed || []);
  const openTasks = taskList.map(task => {
    const raw = Math.max(0, Number(task.value(gameState.daily)) || 0);
    const current = Math.min(task.goal, raw);
    return { task, current, done: current >= task.goal, claimed: claimed.has(task.id), percent: task.goal ? Math.round((current / task.goal) * 100) : 0 };
  }).filter(entry => !entry.claimed).sort((left, right) => Number(right.done) - Number(left.done) || right.percent - left.percent).slice(0, 3);
  const pendingClaims = openTasks.filter(entry => entry.done).length;
  const duplicateCount = [...getInventoryDuplicateCounts().values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const completedCollections = COLLECTION_DEFINITIONS.filter(collection => getCollectionProgress(collection).complete).length;

  const greeting = document.getElementById('hubGreeting');
  if (greeting) greeting.textContent = pendingClaims
    ? `${name}, у тебе ${pendingClaims} ${pendingClaims === 1 ? 'готова нагорода' : 'готові нагороди'} на сьогодні.`
    : userInventory.length
      ? `${name}, колекція синхронізована. Обери наступний режим або завершуй ціль.`
      : `${name}, почни з кейса або підключи Steam, щоб зібрати свою вітрину.`;
  const levelNode = document.getElementById('hubLevel');
  if (levelNode) levelNode.textContent = `LVL ${level}`;
  const xpNode = document.getElementById('hubXp');
  if (xpNode) xpNode.textContent = `${progress.current.toLocaleString('uk-UA')} / ${progress.total.toLocaleString('uk-UA')} XP`;
  const ring = document.getElementById('hubLevelRing');
  if (ring) ring.style.setProperty('--hub-progress', `${progress.percent}%`);

  renderNewcomerGuide();

  const pulse = document.getElementById('hubPulseStats');
  if (pulse) pulse.innerHTML = [
    { icon: 'fa-coins', label: 'Баланс', value: formatCredits(currentUser?.balance || 0), accent: 'amber' },
    { icon: 'fa-gem', label: 'Колекція', value: formatCredits(collectionValue), accent: 'cyan' },
    { icon: 'fa-fire', label: 'Серія', value: `${Math.max(0, Number(gameState.dailyStreak?.current) || 0)} дн.`, accent: 'orange' },
    { icon: 'fa-copy', label: 'Дублі', value: duplicateCount ? `×${duplicateCount}` : '—', accent: 'violet' }
  ].map(stat => `<div class="command-hub-pulse-card is-${stat.accent}"><i class="fa-solid ${stat.icon}"></i><span>${stat.label}</span><strong>${stat.value}</strong></div>`).join('');

  const focus = document.getElementById('hubDailyFocus');
  if (focus) {
    focus.innerHTML = !tasksEnabled
      ? '<div class="command-hub-empty"><i class="fa-solid fa-eye-slash"></i><strong>Завдання тимчасово приховано</strong><span>Адміністрація готує наступну добірку цілей.</span></div>'
      : openTasks.length
      ? openTasks.map(entry => {
        const goalLabel = entry.task.goal >= 1000 ? formatCredits(entry.task.goal) : String(entry.task.goal);
        const currentLabel = entry.task.goal >= 1000 ? formatCredits(entry.current) : String(entry.current);
        return `<div class="command-hub-focus-item ${entry.done ? 'is-ready' : ''}"><i class="fa-solid ${entry.task.icon}"></i><div><strong>${escapeHtml(entry.task.title)}</strong><span>${currentLabel} / ${goalLabel}</span><div><i style="width:${entry.percent}%"></i></div></div>${entry.done ? `<button type="button" data-hub-claim="${escapeHtml(entry.task.id)}">Забрати</button>` : '<button type="button" data-hub-open-tasks>До цілі</button>'}</div>`;
      }).join('')
      : '<div class="command-hub-empty"><i class="fa-solid fa-circle-check"></i><strong>На сьогодні все готово</strong><span>Повернись завтра за новими цілями.</span></div>';
    focus.querySelectorAll('[data-hub-claim]').forEach(button => button.addEventListener('click', () => claimDailyTask(button.dataset.hubClaim)));
    focus.querySelectorAll('[data-hub-open-tasks]').forEach(button => button.addEventListener('click', () => showPage('tasks')));
  }

  const collection = document.getElementById('hubCollectionPreview');
  if (collection) {
    const highlights = [...userInventory].sort((left, right) => verifiedInventoryMarketPrice(right) - verifiedInventoryMarketPrice(left)).slice(0, 3);
    const collectionRows = COLLECTION_DEFINITIONS.map(definition => {
      const state = getCollectionProgress(definition);
      const percent = state.total ? Math.round((state.count / state.total) * 100) : 0;
      return `<div class="command-hub-collection-progress"><span>${escapeHtml(definition.title)}</span><strong>${state.count}/${state.total}</strong><i><b style="width:${percent}%"></b></i></div>`;
    }).join('');
    collection.innerHTML = `<div class="command-hub-showcase">${highlights.length ? highlights.map(item => `<button type="button" data-hub-skin="${escapeHtml(String(item.id))}" title="Деталі: ${escapeHtml(item.name)}"><img src="${escapeHtml(getSkinImageSrc(item))}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="handleSkinImageError(this)"><span>${escapeHtml(item.name)}</span><small>${formatCredits(verifiedInventoryMarketPrice(item))}</small></button>`).join('') : '<div class="command-hub-empty"><i class="fa-solid fa-box-open"></i><strong>Колекція ще порожня</strong><span>Перший дроп з’явиться тут.</span></div>'}</div><div class="command-hub-collection-summary"><span>Завершено колекцій</span><strong>${completedCollections} / ${COLLECTION_DEFINITIONS.length}</strong></div><div class="command-hub-collection-list">${collectionRows}</div>`;
    collection.querySelectorAll('[data-hub-skin]').forEach(button => button.addEventListener('click', () => showItemDetail(button.dataset.hubSkin)));
  }
  renderRuntimePromos();
  renderSignalSeasonHub();
}

function getSignalCampaignProgress() {
  const state = getSignalSeasonState();
  const allTime = gameState?.allTime || {};
  const stats = gameState?.stats || {};
  const achievements = ACHIEVEMENT_DEFINITIONS.filter(achievement => gameState?.achievements?.[achievement.id]).length;
  const totalRounds = Math.max(0, Number(allTime.rounds) || Number(stats.rounds) || 0);
  const totalCases = Math.max(0, Number(allTime.cases) || Number(stats.cases) || 0);
  const collectionProgress = COLLECTION_DEFINITIONS.filter(collection => getCollectionProgress(collection).complete).length;
  const nodes = [
    { id: 'first-signal', icon: 'fa-satellite-dish', title: 'Перший імпульс', note: 'Зіграй раунд або відкрий кейс', page: 'case', action: 'До кейсів', done: totalRounds + totalCases >= 1 },
    { id: 'three-drops', icon: 'fa-gem', title: 'Своя колекція', note: 'Май 3 предмети в інвентарі', page: 'profile', action: 'До профілю', done: userInventory.length >= 3 },
    { id: 'tempo', icon: 'fa-bolt', title: 'Тримай темп', note: 'Зіграй 10 раундів', page: 'upgrader', action: 'До апгрейду', done: totalRounds >= 10 },
    { id: 'marks', icon: 'fa-medal', title: 'Знак майстерності', note: 'Відкрий 3 досягнення', page: 'tasks', action: 'До цілей', done: achievements >= 3 },
    { id: 'showcase', icon: 'fa-star', title: 'Вітрина', note: 'Обери 3 предмети для показу', page: 'profile', action: 'Налаштувати', done: getShowcaseItems().length >= 3 },
    { id: 'rise', icon: 'fa-tower-broadcast', title: 'Високий сигнал', note: 'Досягни LVL 5 або заверши колекцію', page: 'tasks', action: 'До цілей', done: getPlayerLevel() >= 5 || collectionProgress >= 1 }
  ];
  const completed = nodes.filter(node => node.done).length;
  const rewards = [
    { step: 2, icon: 'fa-fingerprint', title: 'Відбиток Сигналу', note: 'Видимий у твоєму публічному профілі', kind: 'badge' },
    { step: 4, icon: 'fa-satellite-dish', title: 'Провідник Сигналу', note: 'Титул для профілю', cosmetic: 'signal_pathfinder_2026' },
    { step: 6, icon: 'fa-wave-square', title: 'Резонанс', note: 'Рамка Steam-аватара', cosmetic: 'signal_resonance_2026' }
  ];
  const next = nodes.find(node => !node.done) || null;
  return { state, nodes, rewards, completed, total: nodes.length, percent: Math.round((completed / nodes.length) * 100), next, achievements, collectionProgress };
}

function addSignalSeasonMoment(state, reward) {
  const moment = {
    id: `signal-${reward.step}-${Date.now()}`,
    at: Date.now(),
    icon: reward.icon,
    title: reward.title,
    note: reward.note
  };
  state.moments = [moment, ...(Array.isArray(state.moments) ? state.moments : [])].slice(0, 12);
}

function claimSignalSeasonReward(step) {
  if (!gameState) return;
  const progress = getSignalCampaignProgress();
  const runtimeSeason = getRuntimeSeason();
  const reward = progress.rewards.find(entry => entry.step === Number(step));
  if (!reward || progress.completed < reward.step) {
    showToast('Спочатку активуй потрібні вузли маршруту.', 'info');
    return;
  }
  if (progress.state.claimed.includes(reward.step)) {
    showToast('Ця нагорода вже у твоїй легенді.', 'info');
    return;
  }
  progress.state.claimed.push(reward.step);
  if (reward.cosmetic) {
    const cosmetic = SIGNAL_SEASON_COSMETICS[reward.cosmetic];
    const list = cosmetic.kind === 'title' ? progress.state.cosmetics.titles : progress.state.cosmetics.frames;
    if (!list.includes(cosmetic.id)) list.push(cosmetic.id);
    activateSeasonalCosmetic(cosmetic.id);
  }
  addSignalSeasonMoment(progress.state, reward);
  saveState();
  renderGameHub();
  renderProfileCosmeticsSummary();
  renderProfileCosmeticsModal();
  soundWin();
  showToast(`Сезон «Сигнал»: «${reward.title}» додано до профілю.`, 'success');
}

function getSignalJournal(progress) {
  const stored = Array.isArray(progress.state.moments) ? progress.state.moments : [];
  const generated = [];
  const best = [...userInventory].sort((left, right) => verifiedInventoryMarketPrice(right) - verifiedInventoryMarketPrice(left))[0];
  if (best) generated.push({ icon: 'fa-gem', title: cleanText(best.name, 42), note: 'Найсильніший експонат у поточній колекції' });
  if (progress.collectionProgress) generated.push({ icon: 'fa-layer-group', title: `${progress.collectionProgress} колекц. завершено`, note: 'Колекційна робота відмічена в досьє' });
  if (gameState?.prestige) generated.push({ icon: 'fa-crown', title: `Престиж P${gameState.prestige}`, note: 'Постійний слід у легенді профілю' });
  if (progress.achievements) generated.push({ icon: 'fa-medal', title: `${progress.achievements} відзнак`, note: 'Відкриті досягнення формують твою історію' });
  return [...stored, ...generated].slice(0, 4);
}

function renderSignalSeasonHub() {
  const root = document.getElementById('hubSignalSeason');
  if (!root || !gameState) return;
  if (!isRuntimeFeatureEnabled('seasonalEvents')) {
    root.replaceChildren();
    return;
  }
  const progress = getSignalCampaignProgress();
  const runtimeSeason = getRuntimeSeason();
  const next = progress.next;
  const claimed = progress.state.claimed.length;
  const phase = progress.completed >= progress.total ? 'ЛЕГЕНДА' : progress.completed >= 4 ? 'РЕЗОНАНС' : progress.completed >= 2 ? 'ПОСИЛЕННЯ' : 'СКАНУВАННЯ';
  const nodes = progress.nodes.map(node => `<i class="${node.done ? 'is-done' : next?.id === node.id ? 'is-next' : ''}" title="${escapeHtml(node.title)}"></i>`).join('');
  root.innerHTML = `<article class="signal-season-hub-card"><div class="signal-season-hub-beacon" aria-hidden="true"><i class="fa-solid fa-satellite-dish"></i><span>01</span></div><div class="signal-season-hub-copy"><p><i class="fa-solid fa-tower-broadcast"></i> ${escapeHtml(runtimeSeason.title)} · ФАЗА ${phase}</p><h2>${progress.completed} <small>/ ${progress.total}</small> вузлів у мережі</h2><span>${next ? `Наступний сигнал: ${escapeHtml(next.title)} · ${escapeHtml(next.note)}` : escapeHtml(runtimeSeason.subtitle)}</span></div><div class="signal-season-hub-meter"><div class="signal-season-hub-meter-top"><strong>${progress.percent}%</strong><small>${claimed}/${progress.rewards.length} нагород</small></div><i aria-label="Прогрес сезону ${progress.percent}%"><b style="width:${progress.percent}%"></b></i><div class="signal-season-hub-nodes" aria-hidden="true">${nodes}</div></div><button type="button" data-signal-open>Відкрити сезон <i class="fa-solid fa-arrow-right"></i></button></article>`;
  root.querySelector('[data-signal-open]')?.addEventListener('click', () => showPage('tasks'));
}

function renderSignalSeason() {
  const root = document.getElementById('signalSeason');
  if (!root || !gameState) return;
  if (!isRuntimeFeatureEnabled('seasonalEvents')) {
    root.replaceChildren();
    return;
  }
  const progress = getSignalCampaignProgress();
  const runtimeSeason = getRuntimeSeason();
  const journal = getSignalJournal(progress);
  const phase = progress.completed >= progress.total ? 'ЛЕГЕНДА' : progress.completed >= 4 ? 'РЕЗОНАНС' : progress.completed >= 2 ? 'ПОСИЛЕННЯ' : 'СКАНУВАННЯ';
  const remainingNodes = progress.total - progress.completed;
  const remainingNodesLabel = remainingNodes === 1 ? 'вузол' : remainingNodes < 5 ? 'вузли' : 'вузлів';
  const isComplete = progress.completed === progress.total;
  const cosmetics = getHalloweenCosmetics();
  const titleReward = SIGNAL_SEASON_COSMETICS.signal_pathfinder_2026;
  const frameReward = SIGNAL_SEASON_COSMETICS.signal_resonance_2026;
  const hasTitle = progress.state.cosmetics.titles.includes(titleReward.id);
  const hasFrame = progress.state.cosmetics.frames.includes(frameReward.id);
  const titleStatus = cosmetics.activeTitle?.id === titleReward.id ? 'Активний титул' : hasTitle ? 'Розблоковано' : 'Чекає у нагородах';
  const frameStatus = cosmetics.activeFrame?.id === frameReward.id ? 'Активна рамка' : hasFrame ? 'Розблоковано' : 'Чекає у нагородах';
  const avatarPreview = getProfileAvatarPreviewSource();
  const nodeMarkup = progress.nodes.map((node, index) => {
    const isNext = progress.next?.id === node.id;
    const status = node.done ? 'Сигнал зафіксовано' : isNext ? 'Наступний сигнал' : 'Очікує маршруту';
    return `<button type="button" class="signal-season-node ${node.done ? 'is-done' : isNext ? 'is-next' : ''}" data-signal-page="${escapeHtml(node.page)}"><i class="signal-season-node-index">0${index + 1}</i><span><i class="fa-solid ${node.done ? 'fa-check' : node.icon}"></i></span><div><em>ВУЗОЛ 0${index + 1}</em><b>${escapeHtml(node.title)}</b><small>${escapeHtml(node.done ? node.note : isNext ? node.note : 'Виконай попередній вузол, щоб відкрити сигнал.')}</small><strong>${status}</strong></div><i class="signal-season-node-state fa-solid ${node.done ? 'fa-circle-check' : isNext ? 'fa-satellite-dish' : 'fa-lock'}"></i></button>`;
  }).join('');
  const rewardMarkup = progress.rewards.map(reward => {
    const claimed = progress.state.claimed.includes(reward.step);
    const ready = progress.completed >= reward.step && !claimed;
    return `<button type="button" class="signal-season-reward ${claimed ? 'is-claimed' : ready ? 'is-ready' : ''}" ${ready ? `data-signal-claim="${reward.step}"` : 'disabled'}><i class="fa-solid ${claimed ? 'fa-check' : reward.icon}"></i><span><em>${reward.step} / ${progress.total}</em><b>${escapeHtml(reward.title)}</b><small>${escapeHtml(reward.note)}</small></span><strong>${claimed ? 'Є' : ready ? 'Забрати' : 'Заблоковано'}</strong></button>`;
  }).join('');
  const journalMarkup = journal.length
    ? journal.map(entry => `<li><i class="fa-solid ${escapeHtml(cleanText(entry.icon, 48) || 'fa-sparkles')}"></i><span><b>${escapeHtml(cleanText(entry.title, 52))}</b><small>${escapeHtml(cleanText(entry.note, 92))}</small></span></li>`).join('')
    : '<li class="is-empty"><i class="fa-solid fa-book-open"></i><span><b>Перший запис чекає</b><small>Твій прогрес автоматично стане частиною легенди.</small></span></li>';
  const hallRows = (Array.isArray(communitySnapshot?.leaderboard) ? communitySnapshot.leaderboard : []).slice(0, 3);
  const hallMarkup = hallRows.length
    ? hallRows.map((row, index) => `<button type="button" class="signal-hall-row ${row.isMe ? 'is-me' : ''}" data-signal-hall="${index}"><span>#${Number(row.rank) || index + 1}</span><b>${escapeHtml(cleanText(row.name, 24) || 'Гравець')}</b><em>LVL ${clampNumber(row.level, 1, 9999, 1)}</em></button>`).join('')
    : '<p class="signal-hall-empty"><i class="fa-solid fa-satellite-dish"></i> Перший Steam-гравець запалить Зал резонансу.</p>';
  const routeAction = progress.next
    ? `<button type="button" class="signal-season-route-action" data-signal-next="${escapeHtml(progress.next.page)}"><i class="fa-solid fa-satellite-dish"></i><span><small>НАСТУПНА КООРДИНАТА</small><b>${escapeHtml(progress.next.title)}</b></span><em>${escapeHtml(progress.next.note)}</em><i class="fa-solid fa-arrow-right"></i></button>`
    : '<button type="button" class="signal-season-route-action is-complete" data-signal-profile><i class="fa-solid fa-star"></i><span><small>МАРШРУТ ЗАВЕРШЕНО</small><b>Твій Сигнал увійшов у легенду</b></span><em>Показати його у профілі</em><i class="fa-solid fa-arrow-right"></i></button>';
  const finaleMarkup = isComplete ? `<section class="signal-legend-victory"><div class="signal-legend-victory-flare" aria-hidden="true"><i></i><i></i><i></i></div><div class="signal-legend-victory-copy"><p><i class="fa-solid fa-star"></i> ПІДСУМОК КАМПАНІЇ</p><h3>Ти не просто пройшов маршрут.<br><em>Ти став сигналом.</em></h3><span>Твій титул, рамка та історія тепер видно кожному, хто відкриє профіль.</span></div><div class="signal-legend-unlocks"><article class="signal-legend-unlock ${hasTitle ? 'is-unlocked' : ''}"><i class="fa-solid ${titleReward.icon}"></i><span><small>ТИТУЛ</small><b>${escapeHtml(titleReward.title)}</b><em>${titleStatus}</em></span></article><article class="signal-legend-unlock ${hasFrame ? 'is-unlocked' : ''}"><span class="signal-legend-frame"><img src="${escapeHtml(avatarPreview)}" alt=""></span><span><small>РАМКА АВАТАРА</small><b>${escapeHtml(frameReward.title)}</b><em>${frameStatus}</em></span></article></div><div class="signal-legend-victory-actions"><button type="button" data-signal-cosmetics><i class="fa-solid fa-wand-magic-sparkles"></i> Оформлення</button><button type="button" data-signal-profile><i class="fa-solid fa-user-astronaut"></i> Мій профіль</button></div></section>` : '';
  root.innerHTML = `<article class="signal-season-card ${isComplete ? 'is-complete' : ''}" aria-label="${escapeHtml(runtimeSeason.title)}"><header class="signal-season-head"><div class="signal-season-head-copy"><p><i class="fa-solid fa-tower-broadcast"></i> ПОСТІЙНА КАМПАНІЯ · ЛИШЕ КОСМЕТИКА</p><h2>${escapeHtml(runtimeSeason.title)}</h2><span>${progress.next ? `Твоя наступна точка — «${escapeHtml(progress.next.title)}». ${escapeHtml(runtimeSeason.subtitle)}` : escapeHtml(runtimeSeason.subtitle)}</span><div class="signal-season-phase"><i class="fa-solid fa-satellite-dish"></i><b>ФАЗА: ${phase}</b><small>${progress.next ? `Координата ${progress.completed + 1} з ${progress.total}` : 'Усі частоти синхронізовано'}</small></div><div class="signal-season-hero-telemetry"><span><i class="fa-solid fa-signal"></i> ЧАСТОТА 88.6</span><span><i class="fa-solid fa-shield-halved"></i> ПРОТОКОЛ СТИЛЮ</span></div></div><div class="signal-season-orbit signal-season-core" aria-hidden="true"><i></i><i></i><i></i><b><i class="fa-solid fa-tower-broadcast"></i></b><span>LIVE</span></div><div class="signal-season-progress" aria-label="Прогрес: ${progress.completed} з ${progress.total} вузлів"><strong>${progress.completed}<small>/${progress.total}</small></strong><span>вузлів онлайн</span><i><b style="width:${progress.percent}%"></b></i><small>${progress.percent}% сигналу</small></div></header><div class="signal-season-command-bar"><span><i class="fa-solid fa-circle-dot"></i> КАНАЛ СЕЗОНУ АКТИВНИЙ</span><b>${isComplete ? 'Мережа повністю синхронізована · легенда збережена' : `${remainingNodes} ${remainingNodesLabel} до повного резонансу`}</b><small>Нагороди косметичні · без впливу на PC та шанси</small></div>${finaleMarkup}<div class="signal-season-grid"><section class="signal-season-route"><header><span><i class="fa-solid fa-route"></i> МАРШРУТ СЕЗОНУ</span><small>${isComplete ? 'Шість координат стали твоїм постійним слідом у системі.' : 'Виконуй вузли послідовно — кожен залишає слід у профілі.'}</small></header><div class="signal-season-route-line" aria-hidden="true"><i style="width:${progress.percent}%"></i></div>${nodeMarkup}${routeAction}</section><aside class="signal-season-side"><section><header><span><i class="fa-solid fa-gift"></i> НАГОРОДИ</span><small>Стиль, не сила</small></header><div class="signal-season-rewards">${rewardMarkup}</div></section><section class="signal-season-journal"><header><span><i class="fa-solid fa-book-open"></i> ЖУРНАЛ ЛЕГЕНДИ</span><button type="button" onclick="showPage('profile')">Профіль</button></header><ul>${journalMarkup}</ul></section><section class="signal-season-hall"><header><span><i class="fa-solid fa-ranking-star"></i> ЗАЛ РЕЗОНАНСУ</span><small>спільнота</small></header><div>${hallMarkup}</div></section></aside></div><footer><i class="fa-solid fa-shield-heart"></i> Кампанія не дає PC, шансів або переваги. Вона зберігає твій стиль і прогрес у профілі.</footer></article>`;
  root.querySelectorAll('[data-signal-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.signalPage)));
  const nextAction = root.querySelector('[data-signal-next]');
  nextAction?.addEventListener('click', () => showPage(nextAction.dataset.signalNext));
  root.querySelectorAll('[data-signal-profile]').forEach(button => button.addEventListener('click', () => showPage('profile')));
  root.querySelector('[data-signal-cosmetics]')?.addEventListener('click', openProfileCosmeticsModal);
  root.querySelectorAll('[data-signal-claim]').forEach(button => button.addEventListener('click', () => claimSignalSeasonReward(Number(button.dataset.signalClaim))));
  root.querySelectorAll('[data-signal-hall]').forEach(button => button.addEventListener('click', () => {
    const row = communitySnapshot?.leaderboard?.[Number(button.dataset.signalHall)];
    if (row) openCommunityProfile(row);
  }));
}

function getRecentRoundLedger(rounds = gameState?.rounds) {
  const list = Array.isArray(rounds) ? rounds : [];
  return list.reduce((summary, round) => {
    const stake = Math.max(0, Number(round?.inputValue) || 0);
    const payout = round?.win ? Math.max(0, Number(round?.targetValue) || 0) : 0;
    summary.staked += stake;
    summary.payout += payout;
    summary.wins += round?.win ? 1 : 0;
    return summary;
  }, { staked: 0, payout: 0, wins: 0 });
}

function renderStatsPage() {
  if (!gameState) return;
  const stats = gameState.stats || {};
  const allTime = gameState.allTime || createDefaultAllTime();
  const rounds = Array.isArray(gameState.rounds) ? gameState.rounds.slice(0, 12) : [];
  const ledger = getRecentRoundLedger(rounds);
  const inventoryValue = userInventory.reduce((sum, item) => sum + verifiedInventoryMarketPrice(item), 0);
  const winRate = Number(stats.rounds) ? Math.round((Number(stats.wins) / Number(stats.rounds)) * 100) : 0;
  const duplicateCount = [...getInventoryDuplicateCounts().values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const completedCollections = COLLECTION_DEFINITIONS.filter(collection => getCollectionProgress(collection).complete).length;

  const overview = document.getElementById('statsOverviewGrid');
  if (overview) overview.innerHTML = [
    { icon: 'fa-gem', label: 'Вартість колекції', value: formatCredits(inventoryValue), tone: 'cyan' },
    { icon: 'fa-bullseye', label: 'Виграші апгрейду', value: `${winRate}%`, note: `${Number(stats.wins) || 0} / ${Number(stats.rounds) || 0}`, tone: 'emerald' },
    { icon: 'fa-box-open', label: 'Відкрито кейсів', value: String(Number(allTime.cases) || Number(stats.cases) || 0), tone: 'amber' },
    { icon: 'fa-trophy', label: 'Найкраща ціль', value: formatCredits(Number(stats.bestValue) || 0), tone: 'violet' },
    { icon: 'fa-sack-dollar', label: 'Продано', value: formatCredits(Number(allTime.sellValue) || 0), note: `${Number(allTime.sells) || Number(stats.sells) || 0} предметів`, tone: 'green' },
    { icon: 'fa-copy', label: 'Запас дублів', value: duplicateCount ? `×${duplicateCount}` : '—', note: `${userInventory.length} предметів`, tone: 'slate' }
  ].map(card => `<article class="stats-overview-card is-${card.tone}"><i class="fa-solid ${card.icon}"></i><span>${card.label}</span><strong>${card.value}</strong>${card.note ? `<small>${card.note}</small>` : ''}</article>`).join('');

  const modes = document.getElementById('statsModeBreakdown');
  if (modes) modes.innerHTML = [
    { icon: 'fa-box-open', label: 'Кейси', value: Number(allTime.cases) || Number(stats.cases) || 0, note: `${Number(allTime.freeCases) || 0} безкоштовних` },
    { icon: 'fa-bolt', label: 'Апгрейди', value: Number(allTime.rounds) || Number(stats.rounds) || 0, note: `${Number(allTime.wins) || Number(stats.wins) || 0} перемог` },
    { icon: 'fa-swords', label: 'Бої', value: Number(allTime.battles) || Number(stats.battles) || 0, note: `${Number(allTime.battleWins) || Number(stats.battleWins) || 0} перемог` },
    { icon: 'fa-crown', label: 'Royale', value: Number(allTime.royaleWins) || 0, note: 'перемог у банку' },
    { icon: 'fa-boxes-packing', label: 'Контракти', value: Number(allTime.contracts) || Number(stats.contracts) || 0, note: 'укладено' },
    { icon: 'fa-layer-group', label: 'Колекції', value: `${completedCollections}/${COLLECTION_DEFINITIONS.length}`, note: 'завершено' }
  ].map(row => `<div class="stats-mode-row"><i class="fa-solid ${row.icon}"></i><span>${row.label}<small>${row.note}</small></span><strong>${row.value}</strong></div>`).join('');

  const recent = document.getElementById('statsRecentRounds');
  if (recent) recent.innerHTML = rounds.length
    ? rounds.slice(0, 7).map(round => `<div class="stats-round-row ${round.win ? 'is-win' : 'is-loss'}"><i class="fa-solid ${round.win ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><div><strong>${escapeHtml(cleanText(round.targetName, 62) || 'Раунд')}</strong><small>${escapeHtml(cleanText(round.mode, 24) || 'гра')} · ${new Date(round.at || Date.now()).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}</small></div><em>${round.win ? '+' : '—'}${formatCredits(round.win ? round.targetValue : round.inputValue || 0)}</em></div>`).join('')
    : '<div class="stats-empty"><i class="fa-solid fa-clock"></i><strong>Журнал ще порожній</strong><span>Перший раунд з’явиться тут.</span></div>';

  const roundSummary = document.getElementById('statsRoundSummary');
  const windowLabel = document.getElementById('statsRoundWindow');
  if (windowLabel) windowLabel.textContent = rounds.length ? `останні ${rounds.length} записів` : 'ще немає записів';
  if (roundSummary) roundSummary.innerHTML = rounds.length
    ? `<div><span>Вкладено</span><strong>${formatCredits(ledger.staked)}</strong></div><div><span>Отримано при перемогах</span><strong>${formatCredits(ledger.payout)}</strong></div><div class="${ledger.payout - ledger.staked >= 0 ? 'is-positive' : 'is-negative'}"><span>Різниця</span><strong>${ledger.payout - ledger.staked >= 0 ? '+' : '−'}${formatCredits(Math.abs(ledger.payout - ledger.staked))}</strong></div><p>Підрахунок лише за збереженими раундами апгрейду; він не змінює фіксовані ціни каталогу та не впливає на шанси.</p>`
    : '<div class="stats-empty"><i class="fa-solid fa-chart-line"></i><strong>Поки без підсумку</strong><span>Зіграний апгрейд з’явиться тут.</span></div>';

  const collection = document.getElementById('statsCollectionProgress');
  if (collection) collection.innerHTML = COLLECTION_DEFINITIONS.map(definition => {
    const state = getCollectionProgress(definition);
    const percent = state.total ? Math.round((state.count / state.total) * 100) : 0;
    return `<div class="stats-collection-row ${state.complete ? 'is-complete' : ''}"><div><span>${escapeHtml(definition.title)}</span><strong>${state.count}/${state.total}</strong></div><i><b style="width:${percent}%"></b></i><small>${escapeHtml(definition.description)}</small></div>`;
  }).join('');
}

async function shareLatestMoment() {
  const player = cleanText(account?.nick || currentUser?.name || 'Гравець', 28) || 'Гравець';
  const latest = Array.isArray(gameState?.rounds) ? gameState.rounds[0] : null;
  const best = [...userInventory].sort((left, right) => verifiedInventoryMarketPrice(right) - verifiedInventoryMarketPrice(left))[0];
  const title = 'ПОТУЖНО DROP';
  const text = latest
    ? `${player} ${latest.win ? 'виграв' : 'зіграв'} у ${cleanText(latest.mode, 20) || 'режимі'} в ПОТУЖНО DROP${latest.targetName ? ` · ${cleanText(latest.targetName, 72)}` : ''}.`
    : best
      ? `${player} зібрав ${cleanText(best.name, 72)} у ПОТУЖНО DROP.`
      : `${player} починає збирати колекцію в ПОТУЖНО DROP.`;
  const url = getPublicShareUrl();
  url.hash = 'hub';
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url: url.href });
      showToast('Момент відправлено. Нагороди за поширення не нараховуються.', 'success');
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text}\n${url.href}`);
      showToast('Текст і посилання скопійовано.', 'success');
      return;
    }
    window.prompt('Скопіюй момент:', `${text}\n${url.href}`);
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Не вдалося відкрити поширення.', 'warn');
  }
}

// A Capacitor build is rendered from the app's localhost WebView.  Links a
// player shares must still point to the public Worker, otherwise a recipient
// would receive an unusable capacitor:// or localhost URL.
function getPublicShareUrl() {
  const mobile = window.PotuzhnoMobile || {};
  const configuredOrigin = String(mobile.apiOrigin || window.POTUZHNO_MOBILE_CONFIG?.apiOrigin || '').replace(/\/$/, '');
  const useConfiguredOrigin = Boolean(mobile.isNative) && /^https:\/\//i.test(configuredOrigin);
  const origin = useConfiguredOrigin ? configuredOrigin : window.location.origin;
  return new URL('/', origin);
}

function renderGameHub() {
  if (!gameState) return;
  renderHalloweenSeasonShell();
  renderProfileProgress();
  renderPowerRun();
  renderSignalSeason();
  renderSeasonalEvent();
  renderPulseCircuit();
  renderTargetArena();
  renderBattlePass();
  renderDailyTasks();
  renderWeeklyTasks();
  updateTaskRewardSignal();
  renderAchievements();
  renderCollections();
  renderLeaderboard();
  renderProfileSocial();
  renderCommandHub();
  renderStatsPage();
  applyTheme();
  updateAccountUI();
  updateThemeMenuState();
}

function checkAchievements() {
  if (!gameState || !currentUser) return;
  let changed = false;
  ACHIEVEMENT_DEFINITIONS.forEach(a => {
    if (!gameState.achievements[a.id] && a.met()) {
      gameState.achievements[a.id] = Date.now();
      const reward = economyReward(a.reward);
      currentUser.balance += reward;
      addXp(XP_ACHIEVEMENT);
      changed = true;
      soundWin();
      showToast(`Досягнення «${a.title}»: +${formatCredits(reward)}`, 'success');
    }
  });
  if (changed) updateBalanceUI();
}

function categorizeWeapon(name) {
  const raw = String(name || '');
  const n = normalizeSkinName(raw);
  if (/^★/.test(raw) || /knife|bayonet|karambit|butterfly|talon|stiletto|ursus|skeleton|nomad|paracord|falchion|bowie|navaja|kukri|daggers/i.test(raw)) return 'knife';
  if (/glove|wraps/i.test(raw)) return 'gloves';
  if (/^(glock-18|usp-s|p2000|p250|five-seven|tec-9|cz75-auto|dual berettas|revolver|desert eagle|r8 revolver)/i.test(n)) return 'pistol';
  if (/^(ak-47|m4a1-s|m4a4|galil ar|famas|aug|sg 553)/i.test(n)) return 'rifle';
  if (/^(awp|ssg 08|g3sg1|scar-20)/i.test(n)) return 'sniper';
  if (/^(mp9|mac-10|ump-45|p90|mp7|mp5-sd)/i.test(n)) return 'smg';
  if (/^(nova|xm1014|mag-7|sawed-off|m249|negev)/i.test(n)) return 'heavy';
  return 'other';
}

function updateAllTimeOnRound(win, targetValue) {
  if (!gameState) return;
  const a = gameState.allTime = gameState.allTime || createDefaultAllTime();
  a.rounds = (a.rounds || 0) + 1;
  if (win) {
    a.wins = (a.wins || 0) + 1;
    if (Number(targetValue) > 0) a.biggestWin = Math.max(a.biggestWin || 0, Number(targetValue));
  }
}

function updateAllTimeOnCase() {
  if (!gameState) return;
  const a = gameState.allTime = gameState.allTime || createDefaultAllTime();
  a.cases = (a.cases || 0) + 1;
}

function updateAllTimeOnBattle(win) {
  if (!gameState) return;
  const a = gameState.allTime = gameState.allTime || createDefaultAllTime();
  a.battles = (a.battles || 0) + 1;
  if (win) a.battleWins = (a.battleWins || 0) + 1;
}

function updateAllTimeOnContract() {
  if (!gameState) return;
  const a = gameState.allTime = gameState.allTime || createDefaultAllTime();
  a.contracts = (a.contracts || 0) + 1;
}

function updateAllTimeOnSell(value) {
  if (!gameState) return;
  const a = gameState.allTime = gameState.allTime || createDefaultAllTime();
  a.sells = (a.sells || 0) + 1;
  a.sellValue = (a.sellValue || 0) + Number(value || 0);
}

function updateAllTimeOnFreeCase() {
  if (!gameState) return;
  const a = gameState.allTime = gameState.allTime || createDefaultAllTime();
  a.freeCases = (a.freeCases || 0) + 1;
}

function recordRound({ win, target, chance, mode, inputValue, bonus }) {
  if (!gameState || !target) return;
  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.rounds += 1;
  gameState.daily.rolls += 1;
  gameState.weekly.rolls = (gameState.weekly.rolls || 0) + 1;
  if (win) {
    gameState.stats.wins += 1;
    gameState.daily.wins += 1;
    gameState.weekly.wins = (gameState.weekly.wins || 0) + 1;
    gameState.stats.currentStreak += 1;
    gameState.stats.bestStreak = Math.max(gameState.stats.bestStreak, gameState.stats.currentStreak);
    gameState.stats.bestValue = Math.max(gameState.stats.bestValue, Number(target.price) || 0);
    gameState.daily.bestStreak = Math.max(gameState.daily.bestStreak, gameState.stats.currentStreak);
    gameState.daily.bestWinValue = Math.max(gameState.daily.bestWinValue, Number(target.price) || 0);
    gameState.daily.targetValue += Number(target.price) || 0;
    gameState.weekly.bestStreak = Math.max(gameState.weekly.bestStreak || 0, gameState.stats.currentStreak);
    gameState.weekly.bestWinValue = Math.max(gameState.weekly.bestWinValue || 0, Number(target.price) || 0);
    const cat = categorizeWeapon(target.name);
    if (cat === 'pistol') {
      gameState.stats.pistolWins += 1;
      gameState.daily.pistolWins += 1;
    } else if (cat === 'rifle') {
      gameState.daily.rifleWins += 1;
    } else if (cat === 'sniper') {
      gameState.daily.sniperWins += 1;
    } else if (cat === 'smg') {
      gameState.daily.smgWins += 1;
    } else if (cat === 'heavy') {
      gameState.daily.heavyWins += 1;
    }
  } else {
    gameState.stats.currentStreak = 0;
  }
  addXp(XP_PER_ROUND + (win ? XP_WIN_BONUS : 0));
  updateAllTimeOnRound(win, Number(target.price) || 0);
  gameState.rounds.unshift({
    at: Date.now(),
    win,
    targetName: target.name,
    targetValue: target.price,
    chance,
    mode,
    inputValue,
    bonus
  });
  gameState.rounds = gameState.rounds.slice(0, ROUND_HISTORY_LIMIT);
  checkAchievements();
  saveState();
  renderGameHub();
  void syncCommunity();
}

function applyTheme() {
  const t = ['amber', 'neon', 'violet'].includes(gameState?.theme) ? gameState.theme : 'amber';
  if (t === 'amber') delete document.body.dataset.theme;
  else document.body.dataset.theme = t;
  document.querySelectorAll('[data-theme-choice]').forEach(b => {
    const a = b.dataset.themeChoice === t;
    b.dataset.active = a ? 'true' : 'false';
  });
  updateThemeMenuState();
}

function setTheme(t) {
  if (!gameState || !['amber', 'neon', 'violet'].includes(t)) return;
  gameState.theme = t;
  applyTheme();
  saveState();
  const names = { amber: 'Потужне золото', neon: 'Неон', violet: 'Фіолет' };
  showToast(`Тема: ${names[t]}`, 'success');
}

function showToast(message, type = 'info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const colors = {
    info: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    success: 'border-green-500/40 bg-green-500/10 text-green-100',
    warn: 'border-red-500/40 bg-red-500/10 text-red-100',
    error: 'border-red-500/40 bg-red-500/10 text-red-100'
  };
  const el = document.createElement('div');
  el.className = `toast-item pointer-events-auto rounded-xl border ${colors[type] || colors.info} px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur`;
  el.textContent = message;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    setTimeout(() => el.remove(), 320);
  }, 3300);
}

let audioCtx = null;
const CASE_REEL_AUDIO_SRC = '/assets/audio/metallic-tension.mp3?v=5.8.5';
// A single playlist continues between pages. Every complete track comes from
// the original ARGEHA music supplied for this project.
const MUSIC_PLAYLIST = Object.freeze([
  { id: 'skyline', src: '/assets/audio/argeha-skyline.mp3?v=7.9.0-full', volume: 0.08 },
  { id: 'deepreceive', src: '/assets/audio/argeha-deepreceive.mp3?v=7.9.0-full', volume: 0.07 },
  { id: 'take-me-up', src: '/assets/audio/argeha-take-me-up.mp3?v=7.9.0-full', volume: 0.068 },
  { id: 'unease', src: '/assets/audio/argeha-unease.mp3?v=7.9.0-full', volume: 0.06 },
  { id: 'st', src: '/assets/audio/argeha-st.mp3?v=7.9.0-full', volume: 0.06 },
  { id: 'phonk', src: '/assets/audio/argeha-phonk.mp3?v=7.9.0-full', volume: 0.054 },
  { id: 'untitled-one', src: '/assets/audio/argeha-untitled-one.mp3?v=7.9.0-full', volume: 0.06 },
  { id: 'untitled', src: '/assets/audio/argeha-untitled.mp3?v=7.9.0-full', volume: 0.06 },
  { id: 'kk2', src: '/assets/audio/argeha-kk2.mp3?v=7.9.0-full', volume: 0.065 },
]);
let caseReelAudio = null;
let caseReelAudioUnlockSerial = 0;
let backgroundMusic = null;
let backgroundMusicTrackIndex = 0;
let backgroundMusicPausedForRound = false;

function getStoredMusicTrackIndex() {
  const savedIndex = Number.parseInt(localStorage.getItem(STORAGE.musicTrack), 10);
  return Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < MUSIC_PLAYLIST.length
    ? savedIndex
    : 0;
}

function setBackgroundMusicTrackIndex(index) {
  const normalized = ((index % MUSIC_PLAYLIST.length) + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
  backgroundMusicTrackIndex = normalized;
  try { localStorage.setItem(STORAGE.musicTrack, String(normalized)); } catch {}
  return normalized;
}

function getCurrentMusicTrack() {
  return MUSIC_PLAYLIST[backgroundMusicTrackIndex] || MUSIC_PLAYLIST[0];
}

function canPlayBackgroundMusic() {
  return musicEnabled
    && musicInteractionUnlocked
    && !backgroundMusicPausedForRound
    && !document.hidden
    && localStorage.getItem(STORAGE.consent) === 'accepted';
}

function pauseBackgroundMusic({ reset = false } = {}) {
  if (!backgroundMusic) return;
  backgroundMusic.pause();
  if (reset) backgroundMusic.currentTime = 0;
}

function advanceBackgroundMusic(source = null) {
  if (source && source !== backgroundMusic) return;
  const outgoing = backgroundMusic;
  backgroundMusic = null;
  if (outgoing) {
    outgoing.onended = null;
    outgoing.onerror = null;
    outgoing.pause();
  }
  setBackgroundMusicTrackIndex(backgroundMusicTrackIndex + 1);
  syncBackgroundMusic();
}

function createBackgroundMusic(track) {
  const audio = new Audio(track.src);
  audio.preload = 'metadata';
  audio.loop = false;
  audio.onended = () => advanceBackgroundMusic(audio);
  // If one cached file is unavailable, skip it instead of leaving the player
  // silent for the rest of the session.
  audio.onerror = () => advanceBackgroundMusic(audio);
  backgroundMusic = audio;
  return audio;
}

function syncBackgroundMusic() {
  if (!canPlayBackgroundMusic()) {
    pauseBackgroundMusic();
    return;
  }
  const track = getCurrentMusicTrack();
  if (!track) return;
  const audio = backgroundMusic || createBackgroundMusic(track);
  audio.volume = track.volume;
  audio.play().catch(() => {});
}

function unlockGameMusic() {
  musicInteractionUnlocked = true;
  syncBackgroundMusic();
}

function getCaseReelAudio() {
  if (caseReelAudio || typeof Audio !== 'function') return caseReelAudio;
  caseReelAudio = new Audio(CASE_REEL_AUDIO_SRC);
  caseReelAudio.preload = 'auto';
  caseReelAudio.loop = false;
  caseReelAudio.volume = 0.38;
  return caseReelAudio;
}

function primeCaseReelSound() {
  const audio = getCaseReelAudio();
  if (audio && audio.readyState === 0) audio.load();
  return audio;
}

function getCaseReelSoundDuration() {
  if (!soundEnabled) return 0;
  const duration = Number(primeCaseReelSound()?.duration);
  return Number.isFinite(duration) && duration >= 1 ? Math.round(duration * 1_000) : 0;
}

function waitForCaseReelSoundDuration(timeoutMs = 800) {
  if (!soundEnabled) return Promise.resolve(0);
  const known = getCaseReelSoundDuration();
  if (known) return Promise.resolve(known);
  const audio = primeCaseReelSound();
  if (!audio) return Promise.resolve(0);
  return new Promise(resolve => {
    let timer = null;
    const finish = () => {
      audio.removeEventListener('loadedmetadata', finish);
      audio.removeEventListener('durationchange', finish);
      if (timer) clearTimeout(timer);
      resolve(getCaseReelSoundDuration());
    };
    audio.addEventListener('loadedmetadata', finish, { once: true });
    audio.addEventListener('durationchange', finish, { once: true });
    timer = window.setTimeout(finish, timeoutMs);
  });
}

function unlockCaseReelSound() {
  if (!soundEnabled || document.hidden) return;
  const audio = primeCaseReelSound();
  if (!audio) return;
  // This silent, user-initiated start unlocks later playback after the fair
  // server result arrives on mobile browsers without consuming the soundtrack.
  const unlockSerial = ++caseReelAudioUnlockSerial;
  audio.muted = true;
  audio.play().then(() => {
    if (unlockSerial !== caseReelAudioUnlockSerial) return;
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  }).catch(() => {
    if (unlockSerial === caseReelAudioUnlockSerial) audio.muted = false;
  });
}

function startCaseReelSound() {
  if (!soundEnabled || document.hidden) return;
  backgroundMusicPausedForRound = true;
  pauseBackgroundMusic();
  const audio = primeCaseReelSound();
  if (!audio) return;
  caseReelAudioUnlockSerial += 1;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.play().catch(() => {});
}

function stopCaseReelSound() {
  if (caseReelAudio) {
    caseReelAudioUnlockSerial += 1;
    caseReelAudio.pause();
    caseReelAudio.currentTime = 0;
  }
  backgroundMusicPausedForRound = false;
  syncBackgroundMusic();
}

function beep(freq = 440, dur = 0.08, type = 'sine') {
  if (!soundEnabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + dur);
  } catch {}
}

function soundWin() {
  haptic('success');
  beep(880, 0.15, 'triangle');
  setTimeout(() => beep(1180, 0.2, 'triangle'), 140);
}
function soundLose() {
  haptic('error');
  beep(180, 0.28, 'sawtooth');
}
function soundCase() {
  haptic('light');
  beep(700, 0.12, 'triangle');
  setTimeout(() => beep(1050, 0.16, 'triangle'), 120);
}
function soundCoin() {
  haptic('light');
  beep(760, 0.12, 'triangle');
}
function soundSell() {
  haptic('light');
  beep(700, 0.08, 'triangle');
}

function haptic(kind = 'light') {
  if (!hapticsEnabled) return;
  const patterns = { light: 10, success: [12, 40, 18], error: [24, 45, 24] };
  try {
    const haptics = window.Capacitor?.Plugins?.Haptics;
    if (haptics?.impact) {
      const style = kind === 'error' ? 'HEAVY' : kind === 'success' ? 'MEDIUM' : 'LIGHT';
      void haptics.impact({ style });
      return;
    }
    if (navigator.vibrate) navigator.vibrate(patterns[kind] || patterns.light);
  } catch {}
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(STORAGE.sound, soundEnabled ? 'on' : 'off');
  if (!soundEnabled) {
    if (caseReelAudio) {
      caseReelAudio.pause();
      caseReelAudio.currentTime = 0;
    }
  }
  updateSoundUI();
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  localStorage.setItem(STORAGE.music, musicEnabled ? 'on' : 'off');
  if (!musicEnabled) pauseBackgroundMusic();
  else unlockGameMusic();
  updateSoundUI();
}

function toggleHaptics() {
  hapticsEnabled = !hapticsEnabled;
  localStorage.setItem(STORAGE.haptics, hapticsEnabled ? 'on' : 'off');
  updateHapticsUI();
  if (hapticsEnabled) haptic('light');
}

function updateSoundUI() {
  const i = document.getElementById('soundIcon');
  if (i) i.className = soundEnabled ? 'fa-solid fa-volume-high text-sm' : 'fa-solid fa-volume-xmark text-sm';
  const button = document.getElementById('soundToggle');
  if (button) {
    button.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
    button.title = soundEnabled ? 'Звукові ефекти увімкнені' : 'Звукові ефекти вимкнені';
  }
  const mobileIcon = document.getElementById('mobileSoundIcon');
  if (mobileIcon) mobileIcon.className = soundEnabled ? 'fa-solid fa-volume-high mr-2' : 'fa-solid fa-volume-xmark mr-2';
  const mobileButton = document.getElementById('mobileSoundToggle');
  if (mobileButton) mobileButton.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  const mobileLabel = document.getElementById('mobileSoundLabel');
  if (mobileLabel) mobileLabel.textContent = soundEnabled ? 'Звуки' : 'Звуки вимкнено';
  const musicIcon = document.getElementById('musicIcon');
  if (musicIcon) musicIcon.className = musicEnabled ? 'fa-solid fa-music text-sm' : 'fa-solid fa-volume-xmark text-sm';
  const musicButton = document.getElementById('musicToggle');
  if (musicButton) {
    musicButton.setAttribute('aria-pressed', musicEnabled ? 'true' : 'false');
    musicButton.title = musicEnabled ? 'Музика увімкнена' : 'Музика вимкнена';
  }
  const mobileMusicIcon = document.getElementById('mobileMusicIcon');
  if (mobileMusicIcon) mobileMusicIcon.className = musicEnabled ? 'fa-solid fa-music mr-2' : 'fa-solid fa-volume-xmark mr-2';
  const mobileMusicButton = document.getElementById('mobileMusicToggle');
  if (mobileMusicButton) mobileMusicButton.setAttribute('aria-pressed', musicEnabled ? 'true' : 'false');
  const mobileMusicLabel = document.getElementById('mobileMusicLabel');
  if (mobileMusicLabel) mobileMusicLabel.textContent = musicEnabled ? 'Музика' : 'Музика вимкнена';
}

// Browser and Android WebView both require a real user gesture before music
// may start. The first tap/key press unlocks playback without forcing sound on.
document.addEventListener('pointerdown', unlockGameMusic, { once: true, capture: true, passive: true });
document.addEventListener('keydown', unlockGameMusic, { once: true, capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseBackgroundMusic();
  else syncBackgroundMusic();
});
window.addEventListener('pagehide', () => pauseBackgroundMusic());

function updateHapticsUI() {
  const button = document.getElementById('profileHapticsButton');
  if (!button) return;
  button.classList.toggle('is-enabled', hapticsEnabled);
  button.setAttribute('aria-pressed', hapticsEnabled ? 'true' : 'false');
  button.title = hapticsEnabled ? 'Вібрація увімкнена' : 'Вібрація вимкнена';
  const label = button.querySelector('span');
  if (label) label.textContent = hapticsEnabled ? 'Вібрація' : 'Без вібрації';
}

function updateConsentButton() {
  const cb = document.getElementById('riskConsent');
  const btn = document.getElementById('riskContinue');
  if (btn) btn.disabled = !cb?.checked;
}

function acceptRiskNotice() {
  if (!document.getElementById('riskConsent')?.checked) return;
  localStorage.setItem(STORAGE.consent, 'accepted');
  document.body.classList.remove('consent-locked');
  const el = document.getElementById('riskNotice');
  el?.classList.add('hidden');
  el?.classList.remove('flex');
  unlockGameMusic();
  // Steam-login suggestions appear only after the safety notice is acknowledged.
  setTimeout(() => {
    renderSteamNudge();
  }, 250);
}

function renderSteamNudge() {
  const nudge = document.getElementById('steamNudge');
  if (!nudge) return;
  const shouldShow = localStorage.getItem(STORAGE.consent) === 'accepted'
    && !currentUser?.steamId
    && localStorage.getItem(STORAGE.steamNudge) !== 'dismissed';
  nudge.classList.toggle('hidden', !shouldShow);
}

function dismissSteamNudge() {
  localStorage.setItem(STORAGE.steamNudge, 'dismissed');
  renderSteamNudge();
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu')?.classList.toggle('hidden');
}

const modalReturnFocus = new Map();

function getModalPanel(modal) {
  return modal?.querySelector('.glass-panel') || modal || null;
}

function getModalFocusables(modal) {
  if (!modal) return [];
  return [...modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getClientRects().length > 0);
}

function prepareModalAccessibility(modal) {
  const panel = getModalPanel(modal);
  if (!panel) return null;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const heading = panel.querySelector('h1, h2, h3');
  if (heading) {
    if (!heading.id) heading.id = `${modal.id}-title`;
    panel.setAttribute('aria-labelledby', heading.id);
    panel.removeAttribute('aria-label');
  } else if (!panel.hasAttribute('aria-label')) {
    panel.setAttribute('aria-label', 'Діалог');
  }
  if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
  return panel;
}

function getTopOpenModal() {
  const open = [...document.querySelectorAll('.modal-backdrop.flex:not(.hidden)')];
  return open[open.length - 1] || null;
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!modalReturnFocus.has(id)) modalReturnFocus.set(id, document.activeElement);
  el.classList.remove('hidden');
  el.classList.add('flex');
  if (id === 'inventoryModal') refreshInventoryModal();
  if (id === 'accountModal') updateAccountUI();
  if (id === 'prestigeModal') updatePrestigeUI();
  if (id === 'shopModal') {
    filterShop();
    // Cases use a compact game catalogue. The shop loads the full collection
    // in small server pages so its first paint stays responsive.
    void loadCompleteSkinCatalog();
    void loadShopCatalogPage();
  }
  const panel = prepareModalAccessibility(el);
  window.setTimeout(() => (getModalFocusables(el)[0] || panel)?.focus(), 0);
}

function closeModal(id) {
  if (id === 'caseReelModal' && (isCaseOpening || isFreeCaseOpening)) {
    showToast('Дочекайся завершення відкриття кейсу', 'info');
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
  const returnTarget = modalReturnFocus.get(id);
  modalReturnFocus.delete(id);
  window.setTimeout(() => {
    if (returnTarget instanceof HTMLElement && document.contains(returnTarget)) returnTarget.focus();
  }, 0);
}

function refreshInventoryModal() {
  const status = document.getElementById('inventoryStatus');
  if (status) {
    status.textContent = currentUser?.steamId
      ? 'Показано віртуальні копії публічних предметів. Кожен Steam asset імпортується лише один раз; предмети не передаються сайту.'
      : 'Стартові предмети існують лише в цій грі. Підключи Steam, щоб побачити безпечну віртуальну копію публічного інвентарю.';
  }
  renderInventoryGrid();
}

function openInventoryModalFromProfile() {
  openModal('inventoryModal');
}

function resetSteamLoginModal() {
  const button = document.getElementById('steamLoginContinueBtn');
  if (button) {
    button.disabled = false;
    button.innerHTML = '<i class="fa-brands fa-steam mr-2"></i>Увійти через Steam';
  }
  const hint = document.getElementById('steamLoginHint');
  if (hint) hint.textContent = 'Пароль, Steam Guard, API-ключі та Trade Offers не запитуються. Потрібен лише публічний профіль та інвентар.';
}

function startSteamLogin() {
  resetSteamLoginModal();
  openModal('steamModal');
}

function continueSteamLogin() {
  const button = document.getElementById('steamLoginContinueBtn');
  if (button?.disabled) return;
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Відкриваємо Steam…';
  }
  const hint = document.getElementById('steamLoginHint');
  if (hint) hint.textContent = 'Зараз відкриється офіційна сторінка Steam. Після підтвердження ти повернешся сюди автоматично.';
  window.location.assign('/api/steam/auth');
}

function getSteamImportRecord(steamId) {
  return normalizeSteamImportRecord(getSteamImportMap()[steamId], steamId) || { steamId, assetIds: [], lastSyncAt: 0 };
}

function getKnownSteamAssetIds(steamId) {
  const known = new Set(getSteamImportRecord(steamId).assetIds);
  userInventory.forEach(item => {
    const legacyImported = String(item?.id || '').startsWith('steam-demo-');
    const ownerId = /^\d{17}$/.test(String(item?.steamOwnerId || ''))
      ? String(item.steamOwnerId)
      : String(item?.id || '').match(/^steam-copy-(\d{17})-/)?.[1] || '';
    if (ownerId && ownerId !== steamId) return;
    const assetId = cleanText(item?.steamAssetId || (legacyImported ? item?.sourceSkinId : ''), 64);
    if (assetId) known.add(assetId);
  });
  return known;
}

function fallbackSteamProfile(steamId) {
  return normalizeSteamProfile({ steamId, name: `Steam_${steamId.slice(-4)}`, avatar: '', visibility: 'unknown' }, steamId);
}

async function fetchSteamSession() {
  const response = await fetch('/api/steam/session', { cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(cleanText(data?.error || 'Не вдалося завантажити Steam-профіль.', 180));
  const profile = normalizeSteamProfile(data?.profile);
  if (!data?.connected || !profile) throw new Error('Steam-профіль не підтверджено.');
  return { profile, expiresAt: clampNumber(data.expiresAt, 0, Number.MAX_SAFE_INTEGER, 0) };
}

async function restoreSteamSession() {
  try {
    const session = await fetchSteamSession();
    applySteamIdentity(session.profile.steamId, session.profile, { skipAutoSync: true });
    await bootstrapSteamAccount(session.profile);
    setSteamConnectionState('connected');
    return true;
  } catch (error) {
    // The HttpOnly session cookie may still be valid after localStorage is
    // cleared or migrated. Only show a reconnect prompt for a known profile.
    setSteamConnectionState(currentUser?.steamId ? 'expired' : 'disconnected', error?.message || 'Сесія Steam завершилась.');
    return false;
  }
}

function applySteamIdentity(steamId, rawProfile, { skipAutoSync = false } = {}) {
  const profile = normalizeSteamProfile(rawProfile, steamId) || fallbackSteamProfile(steamId);
  const currentNick = cleanText(account?.nick, 24);
  const useSteamName = !currentNick || currentNick.startsWith('Гравець_') || /^Steam_\d{4}$/.test(currentNick);
  const importRecord = getSteamImportRecord(steamId);
  const steamImports = getSteamImportMap();
  steamImports[steamId] = importRecord;
  const sameSteamAccount = isSteamAccount(account?.steamAccount, steamId) ? account.steamAccount : null;
  account = {
    ...(account || {}),
    steamId,
    steamProfile: profile,
    steamImport: importRecord,
    steamImports,
    nick: useSteamName ? profile.name : currentNick
  };
  if (sameSteamAccount) account.steamAccount = sameSteamAccount;
  else delete account.steamAccount;
  currentUser = {
    ...(currentUser || {}),
    steamId,
    name: profile.name,
    avatar: profile.avatar || '',
    steamProfile: profile,
    balance: clampNumber(currentUser?.balance ?? localStorage.getItem(STORAGE.balance), 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE)
  };
  localStorage.setItem(STORAGE.steamId, steamId);
  localStorage.removeItem(STORAGE.steamNudge);
  applyLoggedInUI();
  updateAccountUI();
  saveState({ skipCloudAutoSync: true, skipSteamAutoSync: skipAutoSync });
}

function importSteamItems(steamId, items) {
  const known = getKnownSteamAssetIds(steamId);
  const imported = [];
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const assetId = cleanText(item?.id, 64);
    const img = cleanImageUrl(item?.img);
    if (!assetId || known.has(assetId) || !img) return;
    known.add(assetId);
    const wear = rollWear();
    const basePrice = estimateInventoryPrice(item, index);
    imported.push({
      id: `steam-copy-${steamId}-${assetId}`,
      steamAssetId: assetId,
      steamOwnerId: steamId,
      steamImported: true,
      sourceSkinId: assetId,
      name: cleanText(item?.name, 160) || 'CS2 Skin',
      rarity: cleanText(item?.rarity, 48) || 'CS2',
      rarityColor: cleanColor(item?.rarityColor),
      img,
      basePrice,
      wear,
      marketPrice: 0,
      price: 0,
      virtual: true,
      addedAt: Date.now()
    });
  });
  userInventory.push(...imported);
  setSteamImportRecord(steamId, {
    steamId,
    assetIds: [...known].slice(-5_000),
    lastSyncAt: Date.now()
  });
  return imported;
}

function setSteamSyncUI(syncing) {
  const buttons = [
    document.getElementById('steamProfileSyncBtn'),
    document.getElementById('steamInventorySyncBtn')
  ].filter(Boolean);
  buttons.forEach(button => {
    if (!button.dataset.steamLabel) button.dataset.steamLabel = button.innerHTML;
    button.disabled = syncing;
    button.classList.toggle('opacity-60', syncing);
    button.classList.toggle('cursor-wait', syncing);
    button.setAttribute('aria-busy', syncing ? 'true' : 'false');
    button.innerHTML = syncing
      ? '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Синхронізація…'
      : button.dataset.steamLabel;
  });
}

async function fetchSteamInventoryPage(cursor = '') {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const response = await fetch(`/api/steam/inventory${query}`, { cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(cleanText(data?.error || 'Не вдалося завантажити Steam-інвентар.', 180));
  return data;
}

async function performSteamInventorySync() {
  const status = document.getElementById('inventoryStatus');
  if (status) status.textContent = 'Оновлюємо публічний Steam-профіль і перевіряємо нові предмети…';
  setSteamConnectionState('syncing');
  setSteamSyncUI(true);
  try {
    const session = await fetchSteamSession();
    const profile = session.profile;
    const steamId = profile?.steamId;
    if (!/^\d{17}$/.test(String(steamId || ''))) throw new Error('Steam-профіль не підтверджено.');
    applySteamIdentity(steamId, profile);
    let cursor = '';
    let pages = 0;
    let inventoryProfile = profile;
    const items = [];
    do {
      pages += 1;
      if (status) status.textContent = `Скануємо Steam-інвентар: сторінка ${pages}${pages > 1 ? ` · знайдено ${items.length}` : ''}…`;
      const data = await fetchSteamInventoryPage(cursor);
      inventoryProfile = normalizeSteamProfile(data.profile, steamId) || inventoryProfile;
      items.push(...(Array.isArray(data.items) ? data.items : []));
      cursor = data.hasMore && /^\d{1,24}$/.test(String(data.nextCursor || '')) ? String(data.nextCursor) : '';
    } while (cursor && pages < STEAM_SYNC_PAGE_LIMIT);
    applySteamIdentity(steamId, inventoryProfile);
    const imported = importSteamItems(steamId, items);
    // Imports enter with no invented value. Start a bounded server quote batch
    // immediately; unavailable entries remain visibly unpriced.
    if (imported.length) void refreshRecentInventoryMarketPrices(80);
    const truncated = Boolean(cursor);
    if (status) status.textContent = imported.length
      ? `Steam синхронізовано: додано ${imported.length} нових віртуальних копій${truncated ? ' з перших 3 000 предметів' : ''}.`
      : `Steam синхронізовано: нових предметів немає. Продані у грі копії не повертаються${truncated ? '; перевірено перші 3 000 предметів' : ''}.`;
    applyLoggedInUI();
    updateAccountUI();
    renderInventoryGrid();
    renderProfileInventory();
    updateAvatarBadge();
    saveState();
    renderGameHub();
    checkAchievements();
    setSteamConnectionState('connected');
    showToast(imported.length ? `Steam: +${imported.length} нових предметів` : 'Steam уже синхронізований', 'success');
  } catch (e) {
    const message = e?.message || 'Не вдалося завантажити інвентар';
    const needsLogin = /сесі|підтверджено|увійди/i.test(String(message));
    if (status) status.textContent = `${message}. ${needsLogin ? 'Підключи Steam ще раз.' : 'Профіль збережено, повтори синхронізацію пізніше.'}`;
    setSteamConnectionState(needsLogin ? 'expired' : 'error', message);
    showToast(message, 'warn');
    if (needsLogin) startSteamLogin();
  } finally {
    setSteamSyncUI(false);
  }
}

async function syncSteamInventory() {
  if (steamSyncPromise) {
    showToast('Steam уже синхронізується', 'info');
    return steamSyncPromise;
  }
  steamSyncPromise = performSteamInventorySync();
  try {
    return await steamSyncPromise;
  } finally {
    steamSyncPromise = null;
  }
}

async function disconnectSteam() {
  if (!currentUser?.steamId || steamSyncPromise) return;
  const button = document.getElementById('steamDisconnectBtn');
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Відключаємо…';
  }
  try {
    const response = await fetch('/api/steam/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'PotuzhnoDrop' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(cleanText(data?.error || 'Не вдалося відключити Steam.', 180));
    const previousName = currentUser.name;
    account = {
      ...(account || {}),
      steamId: null,
      steamProfile: null,
      steamImport: null,
      nick: account?.nick || previousName || 'Гравець'
    };
    currentUser = {
      ...currentUser,
      steamId: null,
      steamProfile: null,
      avatar: '',
      name: account.nick
    };
    steamAccountReady = false;
    steamAccountAutoSyncDirty = false;
    if (steamAccountAutoSyncTimer) window.clearTimeout(steamAccountAutoSyncTimer);
    steamAccountAutoSyncTimer = null;
    localStorage.removeItem(STORAGE.steamId);
    window.PotuzhnoMobile?.clearSteamSession?.();
    setSteamConnectionState('disconnected');
    saveState();
    updateAccountUI();
    refreshInventoryModal();
    showToast('Steam відключено. Віртуальний інвентар гри збережено.', 'success');
  } catch (error) {
    setSteamConnectionState('error', error?.message || 'Не вдалося відключити Steam.');
    showToast(error?.message || 'Не вдалося відключити Steam.', 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-link-slash mr-1"></i>Відключити';
    }
  }
}

async function processSteamCallback() {
  const params = new URLSearchParams(location.search);
  const error = params.get('steam_error');
  if (error) {
    const message = error === 'state'
      ? 'Час входу Steam завершився або сторінка повернення відкрита не в тому браузері. Спробуй ще раз.'
      : 'Steam не підтвердив вхід. Спробуй ще раз.';
    setSteamConnectionState(currentUser?.steamId ? 'expired' : 'disconnected', message);
    showToast(message, 'error');
    const profileId = params.get('profile');
    history.replaceState({}, '', `${location.pathname}${UUID_PATTERN.test(String(profileId || '')) ? `?profile=${encodeURIComponent(profileId)}` : ''}${location.hash}`);
    return true;
  }
  const connected = params.get('steam_connected') === '1';
  const sid = params.get('steamid');
  if (!connected && !sid) return false;
  const profileId = params.get('profile');
  history.replaceState({}, '', `${location.pathname}${UUID_PATTERN.test(String(profileId || '')) ? `?profile=${encodeURIComponent(profileId)}` : ''}${location.hash}`);
  closeModal('steamModal');
  showToast('Steam підтверджено. Підключаємо профіль…', 'success');
  if (/^\d{17}$/.test(String(sid || ''))) applySteamIdentity(sid, fallbackSteamProfile(sid), { skipAutoSync: true });
  try {
    const session = await fetchSteamSession();
    applySteamIdentity(session.profile.steamId, session.profile, { skipAutoSync: true });
    await bootstrapSteamAccount(session.profile, { announce: true });
  } catch (error) {
    showToast(error?.message || 'Не вдалося підключити Steam-збереження.', 'warn');
  }
  await syncSteamInventory();
  return true;
}

function renderDailyCalendar() {
  const content = document.getElementById('dailyCalendarContent');
  if (!content || !currentUser) return;
  const progress = getDailyCalendarProgress();
  const nextStreakValue = progress.claimedToday ? Math.max(1, progress.current) : Math.max(1, progress.current + 1);
  const cycle = Math.max(1, Math.ceil(nextStreakValue / DAILY_CALENDAR_REWARDS.length));
  const days = DAILY_CALENDAR_REWARDS.map(reward => {
    const isCurrent = reward.day === progress.cycleDay;
    const isClaimed = progress.claimedToday && reward.day <= progress.cycleDay;
    const stateClass = isClaimed ? 'is-claimed' : isCurrent ? 'is-current' : '';
    const stateLabel = isClaimed ? '<i class="fa-solid fa-check"></i> Забрано' : isCurrent ? 'Сьогодні' : `День ${reward.day}`;
    const collectible = reward.collectible ? `<small><i class="fa-solid fa-lock"></i> ${escapeHtml(getDailyCalendarCollectible(Math.max(7, nextStreakValue)))}</small>` : '';
    return `<article class="daily-calendar-day ${stateClass}"><span>ДЕНЬ ${reward.day}</span><i class="fa-solid ${reward.icon}"></i><b>${escapeHtml(reward.title)}</b>${collectible}<em>${stateLabel}</em></article>`;
  }).join('');
  const action = progress.claimedToday
    ? `<button type="button" class="daily-calendar-claim is-claimed" disabled><i class="fa-solid fa-clock"></i> НАСТУПНА НАГОРОДА ЗАВТРА</button>`
    : `<button type="button" class="daily-calendar-claim" onclick="claimDailyCalendarReward()"><i class="fa-solid fa-gift"></i> ЗАБРАТИ ДЕНЬ ${progress.cycleDay}</button>`;
  content.innerHTML = `<div class="daily-calendar-heading"><p><i class="fa-solid fa-calendar-days"></i> ЩОДЕННИЙ КАЛЕНДАР</p><h3>7 ДНІВ ПОВЕРНЕННЯ</h3><span>Заходь щодня. Пропустив день — серія починається знову; на 7-й день чекає прив’язаний колекційний скін.</span></div><div class="daily-calendar-progress"><span>СЕРІЯ</span><strong>${progress.current} <small>дн.</small></strong><em>Коло ${cycle}</em></div><section class="daily-calendar-days">${days}</section>${action}<p class="daily-calendar-note"><i class="fa-solid fa-shield-heart"></i> Усі нагороди віртуальні. Колекційний скін не продається, не ставиться на апгрейд і не впливає на шанси.</p>`;
}

function openDailyCalendar() {
  if (!currentUser) {
    showToast('Спочатку дочекайся завантаження профілю.', 'info');
    return;
  }
  renderDailyCalendar();
  openModal('dailyCalendarModal');
}

function grantDailyCalendarCollectible(streak) {
  const name = getDailyCalendarCollectible(streak);
  const skin = CS2_SKINS.find(candidate => normalizeSkinName(candidate.name) === normalizeSkinName(name));
  if (!skin) return null;
  const item = makeDemoItem({ ...skin, exclusive: true, accountBound: true, dailyCalendarReward: true }, '-daily-calendar');
  userInventory.unshift(item);
  updateAvatarBadge();
  return item;
}

function claimDailyBonus() {
  if (!currentUser) return false;
  const last = parseInt(localStorage.getItem(STORAGE.bonusAt) || '0', 10);
  const now = Date.now();
  const cd = 24 * 60 * 60 * 1000;
  if (now - last < cd) {
    const left = cd - (now - last);
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    showToast(`Бонус через ${h > 0 ? h + ' год ' : ''}${m} хв`, 'warn');
    updateGiftButtonUI();
    renderDailyCalendar();
    return false;
  }
  const streak = claimDailyStreak();
  const reward = streak.reward;
  const collectible = streak.cycleDay === DAILY_CALENDAR_REWARDS.length ? grantDailyCalendarCollectible(streak.current) : null;
  currentUser.balance = roundPc(currentUser.balance + reward);
  localStorage.setItem(STORAGE.bonusAt, String(now));
  updateBalanceUI();
  saveState();
  updateGiftButtonUI();
  renderDailyCalendar();
  renderProfileInventory();
  checkAchievements();
  showToast(`${collectible ? `${collectible.name} + ` : ''}+${formatCredits(reward)} · серія ${streak.current} дн. · день ${streak.cycleDay}/7`, 'success');
  soundCoin();
  return true;
}

function claimDailyCalendarReward() {
  const claimed = claimDailyBonus();
  if (claimed) renderGameHub();
}

function isReferralAccountId(value) {
  const id = String(value || '');
  return /^\d{17}$/.test(id);
}

function captureReferralFromUrl() {
  const url = new URL(window.location.href);
  const referrerAccountId = url.searchParams.get('ref') || '';
  if (!isReferralAccountId(referrerAccountId)) return;
  localStorage.setItem(STORAGE.pendingReferral, referrerAccountId);
  url.searchParams.delete('ref');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function pendingReferralAccountId() {
  const value = localStorage.getItem(STORAGE.pendingReferral) || '';
  return isReferralAccountId(value) ? value : '';
}

function applyServerReferralProgress(referral) {
  if (!referral || typeof referral !== 'object') return;
  if (referral.state && typeof referral.state === 'object' && gameState) {
    gameState.referrals = { ...(gameState.referrals || {}), ...referral.state };
  }
  const reward = clampNumber(referral.recipientReward, 0, MAX_STORED_BALANCE, 0);
  if (!reward || !currentUser) return;
  currentUser.balance = clampNumber(currentUser.balance + reward, 0, MAX_STORED_BALANCE, currentUser.balance);
  updateBalanceUI();
  const settled = Array.isArray(referral.settled) ? referral.settled : [];
  const labels = settled.filter(entry => Number(entry?.recruitReward) > 0).map(entry => cleanText(entry.label, 48)).join(', ');
  showToast(`Бонус за прогрес у команді: +${formatCredits(reward)}${labels ? ` · ${labels}` : ''}`, 'success');
}

async function getShareAccountId() {
  if (hasReadySteamAccount()) return String(currentUser?.steamId || account?.steamId || '');
  startSteamLogin();
  throw new Error('Підключи Steam: так один акаунт зможе отримати бонус лише один раз.');
}

async function topupShareSite() {
  try {
    const ownerAccountId = await getShareAccountId();
    if (!isReferralAccountId(ownerAccountId)) throw new Error('Профіль для запрошення ще не готовий.');
    const shareUrl = getPublicShareUrl();
    shareUrl.searchParams.set('ref', ownerAccountId);
    const shareData = {
      title: 'ПОТУЖНО DROP',
      text: 'Заходь у ПОТУЖНО DROP — відкривай віртуальні кейси, грай у Royale та збирай колекцію.',
      url: shareUrl.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Посилання відправлено. Дивіденди відкриваються, коли напарник підтвердить Steam і прогресуватиме.', 'success');
      } catch (error) {
        if (error?.name !== 'AbortError') throw error;
      }
      return;
    }
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareUrl.href);
    else window.prompt('Скопіюй персональне посилання:', shareUrl.href);
    showToast('Посилання скопійовано. Один Steam-акаунт може бути напарником лише раз.', 'success');
  } catch (error) {
    showToast(error?.message || 'Не вдалося підготувати посилання.', 'error');
  }
}

let referralActivationPromise = null;
async function activatePendingReferral() {
  const referrerAccountId = pendingReferralAccountId();
  if (!referrerAccountId || referralActivationPromise) return false;
  const ownSteamId = String(currentUser?.steamId || account?.steamId || '');
  if (referrerAccountId === ownSteamId) {
    localStorage.removeItem(STORAGE.pendingReferral);
    return false;
  }
  // A referral identity is a verified SteamID, not a browser profile. Keep
  // the pending link until Steam login has completed.
  if (!hasReadySteamAccount()) return false;
  referralActivationPromise = (async () => {
    try {
      await saveSteamAccount({ silent: true });
      const data = await requestJson('/api/rewards', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate-referral', referrerAccountId })
      }, 12_000);
      setSteamAccountMeta(ownSteamId, data);
      localStorage.removeItem(STORAGE.pendingReferral);
      if (data.activated && currentUser) {
        applyServerReferralProgress(data.referral);
        saveState({ skipCloudAutoSync: true, skipSteamAutoSync: true });
        renderGameHub();
        showToast('Запрошення підтверджено через Steam. Перший бонус відкриється на LVL 3.', 'success');
      }
      return Boolean(data.activated || data.duplicate);
    } catch (error) {
      // Permanent rejections must not follow the player forever; a temporary
      // network issue keeps the referral and will retry on the next launch.
      if ([400, 403, 404, 409].includes(Number(error?.status))) localStorage.removeItem(STORAGE.pendingReferral);
      return false;
    } finally {
      referralActivationPromise = null;
    }
  })();
  return referralActivationPromise;
}

async function openRewardedAd() {
  // Coins are never minted in the browser after a click. This becomes active
  // only when an ad provider returns a server-verifiable completion receipt.
  // Until then the UI stays honest instead of pretending that an ad was shown.
  showToast(`Відеонагорода +${REWARDED_COIN_AMOUNT} PC буде увімкнена після підключення та перевірки рекламного слоту.`, 'info');
}

const topupWatchAd = openRewardedAd;

function topupLevelReward() {
  const k = STORAGE.topup;
  let st = {};
  try { st = JSON.parse(localStorage.getItem(k) || '{}'); } catch {}
  const lvl = getPlayerLevel();
  if (st.levelClaimed === lvl) {
    showToast('Уже отримано', 'warn');
    return;
  }
  // Levels are permanent progression, not an uncapped source of PC.
  const reward = roundPc(Math.min(4, 0.5 + Math.max(0, lvl - 1) * 0.1));
  st.levelClaimed = lvl;
  localStorage.setItem(k, JSON.stringify(st));
  currentUser.balance = roundPc(currentUser.balance + reward);
  updateBalanceUI();
  saveState();
  checkAchievements();
  showToast(`+${formatCredits(reward)} за LVL ${lvl}`, 'success');
}

function updateTopupUI() {
  const el = document.getElementById('topupLevelRewardLabel');
  if (el) el.textContent = `+${formatCredits(roundPc(Math.min(4, 0.5 + Math.max(0, getPlayerLevel() - 1) * 0.1)))}`;
  const referral = document.getElementById('topupReferralRewardLabel');
  if (referral) referral.textContent = `${formatCredits(REFERRAL_MILESTONES.reduce((sum, milestone) => sum + milestone.ownerReward, 0))}+`;
}

function doPrestige() {
  if (!gameState || !currentUser) return;
  if (getPlayerLevel() < PRESTIGE_LEVEL_REQUIRED) {
    showToast(`Потрібен LVL ${PRESTIGE_LEVEL_REQUIRED}+`, 'warn');
    return;
  }
  if (!window.confirm('Скинути XP та рівень? Отримаєш +10% XP назавжди.')) return;
  gameState.prestige = (gameState.prestige || 0) + 1;
  gameState.xp = 0;
  addXp(0);
  checkAchievements();
  saveState();
  renderGameHub();
  closeModal('prestigeModal');
  showToast(`Престиж P${gameState.prestige}!`, 'success');
  soundWin();
}

function estimateInventoryPrice(it, i) {
  return stableInventoryPrice(it);
}

function verifiedInventoryMarketPrice(item) {
  return stableInventoryPrice(item);
}

function requestInventoryMarketPrice(item) {
  const skin = stableCatalogSourceForItem(item);
  if (skin) void refreshMarketPriceForSkin(skin, getWear(item));
  void refreshRecentInventoryMarketPrices(80);
}

function renderInventoryGrid() {
  const g = document.getElementById('userInventoryGrid');
  if (!g) return;
  if (!userInventory.length) {
    g.innerHTML = '<div class="col-span-full py-12 text-center text-sm text-gray-500">Інвентар порожній</div>';
    return;
  }
  g.innerHTML = userInventory.map(s => {
    const wear = getWear(s);
    const rarity = getItemRarity(s);
    const inMulti = selectedInputMode === 'multi' && multiInputSkins.some(x => x.id === s.id);
    const marketPrice = verifiedInventoryMarketPrice(s);
    const sellPrice = roundPc(marketPrice * SELL_RATE);
    const isBound = s.accountBound === true;
    const valueMarkup = `<p class="text-amber-400 font-extrabold text-xs mt-1">${formatCredits(marketPrice)}</p>`;
    return `<div class="relative bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 flex flex-col items-center transition group inventory-card ${inMulti ? 'is-in-multi' : ''} ${s.exclusive ? 'border-violet-500/50' : ''}" style="--rarity-color:${rarity.color}">
      <button type="button" data-inventory-id="${escapeHtml(String(s.id))}" class="w-full text-left">
        <span class="wear-badge wear-${wear.code} absolute top-2 left-2 z-10">${wear.code}</span>
        ${isBound ? '<span class="absolute top-2 right-2 text-violet-300 text-xs" title="Прив’язано до профілю"><i class="fa-solid fa-lock"></i></span>' : s.exclusive ? `<span class="absolute top-2 right-2 text-violet-300 text-xs" title="Ексклюзив">★</span>` : ''}
        <img src="${escapeHtml(getSkinImageSrc(s))}" alt="${escapeHtml(s.name)}" data-skin-id="${escapeHtml(getSkinKey(s))}" data-skin-name="${escapeHtml(s.name)}" class="h-20 w-full object-contain group-hover:scale-105 transition image-skeleton" loading="lazy" onerror="handleSkinImageError(this)">
        <div class="text-center w-full mt-2">
          <p class="font-bold text-xs text-white truncate" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</p>
          ${valueMarkup}
        </div>
      </button>
      ${isBound ? '<div class="mt-2 w-full rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200 text-[10px] font-extrabold uppercase py-1.5 text-center"><i class="fa-solid fa-lock mr-1"></i>Колекційний</div>' : `<button type="button" data-sell-id="${escapeHtml(String(s.id))}" title="Продати за ${formatCredits(sellPrice)}" class="mt-2 w-full rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-emerald-200 text-[11px] font-extrabold uppercase py-1.5 transition flex items-center justify-center gap-1"><i class="fa-solid fa-sack-dollar text-[10px]"></i>Продати</button>`}
      ${rarityStripMarkup(rarity, 'inventory-rarity-bar')}
    </div>`;
  }).join('');

  g.querySelectorAll('[data-inventory-id]').forEach(c => c.addEventListener('click', () => {
    const it = userInventory.find(x => String(x.id) === c.dataset.inventoryId);
    if (it) selectInventoryItem(it);
  }));
  g.querySelectorAll('[data-sell-id]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    sellInventoryItem(b.dataset.sellId);
  }));
}

function getFilteredProfileInventory() {
  const q = (document.getElementById('invSearch')?.value || '').trim().toLowerCase();
  let list = [...userInventory];
  if (profileInvFilter !== 'all') list = list.filter(it => categorizeWeapon(it.name) === profileInvFilter);
  const duplicateCounts = getInventoryDuplicateCounts();
  if (profileInvSource !== 'all') {
    list = list.filter(item => profileInvSource === 'duplicates'
      ? (duplicateCounts.get(getInventoryDuplicateKey(item)) || 0) > 1
      : getInventorySource(item) === profileInvSource);
  }
  if (profileInvWear !== 'all') list = list.filter(item => getWear(item).code === profileInvWear);
  if (profileInvCollection !== 'all') list = list.filter(item => getCollectionForInventoryItem(item)?.id === profileInvCollection);
  if (q) list = list.filter(it => String(it.name || '').toLowerCase().includes(q));

  const s = profileInvSort;
  if (s === 'price-desc') list.sort((a, b) => verifiedInventoryMarketPrice(b) - verifiedInventoryMarketPrice(a));
  else if (s === 'price-asc') list.sort((a, b) => (verifiedInventoryMarketPrice(a) || Number.MAX_SAFE_INTEGER) - (verifiedInventoryMarketPrice(b) || Number.MAX_SAFE_INTEGER));
  else if (s === 'name-asc') list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  else if (s === 'wear-asc') list.sort((a, b) => (a.wear?.min ?? 0) - (b.wear?.min ?? 0));
  else if (s === 'newest') list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  else if (s === 'duplicates-desc') list.sort((a, b) => (duplicateCounts.get(getInventoryDuplicateKey(b)) || 0) - (duplicateCounts.get(getInventoryDuplicateKey(a)) || 0) || verifiedInventoryMarketPrice(b) - verifiedInventoryMarketPrice(a));
  return list;
}

function setInventoryFilter(cat) {
  profileInvFilter = cat;
  document.querySelectorAll('[data-inv-cat]').forEach(b => b.classList.toggle('is-active', b.dataset.invCat === cat));
  renderProfileInventory();
}

function setInventorySort(val) {
  profileInvSort = val;
  renderProfileInventory();
}

function setInventorySource(val) {
  profileInvSource = ['all', 'drop', 'steam', 'exclusive', 'duplicates'].includes(val) ? val : 'all';
  renderProfileInventory();
}

function setInventoryWear(val) {
  profileInvWear = ['all', 'FN', 'MW', 'FT', 'WW', 'BS'].includes(val) ? val : 'all';
  renderProfileInventory();
}

function setInventoryCollection(val) {
  profileInvCollection = val === 'all' || COLLECTION_DEFINITIONS.some(collection => collection.id === val) ? val : 'all';
  renderProfileInventory();
}

function renderProfileInventorySelects() {
  const source = document.getElementById('invSourceSelect');
  if (source) source.value = profileInvSource;
  const wear = document.getElementById('invWearSelect');
  if (wear) wear.value = profileInvWear;
  const collection = document.getElementById('invCollectionSelect');
  if (collection) {
    collection.innerHTML = `<option value="all">Усі колекції</option>${COLLECTION_DEFINITIONS.map(definition => `<option value="${escapeHtml(definition.id)}">${escapeHtml(definition.title)}</option>`).join('')}`;
    collection.value = profileInvCollection;
  }
  const sort = document.getElementById('invSortSelect');
  if (sort) sort.value = profileInvSort;
}

function renderProfileInventoryCategoryChips() {
  const wrap = document.getElementById('invCategoryChips');
  if (!wrap) return;
  const cats = [
    { id: 'all', label: 'Усі' },
    { id: 'rifle', label: 'Гвинтівки' },
    { id: 'pistol', label: 'Пістолети' },
    { id: 'sniper', label: 'Снайперські' },
    { id: 'smg', label: 'ПП' },
    { id: 'heavy', label: 'Важкі' },
    { id: 'knife', label: 'Ножі' },
    { id: 'gloves', label: 'Рукавиці' }
  ];
  wrap.innerHTML = cats.map(c => `<button data-inv-cat="${c.id}" onclick="setInventoryFilter('${c.id}')" class="inv-chip ${profileInvFilter === c.id ? 'is-active' : ''}">${c.label}</button>`).join('');
}

function renderProfileInventoryStats() {
  const count = userInventory.length;
  const totalValue = userInventory.reduce((sum, item) => sum + verifiedInventoryMarketPrice(item), 0);
  const best = userInventory.reduce((max, item) => Math.max(max, verifiedInventoryMarketPrice(item)), 0);
  const uniqueNames = new Set(userInventory.map(it => normalizeSkinName(it.name))).size;
  const duplicates = [...getInventoryDuplicateCounts().values()].reduce((sum, copies) => sum + Math.max(0, copies - 1), 0);
  const completedCollections = COLLECTION_DEFINITIONS.filter(collection => getCollectionProgress(collection).complete).length;
  const c = document.getElementById('invStatCount');
  if (c) c.textContent = String(count);
  const v = document.getElementById('invStatValue');
  if (v) v.textContent = Math.round(totalValue).toLocaleString('uk-UA');
  const b = document.getElementById('invStatBest');
  if (b) b.textContent = Math.round(best).toLocaleString('uk-UA');
  const u = document.getElementById('invStatUnique');
  if (u) u.textContent = String(uniqueNames);
  const d = document.getElementById('invStatDuplicates');
  if (d) d.textContent = duplicates ? `×${duplicates}` : '—';
  const collections = document.getElementById('invStatCollections');
  if (collections) collections.textContent = `${completedCollections} / ${COLLECTION_DEFINITIONS.length}`;
}

function renderProfileInventory() {
  renderProfileInventoryCategoryChips();
  renderProfileInventorySelects();
  renderProfileInventoryStats();
  const grid = document.getElementById('profileInventoryGrid');
  const empty = document.getElementById('profileInventoryEmpty');
  if (!grid || !empty) return;
  const list = getFilteredProfileInventory();
  if (!userInventory.length) {
    grid.innerHTML = '';
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  grid.classList.remove('hidden');
  empty.classList.add('hidden');
  const showcaseSelection = new Set(getShowcaseSelection());

  if (!list.length) {
    grid.innerHTML = '<div class="col-span-full rounded-xl border border-dashed border-gray-700 p-10 text-center"><i class="fa-solid fa-magnifying-glass text-2xl text-gray-600"></i><p class="mt-2 text-sm font-bold text-gray-400">Нічого не знайдено</p><p class="text-xs text-gray-500 mt-1">Спробуй інший фільтр</p></div>';
    return;
  }
  grid.innerHTML = list.map(s => {
    const wear = getWear(s);
    const rarity = getItemRarity(s);
    const marketPrice = verifiedInventoryMarketPrice(s);
    const sellPrice = roundPc(marketPrice * SELL_RATE);
    const isBound = s.accountBound === true;
    const isShowcased = showcaseSelection.has(String(s.id));
    const [weaponPart, ...skinParts] = String(s.name || 'CS2 Skin').split('|');
    const weapon = cleanText(weaponPart, 48) || 'CS2';
    const skinName = cleanText(skinParts.join('|'), 110) || weapon;
    const source = getInventorySource(s);
    const origin = source === 'steam' ? 'STEAM' : source === 'exclusive' ? 'EXCLUSIVE' : 'DROP';
    return `<article class="profile-inv-card rarity-surface ${s.exclusive ? 'is-exclusive' : ''}" style="--rarity-color:${rarity.color}">
      <div class="profile-inv-card-top"><span class="wear-badge wear-${wear.code}">${wear.code}</span><span class="profile-inv-origin">${isBound ? 'BOUND' : origin}</span></div>
      <button type="button" class="profile-inv-inspect" data-profile-inspect="${escapeHtml(String(s.id))}" title="Відкрити деталі: ${escapeHtml(s.name)}">
        <img src="${escapeHtml(getSkinImageSrc(s))}" alt="${escapeHtml(s.name)}" data-skin-id="${escapeHtml(getSkinKey(s))}" data-skin-name="${escapeHtml(s.name)}" loading="lazy" onerror="handleSkinImageError(this)">
        <div class="profile-inv-copy"><span>${escapeHtml(weapon)}</span><p class="inv-name" title="${escapeHtml(s.name)}">${escapeHtml(skinName)}</p></div>
      </button>
      <div class="profile-inv-card-footer"><p class="inv-price"><i class="fa-solid fa-coins"></i>${formatCredits(marketPrice)}</p><div class="inv-actions">
        ${isBound ? '<span class="info-btn text-violet-300 border-violet-500/40" title="Прив’язано до профілю"><i class="fa-solid fa-lock"></i></span>' : `<button class="sell-btn" data-profile-sell="${escapeHtml(String(s.id))}" title="Продати за ${formatCredits(sellPrice)}"><i class="fa-solid fa-sack-dollar"></i><span>Продати</span></button>`}
        <button class="info-btn ${isShowcased ? 'text-amber-300 border-amber-400/60' : ''}" data-profile-showcase="${escapeHtml(String(s.id))}" title="${isShowcased ? 'Прибрати з вітрини' : 'Додати на вітрину'}"><i class="${isShowcased ? 'fa-solid' : 'fa-regular'} fa-star"></i></button>
        <button class="info-btn" data-profile-info="${escapeHtml(String(s.id))}" title="Деталі"><i class="fa-solid fa-circle-info"></i></button>
      </div>${rarityStripMarkup(rarity, 'profile-inv-rarity')}</div>
    </article>`;
  }).join('');

  grid.querySelectorAll('[data-profile-inspect]').forEach(button => {
    button.addEventListener('click', () => showItemDetail(button.dataset.profileInspect));
  });
  grid.querySelectorAll('[data-profile-sell]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      sellInventoryItem(b.dataset.profileSell, true);
    });
  });
  grid.querySelectorAll('[data-profile-info]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      showItemDetail(b.dataset.profileInfo);
    });
  });
  grid.querySelectorAll('[data-profile-showcase]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      toggleShowcaseItem(b.dataset.profileShowcase);
    });
  });
}

function showItemDetail(itemId) {
  const it = userInventory.find(x => String(x.id) === String(itemId));
  if (!it) return;
  if (!verifiedInventoryMarketPrice(it)) requestInventoryMarketPrice(it);
  const wear = getWear(it);
  const rarity = getItemRarity(it);
  const marketPrice = verifiedInventoryMarketPrice(it);
  const sellPrice = roundPc(marketPrice * SELL_RATE);
  const isBound = it.accountBound === true;
  const cat = categorizeWeapon(it.name);
  const catLabel = { rifle: 'Гвинтівка', pistol: 'Пістолет', sniper: 'Снайперська', smg: 'ПП', heavy: 'Важка', knife: 'Ніж', gloves: 'Рукавиці', other: 'Зброя' }[cat] || 'Зброя';
  const html = `
  <div class="text-center">
    ${it.exclusive ? `<div class="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1"><i class="fa-solid fa-star text-violet-300 text-xs"></i><span class="text-[10px] font-extrabold uppercase tracking-widest text-violet-200">Ексклюзив</span></div>` : ''}
    <div class="mx-auto mb-3 flex justify-center"><img src="${escapeHtml(getSkinImageSrc(it))}" alt="" class="h-40 object-contain" data-skin-name="${escapeHtml(it.name)}" onerror="handleSkinImageError(this)"></div>
    <p class="text-[10px] font-extrabold uppercase tracking-[.2em] text-amber-400">${catLabel} · ${escapeHtml(rarity.name)}</p>
    <h3 class="font-heading mt-1 text-3xl font-extrabold uppercase text-white leading-none">${escapeHtml(it.name)}</h3>
    <div class="mt-3 inline-flex items-center gap-2 flex-wrap justify-center">
      <span class="wear-badge wear-${wear.code}">${wear.code} · ${escapeHtml(wear.name)}</span>
      <span class="wear-badge rarity-detail-badge" style="--rarity-color:${rarity.color}"><i class="fa-solid fa-gem"></i>${escapeHtml(rarity.name)}</span>
    </div>
    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-gray-800 bg-black/20 p-3"><p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Стабільна вартість</p><p class="font-heading text-2xl font-extrabold text-amber-300">${formatCredits(marketPrice)}</p></div>
      <div class="rounded-xl border border-gray-800 bg-black/20 p-3"><p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Продаж (90%)</p><p class="font-heading text-2xl font-extrabold text-emerald-300">${formatCredits(sellPrice)}</p></div>
    </div>
    <p class="mt-3 text-[10px] leading-4 text-gray-500">Фіксована ціна зі стабільного каталогу ПОТУЖНО. Вона однакова в інвентарі, апгрейдері, кейсах, Battle, Royale та контрактах і не є реальною грошовою вартістю.</p>
    ${isBound ? `<p class="mt-3 text-[10px] text-violet-300 italic"><i class="fa-solid fa-lock mr-1"></i>Колекційний предмет прив’язаний до профілю: його не можна продавати, ставити на апгрейд, у Battle, Royale чи контракт.</p>` : it.exclusive ? `<p class="mt-3 text-[10px] text-violet-300 italic">Ексклюзивний предмет — його можна продати, але більше не отримати.</p>` : ''}
    ${isBound ? '<div class="mt-4 w-full py-3 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-200 font-extrabold uppercase text-sm tracking-wider"><i class="fa-solid fa-lock mr-2"></i>Прив’язано до профілю</div>' : `<button type="button" data-detail-sell-id="${escapeHtml(String(it.id))}" class="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 text-black font-extrabold uppercase text-sm tracking-wider transition"><i class="fa-solid fa-sack-dollar mr-2"></i>Продати за ${formatCredits(sellPrice)}</button>`}
    <button onclick="closeModal('itemDetailModal')" class="mt-3 w-full py-2.5 rounded-xl border border-gray-700 bg-black/20 hover:bg-gray-800 text-xs font-bold text-gray-300 transition">Закрити</button>
  </div>`;
  const container = document.getElementById('itemDetailContent');
  if (container) {
    container.innerHTML = html;
    container.querySelector('[data-detail-sell-id]')?.addEventListener('click', () => {
      sellInventoryItem(it.id, true);
      closeModal('itemDetailModal');
    });
  }
  openModal('itemDetailModal');
}

function sellInventoryItem(itemId, fromProfile = false) {
  const idx = userInventory.findIndex(i => String(i.id) === String(itemId));
  if (idx === -1) return;
  const it = userInventory[idx];
  if (it.accountBound === true) {
    showToast('Цей колекційний предмет прив’язаний до профілю і не продається.', 'info');
    return;
  }
  const marketPrice = verifiedInventoryMarketPrice(it);
  if (!marketPrice) {
    requestInventoryMarketPrice(it);
    showToast('Продаж заблоковано: не вдалося визначити стабільну ціну предмета.', 'warn');
    return;
  }
  const payout = roundPc(marketPrice * SELL_RATE);
  userInventory.splice(idx, 1);
  currentUser.balance = roundPc(currentUser.balance + payout);
  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.sells = (gameState.stats.sells || 0) + 1;
  gameState.daily.sells = (gameState.daily.sells || 0) + 1;
  gameState.daily.sellValue = (gameState.daily.sellValue || 0) + payout;
  gameState.weekly.sells = (gameState.weekly.sells || 0) + 1;

  if (selectedInputSkin && selectedInputSkin.id === it.id) {
    selectedInputSkin = null;
    document.getElementById('inputSkinState')?.classList.add('hidden');
    document.getElementById('inputEmptyState')?.classList.remove('hidden');
  }
  if (selectedTargetSkin && selectedTargetSkin.id === it.id) {
    selectedTargetSkin = null;
    document.getElementById('targetSkinState')?.classList.add('hidden');
    document.getElementById('targetEmptyState')?.classList.remove('hidden');
  }
  multiInputSkins = multiInputSkins.filter(x => x.id !== it.id);

  updateAllTimeOnSell(payout);
  updateBalanceUI();
  saveState();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  renderMultiSlots();
  recalculateUpgrade();
  checkAchievements();
  renderGameHub();
  showToast(`Продано «${it.name}» за ${formatCredits(payout)}`, 'success');
  soundSell();
}

function sellAllDuplicates() {
  if (!userInventory.length) {
    showToast('Інвентар порожній', 'warn');
    return;
  }
  const seen = new Map(), keep = new Set();
  for (const it of userInventory) {
    const key = normalizeSkinName(it.name) + '|' + (it.wear?.code || '');
    if (!seen.has(key)) {
      seen.set(key, it.id);
      keep.add(it.id);
    }
  }
  const duplicates = userInventory.filter(it => !keep.has(it.id));
  const locked = duplicates.filter(it => it.accountBound === true);
  const sellable = duplicates.filter(it => it.accountBound !== true);
  const toSell = sellable.filter(verifiedInventoryMarketPrice);
  if (!toSell.length) {
    if (sellable.length) {
      sellable.forEach(requestInventoryMarketPrice);
      showToast('Є дублікати без стабільної ціни. Продаж не виконано.', 'info');
    } else if (locked.length) {
      showToast('Дублікати нагород прив’язані до профілю і не продаються.', 'info');
    } else {
      showToast('Дублікатів немає', 'info');
    }
    return;
  }
  const unquoted = sellable.length - toSell.length;
  const total = roundPc(toSell.reduce((s, it) => s + roundPc(verifiedInventoryMarketPrice(it) * SELL_RATE), 0));
  const notice = `${unquoted ? ` ${unquoted} без стабільної ціни залишаться в інвентарі.` : ''}${locked.length ? ` ${locked.length} прив’язаних нагород залишаться в інвентарі.` : ''}`;
  if (!window.confirm(`Продати ${toSell.length} дублікатів за ${formatCredits(total)}?${notice}`)) return;

  const soldIds = new Set(toSell.map(i => i.id));
  userInventory = userInventory.filter(it => keep.has(it.id) || !soldIds.has(it.id));
  currentUser.balance = roundPc(currentUser.balance + total);
  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.sells = (gameState.stats.sells || 0) + toSell.length;
  gameState.daily.sells = (gameState.daily.sells || 0) + toSell.length;
  gameState.daily.sellValue = (gameState.daily.sellValue || 0) + total;
  gameState.weekly.sells = (gameState.weekly.sells || 0) + toSell.length;

  if (selectedInputSkin && soldIds.has(selectedInputSkin.id)) {
    selectedInputSkin = null;
    document.getElementById('inputSkinState')?.classList.add('hidden');
    document.getElementById('inputEmptyState')?.classList.remove('hidden');
  }
  multiInputSkins = multiInputSkins.filter(x => !soldIds.has(x.id));

  updateAllTimeOnSell(total);
  updateBalanceUI();
  saveState();
  renderInventoryGrid();
  renderProfileInventory();
  renderMultiSlots();
  recalculateUpgrade();
  updateAvatarBadge();
  checkAchievements();
  renderGameHub();
  showToast(`Продано ${toSell.length} за ${formatCredits(total)}`, 'success');
  soundSell();
}

function openInventoryOrFocus() {
  if (selectedInputMode === 'skin' || selectedInputMode === 'multi') {
    openModal('inventoryModal');
  }
}

function selectInventoryItem(it) {
  if (!it) return;
  if (it.accountBound === true) {
    showToast('Колекційні нагороди не можна використовувати як внесок в апгрейдер.', 'info');
    return;
  }
  const marketPrice = verifiedInventoryMarketPrice(it);
  if (!marketPrice) {
    requestInventoryMarketPrice(it);
    showToast('Не вдалося визначити стабільну ціну предмета перед апгрейдом.', 'info');
    return;
  }
  it = { ...it, basePrice: marketPrice, price: marketPrice, marketPrice };
  if (selectedInputMode === 'multi') {
    if (multiInputSkins.some(x => x.id === it.id)) {
      removeFromMulti(it.id);
    } else {
      addToMulti(it);
    }
    return;
  }
  selectedInputSkin = it;
  setImageSource(document.getElementById('inputSkinImg'), it.img, it.name, getSkinKey(it));
  const nameEl = document.getElementById('inputSkinName');
  if (nameEl) nameEl.textContent = it.name;
  const rarityEl = document.getElementById('inputSkinRarity');
  if (rarityEl) rarityEl.textContent = `${it.rarity || 'CS2'} · ${getWear(it).name}`;
  document.getElementById('inputSkinState')?.classList.remove('hidden');
  document.getElementById('inputEmptyState')?.classList.add('hidden');
  document.getElementById('inputMultiState')?.classList.add('hidden');
  document.getElementById('inputBalanceState')?.classList.add('hidden');
  closeModal('inventoryModal');
  recalculateUpgrade();
}

function selectTargetItem(it) {
  if (!it) return;
  const marketSkin = marketReadyCatalogSkin(it);
  if (!marketSkin) {
    warmVisibleShopMarketPrices([it]);
      showToast('Не вдалося визначити стабільну ціну цього скіна. Обери інший предмет.', 'info');
    return;
  }
  it = marketSkin;
  const iv = getInputVal();
  if (iv > 0 && it.price <= iv) {
    showToast(`Ціль має коштувати більше за ${formatCredits(iv)}`, 'warn');
    return;
  }
  selectedTargetSkin = it;
  setImageSource(document.getElementById('targetSkinImg'), it.img, it.name, getSkinKey(it));
  const nameEl = document.getElementById('targetSkinName');
  if (nameEl) nameEl.textContent = it.name;
  const rarityEl = document.getElementById('targetSkinRarity');
  if (rarityEl) rarityEl.textContent = it.rarity || 'CS2';
  document.getElementById('targetSkinState')?.classList.remove('hidden');
  document.getElementById('targetEmptyState')?.classList.add('hidden');
  closeModal('shopModal');
  recalculateUpgrade();
}

function addToMulti(item) {
  if (!item) return;
  if (item.accountBound === true) {
    showToast('Колекційні нагороди не можна використовувати як внесок в апгрейдер.', 'info');
    return;
  }
  const marketPrice = verifiedInventoryMarketPrice(item);
  if (!marketPrice) {
    requestInventoryMarketPrice(item);
    showToast('Не вдалося визначити стабільну ціну предмета перед апгрейдом.', 'info');
    return;
  }
  item = { ...item, basePrice: marketPrice, price: marketPrice, marketPrice };
  if (multiInputSkins.some(x => x.id === item.id)) {
    showToast('Уже додано', 'info');
    return;
  }
  if (multiInputSkins.length >= MULTI_INPUT_MAX) {
    showToast(`Максимум ${MULTI_INPUT_MAX}`, 'warn');
    return;
  }
  multiInputSkins.push(item);
  renderMultiSlots();
  renderInventoryGrid();
  recalculateUpgrade();
  beep(600, 0.05, 'square');
}

function removeFromMulti(id) {
  multiInputSkins = multiInputSkins.filter(x => String(x.id) !== String(id));
  renderMultiSlots();
  renderInventoryGrid();
  recalculateUpgrade();
}

function clearMultiInput() {
  multiInputSkins = [];
  renderMultiSlots();
  renderInventoryGrid();
  recalculateUpgrade();
}

function renderMultiSlots() {
  const g = document.getElementById('multiSlotsGrid');
  if (!g) return;
  if (!multiInputSkins.length) {
    g.className = 'flex-1 flex items-center justify-center text-center';
    g.innerHTML = '<div><i class="fa-solid fa-plus text-2xl text-gray-700 block mb-3"></i><p class="text-xs text-gray-500">Натисни «Додати» щоб обрати скіни</p></div>';
  } else {
    g.className = 'flex-1 grid grid-cols-3 gap-1.5 overflow-y-auto content-start pr-1';
    g.innerHTML = multiInputSkins.map(s => {
      const wear = getWear(s);
      return `<div class="multi-slot">
        <span class="wear-badge wear-${wear.code} absolute top-1 left-1">${wear.code}</span>
        <button type="button" class="rm" data-multi-remove-id="${escapeHtml(String(s.id))}" aria-label="Видалити"><i class="fa-solid fa-xmark"></i></button>
        <img src="${escapeHtml(getSkinImageSrc(s))}" alt="" data-skin-name="${escapeHtml(s.name)}" onerror="handleSkinImageError(this)">
            <div class="price">${formatCreditValue(s.price)}</div>
      </div>`;
    }).join('');
    g.querySelectorAll('[data-multi-remove-id]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        removeFromMulti(button.dataset.multiRemoveId);
      });
    });
  }
  const lbl = document.getElementById('multiCountLabel');
  if (lbl) lbl.textContent = String(multiInputSkins.length);
}

function switchInputMode(mode) {
  selectedInputMode = mode;
  const sb = document.getElementById('tabSkinBtn');
  const mb = document.getElementById('tabMultiBtn');
  const bb = document.getElementById('tabBalanceBtn');
  const activeClass = 'py-2 text-[11px] font-bold rounded-lg bg-amber-500 text-black transition';
  const inactiveClass = 'py-2 text-[11px] font-bold rounded-lg text-gray-400 hover:text-white transition';

  if (sb) sb.className = inactiveClass;
  if (mb) mb.className = inactiveClass;
  if (bb) bb.className = inactiveClass;

  if (mode === 'skin' && sb) sb.className = activeClass;
  else if (mode === 'multi' && mb) mb.className = activeClass;
  else if (bb) bb.className = activeClass;

  document.getElementById('inputSkinState')?.classList.add('hidden');
  document.getElementById('inputMultiState')?.classList.add('hidden');
  document.getElementById('inputBalanceState')?.classList.add('hidden');
  document.getElementById('inputEmptyState')?.classList.add('hidden');

  if (mode === 'skin') {
    const hasSkin = Boolean(selectedInputSkin);
    document.getElementById('inputSkinState')?.classList.toggle('hidden', !hasSkin);
    document.getElementById('inputEmptyState')?.classList.toggle('hidden', hasSkin);
  } else if (mode === 'multi') {
    document.getElementById('inputMultiState')?.classList.remove('hidden');
    renderMultiSlots();
  } else {
    document.getElementById('inputBalanceState')?.classList.remove('hidden');
  }
  renderInventoryGrid();
  recalculateUpgrade();
}

function setStake(v) {
  const i = document.getElementById('balanceStakeInput');
  if (!i) return;
  if (v === 'all' && currentUser) {
    i.value = String(Math.max(1, Math.floor(currentUser.balance)));
  } else {
    i.value = String(v);
  }
  updateBalanceStake();
}

function updateBalanceStake() {
  const i = document.getElementById('balanceStakeInput');
  if (!i) return;
  const r = parseFloat(i.value) || 0;
  balanceStake = Math.min(Math.max(0, r), currentUser?.balance || 0);
  i.value = String(Math.floor(balanceStake));
  recalculateUpgrade();
}

function setRollMode(mode) {
  if (isRolling) return;
  // 7.5 uses one public return rate. The former two modes altered the odds
  // and minted PC in a predictable loop, so old button calls resolve to this
  // single fair formula.
  rollMode = 'standard';
  const o = document.getElementById('modeOverBtn');
  const u = document.getElementById('modeUnderBtn');
  const a = 'py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-black transition';
  const i = 'py-1.5 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition';
  if (mode === 'over') {
    if (o) o.className = a;
    if (u) u.className = i;
  } else {
    if (u) u.className = a;
    if (o) o.className = i;
  }
  const hint = document.getElementById('rollModeHint');
  if (hint) hint.textContent = 'Шанс = (внесок ÷ ціль) × 90%. Без прихованих бонусів.';
  recalculateUpgrade();
}

function getInputVal() {
  if (selectedInputMode === 'skin') return verifiedInventoryMarketPrice(selectedInputSkin);
  if (selectedInputMode === 'multi') return multiInputSkins.reduce((sum, item) => sum + verifiedInventoryMarketPrice(item), 0);
  return balanceStake;
}

function getTargetVal() {
  return selectedTargetSkin ? (verifiedMarketPriceForWear(selectedTargetSkin) || Number(selectedTargetSkin.marketPrice) || 0) : 0;
}

function calcChance(iv, tv) {
  if (!iv || !tv || tv <= iv) return 0;
  const ratio = iv / tv;
  const base = 100 * ratio * UPGRADE_RETURN_RATE;
  return Math.min(CHANCE_MAX, Math.max(CHANCE_MIN, base));
}

function getWinBonus() {
  return 0;
}

function recalculateUpgrade() {
  const iv = getInputVal(), tv = getTargetVal();
  const iiv = document.getElementById('inputItemValue');
  if (iiv) iiv.textContent = formatCredits(iv);
  const tiv = document.getElementById('targetItemValue');
  if (tiv) tiv.textContent = formatCredits(tv);

  const btn = document.getElementById('upgradeActionBtn');
  if (btn) {
    if (selectedInputMode === 'multi' && multiInputSkins.length < MULTI_INPUT_MIN) {
      btn.innerHTML = `<i class="fa-solid fa-layer-group mr-2"></i>ДОДАЙ ЩЕ ${MULTI_INPUT_MIN - multiInputSkins.length}`;
    } else {
      btn.innerHTML = '<i class="fa-solid fa-bolt mr-2"></i>АПГРЕЙД';
    }
  }

  const winChanceText = document.getElementById('winChanceText');
  const multiplierText = document.getElementById('multiplierText');

  if (!iv || !tv) {
    if (winChanceText) winChanceText.textContent = '—';
    if (multiplierText) multiplierText.textContent = 'x0.00';
    renderCanvas(0);
    return;
  }
  if (tv <= iv) {
    if (winChanceText) winChanceText.textContent = '—';
    if (multiplierText) multiplierText.textContent = 'x<1';
    renderCanvas(0);
    return;
  }

  const c = calcChance(iv, tv);
  if (winChanceText) winChanceText.textContent = `${c.toFixed(2)} %`;
  if (multiplierText) multiplierText.textContent = `x${(tv / iv).toFixed(2)}`;
  renderCanvas(c);
  if (iv > 0) renderSmartSuggestions(iv);
}

/* ───── Upgrader 2.0 helper: multiplier preset ─────────────────────────── */
let lastWonUpgraderSkin = null;

function applyMultiplierPreset(mult) {
  const iv = getInputVal();
  if (!iv) { showToast('Спочатку обери вхідний предмет', 'warn'); return; }
  const target = iv * mult;
  // Find skin in catalog closest to target price (must be >= iv)
  let best = null, bestDiff = Infinity;
  for (const source of CS2_SKINS) {
    const s = marketReadyCatalogSkin(source);
    if (!s) continue;
    const p = s.price;
    if (p < iv) continue;
    const diff = Math.abs(p - target);
    if (diff < bestDiff) { bestDiff = diff; best = s; }
  }
  if (!best) { showToast('Скін не знайдено', 'warn'); return; }
  selectedTargetSkin = best;
  // Update right column UI
  const tei = document.getElementById('targetEmptyState');
  const tsi = document.getElementById('targetSkinState');
  const timg = document.getElementById('targetSkinImg');
  const tnm  = document.getElementById('targetSkinName');
  const trar = document.getElementById('targetSkinRarity');
  if (tei) tei.classList.add('hidden');
  if (tsi) tsi.classList.remove('hidden');
  if (timg) setImageSource(timg, best.img, best.name, getSkinKey(best));
  if (tnm)  tnm.textContent  = best.name;
  if (trar) trar.textContent = best.rarity || '';
  // Highlight active preset button
  document.querySelectorAll('.upg-preset-btn').forEach(b => b.classList.remove('active'));
  const clicked = [...document.querySelectorAll('.upg-preset-btn')].find(b => b.textContent.trim() === `${mult}x` || parseFloat(b.textContent) === mult);
  if (clicked) clicked.classList.add('active');
  recalculateUpgrade();
  renderSmartSuggestions(iv);
}

function renderSmartSuggestions(inputVal) {
  const el = document.getElementById('upgraderQuickSuggestions');
  if (!el || !inputVal) return;

  const presets = [
    { key: 'safe',    icon: '🛡',  label: 'Safe',    mult: 2,    accent: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)' },
    { key: 'balance', icon: '⚡',  label: 'Balance', mult: 3.3,  accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
    { key: 'jackpot', icon: '💎', label: 'Jackpot', mult: 12.5, accent: '#a855f7', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.25)' },
  ];

  el.innerHTML = presets.map(p => {
    const targetPrice = inputVal * p.mult;
    let best = null, bestDiff = Infinity;
    for (const source of CS2_SKINS) {
      const s = marketReadyCatalogSkin(source);
      if (!s) continue;
      const pr = s.price;
      if (pr < inputVal) continue;
      const diff = Math.abs(pr - targetPrice);
      if (diff < bestDiff) { bestDiff = diff; best = s; }
    }
    if (!best) return '';

    const actualChance = calcChance(inputVal, best.price || targetPrice);
    const sk = getSkinKey ? getSkinKey(best) : '';
    const displayName = best.name.length > 18 ? best.name.slice(0, 16) + '…' : best.name;
    const priceStr = typeof formatCredits === 'function' ? formatCredits(best.price || 0) : (best.price || 0) + ` ${CURRENCY_TOKEN}`;

    return `<button type="button" class="upg-sugg-card" data-preset="${p.key}" data-suggestion-key="${escapeHtml(sk)}" style="background:${p.bg};border-color:${p.border}">
  <div class="upg-sugg-icon" style="color:${p.accent}">${p.icon}</div>
  <div class="upg-sugg-body">
    <div class="upg-sugg-label" style="color:${p.accent}">${p.label}</div>
    <div class="upg-sugg-name">${escapeHtml(displayName)}</div>
    <div class="upg-sugg-meta">
      <span class="upg-sugg-chance" style="color:${p.accent}">${actualChance.toFixed(1)}%</span>
      <span class="upg-sugg-price">${priceStr}</span>
    </div>
  </div>
</button>`;
  }).join('');
  el.querySelectorAll('[data-suggestion-key]').forEach(button => {
    button.addEventListener('click', () => applySuggestion(button.dataset.suggestionKey));
  });
}

function applySuggestion(skinKey) {
  const skin = getSkinByKey(skinKey) || CS2_SKINS.find(s => s.name === skinKey);
  if (!skin) return;
  const marketSkin = marketReadyCatalogSkin(skin);
  if (!marketSkin) {
    warmVisibleShopMarketPrices([skin]);
    showToast('Не вдалося визначити стабільну ціну цілі.', 'info');
    return;
  }
  selectedTargetSkin = marketSkin;
  const tei = document.getElementById('targetEmptyState');
  const tsi = document.getElementById('targetSkinState');
  const timg = document.getElementById('targetSkinImg');
  const tnm  = document.getElementById('targetSkinName');
  const trar = document.getElementById('targetSkinRarity');
  if (tei) tei.classList.add('hidden');
  if (tsi) tsi.classList.remove('hidden');
  if (timg) setImageSource(timg, marketSkin.img, marketSkin.name, getSkinKey(marketSkin));
  if (tnm)  tnm.textContent  = marketSkin.name;
  if (trar) trar.textContent = marketSkin.rarity || '';
  // Highlight by a data attribute, never by executable inline code.
  document.querySelectorAll('.upg-sugg-card').forEach(c => {
    c.classList.toggle('is-active', c.dataset.suggestionKey === getSkinKey(marketSkin));
  });
  recalculateUpgrade();
}

function chainUpgradeWonSkin() {
  if (!lastWonUpgraderSkin) { showToast('Немає виграного скіна', 'warn'); return; }
  const won = lastWonUpgraderSkin;
  if (!verifiedInventoryMarketPrice(won)) {
    requestInventoryMarketPrice(won);
    showToast('Не вдалося визначити стабільну ціну виграного скіна.', 'info');
    return;
  }
  lastWonUpgraderSkin = null;
  const _rua = document.getElementById('resultUpgraderActions');
  if (_rua) _rua.classList.add('hidden');
  closeModal('resultModal');
  // Switch to skin mode and set won skin as input
  switchInputMode('skin');
  selectedInputSkin = won;
  const ies = document.getElementById('inputEmptyState');
  const iss = document.getElementById('inputSkinState');
  const iimg = document.getElementById('inputSkinImg');
  const inm  = document.getElementById('inputSkinName');
  const irar = document.getElementById('inputSkinRarity');
  if (ies) ies.classList.add('hidden');
  if (iss) iss.classList.remove('hidden');
  if (iimg) setImageSource(iimg, won.img, won.name, getSkinKey(won));
  if (inm)  inm.textContent  = won.name;
  if (irar) irar.textContent = won.rarity || '';
  recalculateUpgrade();
  showToast('Скін встановлено як вхідний!', 'success');
}

function quickSellUpgradedSkin() {
  if (!lastWonUpgraderSkin) { showToast('Немає виграного скіна', 'warn'); return; }
  const won = lastWonUpgraderSkin;
  const price = verifiedInventoryMarketPrice(won);
  if (!price) {
    requestInventoryMarketPrice(won);
    showToast('Не вдалося визначити стабільну ціну виграного скіна. Швидкий продаж заблоковано.', 'warn');
    return;
  }
  lastWonUpgraderSkin = null;
  const _rua = document.getElementById('resultUpgraderActions');
  if (_rua) _rua.classList.add('hidden');
  closeModal('resultModal');
  const earned = roundPc(price * SELL_RATE);
  currentUser.balance = roundPc(currentUser.balance + earned);
  userInventory = userInventory.filter(i => i.id !== won.id);
  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.sells = (gameState.stats.sells || 0) + 1;
  gameState.daily.sells = (gameState.daily.sells || 0) + 1;
  gameState.daily.sellValue = (gameState.daily.sellValue || 0) + earned;
  gameState.weekly.sells = (gameState.weekly.sells || 0) + 1;
  updateAllTimeOnSell(earned);
  updateBalanceUI();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  saveState();
  checkAchievements();
  renderGameHub();
  showToast(`Продано за ${formatCredits(earned)}`, 'success');
  soundSell();
}

function showResultModal(win, skin, bonus = 0) {
  const icon = document.getElementById('resultIcon');
  const title = document.getElementById('resultTitle');
  const text = document.getElementById('resultText');
  const img = document.getElementById('resultImg');

  if (win && skin) {
    if (icon) icon.innerHTML = '<i class="fa-solid fa-trophy text-5xl text-green-400"></i>';
    if (title) {
      title.textContent = 'ПЕРЕМОГА!';
      title.className = 'font-heading text-4xl font-extrabold uppercase mb-2 text-green-400';
    }
    const w = skin.wear ? ` · ${skin.wear.code}` : '';
    if (text) {
      text.textContent = bonus
        ? `«${skin.name}»${w} додано. Бонус: +${formatCredits(bonus)}.`
        : `«${skin.name}»${w} додано до інвентарю.`;
    }
    if (img) {
      setImageSource(img, skin.img, skin.name, getSkinKey(skin));
      img.classList.remove('hidden');
    }
  } else {
    if (icon) icon.innerHTML = '<i class="fa-solid fa-heart-crack text-5xl text-red-400"></i>';
    if (title) {
      title.textContent = 'НЕВДАЧА';
      title.className = 'font-heading text-4xl font-extrabold uppercase mb-2 text-red-400';
    }
    if (text) text.textContent = 'Предмет зник після ролу. Спробуй ще!';
    if (img) {
      img.classList.add('hidden');
      img.src = '';
    }
  }
  openModal('resultModal');
}

function executeUpgrade() {
  if (isRolling || pendingWager || isCaseOpening || isFreeCaseOpening) {
    if (pendingWager || isCaseOpening || isFreeCaseOpening) showToast('Спочатку дочекайся завершення поточного раунду', 'warn');
    return;
  }
  const iv = getInputVal(), tv = getTargetVal();
  const inSkin = selectedInputSkin, tgtSkin = selectedTargetSkin;
  const multiAtStart = [...multiInputSkins];

  if (!iv || !tv) {
    showToast('Обери предмет та ціль', 'warn');
    return;
  }
  if (tv <= iv) {
    showToast(`Ціль має бути дорожчою за ${formatCredits(iv)}`, 'warn');
    return;
  }
  if (selectedInputMode === 'multi' && multiInputSkins.length < MULTI_INPUT_MIN) {
    showToast(`Додай щонайменше ${MULTI_INPUT_MIN} скіни`, 'warn');
    return;
  }
  if (selectedInputMode === 'balance' && balanceStake > currentUser.balance) {
    showToast('Недостатньо кредитів', 'warn');
    return;
  }
  if (selectedInputMode === 'skin' && (!inSkin || !userInventory.some(item => item.id === inSkin.id))) {
    showToast('Обраного скіна вже немає в інвентарі', 'warn');
    return;
  }
  if (selectedInputMode === 'skin' && inSkin.accountBound === true) {
    showToast('Колекційний предмет прив’язаний до профілю і не може бути внеском.', 'warn');
    return;
  }
  if (selectedInputMode === 'skin' && !verifiedInventoryMarketPrice(inSkin)) {
    requestInventoryMarketPrice(inSkin);
    showToast('Не вдалося визначити стабільну ціну вхідного предмета.', 'warn');
    return;
  }
  if (selectedInputMode === 'multi' && !multiAtStart.every(item => userInventory.some(owned => owned.id === item.id))) {
    showToast('Деяких скінів уже немає в інвентарі', 'warn');
    return;
  }
  if (selectedInputMode === 'multi' && multiAtStart.some(item => item.accountBound === true)) {
    showToast('Колекційні предмети не можуть бути внеском в апгрейдер.', 'warn');
    return;
  }
  if (selectedInputMode === 'multi' && !multiAtStart.every(verifiedInventoryMarketPrice)) {
    multiAtStart.filter(item => !verifiedInventoryMarketPrice(item)).forEach(requestInventoryMarketPrice);
    showToast('Не вдалося визначити стабільні ціни частини внеску.', 'warn');
    return;
  }
  if (!getTargetVal()) {
    warmVisibleShopMarketPrices([tgtSkin]);
    showToast('Не вдалося визначити стабільну ціну цілі.', 'warn');
    return;
  }

  const chance = calcChance(iv, tv);
  const winBonus = getWinBonus(tv);
  const roll = Math.random() * 100;
  const isWin = roll <= chance;
  const wagerId = beginPendingWager({
    inventory: selectedInputMode === 'skin' ? [inSkin] : selectedInputMode === 'multi' ? multiAtStart : [],
    balance: selectedInputMode === 'balance' ? balanceStake : 0
  });

  ensureDailyState();
  ensureWeeklyState();

  if (selectedInputMode === 'balance') {
    currentUser.balance -= balanceStake;
    updateBalanceUI();
    saveState();
    gameState.daily.creditInputs = (gameState.daily.creditInputs || 0) + 1;
    gameState.allTime.creditInputs = (gameState.allTime.creditInputs || 0) + 1;
  }
  if (selectedInputMode === 'multi') {
    gameState.daily.multiInputs = (gameState.daily.multiInputs || 0) + 1;
    gameState.allTime.multiInputs = (gameState.allTime.multiInputs || 0) + 1;
  }

  // Deduct/consume inputs IMMEDIATELY to prevent dupes via rapid clicking or page hopping
  if (selectedInputMode === 'skin' && inSkin) {
    userInventory = userInventory.filter(i => i.id !== inSkin.id);
    selectedInputSkin = null;
    document.getElementById('inputSkinState')?.classList.add('hidden');
    document.getElementById('inputEmptyState')?.classList.remove('hidden');
  } else if (selectedInputMode === 'multi') {
    const ids = new Set(multiAtStart.map(x => x.id));
    userInventory = userInventory.filter(i => !ids.has(i.id));
    multiInputSkins = [];
    renderMultiSlots();
  }

  isRolling = true;
  document.querySelector('.upg-wheel-box')?.classList.add('is-spinning');
  const btn = document.getElementById('upgradeActionBtn');
  const ob = document.getElementById('modeOverBtn');
  const ub = document.getElementById('modeUnderBtn');
  if (btn) btn.disabled = true;
  if (ob) ob.disabled = true;
  if (ub) ub.disabled = true;

  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  saveState();

  const rollStatus = document.getElementById('rollStatusText');
  if (rollStatus) rollStatus.textContent = 'ОБЕРТАННЯ...';

  const start = performance.now(), dur = 3200, turns = 5;
  const finalAngle = turns * Math.PI * 2 + (roll / 100) * Math.PI * 2;
  const tick = setInterval(() => beep(380 + Math.random() * 240, 0.03, 'square'), 90);

  function anim(now) {
    const p = Math.min((now - start) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    renderCanvas(chance, e * finalAngle);

    if (p < 1) {
      requestAnimationFrame(anim);
      return;
    }

    clearInterval(tick);
    if (!completePendingWager(wagerId)) return;
    isRolling = false;
    document.querySelector('.upg-wheel-box')?.classList.remove('is-spinning');
    if (btn) btn.disabled = false;
    if (ob) ob.disabled = false;
    if (ub) ub.disabled = false;

    if (isWin) {
      if (rollStatus) rollStatus.textContent = 'ВИГРАШ!';
      soundWin();
      const ni = makeDemoItem(tgtSkin);
      lastWonUpgraderSkin = ni;
      userInventory.push(ni);
      if (winBonus) {
        currentUser.balance += winBonus;
        updateBalanceUI();
      }
      renderInventoryGrid();
      renderProfileInventory();
      updateAvatarBadge();
      saveState();
      addActivityEvent({ player: currentUser.name || 'Ти', skin: ni, outcome: 'win', communityKind: 'upgrade' });
      recordRound({ win: true, target: tgtSkin, chance, mode: selectedInputMode === 'multi' ? 'multi' : rollMode, inputValue: iv, bonus: winBonus });
      const _rua_win = document.getElementById('resultUpgraderActions');
      if (_rua_win) _rua_win.classList.remove('hidden');
      setTimeout(() => showResultModal(true, ni, winBonus), 220);
    } else {
      if (rollStatus) rollStatus.textContent = 'НЕВДАЧА';
      soundLose();
      renderInventoryGrid();
      renderProfileInventory();
      updateAvatarBadge();
      saveState();
      addActivityEvent({ player: currentUser.name || 'Ти', skin: tgtSkin, outcome: 'loss' });
      recordRound({ win: false, target: tgtSkin, chance, mode: selectedInputMode === 'multi' ? 'multi' : rollMode, inputValue: iv, bonus: 0 });
      const _rua_lose = document.getElementById('resultUpgraderActions');
      if (_rua_lose) _rua_lose.classList.add('hidden');
      setTimeout(() => showResultModal(false), 220);
    }
    recalculateUpgrade();
  }

  const isFast = document.getElementById('upgraderFastToggle')?.checked;
  if (isFast) {
    // Skip animation, resolve immediately
    clearInterval(tick);
    if (!completePendingWager(wagerId)) return;
    renderCanvas(chance, finalAngle % (Math.PI * 2));
    isRolling = false;
    document.querySelector('.upg-wheel-box')?.classList.remove('is-spinning');
    if (btn) btn.disabled = false;
    if (ob) ob.disabled = false;
    if (ub) ub.disabled = false;
    if (isWin) {
      if (rollStatus) rollStatus.textContent = 'ВИГРАШ!';
      soundWin();
      const ni = makeDemoItem(tgtSkin);
      lastWonUpgraderSkin = ni;
      userInventory.push(ni);
      if (winBonus) { currentUser.balance += winBonus; updateBalanceUI(); }
      renderInventoryGrid(); renderProfileInventory(); updateAvatarBadge(); saveState();
      addActivityEvent({ player: currentUser.name || 'Ти', skin: ni, outcome: 'win', communityKind: 'upgrade' });
      recordRound({ win: true, target: tgtSkin, chance, mode: selectedInputMode === 'multi' ? 'multi' : rollMode, inputValue: iv, bonus: winBonus });
      const _rua2 = document.getElementById('resultUpgraderActions');
      if (_rua2) _rua2.classList.remove('hidden');
      setTimeout(() => showResultModal(true, ni, winBonus), 80);
    } else {
      if (rollStatus) rollStatus.textContent = 'НЕВДАЧА';
      soundLose();
      renderInventoryGrid(); renderProfileInventory(); updateAvatarBadge(); saveState();
      addActivityEvent({ player: currentUser.name || 'Ти', skin: tgtSkin, outcome: 'loss' });
      recordRound({ win: false, target: tgtSkin, chance, mode: selectedInputMode === 'multi' ? 'multi' : rollMode, inputValue: iv, bonus: 0 });
      const _rua3 = document.getElementById('resultUpgraderActions');
      if (_rua3) _rua3.classList.add('hidden');
      setTimeout(() => showResultModal(false), 80);
    }
    recalculateUpgrade();
    return;
  }
  requestAnimationFrame(anim);
}

/* ===== ПУЛИ ТА ШАНСИ КЕЙСІВ ===== */
let currentCaseCategory = 'all';
let currentActiveCaseId = 'budget_covert';
let caseMultiplier = 1;
let useCaseTicket = false;
let lastWonCaseItems = [];
let lastOpenedCaseId = 'budget_covert';
let currentDetailsCaseId = 'budget_covert';
const _casePoolCache = new Map();
const CASE_MARKET_SAMPLE_SIZE = 160;
const caseMarketSyncPromises = new Map();

function resolveCaseConfig(caseType) {
  let cfg = getRuntimeCaseConfig(caseType) || CASE_TYPES[caseType] || CASE_TYPES.budget_covert;
  if (cfg.aliasTo) cfg = CASE_TYPES[cfg.aliasTo] || cfg;
  return cfg;
}

function getCaseCatalogCandidates(caseType) {
  const cfg = resolveCaseConfig(caseType);
  const usable = CS2_SKINS.filter(isUsableSkin);
  if (!usable.length) return [];
  const themed = typeof cfg.filter === 'function' ? usable.filter(cfg.filter) : [];
  return themed.sort((left, right) => left.name.localeCompare(right.name));
}

function getFreeCaseCatalogCandidates() {
  return CS2_SKINS
    .filter(skin => isUsableSkin(skin) && isWeaponSkin(skin) && ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade'].includes(skin.rarity))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function ensureCaseMarketPrices(caseType) {
  const key = caseType === 'free' ? 'free' : resolveCaseConfig(caseType).id;
  // Stable values are calculated locally. A former compatibility path rebuilt
  // the full catalogue and rerendered every case before each open, which could
  // block a phone for seconds even though no network price was needed.
  return getCaseSkinPool(key).length >= 8;
}

const _caseCostCache = new Map();
function getCaseCost(caseType) {
  if (caseType === 'free') return 0;
  const cfg = resolveCaseConfig(caseType);
  const multiplier = getRuntimeEconomy().casePriceMultiplier;
  const cacheKey = `${cfg.id}:${CS2_SKINS.length}:${multiplier}`;
  const cached = _caseCostCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const pool = getCaseSkinPool(cfg.id);
  const values = pool.map(skin => Number(skin.price) || 0).filter(value => value > 0).sort((left, right) => left - right);
  if (values.length < 8) return 0;

  // Price every themed case from its own expected item value. Iteration is
  // required because the visible probability bands are defined relative to
  // the case price. The result keeps every case near one shared 88% return
  // rate instead of making a knife case or a budget case secretly better.
  const getExpectedValue = price => {
    const chances = buildCaseDropChanceMap(pool, price);
    return pool.reduce((sum, skin) => sum + (Number(skin.price) || 0) * (chances.get(getSkinKey(skin)) || 0) / 100, 0);
  };
  const minimumRiskPrice = roundPc(values[0] / CASE_MIN_LOSS_PRICE_RATIO + 0.01);
  let cost = Math.max(0.25, roundPc(values[Math.floor((values.length - 1) * 0.5)] * 0.7));
  for (let attempt = 0; attempt < 36; attempt++) {
    const expectedValue = getExpectedValue(cost);
    const targetCost = Math.max(minimumRiskPrice, 0.25, roundPc(expectedValue / CASE_TARGET_RETURN_RATE));
    if (Math.abs(targetCost - cost) < 0.01) {
      cost = targetCost;
      break;
    }
    cost = roundPc(cost * 0.25 + targetCost * 0.75);
  }

  // Keep the least expensive entry meaningfully below the ticket price. This
  // creates a loss tier in every paid case, including narrow collections where
  // all catalogue prices are very close to one another. RTP can therefore be
  // slightly below 88% for such a pool, but it can never become a guaranteed
  // break-even / profit case.
  cost = Math.max(cost, minimumRiskPrice);

  // The chance table changes in steps, so the 88% target can drift after
  // cent rounding. Close the loop against the actual final probabilities and
  // require a visible house edge even in sparse themed pools.
  for (let attempt = 0; attempt < 16; attempt++) {
    const expectedValue = getExpectedValue(cost);
    if (expectedValue / cost <= CASE_MAX_RETURN_RATE) break;
    cost = Math.max(minimumRiskPrice, roundPc(Math.max(cost + 0.01, expectedValue / CASE_MAX_RETURN_RATE)));
  }

  if (_caseCostCache.size >= 30) _caseCostCache.clear();
  const adjustedCost = roundPc(cost * multiplier);
  _caseCostCache.set(cacheKey, adjustedCost);
  return adjustedCost;
}

function getCaseSkinPool(caseType) {
  const cfg = resolveCaseConfig(caseType);

  const cacheKey = `${caseType === 'free' ? 'free' : cfg.id}:${CS2_SKINS.length}`;
  const cached = _casePoolCache.get(cacheKey);
  if (cached) return cached;

  const sampleByPrice = (items, limit) => {
    const sorted = [...items].sort((a, b) => verifiedMarketPriceForWear(a) - verifiedMarketPriceForWear(b));
    if (sorted.length <= limit) return sorted;
    return Array.from({ length: limit }, (_, index) => {
      const position = Math.round(index * (sorted.length - 1) / (limit - 1));
      return sorted[position];
    });
  };

  const candidates = caseType === 'free' ? getFreeCaseCatalogCandidates() : getCaseCatalogCandidates(cfg.id);
  const themed = candidates.filter(skin => verifiedMarketPriceForWear(skin) > 0);

  // A case may only contain skins matching its declared theme. Adding the
  // global cheap pool here was why knives, gloves and weapon cases looked the
  // same. Price tiers below now provide the loss/win balance inside each pool.
  const pool = sampleByPrice(themed, 180)
    .map(skin => ({ ...skin, basePrice: verifiedMarketPriceForWear(skin), marketPrice: verifiedMarketPriceForWear(skin), price: verifiedMarketPriceForWear(skin) }))
    .sort((a, b) => b.price - a.price);
  _casePoolCache.set(cacheKey, pool);
  return pool;
}

function getCaseWishlistMatches(caseType) {
  const favoriteKeys = new Set(Array.isArray(gameState?.favorites) ? gameState.favorites.map(String) : []);
  if (!favoriteKeys.size) return [];
  return getCaseSkinPool(caseType).filter(skin => favoriteKeys.has(getSkinKey(skin)));
}

function renderCaseWishlistSignal(caseType) {
  const root = document.getElementById('caseDetailsWishlist');
  if (!root) return;
  const matches = getCaseWishlistMatches(caseType);
  if (!matches.length) {
    root.innerHTML = '';
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  const shown = matches.slice(0, 4);
  const suffix = matches.length > shown.length ? `<span class="case-wishlist-more">+${matches.length - shown.length}</span>` : '';
  root.innerHTML = `<div><p><i class="fa-solid fa-heart"></i> ЦІЛІ В ЦЬОМУ КЕЙСІ</p><strong>Зі списку бажаного: ${matches.length}</strong></div><div class="case-wishlist-items">${shown.map(skin => `<span title="${escapeHtml(skin.name)}"><img src="${escapeHtml(getSkinImageSrc(skin))}" alt="" data-skin-name="${escapeHtml(skin.name)}" loading="lazy" onerror="handleSkinImageError(this)">${escapeHtml(skin.name)}</span>`).join('')}${suffix}</div>`;
}

const CASE_COLLECTION_SIZE = 5;
const CASE_COLLECTION_SAMPLE_RATIOS = Object.freeze([0.9, 0.74, 0.58, 0.42, 0.22]);
const CASE_COLLECTION_XP_REWARD = 120;

function getCaseCollectionEntries(caseType) {
  const cfg = resolveCaseConfig(caseType);
  const pool = getCaseSkinPool(cfg.id);
  if (pool.length < CASE_COLLECTION_SIZE) return [];

  // A passport is a fixed, readable selection from this exact case, not a
  // separate reward pool. The positions are spread through the price-sorted
  // catalogue so every collection has a clear progression from accessible to
  // premium without changing the drop table.
  const entries = [];
  const seen = new Set();
  const add = skin => {
    if (!skin) return;
    const key = getSkinKey(skin) || normalizeSkinName(skin.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    entries.push(skin);
  };

  CASE_COLLECTION_SAMPLE_RATIOS.forEach(ratio => {
    add(pool[Math.round((pool.length - 1) * ratio)]);
  });

  // Very small themed catalogues can round two ratios onto the same skin.
  // Fill those gaps deterministically instead of rerolling the collection.
  for (const skin of pool) {
    if (entries.length >= CASE_COLLECTION_SIZE) break;
    add(skin);
  }
  return entries.slice(0, CASE_COLLECTION_SIZE);
}

function getCaseCollectionProgress(caseType) {
  const cfg = resolveCaseConfig(caseType);
  const items = getCaseCollectionEntries(cfg.id);
  const ownedKeys = new Set(userInventory.map(item => getSkinKey(item) || normalizeSkinName(item?.name)).filter(Boolean));
  const count = items.reduce((total, skin) => {
    const key = getSkinKey(skin) || normalizeSkinName(skin?.name);
    return total + (key && ownedKeys.has(key) ? 1 : 0);
  }, 0);
  const trophies = gameState?.caseCollectionTrophies && typeof gameState.caseCollectionTrophies === 'object'
    ? gameState.caseCollectionTrophies
    : {};
  const claimed = Boolean(trophies[cfg.id]);
  const total = items.length;
  return { cfg, items, count: Math.min(count, total), total, complete: total === CASE_COLLECTION_SIZE && count >= total, claimed };
}

function getCaseCollectionTrophyCount() {
  const trophies = gameState?.caseCollectionTrophies;
  return trophies && typeof trophies === 'object' ? Object.keys(trophies).length : 0;
}

function renderCaseCollectionPassport(caseType) {
  const root = document.getElementById('caseDetailsCollection');
  if (!root) return;

  const progress = getCaseCollectionProgress(caseType);
  if (!progress.total) {
    root.innerHTML = '';
    root.classList.add('hidden');
    return;
  }

  const ownedKeys = new Set(userInventory.map(item => getSkinKey(item) || normalizeSkinName(item?.name)).filter(Boolean));
  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="case-collection-passport-head">
      <div>
        <p><i class="fa-solid fa-book-atlas"></i> ПАСПОРТ КОЛЕКЦІЇ</p>
        <strong>${progress.count} / ${progress.total} предметів</strong>
      </div>
      <span class="${progress.claimed ? 'is-claimed' : ''}">${progress.claimed ? '<i class="fa-solid fa-trophy"></i> Трофей отримано' : `Нагорода: +${CASE_COLLECTION_XP_REWARD} XP`}</span>
    </div>
    <div class="case-collection-progress"><i style="width:${Math.max(0, Math.min(100, progress.count / progress.total * 100))}%"></i></div>
    <div class="case-collection-cards">
      ${progress.items.map(skin => {
        const key = getSkinKey(skin) || normalizeSkinName(skin.name);
        const owned = ownedKeys.has(key);
        return `<div class="case-collection-card ${owned ? 'is-owned' : ''}">
          <div class="case-collection-card-state"><i class="fa-solid ${owned ? 'fa-check' : 'fa-lock'}"></i>${owned ? 'Є' : 'Не знайдено'}</div>
          <img src="${escapeHtml(getSkinImageSrc(skin))}" alt="" data-skin-name="${escapeHtml(skin.name)}" loading="lazy" onerror="handleSkinImageError(this)">
          <strong title="${escapeHtml(skin.name)}">${escapeHtml(skin.name)}</strong>
          <small>${formatCredits(skin.price)}</small>
        </div>`;
      }).join('')}
    </div>
    <div class="case-collection-passport-foot">
      ${progress.claimed
        ? '<span><i class="fa-solid fa-shield-heart"></i> Трофей збережено у профілі. PC не нараховуються.</span>'
        : progress.complete
          ? `<button type="button" onclick="claimCaseCollectionTrophy('${escapeHtml(progress.cfg.id)}')"><i class="fa-solid fa-trophy"></i> Забрати трофей · +${CASE_COLLECTION_XP_REWARD} XP</button>`
          : '<span><i class="fa-solid fa-compass"></i> Відкривай саме цей кейс, щоб зібрати набір.</span>'}
    </div>
  `;
}

function claimCaseCollectionTrophy(caseType) {
  if (!gameState) return;
  const progress = getCaseCollectionProgress(caseType);
  if (!progress.complete) {
    showToast('Спершу зберіть усі 5 предметів паспорта.', 'warn');
    return;
  }
  if (progress.claimed) {
    showToast('Трофей цієї колекції вже отримано.', 'info');
    return;
  }
  if (!gameState.caseCollectionTrophies || typeof gameState.caseCollectionTrophies !== 'object') {
    gameState.caseCollectionTrophies = {};
  }
  gameState.caseCollectionTrophies[progress.cfg.id] = Date.now();
  addXp(CASE_COLLECTION_XP_REWARD);
  saveState();
  renderCaseCollectionPassport(progress.cfg.id);
  renderCaseCatalog();
  renderProfileProgress();
  showToast(`Колекцію «${progress.cfg.name}» завершено: трофей і +${CASE_COLLECTION_XP_REWARD} XP.`, 'success');
}

const _dropChanceCache = new Map();
const _caseMetricsCache = new Map();
function buildCaseDropChanceMap(pool, caseCost) {
  if (!pool.length || !caseCost) return new Map();
  // 58% clear loss, 25% close loss, 12% around break-even, 3.5% profit,
  // 1% premium and 0.5% jackpot (before unavailable-tier rollover).
  // Each pool uses these same transparent value bands, so a themed case can
  // lose, return its cost, or land a genuine rare win without foreign filler.
  const tierWeights = [58, 25, 12, 3.5, 1, 0.5];
  const buckets = Array.from({ length: tierWeights.length }, () => []);
  const tierFor = price => {
    const ratio = Math.max(0, Number(price) || 0) / caseCost;
    if (ratio <= 0.45) return 0;
    if (ratio <= 0.85) return 1;
    if (ratio <= 1.5) return 2;
    if (ratio <= 3) return 3;
    if (ratio <= 7) return 4;
    return 5;
  };
  pool.forEach(item => buckets[tierFor(item.price)].push(item));

  // Keep the intended return profile even when a small catalog has no item in
  // one of the tiers. Missing probability flows to the closest cheaper tier
  // (or, for the cheapest missing tier, to the next available tier) instead
  // of making every remaining item disproportionately valuable.
  const effectiveTierWeights = [...tierWeights];
  buckets.forEach((bucket, index) => {
    if (bucket.length) return;
    let target = -1;
    for (let next = index + 1; next < buckets.length; next++) {
      if (buckets[next].length) { target = next; break; }
    }
    if (target < 0) {
      for (let previous = index - 1; previous >= 0; previous--) {
        if (buckets[previous].length) { target = previous; break; }
      }
    }
    if (target >= 0) {
      effectiveTierWeights[target] += effectiveTierWeights[index];
      effectiveTierWeights[index] = 0;
    }
  });

  const activeWeight = effectiveTierWeights.reduce((sum, weight) => sum + weight, 0);
  const result = new Map();
  if (activeWeight > 0) {
    buckets.forEach((bucket, index) => {
      if (!bucket.length) return;
      const raw = bucket.map(item => 1 / Math.pow(Math.max(1, Number(item.price) || 1), 0.22));
      const rawSum = raw.reduce((sum, weight) => sum + weight, 0);
      bucket.forEach((item, itemIndex) => {
        result.set(getSkinKey(item), (effectiveTierWeights[index] / activeWeight) * (raw[itemIndex] / rawSum) * 100);
      });
    });
  }

  return result;
}

function _buildDropChanceMap(caseType) {
  const cfg = resolveCaseConfig(caseType);
  const cacheKey = `${cfg.id}:${CS2_SKINS.length}`;
  if (_dropChanceCache.has(cacheKey)) return _dropChanceCache.get(cacheKey);

  const pool = getCaseSkinPool(cfg.id);
  const caseCost = getCaseCost(cfg.id);
  const result = buildCaseDropChanceMap(pool, caseCost);
  if (_dropChanceCache.size >= 30) _dropChanceCache.clear();
  _dropChanceCache.set(cacheKey, result);
  return result;
}

function getItemDropChance(item, caseType) {
  const map = _buildDropChanceMap(caseType);
  return map.get(getSkinKey(item)) || 0;
}

function formatCaseChance(value) {
  const chance = Math.max(0, Number(value) || 0);
  return chance < 0.1 ? `${chance.toFixed(3)}%` : `${chance.toFixed(2)}%`;
}

function getCaseMetrics(caseType) {
  const cfg = resolveCaseConfig(caseType);

  const cacheKey = `${cfg.id}:${CS2_SKINS.length}`;
  const cached = _caseMetricsCache.get(cacheKey);
  if (cached) return cached;

  const pool = getCaseSkinPool(cfg.id);
  const cost = getCaseCost(cfg.id);
  if (!cost) return { count: pool.length, breakEvenChance: 0, lossChance: 0, rareChance: 0, expectedValue: 0, returnRate: 0, maxValue: 0 };
  let breakEvenChance = 0;
  let rareChance = 0;
  let expectedValue = 0;

  pool.forEach(item => {
    const chance = getItemDropChance(item, cfg.id);
    const price = Math.max(0, Number(item.price) || 0);
    expectedValue += price * chance / 100;
    if (price >= cost) breakEvenChance += chance;
    if (price >= cost * 3) rareChance += chance;
  });

  const result = {
    count: pool.length,
    breakEvenChance,
    lossChance: Math.max(0, 100 - breakEvenChance),
    rareChance,
    expectedValue,
    returnRate: expectedValue / cost,
    maxValue: pool.reduce((max, item) => Math.max(max, Number(item.price) || 0), 0)
  };
  _caseMetricsCache.set(cacheKey, result);
  return result;
}

function pickCaseSkin(poolType = 'regular', caseType = 'budget_covert', fixedRoll = Math.random()) {
  const normalizedRoll = clampNumber(fixedRoll, 0, 0.999999999, Math.random());

  if (poolType === 'free') {
    const pool = getCaseSkinPool('free');
    if (!pool.length) return null;
    // Free drops stay inside the lowest fixed catalogue tier. The old
    // USD-cent thresholds would otherwise make every stable item look premium.
    const costCap = 6;
    const cheapOnly = pool.filter(s => (s.price || 0) <= costCap);
    const available = cheapOnly.length ? cheapOnly : pool;
    const freeTiers = [
      available.filter(s => (s.price || 0) <= 4.5),
      available.filter(s => (s.price || 0) > 4.5 && (s.price || 0) <= 5.5),
      available.filter(s => (s.price || 0) > 5.5)
    ];
    const weights = [75, 22, 3];
    const total = freeTiers.reduce((sum, tier, index) => sum + (tier.length ? weights[index] : 0), 0);
    let roll = normalizedRoll * total;
    for (let index = 0; index < freeTiers.length; index++) {
      if (!freeTiers[index].length) continue;
      if (roll < weights[index]) {
        const itemIndex = Math.min(freeTiers[index].length - 1, Math.floor((roll / weights[index]) * freeTiers[index].length));
        return freeTiers[index][itemIndex];
      }
      roll -= weights[index];
    }
    return available[0];
  }

  const pool = getCaseSkinPool(caseType);
  if (!pool.length) return null;

  const chances = pool.map(s => getItemDropChance(s, caseType));
  const total = chances.reduce((a, b) => a + b, 0);
  let roll = normalizedRoll * total;
  for (let i = 0; i < pool.length; i++) {
    if (roll < chances[i]) return pool[i];
    roll -= chances[i];
  }
  return pool[pool.length - 1];
}

function setCaseCategory(cat) {
  currentCaseCategory = cat;
  document.querySelectorAll('#caseCategoryBar .case-cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${cat}'`));
  });
  renderCaseCatalog();
}

function getCasePreviewItems(caseType, count = 4) {
  const pool = getCaseSkinPool(caseType);
  if (!pool.length) return [];
  return pool.slice(0, count);
}

function renderCaseCatalog() {
  const grid = document.getElementById('casesCatalogGrid');
  if (!grid) return;

  // Keep the page responsive during the first compact catalogue fetch. The
  // previous starter list did not contain each theme and produced a misleading
  // "catalog unavailable" warning on otherwise healthy connections.
  if (currentPage === 'case' && !completeSkinCatalogReady) {
    void loadCompleteSkinCatalog();
    grid.innerHTML = `<div class="col-span-full rounded-2xl border border-cyan-400/25 bg-cyan-500/5 px-5 py-10 text-center">
      <i class="fa-solid fa-boxes-stacked mb-3 text-3xl text-cyan-300 animate-pulse"></i>
      <p class="font-heading text-xl font-extrabold uppercase tracking-wide text-white">Готуємо каталоги кейсів</p>
      <p class="mt-2 text-sm text-slate-400">Завантажуємо компактний склад без блокування гри…</p>
    </div>`;
    return;
  }

  if (!isRuntimeFeatureEnabled('cases')) {
    grid.innerHTML = '<div class="col-span-full rounded-2xl border border-slate-700 bg-slate-900/40 px-5 py-10 text-center"><i class="fa-solid fa-eye-slash mb-3 text-3xl text-slate-400"></i><p class="font-heading text-xl font-extrabold uppercase tracking-wide text-white">Каталог тимчасово приховано</p><p class="mt-2 text-sm text-slate-400">Повернися пізніше — команда готує новий контент.</p></div>';
    return;
  }

  const validEntries = getVisibleCaseEntries();
  const isCollectionView = currentCaseCategory === 'collections';
  const filtered = validEntries.filter(([id, c]) => {
    if (currentCaseCategory === 'all' || isCollectionView) return true;
    return c.category === currentCaseCategory;
  });

  const totalTrophies = getCaseCollectionTrophyCount();
  const collectionIntro = isCollectionView ? `
    <div class="case-collection-catalog-intro col-span-full">
      <div><p><i class="fa-solid fa-book-atlas"></i> КОЛЕКЦІЇ КЕЙСІВ</p><strong>Збери по 5 фіксованих скінів з кожного кейса</strong><small>Паспорт не змінює шанси або ціни. За повний набір — один трофей і +${CASE_COLLECTION_XP_REWARD} XP, без PC.</small></div>
      <b><i class="fa-solid fa-trophy"></i> ${totalTrophies} / ${filtered.length || 0}</b>
    </div>` : '';

  grid.innerHTML = `${collectionIntro}${filtered.map(([id, c], index) => {
    const previews = getPerformanceMode() === 'lite' ? [] : getCasePreviewItems(id, 4);
    const metrics = getCaseMetrics(id);
    const caseCost = getCaseCost(id);
    const collection = getCaseCollectionProgress(id);
    const wishlistMatches = getCaseWishlistMatches(id);
    const collectionMarkup = collection.total
      ? `<span class="${collection.claimed ? 'is-complete' : ''}" title="Збери 5 обраних скінів цього кейса"><i class="fa-solid ${collection.claimed ? 'fa-trophy' : 'fa-book-atlas'}"></i>${collection.claimed ? 'Трофей' : `${collection.count}/${collection.total} колекція`}</span>`
      : '';
    const wishlistMarkup = wishlistMatches.length
      ? `<span class="is-wishlist" title="У цьому кейсі є ${wishlistMatches.length} скіни з твого списку бажаного"><i class="fa-solid fa-heart"></i>${wishlistMatches.length} з бажаного</span>`
      : '';
    const costMarkup = caseCost
      ? `<i class="fa-solid fa-coins text-amber-400 text-xs"></i><span class="font-extrabold text-sm text-amber-300">${formatCredits(caseCost)}</span>`
      : '<i class="fa-solid fa-triangle-exclamation text-amber-300 text-xs"></i><span class="font-extrabold text-[10px] text-amber-200">Каталог кейса недоступний</span>';
    return `
      <div class="case-catalog-card tier-${c.category || 'hot'} group">
        <span class="case-catalog-badge ${c.badgeClass || 'badge-hot'}">${c.badge || 'HOT'}</span>
        <span class="case-catalog-serial" aria-label="Номер кейсу">CASE // ${String(index + 1).padStart(2, '0')}</span>
        
        <!-- Top Preview Strip -->
        ${previews.length ? `<div class="case-catalog-preview-strip">
          ${previews.map(s => `
            <div class="case-catalog-preview-item" title="${escapeHtml(s.name)} · ${formatCredits(s.price)} · стабільний каталог">
              <img src="${escapeHtml(getSkinImageSrc(s))}" alt="" data-skin-name="${escapeHtml(s.name)}" decoding="async" onerror="handleSkinImageError(this)">
            </div>
          `).join('')}
        </div>` : ''}

        <!-- 3D Case Preview -->
        <div class="p-5 flex flex-col items-center justify-center text-center cursor-pointer" onclick="openPowerCase('${id}')">
          <div class="w-28 h-28 sm:w-32 sm:h-32 case-preview-svg group-hover:scale-105 transition-transform duration-300">
            ${createCaseArtwork(id, c.name, c.theme, c.artwork)}
          </div>
          <h3 class="font-heading mt-3 text-2xl font-black uppercase text-white tracking-wider truncate w-full group-hover:text-amber-300 transition-colors">${c.name}</h3>
          <p class="text-[11px] text-gray-400 truncate w-full mt-0.5">${c.desc}</p>
          <div class="mt-3 px-3 py-1 rounded-lg bg-black/40 border border-amber-500/30 flex items-center gap-1.5 shadow-inner">
            ${costMarkup}
          </div>
          <div class="case-catalog-metrics" aria-label="Показники кейсу">
            <span title="Кількість предметів у кейсі"><i class="fa-solid fa-layer-group"></i>${metrics.count} скінів</span>
            <span title="Очікувана вартість дропу до продажу"><i class="fa-solid fa-scale-balanced"></i>${caseCost ? `RTP ${(metrics.returnRate * 100).toFixed(0)}%` : 'Каталог недоступний'}</span>
            <span title="Шанс отримати предмет дешевше ціни кейсу; у кожному платному кейсі він існує"><i class="fa-solid fa-shield-halved"></i>${caseCost ? `Ризик ${formatCaseChance(metrics.lossChance)}` : '—'}</span>
            ${collectionMarkup}
            ${wishlistMarkup}
          </div>
        </div>

        <!-- Action Bar -->
        <div class="grid grid-cols-5 gap-1.5 p-3 pt-0 mt-auto">
          <button onclick="openPowerCase('${id}')" class="col-span-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10">
            <i class="fa-solid fa-box-open"></i> Відкрити
          </button>
          <button onclick="showCaseDetails('${id}')" class="col-span-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-gray-400 hover:text-amber-300 transition flex items-center justify-center text-xs" title="Вміст кейсу та шанси">
            <i class="fa-solid fa-circle-info"></i>
          </button>
        </div>
      </div>
    `;
  }).join('')}`;
}

function renderCaseButtons() {
  renderCaseCatalog();
}

function setCaseMultiplier(mult) {
  caseMultiplier = Math.max(1, Math.min(5, Number(mult) || 1));
  window.caseMultiplier = caseMultiplier;
  document.querySelectorAll('#caseMultiSelector button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.mult) === caseMultiplier);
  });
  updateCaseCostDisplay();
}

function setCaseTicketMode(enabled) {
  const isPaidCase = window.__caseType === 'paid';
  useCaseTicket = Boolean(enabled) && isPaidCase && getCaseTicketCount() >= caseMultiplier;
  updateCaseCostDisplay();
}

function updateCaseTicketOption() {
  const isPaidCase = window.__caseType === 'paid';
  const ticketCount = getCaseTicketCount();
  const requiredTickets = Math.max(1, caseMultiplier);
  const canUseTickets = isPaidCase && ticketCount >= requiredTickets;
  const wrap = document.getElementById('caseTicketToggleWrap');
  const divider = document.getElementById('caseTicketDivider');
  const toggle = document.getElementById('caseTicketToggle');
  const count = document.getElementById('caseTicketCount');
  if (count) count.textContent = ticketCount ? `${ticketCount}/${requiredTickets}` : '0';
  if (wrap) wrap.classList.toggle('hidden', !isPaidCase || !ticketCount);
  if (divider) divider.classList.toggle('hidden', !isPaidCase || !ticketCount);
  if (!canUseTickets) useCaseTicket = false;
  if (toggle) {
    toggle.disabled = !canUseTickets;
    toggle.checked = canUseTickets && useCaseTicket;
    toggle.title = canUseTickets
      ? `Використати ${requiredTickets} шт. замість PC`
      : `Для ${caseMultiplier}x потрібно ${requiredTickets} шт.`;
  }
}

function updateCaseCostDisplay() {
  const isFree = window.__caseType === 'free';
  updateCaseTicketOption();
  const ticketOpen = !isFree && useCaseTicket;
  const unitCost = isFree ? 0 : getCaseCost(currentActiveCaseId);
  const cost = isFree || ticketOpen ? 0 : (unitCost * caseMultiplier);
  const totalEl = document.getElementById('caseReelTotalCost');
  if (totalEl) totalEl.textContent = ticketOpen ? `Потужний квиток ×${caseMultiplier}` : unitCost ? `${formatCredits(cost)}` : 'Каталог недоступний';
  const costSummary = document.getElementById('caseReelCostSummary');
  if (costSummary) costSummary.classList.toggle('hidden', isFree);
}

async function openPowerCase(caseType = 'budget_covert') {
  if (caseType !== 'free' && !isRuntimeCaseVisible(caseType)) {
    showToast('Цей кейс зараз приховано адміністрацією.', 'info');
    return;
  }
  const cfg = resolveCaseConfig(caseType);

  const seasonalStatus = cfg.seasonal ? getSeasonalEventStatus(cfg.seasonal) : null;
  if (cfg.seasonal && !seasonalStatus?.scheduledActive) {
    const previewLabel = cfg.seasonal === WINTER_EVENT.id ? 'ICEWIRE Cache' : 'Нічний кейс';
    showToast(seasonalStatus?.preview ? `${previewLabel} показано в перегляді, але до старту події не відкривається.` : 'Цей сезонний кейс зараз закритий.', 'warn');
    return;
  }

  if (!currentUser || !gameState || isCaseOpening || isFreeCaseOpening || isRolling || pendingWager) return;

  // Never replace a knife or glove pool with unrelated filler while the rich
  // catalogue is still arriving. This keeps every case true to its theme.
  let pool = getCaseSkinPool(cfg.id);
  if (pool.length < 8 && !completeSkinCatalogReady) {
    void loadCompleteSkinCatalog();
    showToast('Готуємо повний тематичний склад кейса…', 'info');
    return;
  }
  if (pool.length < 8) {
    showToast('Оновлюємо стабільний каталог цього кейса…', 'info');
    const ready = await ensureCaseMarketPrices(cfg.id);
    pool = getCaseSkinPool(cfg.id);
    if (!ready || pool.length < 8) {
      showToast('Стабільний каталог для цього кейса зараз недоступний. Баланс не списано.', 'warn');
      return;
    }
  }
  if (!pool.length) {
    showToast('Для цього кейса тимчасово немає доступного каталогу.', 'warn');
    return;
  }

  currentActiveCaseId = cfg.id;
  window.__caseType = 'paid';
  window.__caseName = cfg.name;
  useCaseTicket = false;

  const title = document.getElementById('caseReelTitle');
  if (title) title.textContent = `${cfg.name}`;
  const sub = document.getElementById('caseReelSubtitle');
  const caseCost = getCaseCost(cfg.id);
  if (!caseCost) {
    showToast('Не вдалося підтвердити ціну кейса через Steam.', 'warn');
    return;
  }
  if (sub) sub.textContent = `Стабільна ціна кейса: ${formatCredits(caseCost)}`;

  // Show multi-selector for paid cases
  const multiBox = document.getElementById('caseMultiSelector')?.parentElement;
  if (multiBox) multiBox.classList.remove('hidden');

  setCaseMultiplier(caseMultiplier || 1);
  if (soundEnabled) primeCaseReelSound();
  buildSingleReelTrack('caseReelTrack', pickCaseSkin('regular', currentActiveCaseId));

  const status = document.getElementById('caseReelStatus');
  if (status) status.textContent = 'Готуємось…';
  const btn = document.getElementById('caseReelBtn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play mr-2"></i>ВІДКРИТИ КЕЙС';
  }

  openModal('caseReelModal');
}

function getFreeCaseLastAt() {
  return parseInt(localStorage.getItem(STORAGE.freeCase) || '0', 10);
}

function getFreeCaseLeft() {
  return Math.max(0, FREE_CASE_COOLDOWN - (Date.now() - getFreeCaseLastAt()));
}

function updateFreeCaseBtn() {
  const btn = document.getElementById('freeCaseBtn');
  const status = document.getElementById('freeCaseStatus');
  if (!btn || !status) return;
  const left = getFreeCaseLeft();
  if (left > 0) {
    btn.disabled = true;
    btn.textContent = 'Зачекай';
    const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
    status.textContent = `Наступний через ${h}г ${m}хв`;
  } else {
    btn.disabled = false;
    btn.textContent = 'Забрати';
    status.textContent = 'Раз на 24 години · фіксований стабільний каталог';
  }
}

async function openFreeDailyCase() {
  if (!currentUser || !gameState || isFreeCaseOpening || isRolling || isCaseOpening || pendingWager) return;
  if (getFreeCaseLeft() > 0) {
    showToast('Безкоштовний кейс ще недоступний', 'warn');
    return;
  }
  if (getCaseSkinPool('free').length < 8) {
    showToast('Оновлюємо стабільний каталог безкоштовного кейса…', 'info');
    const ready = await ensureCaseMarketPrices('free');
    if (!ready || getCaseSkinPool('free').length < 8) {
      showToast('Стабільний каталог безкоштовного кейса зараз недоступний.', 'warn');
      return;
    }
  }

  currentActiveCaseId = 'free';
  window.__caseType = 'free';
  window.__caseName = 'Безкоштовний щоденний кейс';
  useCaseTicket = false;

  const title = document.getElementById('caseReelTitle');
  if (title) title.textContent = 'Безкоштовний кейс';
  const sub = document.getElementById('caseReelSubtitle');
  if (sub) sub.textContent = 'Раз на 24 години · низькі фіксовані ціни';

  // Hide multi selector for free daily case
  const multiBox = document.getElementById('caseMultiSelector')?.parentElement;
  if (multiBox) multiBox.classList.add('hidden');

  setCaseMultiplier(1);
  if (soundEnabled) primeCaseReelSound();
  buildSingleReelTrack('caseReelTrack', pickCaseSkin('free'));

  const status = document.getElementById('caseReelStatus');
  if (status) status.textContent = 'Готуємось…';
  const btn = document.getElementById('caseReelBtn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play mr-2"></i>ВІДКРИТИ КЕЙС';
  }

  openModal('caseReelModal');
}

function pickCaseReelDisplaySkin(pool, caseType) {
  const chances = pool.map(s => getItemDropChance(s, caseType));
  const total = chances.reduce((sum, chance) => sum + chance, 0);
  if (!total) return pool[Math.floor(Math.random() * pool.length)];
  let roll = Math.random() * total;
  for (let index = 0; index < pool.length; index++) {
    if (roll < chances[index]) return pool[index];
    roll -= chances[index];
  }
  return pool[pool.length - 1];
}

function buildSingleReelTrack(trackId, winner, config = getCaseReelConfig()) {
  const track = document.getElementById(trackId);
  if (!track) return { ...config, cardWidth: 132, gap: 10 };

  const items = [];
  const { cards, winnerIndex } = config;
  const pool = getCaseSkinPool(currentActiveCaseId);
  const fallback = pool.length ? pool : CS2_SKINS;

  for (let i = 0; i < cards; i++) {
    if (i === winnerIndex) {
      items.push({ ...winner, wear: winner?.wear || WEAR_TIERS[2] });
      continue;
    }
    const s = pickCaseReelDisplaySkin(fallback, currentActiveCaseId);
    items.push({ ...s, wear: WEAR_TIERS[2] });
  }

  track.innerHTML = items.map(it => {
    const image = getSkinImageSrc(it);
    const rarity = getItemRarity(it);
    return `
    <div class="case-reel-card rarity-surface" style="--rarity-color:${rarity.color}">
      <img src="${escapeHtml(image)}" alt="" data-skin-name="${escapeHtml(it.name)}" loading="eager" decoding="async" onerror="handleSkinImageError(this)">
      <p>${escapeHtml(it.name.split('|').pop().trim().slice(0, 18))}</p>
      <p class="text-[10px] font-extrabold text-amber-300">${formatCredits(it.price || 0)}</p>
      ${rarityStripMarkup(rarity, 'case-reel-rarity')}
    </div>
  `;
  }).join('');

  return { ...config, cardWidth: 132, gap: 10 };
}

function getCaseReelTarget(track, reelWindow, winnerIndex, fallbackCardWidth = 132, fallbackGap = 10) {
  const card = track?.querySelector('.case-reel-card');
  const trackStyle = track ? getComputedStyle(track) : null;
  const cardWidth = card?.getBoundingClientRect().width || fallbackCardWidth;
  const gap = Number.parseFloat(trackStyle?.columnGap || trackStyle?.gap || '') || fallbackGap;
  const paddingLeft = Number.parseFloat(trackStyle?.paddingLeft || '') || 0;
  const windowWidth = reelWindow?.getBoundingClientRect().width || Math.max(280, document.documentElement.clientWidth - 48);
  return Math.round((windowWidth - cardWidth) / 2 - paddingLeft - winnerIndex * (cardWidth + gap));
}

function playCaseReels(reels, wrapper, onStart) {
  return new Promise(resolve => {
    if (!reels.length) return resolve();
    // Keep the well-tested CSS transition mechanics, but explicitly protect
    // this game animation from a global reduced-motion CSS reset. The result
    // is released by transitionend, with a timer only as a browser fallback.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      void wrapper?.offsetWidth;
      onStart?.();
      let pending = reels.length;
      const complete = () => {
        pending -= 1;
        if (pending === 0) resolve();
      };
      reels.forEach(reel => {
        const targetX = getCaseReelTarget(reel.track, reel.reelWindow, reel.winnerIndex, reel.cardWidth, reel.gap);
        const target = `translate3d(${targetX}px, 0, 0)`;
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          reel.track.removeEventListener('transitionend', onTransitionEnd);
          complete();
        };
        const onTransitionEnd = event => {
          if (event.target === reel.track && event.propertyName === 'transform') finish();
        };
        reel.track.addEventListener('transitionend', onTransitionEnd);
        reel.track.style.setProperty('transition-property', 'transform', 'important');
        reel.track.style.setProperty('transition-duration', `${reel.duration}ms`, 'important');
        reel.track.style.setProperty('transition-timing-function', 'cubic-bezier(.12,.72,.16,1)', 'important');
        reel.track.style.transform = target;
        window.setTimeout(finish, reel.duration + 400);
      });
    }));
  });
}

async function startCaseReel() {
  const btn = document.getElementById('caseReelBtn');
  if (btn?.disabled || isCaseOpening || isFreeCaseOpening || pendingWager) return;
  if (hasSteamIdentity() && !hasReadySteamAccount()) {
    showToast('Підключаємо Steam-збереження. Зачекай кілька секунд перед відкриттям кейсу.', 'info');
    return;
  }

  const isFree = window.__caseType === 'free';
  const mult = isFree ? 1 : caseMultiplier;
  const cfg = resolveCaseConfig(currentActiveCaseId);
  const ticketOpen = !isFree && useCaseTicket;
  const ticketsSpent = ticketOpen ? mult : 0;
  const unitCost = isFree ? 0 : getCaseCost(currentActiveCaseId);
  if (!isFree && !ticketOpen && !unitCost) {
    showToast('Стабільний каталог ще завантажується. Спробуй за мить.', 'info');
    return;
  }
  const totalCost = isFree || ticketOpen ? 0 : (unitCost * mult);
  const previousFreeCaseAt = isFree ? getFreeCaseLastAt() : 0;
  const isFast = document.getElementById('caseFastOpenToggle')?.checked;

  if (isFree) {
    if (getFreeCaseLeft() > 0) {
      showToast('Безкоштовний кейс ще недоступний', 'warn');
      closeModal('caseReelModal');
      return;
    }
  } else if (ticketOpen) {
    if (getCaseTicketCount() < ticketsSpent) {
      useCaseTicket = false;
      updateCaseCostDisplay();
      showToast('Потужних квитків недостатньо для цього прокруту.', 'warn');
      return;
    }
  } else {
    if (currentUser.balance < totalCost) {
      showToast(`Потрібно ${formatCredits(totalCost)}`, 'warn');
      return;
    }
  }

  isCaseOpening = !isFree;
  isFreeCaseOpening = isFree;

  // Deduct balance or trigger cooldown
  if (isFree) {
    localStorage.setItem(STORAGE.freeCase, String(Date.now()));
    updateFreeCaseBtn();
  } else if (ticketOpen) {
    gameState.caseTickets = getCaseTicketCount() - ticketsSpent;
    useCaseTicket = false;
    updateCaseCostDisplay();
  } else {
    currentUser.balance -= totalCost;
    updateBalanceUI();
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>ОБЕРТАННЯ…';
  }

  // Unlock the player from the direct click. The actual soundtrack begins in
  // the same frame as the reel after the server-confirmed roll is ready.
  if (!isFast) unlockCaseReelSound();

  const restorePendingCaseOpen = () => {
    stopCaseReelSound();
    isCaseOpening = false;
    isFreeCaseOpening = false;
    if (!isFree) {
      if (ticketOpen) {
        gameState.caseTickets = getCaseTicketCount() + ticketsSpent;
        useCaseTicket = true;
        updateCaseCostDisplay();
      } else {
        currentUser.balance += totalCost;
        updateBalanceUI();
      }
    } else if (previousFreeCaseAt > 0) {
      localStorage.setItem(STORAGE.freeCase, String(previousFreeCaseAt));
    } else {
      localStorage.removeItem(STORAGE.freeCase);
    }
    updateFreeCaseBtn();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-play mr-2"></i>ВІДКРИТИ КЕЙС';
    }
  };

  const fairStatus = document.getElementById('caseReelStatus');
  if (fairStatus) fairStatus.textContent = 'Фіксуємо перевірюваний seed…';
  let fairRolls;
  try {
    fairRolls = await getCaseRolls(currentActiveCaseId, mult);
  } catch (error) {
    restorePendingCaseOpen();
    if (fairStatus) fairStatus.textContent = 'Серверний раунд недоступний — баланс відновлено.';
    showToast('Не вдалося підтвердити розіграш. Спробуй ще раз — баланс відновлено.', 'warn');
    return;
  }

  // Pick winners. Each skin and its wear now come from one server HMAC result
  // when the Cloudflare endpoint is available; local development uses the explicit fallback above.
  const winners = [];
  for (let i = 0; i < mult; i++) {
    const w = pickCaseSkin(isFree ? 'free' : 'regular', currentActiveCaseId, fairRolls.rolls[i]?.roll);
    if (w) winners.push(w);
  }
  if (winners.length !== mult) {
    restorePendingCaseOpen();
    showToast('Каталог кейсу ще завантажується. Спробуй ще раз.', 'warn');
    return;
  }

  // Create demo items and store
  const wonItems = winners.map(w => makeDemoItem(w, isFree ? '-freecase' : '-case')).filter(Boolean);
  if (wonItems.length !== mult) {
    restorePendingCaseOpen();
    showToast('Не вдалося визначити стабільну ціну дропа. Баланс відновлено.', 'warn');
    return;
  }
  wonItems.forEach(it => userInventory.push(it));
  lastWonCaseItems = wonItems;
  lastOpenedCaseId = currentActiveCaseId;

  // Update stats
  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.cases += mult;
  gameState.daily.cases += mult;
  gameState.weekly.cases = (gameState.weekly.cases || 0) + mult;
  recordPulseCircuitStep('case');
  const halloweenProgress = awardHalloweenProgress('case', mult);
  const winterShards = awardWinterShards('case', mult);
  updateAllTimeOnCase();
  wonItems.forEach(it => {
    if ((it.price || 0) >= 50000) gameState.allTime.legendaryDrops = (gameState.allTime.legendaryDrops || 0) + 1;
  });
  if (isFree) updateAllTimeOnFreeCase();
  addXp(XP_PER_CASE * mult);
  checkAchievements();
  updateBalanceUI();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  saveState({ urgentSteamAutoSync: true });
  renderGameHub();
  if (halloweenProgress.pumpkins) showToast(`Halloween: +${halloweenProgress.pumpkins} 🎃 і +${halloweenProgress.coins} 🪙 за кейс.`, 'success');
  if (winterShards) showToast(`ICEWIRE: +${winterShards} Frost Shard за контейнер.`, 'success');

  if (isFast) {
    soundCase();
    isCaseOpening = false;
    isFreeCaseOpening = false;
    displayCaseDropResult(wonItems, isFree, ticketOpen ? `${cfg.name} · Потужний квиток` : cfg.name);
    wonItems.forEach(it => addActivityEvent({ player: currentUser.name || 'Ти', skin: it, outcome: 'win', communityKind: 'case' }));
    return;
  }

  // Build tracks for multi-open
  const wrapper = document.getElementById('caseReelsWrapper');
  if (wrapper) {
    wrapper.innerHTML = wonItems.map((_, idx) => `
      <div class="case-reel-window" id="reelWindow_${idx}">
        <div class="case-reel-track" id="reelTrack_${idx}"></div>
        <div class="case-reel-pointer"></div>
      </div>
    `).join('');
  }

  // Build first, then wait for two paint frames. Measuring before the modal is
  // laid out was the source of the jumpy/off-centre reel on slower devices.
  const reelConfig = getCaseReelConfig(await waitForCaseReelSoundDuration());
  const reels = wonItems.map((winner, idx) => {
    const setup = buildSingleReelTrack(`reelTrack_${idx}`, winner, reelConfig);
    const track = document.getElementById(`reelTrack_${idx}`);
    if (track) {
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0, 0, 0)';
    }
    return { track, reelWindow: document.getElementById(`reelWindow_${idx}`), ...setup };
  }).filter(reel => reel.track);
  const reelAnimation = playCaseReels(reels, wrapper, startCaseReelSound);

  const status = document.getElementById('caseReelStatus');
  if (status) status.textContent = 'Обертається…';

  await reelAnimation;
  stopCaseReelSound();
  if (status) status.textContent = 'Готово!';
  soundCase();
  isCaseOpening = false;
  isFreeCaseOpening = false;
  displayCaseDropResult(wonItems, isFree, ticketOpen ? `${cfg.name} · Потужний квиток` : cfg.name);
  wonItems.forEach(it => addActivityEvent({ player: currentUser.name || 'Ти', skin: it, outcome: 'win', communityKind: 'case' }));
}

function displayCaseDropResult(items, isFree, caseName, resultKind = 'case') {
  closeModal('caseReelModal');
  const isCaseResult = resultKind === 'case';
  lastDropContext = isCaseResult ? 'case' : 'contract';

  const resHeader = document.getElementById('caseResultHeader');
  if (resHeader) resHeader.textContent = isFree ? 'Безкоштовний кейс' : (caseName || 'Потужний кейс');
  const resultTitle = document.getElementById('caseResultTitle');
  if (resultTitle) resultTitle.textContent = isCaseResult ? 'ВІТАЄМО З ДРОПОМ!' : 'КОНТРАКТ ВИКОНАНО!';
  const repeatButton = document.getElementById('caseRepeatBtn');
  const repeatIcon = document.getElementById('caseRepeatIcon');
  const repeatLabel = document.getElementById('caseRepeatLabel');
  if (repeatButton) repeatButton.title = isCaseResult ? 'Відкрити кейс ще раз' : 'Повернутися до контракту';
  if (repeatIcon) repeatIcon.className = isCaseResult ? 'fa-solid fa-rotate-right' : 'fa-solid fa-boxes-packing';
  if (repeatLabel) repeatLabel.textContent = isCaseResult ? 'Ще раз' : 'До контракту';

  const totalVal = items.reduce((s, it) => s + (it.price || 0), 0);
  const totalValEl = document.getElementById('caseResultTotalVal');
  if (totalValEl) totalValEl.textContent = `${formatCredits(totalVal)}`;
  const proof = document.getElementById('caseResultFairProof');
  const verified = isCaseResult && lastCaseFairAudit.length === items.length && items.length > 0;
  if (proof) {
    if (!isCaseResult) {
      proof.innerHTML = '';
      proof.className = 'hidden';
    } else {
      proof.innerHTML = verified
        ? `<i class="fa-solid fa-shield-halved mr-1 text-emerald-300"></i>Перевірюваний seed · ${escapeHtml(lastCaseFairAudit[0].day)} · hash ${escapeHtml(String(lastCaseFairAudit[0].serverSeedHash).slice(0, 10))}…`
        : '<i class="fa-solid fa-laptop-code mr-1 text-amber-300"></i>Локальний режим: серверна перевірка недоступна';
      proof.className = `mb-4 rounded-xl border px-3 py-2 text-[11px] font-bold ${verified ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`;
    }
  }

  const grid = document.getElementById('caseResultItemsGrid');
  if (grid) {
    grid.innerHTML = items.map(it => {
      const wear = getWear(it);
      const rarity = getItemRarity(it);
      return `
        <div class="case-result-card rarity-surface" style="--rarity-color:${rarity.color}">
          <div class="relative w-full flex items-center justify-center">
            <img src="${escapeHtml(getSkinImageSrc(it))}" alt="" data-skin-name="${escapeHtml(it.name)}" class="h-28 sm:h-36 object-contain my-2" decoding="async" onerror="handleSkinImageError(this)">
          </div>
          <p class="text-base font-extrabold text-white truncate w-full">${escapeHtml(it.name)}</p>
          <div class="flex items-center justify-center gap-2 mt-1">
            <span class="font-heading text-xl font-black text-amber-300">${formatCredits(it.price)}</span>
            <span class="wear-badge wear-${wear.code}">${wear.code} · ${wear.name}</span>
          </div>
          ${rarityStripMarkup(rarity, 'case-result-rarity')}
        </div>
      `;
    }).join('');
  }

  openModal('caseModal');
}

function quickSellCaseResult() {
  if (!lastWonCaseItems || !lastWonCaseItems.length) {
    closeModal('caseModal');
    return;
  }

  const itemsToSell = lastWonCaseItems.filter(verifiedInventoryMarketPrice);
  const unquoted = lastWonCaseItems.filter(item => !verifiedInventoryMarketPrice(item));
  if (!itemsToSell.length) {
    unquoted.forEach(requestInventoryMarketPrice);
    showToast('Не вдалося визначити стабільну ціну дропа. Швидкий продаж заблоковано.', 'warn');
    return;
  }
  lastWonCaseItems = unquoted;
  closeModal('caseModal');

  let totalRefund = 0;
  const idsToSell = new Set(itemsToSell.map(it => it.id));

  itemsToSell.forEach(it => {
    totalRefund += roundPc(verifiedInventoryMarketPrice(it) * SELL_RATE);
  });

  userInventory = userInventory.filter(it => !idsToSell.has(it.id));
  currentUser.balance = roundPc(currentUser.balance + totalRefund);

  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.sells = (gameState.stats.sells || 0) + itemsToSell.length;
  gameState.daily.sells = (gameState.daily.sells || 0) + itemsToSell.length;
  gameState.daily.sellValue = (gameState.daily.sellValue || 0) + totalRefund;
  gameState.weekly.sells = (gameState.weekly.sells || 0) + itemsToSell.length;
  updateAllTimeOnSell(totalRefund);

  soundSell();
  showToast(`Продано за +${formatCredits(totalRefund)}!`, 'success');

  updateBalanceUI();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  saveState();
  checkAchievements();
  renderGameHub();
}

function sendCaseDropToUpgrader() {
  if (!lastWonCaseItems || !lastWonCaseItems.length) {
    closeModal('caseModal');
    return;
  }

  const items = [...lastWonCaseItems];

  const bestItem = items
    .filter(verifiedInventoryMarketPrice)
    .sort((left, right) => verifiedInventoryMarketPrice(right) - verifiedInventoryMarketPrice(left))[0];
  if (!bestItem) {
    items.forEach(requestInventoryMarketPrice);
    showToast('Не вдалося визначити стабільну ціну дропа. Спробуй за мить.', 'warn');
    return;
  }
  lastWonCaseItems = [];
  closeModal('caseModal');
  switchInputMode('skin');
  selectedInputSkin = bestItem;

  const ies = document.getElementById('inputEmptyState');
  const iss = document.getElementById('inputSkinState');
  const iimg = document.getElementById('inputSkinImg');
  const inm  = document.getElementById('inputSkinName');
  const irar = document.getElementById('inputSkinRarity');
  if (ies) ies.classList.add('hidden');
  if (iss) iss.classList.remove('hidden');
  if (iimg) setImageSource(iimg, bestItem.img, bestItem.name, getSkinKey(bestItem));
  if (inm)  inm.textContent  = bestItem.name;
  if (irar) irar.textContent = `${bestItem.rarity || 'CS2'} · ${getWear(bestItem).name}`;

  showPage('upgrader');
  recalculateUpgrade();
  showToast(`🎯 Скін «${bestItem.name}» встановлено в Апгрейдер!`, 'success');
}

function repeatCaseOpen() {
  if (lastDropContext !== 'case') return repeatDropAction();
  closeModal('caseModal');
  openPowerCase(lastOpenedCaseId || 'budget_covert');
  setTimeout(() => startCaseReel(), 150);
}

function repeatDropAction() {
  if (lastDropContext === 'case') return repeatCaseOpen();
  closeModal('caseModal');
  showPage('contract');
  showToast('Контракт завершено. Обери 5 нових предметів для наступного.', 'info');
}

async function showCaseDetails(caseType) {
  if (!isRuntimeCaseVisible(caseType)) {
    showToast('Цей кейс зараз недоступний.', 'info');
    return;
  }
  const cfg = resolveCaseConfig(caseType);

  if (getCaseSkinPool(cfg.id).length < 8) {
    showToast('Завантажуємо вміст і стабільні ціни кейса…', 'info');
    const ready = await ensureCaseMarketPrices(cfg.id);
    if (!ready) {
      showToast('Не вдалося визначити стабільні ціни для цього кейса.', 'warn');
      return;
    }
  }

  currentDetailsCaseId = cfg.id;
  const pool = getCaseSkinPool(cfg.id);

  const header = document.getElementById('caseDetailsHeader');
  const title = document.getElementById('caseDetailsTitle');
  const metricsEl = document.getElementById('caseDetailsMetrics');
  const grid = document.getElementById('caseDetailsGrid');
  const metrics = getCaseMetrics(cfg.id);

  const caseCost = getCaseCost(cfg.id);
  if (header) header.textContent = `${cfg.name} · ${formatCredits(caseCost)}`;
  if (title) title.textContent = `Вміст кейсу (${pool.length} скінів)`;
  if (metricsEl) {
    metricsEl.innerHTML = `
      <div class="case-metric"><span>Окупність</span><strong>${formatCaseChance(metrics.breakEvenChance)}</strong><small>предмет не дешевший за кейс; не гарантується</small></div>
      <div class="case-metric"><span>Ризик втрати</span><strong>${formatCaseChance(metrics.lossChance)}</strong><small>предмет дешевший за ціну кейсу</small></div>
      <div class="case-metric"><span>Очікуване повернення</span><strong>${(metrics.returnRate * 100).toFixed(0)}%</strong><small>ціль економіки: ${Math.round(CASE_TARGET_RETURN_RATE * 100)}%</small></div>
      <div class="case-metric"><span>Рідкісний дроп</span><strong>${formatCaseChance(metrics.rareChance)}</strong><small>вартість від 3× ціни кейсу</small></div>
      <div class="case-metric"><span>Найвища оцінка</span><strong>${formatCredits(metrics.maxValue)}</strong><small>серед доступних предметів</small></div>
    `;
  }
  renderCaseWishlistSignal(cfg.id);
  renderCaseCollectionPassport(cfg.id);
  if (!grid) return;

  grid.innerHTML = pool.map(s => {
    const chance = getItemDropChance(s, cfg.id);
    const chanceStr = formatCaseChance(chance);
    let badgeColor = '#6ee7b7';
    if (chance < 0.2) badgeColor = '#f87171';
    else if (chance < 1.5) badgeColor = '#fbbf24';
    else if (chance < 6) badgeColor = '#a78bfa';

    return `
      <div class="bg-brand-card border border-brand-border rounded-xl p-2.5 flex flex-col items-center hover:border-amber-500/40 transition">
        <div class="relative w-full">
          <img src="${escapeHtml(getSkinImageSrc(s))}" alt="" class="h-16 w-full object-contain" onerror="handleSkinImageError(this)">
          <span class="case-chance-badge" style="color:${badgeColor};border-color:${badgeColor}40">CHANCE ${chanceStr}</span>
        </div>
        <p class="mt-2 text-[10px] font-extrabold text-white truncate w-full text-center" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</p>
        <p class="text-amber-300 font-extrabold text-xs mt-0.5">${formatCredits(s.price)}</p>
      </div>
    `;
  }).join('');

  openModal('caseDetailsModal');
}

function openCurrentCaseFromDetails() {
  closeModal('caseDetailsModal');
  openPowerCase(currentDetailsCaseId || 'budget_covert');
}

function renderCaseTopDrops() {
  // Preview drops are rendered directly in each catalogue card.
}

/* ===== 1v1 BATTLE ===== */
const MATCHMAKING_WAIT_MS = 8_000;
const MATCHMAKING_POLL_MS = 900;
const BATTLE_LISTING_REFRESH_MS = 9_000;
const BATTLE_LISTING_POLL_MS = 600;
const BATTLE_LISTING_MIN_RATIO = 0.65;
const BATTLE_LISTING_MAX_RATIO = 1.45;
const BATTLE_MATCH_COUNTDOWN_MS = 5_000;
let battleMatch = null;
let battleSearchSerial = 0;
let battleSearchTicket = null;
let battleLobbyTab = 'open';
let battleListings = [];
let battleListing = null;
let battleListingJoin = null;
let battleListingsRefreshInFlight = false;
let battleListingPollTimer = null;
let battleListingsAutoRefreshTimer = null;
let battleListingHydrated = false;
let battleAutoStartTimer = null;
let battleAutoCountdownTimer = null;
let battleAutoMatchId = '';

function setBattleAction(mode, disabled = false) {
  const button = document.getElementById('battleStartBtn');
  if (!button) return;
  button.disabled = disabled;
  if (mode === 'search') {
    button.onclick = findBattleOpponent;
    button.innerHTML = '<i class="fa-solid fa-magnifying-glass mr-2"></i>ШУКАТИ СУПЕРНИКА';
  } else if (mode === 'listing') {
    button.onclick = createBattleListing;
    button.innerHTML = '<i class="fa-solid fa-tower-broadcast mr-2"></i>СТВОРИТИ БІЙ';
  } else if (mode === 'listed') {
    button.onclick = cancelBattleListing;
    button.innerHTML = '<i class="fa-solid fa-xmark mr-2"></i>СКАСУВАТИ ЗАЯВКУ';
  } else if (mode === 'accept') {
    button.onclick = acceptBattleListing;
    button.innerHTML = '<i class="fa-solid fa-handshake mr-2"></i>ПРИЙНЯТИ БІЙ';
  } else if (mode === 'waiting') {
    button.onclick = null;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>ПОШУК…';
  } else if (mode === 'start') {
    button.onclick = startBattle;
    button.innerHTML = '<i class="fa-solid fa-coins mr-2"></i>КИНУТИ МОНЕТКУ';
  }
}

function clearBattleAutoStart() {
  if (battleAutoStartTimer) window.clearTimeout(battleAutoStartTimer);
  if (battleAutoCountdownTimer) window.clearInterval(battleAutoCountdownTimer);
  battleAutoStartTimer = null;
  battleAutoCountdownTimer = null;
  battleAutoMatchId = '';
}

function scheduleBattleAutoStart(match) {
  const matchId = String(match?.id || '');
  if (!matchId || battleAutoMatchId === matchId || battleInProgress) return;
  clearBattleAutoStart();
  battleAutoMatchId = matchId;
  const serverDelay = Number(match?.startInMs);
  const serverStartAt = Number(match?.startAt || 0);
  // Prefer a delay calculated by the Worker. Device clocks can be several
  // minutes apart, while this duration remains accurate for every client.
  const delay = Number.isFinite(serverDelay)
    ? clampNumber(serverDelay, 0, BATTLE_MATCH_COUNTDOWN_MS, BATTLE_MATCH_COUNTDOWN_MS)
    : clampNumber(serverStartAt - Date.now(), 0, BATTLE_MATCH_COUNTDOWN_MS, BATTLE_MATCH_COUNTDOWN_MS);
  const startAt = Date.now() + delay;
  const renderCountdown = () => {
    const remaining = Math.max(0, startAt - Date.now());
    const seconds = Math.max(1, Math.ceil(remaining / 1_000));
    const button = document.getElementById('battleStartBtn');
    if (button) {
      button.disabled = true;
      button.onclick = null;
      button.innerHTML = `<i class="fa-solid fa-clock mr-2"></i>СТАРТ ЧЕРЕЗ ${seconds}`;
    }
    const outcome = document.getElementById('battleOutcome');
    if (outcome) outcome.innerHTML = `<span class="text-cyan-200 pulse-soft">Сервер синхронізував бій. Монетка стартує через ${seconds}…</span>`;
  };
  renderCountdown();
  battleAutoCountdownTimer = window.setInterval(renderCountdown, 150);
  battleAutoStartTimer = window.setTimeout(() => {
    const isCurrentMatch = battleMatch?.id === matchId && battleAutoMatchId === matchId;
    clearBattleAutoStart();
    if (isCurrentMatch) startBattle();
  }, Math.max(0, startAt - Date.now()) + 35);
}

function restoreBattleListing() {
  if (battleListingHydrated) return;
  battleListingHydrated = true;
  const saved = gameState?.battleListing;
  if (!saved || typeof saved !== 'object' || !UUID_PATTERN.test(String(saved.ticketId || '')) || !String(saved.id || '')) return;
  battleListing = {
    id: String(saved.id),
    ticketId: String(saved.ticketId),
    itemId: String(saved.itemId || ''),
    stake: saved.stake && typeof saved.stake === 'object' ? saved.stake : null,
    reservedItem: normalizeStoredItem(saved.reservedItem, 0),
    name: cleanText(saved.name, 24) || account?.nick || 'Гравець',
    expiresAt: clampNumber(saved.expiresAt, 0, Number.MAX_SAFE_INTEGER, 0),
    isMine: true,
  };
}

function persistBattleListing(next) {
  battleListing = next || null;
  if (!gameState) return;
  if (battleListing) {
    gameState.battleListing = {
      id: String(battleListing.id),
      ticketId: String(battleListing.ticketId),
      itemId: String(battleListing.itemId || ''),
      stake: battleListing.stake || null,
      reservedItem: battleListing.reservedItem || null,
      name: cleanText(battleListing.name, 24),
      expiresAt: clampNumber(battleListing.expiresAt, 0, Number.MAX_SAFE_INTEGER, 0)
    };
  } else {
    delete gameState.battleListing;
  }
  saveState();
}

function restoreBattleListingItem(listing = battleListing) {
  const reserved = normalizeStoredItem(listing?.reservedItem, 0);
  if (!reserved) return null;
  if (!userInventory.some(item => String(item.id) === String(reserved.id))) {
    userInventory.push(reserved);
    renderInventoryGrid();
    renderProfileInventory();
    updateAvatarBadge();
  }
  return reserved;
}

function reserveBattleListingItem(listing, item) {
  const reserved = normalizeStoredItem(item, 0);
  if (!reserved) return false;
  listing.reservedItem = reserved;
  userInventory = userInventory.filter(entry => String(entry.id) !== String(reserved.id));
  if (selectedInputSkin?.id === reserved.id) {
    selectedInputSkin = null;
    document.getElementById('inputSkinState')?.classList.add('hidden');
    document.getElementById('inputEmptyState')?.classList.remove('hidden');
    recalculateUpgrade();
  }
  multiInputSkins = multiInputSkins.filter(entry => String(entry.id) !== String(reserved.id));
  renderMultiSlots();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  return true;
}

function formatBattleListingTime(ms) {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1_000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function getBattleListingRemaining(listing) {
  const expiresAt = Number(listing?.expiresAt || 0);
  return expiresAt > 0 ? Math.max(0, expiresAt - Date.now()) : Math.max(0, Number(listing?.remainingMs || 0));
}

function isCompatibleBattleListing(listing, item) {
  const source = Number(listing?.stake?.price || 0);
  const candidate = Number(item?.price || 0);
  if (!source || !candidate) return false;
  const ratio = candidate / source;
  return ratio >= BATTLE_LISTING_MIN_RATIO && ratio <= BATTLE_LISTING_MAX_RATIO;
}

function renderBattleListingJoinBanner() {
  const banner = document.getElementById('battleListingJoinBanner');
  if (!banner) return;
  const listing = battleListingJoin;
  if (!listing) {
    banner.classList.add('hidden');
    banner.replaceChildren();
    return;
  }
  const lower = roundPc(Number(listing.stake?.price || 0) * BATTLE_LISTING_MIN_RATIO);
  const upper = roundPc(Number(listing.stake?.price || 0) * BATTLE_LISTING_MAX_RATIO);
  banner.classList.remove('hidden');
  banner.innerHTML = `<b>Ти приймаєш бій ${escapeHtml(listing.name)} за «${escapeHtml(listing.stake?.name || 'скін')}» (${formatCredits(listing.stake?.price || 0)}).</b><small>Обери свій предмет вартістю від ${formatCredits(lower)} до ${formatCredits(upper)} — після цього монетка буде готова.</small>`;
}

function renderBattleListings() {
  const grid = document.getElementById('battleListingsGrid');
  if (!grid) return;
  const listings = battleListings.filter(listing => getBattleListingRemaining(listing) > 0);
  if (!listings.length) {
    grid.innerHTML = '<div class="battle-listings-empty"><i class="fa-solid fa-tower-broadcast mr-1"></i> Поки немає відкритих боїв. Створи перший у вкладці «Створити бій».</div>';
    return;
  }
  grid.innerHTML = listings.map(listing => {
    const stake = listing.stake || {};
    const image = cleanImageUrl(stake.img) || createSkinPreview(stake.name || 'CS2 Skin');
    const remaining = getBattleListingRemaining(listing);
    const lower = roundPc(Number(stake.price || 0) * BATTLE_LISTING_MIN_RATIO);
    const upper = roundPc(Number(stake.price || 0) * BATTLE_LISTING_MAX_RATIO);
    return `<article class="battle-listing-card ${listing.isMine ? 'is-mine' : ''}">
      <div class="battle-listing-kicker"><b>${escapeHtml(listing.name || 'Гравець')}</b><span>${listing.isMine ? 'Твій бій' : `ще ${formatBattleListingTime(remaining)}`}</span></div>
      <div class="battle-listing-skin"><img src="${escapeHtml(image)}" alt="" data-skin-name="${escapeHtml(stake.name || 'CS2 Skin')}" onerror="handleSkinImageError(this)"><div><strong>${escapeHtml(stake.name || 'CS2 Skin')}</strong><span>${formatCredits(stake.price || 0)}</span></div></div>
      <div class="battle-listing-meta"><span>Твоя ставка: ${formatCredits(lower)}–${formatCredits(upper)}</span><span>1v1</span></div>
      <button type="button" class="${listing.isMine ? 'is-cancel' : ''}" data-battle-listing="${escapeHtml(listing.id)}">${listing.isMine ? '<i class="fa-solid fa-xmark mr-1"></i>Скасувати' : '<i class="fa-solid fa-handshake mr-1"></i>Прийняти бій'}</button>
    </article>`;
  }).join('');
  grid.querySelectorAll('[data-battle-listing]').forEach(button => button.addEventListener('click', () => {
    const listing = battleListings.find(entry => entry.id === button.dataset.battleListing);
    if (!listing) return;
    if (listing.isMine) void cancelBattleListing();
    else openBattleListing(listing.id);
  }));
}

function renderBattleLobby() {
  restoreBattleListing();
  const isOpen = battleLobbyTab === 'open';
  const openTab = document.getElementById('battleOpenTab');
  const createTab = document.getElementById('battleCreateTab');
  const openPanel = document.getElementById('battleListingsPanel');
  const createPanel = document.getElementById('battleCreatePanel');
  openTab?.classList.toggle('is-active', isOpen);
  openTab?.setAttribute('aria-selected', String(isOpen));
  createTab?.classList.toggle('is-active', !isOpen);
  createTab?.setAttribute('aria-selected', String(!isOpen));
  openPanel?.classList.toggle('hidden', !isOpen);
  createPanel?.classList.toggle('hidden', isOpen);
  renderBattleListingJoinBanner();
  renderBattleListings();
  startBattleListingsAutoRefresh();
  if (battleListing && !battleMatch && currentPage === 'battle') startBattleListingPolling();
}

function setBattleLobbyTab(tab) {
  battleLobbyTab = tab === 'create' ? 'create' : 'open';
  renderBattleLobby();
  if (battleLobbyTab === 'open') void refreshBattleListings();
}

function openBattleListing(listingId) {
  const listing = battleListings.find(entry => entry.id === String(listingId));
  if (!listing || listing.isMine) return;
  if (battleListing) {
    showToast('Спочатку скасуй власний відкритий бій.', 'warn');
    return;
  }
  battleListingJoin = listing;
  battleLobbyTab = 'create';
  renderBattleLobby();
  showToast('Обери свій скін, щоб прийняти цей бій.', 'info');
}

function clearBattleOpponent() {
  clearBattleAutoStart();
  battleBotItem = null;
  battleMatch = null;
  document.getElementById('battleBotEmpty')?.classList.remove('hidden');
  document.getElementById('battleBotFilled')?.classList.add('hidden');
  document.getElementById('battleBotSlot')?.classList.remove('filled');
  const label = document.getElementById('battleCoinOpponentLabel');
  const icon = document.getElementById('battleOpponentIcon');
  const emptyIcon = document.getElementById('battleOpponentEmptyIcon');
  if (label) label.textContent = 'БОТ';
  if (icon) icon.className = 'fa-solid fa-robot';
  if (emptyIcon) emptyIcon.className = 'fa-solid fa-magnifying-glass text-4xl text-red-500/60 mb-3';
  const profileButton = document.getElementById('battleOpponentProfileBtn');
  if (profileButton) {
    profileButton.classList.add('hidden');
    profileButton.dataset.profileId = '';
  }
}

function toPublicBattleStake(item) {
  const marketPrice = verifiedInventoryMarketPrice(item);
  return {
    name: cleanText(item?.name, 160),
    img: cleanImageUrl(item?.img),
    price: roundPc(clampNumber(marketPrice, 0.01, MAX_STORED_ITEM_VALUE, 0.01)),
    rarity: cleanText(item?.rarity || 'CS2', 48),
    rarityColor: cleanColor(item?.rarityColor),
  };
}

function setBattleOpponent(item, opponentName, isBot, match = null) {
  const safe = toPublicBattleStake(item);
  battleBotItem = {
    ...safe,
    id: `match-${match?.id || 'bot'}-${Date.now()}`,
    basePrice: safe.price,
    marketPrice: safe.price,
    marketPrices: { FT: safe.price },
    wear: { code: 'FT' },
    botName: cleanText(opponentName, 24) || (isBot ? 'Бот' : 'Гравець'),
    isBot,
  };
  battleMatch = match;
  document.getElementById('battleBotEmpty')?.classList.add('hidden');
  document.getElementById('battleBotFilled')?.classList.remove('hidden');
  setImageSource(document.getElementById('battleBotImg'), battleBotItem.img, battleBotItem.name, getSkinKey(battleBotItem));
  const nameEl = document.getElementById('battleBotName');
  if (nameEl) nameEl.textContent = battleBotItem.name;
  const priceEl = document.getElementById('battleBotPrice');
  if (priceEl) priceEl.textContent = formatCredits(battleBotItem.price);
  const botNameEl = document.getElementById('battleBotName2');
  if (botNameEl) botNameEl.textContent = battleBotItem.botName;
  const typeEl = document.getElementById('battleOpponentType');
  if (typeEl) typeEl.textContent = isBot ? 'Бот' : 'Гравець';
  const label = document.getElementById('battleCoinOpponentLabel');
  const icon = document.getElementById('battleOpponentIcon');
  if (label) label.textContent = isBot ? 'БОТ' : 'ГРАВЕЦЬ';
  if (icon) icon.className = isBot ? 'fa-solid fa-robot' : 'fa-solid fa-user';
  document.getElementById('battleBotSlot')?.classList.add('filled');
  const profileButton = document.getElementById('battleOpponentProfileBtn');
  const profileId = match?.opponentProfileId;
  if (profileButton) {
    profileButton.classList.toggle('hidden', !profileId);
    profileButton.dataset.profileId = profileId || '';
  }
}

function renderBattleRoom() {
  const banner = document.getElementById('battleRoomBanner');
  const name = document.getElementById('battleRoomName');
  const leave = document.getElementById('battleRoomLeaveBtn');
  const hasRoom = Boolean(battleRoom?.id && UUID_PATTERN.test(String(battleRoom.id)));
  if (banner) banner.classList.toggle('hidden', !hasRoom);
  if (name) name.textContent = hasRoom ? battleRoom.name || 'Друг' : '';
  if (leave) leave.classList.toggle('hidden', !hasRoom);
}

function setBattleRoom(profile) {
  const id = profileIdFromInput(profile?.id || profile);
  if (!id) return false;
  battleRoom = { id, name: cleanText(profile?.name || 'Друг', 24) || 'Друг' };
  cancelBattleSearch();
  renderBattleRoom();
  return true;
}

function leaveBattleRoom() {
  if (battleInProgress) return;
  cancelBattleSearch();
  battleRoom = null;
  renderBattleRoom();
  if (battlePlayerItem) {
    const outcome = document.getElementById('battleOutcome');
    if (outcome) outcome.innerHTML = '<span class="text-gray-300">Звичайний пошук суперника увімкнено.</span>';
  }
}

async function openOwnBattleRoom() {
  if (!account?.publicProfile?.enabled) {
    const shared = await copyPublicProfileLink();
    if (!shared) return;
  }
  if (!await publishPublicProfile()) return;
  if (!setBattleRoom({ id: account.publicProfile.id, name: currentUser?.name || account?.nick || 'Ти' })) return;
  closeModal('publicProfileModal');
  showPage('battle');
  showToast('Кімнату 1v1 відкрито. Надішли посилання на профіль другу.', 'success');
}

function joinPublicProfileBattle() {
  if (!activePublicProfile?.id || activePublicProfile.demo) return;
  if (!setBattleRoom(activePublicProfile)) return;
  closeModal('publicProfileModal');
  showPage('battle');
  showToast(`Кімната ${activePublicProfile.name}: обери скін і почни пошук.`, 'info');
}

async function matchmakingRequest(action, ticketId, stake = null, { listingId = '', roomId = battleRoom?.id || '' } = {}) {
  return requestJson('/api/matchmaking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      deviceId: fairState?.deviceId,
      ticketId,
      name: account?.nick || 'Гравець',
      profileId: account?.publicProfile?.enabled ? account.publicProfile.id : '',
      roomId,
      listingId,
      ...(stake ? { stake } : {}),
    }),
  }, 5_000);
}

function cancelBattleSearch() {
  battleSearchSerial++;
  const ticketId = battleSearchTicket;
  battleSearchTicket = null;
  if (ticketId) matchmakingRequest('cancel', ticketId).catch(() => {});
}

async function refreshBattleListings(announce = false) {
  if (battleListingsRefreshInFlight) return false;
  battleListingsRefreshInFlight = true;
  try {
    const data = await matchmakingRequest('list', makeUuid(), null, { roomId: '' });
    battleListings = Array.isArray(data?.listings) ? data.listings : [];
    if (battleListing) {
      const serverListing = battleListings.find(entry => entry.isMine && entry.id === battleListing.id);
      if (serverListing) battleListing = { ...battleListing, ...serverListing };
    }
    renderBattleListings();
    if (announce) showToast('Список відкритих боїв оновлено.', 'info');
    return true;
  } catch (error) {
    if (announce) showToast(error?.message || 'Не вдалося оновити відкриті бої.', 'error');
    return false;
  } finally {
    battleListingsRefreshInFlight = false;
  }
}

function startBattleListingsAutoRefresh() {
  if (battleListingsAutoRefreshTimer) return;
  battleListingsAutoRefreshTimer = window.setInterval(() => {
    if (currentPage === 'battle') void refreshBattleListings();
  }, BATTLE_LISTING_REFRESH_MS);
}

function startBattleListingPolling() {
  if (battleListingPollTimer || !battleListing) return;
  battleListingPollTimer = window.setInterval(() => {
    if (!battleListing || currentPage !== 'battle') {
      if (!battleListing) {
        window.clearInterval(battleListingPollTimer);
        battleListingPollTimer = null;
      }
      return;
    }
    void pollBattleListing();
  }, BATTLE_LISTING_POLL_MS);
}

function stopBattleListingPolling() {
  if (!battleListingPollTimer) return;
  window.clearInterval(battleListingPollTimer);
  battleListingPollTimer = null;
}

async function pollBattleListing() {
  if (!battleListing?.ticketId || battleInProgress) return;
  try {
    const data = await matchmakingRequest('listing-status', battleListing.ticketId, null, { roomId: '' });
    if (data?.status === 'listed') {
      battleListing = { ...battleListing, ...data.listing };
      return;
    }
    if (data?.status === 'matched' && data.match) {
      const listing = battleListing;
      const item = userInventory.find(entry => String(entry.id) === String(listing.itemId)) || restoreBattleListingItem(listing);
      const ticketId = battleListing.ticketId;
      persistBattleListing(null);
      stopBattleListingPolling();
      if (!item) {
        showToast('Твій скін для відкритого бою вже недоступний. Бій скасовано локально.', 'warn');
        return;
      }
      if (!battlePlayerItem || String(battlePlayerItem.id) !== String(item.id)) setBattlePlayer(item);
      battleLobbyTab = 'create';
      renderBattleLobby();
      if (useHumanBattleMatch(data.match, ticketId)) {
        showToast('Твій відкритий бій прийнято. Кидай монетку!', 'success');
      }
      void refreshBattleListings();
      return;
    }
    if (data?.status === 'idle') {
      restoreBattleListingItem(battleListing);
      persistBattleListing(null);
      stopBattleListingPolling();
      if (battlePlayerItem) setBattleAction(battleRoom ? 'search' : 'listing');
      showToast('Відкритий бій завершився або сплив його час.', 'info');
      void refreshBattleListings();
    }
  } catch {
    // The card stays on the screen while a short Worker redeploy is in progress.
  }
}

async function createBattleListing() {
  if (battleRoom) return findBattleOpponent();
  if (battleInProgress || pendingWager || !battlePlayerItem) return;
  if (isProfileHidden()) {
    showToast('Щоб створити відкритий бій, увімкни видимість профілю на Potuzhno Drop.', 'warn');
    return;
  }
  if (battleListingJoin) return acceptBattleListing();
  if (battleListing) {
    showToast('Твій відкритий бій уже чекає суперника.', 'info');
    return;
  }
  if (!userInventory.some(item => String(item.id) === String(battlePlayerItem.id))) {
    showToast('Обраний скін уже недоступний.', 'warn');
    return;
  }
  if (!verifiedInventoryMarketPrice(battlePlayerItem)) {
    requestInventoryMarketPrice(battlePlayerItem);
    showToast('Не вдалося визначити стабільну ціну ставки.', 'warn');
    return;
  }
  const ticketId = makeUuid();
  const stake = toPublicBattleStake(battlePlayerItem);
  setBattleAction('waiting', true);
  try {
    const data = await matchmakingRequest('create-listing', ticketId, stake, { roomId: '' });
    if (data?.status !== 'listed' || !data.listing?.id) throw new Error('Не вдалося створити відкритий бій.');
    const listing = { ...data.listing, ticketId, itemId: battlePlayerItem.id, stake };
    if (!reserveBattleListingItem(listing, battlePlayerItem)) throw new Error('Не вдалося зарезервувати обраний скін.');
    persistBattleListing(listing);
    battleListingJoin = null;
    battleListings = [data.listing, ...battleListings.filter(entry => entry.id !== data.listing.id)];
    setBattleAction('listed');
    battleLobbyTab = 'open';
    renderBattleLobby();
    startBattleListingPolling();
    showToast('Бій виставлено у вітрину. Чекаємо суперника.', 'success');
    void refreshBattleListings();
  } catch (error) {
    setBattleAction('listing');
    showToast(error?.message || 'Не вдалося створити відкритий бій.', 'error');
  }
}

async function cancelBattleListing() {
  if (!battleListing?.ticketId) return;
  const current = battleListing;
  setBattleAction('waiting', true);
  try {
    const data = await matchmakingRequest('cancel-listing', current.ticketId, null, { roomId: '' });
    if (data?.status === 'matched' && data.match) {
      restoreBattleListingItem(current);
      persistBattleListing(null);
      stopBattleListingPolling();
      if (useHumanBattleMatch(data.match, current.ticketId)) showToast('Суперник прийняв бій у ту саму мить. Кидай монетку!', 'success');
      return;
    }
    restoreBattleListingItem(current);
    persistBattleListing(null);
    stopBattleListingPolling();
    if (battlePlayerItem) setBattleAction('listing');
    battleListings = battleListings.filter(entry => entry.id !== current.id);
    renderBattleListings();
    showToast('Відкритий бій скасовано. Скін залишився у твоєму інвентарі.', 'info');
    void refreshBattleListings();
  } catch (error) {
    setBattleAction('listed');
    showToast(error?.message || 'Не вдалося скасувати відкритий бій.', 'error');
  }
}

async function acceptBattleListing() {
  const listing = battleListingJoin;
  if (!listing || !battlePlayerItem || battleInProgress || pendingWager) return;
  if (!isCompatibleBattleListing(listing, battlePlayerItem)) {
    const lower = roundPc(Number(listing.stake?.price || 0) * BATTLE_LISTING_MIN_RATIO);
    const upper = roundPc(Number(listing.stake?.price || 0) * BATTLE_LISTING_MAX_RATIO);
    showToast(`Потрібен скін від ${formatCredits(lower)} до ${formatCredits(upper)}.`, 'warn');
    return;
  }
  if (!userInventory.some(item => String(item.id) === String(battlePlayerItem.id))) {
    showToast('Обраний скін уже недоступний.', 'warn');
    return;
  }
  if (!verifiedInventoryMarketPrice(battlePlayerItem)) {
    requestInventoryMarketPrice(battlePlayerItem);
    showToast('Не вдалося визначити стабільну ціну ставки.', 'warn');
    return;
  }
  const ticketId = makeUuid();
  setBattleAction('waiting', true);
  try {
    const data = await matchmakingRequest('accept-listing', ticketId, toPublicBattleStake(battlePlayerItem), { listingId: listing.id, roomId: '' });
    if (data?.status !== 'matched' || !data.match || !useHumanBattleMatch(data.match, ticketId)) {
      throw new Error('Цей бій уже недоступний. Онови вітрину.');
    }
    battleListingJoin = null;
    battleListings = battleListings.filter(entry => entry.id !== listing.id);
    renderBattleLobby();
    showToast('Бій прийнято. Монетка готова!', 'success');
    void refreshBattleListings();
  } catch (error) {
    setBattleAction('listing');
    showToast(error?.message || 'Не вдалося прийняти бій.', 'error');
    void refreshBattleListings();
  }
}

function useHumanBattleMatch(match, ticketId) {
  const opponent = match?.players?.find(player => player.ticketId !== ticketId);
  if (!opponent?.stake) return false;
  setBattleOpponent(opponent.stake, opponent.name, false, { id: match.id, winnerTicketId: match.winnerTicketId, ticketId, opponentProfileId: opponent.profileId || '' });
  const outcome = document.getElementById('battleOutcome');
  if (outcome) outcome.innerHTML = `<span class="text-cyan-200">Знайдено реального суперника: ${escapeHtml(opponent.name)}. Сервер запускає відлік.</span>`;
  setBattleAction('waiting', true);
  scheduleBattleAutoStart(match);
  return true;
}

async function findBattleOpponent() {
  if (battleInProgress || !battlePlayerItem || pendingWager) return;
  if (!verifiedInventoryMarketPrice(battlePlayerItem)) {
    requestInventoryMarketPrice(battlePlayerItem);
    showToast('Не вдалося визначити стабільну ціну ставки.', 'warn');
    return;
  }
  const serial = ++battleSearchSerial;
  const ticketId = makeUuid();
  battleSearchTicket = ticketId;
  const stake = toPublicBattleStake(battlePlayerItem);
  const outcome = document.getElementById('battleOutcome');
  setBattleAction('waiting', true);
  if (outcome) outcome.innerHTML = `<span class="text-amber-300 pulse-soft">${battleRoom ? `Чекаємо гравця в кімнаті ${escapeHtml(battleRoom.name)} до 8 секунд…` : 'Шукаємо реального суперника до 8 секунд…'}</span>`;

  let response = null;
  const startedAt = Date.now();
  try { response = await matchmakingRequest('join', ticketId, stake); } catch {}
  while (serial === battleSearchSerial && Date.now() - startedAt < MATCHMAKING_WAIT_MS) {
    if (response?.status === 'matched' && useHumanBattleMatch(response.match, ticketId)) {
      battleSearchTicket = null;
      return;
    }
    await new Promise(resolve => setTimeout(resolve, MATCHMAKING_POLL_MS));
    try { response = await matchmakingRequest('status', ticketId); } catch { response = null; }
  }
  if (serial !== battleSearchSerial || battleInProgress || !battlePlayerItem) return;
  let cancelled = null;
  try { cancelled = await matchmakingRequest('cancel', ticketId); } catch {}
  if (cancelled?.status === 'matched' && useHumanBattleMatch(cancelled.match, ticketId)) {
    battleSearchTicket = null;
    return;
  }
  battleSearchTicket = null;
  pickBotOpponent(battlePlayerItem.price);
  if (outcome) outcome.innerHTML = `<span class="text-amber-200">${battleRoom ? 'Друг не приєднався вчасно — до бою приєднався бот.' : 'Реального суперника не знайдено — до бою приєднався бот.'}</span>`;
  setBattleAction('start');
}

function pickBattlePlayerItem() {
  if (battleInProgress) return;
  if (!userInventory.length) {
    showToast('Інвентар порожній', 'warn');
    return;
  }
  const reservedItemId = String(battleListing?.itemId || '');
  const available = userInventory.filter(item => item.accountBound !== true && (
    (!reservedItemId || String(item.id) === reservedItemId || String(item.id) === String(battlePlayerItem?.id || ''))
    && verifiedInventoryMarketPrice(item)
  ));
  if (!available.length) {
    showToast('Твій скін уже зарезервовано у відкритому бою. Скасуй заявку, щоб обрати інший.', 'info');
    return;
  }
  const g = document.getElementById('battlePickGrid');
  if (!g) return;
  g.innerHTML = available.map(s => {
    const wear = getWear(s);
    return `<button type="button" data-battle-pick="${escapeHtml(String(s.id))}" class="bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 flex flex-col items-center transition">
      <span class="wear-badge wear-${wear.code} self-start">${wear.code}</span>
      <img src="${escapeHtml(getSkinImageSrc(s))}" alt="" data-skin-name="${escapeHtml(s.name)}" class="h-16 object-contain mt-1" onerror="handleSkinImageError(this)">
      <p class="mt-1 text-xs font-bold text-white truncate w-full text-center">${escapeHtml(s.name)}</p>
      <p class="text-amber-400 text-xs font-extrabold">${formatCredits(verifiedInventoryMarketPrice(s))}</p>
    </button>`;
  }).join('');
  g.querySelectorAll('[data-battle-pick]').forEach(b => b.addEventListener('click', () => {
    const it = userInventory.find(x => String(x.id) === b.dataset.battlePick);
    if (it) {
      setBattlePlayer(it);
      closeModal('battlePickModal');
    }
  }));
  openModal('battlePickModal');
}

function setBattlePlayer(item) {
  if (item?.accountBound === true) {
    showToast('Колекційний предмет не можна ставити у Battle.', 'info');
    return;
  }
  if (battleListing && String(item?.id) !== String(battleListing.itemId)) {
    showToast('Спочатку скасуй відкритий бій, щоб змінити свій скін.', 'warn');
    return;
  }
  const marketPrice = verifiedInventoryMarketPrice(item);
  if (!marketPrice) {
    requestInventoryMarketPrice(item);
    showToast('Не вдалося визначити стабільну ціну предмета.', 'info');
    return;
  }
  cancelBattleSearch();
  battlePlayerItem = { ...item, basePrice: marketPrice, marketPrice, price: marketPrice };
  document.getElementById('battlePlayerEmpty')?.classList.add('hidden');
  document.getElementById('battlePlayerFilled')?.classList.remove('hidden');
  setImageSource(document.getElementById('battlePlayerImg'), battlePlayerItem.img, battlePlayerItem.name, getSkinKey(battlePlayerItem));
  const nameEl = document.getElementById('battlePlayerName');
  if (nameEl) nameEl.textContent = battlePlayerItem.name;
  const priceEl = document.getElementById('battlePlayerPrice');
  if (priceEl) priceEl.textContent = formatCredits(marketPrice);
  document.getElementById('battlePlayerSlot')?.classList.add('filled');
  clearBattleOpponent();
  const outcome = document.getElementById('battleOutcome');
  if (battleListingJoin) {
    if (outcome) outcome.innerHTML = '<span class="text-cyan-200">Предмет готовий. Прийми відкритий бій.</span>';
    setBattleAction('accept');
  } else if (battleListing) {
    if (outcome) outcome.innerHTML = '<span class="text-amber-200">Твій бій уже у вітрині. Чекаємо суперника.</span>';
    setBattleAction('listed');
  } else {
    if (outcome) outcome.innerHTML = '<span class="text-gray-300">Предмет готовий. Вистав його у відкритий бій.</span>';
    setBattleAction(battleRoom ? 'search' : 'listing');
  }
}

function pickBotOpponent(basePrice) {
  const lo = basePrice * 0.65, hi = basePrice * 1.45;
  const marketPool = CS2_SKINS.map(skin => marketReadyCatalogSkin(skin)).filter(Boolean);
  const pool = marketPool.filter(skin => skin.price >= lo && skin.price <= hi);
  const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : marketPool[Math.floor(Math.random() * marketPool.length)];
  if (!pick) {
    showToast('Немає стабільної ціни для ставки бота. Онови каталог.', 'warn');
    clearBattleOpponent();
    return;
  }
  setBattleOpponent(pick, ['Bot_Bohdan', 'Bot_Voxxa', 'Bot_Fennec', 'Bot_Raven', 'Bot_M0rsik'][Math.floor(Math.random() * 5)], true);
}

function rerollBattleBot() {
  if (battleInProgress) return;
  if (!battlePlayerItem) {
    showToast('Спочатку обери свій предмет', 'warn');
    return;
  }
  if (!battleBotItem?.isBot) {
    showToast('Реального суперника вже знайдено.', 'info');
    return;
  }
  pickBotOpponent(battlePlayerItem.price);
  beep(500, 0.08, 'square');
}

function resetCoinVisual() {
  const coin = document.getElementById('battleCoin');
  if (!coin) return;
  coin.style.setProperty('transition', 'none', 'important');
  coin.style.transform = 'rotateX(0deg)';
  document.getElementById('battleCoinStage')?.classList.remove('is-spinning', 'burst');
  document.getElementById('battlePlayerSlot')?.classList.remove('is-winner', 'is-loser');
  document.getElementById('battleBotSlot')?.classList.remove('is-winner', 'is-loser');
}

function spinCoin(isPlayerWin) {
  return new Promise(resolve => {
    const stage = document.getElementById('battleCoinStage');
    const coin = document.getElementById('battleCoin');
    if (!coin || !stage) return resolve();
    // Human 1v1 matches use the same server match ID on both devices, so the
    // number of visual turns is identical as well as the server start time.
    const matchSeed = String(battleMatch?.id || '').split('').reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 0);
    const spins = battleMatch?.id ? 6 + (matchSeed % 3) : 6 + Math.floor(Math.random() * 3);
    const finalRot = spins * 360 + (isPlayerWin ? 0 : 180);
    coin.style.setProperty('transition', 'none', 'important');
    coin.style.transform = 'rotateX(0deg)';
    void coin.offsetWidth;
    stage.classList.add('is-spinning');
    const duration = 3600;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      coin.removeEventListener('transitionend', onTransitionEnd);
      clearInterval(tick);
      stage.classList.remove('is-spinning');
      stage.classList.add('burst');
      setTimeout(() => stage.classList.remove('burst'), 400);
      resolve();
    };
    const onTransitionEnd = event => {
      if (event.target === coin && event.propertyName === 'transform') finish();
    };
    coin.addEventListener('transitionend', onTransitionEnd);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      coin.style.setProperty('transition-property', 'transform', 'important');
      coin.style.setProperty('transition-duration', `${duration}ms`, 'important');
      coin.style.setProperty('transition-timing-function', 'cubic-bezier(.15,.6,.25,1)', 'important');
      coin.style.transform = `rotateX(${finalRot}deg)`;
    }));
    let n = 0;
    const tick = setInterval(() => {
      beep(500 + Math.random() * 500, 0.025, 'square');
      n++;
      if (n > 35) clearInterval(tick);
    }, 90);
    window.setTimeout(finish, duration + 400);
  });
}

function startBattle() {
  if (battleInProgress || !battlePlayerItem || !battleBotItem) return;
  if (pendingWager || isCaseOpening || isFreeCaseOpening) {
    showToast('Спочатку дочекайся завершення поточного раунду', 'warn');
    return;
  }
  if (!userInventory.some(i => i.id === battlePlayerItem.id)) {
    showToast('Обраного скіна вже немає в твоєму інвентарі', 'warn');
    battlePlayerItem = null;
    document.getElementById('battlePlayerEmpty')?.classList.remove('hidden');
    document.getElementById('battlePlayerFilled')?.classList.add('hidden');
    const startBtn = document.getElementById('battleStartBtn');
    if (startBtn) startBtn.disabled = true;
    return;
  }
  if (battlePlayerItem.accountBound === true) {
    showToast('Колекційний предмет не можна ставити у Battle.', 'warn');
    return;
  }
  if (!verifiedInventoryMarketPrice(battlePlayerItem) || !verifiedInventoryMarketPrice(battleBotItem)) {
    if (!verifiedInventoryMarketPrice(battlePlayerItem)) requestInventoryMarketPrice(battlePlayerItem);
    showToast('Бій чекає на стабільні ціни обох ставок.', 'warn');
    return;
  }
  const playerStake = battlePlayerItem;
  clearBattleAutoStart();
  const wagerId = beginPendingWager({ inventory: [playerStake] });

  // Reserve the stake before the coin starts. It cannot be sold, upgraded or
  // selected for another game while this battle is unresolved.
  userInventory = userInventory.filter(item => item.id !== playerStake.id);
  if (selectedInputSkin?.id === playerStake.id) {
    selectedInputSkin = null;
    document.getElementById('inputSkinState')?.classList.add('hidden');
    document.getElementById('inputEmptyState')?.classList.remove('hidden');
    recalculateUpgrade();
  }
  multiInputSkins = multiInputSkins.filter(item => item.id !== playerStake.id);
  renderMultiSlots();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  saveState();

  battleInProgress = true;
  const startBtn = document.getElementById('battleStartBtn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>КРУТИМО…';
  }
  resetCoinVisual();
  const outcome = document.getElementById('battleOutcome');
  if (outcome) outcome.innerHTML = '<span class="text-amber-300 pulse-soft">Монетка в повітрі…</span>';

  const isPlayerWin = battleMatch?.winnerTicketId
    ? battleMatch.winnerTicketId === battleMatch.ticketId
    : Math.random() < 0.5;
  const opponentLabel = battleBotItem.isBot ? 'БОТА' : 'СУПЕРНИКА';
  const opponentName = battleBotItem.botName || (battleBotItem.isBot ? 'Бот' : 'Гравець');
  spinCoin(isPlayerWin).then(() => {
    if (!isPendingWager(wagerId)) return;
    const pSlot = document.getElementById('battlePlayerSlot');
    const bSlot = document.getElementById('battleBotSlot');
    ensureDailyState();
    ensureWeeklyState();
    gameState.daily.battles = (gameState.daily.battles || 0) + 1;
    gameState.weekly.battles = (gameState.weekly.battles || 0) + 1;
    gameState.stats.battles = (gameState.stats.battles || 0) + 1;
    updateAllTimeOnBattle(isPlayerWin);

    if (isPlayerWin) {
      if (outcome) outcome.innerHTML = `<span class="text-emerald-300 text-lg">🪙 Монетка впала на ТВОЮ сторону! Ти забираєш віртуальний предмет ${opponentLabel}: «${escapeHtml(battleBotItem.name)}».</span>`;
      pSlot?.classList.add('is-winner');
      bSlot?.classList.add('is-loser');
      // A win returns the reserved stake and awards the opponent's item.
      userInventory.push(playerStake);
      const botItem = makeDemoItem(battleBotItem, '-battle');
      userInventory.push(botItem);
      addActivityEvent({ player: currentUser.name || 'Ти', skin: botItem, outcome: 'win', communityKind: 'battle' });
      gameState.stats.battleWins = (gameState.stats.battleWins || 0) + 1;
      gameState.daily.battleWins = (gameState.daily.battleWins || 0) + 1;
      addXp(XP_BATTLE_WIN);
      soundWin();
    } else {
      if (outcome) outcome.innerHTML = `<span class="text-red-300 text-lg">🪙 Монетка впала на сторону ${escapeHtml(opponentName)}. Твій віртуальний предмет вибуває з раунду.</span>`;
      bSlot?.classList.add('is-winner');
      pSlot?.classList.add('is-loser');
      addXp(XP_BATTLE_LOSS);
    }
    if (isPlayerWin) recordPulseCircuitStep('battle');
    const halloweenProgress = isPlayerWin ? awardHalloweenProgress('battle') : { pumpkins: 0, coins: 0 };
    const winterShards = isPlayerWin ? awardWinterShards('battle') : 0;

    gameState.rounds.unshift({
      at: Date.now(),
      win: isPlayerWin,
      targetName: `🪙 ${battlePlayerItem.name} vs ${opponentName}`,
      targetValue: battleBotItem.price,
      chance: 50,
      mode: 'battle',
      inputValue: battlePlayerItem.price,
      bonus: 0
    });
    gameState.rounds = gameState.rounds.slice(0, ROUND_HISTORY_LIMIT);
    completePendingWager(wagerId);
    checkAchievements();
    saveState();
    renderInventoryGrid();
    renderProfileInventory();
    updateAvatarBadge();
    renderGameHub();
    if (halloweenProgress.pumpkins) showToast(`Halloween: +${halloweenProgress.pumpkins} 🎃 і +${halloweenProgress.coins} 🪙 за перемогу в бою.`, 'success');
    if (winterShards) showToast(`ICEWIRE: +${winterShards} Frost Shard за перемогу в бою.`, 'success');
    void syncCommunity();

    if (startBtn) startBtn.innerHTML = '<i class="fa-solid fa-coins mr-2"></i>КИНУТИ МОНЕТКУ';
    setTimeout(() => {
      battleInProgress = false;
      battlePlayerItem = null;
      battleBotItem = null;
      battleMatch = null;
      battleSearchTicket = null;
      pSlot?.classList.remove('filled', 'is-winner', 'is-loser');
      bSlot?.classList.remove('filled', 'is-winner', 'is-loser');
      document.getElementById('battlePlayerEmpty')?.classList.remove('hidden');
      document.getElementById('battleBotEmpty')?.classList.remove('hidden');
      document.getElementById('battlePlayerFilled')?.classList.add('hidden');
      document.getElementById('battleBotFilled')?.classList.add('hidden');
      setBattleAction(battleRoom ? 'search' : 'listing', true);
      if (outcome) outcome.innerHTML = '<span class="text-gray-400">Готуємось до наступного бою…</span>';
    }, 4200);
  });
}

/* ===== JACKPOT ROYALE ===== */

// ── State ──────────────────────────────────────────────────────────────────
let royalePlayerSkins  = [];      // player's staked skins (up to 10)
let royaleBotPools     = [[], [], []]; // each bot's staked skins
let royaleInProgress   = false;
let royaleWheelAngle   = 0;       // current rotation in radians
let royaleWheelCtx     = null;
const ROYALE_MAX_SKINS = 10;
const ROYALE_COLORS    = [
  '#f59e0b', // player  – amber
  '#ef4444', // bot 0   – red
  '#3b82f6', // bot 1   – blue
  '#a855f7', // bot 2   – violet
];
const ROYALE_BOT_NAMES = ['Bot_Voxxa', 'Bot_Fennec', 'Bot_Raven'];
const ROYALE_MODE_CONFIG = Object.freeze({
  live: { label: 'ВІДКРИТИЙ БАНК', title: 'Чекаємо гравців сайту', bots: 0, countdown: 5, names: [] },
  bots: { label: 'ШВИДКИЙ VS БОТІВ', title: 'Збалансований бій за банк', bots: 3, countdown: 5, names: ROYALE_BOT_NAMES },
});
let royaleMode = 'bots';
let royalePhase = 'collecting';
let royaleCountdownTimer = null;
let royaleCountdownEndsAt = 0;
let royaleSpinWagerId = null;
let royaleLiveRound = null;
let royaleLiveTicket = null;
let royaleLivePollTimer = null;
let royaleLivePollInFlight = false;
let royaleLiveSpinRoundId = '';
const ROYALE_LIVE_REFRESH_MS = 1_000;
const ROYALE_LIVE_MAX_SKINS = 10;

// ── Canvas init ────────────────────────────────────────────────────────────
function initRoyaleCanvas() {
  const c = document.getElementById('royaleWheelCanvas');
  if (!c) return;
  royaleWheelCtx = c.getContext('2d');
}

// ── Compute values ─────────────────────────────────────────────────────────
function royaleGetValues() {
  if (royaleMode === 'live' && royaleLiveRound?.participants?.length) {
    const participants = royaleLiveRound.participants;
    const pv = Number(participants.find(entry => entry.isMine === true || entry.ticketId === royaleLiveTicket?.ticketId)?.total || 0);
    const total = participants.reduce((sum, entry) => sum + Number(entry?.total || 0), 0);
    return { pv, bv: [], total };
  }
  const pv  = royalePlayerSkins.reduce((s, x) => s + (x.price || 0), 0);
  const bv  = royaleBotPools.map(pool => pool.reduce((s, x) => s + (x.price || 0), 0));
  const total = pv + bv.reduce((a, b) => a + b, 0);
  return { pv, bv, total };
}

// ── Draw wheel ─────────────────────────────────────────────────────────────
function legacyDrawRoyaleWheel(rotationRad = 0) {
  const ctx = royaleWheelCtx;
  if (!ctx) return;
  const SIZE = 300, cx = SIZE / 2, cy = SIZE / 2, R = SIZE / 2 - 6;
  ctx.clearRect(0, 0, SIZE, SIZE);

  const { pv, bv, total } = royaleGetValues();

  if (total === 0) {
    // Empty wheel
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2030';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const shares = [pv, ...bv].map(v => v / total);
  const labels = ['ТИ', ...ROYALE_BOT_NAMES];
  let startAngle = rotationRad - Math.PI / 2;

  shares.forEach((share, i) => {
    if (share <= 0) return;
    const sweep = share * Math.PI * 2;
    const endAngle = startAngle + sweep;

    // Sector fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = ROYALE_COLORS[i];
    ctx.fill();

    // Sector border
    ctx.strokeStyle = '#0b0e14';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label inside sector
    if (share > 0.04) {
      const midAngle = startAngle + sweep / 2;
      const lx = cx + Math.cos(midAngle) * (R * 0.64);
      const ly = cy + Math.sin(midAngle) * (R * 0.64);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(labels[i], 0, -8);
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(Math.round(share * 100) + '%', 0, 4);
      ctx.restore();
    }

    startAngle = endAngle;
  });

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner circle (centre hole) – drawn by CSS pseudo
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0e14';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ── Update percent list UI ─────────────────────────────────────────────────
function legacyUpdateRoyaleUI() {
  const { pv, bv, total } = royaleGetValues();

  // Pot total
  const potEl = document.getElementById('royalePotTotal');
  if (potEl) potEl.textContent = formatCredits(total);

  // Player total + count
  const ptEl = document.getElementById('royalePlayerTotal');
  if (ptEl) ptEl.textContent = formatCredits(pv);
  const pcEl = document.getElementById('royalePlayerCount');
  if (pcEl) pcEl.textContent = String(royalePlayerSkins.length);

  // Add button disabled if full
  const addBtn = document.getElementById('royaleAddBtn');
  if (addBtn) addBtn.disabled = royalePlayerSkins.length >= ROYALE_MAX_SKINS;

  // Your chance
  const chEl = document.getElementById('royaleYourChance');
  if (chEl) chEl.textContent = total > 0 ? Math.round((pv / total) * 100) + '%' : '0%';

  // Start button
  const sb = document.getElementById('royaleStartBtn');
  if (sb) sb.disabled = royalePlayerSkins.length === 0 || royaleInProgress;

  // Bot totals
  bv.forEach((val, i) => {
    const el = document.getElementById(`royaleBot${i}Total`);
    if (el) el.textContent = formatCredits(val);
  });

  // Percent list
  const listEl = document.getElementById('royalePercentList');
  if (listEl) {
    const all = [
      { name: 'ТИ', val: pv, color: ROYALE_COLORS[0] },
      ...bv.map((v, i) => ({ name: ROYALE_BOT_NAMES[i], val: v, color: ROYALE_COLORS[i + 1] })),
    ];
    listEl.innerHTML = all.map(p => {
      const pct = total > 0 ? (p.val / total) * 100 : 0;
      return `<div class="royale-pct-row">
        <span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;display:inline-block"></span>
        <span style="font-size:10px;font-weight:700;color:#e5e7eb;min-width:70px">${p.name}</span>
        <div class="royale-pct-bar-wrap">
          <div class="royale-pct-bar" style="width:${pct.toFixed(1)}%;background:${p.color}"></div>
        </div>
        <span style="font-size:10px;font-weight:800;color:${p.color};min-width:34px;text-align:right">${pct.toFixed(1)}%</span>
        <span style="font-size:9px;color:#6b7280;min-width:50px;text-align:right">${formatCredits(p.val)}</span>
      </div>`;
    }).join('');
  }

  drawRoyaleWheel(royaleWheelAngle);
}

// ── Render player skins ────────────────────────────────────────────────────
function legacyRenderRoyalePlayerSlots() {
  const grid = document.getElementById('royalePlayerSlots');
  if (!grid) return;
  grid.innerHTML = royalePlayerSkins.map((s, idx) => {
    const imgSrc = getSkinImageSrc(s);
    return `<div class="jackpot-skin-slot">
      <button class="slot-remove" onclick="royaleRemoveSkin(${idx})">✕</button>
      <img src="${escapeHtml(imgSrc)}" alt="" onerror="this.style.display='none'" style="width:40px;height:40px;object-fit:contain">
      <span class="slot-name">${escapeHtml(s.name)}</span>
      <span class="slot-price">${formatCredits(s.price || 0)}</span>
    </div>`;
  }).join('') + (royalePlayerSkins.length < ROYALE_MAX_SKINS
    ? `<div class="jackpot-skin-slot" style="border-style:dashed;border-color:rgba(245,158,11,0.2);cursor:pointer;justify-content:center" onclick="royaleAddSkin()">
         <i class="fa-solid fa-plus" style="color:rgba(245,158,11,0.5);font-size:18px"></i>
       </div>` : '');
  updateRoyaleUI();
}

// ── Render bot skin thumbnails ─────────────────────────────────────────────
function legacyRenderRoyaleBotPanels() {
  royaleBotPools.forEach((pool, i) => {
    const el = document.getElementById(`royaleBot${i}Skins`);
    if (!el) return;
    el.innerHTML = pool.map(s => {
      const src = getSkinImageSrc(s);
      return `<img class="jackpot-bot-thumb" src="${escapeHtml(src)}" alt="${escapeHtml(s.name)}" title="${escapeHtml(s.name)} · ${formatCredits(s.price || 0)}" onerror="this.style.display='none'">`;
    }).join('');
  });
  updateRoyaleUI();
}

// ── Add a skin from inventory ──────────────────────────────────────────────
function legacyRoyaleAddSkin() {
  if (royaleInProgress) return;
  if (royalePlayerSkins.length >= ROYALE_MAX_SKINS) {
    showToast(`Максимум ${ROYALE_MAX_SKINS} скінів`, 'warn');
    return;
  }
  if (!userInventory.length) {
    showToast('Інвентар порожній', 'warn');
    return;
  }
  const g = document.getElementById('battlePickGrid');
  if (!g) return;

  const usedIds = new Set(royalePlayerSkins.map(s => s.id));
  const available = userInventory.filter(s => !usedIds.has(s.id));
  if (!available.length) {
    showToast('Усі скіни вже додані', 'warn');
    return;
  }

  g.innerHTML = available.map(s => {
    const wear = getWear(s);
    return `<button type="button" data-royale-pick="${escapeHtml(String(s.id))}"
      class="bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 flex flex-col items-center transition">
      <span class="wear-badge wear-${wear.code} self-start">${wear.code}</span>
      <img src="${escapeHtml(getSkinImageSrc(s))}" alt="" class="h-16 object-contain mt-1" onerror="handleSkinImageError(this)">
      <p class="mt-1 text-xs font-bold text-white truncate w-full text-center">${escapeHtml(s.name)}</p>
      <p class="text-amber-400 text-xs font-extrabold">${formatCredits(s.price)}</p>
    </button>`;
  }).join('');

  g.querySelectorAll('[data-royale-pick]').forEach(b => {
    b.addEventListener('click', () => {
      const it = userInventory.find(x => String(x.id) === b.dataset.royalePick);
      if (it && !royalePlayerSkins.find(x => x.id === it.id)) {
        royalePlayerSkins.push(it);
        renderRoyalePlayerSlots();
      }
      closeModal('battlePickModal');
    });
  });
  openModal('battlePickModal');
}

// ── Remove a skin from player's stake ─────────────────────────────────────
function legacyRoyaleRemoveSkin(idx) {
  if (royaleInProgress) return;
  royalePlayerSkins.splice(idx, 1);
  renderRoyalePlayerSlots();
}

// ── Generate bot pools ─────────────────────────────────────────────────────
function legacyRoyaleGenerateBots() {
  if (!CS2_SKINS || !CS2_SKINS.length) return;
  royaleBotPools = ROYALE_BOT_NAMES.map(() => {
    const count = 3 + Math.floor(Math.random() * 6); // 3–8 skins
    const pool = [];
    for (let j = 0; j < count; j++) {
      const s = CS2_SKINS[Math.floor(Math.random() * CS2_SKINS.length)];
      const wear = rollWear ? rollWear() : { code: 'FT', mult: 1 };
      pool.push({
        ...s,
        id: 'bot_' + Math.random().toString(36).slice(2),
        wear,
        price: marketPriceForWear ? marketPriceForWear(s, wear) : (s.price || 1),
      });
    }
    return pool;
  });

  ROYALE_BOT_NAMES.forEach((name, i) => {
    const el = document.getElementById(`royaleBot${i}Name`);
    if (el) el.textContent = name;
  });
  renderRoyaleBotPanels();
}

// ── Reset ──────────────────────────────────────────────────────────────────
function legacyResetRoyale(force = false) {
  if (royaleInProgress && !force) return;
  royalePlayerSkins  = [];
  royaleBotPools     = [[], [], []];
  royaleInProgress   = false;
  royaleWheelAngle   = 0;

  // Hide win banner
  const banner = document.getElementById('royaleWinBanner');
  if (banner) banner.classList.add('hidden');

  // Clear bot highlights
  for (let i = 0; i < 3; i++) {
    const card = document.getElementById(`royaleBot${i}Card`);
    if (card) card.classList.remove('is-winner', 'is-loser');
  }

  renderRoyalePlayerSlots();
  royaleGenerateBots();
}

// ── Spin animation ─────────────────────────────────────────────────────────
function legacyStartRoyale() {
  if (royaleInProgress) return;
  if (pendingWager || isCaseOpening || isFreeCaseOpening) {
    showToast('Спочатку дочекайся завершення поточного раунду', 'warn');
    return;
  }
  if (royalePlayerSkins.length === 0) {
    showToast('Додай хоча б 1 скін', 'warn');
    return;
  }

  // Validate that all skins are still in userInventory
  const allExist = royalePlayerSkins.every(s => userInventory.some(u => u.id === s.id));
  if (!allExist) {
    showToast('Деяких скінів уже немає в інвентарі! Оновлюємо...', 'warn');
    royalePlayerSkins = royalePlayerSkins.filter(s => userInventory.some(u => u.id === s.id));
    renderRoyalePlayerSlots();
    return;
  }

  const wagerId = beginPendingWager({ inventory: royalePlayerSkins });

  // Deduct player skins immediately to prevent duplication while wheel spins
  const playerIds = new Set(royalePlayerSkins.map(s => s.id));
  userInventory = userInventory.filter(s => !playerIds.has(s.id));
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  saveState();

  royaleInProgress = true;
  const startBtn = document.getElementById('royaleStartBtn');
  const addBtn   = document.getElementById('royaleAddBtn');
  if (startBtn) startBtn.disabled = true;
  if (addBtn)   addBtn.disabled   = true;

  // Hide old banner
  const banner = document.getElementById('royaleWinBanner');
  if (banner) banner.classList.add('hidden');

  // Determine winner based on weighted random
  const { pv, bv, total } = royaleGetValues();
  const shares = [pv, ...bv];
  const rand = Math.random() * total;
  let cumulative = 0;
  let winnerIdx = 0;
  for (let i = 0; i < shares.length; i++) {
    cumulative += shares[i];
    if (rand < cumulative) { winnerIdx = i; break; }
  }

  // Compute final angle so pointer at top points exactly to the winner's sector center
  const fracs = shares.map(v => v / total);
  let sectorStart = 0;
  for (let i = 0; i < winnerIdx; i++) sectorStart += fracs[i];
  const sectorMid = sectorStart + fracs[winnerIdx] / 2;
  const targetAngle = -(sectorMid * Math.PI * 2);
  const extraSpins = (6 + Math.floor(Math.random() * 3)) * Math.PI * 2;
  const finalAngle = targetAngle - extraSpins;

  // Wheel pulse
  document.getElementById('royaleWheelWrap')?.classList.add('is-spinning');

  const DURATION = 5000;
  const startAngle = royaleWheelAngle;
  const startTime  = performance.now();

  // Ease out cubic
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateSpin(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    const eased = easeOutCubic(t);
    royaleWheelAngle = startAngle + (finalAngle - startAngle) * eased;
    drawRoyaleWheel(royaleWheelAngle);

    if (t < 1) {
      // Tick sound during spin
      if (Math.floor(elapsed / 80) !== Math.floor((elapsed - 16) / 80)) {
        if (typeof beep === 'function') beep(400 + Math.random() * 300, 0.02, 'square');
      }
      requestAnimationFrame(animateSpin);
    } else {
      // Done spinning
      document.getElementById('royaleWheelWrap')?.classList.remove('is-spinning');
      if (isPendingWager(wagerId)) royaleSettle(winnerIdx, wagerId);
    }
  }
  requestAnimationFrame(animateSpin);
}

// ── Settle result ──────────────────────────────────────────────────────────
function legacyRoyaleSettle(winnerIdx, wagerId) {
  if (!completePendingWager(wagerId)) return;
  const userWon = winnerIdx === 0;

  // Collect all skins in the pot
  const allPotSkins = [...royalePlayerSkins, ...royaleBotPools[0], ...royaleBotPools[1], ...royaleBotPools[2]];

  ensureDailyState();
  ensureWeeklyState();
  gameState.daily.battles   = (gameState.daily.battles   || 0) + 1;
  gameState.weekly.battles  = (gameState.weekly.battles  || 0) + 1;
  gameState.stats.battles   = (gameState.stats.battles   || 0) + 1;
  if (typeof updateAllTimeOnBattle === 'function') updateAllTimeOnBattle(userWon);

  const banner   = document.getElementById('royaleWinBanner');
  const winIcon  = document.getElementById('royaleWinIcon');
  const winTitle = document.getElementById('royaleWinTitle');
  const winSub   = document.getElementById('royaleWinSub');

  // Bot card highlights
  for (let i = 0; i < 3; i++) {
    const card = document.getElementById(`royaleBot${i}Card`);
    if (!card) continue;
    if (winnerIdx === i + 1) card.classList.add('is-winner');
    else card.classList.add('is-loser');
  }

  const { total, pv } = royaleGetValues();
  const chance = total > 0 ? Math.round((pv / total) * 100) : 0;

  if (userWon) {
    // Add ALL pot skins to inventory
    allPotSkins.forEach(s => {
      const ni = makeDemoItem(s, '-royale');
      userInventory.push(ni);
    });
    const liveSkin = allPotSkins.reduce((best, skin) => (skin.price || 0) > (best?.price || 0) ? skin : best, null);
    if (liveSkin) addActivityEvent({ player: currentUser.name || 'Ти', skin: liveSkin, outcome: 'win', communityKind: 'royale' });

    addXp(XP_ROYALE_WIN);
    soundWin();

    if (banner)   banner.classList.remove('hidden');
    if (winIcon)  winIcon.textContent = '👑';
    if (winTitle) { winTitle.textContent = 'ПЕРЕМОГА!'; winTitle.className = 'font-heading text-3xl font-extrabold uppercase text-emerald-400'; }
    if (winSub)   winSub.textContent = `Ти забираєш весь банк: ${formatCredits(total)} (${allPotSkins.length} скінів)`;
    showToast(`👑 ROYALE! Ти виграв ${formatCredits(total)} банк!`, 'success');

    gameState.stats.battleWins   = (gameState.stats.battleWins   || 0) + 1;
    gameState.daily.battleWins   = (gameState.daily.battleWins   || 0) + 1;
    gameState.allTime.royaleWins = (gameState.allTime.royaleWins || 0) + 1;
  } else {
    // User lost — remove their skins from inventory
    const playerIds = new Set(royalePlayerSkins.map(s => s.id));
    userInventory = userInventory.filter(s => !playerIds.has(s.id));

    addXp(XP_ROYALE_LOSS);
    soundLose();

    const botName = ROYALE_BOT_NAMES[winnerIdx - 1] || 'Бот';
    if (banner)   banner.classList.remove('hidden');
    if (winIcon)  winIcon.textContent = '💀';
    if (winTitle) { winTitle.textContent = 'ПОРАЗКА'; winTitle.className = 'font-heading text-3xl font-extrabold uppercase text-red-400'; }
    if (winSub)   winSub.textContent = `${botName} виграв банк ${formatCredits(total)}. Ти втратив ${royalePlayerSkins.length} скінів.`;
    showToast(`Поразка. ${botName} забрав банк.`, 'warn');
  }

  gameState.rounds.unshift({
    at: Date.now(), win: userWon,
    targetName: `🎰 Jackpot Royale (${allPotSkins.length} скінів)`,
    targetValue: total, chance, mode: 'royale', inputValue: pv, bonus: 0,
  });
  gameState.rounds = gameState.rounds.slice(0, ROUND_HISTORY_LIMIT);
  if (typeof checkAchievements === 'function') checkAchievements();
  saveState();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  if (typeof renderGameHub === 'function') renderGameHub();
  void syncCommunity();

  royaleInProgress = false;
  const startBtn = document.getElementById('royaleStartBtn');
  if (startBtn) startBtn.disabled = false;
}

// ── Init on page show ──────────────────────────────────────────────────────
function legacyInitRoyalePage() {
  initRoyaleCanvas();
  if (royalePlayerSkins.length === 0 && royaleBotPools[0].length === 0) {
    royaleGenerateBots();
    renderRoyalePlayerSlots();
  } else {
    renderRoyalePlayerSlots();
    renderRoyaleBotPanels();
  }
  drawRoyaleWheel(royaleWheelAngle);
}

/* ===== ROYALE 2.0 — live-bank command deck ===== */
function royaleConfig() {
  return ROYALE_MODE_CONFIG[royaleMode] || ROYALE_MODE_CONFIG.bots;
}

function royaleParticipants() {
  if (royaleMode === 'live' && Array.isArray(royaleLiveRound?.participants) && royaleLiveRound.participants.length) {
    return royaleLiveRound.participants.map((player, index) => ({
      ticketId: player.ticketId,
      name: player.name || 'Гравець',
      value: Number(player?.total || 0),
      skins: Array.isArray(player?.stakes) ? player.stakes : [],
      color: ROYALE_COLORS[index % ROYALE_COLORS.length] || '#a78bfa',
      isYou: player.isMine === true || player.ticketId === royaleLiveTicket?.ticketId,
    }));
  }
  const { pv, bv } = royaleGetValues();
  const config = royaleConfig();
  return [
    { name: currentUser?.name || account?.nick || 'Ти', value: pv, skins: royalePlayerSkins, color: ROYALE_COLORS[0], isYou: true },
    ...royaleBotPools.map((skins, index) => ({
      name: config.names[index] || ROYALE_BOT_NAMES[index] || `AI_${index + 1}`,
      value: bv[index] || 0,
      skins,
      color: ROYALE_COLORS[index + 1] || '#a78bfa',
      isYou: false,
    })).filter(entry => entry.skins.length),
  ];
}

function setRoyaleMode(mode) {
  if (royaleInProgress || royaleLiveTicket) {
    showToast('Зміни режим після завершення раунду.', 'warn');
    return;
  }
  royaleMode = mode === 'live' ? 'live' : 'bots';
  royalePhase = 'collecting';
  royaleWheelAngle = 0;
  if (royaleMode === 'live') {
    royaleBotPools = [];
    void refreshLiveRoyale();
    startLiveRoyalePolling();
  } else {
    stopLiveRoyalePolling();
    royaleLiveRound = null;
    royaleGenerateBots(royalePlayerSkins.reduce((sum, skin) => sum + Number(skin.price || 0), 0));
  }
  renderRoyaleDeck();
}

function royalePhaseLabel() {
  if (royalePhase === 'countdown') return `СТАРТ ЗА ${Math.max(1, Math.ceil((royaleCountdownEndsAt - Date.now()) / 1_000))} С`;
  if (royalePhase === 'spinning') return 'РУЛЕТКА В ЕФІРІ';
  if (royalePhase === 'settled') return 'РАУНД ЗАВЕРШЕНО';
  return 'ЗБІР БАНКУ';
}

function drawRoyaleWheel(rotationRad = 0) {
  const ctx = royaleWheelCtx;
  if (!ctx) return;
  const size = ctx.canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.445;
  ctx.clearRect(0, 0, size, size);

  const backdrop = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius + 22);
  backdrop.addColorStop(0, '#10192b');
  backdrop.addColorStop(0.72, '#070d1b');
  backdrop.addColorStop(1, 'rgba(7,10,20,0)');
  ctx.fillStyle = backdrop;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 18, 0, Math.PI * 2);
  ctx.fill();

  const participants = royaleParticipants();
  const total = participants.reduce((sum, entry) => sum + entry.value, 0);
  if (!total) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    const empty = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius);
    empty.addColorStop(0, '#1b2840');
    empty.addColorStop(1, '#0b1220');
    ctx.fillStyle = empty;
    ctx.fill();
  } else {
    let start = rotationRad - Math.PI / 2;
    participants.forEach((entry, index) => {
      const share = entry.value / total;
      const sweep = share * Math.PI * 2;
      const end = start + sweep;
      const color = entry.color;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start + 0.006, end - 0.006);
      ctx.closePath();
      ctx.clip();
      const sector = ctx.createRadialGradient(cx, cy, 24, cx, cy, radius);
      sector.addColorStop(0, `${color}ee`);
      sector.addColorStop(0.58, color);
      sector.addColorStop(1, '#090f1d');
      ctx.fillStyle = sector;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, radius - 11, start + 0.012, end - 0.012);
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (share > 0.045) {
        const middle = start + sweep / 2;
        const labelRadius = radius * (share < 0.11 ? 0.64 : 0.62);
        ctx.save();
        ctx.translate(cx + Math.cos(middle) * labelRadius, cy + Math.sin(middle) * labelRadius);
        ctx.rotate(middle + Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,.75)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#f8fafc';
        ctx.font = `800 ${share < 0.11 ? 11 : 14}px Inter, sans-serif`;
        ctx.fillText(entry.isYou ? 'ТИ' : entry.name.replace(/^AI_/, ''), 0, -8);
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.font = `800 ${share < 0.11 ? 10 : 12}px Inter, sans-serif`;
        ctx.fillText(`${Math.round(share * 100)}%`, 0, 10);
        ctx.restore();
      }
      start = end;
    });
  }

  for (let mark = 0; mark < 48; mark++) {
    const angle = (mark / 48) * Math.PI * 2 - Math.PI / 2;
    const outer = radius + 7;
    const inner = outer - (mark % 6 === 0 ? 10 : 5);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = mark % 6 === 0 ? 'rgba(251,191,36,.8)' : 'rgba(203,213,225,.28)';
    ctx.lineWidth = mark % 6 === 0 ? 2 : 1;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 11, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(196,181,253,.46)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 64, 0, Math.PI * 2);
  ctx.fillStyle = '#070b14';
  ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,.46)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function renderRoyaleParticipantList() {
  const list = document.getElementById('royaleParticipantList');
  const count = document.getElementById('royaleParticipantCount');
  const participants = royaleParticipants();
  const total = participants.reduce((sum, entry) => sum + entry.value, 0);
  if (count) count.textContent = String(participants.filter(entry => entry.value > 0 || entry.isYou).length);
  if (!list) return;
  list.innerHTML = participants.map((entry, index) => {
    const chance = total ? (entry.value / total) * 100 : 0;
    const image = entry.skins[0] ? getSkinImageSrc(entry.skins[0]) : '';
    return `<article class="royale-participant ${entry.isYou ? 'is-you' : ''}" style="--royale-color:${escapeHtml(entry.color)}">
      <div class="royale-participant-avatar">${image ? `<img src="${escapeHtml(image)}" alt="" onerror="handleSkinImageError(this)">` : `<i class="fa-solid ${entry.isYou ? 'fa-user-astronaut' : 'fa-robot'}"></i>`}</div>
      <div class="royale-participant-copy"><b>${escapeHtml(entry.isYou ? 'Ти' : entry.name)}</b><span>${entry.skins.length ? `${entry.skins.length} ${entry.skins.length === 1 ? 'скін' : 'скіни'}` : 'Чекає твою ставку'}</span></div>
      <div class="royale-participant-value"><b>${formatCredits(entry.value)}</b><span>${chance.toFixed(1)}%</span></div>
      <i class="royale-participant-line" style="width:${chance.toFixed(2)}%"></i>
    </article>`;
  }).join('');
}

function renderRoyaleHistory() {
  const list = document.getElementById('royaleRecentRounds');
  if (!list) return;
  const entries = Array.isArray(gameState?.royaleRecent) ? gameState.royaleRecent.slice(0, 4) : [];
  if (!entries.length) {
    list.innerHTML = '<p class="royale-history-empty"><i class="fa-solid fa-satellite-dish"></i> Перший результат з’явиться тут.</p>';
    return;
  }
  list.innerHTML = entries.map(entry => `<div class="royale-history-row ${entry.win ? 'is-win' : ''}"><i class="fa-solid ${entry.win ? 'fa-crown' : 'fa-ghost'}"></i><div><b>${escapeHtml(entry.winner || 'Учасник')}</b><span>${escapeHtml(entry.mode || 'Раунд')} · ${new Date(entry.at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span></div><strong>${formatCredits(entry.total || 0)}</strong></div>`).join('');
}

function updateRoyaleUI() {
  const { pv, total } = royaleGetValues();
  const chance = total ? (pv / total) * 100 : 0;
  const config = royaleConfig();
  const isLive = royaleMode === 'live';
  const liveLocked = isLive && Boolean(royaleLiveTicket);
  const skinLimit = isLive ? ROYALE_LIVE_MAX_SKINS : ROYALE_MAX_SKINS;
  const remaining = royalePhase === 'countdown' ? Math.max(1, Math.ceil((royaleCountdownEndsAt - Date.now()) / 1_000)) : 0;
  const playerTotal = document.getElementById('royalePlayerTotal');
  const potTotal = document.getElementById('royalePotTotal');
  const playerCount = document.getElementById('royalePlayerCount');
  const playerLimit = document.getElementById('royalePlayerLimit');
  const chanceEl = document.getElementById('royaleYourChance');
  const phasePill = document.getElementById('royalePhasePill');
  const roundMode = document.getElementById('royaleRoundMode');
  const roundTitle = document.getElementById('royaleRoundTitle');
  const wheelStatus = document.getElementById('royaleWheelStatus');
  const wheelSub = document.getElementById('royaleWheelSub');
  const hint = document.getElementById('royaleRosterHint');
  const addButton = document.getElementById('royaleAddBtn');
  const startButton = document.getElementById('royaleStartBtn');
  const liveMode = document.getElementById('royaleLiveMode');
  const botsMode = document.getElementById('royaleBotsMode');
  if (playerTotal) playerTotal.textContent = formatCredits(pv);
  if (potTotal) potTotal.textContent = formatCredits(total);
  if (playerCount) playerCount.textContent = String(royalePlayerSkins.length);
  if (playerLimit) playerLimit.textContent = `/${skinLimit}`;
  if (chanceEl) chanceEl.textContent = `${chance.toFixed(chance >= 10 ? 1 : 2)}%`;
  if (phasePill) phasePill.textContent = royalePhaseLabel();
  if (roundMode) roundMode.textContent = config.label;
  if (roundTitle) roundTitle.textContent = royalePhase === 'collecting' ? config.title : royalePhase === 'countdown' ? `Рулетка стартує за ${remaining} с` : royalePhase === 'spinning' ? 'Банк у русі' : 'Результат зафіксовано';
  if (wheelStatus) wheelStatus.textContent = royalePhase === 'countdown' ? 'СТАРТ ЗА' : royalePhase === 'spinning' ? 'БАНК У РУСІ' : 'ТВІЙ ШАНС';
  if (wheelSub) wheelSub.textContent = royalePhase === 'countdown' ? `${remaining} секунд` : royalePhase === 'spinning' ? 'серверний ритм' : royalePlayerSkins.length ? 'місце у банку' : 'додай скін';
  if (hint) hint.textContent = isLive
    ? (royaleLiveRound?.participants?.length ? 'Банк синхронізовано сервером. AI у цьому режимі не бере участі.' : 'Відкрий банк із 1–10 віртуальними скінами — інші гравці можуть приєднатися.')
    : royalePlayerSkins.length ? `Кожен бот ставить по ${royalePlayerSkins.length} ${royalePlayerSkins.length === 1 ? 'скіну' : royalePlayerSkins.length < 5 ? 'скіни' : 'скінів'} з каталогу — ціни не змінюються.` : 'Додай перший скін — боти сформують стартовий банк зі скінів каталогу.';
  if (addButton) {
    const remainingSkins = Math.max(0, skinLimit - royalePlayerSkins.length);
    addButton.disabled = royaleInProgress || liveLocked || !remainingSkins;
    addButton.innerHTML = remainingSkins
      ? `<i class="fa-solid fa-plus"></i> Додати скіни <span class="opacity-70">(${royalePlayerSkins.length}/${skinLimit})</span>`
      : `<i class="fa-solid fa-check"></i> Ліміт скінів набрано`;
  }
  if (startButton) {
    startButton.disabled = royaleInProgress || (!liveLocked && !royalePlayerSkins.length);
    startButton.innerHTML = royalePhase === 'countdown'
      ? `<i class="fa-solid fa-clock"></i><span>СТАРТ ЧЕРЕЗ ${remaining}</span><small>ставки вже в банку</small>`
      : royalePhase === 'spinning'
        ? '<i class="fa-solid fa-spinner fa-spin"></i><span>РУЛЕТКА В ЕФІРІ</span><small>визначаємо переможця</small>'
        : isLive && liveLocked
          ? '<i class="fa-solid fa-users"></i><span>ЧЕКАЄМО ГРАВЦЯ</span><small>натисни, щоб вийти з банку</small>'
          : isLive
            ? '<i class="fa-solid fa-tower-broadcast"></i><span>ВІДКРИТИ БАНК</span><small>для реальних гравців</small>'
        : '<i class="fa-solid fa-bolt"></i><span>ЗАПУСТИТИ РАУНД</span><small>автостарт через 5 с</small>';
  }
  liveMode?.classList.toggle('is-active', royaleMode === 'live');
  liveMode?.setAttribute('aria-selected', String(royaleMode === 'live'));
  botsMode?.classList.toggle('is-active', royaleMode === 'bots');
  botsMode?.setAttribute('aria-selected', String(royaleMode === 'bots'));
  renderRoyaleParticipantList();
  drawRoyaleWheel(royaleWheelAngle);
}

function renderRoyalePlayerSlots() {
  const grid = document.getElementById('royalePlayerSlots');
  if (!grid) return;
  const locked = royaleMode === 'live' && Boolean(royaleLiveTicket);
  const limit = royaleMode === 'live' ? ROYALE_LIVE_MAX_SKINS : ROYALE_MAX_SKINS;
  const cards = royalePlayerSkins.map((skin, index) => `<article class="royale-stake-card">${locked ? '<span class="royale-stake-lock"><i class="fa-solid fa-lock"></i></span>' : `<button type="button" class="royale-stake-remove" data-royale-remove="${index}" aria-label="Прибрати скін"><i class="fa-solid fa-xmark"></i></button>`}<img src="${escapeHtml(getSkinImageSrc(skin))}" alt="" onerror="handleSkinImageError(this)"><b title="${escapeHtml(skin.name)}">${escapeHtml(skin.name)}</b><span>${formatCredits(skin.price || 0)}</span></article>`);
  if (!locked && royalePlayerSkins.length < limit) cards.push('<button type="button" class="royale-stake-empty" data-royale-add><i class="fa-solid fa-plus"></i><span>Взяти зі сховища</span></button>');
  grid.innerHTML = cards.join('');
  updateRoyaleUI();
}

function renderRoyaleDeck() {
  renderRoyalePlayerSlots();
  renderRoyaleHistory();
}

function bindRoyaleControls() {
  const bind = (id, handler) => {
    const button = document.getElementById(id);
    if (!button || button.dataset.royaleBound === '1') return;
    button.dataset.royaleBound = '1';
    button.addEventListener('click', handler);
  };
  bind('royaleStartBtn', startRoyale);
  bind('royaleAddBtn', royaleAddSkin);
  bind('royaleLiveMode', () => setRoyaleMode('live'));
  bind('royaleBotsMode', () => setRoyaleMode('bots'));
  bind('royaleQuickModeBtn', () => setRoyaleMode('bots'));
  bind('royaleHistoryRefresh', renderRoyaleHistory);
  bind('royaleResetBtn', resetRoyale);

  const slots = document.getElementById('royalePlayerSlots');
  if (!slots || slots.dataset.royaleBound === '1') return;
  slots.dataset.royaleBound = '1';
  slots.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-royale-remove]');
    if (removeButton) return royaleRemoveSkin(Number(removeButton.dataset.royaleRemove));
    if (event.target.closest('[data-royale-add]')) royaleAddSkin();
  });
}

function royalePickCatalogSkinForValue(catalog, wantedValue, usedCatalogIds) {
  const unused = catalog.filter(skin => !usedCatalogIds.has(getSkinKey(skin)));
  const candidates = unused.length ? unused : catalog;
  const desired = Math.max(1, Number(wantedValue) || 1);
  // Prefer catalogue skins close to the bot's intended share, but choose from
  // a small best-fit group so each round still feels like a varied loadout.
  const bestFits = candidates
    .map(skin => ({
      skin,
      distance: Math.abs(Math.log((Math.max(1, verifiedMarketPriceForWear(skin)) + 10) / (desired + 10))),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, Math.min(10, candidates.length));
  return bestFits[Math.floor(Math.random() * bestFits.length)]?.skin || candidates[0] || null;
}

function royaleCreateBotPool(targetValue, botIndex, requestedCount = 1, usedCatalogIds = new Set()) {
  const catalog = (CS2_SKINS || []).map(skin => marketReadyCatalogSkin(skin)).filter(Boolean);
  if (!catalog.length) return [];
  const itemCount = Math.max(1, Math.min(ROYALE_MAX_SKINS, Math.floor(Number(requestedCount) || 1)));
  let remainingTarget = Math.max(itemCount, Math.round(Number(targetValue) || itemCount));
  const pool = [];
  for (let index = 0; index < itemCount; index++) {
    const slotsLeft = itemCount - index;
    const source = royalePickCatalogSkinForValue(catalog, remainingTarget / slotsLeft, usedCatalogIds);
    if (!source) break;
    usedCatalogIds.add(getSkinKey(source));
    // Never replace a real catalogue price with the balancing target: bots
    // stake only an exact confirmed FT market quote.
    const botSkin = makeDemoItem({ ...source, wear: WEAR_TIERS[2] }, `-royale-ai-${botIndex}-${index}`);
    if (!botSkin || !verifiedInventoryMarketPrice(botSkin)) continue;
    pool.push(botSkin);
    remainingTarget = Math.max(0, remainingTarget - verifiedInventoryMarketPrice(botSkin));
  }
  return pool;
}

function royaleGenerateBots(referenceValue = 0) {
  if (royaleMode === 'live') {
    royaleBotPools = [];
    return;
  }
  const config = royaleConfig();
  const reference = Math.max(20, Number(referenceValue || 0), royalePlayerSkins.reduce((sum, skin) => sum + Number(skin.price || 0), 0));
  const playerSkinCount = Math.max(1, royalePlayerSkins.length);
  // Every player skin unlocks one skin per bot. Their total stake grows too,
  // but less aggressively than the player's contribution, so a fuller stack
  // makes the bank richer and still improves the player's odds.
  const playerBoost = Math.min(0.4, Math.max(0, playerSkinCount - 1) * 0.045);
  const factors = [0.58, 0.84, 1.12].map(factor => factor * (1 - playerBoost));
  const usedCatalogIds = new Set();
  royaleBotPools = factors.slice(0, config.bots).map((factor, index) => royaleCreateBotPool(reference * factor, index, playerSkinCount, usedCatalogIds));
}

function royaleAddSkin() {
  if (royaleInProgress || (royaleMode === 'live' && royaleLiveTicket)) return;
  const limit = royaleMode === 'live' ? ROYALE_LIVE_MAX_SKINS : ROYALE_MAX_SKINS;
  if (royalePlayerSkins.length >= limit) return showToast(`Максимум ${limit} ${limit === 1 ? 'скін' : 'скінів'} для цього режиму`, 'warn');
  const available = userInventory.filter(skin => skin.accountBound !== true && !royalePlayerSkins.some(selected => selected.id === skin.id) && verifiedInventoryMarketPrice(skin));
  if (!available.length) return showToast('У сховищі немає доступних скінів.', 'warn');
  const grid = document.getElementById('royalePickGrid');
  const count = document.getElementById('royalePickCount');
  const confirm = document.getElementById('royalePickConfirm');
  if (!grid || !count || !confirm) return;
  const remaining = limit - royalePlayerSkins.length;
  const selectedIds = new Set();
  const renderPicker = () => {
    const selectedCount = selectedIds.size;
    count.textContent = `Вибрано ${selectedCount} із ${remaining}`;
    confirm.disabled = !selectedCount;
    confirm.innerHTML = `<i class="fa-solid fa-plus mr-2"></i>Додати ${selectedCount || ''} ${selectedCount === 1 ? 'скін' : 'скінів'}`;
    grid.innerHTML = available.map(skin => {
      const isSelected = selectedIds.has(String(skin.id));
      const wear = getWear(skin);
      return `<button type="button" data-royale-select="${escapeHtml(String(skin.id))}" aria-pressed="${isSelected}" class="relative bg-brand-card border rounded-xl p-3 flex flex-col items-center transition ${isSelected ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-300/50' : 'border-brand-border hover:bg-gray-800'}"><span class="wear-badge wear-${wear.code} self-start">${wear.code}</span>${isSelected ? '<span class="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[10px] text-slate-950"><i class="fa-solid fa-check"></i></span>' : ''}<img src="${escapeHtml(getSkinImageSrc(skin))}" alt="" class="h-16 object-contain mt-1" onerror="handleSkinImageError(this)"><p class="mt-1 text-xs font-bold text-white truncate w-full text-center">${escapeHtml(skin.name)}</p><p class="text-amber-400 text-xs font-extrabold">${formatCredits(verifiedInventoryMarketPrice(skin))}</p></button>`;
    }).join('');
    grid.querySelectorAll('[data-royale-select]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.royaleSelect;
      if (selectedIds.has(id)) selectedIds.delete(id);
      else if (selectedIds.size < remaining) selectedIds.add(id);
      else return showToast(`Можна додати ще ${remaining} ${remaining === 1 ? 'скін' : 'скінів'} у цей раунд.`, 'warn');
      renderPicker();
    }));
  };
  confirm.onclick = () => {
    const selected = available.filter(skin => selectedIds.has(String(skin.id)));
    if (!selected.length) return;
    royalePlayerSkins.push(...selected);
    if (royaleMode === 'bots') royaleGenerateBots();
    renderRoyaleDeck();
    closeModal('royalePickModal');
  };
  renderPicker();
  openModal('royalePickModal');
}

function royaleRemoveSkin(index) {
  if (royaleInProgress || (royaleMode === 'live' && royaleLiveTicket)) return;
  royalePlayerSkins.splice(index, 1);
  if (royaleMode === 'bots') royaleGenerateBots();
  renderRoyaleDeck();
}

function resetRoyale(force = false) {
  if (royaleInProgress && !force) return;
  if (royaleMode === 'live' && royaleLiveTicket) {
    void leaveLiveRoyale();
    return;
  }
  if (royaleCountdownTimer) window.clearInterval(royaleCountdownTimer);
  royaleCountdownTimer = null;
  royaleCountdownEndsAt = 0;
  royaleSpinWagerId = null;
  royaleInProgress = false;
  royalePhase = 'collecting';
  royalePlayerSkins = [];
  royaleBotPools = [];
  royaleWheelAngle = 0;
  document.getElementById('royaleWinBanner')?.classList.add('hidden');
  if (royaleMode === 'bots') royaleGenerateBots();
  else {
    startLiveRoyalePolling();
    void refreshLiveRoyale();
  }
  renderRoyaleDeck();
}

function royaleLiveRequest(action, ticketId, stakes = null) {
  return requestJson('/api/royale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      deviceId: fairState?.deviceId,
      ticketId,
      name: account?.nick || currentUser?.name || 'Гравець',
      profileId: account?.publicProfile?.enabled ? account.publicProfile.id : '',
      ...(Array.isArray(stakes) ? { stakes } : {}),
    }),
  }, 5_000);
}

function activeRoyaleTicketId() {
  if (!royaleLiveTicket?.ticketId) {
    if (!window.__potuzhnoRoyaleViewerTicket) window.__potuzhnoRoyaleViewerTicket = makeUuid();
    return window.__potuzhnoRoyaleViewerTicket;
  }
  return royaleLiveTicket.ticketId;
}

function startLiveRoyalePolling() {
  if (royaleLivePollTimer) return;
  royaleLivePollTimer = window.setInterval(() => {
    if (royaleMode !== 'live' || currentPage !== 'royale') return;
    void refreshLiveRoyale();
  }, ROYALE_LIVE_REFRESH_MS);
}

function stopLiveRoyalePolling() {
  if (royaleLivePollTimer) window.clearInterval(royaleLivePollTimer);
  royaleLivePollTimer = null;
}

function persistRoyaleLiveTicket() {
  if (!gameState) return;
  if (royaleLiveTicket) gameState.royaleLiveTicket = royaleLiveTicket;
  else delete gameState.royaleLiveTicket;
}

function releaseLiveRoyaleReservation({ announce = false } = {}) {
  const ticket = royaleLiveTicket;
  if (!ticket) return;
  const reservedSkins = Array.isArray(ticket.skins) ? ticket.skins : ticket.skin ? [ticket.skin] : [];
  reservedSkins.map((skin, index) => normalizeStoredItem(skin, index)).filter(Boolean).forEach(skin => {
    if (!userInventory.some(item => String(item.id) === String(skin.id))) userInventory.push(skin);
  });
  if (ticket.wagerId) completePendingWager(ticket.wagerId);
  royaleLiveTicket = null;
  royaleLiveRound = null;
  royaleInProgress = false;
  royalePhase = 'collecting';
  persistRoyaleLiveTicket();
  saveState();
  renderInventoryGrid(); renderProfileInventory(); updateAvatarBadge();
  if (announce) showToast('Внесок повернуто до сховища.', 'info');
}

async function leaveLiveRoyale() {
  const ticket = royaleLiveTicket;
  if (!ticket) return;
  try {
    const result = await royaleLiveRequest('leave', ticket.ticketId);
    if (result?.status !== 'left' && result?.status !== 'idle') {
      showToast('Відлік уже почався — внесок бере участь у цьому раунді.', 'warn');
      return;
    }
    releaseLiveRoyaleReservation({ announce: true });
    renderRoyaleDeck();
    void refreshLiveRoyale();
  } catch (error) {
    showToast(error?.message || 'Не вдалося вийти з банку.', 'error');
  }
}

function scheduleLiveRoyaleCountdown(round) {
  const target = Date.now() + Math.max(0, Number(round?.startInMs || 0));
  if (royaleCountdownTimer && Math.abs(royaleCountdownEndsAt - target) < 500) return;
  if (royaleCountdownTimer) window.clearInterval(royaleCountdownTimer);
  royaleCountdownEndsAt = target;
  royaleCountdownTimer = window.setInterval(() => {
    if (Date.now() < royaleCountdownEndsAt) return renderRoyaleDeck();
    window.clearInterval(royaleCountdownTimer);
    royaleCountdownTimer = null;
    royalePhase = 'spinning';
    royaleInProgress = Boolean(royaleLiveRound?.participants?.some(player => player.isMine === true || player.ticketId === royaleLiveTicket?.ticketId));
    renderRoyaleDeck();
    void refreshLiveRoyale();
  }, 160);
}

function hasLiveRoyaleReceipt(roundId) {
  return Boolean(roundId && Array.isArray(gameState?.royaleLiveSettledRounds) && gameState.royaleLiveSettledRounds.includes(roundId));
}

function applyLiveRoyaleState(round) {
  if (!round || round.status === 'idle') {
    if (royaleLiveTicket) releaseLiveRoyaleReservation({ announce: true });
    royaleLiveRound = null;
    royalePhase = 'collecting';
    royaleInProgress = false;
    renderRoyaleDeck();
    return;
  }
  royaleLiveRound = round;
  const amParticipant = Boolean(round.participants?.some(player => player.isMine === true || player.ticketId === royaleLiveTicket?.ticketId));
  if (royaleLiveTicket && !amParticipant && round.status !== 'settled') {
    releaseLiveRoyaleReservation({ announce: true });
    return;
  }
  if (round.status === 'open') {
    royalePhase = 'collecting';
    royaleInProgress = false;
  } else if (round.status === 'countdown') {
    royalePhase = 'countdown';
    royaleInProgress = amParticipant;
    scheduleLiveRoyaleCountdown(round);
  } else if (round.status === 'settled') {
    // The server returns the same result receipt even if another player has
    // already opened the next bank.  A stored receipt also makes a refresh
    // harmless: never spin or award the same virtual bank twice.
    const alreadySettledHere = hasLiveRoyaleReceipt(round.id) || (royalePhase === 'settled' && royaleLiveSpinRoundId === round.id);
    royalePhase = alreadySettledHere ? 'settled' : 'spinning';
    royaleInProgress = amParticipant && !alreadySettledHere;
    if (!alreadySettledHere && amParticipant && round.winnerTicketId && royaleLiveSpinRoundId !== round.id) {
      const wagerId = royaleLiveTicket?.wagerId;
      // Do not mark the receipt as handled until the local reservation is
      // present. This lets a delayed state recovery retry the synced spin.
      if (wagerId && isPendingWager(wagerId)) {
        royaleLiveSpinRoundId = round.id;
        spinRoyaleRound(wagerId, round.winnerTicketId);
      }
    }
  }
  renderRoyaleDeck();
}

async function refreshLiveRoyale() {
  if (royaleMode !== 'live' || royaleLivePollInFlight) return;
  royaleLivePollInFlight = true;
  try {
    const round = await royaleLiveRequest('status', activeRoyaleTicketId());
    applyLiveRoyaleState(round);
  } catch (error) {
    // Background polling should not bury the player in repeated notices.
    if (currentPage === 'royale' && !royaleLiveRound) {
      const hint = document.getElementById('royaleRosterHint');
      if (hint) hint.textContent = 'Синхронізація банку тимчасово недоступна. Повторюємо…';
    }
  } finally {
    royaleLivePollInFlight = false;
  }
}

async function joinLiveRoyale() {
  if (royaleLiveTicket) return leaveLiveRoyale();
  if (pendingWager || isCaseOpening || isFreeCaseOpening) return showToast('Спочатку дочекайся завершення поточного раунду.', 'warn');
  const skins = royalePlayerSkins.slice(0, ROYALE_LIVE_MAX_SKINS);
  if (!skins.length) return showToast('Додай від 1 до 10 віртуальних скінів у відкритий банк.', 'warn');
  if (!skins.every(skin => userInventory.some(item => item.id === skin.id && item.accountBound !== true) && verifiedInventoryMarketPrice(skin))) {
    royalePlayerSkins = royalePlayerSkins.filter(skin => userInventory.some(item => item.id === skin.id && item.accountBound !== true) && verifiedInventoryMarketPrice(skin));
    renderRoyaleDeck();
    return showToast('Потрібні стабільні ціни всіх скінів у банку.', 'warn');
  }
  const ticketId = makeUuid();
  const wagerId = beginPendingWager({ inventory: skins });
  royaleLiveTicket = { ticketId, wagerId, skins: skins.map((skin, index) => normalizeStoredItem(skin, index)).filter(Boolean), createdAt: Date.now() };
  persistRoyaleLiveTicket();
  const skinIds = new Set(skins.map(skin => String(skin.id)));
  userInventory = userInventory.filter(item => !skinIds.has(String(item.id)));
  saveState();
  renderInventoryGrid(); renderProfileInventory(); updateAvatarBadge();
  try {
    const round = await royaleLiveRequest('join', ticketId, skins);
    document.getElementById('royaleWinBanner')?.classList.add('hidden');
    startLiveRoyalePolling();
    applyLiveRoyaleState(round);
    showToast(round.status === 'countdown' ? 'Гравець приєднався — сервер запускає рулетку.' : `У банку ${skins.length} ${skins.length === 1 ? 'скін' : 'скінів'}. Чекаємо ще одного гравця.`, 'success');
  } catch (error) {
    releaseLiveRoyaleReservation();
    renderRoyaleDeck();
    showToast(error?.message || 'Не вдалося приєднатися до банку.', 'error');
  }
}

function startRoyale() {
  if (royaleMode === 'live') {
    void joinLiveRoyale();
    return;
  }
  if (royaleInProgress) return;
  if (pendingWager || isCaseOpening || isFreeCaseOpening) return showToast('Спочатку дочекайся завершення поточного раунду', 'warn');
  if (!royalePlayerSkins.length) return showToast('Додай хоча б один скін у банк.', 'warn');
  if (!royalePlayerSkins.every(skin => userInventory.some(owned => owned.id === skin.id && owned.accountBound !== true) && verifiedInventoryMarketPrice(skin))) {
    showToast('Один зі скінів уже недоступний. Оновлюємо внесок.', 'warn');
    royalePlayerSkins = royalePlayerSkins.filter(skin => userInventory.some(owned => owned.id === skin.id && owned.accountBound !== true) && verifiedInventoryMarketPrice(skin));
    royaleGenerateBots();
    renderRoyaleDeck();
    return;
  }
  const wagerId = beginPendingWager({ inventory: royalePlayerSkins });
  const playerIds = new Set(royalePlayerSkins.map(skin => skin.id));
  userInventory = userInventory.filter(skin => !playerIds.has(skin.id));
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  saveState();
  royaleInProgress = true;
  royalePhase = 'countdown';
  royaleSpinWagerId = wagerId;
  royaleCountdownEndsAt = Date.now() + royaleConfig().countdown * 1_000;
  document.getElementById('royaleWinBanner')?.classList.add('hidden');
  renderRoyaleDeck();
  royaleCountdownTimer = window.setInterval(() => {
    if (Date.now() < royaleCountdownEndsAt) return renderRoyaleDeck();
    window.clearInterval(royaleCountdownTimer);
    royaleCountdownTimer = null;
    spinRoyaleRound(wagerId);
  }, 180);
}

function spinRoyaleRound(wagerId, serverWinnerTicketId = '') {
  if (!isPendingWager(wagerId)) return;
  royalePhase = 'spinning';
  const participants = royaleParticipants();
  const total = participants.reduce((sum, entry) => sum + entry.value, 0);
  if (!total) return royaleSettle(0, wagerId);
  let winnerIndex = serverWinnerTicketId
    ? participants.findIndex(entry => entry.ticketId === serverWinnerTicketId)
    : -1;
  if (winnerIndex < 0) {
    const random = Math.random() * total;
    let rolling = 0;
    winnerIndex = 0;
    for (let index = 0; index < participants.length; index++) {
      rolling += participants[index].value;
      if (random < rolling) { winnerIndex = index; break; }
    }
  }
  const fractions = participants.map(entry => entry.value / total);
  const before = fractions.slice(0, winnerIndex).reduce((sum, share) => sum + share, 0);
  const target = -((before + fractions[winnerIndex] / 2) * Math.PI * 2);
  const matchSeed = participants.map(entry => entry.name).join(':').split('').reduce((sum, char) => ((sum * 33) + char.charCodeAt(0)) >>> 0, 0);
  const startAngle = royaleWheelAngle;
  const fullTurn = Math.PI * 2;
  const minimumTravel = (7 + (matchSeed % 3)) * fullTurn;
  // The winner stays beneath the pointer, but the same angular point must be
  // far enough ahead of the previous round to never look like a short spin.
  let finalAngle = target;
  while (finalAngle > startAngle - minimumTravel) finalAngle -= fullTurn;
  const startedAt = performance.now();
  const duration = 5_300;
  document.getElementById('royaleWheelWrap')?.classList.add('is-spinning');
  renderRoyaleDeck();
  const ease = value => 1 - Math.pow(1 - value, 4);
  const animate = now => {
    const progress = Math.min(1, (now - startedAt) / duration);
    royaleWheelAngle = startAngle + (finalAngle - startAngle) * ease(progress);
    drawRoyaleWheel(royaleWheelAngle);
    if (Math.floor((now - startedAt) / 105) !== Math.floor((now - startedAt - 16) / 105)) beep(460 + Math.random() * 260, .018, 'square');
    if (progress < 1) return requestAnimationFrame(animate);
    document.getElementById('royaleWheelWrap')?.classList.remove('is-spinning');
    if (isPendingWager(wagerId)) royaleSettle(winnerIndex, wagerId, participants);
  };
  requestAnimationFrame(animate);
}

function royaleSettle(winnerIndex, wagerId, frozenParticipants = royaleParticipants()) {
  if (!completePendingWager(wagerId)) return;
  const isLiveRound = royaleMode === 'live';
  const settledRoundId = royaleLiveRound?.id || '';
  const userWon = frozenParticipants[winnerIndex]?.isYou === true;
  const allPotSkins = frozenParticipants.flatMap(entry => entry.skins);
  const { pv, total } = royaleGetValues();
  const chance = total ? Math.round((pv / total) * 100) : 0;
  ensureDailyState(); ensureWeeklyState();
  gameState.daily.battles = (gameState.daily.battles || 0) + 1;
  gameState.weekly.battles = (gameState.weekly.battles || 0) + 1;
  gameState.stats.battles = (gameState.stats.battles || 0) + 1;
  updateAllTimeOnBattle(userWon);
  const winner = frozenParticipants[winnerIndex]?.name || 'Учасник';
  const banner = document.getElementById('royaleWinBanner');
  const icon = document.getElementById('royaleWinIcon');
  const title = document.getElementById('royaleWinTitle');
  const sub = document.getElementById('royaleWinSub');
  if (userWon) {
    allPotSkins.map(skin => makeDemoItem(skin, '-royale')).filter(Boolean).forEach(skin => userInventory.push(skin));
    const topSkin = allPotSkins.reduce((best, skin) => Number(skin.price || 0) > Number(best?.price || 0) ? skin : best, null);
    if (topSkin) addActivityEvent({ player: currentUser.name || 'Ти', skin: topSkin, outcome: 'win', communityKind: 'royale' });
    gameState.stats.battleWins = (gameState.stats.battleWins || 0) + 1;
    gameState.daily.battleWins = (gameState.daily.battleWins || 0) + 1;
    gameState.allTime.royaleWins = (gameState.allTime.royaleWins || 0) + 1;
    addXp(XP_ROYALE_WIN); soundWin();
    if (icon) icon.textContent = '👑';
    if (title) { title.textContent = 'БАНК ТВОЙ!'; title.className = 'font-heading text-3xl font-extrabold uppercase text-emerald-300'; }
    if (sub) sub.textContent = `Ти забираєш ${formatCredits(total)} · ${allPotSkins.length} віртуальних скінів.`;
    showToast(`👑 Royale: банк ${formatCredits(total)} твій!`, 'success');
  } else {
    addXp(XP_ROYALE_LOSS); soundLose();
    if (icon) icon.textContent = '◈';
    if (title) { title.textContent = 'БАНК ЗАБРАЛИ'; title.className = 'font-heading text-3xl font-extrabold uppercase text-rose-300'; }
    if (sub) sub.textContent = `${winner} забрав ${formatCredits(total)}. Наступний раунд може бути твоїм.`;
    showToast(`${winner} забрав банк.`, 'warn');
  }
  gameState.rounds.unshift({ at: Date.now(), win: userWon, targetName: `◈ Royale · ${allPotSkins.length} скінів`, targetValue: total, chance, mode: 'royale', inputValue: pv, bonus: 0 });
  gameState.rounds = gameState.rounds.slice(0, ROUND_HISTORY_LIMIT);
  gameState.royaleRecent = [{ at: Date.now(), win: userWon, winner: userWon ? 'Ти' : winner, total, mode: royaleMode === 'bots' ? 'VS ботів' : 'Відкритий банк' }, ...(Array.isArray(gameState.royaleRecent) ? gameState.royaleRecent : [])].slice(0, 4);
  checkAchievements();
  if (isLiveRound) {
    // Keep a tiny local receipt so a reload after the result cannot award the
    // same virtual bank twice. The server remains the source of the winner.
    const settled = Array.isArray(gameState.royaleLiveSettledRounds) ? gameState.royaleLiveSettledRounds : [];
    gameState.royaleLiveSettledRounds = [settledRoundId, ...settled.filter(id => id !== settledRoundId)].filter(Boolean).slice(0, 12);
    royaleLiveTicket = null;
    royalePlayerSkins = [];
    persistRoyaleLiveTicket();
  }
  saveState();
  renderInventoryGrid(); renderProfileInventory(); updateAvatarBadge(); renderGameHub(); void syncCommunity();
  royaleInProgress = false;
  royalePhase = 'settled';
  royaleSpinWagerId = null;
  if (banner) banner.classList.remove('hidden');
  renderRoyaleDeck();
}

function initRoyalePage() {
  initRoyaleCanvas();
  bindRoyaleControls();
  const savedTicket = gameState?.royaleLiveTicket;
  if (!royaleLiveTicket && savedTicket?.ticketId && savedTicket?.wagerId && (Array.isArray(savedTicket?.skins) || savedTicket?.skin)) {
    royaleLiveTicket = savedTicket;
    royaleMode = 'live';
  }
  if (royaleMode === 'live') {
    startLiveRoyalePolling();
    void refreshLiveRoyale();
  } else if (!royaleInProgress && !royaleBotPools.length) {
    royaleGenerateBots();
  }
  renderRoyaleDeck();
}

/* ===== TRADE-UP CONTRACT ===== */
function pickContractSlot(idx) {
  if (!userInventory.length) {
    showToast('Інвентар порожній', 'warn');
    return;
  }
  contractActiveSlot = idx;
  const g = document.getElementById('contractPickGrid');
  if (!g) return;
  const used = new Set(contractItems.filter(Boolean).map(i => i.id));
  const available = userInventory.filter(s => s.accountBound !== true && !used.has(s.id) && verifiedInventoryMarketPrice(s));
  if (!available.length) {
    g.innerHTML = '<div class="col-span-full py-10 text-center text-sm text-gray-400">Усі предмети з інвентарю вже додано до контракту.</div>';
  } else {
    g.innerHTML = available.map(s => {
      const wear = getWear(s);
      return `<button type="button" data-contract-pick="${escapeHtml(String(s.id))}" class="bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 flex flex-col items-center transition">
        <span class="wear-badge wear-${wear.code} self-start">${wear.code}</span>
        <img src="${escapeHtml(getSkinImageSrc(s))}" alt="" data-skin-name="${escapeHtml(s.name)}" class="h-16 object-contain mt-1" onerror="handleSkinImageError(this)">
        <p class="mt-1 text-xs font-bold text-white truncate w-full text-center">${escapeHtml(s.name)}</p>
        <p class="text-amber-400 text-xs font-extrabold">${formatCredits(verifiedInventoryMarketPrice(s))}</p>
      </button>`;
    }).join('');
    g.querySelectorAll('[data-contract-pick]').forEach(b => b.addEventListener('click', () => {
      const it = userInventory.find(x => String(x.id) === b.dataset.contractPick);
      if (it) {
        contractItems[contractActiveSlot] = it;
        renderContractSlots();
        closeModal('contractPickModal');
      }
    }));
  }
  openModal('contractPickModal');
}

function renderContractSlots() {
  const slots = document.querySelectorAll('[data-contract-slot]');
  slots.forEach((el, i) => {
    const it = contractItems[i];
    if (it) {
      el.classList.add('filled');
      el.innerHTML = `<span class="wear-badge wear-${getWear(it).code} absolute top-1 left-1 z-10">${getWear(it).code}</span><img src="${escapeHtml(getSkinImageSrc(it))}" alt="" data-skin-name="${escapeHtml(it.name)}" onerror="handleSkinImageError(this)">`;
    } else {
      el.classList.remove('filled');
      el.innerHTML = '<i class="fa-solid fa-plus text-2xl text-amber-500/60"></i>';
    }
  });
  const total = contractItems.filter(Boolean).reduce((sum, item) => sum + verifiedInventoryMarketPrice(item), 0);
  const tv = document.getElementById('contractTotalValue');
  if (tv) tv.textContent = formatCredits(total);
  const range = document.getElementById('contractRangeValue');
  if (range) {
    if (total > 0) {
      const lo = roundPc(total * CONTRACT_RETURN_MIN), hi = roundPc(total * CONTRACT_RETURN_MAX);
      range.textContent = `${formatCreditValue(lo)} — ${formatCredits(hi)}`;
    } else {
      range.textContent = '—';
    }
  }
}

function clearContract() {
  contractItems = [null, null, null, null, null];
  renderContractSlots();
}

async function executeContract() {
  if (pendingWager || isCaseOpening || isFreeCaseOpening || isRolling) {
    showToast('Спочатку дочекайся завершення поточного раунду', 'warn');
    return;
  }
  const items = contractItems.filter(Boolean);
  if (items.length !== 5) {
    showToast(`Потрібно 5 предметів (у тебе ${items.length})`, 'warn');
    return;
  }
  const allExist = items.every(it => userInventory.some(u => u.id === it.id));
  if (!allExist) {
    showToast('Деяких предметів уже немає в інвентарі! Оновлюємо...', 'warn');
    contractItems = contractItems.map(it => it && userInventory.some(u => u.id === it.id) ? it : null);
    renderContractSlots();
    return;
  }
  if (items.some(item => item.accountBound === true)) {
    showToast('Колекційні предмети прив’язані до профілю й не можуть бути в контракті.', 'warn');
    return;
  }
  if (!items.every(verifiedInventoryMarketPrice)) {
    items.filter(item => !verifiedInventoryMarketPrice(item)).forEach(requestInventoryMarketPrice);
    showToast('Контракт чекає на стабільні ціни всіх предметів.', 'warn');
    return;
  }
  const total = items.reduce((sum, item) => sum + verifiedInventoryMarketPrice(item), 0);
  const lo = total * CONTRACT_RETURN_MIN, hi = total * CONTRACT_RETURN_MAX;
  const getVerifiedPool = () => CS2_SKINS
    .map(skin => marketReadyCatalogSkin(skin))
    .filter(Boolean)
    .filter(skin => skin.price >= lo && skin.price <= hi);
  let pool = getVerifiedPool();
  if (!pool.length) {
    // Legacy catalogue values may only guide which names to ask Steam about;
    // they are never used to choose or value the result.
    const probe = [...CS2_SKINS.filter(isUsableSkin)]
      .sort((left, right) => Math.abs(Number(left.price || 0) - total) - Math.abs(Number(right.price || 0) - total))
      .slice(0, MARKET_PRICE_BATCH_SIZE);
    if (probe.length) await syncStableCatalogPrices(probe);
    pool = getVerifiedPool();
  }
  if (!pool.length) {
    showToast('Немає стабільних цін у діапазоні контракту. Баланс не змінено.', 'warn');
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const item = makeDemoItem(pick, '-contract');
  const ids = new Set(items.map(i => i.id));
  userInventory = userInventory.filter(i => !ids.has(i.id));
  userInventory.push(item);

  if (selectedInputSkin && ids.has(selectedInputSkin.id)) {
    selectedInputSkin = null;
    document.getElementById('inputSkinState')?.classList.add('hidden');
    document.getElementById('inputEmptyState')?.classList.remove('hidden');
    recalculateUpgrade();
  }
  multiInputSkins = multiInputSkins.filter(x => !ids.has(x.id));
  renderMultiSlots();

  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.contracts = (gameState.stats.contracts || 0) + 1;
  gameState.daily.contracts = (gameState.daily.contracts || 0) + 1;
  gameState.weekly.contracts = (gameState.weekly.contracts || 0) + 1;
  updateAllTimeOnContract();
  addXp(XP_CONTRACT);
  checkAchievements();
  saveState();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  renderGameHub();
  clearContract();
  addActivityEvent({ player: currentUser.name || 'Ти', skin: item, outcome: 'win', communityKind: 'contract' });
  showToast(`Контракт: «${item.name}» за ${formatCredits(item.price)}`, 'success');
  soundWin();

  lastWonCaseItems = [item];
  displayCaseDropResult([item], false, 'Контракт обміну', 'contract');
}

/* ===== LIVE SKIN STRIP ===== */
function getLiveFeedProfile(player) {
  if (player === currentUser?.name) {
    const publicProfileEnabled = Boolean(account?.publicProfile?.enabled);
    return {
      id: publicProfileEnabled ? account.publicProfile.id : '',
      ...buildPublicProfilePayload(),
      isOwn: true,
      avatarUrl: currentUser?.avatar || '',
      demo: false
    };
  }
  return { id: '', name: cleanText(player, 24) || 'Гравець', level: 1, prestige: 0, stats: {}, demo: false };
}

function openLiveFeedProfile(event) {
  const profile = event?.currentTarget?._liveProfile;
  if (!profile) return;
  if (UUID_PATTERN.test(String(profile.id || ''))) {
    void openPublicProfile(profile.id, { fallbackProfile: profile }).then(loaded => {
      if (!loaded && profile.communityFallback === true) {
        renderPublicProfileModal({ ...profile, id: '', community: true });
      }
    });
  } else if (profile.community === true || profile.isOwn === true) {
    renderPublicProfileModal(profile);
  } else {
    showToast('У цього гравця немає доступної публічної картки.', 'info');
  }
}

function addActivityEvent({ player, skin, outcome = 'attempt', profile = null, communityKind = '', activityKind = '' }) {
  // A community event must be rendered from the Worker response, not merely
  // appended to the current tab. Before this guard, a desktop tab could show
  // its own optimistic history while Android correctly showed the shorter
  // server history. Submit first; syncCommunity() applies the canonical event
  // list to both clients as soon as the Worker accepts it.
  if (communityKind && outcome === 'win') {
    announceCommunityActivity(communityKind, skin);
    return;
  }
  const feed = document.getElementById('liveFeed');
  if (!feed || !skin) return;
  const owner = profile || getLiveFeedProfile(player);
  const safeSkinName = escapeHtml(skin.name || 'CS2 Skin');
  const skinImage = getSkinImageSrc(skin);
  const accent = outcome === 'win' ? '#38d996' : outcome === 'loss' ? '#76839b' : '#f4bf50';
  const kindLabel = ({ case: 'кейс', upgrade: 'апгрейд', battle: 'бій', royale: 'royale', contract: 'контракт' })[activityKind || communityKind] || '';
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'live-feed-item live-skin-card';
  el.title = `Показати профіль: ${owner.name}`;
  el._liveProfile = owner;
  el.style.setProperty('--live-accent', accent);
  el.innerHTML = `<span class="live-skin-glow"></span>
    <img src="${escapeHtml(skinImage)}" alt="${safeSkinName}" data-skin-id="${escapeHtml(getSkinKey(skin))}" data-skin-name="${safeSkinName}" decoding="async" onerror="handleSkinImageError(this)">
    <span class="live-skin-tooltip" role="tooltip">
      <span class="live-tooltip-avatar">${escapeHtml((owner.name || '?').slice(0, 1).toUpperCase())}</span>
      <span><strong>${escapeHtml(owner.name || 'Гравець')}</strong><small>${kindLabel ? `${kindLabel} · ` : ''}LVL ${clampNumber(owner.level, 1, 9_999, 1)}${owner.prestige ? ` · P${owner.prestige}` : ''} · натисни, щоб відкрити</small></span>
    </span>`;
  el.addEventListener('click', openLiveFeedProfile);
  feed.prepend(el);
  while (feed.children.length > 14) feed.removeChild(feed.lastElementChild);
}

let liveFeedStarted = false;
function startLiveFeedSimulation() {
  if (liveFeedStarted) return;
  liveFeedStarted = true;
  startCommunitySync();
}

async function fetchSkinCatalog(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`Catalog ${r.status}`);
    const d = await r.json();
    if (!Array.isArray(d) || !d.length) throw new Error('Empty');
    return d;
  } finally {
    clearTimeout(t);
  }
}

async function fetchSkinCatalogPage(offset = 0, limit = SHOP_CATALOG_PAGE_SIZE) {
  const query = new URLSearchParams({ scope: 'all', offset: String(Math.max(0, offset)), limit: String(limit) });
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(`/api/catalog/skins?${query}`, { signal: c.signal });
    if (!r.ok) throw new Error(`Catalog page ${r.status}`);
    const data = await r.json();
    if (!data || !Array.isArray(data.items) || !Number.isFinite(Number(data.total))) throw new Error('Invalid catalog page');
    return data;
  } finally {
    clearTimeout(t);
  }
}

function getShopCatalogSource() {
  return shopCatalogSkins.length ? shopCatalogSkins : CS2_SKINS;
}

function normalizeCatalogPage(items, startIndex = 0) {
  return (Array.isArray(items) ? items : []).map((skin, index) => normalizeCatalogSkin({
    id: skin.id || `shop-${startIndex + index}`,
    name: skin.name,
    weapon: skin.weapon?.name || skin.weapon,
    category: skin.category?.name || skin.category || 'Інше',
    rarity: skin.rarity?.name || skin.rarity || 'Consumer Grade',
    rarityColor: skin.rarity?.color || skin.rarityColor || '#b0c3d9',
    img: skin.image || skin.img,
    wears: skin.wears
  }, startIndex + index)).filter(Boolean);
}

function loadShopCatalogPage() {
  if (shopCatalogPagePromise || !shopCatalogHasMore) return shopCatalogPagePromise || Promise.resolve();
  const offset = shopCatalogNextOffset;
  const countEl = document.getElementById('shopCount');
  if (countEl && document.getElementById('shopModal')?.classList.contains('flex')) countEl.textContent = 'Завантажуємо каталог…';
  shopCatalogPagePromise = (async () => {
    const page = await fetchSkinCatalogPage(offset);
    const incoming = normalizeCatalogPage(page.items, offset);
    if (!incoming.length && Number(page.total) > offset) throw new Error('Empty catalog page');
    const known = new Map(shopCatalogSkins.map(skin => [String(skin.id), skin]));
    incoming.forEach(skin => known.set(String(skin.id), skin));
    shopCatalogSkins = [...known.values()];
    shopCatalogTotal = Math.max(shopCatalogSkins.length, Number(page.total) || 0);
    shopCatalogNextOffset = Number.isFinite(Number(page.nextOffset)) ? Number(page.nextOffset) : shopCatalogSkins.length;
    shopCatalogHasMore = page.nextOffset !== null && page.nextOffset !== undefined && shopCatalogNextOffset > offset;
    populateCategoryFilter();
    if (document.getElementById('shopModal')?.classList.contains('flex')) filterShop();
  })().catch(() => {
    if (countEl && document.getElementById('shopModal')?.classList.contains('flex')) countEl.textContent = 'Каталог тимчасово недоступний';
  }).finally(() => {
    shopCatalogPagePromise = null;
  });
  return shopCatalogPagePromise;
}

let completeSkinCatalogReady = false;
let completeSkinCatalogPromise = null;
const MARKET_PRICE_BATCH_SIZE = 80;
const SHOP_PRICE_RETRY_MS = 60_000;
const shopMarketQuoteRequestedAt = new Map();

function marketDescriptor(skin, wear = WEAR_TIERS[2]) {
  const id = cleanText(skin?.id, 128);
  const code = normalizeWear(wear).code;
  return id ? { id, wear: code } : null;
}

function verifiedMarketPriceForWear(skin, wear = WEAR_TIERS[2]) {
  return stableCatalogPrice(skin, normalizeWear(wear));
}

function marketReadyCatalogSkin(skin, wear = WEAR_TIERS[2]) {
  const normalizedWear = normalizeWear(wear);
  const price = verifiedMarketPriceForWear(skin, normalizedWear);
  return price ? { ...skin, wear: normalizedWear, basePrice: price, marketPrice: price, price } : null;
}

function marketQuoteMeta(skin) {
  return `${STABLE_ECONOMY_SOURCE} · фіксована ціна`;
}

function warmVisibleShopMarketPrices(skins) {
  // Prices are deterministic and already available synchronously. Keeping
  // this no-op avoids reprocessing the whole catalogue while the shop renders.
}

function applyStableCatalogQuotes(quotes) {
  // Retained as a compatibility hook for existing game actions. There is no
  // remote quote to merge into the catalogue under the stable economy.
  return Array.isArray(quotes) && quotes.length > 0;
}

async function syncStableCatalogPrices(skins, wear = WEAR_TIERS[2]) {
  const requested = [...new Map((Array.isArray(skins) ? skins : [])
    .filter(isUsableSkin)
    .map(skin => {
      const descriptor = marketDescriptor(skin, wear);
      return descriptor ? [`${descriptor.id}:${descriptor.wear}`, { skin, ...descriptor }] : null;
    })
    .filter(Boolean)).values()];
  const quotes = requested.map(entry => ({
    available: true,
    id: entry.id,
    wear: entry.wear,
    marketHashName: cleanText(entry.skin.name, 200),
    price: stableCatalogPrice(entry.skin, entry.wear),
    medianPrice: stableCatalogPrice(entry.skin, entry.wear),
    updatedAt: 0,
    sourceUpdatedAt: 0,
    source: STABLE_ECONOMY_SOURCE,
    pricingVersion: STABLE_ECONOMY_VERSION
  }));
  return quotes;
}

function refreshMarketPriceForSkin(skin, wear = WEAR_TIERS[2]) {
  const descriptor = marketDescriptor(skin, wear);
  if (!descriptor) return Promise.resolve(null);
  return syncStableCatalogPrices([skin], wear).then(quotes => quotes.find(quote => quote?.available && String(quote.id) === descriptor.id && quote.wear === descriptor.wear) || null);
}

let inventoryMarketRefreshPromise = null;

function refreshRecentInventoryMarketPrices(limit = 80) {
  if (inventoryMarketRefreshPromise) return inventoryMarketRefreshPromise;
  inventoryMarketRefreshPromise = (async () => {
    let changed = false;
    userInventory = userInventory.map((item, index) => {
      const normalized = normalizeStoredItem({ ...stableCatalogSourceForItem(item), wear: getWear(item) }, index);
      if (normalized && (normalized.price !== item.price || normalized.marketSource !== item.marketSource || normalized.pricingVersion !== item.pricingVersion)) changed = true;
      return normalized || item;
    });
    if (changed) {
      saveState();
      renderInventoryGrid();
      renderProfileInventory();
    }
  })().finally(() => { inventoryMarketRefreshPromise = null; });
  return inventoryMarketRefreshPromise;
}

function loadCompleteSkinCatalog() {
  if (completeSkinCatalogReady) return Promise.resolve();
  if (completeSkinCatalogPromise) return completeSkinCatalogPromise;
  completeSkinCatalogPromise = (async () => {
  try {
    const countEl = document.getElementById('shopCount');
    if (countEl) countEl.textContent = 'Оновлюємо…';

    let cachedSkins = null;
    try {
      const cached = sessionStorage.getItem(STORAGE.catalogCache);
      if (cached) {
        const parsed = JSON.parse(cached);
        const normalized = Array.isArray(parsed)
          ? parsed.map((skin, index) => normalizeCatalogSkin(skin, index)).filter(Boolean)
          : [];
        if (normalized.length > 50) {
          cachedSkins = normalized;
        }
      }
    } catch {}

    if (cachedSkins) {
      CS2_SKINS = cachedSkins;
      completeSkinCatalogReady = true;
      _casePoolCache.clear();
      _caseCostCache.clear();
      _dropChanceCache.clear();
      _caseMetricsCache.clear();
      populateCategoryFilter();
      if (document.getElementById('shopModal')?.classList.contains('flex')) filterShop();
      if (currentPage === 'hub') renderGameHub();
      if (currentPage === 'case') renderCaseButtons();
      // Existing inventory comes first: those values drive every economic
      // action, unlike decorative catalogue cards.
      void refreshRecentInventoryMarketPrices(80);
      return;
    }

    let cat = null;
    for (const ep of CS2_SKINS_APIS) {
      try {
        cat = await fetchSkinCatalog(ep);
        if (cat && cat.length) break;
      } catch {}
    }

    if (!cat) throw new Error('All mirrors failed');

    const normalizedCatalog = cat.map((skin, index) => normalizeCatalogSkin({
      id: skin.id || `cs2-${index}`,
      name: skin.name,
      weapon: skin.weapon?.name,
      category: skin.category?.name || 'Інше',
      rarity: skin.rarity?.name || 'Consumer Grade',
      rarityColor: skin.rarity?.color || '#b0c3d9',
      img: skin.image,
      wears: skin.wears,
      price: stableCatalogPrice(skin, 'FT')
    }, index)).filter(Boolean);
    if (normalizedCatalog.length < 50) throw new Error('Catalog validation failed');
    CS2_SKINS = normalizedCatalog
      .sort((a, b) => a.weapon.localeCompare(b.weapon) || a.name.localeCompare(b.name));
    completeSkinCatalogReady = true;
    _casePoolCache.clear();
    _caseCostCache.clear();
    _dropChanceCache.clear();
    _caseMetricsCache.clear();

    try {
      sessionStorage.setItem(STORAGE.catalogCache, JSON.stringify(CS2_SKINS));
    } catch {}

    populateCategoryFilter();
    if (document.getElementById('shopModal')?.classList.contains('flex')) filterShop();
    if (currentPage === 'hub') renderGameHub();
    if (currentPage === 'case') renderCaseButtons();
    void refreshRecentInventoryMarketPrices(80);
  } catch {
    filteredSkins = CS2_SKINS;
    renderShopGrid(filteredSkins);
    const countEl = document.getElementById('shopCount');
    if (countEl) countEl.textContent = `${CS2_SKINS.length} скінів`;
    renderGameHub();
  }
  })().finally(() => {
    completeSkinCatalogPromise = null;
  });
  return completeSkinCatalogPromise;
}

function populateCategoryFilter() {
  const sel = document.getElementById('shopCategory');
  if (!sel) return;
  const activeValue = sel.value || 'all';
  const cats = [...new Set([...CS2_SKINS, ...shopCatalogSkins].map(s => s.category).filter(Boolean))].sort();
  sel.innerHTML = '<option value="all">Уся зброя</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(CATEGORY_LABELS[c] || c)}</option>`).join('');
  sel.value = cats.includes(activeValue) ? activeValue : 'all';
}

function resetShopFilters() {
  const search = document.getElementById('shopSearch');
  if (search) search.value = '';
  const cat = document.getElementById('shopCategory');
  if (cat) cat.value = 'all';
  const sort = document.getElementById('shopSort');
  if (sort) sort.value = 'name-asc';
  const minP = document.getElementById('shopMinPrice');
  if (minP) minP.value = '';
  const maxP = document.getElementById('shopMaxPrice');
  if (maxP) maxP.value = '';
  filterShop();
}

let filterShopTimeout = null;
function getCatalogRenderPageSize() {
  return getPerformanceMode() === 'lite' ? 36 : 80;
}

function debounceFilterShop() {
  clearTimeout(filterShopTimeout);
  filterShopTimeout = setTimeout(filterShop, 120);
}

function filterShop() {
  const q = (document.getElementById('shopSearch')?.value || '').trim().toLowerCase();
  const cat = document.getElementById('shopCategory')?.value || 'all';
  const sort = document.getElementById('shopSort')?.value || 'name-asc';
  const minP = parseFloat(document.getElementById('shopMinPrice')?.value) || 0;
  const maxP = parseFloat(document.getElementById('shopMaxPrice')?.value) || Infinity;
  const iv = getInputVal();
  const minTarget = iv > 0 ? iv : 0;
  const banner = document.getElementById('shopTargetFilterBanner');
  const targetValEl = document.getElementById('shopTargetFilterValue');

  if (banner) {
    if (iv > 0) {
      banner.classList.remove('hidden');
      if (targetValEl) targetValEl.textContent = formatCredits(iv);
    } else {
      banner.classList.add('hidden');
    }
  }

  let list = getShopCatalogSource().filter(s => {
    if (!isUsableSkin(s)) return false;
    if (cat !== 'all' && s.category !== cat) return false;
    const marketPrice = verifiedMarketPriceForWear(s);
    if (minP > 0 && (!marketPrice || marketPrice < minP)) return false;
    if (maxP !== Infinity && (!marketPrice || marketPrice > maxP)) return false;
    if (minTarget > 0 && (!marketPrice || marketPrice <= minTarget)) return false;
    if (!q) return true;
    return `${s.name} ${s.weapon || ''}`.toLowerCase().includes(q);
  });

  if (sort === 'price-asc') list.sort((a, b) => (verifiedMarketPriceForWear(a) || Number.MAX_SAFE_INTEGER) - (verifiedMarketPriceForWear(b) || Number.MAX_SAFE_INTEGER));
  else if (sort === 'price-desc') list.sort((a, b) => (verifiedMarketPriceForWear(b) || -1) - (verifiedMarketPriceForWear(a) || -1));
  else list.sort((a, b) => a.name.localeCompare(b.name));

  filteredSkins = list;
  visibleSkinCount = getCatalogRenderPageSize();
  renderShopGrid(filteredSkins);
}

function showMoreSkins() {
  if (visibleSkinCount < filteredSkins.length) {
    visibleSkinCount += getCatalogRenderPageSize();
    renderShopGrid(filteredSkins);
    return;
  }
  if (shopCatalogHasMore) void loadShopCatalogPage();
}

function renderShopGrid(skins) {
  const g = document.getElementById('shopGrid');
  if (!g) return;
  const av = skins.filter(isUsableSkin);
  const shown = av.slice(0, visibleSkinCount);
  const countEl = document.getElementById('shopCount');
  if (countEl) {
    const total = Math.max(0, Number(shopCatalogTotal) || 0);
    countEl.textContent = total && shopCatalogSkins.length
      ? `${av.length.toLocaleString('uk-UA')} з ${total.toLocaleString('uk-UA')} скінів`
      : `${av.length.toLocaleString('uk-UA')} скінів`;
  }
  const moreBtn = document.getElementById('shopMoreBtn');
  if (moreBtn) {
    const canShowLoaded = shown.length < av.length;
    moreBtn.classList.toggle('hidden', !canShowLoaded && !shopCatalogHasMore);
    moreBtn.textContent = canShowLoaded ? 'Показати ще' : 'Завантажити ще скіни';
  }

  if (!shown.length) {
    g.innerHTML = '<div class="col-span-full py-16 text-center"><i class="fa-solid fa-crosshairs text-3xl text-amber-500/40 mb-3"></i><p class="font-bold text-gray-300">Не знайдено</p></div>';
    return;
  }

  g.innerHTML = shown.map(s => {
    const rarity = getItemRarity(s);
    const marketPrice = verifiedMarketPriceForWear(s);
    const priceMarkup = marketPrice
      ? `<p class="text-amber-400 font-extrabold text-xs mt-0.5">${formatCredits(marketPrice)}</p><p class="text-[9px] text-gray-500">${escapeHtml(marketQuoteMeta(s))}</p>`
      : '<p class="text-cyan-300 font-extrabold text-[11px] mt-1"><i class="fa-solid fa-arrows-rotate fa-spin-pulse mr-1"></i>Оновлюємо Steam</p><p class="text-[9px] text-gray-500">ціна ще не підтверджена</p>';
    return `<article data-skin-card="${escapeHtml(getSkinKey(s))}" class="skin-card rarity-surface relative bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 transition group focus-within:border-amber-500" style="--rarity-color:${rarity.color}">
      <button type="button" data-select-skin-id="${escapeHtml(getSkinKey(s))}" class="w-full text-left flex flex-col items-center justify-between focus:outline-none">
        <img src="${escapeHtml(getSkinImageSrc(s))}" alt="${escapeHtml(s.name)}" data-skin-id="${escapeHtml(getSkinKey(s))}" data-skin-name="${escapeHtml(s.name)}" class="h-20 w-full object-contain group-hover:scale-105 transition image-skeleton" loading="lazy" onerror="handleSkinImageError(this)">
        <div class="text-center w-full mt-2 min-w-0">
          <p class="font-bold text-xs text-white truncate" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</p>
          ${priceMarkup}
        </div>
      </button>
      <button type="button" data-favorite-toggle="${escapeHtml(getSkinKey(s))}" title="Улюблене" class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border ${isFavorite(s) ? 'border-amber-400/60 bg-amber-500 text-black' : 'border-gray-700 bg-black/60 text-gray-400 hover:border-amber-400 hover:text-amber-300'}">
        <i class="${isFavorite(s) ? 'fa-solid' : 'fa-regular'} fa-heart text-xs"></i>
      </button>
      ${rarityStripMarkup(rarity, 'shop-rarity-bar')}
    </article>`;
  }).join('');

  warmVisibleShopMarketPrices(shown);

  g.querySelectorAll('[data-select-skin-id]').forEach(b => b.addEventListener('click', () => {
    const s = getSkinByKey(b.dataset.selectSkinId);
    if (s) selectTargetItem(s);
  }));
  g.querySelectorAll('[data-favorite-toggle]').forEach(b => b.addEventListener('click', () => toggleFavorite(b.dataset.favoriteToggle)));
}

/* Initialization */
window.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  loadState();
  void loadRuntimeContent();
  captureReferralFromUrl();
  void enableHalloweenAdminPreview();

  if (localStorage.getItem(STORAGE.consent) !== 'accepted') {
    document.body.classList.add('consent-locked');
    const el = document.getElementById('riskNotice');
    el?.classList.remove('hidden');
    el?.classList.add('flex');
  }

  renderCanvas(0);
  renderInventoryGrid();
  renderShopGrid(CS2_SKINS);
  renderMultiSlots();
  renderContractSlots();
  renderProfileInventory();
  void (async () => {
    const returnedFromSteam = await processSteamCallback();
    if (!returnedFromSteam) await restoreSteamSession();
    void activatePendingReferral();
    const requestedProfile = new URLSearchParams(location.search).get('profile');
    if (UUID_PATTERN.test(String(requestedProfile || ''))) void openPublicProfile(requestedProfile);
  })();
  renderCaseButtons();

  // Keep first paint small: the full skin catalog is fetched lazily when its
  // modal is opened. Cases work from the bundled curated pool immediately.
  startLiveFeedSimulation();
  startPresenceTracking();
  updateTopupUI();
  renderCaseTopDrops();
  updateFreeCaseBtn();
  renderCaseButtons();

  refreshInventoryModal();
  updateGiftButtonUI();
  updateTopupUI();
  updateFreeCaseBtn();

  const startPage = location.hash.replace('#', '') || localStorage.getItem(STORAGE.page) || 'hub';
  showPage(PAGES.includes(startPage) ? startPage : 'hub');

  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) closeModal(el.id);
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = getTopOpenModal();
      if (modal) {
        e.preventDefault();
        closeModal(modal.id);
      }
      return;
    }
    if (e.key !== 'Tab') return;
    const modal = getTopOpenModal();
    if (!modal) return;
    const focusables = getModalFocusables(modal);
    const panel = prepareModalAccessibility(modal);
    if (!focusables.length) {
      e.preventDefault();
      panel?.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });

  // Master interval timer for reset texts, daily roll, gift and free case cooldowns
  setInterval(() => {
    if (!gameState) return;
    const halloweenDate = getHalloweenEventStatus().date;
    if (halloweenEventDateKey !== halloweenDate) {
      halloweenEventDateKey = halloweenDate;
      renderGameHub();
      renderCaseCatalog();
      if (currentPage) document.title = `${getPageDisplayTitle(currentPage)} · ${getActiveBrandName()}`;
    }
    const prevD = gameState.daily.date;
    const today = getTodayKey();
    if (prevD !== today) {
      ensureDailyState();
      renderGameHub();
      saveState();
      showToast('🎉 Нові щоденні завдання!', 'success');
      soundWin();
    }
    const prevW = gameState.weekly.week;
    const thisWeek = getWeekKey();
    if (prevW !== thisWeek) {
      ensureWeeklyState();
      renderGameHub();
      saveState();
      showToast('📅 Нові тижневі місії!', 'success');
      soundWin();
    }
    const dr = document.getElementById('dailyResetText');
    if (dr) {
      const now = new Date(), mid = new Date(now);
      mid.setHours(24, 0, 0, 0);
      const ms = Math.max(0, mid - now);
      const hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000), ss = Math.floor((ms % 60000) / 1000);
      dr.textContent = `Оновлення через ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }
    updateGiftButtonUI();
    updateFreeCaseBtn();
  }, 1000);
});

// Expose globals for HTML inline onclick attributes
window.showPage = showPage;
window.toggleThemeMenu = toggleThemeMenu;
window.pickTheme = pickTheme;
window.switchInputMode = switchInputMode;
window.openInventoryOrFocus = openInventoryOrFocus;
window.setStake = setStake;
window.updateBalanceStake = updateBalanceStake;
window.setRollMode = setRollMode;
window.executeUpgrade = executeUpgrade;
window.clearMultiInput = clearMultiInput;
window.removeFromMulti = removeFromMulti;
window.openPowerCase = openPowerCase;
window.openFreeDailyCase = openFreeDailyCase;
window.startCaseReel = startCaseReel;
window.showCaseDetails = showCaseDetails;
window.claimCaseCollectionTrophy = claimCaseCollectionTrophy;
window.CASE_TYPES = CASE_TYPES;
window.setCaseCategory = setCaseCategory;
window.setCaseMultiplier = setCaseMultiplier;
window.setCaseTicketMode = setCaseTicketMode;
window.renderCaseCatalog = renderCaseCatalog;
window.openCurrentCaseFromDetails = openCurrentCaseFromDetails;
window.quickSellCaseResult = quickSellCaseResult;
window.sendCaseDropToUpgrader = sendCaseDropToUpgrader;
window.repeatCaseOpen = repeatCaseOpen;
window.repeatDropAction = repeatDropAction;
window.pickBattlePlayerItem = pickBattlePlayerItem;
window.rerollBattleBot = rerollBattleBot;
window.findBattleOpponent = findBattleOpponent;
window.setBattleLobbyTab = setBattleLobbyTab;
window.refreshBattleListings = refreshBattleListings;
window.createBattleListing = createBattleListing;
window.startBattle = startBattle;
window.pickContractSlot = pickContractSlot;
window.clearContract = clearContract;
window.executeContract = executeContract;
window.claimDailyTask = claimDailyTask;
window.claimWeeklyTask = claimWeeklyTask;
window.claimPowerRun = claimPowerRun;
window.openCollectionReward = openCollectionReward;
window.openShowcaseManager = openShowcaseManager;
window.sellAllDuplicates = sellAllDuplicates;
window.openInventoryModalFromProfile = openInventoryModalFromProfile;
window.setInventoryFilter = setInventoryFilter;
window.setInventorySort = setInventorySort;
window.setInventorySource = setInventorySource;
window.setInventoryWear = setInventoryWear;
window.setInventoryCollection = setInventoryCollection;
window.renderProfileInventory = renderProfileInventory;
window.debounceFilterShop = debounceFilterShop;
window.filterShop = filterShop;
window.resetShopFilters = resetShopFilters;
window.showMoreSkins = showMoreSkins;
window.toggleFavorite = toggleFavorite;
window.openWishlistModal = openWishlistModal;
window.openWishlistCatalog = openWishlistCatalog;
window.setTheme = setTheme;
window.setPerformanceMode = setPerformanceMode;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleSound = toggleSound;
window.toggleMusic = toggleMusic;
window.toggleHaptics = toggleHaptics;
window.shareLatestMoment = shareLatestMoment;
window.openLegendDossier = openLegendDossier;
window.shareLegendDossier = shareLegendDossier;
window.copyLegendDossierLink = copyLegendDossierLink;
window.claimDailyBonus = claimDailyBonus;
window.openDailyCalendar = openDailyCalendar;
window.claimDailyCalendarReward = claimDailyCalendarReward;
window.setProfileStyle = setProfileStyle;
window.openModal = openModal;
window.closeModal = closeModal;
window.copyPublicProfileLink = copyPublicProfileLink;
window.unpublishPublicProfile = unpublishPublicProfile;
window.openPublicProfileSearch = openPublicProfileSearch;
window.submitPublicProfileSearch = submitPublicProfileSearch;
window.openPublicProfile = openPublicProfile;
window.openOwnBattleRoom = openOwnBattleRoom;
window.joinPublicProfileBattle = joinPublicProfileBattle;
window.leaveBattleRoom = leaveBattleRoom;
window.startSteamLogin = startSteamLogin;
window.continueSteamLogin = continueSteamLogin;
window.syncSteamInventory = syncSteamInventory;
window.disconnectSteam = disconnectSteam;
window.deleteSteamAccount = deleteSteamAccount;
window.dismissSteamNudge = dismissSteamNudge;
window.handleSteamAvatarError = handleSteamAvatarError;
window.handleCaseArtworkError = handleCaseArtworkError;
window.saveAccountNick = saveAccountNick;
window.createCloudProfile = createCloudProfile;
window.saveCloudProfile = saveCloudProfile;
window.loadCloudProfile = loadCloudProfile;
window.saveSteamAccount = saveSteamAccount;
window.loadSteamAccount = loadSteamAccount;
window.openCloudRecoveryModal = openCloudRecoveryModal;
window.copyCloudRecoveryCode = copyCloudRecoveryCode;
window.openCloudConnectModal = openCloudConnectModal;
window.connectCloudProfile = connectCloudProfile;
window.verifyLastFairRound = verifyLastFairRound;
window.doPrestige = doPrestige;
window.topupWatchAd = topupWatchAd;
window.openRewardedAd = openRewardedAd;
window.topupShareSite = topupShareSite;
window.topupLevelReward = topupLevelReward;
window.updateConsentButton = updateConsentButton;
window.acceptRiskNotice = acceptRiskNotice;
window.useImageFallback = useImageFallback;
window.handleSkinImageError = handleSkinImageError;
window.royaleAddSkin = royaleAddSkin;
window.royaleRemoveSkin = royaleRemoveSkin;
window.startRoyale = startRoyale;
window.resetRoyale = resetRoyale;
window.initRoyalePage = initRoyalePage;
window.setRoyaleMode = setRoyaleMode;
window.renderRoyaleHistory = renderRoyaleHistory;
window.applyMultiplierPreset = applyMultiplierPreset;
window.applySuggestion = applySuggestion;
window.chainUpgradeWonSkin = chainUpgradeWonSkin;
window.quickSellUpgradedSkin = quickSellUpgradedSkin;
window.renderSmartSuggestions = renderSmartSuggestions;
