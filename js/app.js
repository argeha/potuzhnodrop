/* ============ ПОТУЖНО DROP 3.7 ============ */
const STORAGE = {
  consent: 'potuzhno_v5_notice',
  page: 'potuzhno_v5_page',
  steamId: 'potuzhno_v2_steamid',
  balance: 'potuzhno_v2_balance',
  inventory: 'potuzhno_v2_inventory',
  started: 'potuzhno_v2_started',
  bonusAt: 'potuzhno_v2_last_bonus',
  sound: 'potuzhno_v2_sound',
  game: 'potuzhno_v6_game',
  account: 'potuzhno_v6_account',
  topup: 'potuzhno_v5_topup',
  freeCase: 'potuzhno_v5_freecase',
  catalogCache: 'potuzhno_catalog_cache_v38',
  pendingWager: 'potuzhno_v6_pending_wager'
};

const PAGES = ['upgrader', 'case', 'battle', 'royale', 'contract', 'tasks', 'profile', 'about'];

let currentPage = null;
function showPage(id) {
  if (!PAGES.includes(id)) id = 'upgrader';
  if (currentPage === id && document.querySelector(`[data-page="${id}"]:not(.hidden)`)) {
    return;
  }
  currentPage = id;

  document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('hidden', el.dataset.page !== id));
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === id));
  document.querySelectorAll('[data-mobile-nav]').forEach(el => el.classList.toggle('active', el.dataset.mobileNav === id));

  localStorage.setItem(STORAGE.page, id);
  if (location.hash.replace('#', '') !== id) {
    location.hash = id;
  }

  document.getElementById('mobileMenu')?.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'case') {
    updateFreeCaseBtn();
    renderCaseCatalog();
  }
  if (id === 'tasks') renderGameHub();
  if (id === 'profile') {
    renderGameHub();
    renderProfileInventory();
    renderAllTime();
    renderRecentAch();
  }
  if (id === 'battle') resetCoinVisual();
  if (id === 'royale') {
    // Do not replace the participants while an existing spin still owns them.
    if (!royaleInProgress) resetRoyale();
    setTimeout(initRoyalePage, 30);
  }
}

window.addEventListener('hashchange', () => {
  const h = location.hash.replace('#', '') || 'upgrader';
  if (PAGES.includes(h) && h !== currentPage) showPage(h);
});

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

function rollWear() {
  const r = Math.random();
  if (r < 0.10) return WEAR_TIERS[0];
  if (r < 0.28) return WEAR_TIERS[1];
  if (r < 0.75) return WEAR_TIERS[2];
  if (r < 0.90) return WEAR_TIERS[3];
  return WEAR_TIERS[4];
}

function getWear(i) {
  return normalizeWear(i?.wear);
}

function priceWithWear(b, w) {
  return Math.max(1, Math.round((Number(b) || 0) * (w?.mult || 1)));
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

const CS2_SKINS_APIS = [
  // The function is the primary source. The mirrors keep the full catalogue
  // available when a serverless function is cold-starting or temporarily down.
  '/api/catalog/skins',
  'https://cdn.jsdelivr.net/gh/ByMykel/CSGO-API@main/public/api/en/skins.json',
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json'
];

// These are the prominent demonstration skins. Their DC values are tuned for
// the game's case and upgrade economy instead of mirroring expensive real-world sales.
const FEATURED_SKIN_PRICES = Object.freeze({
  '★ Butterfly Knife | Doppler': 8600,
  '★ Karambit | Fade': 9800,
  '★ M9 Bayonet | Marble Fade': 7200,
  '★ Karambit | Doppler': 8400,
  'AWP | Dragon Lore': 14000,
  'AWP | Asiimov': 1550,
  'AWP | Atheris': 140,
  'AK-47 | Case Hardened': 3900,
  'AK-47 | Redline': 500,
  'M4A1-S | Printstream': 1800,
  'M4A4 | Howl': 12000,
  'Desert Eagle | Printstream': 1000,
  'USP-S | Kill Confirmed': 1300,
  'Glock-18 | Water Elemental': 240,
  'AWP | Neo-Noir': 600,
  'AWP | Wildfire': 1900,
  'AK-47 | Asiimov': 850,
  'Glock-18 | Fade': 2600,
  'P250 | See Ya Later': 260
});

CS2_SKINS = CS2_SKINS.map(skin => ({
  ...skin,
  price: FEATURED_SKIN_PRICES[skin.name] ?? skin.price
}));

const MAX_STORED_ITEM_VALUE = 1_000_000;
const MAX_STORED_BALANCE = 10_000_000;
const TRUSTED_IMAGE_HOSTS = new Set([
  'community.cloudflare.steamstatic.com',
  'community.akamai.steamstatic.com',
  'avatars.steamstatic.com',
  'avatars.akamai.steamstatic.com',
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
  const basePrice = clampNumber(item.basePrice ?? item.price, 1, MAX_STORED_ITEM_VALUE, 1);
  const wear = normalizeWear(item.wear);
  return {
    id,
    sourceSkinId: cleanText(item.sourceSkinId || item.id || '', 128),
    name,
    rarity: cleanText(item.rarity || 'CS2', 48),
    rarityColor: cleanColor(item.rarityColor),
    img: cleanImageUrl(item.img),
    basePrice,
    wear,
    price: priceWithWear(basePrice, wear),
    virtual: item.virtual !== false,
    exclusive: item.exclusive === true,
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
  return {
    id: cleanText(skin.id || `cs2-${index}`, 128),
    name,
    weapon,
    category,
    rarity: cleanText(skin.rarity || 'Consumer Grade', 48),
    rarityColor: cleanColor(skin.rarityColor),
    img,
    price: clampNumber(skin.price, 1, MAX_STORED_ITEM_VALUE, 1)
  };
}

let currentUser = null;
let userInventory = [];
let soundEnabled = true;
let filteredSkins = CS2_SKINS;
let visibleSkinCount = 80;
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

let battlePlayerItem = null;
let battleBotItem = null;
let battleInProgress = false;

let contractItems = [null, null, null, null, null];
let contractActiveSlot = -1;

let profileInvFilter = 'all';
let profileInvSort = 'price-desc';

const DEMO_STARTING_BALANCE = 1200;
const SAFE_MODE_CHANCE_MULTIPLIER = 1.15;
const BONUS_MODE_RATE = 0.05;
const POWER_CASE_COST = 300;
const FREE_CASE_COOLDOWN = 24 * 60 * 60 * 1000;
const XP_PER_ROUND = 80;
const XP_WIN_BONUS = 70;
const XP_PER_CASE = 45;
const ROUND_HISTORY_LIMIT = 20;
const SELL_RATE = 0.9;
const CHANCE_K = 0.92;
const CHANCE_POWER = 1.0;
const CHANCE_MAX = 80;
const CHANCE_MIN = 0.50;

/* ===== KEY-DROP EDITION: КАТАЛОГ КЕЙСІВ ===== */
const CASE_TYPES = {
  // HOT & LIMITED
  dragon_lair: {
    id: 'dragon_lair',
    name: "Dragon's Lair",
    cost: 4800,
    category: 'hot',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'red',
    desc: 'AWP Dragon Lore, Fire Serpent та топові скіни',
    filter: s => (s.price >= 800 && (s.name.includes('Dragon Lore') || s.name.includes('Fire Serpent') || s.name.includes('Printstream') || s.name.includes('Fade') || s.name.includes('★')))
  },
  covert_ops: {
    id: 'covert_ops',
    name: 'Covert Ops',
    cost: 2200,
    category: 'hot',
    badge: 'EXCLUSIVE',
    badgeClass: 'badge-exclusive',
    theme: 'purple',
    desc: 'Тільки таємна зброя найвищого рангу',
    filter: s => (s.rarity === 'Covert' || s.rarity === 'Extraordinary') && s.price >= 300
  },
  beast_mode: {
    id: 'beast_mode',
    name: 'Beast Mode',
    cost: 1400,
    category: 'hot',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'pink',
    desc: 'Hyper Beast, Asiimov, Neo-Noir та неонові скіни',
    filter: s => s.name.includes('Hyper Beast') || s.name.includes('Asiimov') || s.name.includes('Neo-Noir') || s.name.includes('Mecha') || (s.price >= 250 && s.price <= 8000)
  },

  // KNIVES
  butterfly_fever: {
    id: 'butterfly_fever',
    name: 'Butterfly Fever',
    cost: 9500,
    category: 'knives',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'gold',
    desc: 'Шанс на Butterfly Knife: Doppler, Fade, Marble',
    filter: s => s.name.includes('Butterfly Knife') || (s.name.includes('★') && s.price >= 30000)
  },
  karambit_rush: {
    id: 'karambit_rush',
    name: 'Karambit Rush',
    cost: 8200,
    category: 'knives',
    badge: 'EXCLUSIVE',
    badgeClass: 'badge-exclusive',
    theme: 'blue',
    desc: 'Легендарні керамбіти від Fade до Autotronic',
    filter: s => s.name.includes('Karambit') || (s.name.includes('★') && s.price >= 25000)
  },
  knife_club: {
    id: 'knife_club',
    name: 'Knife Club',
    cost: 3800,
    category: 'knives',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'gold',
    desc: 'Ножі різної цінності та рідкісний шанс на топ-дроп',
    filter: s => s.name.includes('★') && !s.name.includes('Gloves') && !s.name.includes('Wraps')
  },

  // GLOVES
  sport_gloves: {
    id: 'sport_gloves',
    name: 'Sport Edition',
    cost: 5900,
    category: 'gloves',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'blue',
    desc: 'Рідкісні Sport Gloves: Vice, Pandora, Amphibious',
    filter: s => s.name.includes('Sport Gloves') || (s.name.includes('Gloves') && s.price >= 10000)
  },
  moto_special: {
    id: 'moto_special',
    name: 'Moto & Specialist',
    cost: 3200,
    category: 'gloves',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'purple',
    desc: 'Стильні рукавиці Moto, Specialist та Hand Wraps',
    filter: s => s.name.includes('Gloves') || s.name.includes('Wraps')
  },

  // WEAPONS
  awp_king: {
    id: 'awp_king',
    name: 'AWP King',
    cost: 1650,
    category: 'weapons',
    badge: 'HOT',
    badgeClass: 'badge-hot',
    theme: 'purple',
    desc: 'Снайперська еліта: Dragon Lore, Gungnir, Asiimov',
    filter: s => s.name.includes('AWP')
  },
  ak47_master: {
    id: 'ak47_master',
    name: 'AK-47 Master',
    cost: 1250,
    category: 'weapons',
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    theme: 'gold',
    desc: 'Wild Lotus, Case Hardened, Vulcan, Fuel Injector',
    filter: s => s.name.includes('AK-47')
  },
  m4_storm: {
    id: 'm4_storm',
    name: 'M4A4 / M4A1-S',
    cost: 850,
    category: 'weapons',
    badge: 'NEW',
    badgeClass: 'badge-new',
    theme: 'blue',
    desc: 'Howl, Printstream, Player Two, Decimator, Hot Rod',
    filter: s => s.name.includes('M4A4') || s.name.includes('M4A1-S')
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
    desc: 'Баланс ціни та високих шансів на окуп',
    filter: s => s.price >= 80 && s.price <= 2500
  },
  lucky_strike: {
    id: 'lucky_strike',
    name: 'Lucky Strike',
    cost: 150,
    category: 'budget',
    badge: 'LUCKY',
    badgeClass: 'badge-new',
    theme: 'emerald',
    desc: 'Невеликий ризик з шансом на дроп за 5000+ DC',
    filter: s => s.price >= 30 && s.price <= 6000
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
    filter: s => s.price >= 15 && s.price <= 500
  },

  // Backwards compatibility aliases
  budget: { id: 'budget', aliasTo: 'farm_rush', cost: 100, name: 'Бюджетний кейс', category: 'budget', theme: 'gray' },
  standard: { id: 'standard', aliasTo: 'budget_covert', cost: 300, name: 'Стандартний кейс', category: 'budget', theme: 'gold' },
  premium: { id: 'premium', aliasTo: 'awp_king', cost: 1000, name: 'Преміум кейс', category: 'weapons', theme: 'purple' },
  legendary: { id: 'legendary', aliasTo: 'dragon_lair', cost: 5000, name: 'Легендарний кейс', category: 'hot', theme: 'red' }
};

/* ===== ВБУДОВАНІ SVG-КЕЙСИ KEY-DROP СТИЛЮ ===== */
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
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
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
  dragon_lair:      'assets/cases/dragon-lair-v3.png',
  covert_ops:       'assets/cases/covert-ops-v3.png',
  beast_mode:       'assets/cases/beast-mode-v3.png',
  butterfly_fever:  'assets/cases/butterfly-fever-v3.png',
  karambit_rush:    'assets/cases/karambit-rush-v3.png',
  knife_club:       'assets/cases/knife-club-v3.png',
  sport_gloves:     'assets/cases/sport-gloves-v3.png',
  moto_special:     'assets/cases/moto-special-v3.png',
  awp_king:         'assets/cases/awp-king-v3.png',
  ak47_master:      'assets/cases/ak47-master-v3.png',
  m4_storm:         'assets/cases/m4-storm-v3.png',
  budget_covert:    'assets/cases/budget-covert-v3.png',
  lucky_strike:     'assets/cases/lucky-strike-v3.png',
  farm_rush:        'assets/cases/farm-rush-v3.png'
});

function createCaseArtwork(caseId, caseName, theme) {
  const artwork = CASE_ARTWORK[caseId];
  if (!artwork) return createCaseSVG(theme || 'gold');
  return `<img src="${artwork}" alt="${escapeHtml(caseName)}" class="case-art" loading="lazy">`;
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
  { id: 'sellv_2000', title: 'Продай на 2 000 DC', goal: 2000, reward: 260, icon: 'fa-coins', value: s => s.sellValue },
  { id: 'sellv_10000', title: 'Продай на 10 000 DC', goal: 10000, reward: 580, icon: 'fa-coins', value: s => s.sellValue },
  { id: 'battle_1', title: 'Зіграй 1 бій', goal: 1, reward: 150, icon: 'fa-swords', value: s => s.battles },
  { id: 'battle_win_1', title: 'Переможи в бою', goal: 1, reward: 320, icon: 'fa-swords', value: s => s.battleWins },
  { id: 'battle_win_3', title: 'Переможи в 3 боях', goal: 3, reward: 650, icon: 'fa-swords', value: s => s.battleWins },
  { id: 'contract_1', title: 'Уклади 1 контракт', goal: 1, reward: 280, icon: 'fa-boxes-packing', value: s => s.contracts },
  { id: 'contract_3', title: 'Уклади 3 контракти', goal: 3, reward: 680, icon: 'fa-boxes-packing', value: s => s.contracts },
  { id: 'credit_1', title: 'Апгрейд кредитами', goal: 1, reward: 90, icon: 'fa-coins', value: s => s.creditInputs },
  { id: 'multi_1', title: 'Мульти-апгрейд (2+)', goal: 1, reward: 150, icon: 'fa-layer-group', value: s => s.multiInputs },
  { id: 'multi_3', title: 'Мульти-апгрейд 3 рази', goal: 3, reward: 360, icon: 'fa-layer-group', value: s => s.multiInputs },
  { id: 'bigwin_500', title: 'Виграй предмет від 500 DC', goal: 500, reward: 180, icon: 'fa-gem', value: s => s.bestWinValue },
  { id: 'bigwin_2000', title: 'Виграй предмет від 2 000 DC', goal: 2000, reward: 420, icon: 'fa-gem', value: s => s.bestWinValue },
  { id: 'bigwin_10000', title: 'Виграй предмет від 10 000 DC', goal: 10000, reward: 950, icon: 'fa-gem', value: s => s.bestWinValue },
  { id: 'target_3000', title: 'Сума виграшів 3 000 DC', goal: 3000, reward: 300, icon: 'fa-coins', value: s => s.targetValue },
  { id: 'target_20000', title: 'Сума виграшів 20 000 DC', goal: 20000, reward: 850, icon: 'fa-coins', value: s => s.targetValue },
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
  const pool = [...TASK_POOL];
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
  { id: 'w_bigwin_5k', title: 'Виграш на 5 000 DC за тиждень', goal: 5000, reward: 1000, icon: 'fa-gem', value: s => s.bestWinValue },
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
  const pool = [...WEEKLY_TASK_POOL];
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
  { id: 'high-value', title: 'Велика ціль', description: 'Виграй предмет від 10 000 DC', reward: 500, icon: 'fa-gem', met: () => (gameState?.stats?.bestValue || 0) >= 10000 },
  { id: 'case-opener', title: 'Кейсоман', description: 'Відкрий 3 кейси', reward: 250, icon: 'fa-boxes-stacked', met: () => (gameState?.stats?.cases || 0) >= 3 },
  { id: 'seller', title: 'Торговець', description: 'Продай 5 предметів', reward: 300, icon: 'fa-sack-dollar', met: () => (gameState?.stats?.sells || 0) >= 5 },
  { id: 'fighter', title: 'Боєць', description: 'Виграй 3 бої', reward: 400, icon: 'fa-swords', met: () => (gameState?.stats?.battles || 0) >= 3 },
  { id: 'contractor', title: 'Контрактер', description: 'Уклади 3 контракти', reward: 350, icon: 'fa-boxes-packing', met: () => (gameState?.stats?.contracts || 0) >= 3 },
  { id: 'prestige-once', title: 'Корона', description: 'Зроби перший престиж', reward: 1000, icon: 'fa-crown', met: () => (gameState?.prestige || 0) >= 1 },
  { id: 'roll-100', title: 'Роллер-легенда', description: '100 роллів за весь час', reward: 800, icon: 'fa-dice', met: () => (gameState?.allTime?.rounds || 0) >= 100 },
  { id: 'roll-500', title: 'Невтомний', description: '500 роллів за весь час', reward: 2500, icon: 'fa-dice', met: () => (gameState?.allTime?.rounds || 0) >= 500 },
  { id: 'streak-7', title: 'Нестримний', description: '7 перемог поспіль', reward: 900, icon: 'fa-fire', met: () => (gameState?.stats?.bestStreak || 0) >= 7 },
  { id: 'rich-50k', title: 'Багатій', description: 'Баланс 50 000 DC', reward: 1500, icon: 'fa-coins', met: () => currentUser && currentUser.balance >= 50000 },
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

const MOCK_LEADERBOARD = [
  { name: 'sabb_s1', xp: 14250 },
  { name: 'zheksve1', xp: 11800 },
  { name: 'argehabeats', xp: 9640 },
  { name: 'Bohdan_47', xp: 7320 },
  { name: 'Voxxa', xp: 5810 },
  { name: 'm0rsik', xp: 4230 },
  { name: 'Fennec', xp: 3100 },
  { name: 'Raven_ua', xp: 1980 }
];

const AVATAR_URL = 'https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

function formatCredits(v) {
  return `${Math.max(0, Math.round(Number(v) || 0)).toLocaleString('uk-UA')} DC`;
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
    allTime: createDefaultAllTime(),
    achievements: {},
    favorites: [],
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
      allTime: { ...createDefaultAllTime(), ...(s.allTime || {}) },
      achievements: s.achievements || {},
      favorites: Array.isArray(s.favorites) ? s.favorites.map(String) : [],
      rounds: Array.isArray(s.rounds) ? s.rounds.slice(0, ROUND_HISTORY_LIMIT) : [],
      collectionRewards: s.collectionRewards || {}
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
  return Math.floor((gameState?.xp || 0) / 750) + 1;
}

function getLevelProgress() {
  const xp = gameState?.xp || 0;
  return { current: xp % 750, total: 750, percent: ((xp % 750) / 750) * 100 };
}

function addXp(v) {
  if (!gameState) return;
  gameState.xp = Math.max(0, gameState.xp + Math.round((v || 0) * getXpMultiplier()));
}

function loadAccount() {
  try {
    const r = localStorage.getItem(STORAGE.account);
    if (r) account = JSON.parse(r);
  } catch {}
  if (!account) {
    account = { nick: 'Гравець_' + Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: Date.now() };
    localStorage.setItem(STORAGE.account, JSON.stringify(account));
  }
  if (currentUser?.steamId && !account.steamId) {
    account.steamId = currentUser.steamId;
    account.nick = `Steam_${currentUser.steamId.slice(-4)}`;
    localStorage.setItem(STORAGE.account, JSON.stringify(account));
  }
}

function saveAccountNick() {
  const i = document.getElementById('accountNickInput');
  const nick = String(i?.value || '').trim().slice(0, 24);
  if (!nick) {
    showToast('Введи нікнейм', 'warn');
    return;
  }
  account.nick = nick;
  localStorage.setItem(STORAGE.account, JSON.stringify(account));
  if (currentUser) currentUser.name = nick;
  updateAccountUI();
  saveState();
  renderGameHub();
  showToast('Нікнейм збережено', 'success');
}

function updateAccountUI() {
  const n = document.getElementById('profileName');
  if (n) n.textContent = account?.nick || 'Гість';
  const i = document.getElementById('accountNickInput');
  if (i && !i.value) i.value = account?.nick || '';
  const s = document.getElementById('accountSteamId');
  if (s) s.textContent = currentUser?.steamId || 'не підключено';
  const x = document.getElementById('accountXp');
  if (x) x.textContent = String(gameState?.xp || 0);
  const lv = document.getElementById('accountLevel');
  if (lv) lv.textContent = String(getPlayerLevel());
  updatePrestigeUI();
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
  if (btn) btn.disabled = getPlayerLevel() < 10;
  const pBtn = document.getElementById('prestigeBtn');
  if (pBtn) pBtn.disabled = getPlayerLevel() < 10;
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
  image.src = source || createSkinPreview(image.dataset.skinName);
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
  if (location === 'case' && img) {
    img.src = createSkinPreview(img.dataset.skinName || 'CS2');
  }
}

function makeDemoItem(skin, suffix = '') {
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
    price: clampNumber(skin?.basePrice ?? skin?.price, 1, MAX_STORED_ITEM_VALUE, 1)
  };
  const wear = skin.wear ? normalizeWear(skin.wear) : rollWear();
  const basePrice = clampNumber(skin.basePrice ?? safeSkin.price, 1, MAX_STORED_ITEM_VALUE, 1);
  return {
    ...safeSkin,
    sourceSkinId: cleanText(skin.sourceSkinId || safeSkin.id, 128),
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${suffix}`,
    basePrice,
    wear,
    price: priceWithWear(basePrice, wear),
    virtual: true,
    exclusive: skin.exclusive === true,
    addedAt: Date.now()
  };
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

function saveState() {
  if (currentUser) {
    if (currentUser.steamId) localStorage.setItem(STORAGE.steamId, currentUser.steamId);
    localStorage.setItem(STORAGE.balance, String(currentUser.balance));
  }
  localStorage.setItem(STORAGE.inventory, JSON.stringify(userInventory));
  localStorage.setItem(STORAGE.started, '1');
  if (gameState) localStorage.setItem(STORAGE.game, JSON.stringify(gameState));
  if (account) localStorage.setItem(STORAGE.account, JSON.stringify(account));
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

function loadState() {
  loadGameState();
  loadAccount();
  const sid = localStorage.getItem(STORAGE.steamId);
  const started = localStorage.getItem(STORAGE.started) === '1';
  const bal = clampNumber(localStorage.getItem(STORAGE.balance), 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE);
  soundEnabled = localStorage.getItem(STORAGE.sound) !== 'off';
  updateSoundUI();

  try {
    userInventory = JSON.parse(localStorage.getItem(STORAGE.inventory) || '[]');
  } catch {
    userInventory = [];
  }

  userInventory = Array.isArray(userInventory)
    ? userInventory.map((item, index) => normalizeStoredItem(item, index)).filter(Boolean)
    : [];

  currentUser = {
    steamId: sid || null,
    name: account?.nick || 'Гість',
    balance: bal,
    avatar: AVATAR_URL
  };

  if (!started) {
    currentUser.balance = DEMO_STARTING_BALANCE;
    userInventory = createStarterInventory();
    saveState();
  }

  recoverInterruptedWager();

  applyLoggedInUI();
  updateAccountUI();
  renderGameHub();
  updateGiftButtonUI();
  updateThemeMenuState();
  updateAvatarBadge();
}

function applyLoggedInUI() {
  if (!currentUser) return;
  document.getElementById('userBalanceBox')?.classList.remove('hidden');
  const sb = document.getElementById('steamAuthBtn');
  const ab = document.getElementById('userAvatarBox');
  if (currentUser.steamId) {
    sb?.classList.add('hidden');
    ab?.classList.remove('hidden');
    setImageSource(document.getElementById('userAvatarImg'), currentUser.avatar, currentUser.name || 'Steam');
  } else {
    sb?.classList.remove('hidden');
    ab?.classList.add('hidden');
  }
  updateBalanceUI();
  if (gameState) renderProfileProgress();
}

function updateBalanceUI() {
  if (currentUser) {
    const el = document.getElementById('userBalance');
    if (el) el.textContent = formatCredits(currentUser.balance);
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
}

function renderDailyTasks() {
  if (!gameState) return;
  ensureDailyState();
  const h = document.getElementById('dailyTasks');
  if (!h) return;
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

function claimDailyTask(id) {
  if (!gameState || !currentUser) return;
  ensureDailyState();
  const t = getDailyTasks().find(x => x.id === id);
  if (!t) return;
  if (gameState.daily.claimed.includes(t.id)) return;
  if ((Number(t.value(gameState.daily)) || 0) < t.goal) return;

  gameState.daily.claimed.push(t.id);
  currentUser.balance += t.reward;
  addXp(40);
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
  addXp(80);
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
          <p class="mt-1 text-[10px] font-bold ${active ? 'text-amber-300' : 'text-gray-600'}">${active ? 'Отримано' : `+${formatCredits(a.reward)}`}</p>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderRecentAch() {
  const card = document.getElementById('recentAchCard');
  const grid = document.getElementById('recentAchGrid');
  if (!card || !grid || !gameState) return;
  const list = Object.entries(gameState.achievements || {})
    .map(([id, ts]) => ({ id, ts, def: ACHIEVEMENT_DEFINITIONS.find(a => a.id === id) }))
    .filter(x => x.def)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 3);
  if (!list.length) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  grid.innerHTML = list.map(x => `
    <div class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
      <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-black">
        <i class="fa-solid ${x.def.icon}"></i>
      </span>
      <p class="mt-2 text-xs font-extrabold text-amber-100">${escapeHtml(x.def.title)}</p>
      <p class="text-[10px] text-gray-500 mt-0.5">${new Date(x.ts).toLocaleDateString('uk-UA')}</p>
    </div>
  `).join('');
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
        ${catalogItem?.img ? `<img src="${escapeHtml(catalogItem.img)}" alt="" onerror="useImageFallback(this)">` : ''}
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
      price: reward.skin.price,
      basePrice: reward.skin.price,
      img: '',
      rarity: reward.skin.rarity,
      rarityColor: reward.skin.rarityColor,
      exclusive: true
    }, '-exclusive');

    userInventory.push(exclusiveItem);
    currentUser.balance += reward.dc;
    addXp(200);

    const reveal = document.getElementById('collectionRewardRevealed');
    if (reveal) {
      reveal.classList.remove('hidden');
      reveal.innerHTML = `
        <div class="mt-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-violet-500/15 p-4">
          <p class="text-[10px] font-extrabold uppercase tracking-widest text-amber-400"><i class="fa-solid fa-star mr-1"></i>Ексклюзивний предмет</p>
          <img src="${createSkinPreview(reward.skin.name)}" class="h-32 mx-auto my-3 object-contain" />
          <p class="font-heading text-2xl font-extrabold text-white leading-tight">${escapeHtml(reward.skin.name)}</p>
          <p class="text-sm font-bold text-amber-300 mt-1">${formatCredits(reward.skin.price)}</p>
          <p class="text-[10px] text-gray-500 mt-2 italic">Цей предмет неможливо отримати інакше — тільки за колекцію.</p>
        </div>
        <div class="mt-3 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-center">
          <p class="text-xs font-extrabold text-green-200 uppercase tracking-wider">Бонусні кредити</p>
          <p class="font-heading text-3xl font-extrabold text-green-300 mt-1">+ ${formatCredits(reward.dc)}</p>
        </div>
        <button onclick="closeModal('collectionRewardModal'); renderGameHub(); renderInventoryGrid(); renderProfileInventory(); updateAvatarBadge(); updateBalanceUI();" class="mt-4 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm tracking-wider transition"><i class="fa-solid fa-check mr-2"></i>Забрати все</button>
      `;
    }
    soundWin();
    setTimeout(() => soundWin(), 200);
    setTimeout(() => soundWin(), 400);
    checkAchievements();
    saveState();
  }, 800);
}

function renderAllTime() {
  if (!gameState) return;
  const a = gameState.allTime || createDefaultAllTime();
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set('atRounds', String(a.rounds || 0));
  set('atWins', String(a.wins || 0));
  set('atCases', String(a.cases || 0));
  set('atBattles', String(a.battles || 0));
  set('atRoyale', String(a.royaleWins || 0));
  set('atContracts', String(a.contracts || 0));
  set('atSells', String(a.sells || 0));
  set('atSellValue', Math.round(a.sellValue || 0).toLocaleString('uk-UA'));
  set('atBiggestWin', Math.round(a.biggestWin || 0).toLocaleString('uk-UA'));
  set('atLegendary', String(a.legendaryDrops || 0));
  set('atMulti', String(a.multiInputs || 0));
  set('atCredits', String(a.creditInputs || 0));
}

function renderRoundHistory() {
  if (!gameState) return;
  const h = document.getElementById('roundHistory');
  if (!h) return;
  if (!gameState.rounds.length) {
    h.innerHTML = '<div class="rounded-xl border border-dashed border-gray-700 p-6 text-center"><i class="fa-solid fa-dice text-xl text-gray-600"></i><p class="mt-2 text-sm font-bold text-gray-400">Тут з’явиться історія</p></div>';
    return;
  }
  h.innerHTML = gameState.rounds.map(r => {
    const st = new Date(r.at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const mode = r.mode === 'under' ? 'Під · захист' : r.mode === 'multi' ? 'Мульти' : r.mode === 'battle' ? 'Бій' : r.mode === 'contract' ? 'Контракт' : 'Понад · бонус';
    return `<div class="flex items-center gap-3 rounded-xl border ${r.win ? 'border-green-500/25 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'} p-2.5">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${r.win ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}">
        <i class="fa-solid ${r.win ? 'fa-check' : 'fa-xmark'}"></i>
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-extrabold text-gray-200">${escapeHtml(r.targetName)}</p>
        <p class="mt-0.5 text-[10px] text-gray-500">${mode}${r.chance ? ` · ${Number(r.chance).toFixed(2)}%` : ''}</p>
      </div>
      <div class="text-right">
        <p class="text-xs font-extrabold ${r.win ? 'text-green-300' : 'text-red-300'}">${r.win ? 'Виграш' : 'Невдача'}</p>
        <p class="mt-0.5 text-[10px] text-gray-500">${st}</p>
      </div>
    </div>`;
  }).join('');
}

function getSkinByKey(k) {
  return CS2_SKINS.find(s => getSkinKey(s) === String(k));
}

function isFavorite(s) {
  return Boolean(gameState?.favorites?.includes(getSkinKey(s)));
}

function renderFavorites() {
  if (!gameState) return;
  const h = document.getElementById('favoritesGrid');
  if (!h) return;
  const skins = gameState.favorites.map(getSkinByKey).filter(Boolean);
  if (!skins.length) {
    h.innerHTML = '<div class="col-span-full rounded-xl border border-dashed border-gray-700 p-6 text-center"><i class="fa-regular fa-heart text-xl text-gray-600"></i><p class="mt-2 text-sm font-bold text-gray-400">Додай скіни з каталогу</p></div>';
    return;
  }
  h.innerHTML = skins.slice(0, 9).map(s => `
    <article class="relative overflow-hidden rounded-xl border border-gray-800 bg-black/20 p-2">
      <button type="button" data-favorite-select="${escapeHtml(getSkinKey(s))}" class="w-full text-left">
        <img src="${escapeHtml(s.img)}" alt="${escapeHtml(s.name)}" data-skin-id="${escapeHtml(getSkinKey(s))}" data-skin-name="${escapeHtml(s.name)}" class="h-16 w-full object-contain image-skeleton" loading="lazy" onerror="handleSkinImageError(this)">
        <p class="mt-1 truncate text-[10px] font-extrabold text-gray-200">${escapeHtml(s.name)}</p>
        <p class="text-[10px] font-bold text-amber-300">${formatCredits(s.price)}</p>
      </button>
      <button type="button" data-favorite-remove="${escapeHtml(getSkinKey(s))}" title="Прибрати" class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/65 text-red-300 hover:bg-red-500 hover:text-white">
        <i class="fa-solid fa-xmark text-[10px]"></i>
      </button>
    </article>
  `).join('');

  h.querySelectorAll('[data-favorite-select]').forEach(b => b.addEventListener('click', () => {
    const s = getSkinByKey(b.dataset.favoriteSelect);
    if (s) selectTargetItem(s);
  }));
  h.querySelectorAll('[data-favorite-remove]').forEach(b => b.addEventListener('click', () => toggleFavorite(b.dataset.favoriteRemove)));
}

function toggleFavorite(k) {
  if (!gameState) return;
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
  renderFavorites();
  if (document.getElementById('shopModal')?.classList.contains('flex')) filterShop();
}

function renderLeaderboard() {
  const h = document.getElementById('leaderboardList');
  if (!h) return;
  const meXp = gameState?.xp || 0;
  const meName = account?.nick || currentUser?.name || 'Ти';
  const mePrestige = gameState?.prestige || 0;
  const rows = MOCK_LEADERBOARD.map(r => ({ ...r, isMe: false, prestige: 0 }));
  rows.push({ name: meName, xp: meXp, isMe: true, prestige: mePrestige });
  rows.sort((a, b) => b.xp - a.xp);
  const myIdx = rows.findIndex(r => r.isMe);
  const lbl = document.getElementById('myRankLabel');
  if (lbl) lbl.textContent = `#${myIdx + 1}`;
  h.innerHTML = rows.map((r, i) => {
    const lvl = Math.floor(r.xp / 750) + 1;
    const cls = i < 3 ? `lb-rank-${i + 1}` : 'text-gray-500';
    const pBadge = r.prestige > 0 ? `<span class="prestige-badge ml-1"><i class="fa-solid fa-crown text-[8px]"></i>P${r.prestige}</span>` : '';
    return `<div class="lb-row ${r.isMe ? 'is-me' : ''}">
      <div class="lb-rank ${cls}">#${i + 1}</div>
      <div class="min-w-0">
        <p class="truncate text-sm font-extrabold ${r.isMe ? 'text-amber-200' : 'text-white'}">${escapeHtml(r.name)}${pBadge}${r.isMe ? ' <span class="text-[10px] font-bold text-amber-400">(ти)</span>' : ''}</p>
        <p class="text-[11px] font-bold text-gray-500">${r.xp.toLocaleString('uk-UA')} XP · LVL ${lvl}</p>
      </div>
      <div class="font-heading text-xl font-extrabold text-amber-300">${r.prestige > 0 ? `P${r.prestige}` : '—'}</div>
    </div>`;
  }).join('');
}

function renderGameHub() {
  if (!gameState) return;
  renderProfileProgress();
  renderDailyTasks();
  renderWeeklyTasks();
  renderAchievements();
  renderCollections();
  renderRoundHistory();
  renderFavorites();
  renderLeaderboard();
  renderAllTime();
  renderRecentAch();
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
      currentUser.balance += a.reward;
      addXp(75);
      changed = true;
      soundWin();
      showToast(`Досягнення «${a.title}»: +${formatCredits(a.reward)}`, 'success');
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
}

function copyLatestResult() {
  const r = gameState?.rounds?.[0];
  if (!r) {
    showToast('Спочатку зроби ролл', 'warn');
    return;
  }
  const msg = `ПОТУЖНО DROP 3.7 · ${r.win ? 'Виграш' : 'Невдача'}: ${r.targetName} · ${r.chance ? `шанс ${Number(r.chance).toFixed(2)}% · ` : ''}лише віртуальна гра.`;
  const done = () => showToast('Результат скопійовано', 'success');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(msg).then(done).catch(() => showToast('Не вдалося', 'warn'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    done();
  }
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
function beep(freq = 440, dur = 0.08, type = 'sine') {
  if (!soundEnabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.07, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch {}
}

function soundWin() {
  beep(880, 0.15, 'triangle');
  setTimeout(() => beep(1180, 0.2, 'triangle'), 140);
}
function soundLose() {
  beep(180, 0.28, 'sawtooth');
}
function soundCase() {
  beep(700, 0.12, 'triangle');
  setTimeout(() => beep(1050, 0.16, 'triangle'), 120);
}
function soundCoin() {
  beep(760, 0.12, 'triangle');
}
function soundSell() {
  beep(700, 0.08, 'triangle');
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(STORAGE.sound, soundEnabled ? 'on' : 'off');
  updateSoundUI();
}

function updateSoundUI() {
  const i = document.getElementById('soundIcon');
  if (i) i.className = soundEnabled ? 'fa-solid fa-volume-high text-sm' : 'fa-solid fa-volume-xmark text-sm';
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
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu')?.classList.toggle('hidden');
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
  if (id === 'inventoryModal') refreshInventoryModal();
  if (id === 'accountModal') updateAccountUI();
  if (id === 'prestigeModal') updatePrestigeUI();
  if (id === 'shopModal') filterShop();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}

function refreshInventoryModal() {
  const status = document.getElementById('inventoryStatus');
  if (status) {
    status.textContent = currentUser?.steamId
      ? 'Показано віртуальні копії. Steam-предмети не передаються сайту.'
      : 'Стартові предмети існують лише в цій грі. Підключи Steam або введи Steam ID, щоб додати публічні предмети.';
  }
  renderInventoryGrid();
}

function openInventoryModalFromProfile() {
  openModal('inventoryModal');
}

function startSteamLogin() {
  openModal('steamModal');
}

function continueSteamLogin() {
  window.location.href = '/api/steam/auth';
}

async function loginWithManualSteamId() {
  const input = document.getElementById('manualSteamIdInput');
  const sid = String(input?.value || '').trim();
  if (!/^\d{17}$/.test(sid)) {
    showToast('Steam ID має складатись із 17 цифр', 'warn');
    return;
  }
  closeModal('steamModal');
  showToast('Завантаження інвентарю Steam...', 'info');
  await fetchAndApplySteamInventory(sid);
}

async function fetchAndApplySteamInventory(sid) {
  try {
    const r = await fetch(`/api/steam/inventory?steamid=${encodeURIComponent(sid)}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Не вдалося');
    const imported = (d.items || []).map((it, i) => {
      const wear = rollWear();
      const bp = estimateInventoryPrice(it, i);
      return {
        ...it,
        sourceSkinId: it.id,
        id: `steam-demo-${it.id}-${Date.now()}-${i}`,
        basePrice: bp,
        wear,
        price: priceWithWear(bp, wear),
        virtual: true,
        addedAt: Date.now()
      };
    });

    // Commit the Steam identity only after its public inventory was fetched.
    // A private inventory or network failure must not look like a successful login.
    account = {
      ...(account || {}),
      steamId: sid,
      nick: account?.nick && !account.nick.startsWith('Гравець_') ? account.nick : `Steam_${sid.slice(-4)}`
    };
    currentUser = {
      steamId: sid,
      name: account.nick,
      balance: clampNumber(currentUser?.balance ?? localStorage.getItem(STORAGE.balance), 0, MAX_STORED_BALANCE, DEMO_STARTING_BALANCE),
      avatar: AVATAR_URL
    };
    userInventory = imported.length ? imported : createStarterInventory();
    const st = document.getElementById('inventoryStatus');
    if (st) st.textContent = imported.length ? `Створено ${imported.length} віртуальних копій.` : 'У публічному інвентарі немає CS2 — стартовий набір.';
    applyLoggedInUI();
    updateAccountUI();
    renderInventoryGrid();
    renderProfileInventory();
    updateAvatarBadge();
    saveState();
    renderGameHub();
    checkAchievements();
    showToast(`Завантажено ${imported.length} предметів`, 'success');
  } catch (e) {
    const st = document.getElementById('inventoryStatus');
    if (st) st.textContent = e.message || 'Не вдалося завантажити інвентар';
    showToast(e.message || 'Не вдалося завантажити інвентар', 'warn');
  }
}

async function processSteamCallback() {
  const params = new URLSearchParams(location.search);
  if (params.has('steam_error')) {
    showToast('Не вдалося підтвердити вхід через Steam', 'error');
    history.replaceState({}, '', location.pathname);
    return;
  }
  const sid = params.get('steamid');
  if (!sid) return;
  history.replaceState({}, '', location.pathname);
  await fetchAndApplySteamInventory(sid);
}

function claimDailyBonus() {
  if (!currentUser) return;
  const last = parseInt(localStorage.getItem(STORAGE.bonusAt) || '0', 10);
  const now = Date.now();
  const cd = 24 * 60 * 60 * 1000;
  if (now - last < cd) {
    const left = cd - (now - last);
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    showToast(`Бонус через ${h > 0 ? h + ' год ' : ''}${m} хв`, 'warn');
    updateGiftButtonUI();
    return;
  }
  currentUser.balance += 500;
  localStorage.setItem(STORAGE.bonusAt, String(now));
  updateBalanceUI();
  saveState();
  updateGiftButtonUI();
  checkAchievements();
  showToast('+500 DC!', 'success');
  soundCoin();
}

function topupWatchAd() {
  const k = STORAGE.topup;
  let st = {};
  try { st = JSON.parse(localStorage.getItem(k) || '{}'); } catch {}
  const last = st.adAt || 0;
  const cd = 60 * 1000;
  if (Date.now() - last < cd) {
    const s = Math.ceil((cd - (Date.now() - last)) / 1000);
    showToast(`Зачекай ${s} с`, 'warn');
    return;
  }
  st.adAt = Date.now();
  localStorage.setItem(k, JSON.stringify(st));
  currentUser.balance += 150;
  updateBalanceUI();
  saveState();
  checkAchievements();
  showToast('+150 DC', 'success');
}

function topupShareSite() {
  const k = STORAGE.topup;
  let st = {};
  try { st = JSON.parse(localStorage.getItem(k) || '{}'); } catch {}
  const today = getTodayKey();
  if (st.sharedDate === today) {
    showToast('Вже ділився сьогодні', 'warn');
    return;
  }
  st.sharedDate = today;
  localStorage.setItem(k, JSON.stringify(st));
  currentUser.balance += 250;
  updateBalanceUI();
  saveState();
  checkAchievements();
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(location.origin).catch(() => {});
  }
  showToast('+250 DC', 'success');
}

function topupLevelReward() {
  const k = STORAGE.topup;
  let st = {};
  try { st = JSON.parse(localStorage.getItem(k) || '{}'); } catch {}
  const lvl = getPlayerLevel();
  if (st.levelClaimed === lvl) {
    showToast('Уже отримано', 'warn');
    return;
  }
  const reward = 100 * lvl;
  st.levelClaimed = lvl;
  localStorage.setItem(k, JSON.stringify(st));
  currentUser.balance += reward;
  updateBalanceUI();
  saveState();
  checkAchievements();
  showToast(`+${formatCredits(reward)} за LVL ${lvl}`, 'success');
}

function updateTopupUI() {
  const el = document.getElementById('topupLevelRewardLabel');
  if (el) el.textContent = `+${100 * getPlayerLevel()} DC`;
}

function doPrestige() {
  if (!gameState || !currentUser) return;
  if (getPlayerLevel() < 10) {
    showToast('Потрібен LVL 10+', 'warn');
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

function resetDemoGame() {
  if (!window.confirm('Почати спочатку? Прогрес, історія, ачівки та престиж скидаються.')) return;
  cancelPendingWager();
  isRolling = false;
  isCaseOpening = false;
  isFreeCaseOpening = false;
  battleInProgress = false;
  battlePlayerItem = null;
  battleBotItem = null;
  currentUser.balance = DEMO_STARTING_BALANCE;
  userInventory = createStarterInventory();
  const theme = gameState?.theme || 'amber';
  gameState = createDefaultGameState();
  gameState.theme = theme;
  selectedInputSkin = null;
  selectedTargetSkin = null;
  selectedInputMode = 'skin';
  balanceStake = 50;
  multiInputSkins = [];

  const stakeInput = document.getElementById('balanceStakeInput');
  if (stakeInput) stakeInput.value = '50';

  document.getElementById('inputSkinState')?.classList.add('hidden');
  document.getElementById('inputMultiState')?.classList.add('hidden');
  document.getElementById('inputBalanceState')?.classList.add('hidden');
  document.getElementById('inputEmptyState')?.classList.remove('hidden');
  document.getElementById('targetSkinState')?.classList.add('hidden');
  document.getElementById('targetEmptyState')?.classList.remove('hidden');

  localStorage.removeItem(STORAGE.bonusAt);
  localStorage.removeItem(STORAGE.freeCase);

  clearContract();
  resetCoinVisual();
  resetRoyale(true);

  updateBalanceUI();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  switchInputMode('skin');
  recalculateUpgrade();
  saveState();
  renderGameHub();
  updateGiftButtonUI();
  updateFreeCaseBtn();
  showToast('Нову гру розпочато', 'success');
}

function estimateInventoryPrice(it, i) {
  const clean = normalizeSkinName(it.name);
  const m = CS2_SKINS.find(s => normalizeSkinName(s.name) === clean);
  return m?.price || (25 + ((i * 137) % 975));
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
    const inMulti = selectedInputMode === 'multi' && multiInputSkins.some(x => x.id === s.id);
    return `<div class="relative bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 flex flex-col items-center transition group inventory-card ${inMulti ? 'is-in-multi' : ''} ${s.exclusive ? 'border-violet-500/50' : ''}">
      <button type="button" data-inventory-id="${escapeHtml(String(s.id))}" class="w-full text-left">
        <span class="wear-badge wear-${wear.code} absolute top-2 left-2 z-10">${wear.code}</span>
        ${s.exclusive ? `<span class="absolute top-2 right-2 text-violet-300 text-xs" title="Ексклюзив">★</span>` : ''}
        <img src="${escapeHtml(s.img || '')}" alt="${escapeHtml(s.name)}" data-skin-id="${escapeHtml(getSkinKey(s))}" data-skin-name="${escapeHtml(s.name)}" class="h-20 w-full object-contain group-hover:scale-105 transition image-skeleton" loading="lazy" onerror="handleSkinImageError(this)">
        <div class="text-center w-full mt-2">
          <p class="font-bold text-xs text-white truncate" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</p>
          <p class="text-amber-400 font-extrabold text-xs mt-1">${formatCredits(s.price)}</p>
        </div>
      </button>
      <button type="button" data-sell-id="${escapeHtml(String(s.id))}" title="Продати за ${formatCredits(Math.round((s.price || 0) * SELL_RATE))}" class="mt-2 w-full rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-emerald-200 text-[11px] font-extrabold uppercase py-1.5 transition flex items-center justify-center gap-1">
        <i class="fa-solid fa-sack-dollar text-[10px]"></i>Продати
      </button>
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
  if (q) list = list.filter(it => String(it.name || '').toLowerCase().includes(q));

  const s = profileInvSort;
  if (s === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
  else if (s === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (s === 'name-asc') list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  else if (s === 'wear-asc') list.sort((a, b) => (a.wear?.min ?? 0) - (b.wear?.min ?? 0));
  else if (s === 'newest') list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
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
  const totalValue = userInventory.reduce((s, it) => s + (it.price || 0), 0);
  const best = userInventory.reduce((max, it) => Math.max(max, it.price || 0), 0);
  const uniqueNames = new Set(userInventory.map(it => normalizeSkinName(it.name))).size;
  const c = document.getElementById('invStatCount');
  if (c) c.textContent = String(count);
  const v = document.getElementById('invStatValue');
  if (v) v.textContent = Math.round(totalValue).toLocaleString('uk-UA');
  const b = document.getElementById('invStatBest');
  if (b) b.textContent = Math.round(best).toLocaleString('uk-UA');
  const u = document.getElementById('invStatUnique');
  if (u) u.textContent = String(uniqueNames);
}

function renderProfileInventory() {
  renderProfileInventoryCategoryChips();
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

  if (!list.length) {
    grid.innerHTML = '<div class="col-span-full rounded-xl border border-dashed border-gray-700 p-10 text-center"><i class="fa-solid fa-magnifying-glass text-2xl text-gray-600"></i><p class="mt-2 text-sm font-bold text-gray-400">Нічого не знайдено</p><p class="text-xs text-gray-500 mt-1">Спробуй інший фільтр</p></div>';
    return;
  }
  const nameCounts = new Map();
  for (const it of userInventory) {
    const k = normalizeSkinName(it.name) + '|' + (it.wear?.code || '');
    nameCounts.set(k, (nameCounts.get(k) || 0) + 1);
  }
  grid.innerHTML = list.map(s => {
    const wear = getWear(s);
    const k = normalizeSkinName(s.name) + '|' + (wear.code || '');
    const dupes = nameCounts.get(k) || 0;
    const sellPrice = Math.round((s.price || 0) * SELL_RATE);
    return `<div class="profile-inv-card ${s.exclusive ? 'is-exclusive' : ''}" data-profile-item="${escapeHtml(String(s.id))}">
      ${dupes > 1 ? `<span class="dupe-badge">×${dupes}</span>` : ''}
      <span class="wear-badge wear-${wear.code} absolute top-2 left-2 z-10">${wear.code}</span>
      <img src="${escapeHtml(s.img || '')}" alt="${escapeHtml(s.name)}" data-skin-id="${escapeHtml(getSkinKey(s))}" data-skin-name="${escapeHtml(s.name)}" loading="lazy" onerror="handleSkinImageError(this)">
      <p class="inv-name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</p>
      <p class="inv-price">${formatCredits(s.price)}</p>
      <div class="inv-actions">
        <button class="sell-btn" data-profile-sell="${escapeHtml(String(s.id))}" title="Продати за ${formatCredits(sellPrice)}"><i class="fa-solid fa-sack-dollar mr-1"></i>${Math.round(sellPrice)}</button>
        <button class="info-btn" data-profile-info="${escapeHtml(String(s.id))}" title="Деталі"><i class="fa-solid fa-circle-info"></i></button>
      </div>
    </div>`;
  }).join('');

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
}

function showItemDetail(itemId) {
  const it = userInventory.find(x => String(x.id) === String(itemId));
  if (!it) return;
  const wear = getWear(it);
  const sellPrice = Math.round((it.price || 0) * SELL_RATE);
  const cat = categorizeWeapon(it.name);
  const catLabel = { rifle: 'Гвинтівка', pistol: 'Пістолет', sniper: 'Снайперська', smg: 'ПП', heavy: 'Важка', knife: 'Ніж', gloves: 'Рукавиці', other: 'Зброя' }[cat] || 'Зброя';
  const html = `
  <div class="text-center">
    ${it.exclusive ? `<div class="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1"><i class="fa-solid fa-star text-violet-300 text-xs"></i><span class="text-[10px] font-extrabold uppercase tracking-widest text-violet-200">Ексклюзив</span></div>` : ''}
    <div class="mx-auto mb-3 flex justify-center"><img src="${escapeHtml(it.img || '')}" alt="" class="h-40 object-contain" data-skin-name="${escapeHtml(it.name)}" onerror="handleSkinImageError(this)"></div>
    <p class="text-[10px] font-extrabold uppercase tracking-[.2em] text-amber-400">${catLabel} · ${escapeHtml(it.rarity || 'CS2')}</p>
    <h3 class="font-heading mt-1 text-3xl font-extrabold uppercase text-white leading-none">${escapeHtml(it.name)}</h3>
    <div class="mt-3 inline-flex items-center gap-2 flex-wrap justify-center">
      <span class="wear-badge wear-${wear.code}">${wear.code} · ${escapeHtml(wear.name)}</span>
      <span class="wear-badge" style="color:#fbbf24;border-color:rgba(251,191,36,.4)">x${wear.mult.toFixed(2)}</span>
    </div>
    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-gray-800 bg-black/20 p-3"><p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Вартість</p><p class="font-heading text-2xl font-extrabold text-amber-300">${formatCredits(it.price)}</p></div>
      <div class="rounded-xl border border-gray-800 bg-black/20 p-3"><p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Продаж (90%)</p><p class="font-heading text-2xl font-extrabold text-emerald-300">${formatCredits(sellPrice)}</p></div>
    </div>
    ${it.exclusive ? `<p class="mt-3 text-[10px] text-violet-300 italic">Ексклюзивний предмет — його можна продати, але більше не отримати.</p>` : ''}
    <button type="button" data-detail-sell-id="${escapeHtml(String(it.id))}" class="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 text-black font-extrabold uppercase text-sm tracking-wider transition"><i class="fa-solid fa-sack-dollar mr-2"></i>Продати за ${formatCredits(sellPrice)}</button>
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
  const payout = Math.round((it.price || 0) * SELL_RATE);
  userInventory.splice(idx, 1);
  currentUser.balance += payout;
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
  const toSell = userInventory.filter(it => !keep.has(it.id));
  if (!toSell.length) {
    showToast('Дублікатів немає', 'info');
    return;
  }
  const total = toSell.reduce((s, it) => s + Math.round((it.price || 0) * SELL_RATE), 0);
  if (!window.confirm(`Продати ${toSell.length} дублікатів за ${formatCredits(total)}?`)) return;

  const soldIds = new Set(toSell.map(i => i.id));
  userInventory = userInventory.filter(it => keep.has(it.id));
  currentUser.balance += total;
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
  it = getMarketSkin(it);
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
        <img src="${escapeHtml(s.img || '')}" alt="" data-skin-name="${escapeHtml(s.name)}" onerror="handleSkinImageError(this)">
        <div class="price">${formatCredits(s.price).replace(' DC', '')}</div>
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
  rollMode = mode;
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
  if (hint) {
    hint.textContent = mode === 'under'
      ? 'Захист: +15% до шансу виграшу (максимум 80%).'
      : 'Бонус: при виграші +5% вартості цілі у DC.';
  }
  recalculateUpgrade();
}

function getInputVal() {
  if (selectedInputMode === 'skin') return selectedInputSkin ? selectedInputSkin.price : 0;
  if (selectedInputMode === 'multi') return multiInputSkins.reduce((s, i) => s + (i.price || 0), 0);
  return balanceStake;
}

function getTargetVal() {
  return selectedTargetSkin ? selectedTargetSkin.price : 0;
}

function calcChance(iv, tv) {
  if (!iv || !tv || tv <= iv) return 0;
  const ratio = iv / tv;
  let base = 100 * Math.pow(ratio, CHANCE_POWER) * CHANCE_K;
  if (rollMode === 'under') base *= SAFE_MODE_CHANCE_MULTIPLIER;
  return Math.min(CHANCE_MAX, Math.max(CHANCE_MIN, base));
}

function getWinBonus(tv) {
  if (rollMode !== 'over' || !tv) return 0;
  return Math.max(1, Math.round(tv * BONUS_MODE_RATE));
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
    if (winChanceText) winChanceText.textContent = '0.00 %';
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
  for (const s of CS2_SKINS) {
    const p = s.price || 0;
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
    for (const s of CS2_SKINS) {
      const pr = s.price || 0;
      if (pr < inputVal) continue;
      const diff = Math.abs(pr - targetPrice);
      if (diff < bestDiff) { bestDiff = diff; best = s; }
    }
    if (!best) return '';

    const actualChance = calcChance(inputVal, best.price || targetPrice);
    const sk = getSkinKey ? getSkinKey(best) : '';
    const displayName = best.name.length > 18 ? best.name.slice(0, 16) + '…' : best.name;
    const priceStr = typeof formatCredits === 'function' ? formatCredits(best.price || 0) : (best.price || 0) + ' DC';

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
  selectedTargetSkin = skin;
  const tei = document.getElementById('targetEmptyState');
  const tsi = document.getElementById('targetSkinState');
  const timg = document.getElementById('targetSkinImg');
  const tnm  = document.getElementById('targetSkinName');
  const trar = document.getElementById('targetSkinRarity');
  if (tei) tei.classList.add('hidden');
  if (tsi) tsi.classList.remove('hidden');
  if (timg) setImageSource(timg, skin.img, skin.name, getSkinKey(skin));
  if (tnm)  tnm.textContent  = skin.name;
  if (trar) trar.textContent = skin.rarity || '';
  // Highlight by a data attribute, never by executable inline code.
  document.querySelectorAll('.upg-sugg-card').forEach(c => {
    c.classList.toggle('is-active', c.dataset.suggestionKey === getSkinKey(skin));
  });
  recalculateUpgrade();
}

function chainUpgradeWonSkin() {
  if (!lastWonUpgraderSkin) { showToast('Немає виграного скіна', 'warn'); return; }
  const won = lastWonUpgraderSkin;
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
  lastWonUpgraderSkin = null;
  const _rua = document.getElementById('resultUpgraderActions');
  if (_rua) _rua.classList.add('hidden');
  closeModal('resultModal');
  const price = won.price || 0;
  const earned = Math.round(price * SELL_RATE);
  currentUser.balance += earned;
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
  showToast(`Продано за ${formatCredits(earned)} DC`, 'success');
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
  if (selectedInputMode === 'multi' && !multiAtStart.every(item => userInventory.some(owned => owned.id === item.id))) {
    showToast('Деяких скінів уже немає в інвентарі', 'warn');
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
      addActivityEvent({ player: currentUser.name || 'Ти', skin: ni, outcome: 'win' });
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
      addActivityEvent({ player: currentUser.name || 'Ти', skin: ni, outcome: 'win' });
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

/* ===== KEY-DROP SHANKS & POOLS ===== */
let currentCaseCategory = 'all';
let currentActiveCaseId = 'budget_covert';
let caseMultiplier = 1;
let lastWonCaseItems = [];
let lastOpenedCaseId = 'budget_covert';
let currentDetailsCaseId = 'budget_covert';

function getCaseSkinPool(caseType) {
  let cfg = CASE_TYPES[caseType] || CASE_TYPES.budget_covert;
  if (cfg.aliasTo) cfg = CASE_TYPES[cfg.aliasTo] || cfg;

  const usable = CS2_SKINS.filter(isUsableSkin);
  if (!usable.length) return [];

  const sampleByPrice = (items, limit) => {
    const sorted = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sorted.length <= limit) return sorted;
    return Array.from({ length: limit }, (_, index) => {
      const position = Math.round(index * (sorted.length - 1) / (limit - 1));
      return sorted[position];
    });
  };

  let themed = [];
  if (typeof cfg.filter === 'function') {
    themed = usable.filter(cfg.filter);
  }

  // Every paid case intentionally contains affordable filler items. Previously
  // knife/glove filters could consist entirely of premium skins, making a good
  // drop almost guaranteed instead of rare.
  const affordable = usable.filter(s => (s.price || 0) <= Math.max(20, cfg.cost * 0.9));
  const nearest = [...usable]
    .sort((a, b) => Math.abs((a.price || 0) - cfg.cost) - Math.abs((b.price || 0) - cfg.cost))
    .slice(0, 48);
  const seen = new Set();
  const pool = [...sampleByPrice(themed, 120), ...sampleByPrice(affordable, 120), ...nearest]
    .filter(s => {
      const key = getSkinKey(s);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 240);

  return pool.sort((a, b) => (b.price || 0) - (a.price || 0));
}

const _dropChanceCache = new Map();
function _buildDropChanceMap(caseType) {
  const cacheKey = `${caseType}:${CS2_SKINS.length}`;
  if (_dropChanceCache.has(cacheKey)) return _dropChanceCache.get(cacheKey);

  const pool = getCaseSkinPool(caseType);
  const n = pool.length;
  if (!n) return new Map();

  const cfg = CASE_TYPES[caseType] || CASE_TYPES.budget_covert;
  const caseCost = Math.max(1, cfg.aliasTo ? (CASE_TYPES[cfg.aliasTo]?.cost || cfg.cost) : cfg.cost);
  // 55% low, 32% below-cost, 12% break-even, 0.7% profitable,
  // 0.25% premium and 0.05% jackpot (before unavailable-tier rollover).
  const tierWeights = [55, 32, 12, 0.7, 0.25, 0.05];
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

  if (_dropChanceCache.size >= 30) _dropChanceCache.clear();
  _dropChanceCache.set(cacheKey, result);
  return result;
}

function getItemDropChance(item, caseType) {
  const map = _buildDropChanceMap(caseType);
  return map.get(getSkinKey(item)) || 0;
}

function pickCaseSkin(poolType = 'regular', caseType = 'budget_covert') {
  const usable = CS2_SKINS.filter(isUsableSkin);
  if (!usable.length) return null;

  if (poolType === 'free') {
    const cheapOnly = usable.filter(s => (s.price || 0) <= 300);
    const pool = cheapOnly.length ? cheapOnly : usable;
    const freeTiers = [
      pool.filter(s => (s.price || 0) <= 75),
      pool.filter(s => (s.price || 0) > 75 && (s.price || 0) <= 160),
      pool.filter(s => (s.price || 0) > 160)
    ];
    const weights = [75, 22, 3];
    const total = freeTiers.reduce((sum, tier, index) => sum + (tier.length ? weights[index] : 0), 0);
    let roll = Math.random() * total;
    for (let index = 0; index < freeTiers.length; index++) {
      if (!freeTiers[index].length) continue;
      roll -= weights[index];
      if (roll <= 0) return freeTiers[index][Math.floor(Math.random() * freeTiers[index].length)];
    }
    return pool[0];
  }

  const pool = getCaseSkinPool(caseType);
  if (!pool.length) return usable[0];

  const chances = pool.map(s => getItemDropChance(s, caseType));
  const total = chances.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    if (roll <= chances[i]) return pool[i];
    roll -= chances[i];
  }
  return pool[pool.length - 1];
}

function setCaseCategory(cat) {
  currentCaseCategory = cat;
  document.querySelectorAll('#caseCategoryBar .kd-cat-pill').forEach(btn => {
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

  const validEntries = Object.entries(CASE_TYPES).filter(([id, c]) => !c.aliasTo);
  const filtered = validEntries.filter(([id, c]) => {
    if (currentCaseCategory === 'all') return true;
    return c.category === currentCaseCategory;
  });

  grid.innerHTML = filtered.map(([id, c]) => {
    const previews = getCasePreviewItems(id, 4);
    return `
      <div class="kd-case-card tier-${c.category || 'hot'} group">
        <span class="kd-case-badge ${c.badgeClass || 'badge-hot'}">${c.badge || 'HOT'}</span>
        
        <!-- Top Preview Strip -->
        <div class="kd-case-top-strip">
          ${previews.map(s => `
            <div class="kd-case-top-item" title="${escapeHtml(s.name)} · ${formatCredits(s.price)}">
              <img src="${escapeHtml(s.img || '')}" alt="" onerror="handleSkinImageError(this)">
            </div>
          `).join('')}
        </div>

        <!-- 3D Case Preview -->
        <div class="p-5 flex flex-col items-center justify-center text-center cursor-pointer" onclick="openPowerCase('${id}')">
          <div class="w-28 h-28 sm:w-32 sm:h-32 case-preview-svg group-hover:scale-105 transition-transform duration-300">
            ${createCaseArtwork(id, c.name, c.theme)}
          </div>
          <h3 class="font-heading mt-3 text-2xl font-black uppercase text-white tracking-wider truncate w-full group-hover:text-amber-300 transition-colors">${c.name}</h3>
          <p class="text-[11px] text-gray-400 truncate w-full mt-0.5">${c.desc}</p>
          <div class="mt-3 px-3 py-1 rounded-lg bg-black/40 border border-amber-500/30 flex items-center gap-1.5 shadow-inner">
            <i class="fa-solid fa-coins text-amber-400 text-xs"></i>
            <span class="font-extrabold text-sm text-amber-300">${formatCredits(c.cost)}</span>
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
  }).join('');
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

function updateCaseCostDisplay() {
  const isFree = window.__caseType === 'free';
  const cfg = CASE_TYPES[currentActiveCaseId] || CASE_TYPES.budget_covert;
  const cost = isFree ? 0 : (cfg.cost * caseMultiplier);
  const totalEl = document.getElementById('caseReelTotalCost');
  if (totalEl) totalEl.textContent = `${formatCredits(cost)}`;
  const costSummary = document.getElementById('caseReelCostSummary');
  if (costSummary) costSummary.classList.toggle('hidden', isFree);
}

function openPowerCase(caseType = 'budget_covert') {
  let cfg = CASE_TYPES[caseType] || CASE_TYPES.budget_covert;
  if (cfg.aliasTo) cfg = CASE_TYPES[cfg.aliasTo] || cfg;

  if (!currentUser || !gameState || isCaseOpening || isFreeCaseOpening || isRolling || pendingWager) return;

  currentActiveCaseId = cfg.id;
  window.__caseType = 'paid';
  window.__caseName = cfg.name;

  const title = document.getElementById('caseReelTitle');
  if (title) title.textContent = `${cfg.name}`;
  const sub = document.getElementById('caseReelSubtitle');
  if (sub) sub.textContent = `Ціна: ${formatCredits(cfg.cost)} за кейс`;

  // Show multi-selector for paid cases
  const multiBox = document.getElementById('caseMultiSelector')?.parentElement;
  if (multiBox) multiBox.classList.remove('hidden');

  setCaseMultiplier(caseMultiplier || 1);
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
    status.textContent = 'Раз на 24 години · до 300 DC';
  }
}

function openFreeDailyCase() {
  if (!currentUser || !gameState || isFreeCaseOpening || isRolling || isCaseOpening || pendingWager) return;
  if (getFreeCaseLeft() > 0) {
    showToast('Безкоштовний кейс ще недоступний', 'warn');
    return;
  }

  currentActiveCaseId = 'free';
  window.__caseType = 'free';
  window.__caseName = 'Безкоштовний щоденний кейс';

  const title = document.getElementById('caseReelTitle');
  if (title) title.textContent = 'Безкоштовний кейс';
  const sub = document.getElementById('caseReelSubtitle');
  if (sub) sub.textContent = 'Раз на 24 години · до 300 DC';

  // Hide multi selector for free daily case
  const multiBox = document.getElementById('caseMultiSelector')?.parentElement;
  if (multiBox) multiBox.classList.add('hidden');

  setCaseMultiplier(1);
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

function buildSingleReelTrack(trackId, winner) {
  const track = document.getElementById(trackId);
  if (!track) return { winnerIndex: 45, cardWidth: 132, gap: 10 };

  const items = [];
  const winnerIndex = 45;
  const pool = getCaseSkinPool(currentActiveCaseId);
  const fallback = pool.length ? pool : CS2_SKINS;

  for (let i = 0; i < 50; i++) {
    if (i === winnerIndex) {
      items.push({ ...winner, isWinner: true, wear: rollWear() });
      continue;
    }
    const s = fallback[Math.floor(Math.random() * fallback.length)];
    items.push({ ...s, isWinner: false, wear: rollWear() });
  }

  track.innerHTML = items.map(it => `
    <div class="case-reel-card ${it.isWinner ? 'is-winner' : ''}">
      <img src="${escapeHtml(it.img || '')}" alt="" data-skin-name="${escapeHtml(it.name)}" onerror="handleSkinImageError(this)">
      <p>${escapeHtml(it.name.split('|').pop().trim().slice(0, 18))}</p>
      <p class="text-[10px] font-extrabold text-amber-300">${formatCredits(it.price || 0)}</p>
    </div>
  `).join('');

  return { winnerIndex, cardWidth: 132, gap: 10 };
}

function startCaseReel() {
  const btn = document.getElementById('caseReelBtn');
  if (btn?.disabled || isCaseOpening || isFreeCaseOpening || pendingWager) return;

  const isFree = window.__caseType === 'free';
  const mult = isFree ? 1 : caseMultiplier;
  const cfg = CASE_TYPES[currentActiveCaseId] || CASE_TYPES.budget_covert;
  const totalCost = isFree ? 0 : (cfg.cost * mult);
  const previousFreeCaseAt = isFree ? getFreeCaseLastAt() : 0;

  if (isFree) {
    if (getFreeCaseLeft() > 0) {
      showToast('Безкоштовний кейс ще недоступний', 'warn');
      closeModal('caseReelModal');
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
  } else {
    currentUser.balance -= totalCost;
    updateBalanceUI();
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>ОБЕРТАННЯ…';
  }

  // Pick winners
  const winners = [];
  for (let i = 0; i < mult; i++) {
    const w = pickCaseSkin(isFree ? 'free' : 'regular', currentActiveCaseId);
    if (w) winners.push(w);
  }
  if (winners.length !== mult) {
    isCaseOpening = false;
    isFreeCaseOpening = false;
    if (!isFree) {
      currentUser.balance += totalCost;
      updateBalanceUI();
    } else if (previousFreeCaseAt > 0) {
      localStorage.setItem(STORAGE.freeCase, String(previousFreeCaseAt));
    } else {
      localStorage.removeItem(STORAGE.freeCase);
    }
    updateFreeCaseBtn();
    showToast('Каталог кейсу ще завантажується. Спробуй ще раз.', 'warn');
    return;
  }

  // Create demo items and store
  const wonItems = winners.map(w => makeDemoItem(w, isFree ? '-freecase' : '-case'));
  wonItems.forEach(it => userInventory.push(it));
  lastWonCaseItems = wonItems;
  lastOpenedCaseId = currentActiveCaseId;

  // Update stats
  ensureDailyState();
  ensureWeeklyState();
  gameState.stats.cases += mult;
  gameState.daily.cases += mult;
  gameState.weekly.cases = (gameState.weekly.cases || 0) + mult;
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
  saveState();
  renderGameHub();

  wonItems.forEach(it => {
    addActivityEvent({ player: currentUser.name || 'Ти', skin: it, outcome: 'win' });
  });

  const isFast = document.getElementById('caseFastOpenToggle')?.checked;

  if (isFast) {
    soundCase();
    isCaseOpening = false;
    isFreeCaseOpening = false;
    displayCaseDropResult(wonItems, isFree, cfg.name);
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

  // Populate and animate each track
  wonItems.forEach((winner, idx) => {
    const { winnerIndex, cardWidth, gap } = buildSingleReelTrack(`reelTrack_${idx}`, winner);
    const winEl = document.getElementById(`reelWindow_${idx}`);
    const winW = winEl ? winEl.clientWidth : 500;
    const offsetPer = cardWidth + gap;
    const targetX = -(winnerIndex * offsetPer) + winW / 2 - cardWidth / 2;
    const track = document.getElementById(`reelTrack_${idx}`);

    if (track) {
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      void track.offsetWidth;
      track.style.transition = 'transform 4.4s cubic-bezier(.1,.75,.15,1)';
      requestAnimationFrame(() => {
        track.style.transform = `translateX(${targetX}px)`;
      });
    }
  });

  const status = document.getElementById('caseReelStatus');
  if (status) status.textContent = 'Обертається…';

  const ticks = setInterval(() => beep(600 + Math.random() * 400, 0.03, 'square'), 80);

  setTimeout(() => {
    clearInterval(ticks);
    if (status) status.textContent = 'Готово!';
    soundCase();
    isCaseOpening = false;
    isFreeCaseOpening = false;
    displayCaseDropResult(wonItems, isFree, cfg.name);
  }, 4500);
}

function displayCaseDropResult(items, isFree, caseName) {
  closeModal('caseReelModal');

  const resHeader = document.getElementById('caseResultHeader');
  if (resHeader) resHeader.textContent = isFree ? 'Безкоштовний кейс' : (caseName || 'Потужний кейс');

  const totalVal = items.reduce((s, it) => s + (it.price || 0), 0);
  const totalValEl = document.getElementById('caseResultTotalVal');
  if (totalValEl) totalValEl.textContent = `${formatCredits(totalVal)}`;

  const grid = document.getElementById('caseResultItemsGrid');
  if (grid) {
    grid.innerHTML = items.map(it => {
      const wear = getWear(it);
      const isLegendary = (it.price || 0) >= 20000;
      return `
        <div class="kd-result-card ${isLegendary ? 'is-legendary' : ''}">
          <div class="relative w-full flex items-center justify-center">
            <img src="${escapeHtml(it.img || '')}" alt="" class="h-28 sm:h-36 object-contain my-2" onerror="handleSkinImageError(this)">
          </div>
          <p class="text-base font-extrabold text-white truncate w-full">${escapeHtml(it.name)}</p>
          <div class="flex items-center justify-center gap-2 mt-1">
            <span class="font-heading text-xl font-black text-amber-300">${formatCredits(it.price)}</span>
            <span class="wear-badge wear-${wear.code}">${wear.code} · ${wear.name}</span>
          </div>
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

  const itemsToSell = [...lastWonCaseItems];
  lastWonCaseItems = [];
  closeModal('caseModal');

  let totalRefund = 0;
  const idsToSell = new Set(itemsToSell.map(it => it.id));

  itemsToSell.forEach(it => {
    totalRefund += Math.max(1, Math.round((Number(it.price) || 0) * SELL_RATE));
  });

  userInventory = userInventory.filter(it => !idsToSell.has(it.id));
  currentUser.balance += totalRefund;

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
  lastWonCaseItems = [];
  closeModal('caseModal');

  const bestItem = items.sort((a, b) => (b.price || 0) - (a.price || 0))[0];
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
  closeModal('caseModal');
  openPowerCase(lastOpenedCaseId || 'budget_covert');
  setTimeout(() => startCaseReel(), 150);
}

function showCaseDetails(caseType) {
  let cfg = CASE_TYPES[caseType] || CASE_TYPES.budget_covert;
  if (cfg.aliasTo) cfg = CASE_TYPES[cfg.aliasTo] || cfg;

  currentDetailsCaseId = cfg.id;
  const pool = getCaseSkinPool(cfg.id);

  const header = document.getElementById('caseDetailsHeader');
  const title = document.getElementById('caseDetailsTitle');
  const grid = document.getElementById('caseDetailsGrid');

  if (header) header.textContent = `${cfg.name} · ${formatCredits(cfg.cost)}`;
  if (title) title.textContent = `Вміст кейсу (${pool.length} скінів)`;
  if (!grid) return;

  grid.innerHTML = pool.map(s => {
    const chance = getItemDropChance(s, cfg.id);
    let chanceStr = chance < 0.1 ? chance.toFixed(3) + '%' : chance.toFixed(2) + '%';
    let badgeColor = '#6ee7b7';
    if (chance < 0.2) badgeColor = '#f87171';
    else if (chance < 1.5) badgeColor = '#fbbf24';
    else if (chance < 6) badgeColor = '#a78bfa';

    return `
      <div class="bg-brand-card border border-brand-border rounded-xl p-2.5 flex flex-col items-center hover:border-amber-500/40 transition">
        <div class="relative w-full">
          <img src="${escapeHtml(s.img || '')}" alt="" class="h-16 w-full object-contain" onerror="handleSkinImageError(this)">
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
  // Top drops are rendered directly in each Key-Drop case card
}

/* ===== 1v1 BATTLE ===== */
function pickBattlePlayerItem() {
  if (battleInProgress) return;
  if (!userInventory.length) {
    showToast('Інвентар порожній', 'warn');
    return;
  }
  const g = document.getElementById('battlePickGrid');
  if (!g) return;
  g.innerHTML = userInventory.map(s => {
    const wear = getWear(s);
    return `<button type="button" data-battle-pick="${escapeHtml(String(s.id))}" class="bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 flex flex-col items-center transition">
      <span class="wear-badge wear-${wear.code} self-start">${wear.code}</span>
      <img src="${escapeHtml(s.img || '')}" alt="" data-skin-name="${escapeHtml(s.name)}" class="h-16 object-contain mt-1" onerror="handleSkinImageError(this)">
      <p class="mt-1 text-xs font-bold text-white truncate w-full text-center">${escapeHtml(s.name)}</p>
      <p class="text-amber-400 text-xs font-extrabold">${formatCredits(s.price)}</p>
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
  battlePlayerItem = item;
  document.getElementById('battlePlayerEmpty')?.classList.add('hidden');
  document.getElementById('battlePlayerFilled')?.classList.remove('hidden');
  setImageSource(document.getElementById('battlePlayerImg'), item.img, item.name, getSkinKey(item));
  const nameEl = document.getElementById('battlePlayerName');
  if (nameEl) nameEl.textContent = item.name;
  const priceEl = document.getElementById('battlePlayerPrice');
  if (priceEl) priceEl.textContent = formatCredits(item.price);
  document.getElementById('battlePlayerSlot')?.classList.add('filled');
  pickBotOpponent(item.price);
  const startBtn = document.getElementById('battleStartBtn');
  if (startBtn) startBtn.disabled = false;
}

function pickBotOpponent(basePrice) {
  const lo = basePrice * 0.65, hi = basePrice * 1.45;
  const pool = CS2_SKINS.filter(s => isUsableSkin(s) && s.price >= lo && s.price <= hi);
  const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : CS2_SKINS[Math.floor(Math.random() * CS2_SKINS.length)];
  const wear = rollWear();
  battleBotItem = {
    ...pick,
    wear,
    basePrice: pick.price,
    price: priceWithWear(pick.price, wear),
    botName: ['Bot_Bohdan', 'Bot_Voxxa', 'Bot_Fennec', 'Bot_Raven', 'Bot_M0rsik'][Math.floor(Math.random() * 5)]
  };
  document.getElementById('battleBotEmpty')?.classList.add('hidden');
  document.getElementById('battleBotFilled')?.classList.remove('hidden');
  setImageSource(document.getElementById('battleBotImg'), battleBotItem.img, battleBotItem.name, getSkinKey(battleBotItem));
  const nameEl = document.getElementById('battleBotName');
  if (nameEl) nameEl.textContent = battleBotItem.name;
  const priceEl = document.getElementById('battleBotPrice');
  if (priceEl) priceEl.textContent = formatCredits(battleBotItem.price);
  const botNameEl = document.getElementById('battleBotName2');
  if (botNameEl) botNameEl.textContent = battleBotItem.botName;
  document.getElementById('battleBotSlot')?.classList.add('filled');
}

function rerollBattleBot() {
  if (battleInProgress) return;
  if (!battlePlayerItem) {
    showToast('Спочатку обери свій предмет', 'warn');
    return;
  }
  pickBotOpponent(battlePlayerItem.price);
  beep(500, 0.08, 'square');
}

function resetCoinVisual() {
  const coin = document.getElementById('battleCoin');
  if (!coin) return;
  coin.style.transition = 'none';
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
    const spins = 6 + Math.floor(Math.random() * 3);
    const finalRot = spins * 360 + (isPlayerWin ? 0 : 180);
    coin.style.transition = 'none';
    coin.style.transform = 'rotateX(0deg)';
    void coin.offsetWidth;
    stage.classList.add('is-spinning');
    coin.style.transition = 'transform 3.6s cubic-bezier(.15,.6,.25,1)';
    requestAnimationFrame(() => {
      coin.style.transform = `rotateX(${finalRot}deg)`;
    });
    let n = 0;
    const tick = setInterval(() => {
      beep(500 + Math.random() * 500, 0.025, 'square');
      n++;
      if (n > 35) clearInterval(tick);
    }, 90);
    setTimeout(() => {
      clearInterval(tick);
      stage.classList.remove('is-spinning');
      stage.classList.add('burst');
      soundWin();
      setTimeout(() => stage.classList.remove('burst'), 400);
      resolve();
    }, 3700);
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
  const playerStake = battlePlayerItem;
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

  const isPlayerWin = Math.random() < 0.5;
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
      if (outcome) outcome.innerHTML = `<span class="text-emerald-300 text-lg">🪙 Монетка впала на ТВОЮ сторону! Ти забираєш «${escapeHtml(battleBotItem.name)}».</span>`;
      pSlot?.classList.add('is-winner');
      bSlot?.classList.add('is-loser');
      // A win returns the reserved stake and awards the opponent's item.
      userInventory.push(playerStake);
      const botItem = makeDemoItem(battleBotItem, '-battle');
      userInventory.push(botItem);
      gameState.stats.battleWins = (gameState.stats.battleWins || 0) + 1;
      gameState.daily.battleWins = (gameState.daily.battleWins || 0) + 1;
      addXp(150);
    } else {
      if (outcome) outcome.innerHTML = `<span class="text-red-300 text-lg">🪙 Монетка впала на сторону БОТА. «${escapeHtml(battlePlayerItem.name)}» переходить йому.</span>`;
      bSlot?.classList.add('is-winner');
      pSlot?.classList.add('is-loser');
      addXp(40);
    }

    gameState.rounds.unshift({
      at: Date.now(),
      win: isPlayerWin,
      targetName: `🪙 ${battlePlayerItem.name} vs ${battleBotItem.name}`,
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

    if (startBtn) startBtn.innerHTML = '<i class="fa-solid fa-coins mr-2"></i>КИНУТИ МОНЕТКУ';
    setTimeout(() => {
      battleInProgress = false;
      battlePlayerItem = null;
      battleBotItem = null;
      pSlot?.classList.remove('filled', 'is-winner', 'is-loser');
      bSlot?.classList.remove('filled', 'is-winner', 'is-loser');
      document.getElementById('battlePlayerEmpty')?.classList.remove('hidden');
      document.getElementById('battleBotEmpty')?.classList.remove('hidden');
      document.getElementById('battlePlayerFilled')?.classList.add('hidden');
      document.getElementById('battleBotFilled')?.classList.add('hidden');
      if (startBtn) startBtn.disabled = true;
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

// ── Canvas init ────────────────────────────────────────────────────────────
function initRoyaleCanvas() {
  const c = document.getElementById('royaleWheelCanvas');
  if (!c) return;
  royaleWheelCtx = c.getContext('2d');
}

// ── Compute values ─────────────────────────────────────────────────────────
function royaleGetValues() {
  const pv  = royalePlayerSkins.reduce((s, x) => s + (x.price || 0), 0);
  const bv  = royaleBotPools.map(pool => pool.reduce((s, x) => s + (x.price || 0), 0));
  const total = pv + bv.reduce((a, b) => a + b, 0);
  return { pv, bv, total };
}

// ── Draw wheel ─────────────────────────────────────────────────────────────
function drawRoyaleWheel(rotationRad = 0) {
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
function updateRoyaleUI() {
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
function renderRoyalePlayerSlots() {
  const grid = document.getElementById('royalePlayerSlots');
  if (!grid) return;
  grid.innerHTML = royalePlayerSkins.map((s, idx) => {
    const imgSrc = s.img || '';
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
function renderRoyaleBotPanels() {
  royaleBotPools.forEach((pool, i) => {
    const el = document.getElementById(`royaleBot${i}Skins`);
    if (!el) return;
    el.innerHTML = pool.map(s => {
      const src = s.img || '';
      return `<img class="jackpot-bot-thumb" src="${escapeHtml(src)}" alt="${escapeHtml(s.name)}" title="${escapeHtml(s.name)} · ${formatCredits(s.price || 0)}" onerror="this.style.display='none'">`;
    }).join('');
  });
  updateRoyaleUI();
}

// ── Add a skin from inventory ──────────────────────────────────────────────
function royaleAddSkin() {
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
      <img src="${escapeHtml(s.img || '')}" alt="" class="h-16 object-contain mt-1" onerror="handleSkinImageError(this)">
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
function royaleRemoveSkin(idx) {
  if (royaleInProgress) return;
  royalePlayerSkins.splice(idx, 1);
  renderRoyalePlayerSlots();
}

// ── Generate bot pools ─────────────────────────────────────────────────────
function royaleGenerateBots() {
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
        price: priceWithWear ? priceWithWear(s.price, wear) : (s.price || 100),
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
function resetRoyale(force = false) {
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
function startRoyale() {
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
function royaleSettle(winnerIdx, wagerId) {
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

    addXp(500);
    soundWin();
    setTimeout(() => soundWin(), 200);
    setTimeout(() => soundWin(), 420);

    if (banner)   banner.classList.remove('hidden');
    if (winIcon)  winIcon.textContent = '👑';
    if (winTitle) { winTitle.textContent = 'ПЕРЕМОГА!'; winTitle.className = 'font-heading text-3xl font-extrabold uppercase text-emerald-400'; }
    if (winSub)   winSub.textContent = `Ти забираєш весь банк: ${formatCredits(total)} DC (${allPotSkins.length} скінів)`;
    showToast(`👑 ROYALE! Ти виграв ${formatCredits(total)} DC банк!`, 'success');

    gameState.stats.battleWins   = (gameState.stats.battleWins   || 0) + 1;
    gameState.daily.battleWins   = (gameState.daily.battleWins   || 0) + 1;
    gameState.allTime.royaleWins = (gameState.allTime.royaleWins || 0) + 1;
  } else {
    // User lost — remove their skins from inventory
    const playerIds = new Set(royalePlayerSkins.map(s => s.id));
    userInventory = userInventory.filter(s => !playerIds.has(s.id));

    addXp(60);
    soundLose();

    const botName = ROYALE_BOT_NAMES[winnerIdx - 1] || 'Бот';
    if (banner)   banner.classList.remove('hidden');
    if (winIcon)  winIcon.textContent = '💀';
    if (winTitle) { winTitle.textContent = 'ПОРАЗКА'; winTitle.className = 'font-heading text-3xl font-extrabold uppercase text-red-400'; }
    if (winSub)   winSub.textContent = `${botName} виграв банк ${formatCredits(total)} DC. Ти втратив ${royalePlayerSkins.length} скінів.`;
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

  royaleInProgress = false;
  const startBtn = document.getElementById('royaleStartBtn');
  if (startBtn) startBtn.disabled = false;
}

// ── Init on page show ──────────────────────────────────────────────────────
function initRoyalePage() {
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
  const available = userInventory.filter(s => !used.has(s.id));
  if (!available.length) {
    g.innerHTML = '<div class="col-span-full py-10 text-center text-sm text-gray-400">Усі предмети з інвентарю вже додано до контракту.</div>';
  } else {
    g.innerHTML = available.map(s => {
      const wear = getWear(s);
      return `<button type="button" data-contract-pick="${escapeHtml(String(s.id))}" class="bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 flex flex-col items-center transition">
        <span class="wear-badge wear-${wear.code} self-start">${wear.code}</span>
        <img src="${escapeHtml(s.img || '')}" alt="" data-skin-name="${escapeHtml(s.name)}" class="h-16 object-contain mt-1" onerror="handleSkinImageError(this)">
        <p class="mt-1 text-xs font-bold text-white truncate w-full text-center">${escapeHtml(s.name)}</p>
        <p class="text-amber-400 text-xs font-extrabold">${formatCredits(s.price)}</p>
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
      el.innerHTML = `<span class="wear-badge wear-${getWear(it).code} absolute top-1 left-1 z-10">${getWear(it).code}</span><img src="${escapeHtml(it.img || '')}" alt="" data-skin-name="${escapeHtml(it.name)}" onerror="handleSkinImageError(this)">`;
    } else {
      el.classList.remove('filled');
      el.innerHTML = '<i class="fa-solid fa-plus text-2xl text-amber-500/60"></i>';
    }
  });
  const total = contractItems.filter(Boolean).reduce((s, i) => s + (i.price || 0), 0);
  const tv = document.getElementById('contractTotalValue');
  if (tv) tv.textContent = formatCredits(total);
  const range = document.getElementById('contractRangeValue');
  if (range) {
    if (total > 0) {
      const lo = Math.round(total * 0.75), hi = Math.round(total * 1.35);
      range.textContent = `${formatCredits(lo).replace(' DC', '')} — ${formatCredits(hi)}`;
    } else {
      range.textContent = '—';
    }
  }
}

function clearContract() {
  contractItems = [null, null, null, null, null];
  renderContractSlots();
}

function executeContract() {
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
  const total = items.reduce((s, i) => s + (i.price || 0), 0);
  const lo = total * 0.75, hi = total * 1.35;
  let pool = CS2_SKINS.filter(s => isUsableSkin(s) && s.price >= lo && s.price <= hi);
  if (!pool.length) {
    const targetMid = total;
    const sortedByDiff = [...CS2_SKINS.filter(isUsableSkin)].sort((a, b) => Math.abs(a.price - targetMid) - Math.abs(b.price - targetMid));
    pool = sortedByDiff.slice(0, 10);
  }
  if (!pool.length) {
    showToast('Каталог ще завантажується', 'warn');
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
  addXp(120);
  checkAchievements();
  saveState();
  renderInventoryGrid();
  renderProfileInventory();
  updateAvatarBadge();
  renderGameHub();
  clearContract();
  showToast(`Контракт: «${item.name}» за ${formatCredits(item.price)}`, 'success');
  soundWin();

  lastWonCaseItems = [item];
  displayCaseDropResult([item], false, 'Контракт обміну');
}

/* ===== LIVE FEED & SIMULATION ===== */
function addActivityEvent({ player, skin, outcome = 'attempt' }) {
  const feed = document.getElementById('liveFeed');
  if (!feed || !skin) return;
  const initial = escapeHtml(String(player || '?').trim().charAt(0).toUpperCase() || '?');
  const action = outcome === 'win' ? 'покращив' : outcome === 'loss' ? 'зіграв на' : 'обрав ціллю';
  const accent = outcome === 'win' ? 'text-green-300' : outcome === 'loss' ? 'text-gray-400' : 'text-amber-300';
  const el = document.createElement('div');
  el.className = 'live-feed-item flex items-center gap-2 bg-brand-card border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs shrink-0';
  el.innerHTML = `<span class="activity-avatar flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-black">${initial}</span>
    <span class="max-w-[74px] truncate text-gray-200 font-semibold">${escapeHtml(player || 'Гість')}</span>
    <span class="${accent}">${action}</span>
    <img src="${escapeHtml(skin.img || '')}" alt="" data-skin-id="${escapeHtml(getSkinKey(skin))}" data-skin-name="${escapeHtml(skin.name || 'CS2')}" class="w-6 h-6 object-contain image-skeleton" onerror="handleSkinImageError(this)">
    <span class="max-w-[105px] truncate font-bold text-amber-400">${escapeHtml(skin.name || 'CS2')}</span>`;
  feed.prepend(el);
  while (feed.children.length > 12) feed.removeChild(feed.lastElementChild);
}

function startLiveFeedSimulation() {
  const players = ['Bohdan_47', 'Voxxa', 'Кіт_у_берцах', 'm0rsik', 'Fennec', 'Тато_в_смокінгу', 'Raven_ua', 'Limon4ik'];
  const push = () => {
    const cand = CS2_SKINS.filter(isUsableSkin);
    if (!cand.length) return;
    const s = cand[Math.floor(Math.random() * cand.length)];
    const outcome = Math.random() > 0.42 ? 'win' : 'attempt';
    addActivityEvent({ player: players[Math.floor(Math.random() * players.length)], skin: s, outcome });
  };
  for (let i = 0; i < 5; i++) push();
  setInterval(push, 3500);
}

function estimateSkinPrice(skin) {
  const rarity = skin?.rarity?.name || skin?.rarity || 'Consumer Grade';
  const t = {
    'Consumer Grade': 12,
    'Industrial Grade': 25,
    'Mil-Spec Grade': 60,
    'Restricted': 140,
    'Classified': 360,
    'Covert': 900,
    'Contraband': 6500,
    'Extraordinary': 5000
  };
  const b = t[rarity] || 55;
  const idStr = String(skin?.id ?? Math.random());
  const hash = [...idStr].reduce((s, c) => s + c.charCodeAt(0), 0);
  return Math.min(7200, Math.max(10, Math.round(b * (0.80 + (hash % 41) / 100))));
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

async function loadCompleteSkinCatalog() {
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
      populateCategoryFilter();
      filterShop();
      renderGameHub();
      renderCaseTopDrops();
      renderCaseButtons();
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

    const ex = new Map(CS2_SKINS.map(s => [s.name, s.price]));
    const normalizedCatalog = cat.map((skin, index) => normalizeCatalogSkin({
      id: skin.id || `cs2-${index}`,
      name: skin.name,
      weapon: skin.weapon?.name,
      category: skin.category?.name || 'Інше',
      rarity: skin.rarity?.name || 'Consumer Grade',
      rarityColor: skin.rarity?.color || '#b0c3d9',
      img: skin.image,
      price: ex.get(skin.name) || estimateSkinPrice(skin)
    }, index)).filter(Boolean);
    if (normalizedCatalog.length < 50) throw new Error('Catalog validation failed');
    CS2_SKINS = normalizedCatalog.sort((a, b) => a.weapon.localeCompare(b.weapon) || a.name.localeCompare(b.name));
    _dropChanceCache.clear();

    try {
      sessionStorage.setItem(STORAGE.catalogCache, JSON.stringify(CS2_SKINS));
    } catch {}

    populateCategoryFilter();
    filterShop();
    renderGameHub();
    renderCaseTopDrops();
    renderCaseButtons();
  } catch {
    filteredSkins = CS2_SKINS;
    renderShopGrid(filteredSkins);
    const countEl = document.getElementById('shopCount');
    if (countEl) countEl.textContent = `${CS2_SKINS.length} скінів`;
    renderGameHub();
  }
}

function populateCategoryFilter() {
  const sel = document.getElementById('shopCategory');
  if (!sel) return;
  const cats = [...new Set(CS2_SKINS.map(s => s.category).filter(Boolean))].sort();
  sel.innerHTML = '<option value="all">Уся зброя</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(CATEGORY_LABELS[c] || c)}</option>`).join('');
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

const MARKET_TICK_MS = 5 * 60 * 1000;

function hashMarketSeed(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getMarketTick() {
  return Math.floor(Date.now() / MARKET_TICK_MS);
}

function getMarketMultiplier(skin, tick = getMarketTick()) {
  const skinKey = String(skin?.sourceSkinId || skin?.id || skin?.name || 'cs2');
  // A daily value keeps the market coherent; a smaller 5-minute value creates
  // visible, bounded movement instead of altering the underlying game value.
  const dailyHash = hashMarketSeed(`${getTodayKey()}|${skinKey}|daily`);
  const tickHash = hashMarketSeed(`${getTodayKey()}|${skinKey}|${tick}`);
  const dailyMultiplier = 0.92 + (dailyHash % 1601) / 10_000;
  const tickMultiplier = 0.985 + (tickHash % 301) / 10_000;
  return dailyMultiplier * tickMultiplier;
}

function getFloatedPrice(skin) {
  const base = Number(skin.basePrice ?? skin.price) || 0;
  return Math.max(1, Math.round(base * getMarketMultiplier(skin)));
}

function getTrend(skin) {
  const tick = getMarketTick();
  const current = getMarketMultiplier(skin, tick);
  const previous = getMarketMultiplier(skin, tick - 1);
  const change = previous > 0 ? ((current / previous) - 1) * 100 : 0;
  const percent = Math.abs(change).toFixed(1);
  if (change > 0.05) return { dir: 'up', arrow: '↑', cls: 'trend-up', label: `+${percent}%` };
  if (change < -0.05) return { dir: 'down', arrow: '↓', cls: 'trend-down', label: `−${percent}%` };
  return { dir: 'flat', arrow: '•', cls: 'trend-flat', label: '0.0%' };
}

function getMarketSkin(skin) {
  if (!skin) return skin;
  const basePrice = Number(skin.basePrice ?? skin.price) || 1;
  return { ...skin, basePrice, price: getFloatedPrice(skin) };
}

function startMarketTicker() {
  let renderedTick = getMarketTick();
  setInterval(() => {
    const nextTick = getMarketTick();
    if (nextTick === renderedTick) return;
    renderedTick = nextTick;
    if (document.getElementById('shopModal')?.classList.contains('flex')) filterShop();
  }, 30_000);
}

let filterShopTimeout = null;
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

  let list = CS2_SKINS.filter(s => {
    if (!isUsableSkin(s)) return false;
    if (cat !== 'all' && s.category !== cat) return false;
    const marketPrice = getFloatedPrice(s);
    if (marketPrice < minP || marketPrice > maxP) return false;
    if (marketPrice <= minTarget) return false;
    if (!q) return true;
    return `${s.name} ${s.weapon || ''}`.toLowerCase().includes(q);
  });

  if (sort === 'price-asc') list.sort((a, b) => getFloatedPrice(a) - getFloatedPrice(b));
  else if (sort === 'price-desc') list.sort((a, b) => getFloatedPrice(b) - getFloatedPrice(a));
  else list.sort((a, b) => a.name.localeCompare(b.name));

  filteredSkins = list;
  visibleSkinCount = 80;
  renderShopGrid(filteredSkins);
}

function showMoreSkins() {
  visibleSkinCount += 80;
  renderShopGrid(filteredSkins);
}

function renderShopGrid(skins) {
  const g = document.getElementById('shopGrid');
  if (!g) return;
  const av = skins.filter(isUsableSkin);
  const shown = av.slice(0, visibleSkinCount);
  const countEl = document.getElementById('shopCount');
  if (countEl) countEl.textContent = `${av.length.toLocaleString('uk-UA')} скінів`;
  const moreBtn = document.getElementById('shopMoreBtn');
  if (moreBtn) moreBtn.classList.toggle('hidden', shown.length >= av.length);

  if (!shown.length) {
    g.innerHTML = '<div class="col-span-full py-16 text-center"><i class="fa-solid fa-crosshairs text-3xl text-amber-500/40 mb-3"></i><p class="font-bold text-gray-300">Не знайдено</p></div>';
    return;
  }

  g.innerHTML = shown.map(s => {
    const floated = getFloatedPrice(s);
    const trend = getTrend(s);
    return `<article data-skin-card="${escapeHtml(getSkinKey(s))}" class="skin-card relative bg-brand-card hover:bg-gray-800 border border-brand-border rounded-xl p-3 transition group focus-within:border-amber-500">
      <button type="button" data-select-skin-id="${escapeHtml(getSkinKey(s))}" class="w-full text-left flex flex-col items-center justify-between focus:outline-none">
        <img src="${escapeHtml(s.img)}" alt="${escapeHtml(s.name)}" data-skin-id="${escapeHtml(getSkinKey(s))}" data-skin-name="${escapeHtml(s.name)}" class="h-20 w-full object-contain group-hover:scale-105 transition image-skeleton" loading="lazy" onerror="handleSkinImageError(this)">
        <div class="text-center w-full mt-2 min-w-0">
          <p class="font-bold text-xs text-white truncate" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</p>
          <p class="text-[10px] truncate mt-1" style="color:${escapeHtml(s.rarityColor || '#f59e0b')}">${escapeHtml(s.rarity)}</p>
          <p class="text-amber-400 font-extrabold text-xs mt-0.5">${formatCredits(floated)} <span class="${trend.cls}" title="Зміна за останні 5 хвилин" aria-label="Зміна ціни ${trend.label}">${trend.arrow} ${trend.label}</span></p>
          <p class="text-[9px] text-gray-500">від · FT</p>
        </div>
      </button>
      <button type="button" data-favorite-toggle="${escapeHtml(getSkinKey(s))}" title="Улюблене" class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border ${isFavorite(s) ? 'border-amber-400/60 bg-amber-500 text-black' : 'border-gray-700 bg-black/60 text-gray-400 hover:border-amber-400 hover:text-amber-300'}">
        <i class="${isFavorite(s) ? 'fa-solid' : 'fa-regular'} fa-heart text-xs"></i>
      </button>
    </article>`;
  }).join('');

  g.querySelectorAll('[data-select-skin-id]').forEach(b => b.addEventListener('click', () => {
    const s = getSkinByKey(b.dataset.selectSkinId);
    if (s) selectTargetItem(s);
  }));
  g.querySelectorAll('[data-favorite-toggle]').forEach(b => b.addEventListener('click', () => toggleFavorite(b.dataset.favoriteToggle)));
}

/* Export / Import */
function exportSave() {
  try {
    const data = {
      version: '3.7',
      exportedAt: Date.now(),
      balance: currentUser?.balance ?? 0,
      inventory: userInventory,
      gameState,
      account
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `potuzhno-drop-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Збереження експортовано', 'success');
  } catch {
    showToast('Помилка експорту', 'error');
  }
}

function importSave(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.inventory || !data.gameState) throw new Error('Bad format');
      userInventory = Array.isArray(data.inventory)
        ? data.inventory.map((item, index) => normalizeStoredItem(item, index)).filter(Boolean)
        : [];

      const d = createDefaultGameState();
      gameState = {
        ...d,
        ...data.gameState,
        stats: { ...d.stats, ...(data.gameState.stats || {}) },
        daily: { ...createDefaultDaily(), ...(data.gameState.daily || {}) },
        weekly: { ...createDefaultWeekly(), ...(data.gameState.weekly || {}) },
        allTime: { ...createDefaultAllTime(), ...(data.gameState.allTime || {}) },
        collectionRewards: data.gameState.collectionRewards || {}
      };
      if (data.account) {
        account = {
          ...account,
          nick: cleanText(data.account.nick || account?.nick || 'Гравець', 24),
          steamId: /^\d{17}$/.test(String(data.account.steamId || '')) ? String(data.account.steamId) : account?.steamId,
          createdAt: clampNumber(data.account.createdAt, 0, Number.MAX_SAFE_INTEGER, account?.createdAt || Date.now())
        };
      }
      if (currentUser) currentUser.balance = clampNumber(data.balance, 0, MAX_STORED_BALANCE, currentUser.balance);
      ensureDailyState();
      ensureWeeklyState();
      saveState();
      updateBalanceUI();
      renderInventoryGrid();
      renderProfileInventory();
      updateAvatarBadge();
      renderGameHub();
      updateAccountUI();
      showToast('Збереження імпортовано!', 'success');
      soundWin();
    } catch {
      showToast('Не вдалося імпортувати файл', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* Initialization */
window.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  loadState();

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
  processSteamCallback();
  renderCaseButtons();

  loadCompleteSkinCatalog().finally(() => {
    startMarketTicker();
    startLiveFeedSimulation();
    updateTopupUI();
    renderCaseTopDrops();
    updateFreeCaseBtn();
    renderCaseButtons();
  });

  refreshInventoryModal();
  updateGiftButtonUI();
  updateTopupUI();
  updateFreeCaseBtn();

  const startPage = location.hash.replace('#', '') || localStorage.getItem(STORAGE.page) || 'upgrader';
  showPage(PAGES.includes(startPage) ? startPage : 'upgrader');

  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.flex').forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('flex');
      });
    }
  });

  // Master interval timer for reset texts, daily roll, gift and free case cooldowns
  setInterval(() => {
    if (!gameState) return;
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
window.CASE_TYPES = CASE_TYPES;
window.setCaseCategory = setCaseCategory;
window.setCaseMultiplier = setCaseMultiplier;
window.renderCaseCatalog = renderCaseCatalog;
window.openCurrentCaseFromDetails = openCurrentCaseFromDetails;
window.quickSellCaseResult = quickSellCaseResult;
window.sendCaseDropToUpgrader = sendCaseDropToUpgrader;
window.repeatCaseOpen = repeatCaseOpen;
window.pickBattlePlayerItem = pickBattlePlayerItem;
window.rerollBattleBot = rerollBattleBot;
window.startBattle = startBattle;
window.pickContractSlot = pickContractSlot;
window.clearContract = clearContract;
window.executeContract = executeContract;
window.claimDailyTask = claimDailyTask;
window.claimWeeklyTask = claimWeeklyTask;
window.openCollectionReward = openCollectionReward;
window.sellAllDuplicates = sellAllDuplicates;
window.openInventoryModalFromProfile = openInventoryModalFromProfile;
window.setInventoryFilter = setInventoryFilter;
window.setInventorySort = setInventorySort;
window.renderProfileInventory = renderProfileInventory;
window.debounceFilterShop = debounceFilterShop;
window.filterShop = filterShop;
window.resetShopFilters = resetShopFilters;
window.showMoreSkins = showMoreSkins;
window.toggleFavorite = toggleFavorite;
window.exportSave = exportSave;
window.importSave = importSave;
window.copyLatestResult = copyLatestResult;
window.setTheme = setTheme;
window.resetDemoGame = resetDemoGame;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleSound = toggleSound;
window.claimDailyBonus = claimDailyBonus;
window.openModal = openModal;
window.closeModal = closeModal;
window.startSteamLogin = startSteamLogin;
window.continueSteamLogin = continueSteamLogin;
window.loginWithManualSteamId = loginWithManualSteamId;
window.saveAccountNick = saveAccountNick;
window.doPrestige = doPrestige;
window.topupWatchAd = topupWatchAd;
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
window.applyMultiplierPreset = applyMultiplierPreset;
window.applySuggestion = applySuggestion;
window.chainUpgradeWonSkin = chainUpgradeWonSkin;
window.quickSellUpgradedSkin = quickSellUpgradedSkin;
window.renderSmartSuggestions = renderSmartSuggestions;
