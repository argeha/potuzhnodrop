import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PotuzhnoState } from '../src/worker.mjs';

// Everything below is a disposable fixture: no Steam login, real profile,
// external requests, game saves or inventory operations are performed.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../src/worker.mjs', import.meta.url), 'utf8');
const section = (from, to) => {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, from);
  return source.slice(start, end);
};
const steamId = '76561198000000001';
const steamProfile = { steamId, name: 'Кіт 🐱', avatar: 'https://avatars.steamstatic.com/fixture.jpg', visibility: 'private' };
const inventory = [
  { id:'game-drop', name:'AWP | Gungnir', price:7000 },
  { id:'pass-reward', name:'Reward', price:10, exclusive:true, accountBound:true },
  { id:`steam-copy-${steamId}-123`, name:'Legacy copy', price:4, steamImported:true, steamAssetId:'123', steamOwnerId:steamId }
];
const originalInventory = JSON.stringify(inventory);
const stored = new Map(), requests = [], states = [], nodes = new Map();
let bootstrapCalls = 0, sessionExpired = false, loginPrompts = 0;
const node = id => {
  if (!nodes.has(id)) nodes.set(id, { textContent:'', innerHTML:'Original button', dataset:{}, disabled:false,
    classList:{ toggle() {} }, setAttribute() {} });
  return nodes.get(id);
};
const ctx = vm.createContext({
  account:{ nick:'Гість', isGuest:true }, currentUser:{ balance:123.45, name:'Гість' }, userInventory:inventory,
  gameState:{ xp:1865, stats:{ rounds:13, wins:6 } }, steamSyncPromise:null,
  MAX_STORED_BALANCE:1_000_000, DEMO_STARTING_BALANCE:12, MAX_STORED_ITEM_VALUE:25_000,
  STORAGE:{steamId:'sid',steamNudge:'nudge'},
  localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},
  normalizeSteamProfile:(profile,id)=>profile ? {...profile,steamId:profile.steamId||id} : null,
  fallbackSteamProfile:id=>({...steamProfile,steamId:id}),
  getSteamImportRecord:id=>({steamId:id,assetIds:['123'],lastSyncAt:1}),
  getSteamImportMap:()=>ctx.account.steamImports||{}, isSteamAccount:(value,id)=>value?.steamId===id,
  applyLoggedInUI() {}, updateAccountUI() {}, saveState() {}, renderInventoryGrid() {}, showToast() {}, closeModal() {},
  setSteamConnectionState:state=>states.push(state),
  bootstrapSteamAccount:async()=>{bootstrapCalls++;return true;}, startSteamLogin:()=>{loginPrompts++;},
  document:{getElementById:node},
  fetch:async url=>{
    requests.push(url);
    assert.equal(url,'/api/steam/session','No Steam inventory, quote, game-save or other network call is allowed for a profile refresh');
    return Response.json(sessionExpired ? {error:'Сесія Steam завершилась.'} : {connected:true,profile:steamProfile,expiresAt:Date.now()+60_000},
      {status:sessionExpired?401:200});
  },
  location:new URL('https://fixture.invalid/?steam_connected=1#profile'), URLSearchParams,
  history:{replaceState(){}}, UUID_PATTERN:/^[a-f0-9-]{36}$/i,
  cleanImageUrl:value=>value||'', getPlayerLevel:()=>2, getHalloweenCosmetics:()=>({}),
  getPulseCircuitState:()=>({}), getSignalCampaignProgress:()=>({completed:0,total:6,state:{claimed:[]}}),
  getProfileStyleDefinition:()=>({id:'standard'}), buildPublicShowcasePayload:()=>[], buildPublicAchievementsPayload:()=>({count:0,unlocked:[]}),
  verifiedInventoryMarketPrice:item=>item.price, hasSteamIdentity:()=>Boolean(ctx.currentUser.steamId),
  isCloudProfile:()=>false, isProfileHidden:()=>false
});
vm.runInContext(section('function clampNumber(', 'function cleanImageUrl('), ctx);
vm.runInContext(section('async function fetchSteamSession()', 'function isDefaultPlayerNickname('), ctx);
vm.runInContext(section('function isDefaultPlayerNickname(', 'function setSteamSyncUI('), ctx);
vm.runInContext(section('function setSteamSyncUI(', 'async function disconnectSteam('), ctx);
vm.runInContext(section('function refreshInventoryModal()', 'function openInventoryModalFromProfile()'), ctx);
vm.runInContext(section('async function processSteamCallback()', 'function renderDailyCalendar()'), ctx);
vm.runInContext(section('function buildPublicProfilePayload()', 'function publicProfileUrl('), ctx);
vm.runInContext(section('function getCommunityPlayerPayload()', 'function buildCommunityProfile('), ctx);

for (const nick of ['Гість','Гость','guest','Гравець','Гравець_123','Steam_0001','']) {
  ctx.account.nick=nick; ctx.account.isGuest=true;
  ctx.applySteamIdentity(steamId,steamProfile,{skipAutoSync:true});
  assert.equal(ctx.account.nick,steamProfile.name,'Guest/default names adopt the Steam persona');
  assert.equal(ctx.account.isGuest,undefined);
  assert.equal(ctx.getCommunityPlayerPayload().name,steamProfile.name);
  assert.equal(ctx.buildPublicProfilePayload().name,steamProfile.name);
}
ctx.account.nick='Мій нік';
ctx.applySteamIdentity(steamId,steamProfile,{skipAutoSync:true});
assert.equal(ctx.account.nick,'Мій нік','A chosen game nickname must survive login/profile refresh');
ctx.account.nick='Гість'; // A legacy portable save can contain this stale name.
assert.equal(ctx.getPlayerDisplayName(),steamProfile.name);
assert.equal(ctx.getCommunityPlayerPayload().name,steamProfile.name);
assert.equal(ctx.buildPublicProfilePayload().name,steamProfile.name);
const beforeRefresh=requests.length;
await Promise.all(Array.from({length:10},()=>ctx.syncSteamProfile()));
assert.equal(requests.length-beforeRefresh,1,'Concurrent clicks share one profile refresh');
assert.equal(ctx.steamSyncPromise,null);
assert.equal(ctx.currentUser.balance,123.45);
assert.equal(JSON.stringify(ctx.userInventory),originalInventory,'New game drops, exclusive rewards and old Steam copies are preserved verbatim');
assert.equal(vm.runInContext('syncSteamInventory === syncSteamProfile',ctx),true,'Legacy handlers cannot import anything');
assert.equal(await ctx.restoreSteamSession(),true);
assert.equal(bootstrapCalls,1,'Restoring the session still restores the existing game save');
const beforeCallback=requests.length;
assert.equal(await ctx.processSteamCallback(),true);
assert.equal(requests.length-beforeCallback,1,'Login callback reads the session only, never the real Steam inventory');
assert.equal(bootstrapCalls,2);
assert.equal(states.at(-1),'connected');
sessionExpired=true;
assert.equal(await ctx.syncSteamProfile(),false);
assert.equal(loginPrompts,1); assert.equal(states.at(-1),'expired');
assert.equal(JSON.stringify(ctx.userInventory),originalInventory);
assert.equal(ctx.currentUser.balance,123.45);
assert.ok(!source.includes('fetchSteamInventoryPage') && !source.includes('importSteamItems(') && !source.includes('/api/steam/inventory'));
assert.ok(!workerSource.includes('steamcommunity.com/inventory/'));
assert.ok(!html.includes('onclick="syncSteamInventory()"') && !html.includes('Steam-копій'));

class MemoryStorage {
  values=new Map();
  async get(key){return structuredClone(this.values.get(key));}
  async put(key,value){this.values.set(key,structuredClone(value));}
  async transaction(fn){return fn({get:key=>this.get(key),put:(key,value)=>this.put(key,value),delete:async key=>this.values.delete(key)});}
}
const storage=new MemoryStorage();
const object=new PotuzhnoState({storage},{POTUZHNO_STATE:{idFromName:value=>value,get:()=>({fetch:async()=>Response.json({hidden:false})})}});
object.getSteamSession=async()=>({steamId});
const inventoryResponse=await object.fetch(new Request('https://fixture.invalid/api/steam/inventory?cursor=123'));
assert.equal(inventoryResponse.status,410);
assert.deepEqual((await inventoryResponse.json()).items,[],'Old clients receive no importable assets');
assert.equal((await object.fetch(new Request('https://fixture.invalid/api/steam/inventory',{method:'POST'}))).status,405);
object.getSteamSession=async()=>null;
assert.equal((await object.fetch(new Request('https://fixture.invalid/api/steam/inventory'))).status,401);
assert.equal(storage.values.size,0,'Disabled import does not mutate any profile or game save');

let authenticatedId=steamId;
const resolvedIds=[];
object.authenticatedSteamIdForCommunity=async()=>authenticatedId;
object.resolveSteamProfile=async id=>{resolvedIds.push(id);return steamProfile;};
const heartbeat=async(name,claimedId=steamId,event=null)=>{
  const response=await object.fetch(new Request('https://fixture.invalid/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    id:'11111111-1111-4111-8111-111111111111',player:{name,cloudProfileId:claimedId,xp:1865,wins:6,rounds:13,level:2},event
  })}));
  assert.equal(response.status,200);return response.json();
};
let community=await heartbeat('Гість',steamId,{id:'fixture-drop',kind:'case',skin:{name:'Fixture skin',price:1}});
assert.equal(community.leaderboard[0].name,steamProfile.name,'Server repairs a guest name from an authenticated old client');
assert.ok(community.leaderboard[0].avatarUrl.startsWith('/api/community-avatar?'));
assert.equal(community.events[0].name,steamProfile.name);
assert.ok(!JSON.stringify(community).includes(steamId),'Public responses do not expose Steam IDs');
const oldState=await storage.get('community:season');oldState.events[0].name='Гість';await storage.put('community:season',oldState);
community=await heartbeat('Гість');
assert.equal(community.events[0].name,steamProfile.name,'Existing feed cards use the corrected current player name');
community=await heartbeat('Мій нік');assert.equal(community.leaderboard[0].name,'Мій нік');
const resolvedBefore=resolvedIds.length;
authenticatedId='';await heartbeat('Гість');
authenticatedId=steamId;await heartbeat('Гість','76561198000000002');
assert.equal(resolvedIds.length,resolvedBefore,'Unverified or mismatched client Steam IDs cannot resolve somebody else’s identity');
console.log('Steam profile passed: no real-inventory imports, disabled legacy API, preserved owned items/balance, session and save bootstrap, profile-only refresh, default-name migration, custom names and authenticated community repair.');
