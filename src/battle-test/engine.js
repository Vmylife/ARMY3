// ARMY3 enemy-wave sandbox, intentionally NOT imported by the main camp.
// Uses the approved punch, gun, knockdown and stand-up combat mechanics.
import {CampCombat,lineClear,COMBAT_RISE_SECONDS,COMBAT_DOWN_SECONDS} from '../systems/campCombat.js?v=12';
import {moveNpc,staticClearance} from '../map/navCollision109.js?v=124';
import {moveSquadMember} from '../systems/npcLife113.js?v=128';
import {waveEntry} from './breaches.js?v=1';
import {insidePerimeter} from '../map/camp.js?v=093';
const $=id=>document.getElementById(id);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const BATTLE_SPAWN={player:{x:22.4,z:13.2},allies:[
 {x:16.6,z:14.1},{x:19.3,z:13.5},{x:22.0,z:11.0},{x:24.9,z:13.6},{x:27.1,z:11.7}
]};
export const WAVE_SIZE=wave=>Math.min(24,3+Math.ceil(wave*2.5));
export class ArmyBattleCombat extends CampCombat{
 constructor({player,enemies,allies,renderer,rifleGlb,npcGlb}){
  super({player,npcs:enemies,renderer,rifleGlb,npcGlb});
  this.allies=allies;
  this.wave=0;this.waveActive=false;this.waveDelay=1.8;this.running=false;
  this.totalSpawns=0;this.defenderKills=0;this.enemies=enemies;
  this.nameplateState='';this.lastWaveCount=-1;
  this.interactionMode=false;this.weapon='rifle';this.provoked=false;
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
   a.shotAt=i*.19;a.shotUntil=0;a.anim.rifleAim=.75;
   a.anim.setClip('Idle',{restart:true});a.anim.evaluate(0);
  }
  for(const n of enemies){
   n.isEnemy=true;n.faction='enemy';n.assaultVisible=false;n.incoming=false;
   n.combatDead=true;n.combatActive=false;
   n.pos={x:200+n.id,z:200};n.home.job='life';
  }
  this.showIntroBanner('南側哨口、西側營舍圍欄遭突破！',1700);
  const god=$('battleGodToggle');
  if(god){god.addEventListener('click',()=>this.setInvincible(!this.invincible));this.setInvincible(false)}
 }
 get liveEnemies(){return this.enemies.filter(n=>n.assaultVisible&&!n.combatDead)}
 get liveAllies(){return this.allies.filter(a=>!a.combatDead)}
 refreshHUD(force=false){
  super.refreshHUD(force);
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
  const toggle=$('battleGodToggle');
  if(toggle){toggle.textContent='無敵：'+(this.invincible?'開':'關');
   toggle.setAttribute('aria-pressed',String(this.invincible));toggle.classList.toggle('active',this.invincible)}
  if(this.invincible)this.hp=Math.max(1,this.hp);
  this.refreshHUD(true);
 }
 // Run the established player's combat engine but keep its training-camp
 // "all NPCs must chase the player" code disabled in this battle sandbox.
 tryAttack(){const result=super.tryAttack();this.provoked=false;return result}
 damageNPC(n,damage,kind='bullet'){super.damageNPC(n,damage,kind);this.provoked=false}
 spawnWave(){
  this.wave++;
  const count=WAVE_SIZE(this.wave),pool=this.enemies.slice(0,count);
  this.waveDelay=0;this.waveActive=true;
  for(let i=0;i<pool.length;i++){
   const n=pool[i],entry=waveEntry(i,count);
   n.pos={...entry.start};n.entryTarget={...entry.entry};n.entrySide=entry.side;
   n.angle=entry.side==='gate'?0:Math.PI/2;
   n.assaultVisible=true;n.incoming=true;
   n.combatDead=false;n.combatActive=false;n.combatHP=100;n.combatDamageSinceFall=0;
   n.combatDown=0;n.combatRise=0;n.combatFall=0;n.combatDeathClip=false;n.combatRestLift=undefined;
   n.combatHurt=0;n.combatHurtFull=0;n.combatCooldown=.45+(i%4)*.18;
   n.combatAttack=0;n.combatStrikeApplied=true;n.combatGoal=null;n.combatNextMove=0;n.combatLastMove=-100;
   n.combatPush=null;n.combatWeapon=this.wave>=3?'rifle':this.wave>=2?'pistol':'fists';
   n.battleSight=null;n.assaultTarget=null;n.assaultGoalTarget=null;
   n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;n.squadEscape=null;
   n.anim.setClip('Running',{restart:true});n.anim.speed=1.15;n.anim.rifleAim=0;
  }
  for(const n of this.enemies.slice(count)){
   n.assaultVisible=false;n.combatDead=true;n.combatActive=false;n.incoming=false;n.pos={x:200+n.id,z:200}
  }
  this.totalSpawns+=count;
  this.showIntroBanner('第 '+this.wave+' 波 · '+count+' 名紅軍（哨口＋營舍）',2200);
  this.updateBattleHUD();
 }
 updateIncoming(dt){
  for(const n of this.enemies){
   if(!n.incoming||n.combatDead)continue;
   const goal=n.entryTarget,dx=goal.x-n.pos.x,dz=goal.z-n.pos.z,d=Math.hypot(dx,dz);
   const step=Math.min(d,dt*(5+(n.id%3)*.25));
   if(d>.005){
    n.pos={x:n.pos.x+dx/d*step,z:n.pos.z+dz/d*step};
    n.angle=Math.atan2(dx,dz);
    n.anim.setClip('Running');n.anim.speed=1.1;n.anim.rifleAim=0;
   }
   if(d<=step+.01){
    n.pos={...goal};n.incoming=false;n.combatActive=true;n.state='combat';
    n.combatGoal=null;n.combatNextMove=0;n.anim.setClip('Idle');n.anim.speed=1;
   }
  }
 }


 // Stable target lock: don't switch direction every time another red runs by.
 chooseAllyTarget(a,reds){
  const current=a.battleTarget;
  let currentDist=Infinity;
  if(current&&!current.combatDead&&!current.incoming&&insidePerimeter(current.pos)){
   currentDist=dist(a.pos,current.pos);
   if(currentDist>24||!lineClear(a.pos,current.pos,.12))currentDist=Infinity;
  }
  const scanDue=this.time>=(a.battleScanAt||0)||!Number.isFinite(currentDist);
  if(!scanDue)return Number.isFinite(currentDist)?current:null;
  a.battleScanAt=this.time+.19+(a.id%3)*.045;
  let nearest=null,nearestDist=Infinity;
  for(const n of reds){
   if(n.combatDead||n.incoming||!insidePerimeter(n.pos))continue;
   const d=dist(a.pos,n.pos);
   if(d>=24||d>=nearestDist)continue;
   if(!lineClear(a.pos,n.pos,.12))continue;
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
   if(target&&targetDistance>16&&dist(a.pos,home)<6.7){
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
    a.shotAt=this.time+1.03+((a.id||0)%3)*.14+Math.random()*.18;
    this.playRangeShot(targetDistance,performance.now());
   }
  }
 }

 damageAlly(a,damage){
  if(a.combatDead||damage<=0)return;
  a.combatHP=Math.max(0,a.combatHP-damage);
  if(a.combatHP<=0){
   a.combatDead=true;a.combatActive=false;a.combatHurt=0;a.combatWeapon='fists';
   a.combatDeathAt=this.time;a.anim.rifleAim=0;
   a.combatDeathClip=this.playCombatClip(a,'falling_down',2.3);
   if(!a.combatDeathClip){a.anim.setClip('Idle',{restart:true});a.anim.speed=1}
   a.combatDown=0;a.combatRise=0;a.combatFall=0;
   this.showIntroBanner('友軍陣亡！剩餘 '+this.liveAllies.length+' 人',1250);
  }else{
   a.combatHurt=.25;a.combatHurtFull=.25;
   if(a.anim.hasClip('Hit_Reaction'))this.playCombatClip(a,'Hit_Reaction',.35);
  }
  this.updateBattleHUD();
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
 seesTarget(n,target){
  if(!target)return false;
  const cached=n.battleSight;
  if(cached&&cached.target===target&&this.time-cached.at<.19&&
     dist(cached.npos,n.pos)<.5&&dist(cached.tpos,target.pos)<.5)return cached.visible;
  const visible=lineClear(n.pos,target.pos,.13);
  n.battleSight={target,at:this.time,npos:{...n.pos},tpos:{...target.pos},visible};
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
     if(victim&&dist(n.pos,victim.pos)<1.93&&this.seesTarget(n,victim)){
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
   const d=dist(n.pos,target.pos),visible=d<21&&this.seesTarget(n,target);
   const fist=n.combatWeapon==='fists';
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
   const chase=n.combatAttack<=0&&(!ranged||d>9)&&d>(fist?1.4:5);
   if(chase){
    if(n.assaultGoalTarget!==target||!n.combatGoal||
       dist(n.combatGoal,target.pos)>1.8||this.time-n.combatLastMove>1.5){
     n.assaultGoalTarget=target;n.combatGoal={...target.pos};n.combatLastMove=this.time;
     n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
    }
    const before={...n.pos};
    moveSquadMember(n,n.combatGoal,dt,true,false);
    if(dist(before,n.pos)>.008)n.combatStall=0;
    else n.combatStall=(n.combatStall||0)+dt;
    if(n.combatStall>1.4){
     n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
     n.combatStall=0;n.combatGoal={...target.pos};
    }
   }else if(n.combatAttack>0&&n.anim.hasClip('Punch_Combo_1')){
    if(n.anim.clip!=='Punch_Combo_1')this.playCombatClip(n,'Punch_Combo_1',.70);
    n.anim.speed=(n.anim.clips.Punch_Combo_1.duration||1.4)/.70;
   }else{n.anim.setClip('Idle');n.anim.speed=1}
   const dx=target.pos.x-n.pos.x,dz=target.pos.z-n.pos.z;
   if(Math.hypot(dx,dz)>.08){
    const desired=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(desired-n.angle),Math.cos(desired-n.angle));
    n.angle+=delta*Math.min(1,dt*8);
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
  for(const b of specials){
   let travel=Math.min(b.range,b.speed*dt),alive=true;
   while(travel>.0001&&alive){
    const step=Math.min(.095,travel),next={x:b.x+b.dx*step,z:b.z+b.dz*step};
    if(!insidePerimeter(next)||staticClearance(next)<.065){alive=false;break}
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
  const live=this.liveEnemies.length,allies=this.liveAllies.length;
  const code=this.wave+'/'+live+'/'+allies;
  if(this.nameplateState===code)return;
  this.nameplateState=code;
  if($('battleWave'))$('battleWave').textContent='第 '+Math.max(1,this.wave)+' 波';
  if($('battleRemaining'))$('battleRemaining').textContent='敵軍 '+live;
  if($('battleAllies'))$('battleAllies').textContent='友軍 '+allies+' / 5';
 }
 update(dt,now,{blocked=false}={}){
  if(blocked||window.armyMinigameActive)return;
  if(this.gameOver){super.update(dt,now,{blocked});return}
  dt=clamp(dt,0,.05);
  if(!this.waveActive){
   this.waveDelay-=dt;
   if(this.waveDelay<=0){this.spawnWave();this.running=true}
  }
  this.updateIncoming(dt);
  // Normal shooting/knockdown/recoil still run, without player-only camp aggro.
  this.provoked=false;
  super.update(dt,now,{blocked});
  this.updateEnemyAI(dt,now);
  this.updateAllies(dt);
  if(this.running&&this.waveActive&&this.liveEnemies.length===0){
   this.waveActive=false;this.waveDelay=3.4;
   this.showIntroBanner('第 '+this.wave+' 波守住了！',2000);
  }
  this.updateBattleHUD();
 }

 damagePlayer(amount,kind='bullet'){
  if(this.invincible)return;
  const wasAlive=this.playerAlive;
  super.damagePlayer(amount,kind);
  if(wasAlive&&!this.playerAlive){
   $('campFinishTitle').textContent='你已陣亡 · 第 '+this.wave+' 波 · 擊殺 '+this.kills;
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
