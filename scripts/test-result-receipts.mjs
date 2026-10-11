import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Render the actual production dialogs in disposable fixtures. No player save,
// network game API, sale settlement or wagering runs in the visual preview.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extract = (from, to) => {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, from);
  return source.slice(start, end);
};
const nodes = new Map();
const element = id => {
  if (!nodes.has(id)) {
    const classes = new Set();
    nodes.set(id, { id, innerHTML: '', textContent: '', disabled: false, src: '', alt: '',
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        toggle(name, on = !classes.has(name)) { on ? classes.add(name) : classes.delete(name); },
      },
      classes, removeAttribute(name) { this[name] = ''; },
    });
  }
  return nodes.get(id);
};
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const noop = () => {};
const ctx = vm.createContext({
  document: { getElementById: element },
  escapeHtml, formatCredits: value => `${Number(value).toFixed(2)} PC`,
  roundPc: value => Math.round((value + Number.EPSILON) * 100) / 100,
  getSkinImageSrc: item => item.img, getSkinKey: item => item.id,
  getWear: item => item.wear,
  getItemRarity: () => ({ name: 'Restricted', color: '#8847ff' }),
  rarityStripMarkup: () => '<div class="case-result-rarity"></div>',
  setImageSource: (node, src, alt) => { node.src = src; node.alt = alt; },
  userInventory: [], SELL_RATE: .9, lastCaseFairAudit: [], lastDropContext: '',
  canSellInventoryItem: item => !item.inventoryProtected && !item.accountBound,
  canUseInventoryItem: item => ctx.userInventory.some(owned => owned.id === item.id && !owned.inventoryProtected && !owned.accountBound),
  verifiedInventoryMarketPrice: item => item.price,
  isInventoryMutationBusy: () => false, getInventoryDuplicateKey: item => `${item.name}/${item.phase || ''}/${item.wear.code}`,
  showToast: noop, openModal: id => { ctx.opened = id; }, closeModal: noop,
});
vm.runInContext(extract('let pendingInventorySale = null;', 'function renderInventoryGrid('), ctx);
vm.runInContext(extract('function resultSkinDetailsMarkup(', 'function executeUpgrade('), ctx);
vm.runInContext(extract('function displayCaseDropResult(', 'function quickSellCaseResult('), ctx);
const skin = { id: 'fixture', name: 'AWP | Atheris', img: 'https://example.test/actual-skin.png', price: 30,
  wear: { code: 'BS', name: 'Battle-Scarred' } };
ctx.userInventory = [skin];
ctx.showResultModal(true, skin, 0, { chance: 30, inputValue: 10, targetValue: 30, balanceDelta: -10 });
assert.equal(element('resultImg').src, skin.img);
assert.ok(element('resultSkinDetails').innerHTML.includes('BS · Battle-Scarred'));
assert.ok(element('resultMeta').innerHTML.includes('−10.00 PC'));
assert.ok(!element('resultMeta').innerHTML.includes('+30.00 PC'), 'A skin is not a PC deposit');
assert.equal(element('resultSellBtn').textContent, 'Продати · 27.00 PC');
ctx.showResultModal(false, null, 0, { chance: 30, inputValue: 10, targetValue: 30, targetSkin: skin, balanceDelta: 0 });
assert.equal(element('resultImg').src, skin.img, 'A missed target keeps its actual image');
assert.ok(element('resultImg').classes.has('is-missed-skin'));
assert.ok(element('resultUpgraderActions').classes.has('hidden'));
assert.ok(element('resultMeta').innerHTML.includes('Ціль · не отримано'));
assert.ok(element('resultMeta').innerHTML.includes('0.00 PC'));
ctx.showResultModal(false, null);
assert.equal(element('resultSkinDetails').innerHTML, '', 'No stale skin identity in an empty result');
assert.equal(element('resultImg').src, '');
assert.ok(!element('resultMeta').innerHTML.includes('0.00 PC'), 'Missing settlement data is unknown, not zero');
const malicious = { ...skin, name: '<img src=x onerror=alert(1)>', phase: '<script>Phase 2</script>' };
assert.ok(ctx.resultSkinDetailsMarkup(malicious).includes('&lt;script&gt;'));
assert.ok(!ctx.resultSkinDetailsMarkup(malicious).includes('<img'));
ctx.displayCaseDropResult([skin], false, 'Fixture case', 'case', { inputValue: 5, balanceDelta: -5 });
assert.ok(element('caseResultSummary').innerHTML.includes('−5.00 PC'));
assert.ok(element('caseResultItemsGrid').innerHTML.includes(skin.img));
assert.ok(element('caseResultItemsGrid').innerHTML.includes('BS · Battle-Scarred'));
assert.ok(!element('caseResultSummary').innerHTML.includes('%'), 'Multi-drop results do not invent a chance');
ctx.displayCaseDropResult([skin], false, 'Contract', 'contract', { inputValue: 50, balanceDelta: 0 });
assert.equal(element('caseResultTitle').textContent, 'КОНТРАКТ ВИКОНАНО');
assert.equal(element('caseRepeatLabel').textContent, 'До контракту');
assert.equal(element('caseResultFairProof').innerHTML, '', 'A contract must not inherit a case proof');
assert.ok(element('caseResultSummary').innerHTML.includes('0.00 PC'));
ctx.displayCaseDropResult([skin, skin], false, 'Ticket case', 'case', { inputValue: 0, balanceDelta: 0, inputLabel: 'Квитків: 2' });
assert.ok(element('caseResultSummary').innerHTML.includes('Квитків: 2'));
assert.ok(element('caseResultItemsGrid').classes.has('is-multi'));
skin.inventoryProtected = true;
ctx.displayCaseDropResult([skin], false, 'Protected', 'case');
assert.equal(element('caseResultSellBtn').disabled, true);
assert.equal(element('caseResultUpgradeBtn').disabled, true);
skin.inventoryProtected = false;
assert.equal(ctx.userInventory.length, 1, 'Rendering never mutates inventory');
for (const [from, to] of [['function sellAllDuplicates()', 'function openInventoryOrFocus('], ['function quickSellCaseResult()', 'function sendCaseDropToUpgrader(']]) {
  assert.ok(!extract(from, to).includes('window.confirm'), 'Sales must use the shared native-styled quote');
}
console.log('Result receipts passed: actual images, wear/phase identity, escaped data, factual PC deltas, missed targets, mode-specific actions, protected items and non-mutating rendering.');

if (process.argv.includes('--preview')) {
  const { createServer } = await import('node:http');
  const image = source.match(/'AWP \| Atheris': '(https:[^']+)'/)[1];
  const sample = { ...skin, img: image };
  const drops = ['FN', 'MW', 'FT', 'WW', 'BS'].map((code, i) => ({ ...sample, id: `demo-${i}`, wear: { code, name: ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'][i] } }));
  const states = [];
  const collect = (label, modalId, render) => {
    nodes.clear(); ctx.userInventory = drops; render();
    states.push({ label, modalId, nodes: [...nodes.values()].map(node => ({ id: node.id, innerHTML: node.innerHTML,
      textContent: node.textContent, disabled: node.disabled, src: node.src, alt: node.alt, classes: [...node.classes], className: node.className || '' })) });
  };
  collect('Апгрейд: виграш', 'resultModal', () => ctx.showResultModal(true, drops[4], 0, { chance: 30, inputValue: 10, targetValue: 30, balanceDelta: -10, inputKind: 'balance' }));
  collect('Апгрейд: невдача', 'resultModal', () => ctx.showResultModal(false, null, 0, { chance: 30, inputValue: 10, targetValue: 30, targetSkin: drops[4], balanceDelta: 0, inputKind: 'skin' }));
  collect('Кейс ×5', 'caseModal', () => ctx.displayCaseDropResult(drops, false, 'Farm Rush · ×5', 'case', { inputValue: 25, balanceDelta: -25 }));
  collect('Контракт', 'caseModal', () => ctx.displayCaseDropResult([drops[4]], false, 'Контракт обміну', 'contract', { inputValue: 50, balanceDelta: 0 }));
  collect('Продаж дропа', 'inventorySaleModal', () => ctx.requestInventoryBatchSale(drops.map(item => item.id), { title: 'Продати отриманий дроп?' }));
  const markup = extractHtml('<div id="resultModal"', '<div id="toastContainer"');
  function extractHtml(from, to) { return html.slice(html.indexOf(from), html.indexOf(to)); }
  const head = html.slice(html.indexOf('<!-- Preconnect'), html.indexOf('</head>')).replace(/<script[\s\S]*?<\/script>/g, '');
  const page = `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Результати · тестові дані</title>${head}<style>body{margin:0;background:#080c13}#fixture-label{position:fixed;top:0;left:0;right:0;z-index:115;padding:9px 12px;background:#0e1723;color:#c6d3e3;font-size:11px;text-align:center}#fixture-nav{position:fixed;bottom:0;left:0;right:0;z-index:115;display:flex;flex-wrap:wrap;justify-content:center;gap:5px;padding:8px;background:#0e1723}#fixture-nav button{padding:6px 9px;border:1px solid #354154;border-radius:7px;color:#c6d3e3;font-size:11px}#fixture-nav button[aria-pressed=true]{color:#fcd34d;border-color:#eab308}.modal-backdrop{padding-top:44px!important;padding-bottom:90px!important}.round-result-panel,.inventory-sale-panel{max-height:calc(100dvh - 144px)!important}</style></head><body class="pd-rebrand"><p id="fixture-label">Тестові дані · без ставок, продажу та змін акаунта</p>${markup.replace(/onclick="[^"]*"/g, '').replace(/onerror="[^"]*"/g, '')}<nav id="fixture-nav" aria-label="Тестові результати">${states.map((state, i) => `<button type="button" data-state="${i}">${state.label}</button>`).join('')}</nav><script>const states=${JSON.stringify(states).replaceAll('<', '\\u003c')};const originals=new Map([...document.querySelectorAll('[id]')].map(node=>[node.id,{html:node.innerHTML,cls:node.className}]));function show(i){for(const state of states)for(const item of state.nodes){const node=document.getElementById(item.id);if(!node)continue;const original=originals.get(item.id);node.innerHTML=original.html;node.className=original.cls;}document.querySelectorAll('.modal-backdrop').forEach(node=>{node.classList.add('hidden');node.classList.remove('flex');});for(const item of states[i].nodes){const node=document.getElementById(item.id);if(!node)continue;if(item.innerHTML)node.innerHTML=item.innerHTML;else if(item.textContent)node.textContent=item.textContent;if(item.className)node.className=item.className;node.disabled=item.disabled;if(item.src){node.src=item.src;node.alt=item.alt;}for(const name of ['is-upgrade-win','is-upgrade-loss','is-missed-skin','is-multi','hidden'])node.classList.toggle(name,item.classes.includes(name));}const modal=document.getElementById(states[i].modalId);modal.classList.remove('hidden');modal.classList.add('flex');document.querySelectorAll('[data-state]').forEach(node=>node.setAttribute('aria-pressed',String(Number(node.dataset.state)===i)));}document.querySelectorAll('[data-state]').forEach(node=>node.addEventListener('click',()=>show(Number(node.dataset.state))));show(0);</script></body></html>`;
  const assets = new Map(['/css/style.css', '/css/tailwind.css'].map(path => [path, readFileSync(new URL(`..${path}`, import.meta.url))]));
  createServer((request, response) => {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    if (path === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(page.replace('</head>', '<style>.modal-backdrop{padding-top:38px!important;padding-bottom:60px!important}.round-result-panel,.inventory-sale-panel{max-height:calc(100dvh - 100px)!important}@media(min-width:800px){.modal-backdrop{padding:16px!important}.round-result-panel,.inventory-sale-panel{max-height:calc(100dvh - 32px)!important}#fixture-nav{top:50%;bottom:auto;right:auto;left:12px;max-width:165px;flex-direction:column;transform:translateY(-50%);border-radius:12px}}</style></head>'));
    }
    else if (assets.has(path)) { response.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'no-store' }); response.end(assets.get(path)); }
    else { response.writeHead(404); response.end(); }
  }).listen(8788, '127.0.0.1', () => console.log('Read-only result preview: http://127.0.0.1:8788/'));
}
