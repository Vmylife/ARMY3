// ARMY3 enemy-wave sandbox, intentionally NOT imported by the main camp.
// Uses the approved punch, gun, knockdown and stand-up combat mechanics.
import {CampCombat,COMBAT_RISE_SECONDS,COMBAT_DOWN_SECONDS} from '../systems/campCombat.js?v=18';
import {moveNpc,canOccupy,bulletClearance,bulletLineClear,meleeLineClear} from './battleCollision.js?v=1';
import {battleRoute,battleClear} from './battleNav.js?v=3';
import {waveEntry} from './breaches.js?v=5';
import {insidePerimeter} from '../map/camp.js?v=093';
import {renderBattleSettlement} from './settlement.js?v=4';
import {BattlePerks} from './talentLab.js?v=7';
import {BattleWeaponLevels} from './weaponLab.js?v=3';
const $=id=>document.getElementById(id);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const BATTLE_SPAWN={player:{x:22.4,z:13.2},allies:[
 {x:16.6,z:14.1},{x:19.3,z:13.5},{x:22.0,z:11.0},{x:24.9,z:13.6},{x:27.1,z:11.7}
]};
// Every wave arrives on schedule, irrespective of survivors.
export const WAVE_INTERVAL=25;
export const FINAL_WAVE=8;
export function waveLoadout(wave){
 if(wave===1)return {fists:10,pistol:0,rifle:0};
 if(wave===2)return {fists:7,pistol:5,rifle:0};
 if(wave===3)return {fists:5,pistol:5,rifle:4};
 if(wave===4)return {fists:5,pistol:5,rifle:6};
 if(wave===5)return {fists:3,pistol:5,rifle:10};
 return {fists:2,pistol:6,rifle:Math.min(16,10+(wave-5)*2)};
}
export const WAVE_SIZE=wave=>Object.values(waveLoadout(wave)).reduce((a,b)=>a+b,0);
export function waveWeapons(wave){
 const remain={...waveLoadout(wave)},used={fists:0,pistol:0,rifle:0};
 const total=WAVE_SIZE(wave),weapons=[],order=['fists','pistol','rifle'];
 for(let i=0;i<total;i++){
  const type=order.filter(k=>remain[k]>0)
   .sort((a,b)=>(waveLoadout(wave)[b]*(i+1)/total-used[b])-
                (waveLoadout(wave)[a]*(i+1)/total-used[a]))[0];
  weapons.push(type);remain[type]--;used[type]++;
 }
 return weapons;
}
export class ArmyBattleCombat extends CampCombat{
 constructor({player,enemies,allies,renderer,rifleGlb,npcGlb,createEnemy}){
  super({player,npcs:enemies,renderer,rifleGlb,npcGlb});
  this.allies=allies;
  this.wave=0;this.waveTimer=1.8;this.lastWaveClock=null;this.running=false;
  this.survivalSeconds=0;this.usedInvincible=false;this.battleOutcome=null;
  // Normal hits never launch a reaction clip. Keep only a tiny feedback pause
  // and the already-supported red screen flash (no extra UI layer).
  this.lastPlayerHitFlashAt=-Infinity;
  this.official=!!window.armyBattleOfficial;
  const officialLoadout=this.official?window.armyBattleOfficialLoadout||{}:null;
  this.perks=this.official?new BattlePerks(officialLoadout.traits||{}):
   window.armyBattleTalents||new BattlePerks();
  this.weaponLab=this.official?new BattleWeaponLevels(officialLoadout.weapons||{}):
   window.armyBattleWeapons||new BattleWeaponLevels();
  this.officialMedalsStart=this.official?
   (window.armyProgression?.run()?.battle?.medals||0):0;
  this.officialAttemptId=this.official?officialLoadout.attemptId||'official':null;
  this.rifleBurst=null;this.rifleBurstShot=false;
  this.totalSpawns=0;this.defenderKills=0;this.enemies=enemies;
  this.createEnemy=createEnemy;
  this.nameplateState='';this.lastWaveCount=-1;
  this.interactionMode=false;
  this.weapon=this.official?
   (this.weaponLab.level('rifle')>0?'rifle':
    this.weaponLab.level('pistol')>0?'pistol':'fists'):'rifle';
  this.provoked=false;
  this.perks.attach(this);this.weaponLab.attach(this);
  if(this.official){
   const originalClose=this.closeWheel;
   this.closeWheel=take=>{
    const old=this.weapon;
    originalClose(take);
    if(this.weapon!=='fists'&&this.weaponLab.level(this.weapon)===0){
     this.weapon=old;this.refreshHUD(true);
     this.perks.message('該武器尚未解鎖');
    }
   };
  }
  this.invincible=false;this.maxShooters=7;
  this.refreshHUD(true);
  this.root.querySelector('#campModeSwitch').hidden=true;
  $('campFinishTitle').textContent='你已陣亡';
  $('campCombatRestart').textContent='重新挑戰';
  $('campCombatRestart').addEventListener('click',()=>location.reload());
  for(const [i,a]of allies.entries()){
   a.pos={...BATTLE_SPAWN.allies[i]};a.angle=Math.PI;a.isEnemy=false;
   a.battleTarget=null;a.battleSwitchAt=-10;a.battleScanAt=0;a.battleStall=0;a.battleAimPause=0;
   a.combatDead=false;a.combatActive=true;a.combatHP=100;
   a.combatDown=0;a.combatRise=0;a.combatFall=0;a.combatDeathClip=false;
   a.combatHurt=0;a.combatHurtFull=0;a.combatWeapon='rifle';
   a.shotAt=i*.36;a.shotUntil=0;a.anim.rifleAim=.75;
   a.anim.setClip('Idle',{restart:true});a.anim.evaluate(0);
  }
  for(const n of enemies){
   n.isEnemy=true;n.faction='enemy';n.assaultVisible=false;n.incoming=false;
   n.combatDead=true;n.combatActive=false;
   n.pos={x:200+n.id,z:200};n.home.job='life';
  }
  const god=$('battleGodToggle');
  if(god&&!this.official){
   god.addEventListener('click',()=>this.setInvincible(!this.invincible));
   this.setInvincible(false);
  }
  $('battleReportNow')?.addEventListener('click',()=>this.endForReport());
  $('battleReload')?.addEventListener('click',()=>this.perks.reload(this));
  window.addEventListener('keydown',event=>{
   if(event.code!=='KeyR'||this.gameOver||!this.running||
      this.wheelOpen||document.getElementById('battleTalentLab')?.open||
      /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
   event.preventDefault();
   this.perks.reload(this);
  });
 }
 get liveEnemies(){return this.enemies.filter(n=>n.assaultVisible&&!n.combatDead)}
 get liveAllies(){return this.allies.filter(a=>!a.combatDead)}
 refreshHUD(force=false){
  super.refreshHUD(force);
  const fireLabel=$('campAttackText');
  if(fireLabel&&this.weapon==='rifle'){
   const level=this.weaponLab?.level('rifle')||5;
   fireLabel.textContent=level===1?'單發':level===2?'三連發':'連發';
  }
  if(this.running){
   const el=$('campAlert');if(el)el.textContent='敵軍來襲';
   const k=$('campKills');if(k)k.textContent='擊殺 '+this.kills;
  }
 }
 showIntroBanner(text,ms=1700){
  const el=$('battleWaveBanner');if(!el)return;
  el.textContent=text;el.hidden=false;
  clearTimeout(this.bannerTimer);
  this.bannerTimer=setTimeout(()=>{el.hidden=true},ms);
 }
 setInvincible(on){
  this.invincible=!!on;
  if(this.invincible)this.usedInvincible=true;
  const toggle=$('battleGodToggle');
  if(toggle){toggle.textContent='無敵：'+(this.invincible?'開':'關');
   toggle.setAttribute('aria-pressed',String(this.invincible));toggle.classList.toggle('active',this.invincible)}
  if(this.invincible)this.hp=Math.max(1,this.hp);
  this.refreshHUD(true);
 }
 // Run the established player's combat engine but keep its training-camp
 // "all NPCs must chase the player" code disabled in this battle sandbox.
 shotLineClear(a,b,padding=.11){return bulletLineClear(a,b,padding)}
 meleeLineClear(a,b,padding=.11){return meleeLineClear(a,b,padding)}
 shotClearance(pos){return bulletClearance(pos)}
 aimToleranceDegrees(){return this.perks?this.perks.aimAngle():7.5}
 playerBulletDamage(){
  return this.weaponLab?.stats(this.weapon)?.damage??super.playerBulletDamage();
 }
 playerShotInterval(){
  return this.weaponLab?.stats(this.weapon)?.interval??super.playerShotInterval();
 }
 autoRifle(){return this.weaponLab?.level('rifle')>=3}
 cancelRifleBurst(){
  this.rifleBurst=null;
  this.rifleBurstShot=false;
 }
 updateRifleBurst(){
  const burst=this.rifleBurst;
  if(!burst)return;
  // Finish a complete 3-round burst after a single tap, even if released.
  // A weapon switch, level switch, death, or wheel cancels the remainder.
  if(this.gameOver||this.weapon!=='rifle'||this.weaponLab?.level('rifle')!==2||
     this.wheelOpen||this.interactionMode){this.cancelRifleBurst();return}
  if(this.time+.0001<burst.nextAt||this.playerCooldown>0)return;
  this.rifleBurstShot=true;
  let fired=false;
  try{fired=this.tryAttack()}finally{this.rifleBurstShot=false}
  if(!fired){this.cancelRifleBurst();return}
  burst.remaining--;
  if(burst.remaining>0){
   // Lv.2 shots use its actual 0.35-second interval, slower than Lv.3.
   burst.nextAt=this.time+this.playerShotInterval();
   this.playerCooldown=this.playerShotInterval();
  }else{
   this.cancelRifleBurst();
   this.playerCooldown=this.playerShotInterval();
  }
 }
 onPlayerBulletBlocked(b,impact){this.perks?.onBlockedBullet(this,b,impact)}
 canTalentStand(p){return canOccupy(p,.4)}
 moveTalentEnemy(n,dx,dz){
  return moveNpc(n,dx,dz,[...this.allies,...this.enemies],this.player.pos);
 }
 tryAttack(){
  if(this.rifleBurst&&!this.rifleBurstShot)return false;
  // Only roll negative traits on a real, available input, not on every frame
  // of an automatic rifle still cooling down.
  if(this.perks&&this.playerCooldown<=0&&!this.gameOver&&!this.wheelOpen&&
     !this.playerHurt&&!this.playerDown&&!this.playerRise&&!this.interactionMode&&
     !window.armyMinigameActive&&!this.perks.beforeAttack(this))return false;
  const result=super.tryAttack();
  if(result&&this.perks){
   if(this.weapon==='fists')this.perks.onPunch();
   else this.perks.onShot(this,this.bullets.at(-1));
  }
  if(result&&this.weapon==='rifle'&&this.weaponLab?.level('rifle')===2&&!this.rifleBurstShot){
   // The first round uses the normal sound/recoil/muzzle/physical bullet path.
   this.rifleBurst={remaining:2,nextAt:this.time+this.playerShotInterval()};
   this.playerCooldown=this.playerShotInterval();
  }
  this.provoked=false;return result;
 }
 melee(){
  const p=this.player.pos,dir={x:Math.sin(this.player.angle),z:Math.cos(this.player.angle)};
  const max=[1,2,3,4][this.perks?.level('人體割草機')||0];
  const targets=this.enemies.filter(n=>!n.combatDead&&!n.incoming)
   .map(n=>({n,d:dist(p,n.pos)})).filter(o=>o.d<1.85)
   .sort((a,b)=>a.d-b.d);
  let hit=0;
  for(const {n,d}of targets){
   const face=((n.pos.x-p.x)*dir.x+(n.pos.z-p.z)*dir.z)/Math.max(.01,d);
   if(face<.22||!this.meleeLineClear(p,n.pos,.1))continue;
   // A failed pull substitutes a real self-hit for the whole punch.
   if(hit===0&&this.perks?.backfirePunch(this))return;
   this.damageNPC(n,10,'punch');if(++hit>=max)break;
  }
 }
 damageNPC(n,amount,kind='bullet',bullet=null){
  if(n.combatDead||amount<=0)return;
  const wasDead=n.combatDead,wasDown=n.combatDown;
  // Rage and reload debuff apply once to fists, gunshots, grenades,
  // shockwaves and reflected projectiles, never friendly AI gunfire.
  amount*=this.perks?.damageMultiplier(this,kind,bullet)??1;
  super.damageNPC(n,amount,kind);
  if(wasDown<=0&&n.combatDown>0)n.talentLandDone=false;
  if(!n.combatDead&&(kind==='punch'||kind==='bullet'))this.perks.focus=n;
  if(!wasDead&&n.combatDead)this.perks?.onKill(this);
  this.provoked=false;
 }
 // Allied bullets must never contribute to the player's floating damage or HIT COMBO.
 // Keep an unlabelled hit spark, with no hit-stop or screen shake on allied shots.
 onCombatHit(pos,damage,info={}){
  if(this.friendlyHit&&!info.playerTarget){
   this.spawnFx({...pos,y:1.17},'campHitBurst bullet','',240);
   return;
  }
  return super.onCombatHit(pos,damage,info);
 }
 // Outside-perimeter run must bypass normal inside-only navigation until
 // crossing the approved visible gap. No instantaneous inside spawn.
 updateIncoming(dt){
  if(!this.running||this.gameOver||dt<=0)return;
  for(const n of this.enemies){
   if(!n.incoming||n.combatDead)continue;
   const goal=n.entryTarget,dx=goal.x-n.pos.x,dz=goal.z-n.pos.z;
   const distance=Math.hypot(dx,dz),step=Math.min(distance,(4.6+(n.id%4)*.25)*dt);
   if(distance>.001){
    n.pos={x:n.pos.x+dx/distance*step,z:n.pos.z+dz/distance*step};
    this.turnAlly(n,Math.atan2(dx,dz),dt);
    if(n.anim.clip!=='Running')n.anim.setClip('Running');
    n.anim.speed=1.20;n.anim.rifleAim=0;
   }
   if(distance<=step+.005){
    n.pos={...goal};n.incoming=false;n.combatActive=true;
    n.state='combat';n.battlePath=null;n.battleNextPlan=0;
    n.anim.setClip('Idle');n.anim.speed=1;
   }
  }
 }
 spawnWave(){
  // Exactly eight waves. The eighth is the last, regardless of the timer.
  if(this.wave>=FINAL_WAVE||this.gameOver)return;
  this.wave++;
  const weapons=waveWeapons(this.wave),wanted=weapons.length;
  // Preserve ALL survivors from previous waves. Recycle only finished dead
  // actors; allocate lightweight extra rigs when the 30 initial reds run out.
  const pool=this.enemies.filter(n=>n.combatDead&&!n.incoming&&
   (!n.assaultVisible||this.time-(n.combatDeathAt||0)>COMBAT_DOWN_SECONDS+1))
   .slice(0,wanted);
  while(pool.length<wanted){
   if(typeof this.createEnemy!=='function')break;
   const fresh=this.createEnemy();
   if(!fresh)break;
   pool.push(fresh);
  }
  for(let i=0;i<pool.length;i++){
   const n=pool[i],entry=waveEntry(i,pool.length,this.wave);
   n.pos={...entry.start};n.entryTarget={...entry.entry};n.entrySide=entry.side;
   n.battleApproach={...entry.approach};n.battleStageDone=false;
   n.battleAttackOffset={...entry.flank};
   n.angle=Math.atan2(entry.entry.x-n.pos.x,entry.entry.z-n.pos.z);
   n.assaultVisible=true;n.incoming=true;n.waveNumber=this.wave;
   // Recycled rig, new soldier. Each official kill must be rewarded once.
   n.battleMedalId=this.officialAttemptId+'-'+this.wave+'-'+(this.totalSpawns+i+1);
   n.combatDead=false;n.combatActive=false;n.combatHP=100;n.combatDamageSinceFall=0;
   n.combatDown=0;n.combatRise=0;n.combatFall=0;n.combatDeathClip=false;n.combatRestLift=undefined;
   n.combatHurt=0;n.combatHurtFull=0;n.combatCooldown=.45+(i%4)*.18;
   n.combatAttack=0;n.combatStrikeApplied=true;n.combatGoal=null;n.combatNextMove=0;n.combatLastMove=-100;
   n.combatPush=null;n.combatWeapon=weapons[i];
   n.battleSight=null;n.assaultTarget=null;n.assaultGoalTarget=null;
   n.battlePath=null;n.battlePathIndex=0;n.battlePathGoal=null;n.battleNextPlan=0;
   n.combatStall=0;n.battleEscape=null;n.battleEscapeUntil=0;n.battleEscapeCount=0;
   n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;n.squadEscape=null;
   n.anim.setClip('Running',{restart:true});n.anim.speed=1.2;n.anim.rifleAim=0;
  }
  this.totalSpawns+=pool.length;
  this.perks?.onWave(this);
  this.showIntroBanner('第 '+this.wave+' 波',1600);
  this.updateBattleHUD();
 }

 // Stable target lock: don't switch direction every time another red runs by.
 chooseAllyTarget(a,reds){
  const marked=this.perks?.focusAlly(this,a,this.allies.indexOf(a));
  if(marked)return marked;
  const current=a.battleTarget;
  let currentDist=Infinity;
  if(current&&!current.combatDead&&!current.incoming&&insidePerimeter(current.pos)){
   currentDist=dist(a.pos,current.pos);
   if(currentDist>24||!this.shotLineClear(a.pos,current.pos,.12))currentDist=Infinity;
  }
  const scanDue=this.time>=(a.battleScanAt||0)||!Number.isFinite(currentDist);
  if(!scanDue)return Number.isFinite(currentDist)?current:null;
  a.battleScanAt=this.time+.19+(a.id%3)*.045;
  let nearest=null,nearestDist=Infinity;
  for(const n of reds){
   if(n.combatDead||n.incoming||!insidePerimeter(n.pos))continue;
   const d=dist(a.pos,n.pos);
   if(d>=24||d>=nearestDist)continue;
   if(!this.shotLineClear(a.pos,n.pos,.12))continue;
   nearest=n;nearestDist=d;
  }
  const keepCurrent=Number.isFinite(currentDist)&&
   (nearest===current||!nearest||
     (nearestDist>currentDist*.56&&this.time-(a.battleSwitchAt||0)<1.1)||
     nearestDist>currentDist*.78);
  const target=keepCurrent?current:nearest;
  if(target!==current){
   a.battleTarget=target;
   a.battleSwitchAt=this.time;
   a.battleAimPause=this.time+.12;
  }
  return target;
 }
 turnAlly(a,heading,dt){
  const delta=Math.atan2(Math.sin(heading-a.angle),Math.cos(heading-a.angle));
  const step=clamp(delta,-dt*6.8,dt*6.8);
  a.angle+=step;
  return Math.abs(delta-step);
 }
 updateAllies(dt){
  if(!this.running||this.gameOver||dt<=0)return;
  const reds=this.liveEnemies;
  for(let i=0;i<this.allies.length;i++){
   const a=this.allies[i];
   if(a.combatDead){
    if(a.combatDeathClip&&this.time-(a.combatDeathAt||0)>2.3){
     a.combatDeathClip=false;a.anim.setClip('Idle',{restart:true});a.anim.speed=1;
    }
    continue;
   }
   if(this.perks?.allyMuted(this,a,i)){
    a.anim.setClip('Idle');a.anim.rifleAim=0;continue;
   }
   if(a.combatHurt>0){
    a.combatHurt=Math.max(0,a.combatHurt-dt);
    a.anim.rifleAim=0;
    if(a.combatHurt>0)continue;
    a.anim.setClip('Idle');a.anim.speed=1;
   }
   const target=this.chooseAllyTarget(a,reds);
   const home=BATTLE_SPAWN.allies[i];
   let moving=false,moved=0;
   const targetDistance=target?dist(a.pos,target.pos):Infinity;
   let goal=null,desiredSpeed=0;
   const diversion=this.perks?.wrongGoal(this,a);
   if(diversion){
    goal=diversion;desiredSpeed=1.9;
   }else if(target&&targetDistance>16&&dist(a.pos,home)<6.7){
    goal=target.pos;desiredSpeed=2.1;
   }else if(!target&&dist(a.pos,home)>1.20){
    goal=home;desiredSpeed=1.65;
   }
   if(goal){
    const dx=goal.x-a.pos.x,dz=goal.z-a.pos.z,d=Math.hypot(dx,dz);
    if(d>.2){
     const intended=Math.min(d,desiredSpeed*dt);
     const old=a.pos;
     const next=moveNpc(a,dx/d*intended,dz/d*intended,[...this.allies,...this.enemies],this.player.pos);
     const actual=dist(old,next);
     // Ignore collision detours moving backwards away from the battle goal.
     const progress=actual>.0001?((next.x-old.x)*dx+(next.z-old.z)*dz)/(actual*d):0;
     if(actual>Math.max(.002,intended*.22)&&progress>.06){
      a.pos=next;moved=actual;moving=true;a.battleStall=0;
      this.turnAlly(a,Math.atan2(next.x-old.x,next.z-old.z),dt);
     }else{
      a.battleStall=(a.battleStall||0)+dt;
     }
    }
   }else a.battleStall=0;
   // Actual displacement determines animation, not an attempted command.
   if(moving){
    const ratio=clamp(moved/Math.max(dt,.001)/desiredSpeed,.6,1.3);
    const clip=desiredSpeed>1.9?'Running':'Walking';
    if(a.anim.clip!==clip)a.anim.setClip(clip);
    a.anim.speed=clamp(ratio*(clip==='Running'?1.05:1.10),.65,1.35);
    a.anim.rifleAim=Math.max(0,(a.anim.rifleAim||0)-dt*8);
    continue;
   }
   if(a.anim.clip!=='Idle')a.anim.setClip('Idle');
   a.anim.speed=1;
   if(!target){
    a.anim.rifleAim=Math.max(0,(a.anim.rifleAim||0)-dt*3);
    continue;
   }
   const dx=target.pos.x-a.pos.x,dz=target.pos.z-a.pos.z;
   const aimHeading=Math.atan2(dx,dz);
   const leftToTurn=this.turnAlly(a,aimHeading,dt);
   const aligned=leftToTurn<.22;
   const wantAim=aligned?1:0;
   a.anim.rifleAim+=(wantAim-(a.anim.rifleAim||0))*Math.min(1,dt*9);
   // Require an Idle stance and the correct facing before firing.
   if(aligned&&a.anim.rifleAim>.77&&this.time>=(a.battleAimPause||0)&&
      this.time>=a.shotAt){
    const spread=(Math.random()-.5)*.10,bulletHeading=aimHeading+spread;
    this.bullets.push({id:this.seq++,owner:'ally',
     x:a.pos.x+Math.sin(aimHeading)*.74,z:a.pos.z+Math.cos(aimHeading)*.74,
     dx:Math.sin(bulletHeading),dz:Math.cos(bulletHeading),
     range:27,speed:46,damage:18});
    a.shotUntil=performance.now()+110;
    a.shotAt=this.time+(1.72+((a.id||0)%3)*.18+Math.random()*.26)/this.perks.fireRate();
    this.playRangeShot(targetDistance,performance.now());
   }
  }
 }

 damageAlly(a,damage){
  damage=this.perks?.allyDamage(damage)??damage;
  if(a.combatDead||damage<=0)return;
  a.combatHP=Math.max(0,a.combatHP-damage);
  if(a.combatHP<=0){
   a.combatDead=true;a.combatActive=false;a.combatHurt=0;a.combatWeapon='fists';
   a.combatDeathAt=this.time;a.anim.rifleAim=0;
   a.combatDeathClip=this.playCombatClip(a,'falling_down',2.3);
   if(!a.combatDeathClip){a.anim.setClip('Idle',{restart:true});a.anim.speed=1}
   a.combatDown=0;a.combatRise=0;a.combatFall=0;
   }else{
   a.combatHurt=.25;a.combatHurtFull=.25;
   if(a.anim.hasClip('Hit_Reaction'))this.playCombatClip(a,'Hit_Reaction',.35);
  }
  this.updateBattleHUD();
 }
 // Static posts and crowded lanes can trap a soldier just short of a
 // waypoint. Choose a reachable lateral detour away from nearby actors.
 findBattleEscape(n,goal){
  const dx=goal.x-n.pos.x,dz=goal.z-n.pos.z;
  const heading=Math.atan2(dz,dx),sign=((n.id+(n.battleEscapeCount||0))%2===0?1:-1);
  const angles=[sign*1.57,-sign*1.57,sign*.87,-sign*.87,sign*2.2,-sign*2.2,Math.PI,0];
  const others=[...this.enemies,...this.allies];
  let chosen=null,best=-Infinity;
  for(const radius of [1.55,2.5,3.4]){
   for(const a of angles){
    const theta=heading+a,probe={x:n.pos.x+Math.cos(theta)*radius,
                                z:n.pos.z+Math.sin(theta)*radius};
    if(!canOccupy(probe,.43)||!battleClear(n.pos,probe,.33))continue;
    let spacing=3.5;
    for(const o of others){
     if(o===n||o.combatDead||o.incoming)continue;
     spacing=Math.min(spacing,dist(probe,o.pos));
    }
    if(spacing<.72||dist(probe,this.player.pos)<.70)continue;
    const forward=dist(n.pos,goal)-dist(probe,goal);
    const score=forward*.45+Math.min(2,spacing)*.35-radius*.04+
      (a*sign>0?.08:0);
    if(score>best){best=score;chosen=probe}
   }
  }
  return chosen;
 }
 // Choose the closest LIVING defender for ALL red attacks and movement.
 nearestTarget(n){
  let target=this.playerAlive&&this.playerDown<=0&&this.playerRise<=0?this.player:null;
  let best=target?dist(n.pos,target.pos):Infinity;
  for(const a of this.allies){
   if(a.combatDead)continue;
   const d=dist(n.pos,a.pos);
   if(d<best){best=d;target=a}
  }
  return target;
 }
 seesTarget(n,target,melee=false){
  if(!target)return false;
  const cached=n.battleSight;
  if(cached&&cached.target===target&&cached.melee===melee&&this.time-cached.at<.19&&
     dist(cached.npos,n.pos)<.5&&dist(cached.tpos,target.pos)<.5)return cached.visible;
  const visible=melee?this.meleeLineClear(n.pos,target.pos,.13):
                       this.shotLineClear(n.pos,target.pos,.13);
  n.battleSight={target,melee,at:this.time,npos:{...n.pos},tpos:{...target.pos},visible};
  return visible;
 }
 fireNPC(n,target=this.nearestTarget(n)){
  if(!target||!this.seesTarget(n,target))return;
  if(target===this.player){super.fireNPC(n);return}
  const dx=target.pos.x-n.pos.x,dz=target.pos.z-n.pos.z,d=Math.hypot(dx,dz);
  if(d<.01)return;
  const precision=n.combatWeapon==='rifle'?.095:.13;
  const spread=(Math.random()*2-1)*precision*(d>9?1.65:1);
  const heading=Math.atan2(dx,dz)+spread;
  this.bullets.push({id:this.seq++,owner:'enemyAlly',target,
   x:n.pos.x+dx/d*.62,z:n.pos.z+dz/d*.62,
   dx:Math.sin(heading),dz:Math.cos(heading),range:25,
   speed:n.combatWeapon==='rifle'?47:39,damage:n.combatWeapon==='rifle'?6:9});
  n.shotUntil=performance.now()+110;
  this.playRangeShot(dist(n.pos,this.player.pos),performance.now());
 }
 updateEnemyAI(dt,now){
  if(!this.running||this.gameOver)return;
  const ready=this.enemies.filter(n=>n.combatActive&&!n.combatDead&&!n.incoming);
  // Mobile safety: up to seven red guns may shoot at a time.
  const shooterSet=new Set(ready.filter(n=>n.combatWeapon!=='fists')
   .map(n=>({n,target:this.nearestTarget(n)}))
   .filter(o=>o.target&&dist(o.n.pos,o.target.pos)<20&&this.seesTarget(o.n,o.target))
   .sort((a,b)=>dist(a.n.pos,a.target.pos)-dist(b.n.pos,b.target.pos))
   .slice(0,this.maxShooters).map(o=>o.n));
  for(const n of ready){
   n.clock=(n.clock||0)+dt;
   n.combatCooldown=Math.max(0,(n.combatCooldown||0)-dt);
   if(n.combatAttack>0){
    n.combatAttack=Math.max(0,n.combatAttack-dt);
    if(!n.combatStrikeApplied&&n.combatAttack<=.41){
     n.combatStrikeApplied=true;
     const victim=this.nearestTarget(n);
     if(victim&&dist(n.pos,victim.pos)<1.93&&this.seesTarget(n,victim,true)){
      if(victim===this.player)this.damagePlayer(9,'punch');
      else this.damageAlly(victim,9);
     }
    }
   }
   if(n.combatDown>0){
    n.combatDown=Math.max(0,n.combatDown-dt);
    if(n.combatFall>0&&n.combatPush){
     const k=Math.min(dt,n.combatFall);
     n.pos=moveNpc(n,n.combatPush.x*7*k,n.combatPush.z*7*k,
      [...this.enemies,...this.allies],this.player.pos);
     n.combatFall=Math.max(0,n.combatFall-dt);
    }
    n.anim.rifleAim=0;n.state='combatDown';
    if(n.combatDown===0){
     n.combatRise=COMBAT_RISE_SECONDS;n.combatRestLift=undefined;
     this.playCombatClip(n,'Arise',COMBAT_RISE_SECONDS);
    }
    continue;
   }
   if(n.combatRise>0){
    n.combatRise=Math.max(0,n.combatRise-dt);
    n.anim.rifleAim=0;n.state='combatRise';
    if(n.combatRise===0){
     n.combatDamageSinceFall=0;n.combatRestLift=undefined;
     n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
    }
    continue;
   }
   if(n.combatHurt>0){
    n.combatHurt=Math.max(0,n.combatHurt-dt);
    n.anim.rifleAim=0;
    if(n.anim.hasClip('Hit_Reaction')){
     if(n.anim.clip!=='Hit_Reaction')this.playCombatClip(n,'Hit_Reaction',.64);
     n.anim.speed=n.anim.clips.Hit_Reaction.duration/.64;
    }
    if(n.combatHurt>0)continue;
   }
   const target=this.nearestTarget(n);
   if(!target){n.anim.setClip('Idle');n.anim.rifleAim=0;continue}
   n.assaultTarget=target;n.activity='攻擊最近目標';n.home.job='life';n.state='combat';
   const d=dist(n.pos,target.pos),fist=n.combatWeapon==='fists';
   const visible=d<21&&this.seesTarget(n,target,fist);
   n.anim.rifleAim=fist?0:Math.min(1,(n.anim.rifleAim||0)+dt*7);
   if(fist&&d<=1.64&&visible){
    if(n.combatCooldown<=0&&n.combatAttack<=0){
     n.combatCooldown=1.35+(n.id%3)*.12;n.combatAttack=.72;n.combatStrikeApplied=false;
     if(n.anim.hasClip('Punch_Combo_1'))this.playCombatClip(n,'Punch_Combo_1',.70);
    }
   }else if(!fist&&d<20&&visible&&shooterSet.has(n)){
    if(n.combatCooldown<=0&&n.anim.rifleAim>.55){
     this.fireNPC(n,target);n.combatCooldown=n.combatWeapon==='rifle'?.75:1.05;
    }
   }
   const ranged=!fist&&d<20&&visible&&shooterSet.has(n);
   const chase=n.combatAttack<=0&&(!ranged||d>9)&&(fist?(d>1.4||!visible):d>5);
   // Orient running soldiers toward their REAL displacement, never the moving
   // target behind them. This prevents side-sliding while routing around props.
   let actualMove=null;
   if(chase){
    // Attackers approach through their assigned sector rather than
    // immediately choosing the shortest path via the canteen road.
    if(!n.battleStageDone&&(dist(n.pos,n.battleApproach)<2.2||
       (d<11&&visible)))n.battleStageDone=true;
    const base=n.battleStageDone?target.pos:n.battleApproach;
    const off=n.battleStageDone&&d>10?n.battleAttackOffset:null;
    const flank=off?{x:base.x+off.x,z:base.z+off.z}:base;
    let goal=canOccupy(flank,.40)?flank:base;
    if(n.battleEscape){
     if(dist(n.pos,n.battleEscape)<.55||this.time>=n.battleEscapeUntil){
      n.battleEscape=null;n.battlePath=null;
     }else goal=n.battleEscape;
    }
    if(!n.battlePath||!n.battlePathGoal||n.assaultGoalTarget!==target||
       dist(n.battlePathGoal,goal)>2.2||this.time>=n.battleNextPlan){
     n.assaultGoalTarget=target;n.battlePathGoal={...goal};
     n.battlePath=battleRoute(n.pos,goal);n.battlePathIndex=0;
     n.battleNextPlan=this.time+1.45+(n.id%4)*.24;
    }
    let waypoint=n.battlePath?.[n.battlePathIndex]||goal;
    // Do not skip a nearby grid anchor if that shortcut would cut THROUGH
    // a hurdle post. The old rule only considered waypoint distance.
    while(n.battlePath&&n.battlePathIndex<n.battlePath.length-1&&
          dist(n.pos,waypoint)<.65&&
          battleClear(n.pos,n.battlePath[n.battlePathIndex+1],.33))
     waypoint=n.battlePath[++n.battlePathIndex];
    const before={...n.pos};
    const distanceToPoint=dist(before,waypoint);
    if(distanceToPoint>.12){
     const step=Math.min(distanceToPoint,2.18*dt);
     const next=moveNpc(n,(waypoint.x-before.x)/distanceToPoint*step,
       (waypoint.z-before.z)/distanceToPoint*step,
       [...this.allies,...this.enemies],this.player.pos);
     n.pos=next;
    }
    const moved=dist(before,n.pos),progress=distanceToPoint-dist(n.pos,waypoint);
    if(moved>.008){
     actualMove={x:n.pos.x-before.x,z:n.pos.z-before.z};
     if(n.anim.clip!=='Running')n.anim.setClip('Running');
     n.anim.speed=clamp(moved/Math.max(dt,.001)/2.18,.65,1.3);
    }else{
     if(n.anim.clip!=='Idle')n.anim.setClip('Idle');
     n.anim.speed=1;
    }
    // Sliding left and right next to a hurdle is NOT forward progress.
    n.combatStall=Math.max(0,(n.combatStall||0)+
      (moved<.008||progress<dt*.18?dt:-dt*1.8));
    if(n.combatStall>1.05){
     // Try a short, obstacle-safe side-step instead of recalculating the
     // same blocked path forever. Never teleport through the hurdle.
     const escape=this.findBattleEscape(n,goal);
     n.battleEscape=escape;n.battleEscapeUntil=this.time+2.2;
     n.battleEscapeCount=(n.battleEscapeCount||0)+1;
     n.battlePath=null;n.battleNextPlan=0;n.combatStall=0;
    }
   }else if(n.combatAttack>0&&n.anim.hasClip('Punch_Combo_1')){
    if(n.anim.clip!=='Punch_Combo_1')this.playCombatClip(n,'Punch_Combo_1',.70);
    n.anim.speed=(n.anim.clips.Punch_Combo_1.duration||1.4)/.70;
   }else{n.anim.setClip('Idle');n.anim.speed=1}
   const dx=target.pos.x-n.pos.x,dz=target.pos.z-n.pos.z;
   if(actualMove||Math.hypot(dx,dz)>.08){
    const desired=actualMove?Math.atan2(actualMove.x,actualMove.z):Math.atan2(dx,dz);
    this.turnAlly(n,desired,dt);
   }
  }
  // Parent AI is suppressed; finish the usual death/fall cleanup here.
  for(const n of this.enemies){
   if(n.combatDead&&n.combatDeathClip&&this.time-n.combatDeathAt>=COMBAT_DOWN_SECONDS){
    n.combatDeathClip=false;n.anim.setClip('Idle',{restart:true});n.combatRestLift=undefined;
   }
  }
 }

 // Player bullets still use CampCombat's hit tracking and powerful fall / recovery FX.
 updateBullets(dt){
  const specials=this.bullets.filter(b=>b.owner==='ally'||b.owner==='enemyAlly');
  this.bullets=this.bullets.filter(b=>b.owner==='player'||b.owner==='npc');
  super.updateBullets(dt);
  this.perks?.flushRicochets(this);
  for(const b of specials){
   let travel=Math.min(b.range,b.speed*dt),alive=true;
   while(travel>.0001&&alive){
    const step=Math.min(.095,travel),next={x:b.x+b.dx*step,z:b.z+b.dz*step};
    if(!insidePerimeter(next)||this.shotClearance(next)<.065){alive=false;break}
    // Same collision shape as real gunfire; buildings always stop the projectile.
    // The base bullet system handles player bullets against enemy actors.
    b.x=next.x;b.z=next.z;b.range-=step;travel-=step;
    if(b.owner==='ally'){
     for(const n of this.enemies){
      if(n.combatDead||n.incoming)continue;
      if(dist(next,n.pos)<.47){
       const before=this.kills,enemy=n.isEnemy,faction=n.faction;
       n.isEnemy=false;n.faction='friendly';this.friendlyHit=true;
       try{super.damageNPC(n,b.damage,'bullet')}finally{
        n.isEnemy=enemy;n.faction=faction;this.friendlyHit=false;
       }
       if(this.kills>before){this.defenderKills++;this.kills=before;this.refreshHUD(true)}
       alive=false;break;
      }
     }
    }else if(!b.target.combatDead&&dist(next,b.target.pos)<.42){
     this.damageAlly(b.target,b.damage);alive=false;
    }
   }
   if(alive&&b.range>.02)this.bullets.push(b);
  }
 }
 notice(msg){
  if(this.friendlyHit||/全營|警戒|制伏/.test(msg))return;
  super.notice(msg);
 }
 updateBattleHUD(){
  // Only the wave number and the time until the next wave: no loadout,
  // enemy counts, ally counts or direction annotations in the HUD.
  if(this.nameplateState!==this.wave){
   this.nameplateState=this.wave;
   if($('battleWave'))$('battleWave').textContent='第 '+Math.max(1,this.wave)+' 波';
  }
  const countdown=$('battleWaveTimer');
  if(countdown){
   countdown.hidden=this.wave>=FINAL_WAVE||this.gameOver;
   if(!countdown.hidden){
    const remaining=Math.ceil(Math.max(0,this.waveTimer));
    const next='00:'+String(remaining).padStart(2,'0');
    if(countdown.textContent!==next)countdown.textContent=next;
   }
  }
 }
 update(dt,now,{blocked=false}={}){
  // Use real frame time for the wave clock, NOT hit-stop-scaled animation dt.
  // Reset during map/pause so returning to the scene does not flood waves.
  const elapsed=this.lastWaveClock===null?0:clamp((now-this.lastWaveClock)/1000,0,.5);
  this.lastWaveClock=now;
  if(blocked||window.armyMinigameActive)return;
  if(this.gameOver){super.update(dt,now,{blocked});return}
  this.perks?.beforeFrame(this);
  dt=clamp(dt,0,.05);
  // 25-second overlapping waves, capped at eight. No ninth wave.
  if(this.running)this.survivalSeconds+=elapsed;
  if(this.wave<FINAL_WAVE){
   this.waveTimer-=elapsed;
   if(this.waveTimer<=0){
    this.spawnWave();this.running=true;
    this.waveTimer+=WAVE_INTERVAL;
   }
  }
  this.updateIncoming(dt);
  // Normal shooting/knockdown/recoil still run, without player-only camp aggro.
  this.provoked=false;
  super.update(dt,now,{blocked});
  if(!this.gameOver)this.updateRifleBurst();
  this.updateEnemyAI(dt,now);
  this.updateAllies(dt);
  // Win only after the FINAL wave has spawned AND every surviving red from
  // ALL waves has been eliminated. Being alive at the start of wave 8 is
  // not sufficient. Player death has priority if it happened this frame.
  if(!this.gameOver&&this.wave===FINAL_WAVE&&this.liveEnemies.length===0){
   this.endWithVictory();
  }
  this.updateBattleHUD();
 }

 finishBattle(outcome){
  if(this.gameOver||!this.running)return false;
  this.cancelRifleBurst();
  this.battleOutcome=outcome;
  this.gameOver=true;this.attackPointer=null;this.attackKeyboard=false;
  if(this.wheelOpen)this.closeWheel(false);
  clearTimeout(this.endTimer);
  if(this.official)window.armyProgression?.finishOfficialBattle(outcome);
  renderBattleSettlement(this,{outcome});
  $('campCombatFinish').hidden=false;
  $('battleReportNow').hidden=true;
  this.refreshHUD(true);
  return true;
 }
 endWithVictory(){return this.finishBattle('success')}
 endForReport(){return this.finishBattle('surrender')}
 damagePlayer(amount,kind='bullet'){
  if(this.invincible||this.gameOver)return;
  const base=Math.max(0,Number(amount)||0);
  if(base<=0)return;
  const perkDamage=Math.max(0,this.perks?.damageToPlayer(this,base,kind)??base);
  const damage=this.mitigateRankDamage(perkDamage);
  if(damage<=0)return;
  // A non-lethal hit must NEVER call the camp's stun/knock-down handler:
  // it plays Hit_Reaction, cancels punches and blocks movement/shooting.
  // HP still drops normally; bullets/punches keep their original damage.
  if(this.hp>damage){
   this.hp=Math.max(0,this.hp-damage);
   this.playerHurt=0;this.playerDown=0;this.playerRise=0;
   this.playerDamageSinceFall=0;
   this.player.combatDown=0;this.player.combatRise=0;
   // 35 ms of full-scene hit-stop: felt but too short to lock input.
   this.hitStop=Math.max(this.hitStop,.035);
   this.shake=Math.max(this.shake,.045);
   // The original combat flash already supports red. Strong variant is
   // visible for 125 ms; limit repeated flashes in mass firefights.
   const clock=performance.now();
   if(clock-this.lastPlayerHitFlashAt>=95){
    this.lastPlayerHitFlashAt=clock;
    this.flashScreen(true,true);
   }
   this.spawnFx({...this.player.pos,y:1.9},
    'campFloatDamage hostile','-'+Math.round(damage),650);
   this.refreshHUD(true);
   return;
  }
  // Lethal hits still use the established falling/death animation and
  // 2.1-second delay before the full final-battle report appears.
  const wasAlive=this.playerAlive;
  // Parent will apply the rank mitigation ONCE, so pass perk-adjusted
  // damage instead of the already-mitigated damage.
  super.damagePlayer(perkDamage,kind);
  if(wasAlive&&!this.playerAlive){
   this.battleOutcome='death';
   if(this.official)window.armyProgression?.finishOfficialBattle('death');
   renderBattleSettlement(this,{outcome:'death'});
   $('battleReportNow').hidden=true;
  }
 }
 drawWeapons(now){
  super.drawWeapons(now);
  const layer=$('campProjectileLayer');if(!layer)return;
  for(const bullet of this.bullets){
   if(!bullet.splitDepth&&!bullet.bounces)continue;
   const el=layer.querySelector('[data-bullet="'+bullet.id+'"]');
   if(el)el.classList.add(bullet.splitDepth?'talentSplit':'talentRicochet');
  }
 }
 drawAllyWeapons(now){
  for(const a of this.allies){
   if(a.combatDead||!this.renderer.isActorVisible(a.pos))continue;
   if(a.combatHurt<=0)this.npcRifle.draw(this.renderer.vp,a,now,{force:true});
  }
 }
}
export function createArmyBattle(opts){return new ArmyBattleCombat(opts)}
