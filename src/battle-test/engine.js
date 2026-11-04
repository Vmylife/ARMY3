// ARMY3 enemy-wave sandbox, intentionally NOT imported by the main camp.
// Uses the approved punch, gun, knockdown and stand-up combat mechanics.
import {CampCombat,lineClear} from '../systems/campCombat.js?v=12';
import {moveNpc,staticClearance} from '../map/navCollision109.js?v=124';
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
  this.interactionMode=false;this.weapon='rifle';this.provoked=true;
  this.refreshHUD(true);
  this.root.querySelector('#campModeSwitch').hidden=true;
  $('campFinishTitle').textContent='你已陣亡';
  $('campCombatRestart').textContent='重新挑戰';
  $('campCombatRestart').addEventListener('click',()=>location.reload());
  for(const [i,a]of allies.entries()){
   a.pos={...BATTLE_SPAWN.allies[i]};a.angle=0;a.isEnemy=false;
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
  this.showIntroBanner('敵軍突破北側圍欄！',1700);
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
 spawnWave(){
  this.wave++;
  const count=WAVE_SIZE(this.wave),pool=this.enemies.slice(0,count);
  this.waveDelay=0;this.waveActive=true;
  // A 24m missing stretch of north fencing: rows appear OUTSIDE the breached section.
  const cols=Math.min(6,Math.max(3,Math.ceil(Math.sqrt(count*1.6))));
  for(let i=0;i<pool.length;i++){
   const n=pool[i],col=i%cols,row=Math.floor(i/cols);
   const x=6.6+col*2.55+(row%2)*.3,z=27.7+row*1.03;
   n.pos={x,z};n.angle=Math.PI;n.assaultVisible=true;n.incoming=true;
   n.combatDead=false;n.combatActive=false;n.combatHP=100;n.combatDamageSinceFall=0;
   n.combatDown=0;n.combatRise=0;n.combatFall=0;n.combatDeathClip=false;n.combatRestLift=undefined;
   n.combatHurt=0;n.combatHurtFull=0;n.combatCooldown=.35+(i%4)*.22;
   n.combatAttack=0;n.combatGoal=null;n.combatNextMove=0;n.combatLastMove=-100;
   n.combatPush=null;n.combatWeapon=this.wave>=3?'rifle':this.wave>=2?'pistol':'fists';
   n.anim.setClip('Running',{restart:true});n.anim.speed=1.15;
   n.anim.rifleAim=0;
   n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;n.squadEscape=null;
  }
  for(const n of this.enemies.slice(count)){n.assaultVisible=false;n.combatDead=true;n.combatActive=false;n.incoming=false;n.pos={x:200+n.id,z:200}}
  this.totalSpawns+=count;
  this.showIntroBanner('第 '+this.wave+' 波 · '+count+' 名紅軍',2200);
  this.updateBattleHUD();
 }
 updateIncoming(dt){
  for(const n of this.enemies){
   if(!n.incoming||n.combatDead)continue;
   // Actors stream from z > 26, across the opened fence, into the camp.
   const targetZ=25.15,nz=Math.max(targetZ,n.pos.z-dt*(5.1+(n.id%3)*.35));
   n.pos={x:n.pos.x,z:nz};
   n.angle=Math.PI;
   n.anim.setClip('Running');n.anim.speed=1.1;
   n.anim.rifleAim=0;
   if(nz<=targetZ+.001){
    n.incoming=false;n.combatActive=true;n.state='combat';
    n.combatGoal={x:22,z:14};n.combatNextMove=this.time+.06;
    n.anim.setClip('Idle');n.anim.speed=1;
   }
  }
 }
 updateAllies(dt){
  if(!this.running||this.gameOver)return;
  const reds=this.liveEnemies;
  for(const a of this.allies){
   if(a.combatDead){
    if(a.combatDeathClip&&this.time-(a.combatDeathAt||0)>2.3){
     a.combatDeathClip=false;a.anim.setClip('Idle',{restart:true});a.anim.speed=1;
    }
    continue;
   }
   if(a.combatHurt>0){a.combatHurt=Math.max(0,a.combatHurt-dt);a.anim.rifleAim=0;if(a.combatHurt>0)continue}
   let target=null,best=Infinity;
   for(const n of reds){
    if(n.incoming||!insidePerimeter(n.pos))continue;
    const d=dist(a.pos,n.pos);
    if(d<best&&d<24&&lineClear(a.pos,n.pos,.12)){target=n;best=d}
   }
   if(target){
    const home=BATTLE_SPAWN.allies[this.allies.indexOf(a)];
    if(best>12.5&&dist(a.pos,home)<8.5){
     const dx=(target.pos.x-a.pos.x)/best,dz=(target.pos.z-a.pos.z)/best;
     const next=moveNpc(a,dx*dt*2.1,dz*dt*2.1,[...this.allies,...this.enemies],this.player.pos);
     if(dist(next,a.pos)>.008){a.pos=next;a.anim.setClip('Running');a.anim.speed=1.05}
    }
    const heading=Math.atan2(target.pos.x-a.pos.x,target.pos.z-a.pos.z);
    const delta=Math.atan2(Math.sin(heading-a.angle),Math.cos(heading-a.angle));
    a.angle+=delta*Math.min(1,dt*8);
    a.anim.rifleAim=Math.min(1,(a.anim.rifleAim||0)+dt*6);
    if(this.time>=a.shotAt&&a.anim.rifleAim>.55){
     const spread=(Math.random()-.5)*.10,aim=heading+spread;
     this.bullets.push({id:this.seq++,owner:'ally',x:a.pos.x+Math.sin(heading)*.74,z:a.pos.z+Math.cos(heading)*.74,
      dx:Math.sin(aim),dz:Math.cos(aim),range:27,speed:46,damage:18});
     a.shotUntil=performance.now()+110;
     a.shotAt=this.time+1.03+((a.id||0)%3)*.14+Math.random()*.18;
     this.playRangeShot(dist(a.pos,this.player.pos),performance.now());
    }
    if(best<=12.5&&a.anim.clip!=='Idle'){a.anim.setClip('Idle');a.anim.speed=1}
   }else{
    // Stay in the ammunition depot defense area; avoid the "five stationary turrets" look.
    const home=BATTLE_SPAWN.allies[this.allies.indexOf(a)];
    if(dist(a.pos,home)>1.25){
     const d=dist(a.pos,home),nx=(home.x-a.pos.x)/d,nz=(home.z-a.pos.z)/d;
     const next=moveNpc(a,nx*dt*2.0,nz*dt*2.0,[...this.allies,...this.enemies],this.player.pos);
     if(dist(next,a.pos)>.01){a.pos=next;a.angle=Math.atan2(nx,nz);a.anim.setClip('Walking');a.anim.speed=1.2}
    }else if(a.anim.clip!=='Idle'){a.anim.setClip('Idle');a.anim.speed=1}
    a.anim.rifleAim=Math.min(1,(a.anim.rifleAim||0)+dt*4);
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
 fireNPC(n){
  // Red soldiers also target the five green defenders instead of mindlessly beelining the player.
  const allies=this.liveAllies.filter(a=>dist(a.pos,n.pos)<21&&lineClear(n.pos,a.pos,.13));
  if(allies.length&&Math.random()<.68){
   const a=allies[Math.floor(Math.random()*allies.length)];
   const d=dist(n.pos,a.pos),base=Math.atan2(a.pos.x-n.pos.x,a.pos.z-n.pos.z);
   const scatter=(Math.random()-.5)*(this.wave>=4?.13:.18),angle=base+scatter;
   this.bullets.push({id:this.seq++,owner:'enemyAlly',target:a,
    x:n.pos.x+Math.sin(base)*.62,z:n.pos.z+Math.cos(base)*.62,
    dx:Math.sin(angle),dz:Math.cos(angle),range:25,speed:44,damage:8});
   n.shotUntil=performance.now()+110;
   this.playRangeShot(dist(n.pos,this.player.pos),performance.now());
  }else super.fireNPC(n);
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
  if(this.gameOver){
   super.update(dt,now,{blocked});
   return;
  }
  dt=clamp(dt,0,.05);
  
  if(!this.waveActive){
   this.waveDelay-=dt;
   if(this.waveDelay<=0){this.spawnWave();this.running=true}
  }
  this.updateIncoming(dt);
  this.updateAllies(dt);
  super.update(dt,now,{blocked});
  if(this.running&&this.waveActive&&this.liveEnemies.length===0){
   this.waveActive=false;this.waveDelay=3.4;
   this.showIntroBanner('第 '+this.wave+' 波守住了！',2000);
  }
  this.updateBattleHUD();
 }
 damagePlayer(amount,kind='bullet'){
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
