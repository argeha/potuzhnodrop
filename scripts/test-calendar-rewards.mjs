import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Calendar claims use isolated memory and a fixed clock, never real rewards.
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const section=(from,to)=>{
  const start=source.indexOf(from),end=source.indexOf(to,start);
  assert.ok(start>=0&&end>start,from);return source.slice(start,end);
};
let clock=Date.parse('2026-10-17T12:00:00Z'),itemId=0;
const stored=new Map(),content={innerHTML:''};
const ctx=vm.createContext({
  gameState:{dailyStreak:{current:0,best:0,lastDay:''}},currentUser:{balance:100},userInventory:[],
  Date:{now:()=>clock},localDayKey:(offset=0)=>new Date(clock+offset*86_400_000).toISOString().slice(0,10),
  STORAGE:{bonusAt:'fixture-calendar-at'},
  localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},
  document:{getElementById:id=>id==='dailyCalendarContent'?content:null},
  roundPc:value=>Math.round(value*100)/100,formatCredits:value=>`${value} PC`,escapeHtml:value=>String(value),
  CS2_SKINS:['Glock-18 | Water Elemental','AWP | Atheris','P250 | See Ya Later'].map(name=>({name,price:1})),
  normalizeSkinName:value=>value.toLowerCase(),makeDemoItem:(skin,suffix)=>({...skin,id:`fixture-${++itemId}${suffix}`}),
  updateAvatarBadge() {},updateBalanceUI() {},saveState() {},updateGiftButtonUI() {},renderProfileInventory() {},
  checkAchievements() {},showToast() {},soundCoin() {},renderGameHub() {}
});
vm.runInContext(section('const DAILY_CALENDAR_REWARDS =','function economyReward('),ctx);
vm.runInContext(section('function claimDailyStreak()','function getLevelProgress()'),ctx);
vm.runInContext(section('function renderDailyCalendar()','function isReferralAccountId('),ctx);
const expected=[10,11,12.5,14.5,17,20,30];
const definitions=JSON.parse(vm.runInContext('JSON.stringify(DAILY_CALENDAR_REWARDS)',ctx));
assert.deepEqual(definitions.map(day=>day.credits),expected);
assert.equal(definitions.filter(day=>day.collectible).length,1);
assert.equal(definitions[6].collectible,true);
for(const day of definitions) assert.ok(day.title.startsWith(`+${day.credits}`),'The displayed calendar agrees with actual payouts');
let paid=0;
for(let day=1;day<=14;day++){
  if(day>1)clock+=86_400_000;
  ctx.claimDailyCalendarReward();
  paid+=expected[(day-1)%7];
  assert.equal(ctx.currentUser.balance,100+paid,'The real claim function pays exactly the displayed reward');
  assert.equal(ctx.gameState.dailyStreak.current,day);
  assert.equal(ctx.userInventory.length,Math.floor(day/7),'The seventh-day collectible still arrives alongside PC');
  assert.ok(content.innerHTML.includes('НАСТУПНА НАГОРОДА ЗАВТРА'));
  ctx.claimDailyCalendarReward();
  assert.equal(ctx.currentUser.balance,100+paid,'Repeated clicks cannot pay the same day twice');
  ctx.gameState=JSON.parse(JSON.stringify(ctx.gameState));
  assert.equal(ctx.claimDailyBonus(),false,'Reloading retains the existing 24-hour receipt');
}
assert.equal(paid,230,'One seven-day cycle pays 115 PC');
assert.ok(ctx.userInventory.every(item=>item.exclusive&&item.accountBound&&item.dailyCalendarReward));
assert.ok(content.innerHTML.includes('+30 PC + колекційний скін'));
const inventoryBefore=JSON.stringify(ctx.userInventory);
clock+=2*86_400_000;
assert.equal(ctx.claimDailyBonus(),true);
assert.equal(ctx.currentUser.balance,340,'A missed day restarts the reward at 10 PC');
assert.equal(ctx.gameState.dailyStreak.current,1);assert.equal(ctx.gameState.dailyStreak.best,14);
assert.equal(JSON.stringify(ctx.userInventory),inventoryBefore,'A reset must not remove existing collectibles');

// Updating a player who already claimed the old day-4 amount cannot replay it.
ctx.gameState.dailyStreak={current:4,best:6,lastDay:ctx.localDayKey()};
stored.set('fixture-calendar-at',String(clock));
const beforeLegacy=ctx.currentUser.balance;
assert.equal(ctx.claimDailyBonus(),false);
assert.equal(ctx.currentUser.balance,beforeLegacy);
assert.equal(ctx.gameState.dailyStreak.current,4);
clock+=86_400_000;
assert.equal(ctx.claimDailyBonus(),true);
assert.equal(ctx.currentUser.balance,beforeLegacy+17,'The next unclaimed day receives the increased amount without resetting the streak');
assert.equal(ctx.gameState.dailyStreak.current,5);
console.log('Calendar rewards passed: 10x displayed/actual payouts, 115 PC per cycle, preserved streaks and seventh-day collectibles, cooldown/reload/legacy claim protection and missed-day reset.');
