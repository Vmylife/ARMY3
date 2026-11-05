// ARMY3: persistent weapon locks and the one-battle, ten-shot loaner.
// Installed after creating the camp/battle controller to preserve the combat engine.
const SLOTS={up:'fists',right:'pistol',bottom:'rifle'};
export function installWeaponRules(combat,{mode='camp',temporaryPistol=false}={}){
 const loan=mode==='official'&&temporaryPistol;
 const own=gun=>mode==='camp'?
  (Number(window.armyProgression?.state?.()?.weapons?.[gun])||0)>0:
  (Number(window.armyBattleOfficialLoadout?.weapons?.[gun])||0)>0;
 let broken=false,shots=0;
 const available=gun=>gun==='fists'||(gun==='pistol'||gun==='rifle')&&
  (mode==='sandbox'||(gun!=='pistol'||!broken)&&own(gun));
 let weapon=loan?'fists':combat.weapon;
 Object.defineProperty(combat,'weapon',{
  configurable:true,enumerable:true,
  get(){return weapon},
  set(next){
   if(available(next)){weapon=next;return}
   if(next!=='fists')combat.notice?.(next==='pistol'&&broken?'臨時手槍已報廢':'武器尚未解鎖');
  }
 });
 combat.temporaryPistol=loan;
 combat.temporaryPistolShots=0;
 combat.temporaryPistolBroken=false;
 combat.temporaryPistolMaxShots=10;
 // The same wheel handles taps, hold-drag-release, keyboard and touch.
 // The property guard prevents all of those paths from equipping locked guns.
 const wheel=document.getElementById('campCombatWheel');
 const paint=()=>{
  if(!wheel||wheel.hidden)return;
  for(const slot of wheel.querySelectorAll('[data-choice]')){
   const gun=SLOTS[slot.dataset.choice];if(!gun)continue;
   const ok=available(gun),lock=slot.classList.contains('locked');
   if(lock===ok)slot.classList.toggle('locked',!ok);
   slot.setAttribute('aria-disabled',String(!ok));
   const icon=slot.querySelector('span'),name=slot.querySelector('small');
   if(icon&&gun==='pistol')icon.textContent=ok?'🔫':'🔒';
   if(icon&&gun==='rifle'&&!ok)icon.textContent='🔒';
   if(name)name.textContent=!ok?(gun==='pistol'&&broken?'已報廢':'未解鎖'):
    (gun==='pistol'&&loan?'臨時手槍':gun==='fists'?'拳頭':gun==='pistol'?'手槍':'步槍');
  }
  const chosen=SLOTS[wheel.querySelector('.campWheelSlot.selected')?.dataset.choice];
  const center=document.getElementById('campWheelName');
  if(center&&chosen&&!available(chosen))center.textContent=chosen==='pistol'&&broken?'已報廢':'未解鎖';
  else if(center&&chosen==='pistol'&&loan)center.textContent='臨時手槍';
 };
 if(wheel){
  new MutationObserver(paint).observe(wheel,{attributes:true,subtree:true,attributeFilter:['hidden','class']});
 }
 if(mode!=='sandbox'){
  const style=document.createElement('style');
  style.textContent='.campWheelSlot.locked{opacity:.46;filter:grayscale(.65);border-style:dashed!important}.campWheelSlot.locked.selected{box-shadow:none!important;background:#284639!important;color:#eee0bc!important}';
  document.head.append(style);
 }
 if(!loan){combat.refreshHUD(true);return combat}
 // Lv.1 stats and magazine were provisioned by the official loadout.
 // Count spent cartridges, including any perk-generated extra rounds.
 const perks=combat.perks,originalShot=perks.onShot.bind(perks);
 const oldIndicator=perks.updateIndicator.bind(perks);
 perks.updateIndicator=function(c){
  oldIndicator(c);
  const badge=document.getElementById('battleTalentStatus');
  if(badge){
   const mark=broken?'臨時手槍已報廢':'臨時手槍 '+(10-shots)+'/10 發';
   if(!badge.textContent.includes(mark))badge.textContent+=(badge.textContent?' · ':'')+mark;
  }
 };
 function showBroken(){
  const node=document.createElement('div');
  node.id='battlePistolBreakNotice';node.textContent='手槍壞掉了…';
  node.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 100px);left:50%;transform:translateX(-50%);z-index:16;pointer-events:none;max-width:calc(100vw - 110px);padding:6px 12px;border-radius:9px;background:#183b2bd9;color:#ffddb0;border:1px solid #f0ca8455;box-shadow:0 2px 10px #09170d55;text-align:center;white-space:nowrap;font:850 14px/1.4 system-ui,-apple-system,"PingFang TC",sans-serif;opacity:1;transition:opacity .65s ease;-webkit-user-select:none;user-select:none';
  node.setAttribute('role','status');document.body.append(node);
  setTimeout(()=>{node.style.opacity='0';setTimeout(()=>node.remove(),700)},3000);
 }
 perks.onShot=function(c,bullet){
  const loanShot=c.weapon==='pistol'&&!broken;
  const before=loanShot?perks.ammo.pistol:0;
  if(loanShot)perks.bonusShots.pistol=Math.min(perks.bonusShots.pistol,Math.max(0,9-shots));
  originalShot(c,bullet);
  if(!loanShot)return;
  shots=Math.min(10,shots+Math.max(1,before-perks.ammo.pistol));
  c.temporaryPistolShots=shots;
  if(shots>=10){
   broken=true;c.temporaryPistolBroken=true;
   c.weapon='fists';c.attackPointer=null;c.attackKeyboard=false;c.playerCooldown=0;
   perks.reloadWeapon=null;perks.reloadAt=0;perks.bonusShots.pistol=0;
   c.refreshHUD(true);showBroken();paint();
  }
  perks.updateIndicator(c);
 };
 combat.refreshHUD(true);perks.updateIndicator(combat);
 return combat;
}
