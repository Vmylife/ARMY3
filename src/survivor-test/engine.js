// Standalone ARMY3 3D survivor stress test. Never alters the official battle.
import {ArmyBattleCombat} from '../battle-test/engine.js?v=28';
import {CampCombat} from '../systems/campCombat.js?v=18';
import {moveWithCollision} from '../map/navCollision109.js?v=125';
import {canOccupy} from '../battle-test/battleCollision.js?v=1';
import {CrowdFlowField} from './flowField.js?v=1';

const TARGETS=new Set([50,100,150,200]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const CELL=1.6;
const key=(x,z)=>Math.floor(x/CELL)+','+Math.floor(z/CELL);
export class SurvivorCombat extends ArmyBattleCombat{
 constructor(opts){
  super(opts);
  this.flow=new CrowdFlowField();
  this.targetCount=50;
  this.running=true;this.wave=1;this.waveTimer=1e9;
  this.maxShooters=0;
  this.swarmFrame=0;
  this.perf={ai:0,active:0};
  this.setInvincible(true); // Compare hardware FPS, not player survival time.
  this.perks.ammo.rifle=this.perks.capacity.rifle;
  // Fixed Lv.5 automatic rifle: every trigger creates a real bullet/muzzle
  // flash/recoil/sound, but never spends ammo or starts a reload.
  this.perks.onShot=(combat,bullet)=>{
   if(bullet)bullet.reloadPenalty=1;
   this.perks.ammo.rifle=this.perks.capacity.rifle;
  };
  this.perks.beforeAttack=()=>true;
  this.perks.beginReload=()=>false;
  this.perks.reload=()=>false;
  Object.defineProperty(this,'weapon',{configurable:true,enumerable:true,
   get(){return 'rifle'},set(_v){}});
  this.closeWheel=()=>{this.wheelOpen=false;document.body.classList.remove('campWheelOpen')};
  this.refreshHUD(true);
  this.showIntroBanner('壓力測試開始',900);
 }
 setTargetCount(n){
  if(!TARGETS.has(Number(n)))return;
  this.targetCount=Number(n);
  this.spawnToTarget();
 }
 findSpawn(){
  const p=this.player.pos;
  for(let tries=0;tries<170;tries++){
   const a=Math.random()*Math.PI*2;
   const radius=10+Math.sqrt(Math.random())*20;
   const at={x:p.x+Math.sin(a)*radius,z:p.z+Math.cos(a)*radius};
   if(canOccupy(at,.42)&&dist(at,p)>8)return at;
  }
  for(let tries=0;tries<170;tries++){
   const at={x:-40+Math.random()*80,z:-18+Math.random()*41};
   if(canOccupy(at,.42)&&dist(at,p)>7)return at;
  }
  return null;
 }
 spawnToTarget(){
  if(this.gameOver)return;
  let alive=0;
  for(const n of this.enemies)if(n.assaultVisible&&!n.combatDead)alive++;
  if(alive>this.targetCount){
   let remove=alive-this.targetCount;
   // Trim only stress actors, without deaths, scores or animation effects.
   for(let i=this.enemies.length-1;i>=0&&remove>0;i--){
    const n=this.enemies[i];
    if(!n.assaultVisible||n.combatDead)continue;
    n.assaultVisible=false;n.combatDead=true;n.combatActive=false;
    n.pos={x:200+n.id,z:200};remove--;
   }
  }
  else if(alive<this.targetCount){
   let remaining=Math.min(7,this.targetCount-alive);
   for(const n of this.enemies){
    if(!remaining)break;
    if(!n.combatDead||n.assaultVisible&&this.time-(n.combatDeathAt||0)<1.45)continue;
    const pos=this.findSpawn();
    if(!pos)break;
    this.activate(n,pos);remaining--;
   }
   while(remaining>0&&this.enemies.length<Math.max(50,this.targetCount)){
    const pos=this.findSpawn();if(!pos||!this.createEnemy)break;
    const n=this.createEnemy();if(!n)break;
    this.activate(n,pos);remaining--;
   }
  }
 }
 activate(n,pos){
  n.pos=pos;n.isEnemy=true;n.faction='enemy';n.assaultVisible=true;
  n.incoming=false;n.combatDead=false;n.combatActive=true;n.combatWeapon='fists';
  n.combatHP=100;n.combatDown=0;n.combatRise=0;n.combatFall=0;
  n.combatHurt=0;n.combatHurtFull=0;n.combatDeathClip=false;n.combatPush=null;
  n.combatDamageSinceFall=0;n.combatCooldown=1+Math.random();
  n.combatAttack=0;n.combatStrikeApplied=true;n.renderLift=0;
  n.route=null;n.routeGoal=null;n.battlePath=null;n.battleNextPlan=0;
  n.home.job='life';n.state='combat';n.angle=Math.random()*Math.PI*2;
  n.stressAccum=0;n.stressStall=0;n.anim.rifleAim=0;
  n.anim.setClip('Running',{restart:true});n.anim.speed=.93+Math.random()*.16;
  n.combatRestLift=undefined;n.combatDeathAt=-999;
  this.totalSpawns++;
 }
 // The ordinary ArmyBattleCombat update performs expensive per-soldier A*,
 // full target searches and friendly-fire AI. Crowd mode keeps only
 // CampCombat's real rifle/projectile/damage/knockdown engine.
 update(dt,now,{blocked=false}={}){
  if(blocked||this.gameOver||window.armyMinigameActive)return;
  const begin=performance.now();
  const step=Math.min(.05,Math.max(0,dt));
  if(!step)return;
  this.perks.beforeFrame(this);
  this.survivalSeconds+=step;
  this.provoked=false;
  CampCombat.prototype.update.call(this,step,now,{blocked:false});
  this.updateSwarm(step);
  this.spawnToTarget();
  this.perf.ai=performance.now()-begin;
  this.perf.active=this.liveEnemies.length;
 }
 updateSwarm(dt){
  const live=this.enemies.filter(n=>n.assaultVisible&&!n.combatDead);
  if(!live.length)return;
  const p=this.player.pos;
  this.flow.update(p,this.time);
  const buckets=new Map();
  for(const n of live){
   const k=key(n.pos.x,n.pos.z);
   if(!buckets.has(k))buckets.set(k,[]);
   buckets.get(k).push(n);
  }
  this.swarmFrame++;
  for(const n of live){
   n.combatCooldown=Math.max(0,(n.combatCooldown||0)-dt);
   n.combatAttack=Math.max(0,(n.combatAttack||0)-dt);
   if(n.combatDown>0){
    n.combatDown=Math.max(0,n.combatDown-dt);
    if(n.combatDown===0){
     n.combatRise=1.7;n.combatFall=0;n.combatPush=null;
     this.playCombatClip(n,'Arise',1.7);
    }
    continue;
   }
   if(n.combatRise>0){
    n.combatRise=Math.max(0,n.combatRise-dt);
    if(n.combatRise===0){
     n.combatDamageSinceFall=0;
     n.anim.setClip('Running',{restart:true});
     n.anim.speed=1.1;
    }
    continue;
   }
   if(n.combatHurt>0){
    n.combatHurt=Math.max(0,n.combatHurt-dt);
    if(n.combatHurt>0)continue;
   }
   const dx=p.x-n.pos.x,dz=p.z-n.pos.z,d=Math.hypot(dx,dz)||.0001;
   if(d<1.47){
    n.anim.setClip('Idle');
    if(n.combatAttack<=0&&n.combatCooldown<=0){
     n.combatCooldown=1.15+(n.id%5)*.10;
     n.combatAttack=.65;n.combatStrikeApplied=false;
     this.playCombatClip(n,'Punch_Combo_1',.65);
    }
    if(!n.combatStrikeApplied&&n.combatAttack<.30){
     n.combatStrikeApplied=true;this.damagePlayer(5,'punch');
    }
    continue;
   }
   // Far crowds update only every 2-3 frames, while nearby fights update
   // every frame. Accumulated dt keeps movement speed independent of FPS.
   const every=d>21?3:d>11?2:1;
   n.stressAccum=(n.stressAccum||0)+dt;
   if(this.swarmFrame%every!==n.id%every)continue;
   const step=Math.min(.14,n.stressAccum);n.stressAccum=0;
   let goal=this.flow.next(n.pos,p);
   if(d<5)goal=p;
   let vx=goal.x-n.pos.x,vz=goal.z-n.pos.z,mag=Math.hypot(vx,vz);
   if(mag<.10){vx=dx;vz=dz;mag=d}
   vx/=mag;vz/=mag;
   // Local spatial hashing: check only 3x3 adjacent cells, not 200 actors.
   const bx=Math.floor(n.pos.x/CELL),bz=Math.floor(n.pos.z/CELL);
   let avoidX=0,avoidZ=0;
   for(let zz=-1;zz<=1;zz++)for(let xx=-1;xx<=1;xx++){
    const neighbors=buckets.get((bx+xx)+','+(bz+zz));
    if(!neighbors)continue;
    for(const o of neighbors){
     if(o===n)continue;
     const sx=n.pos.x-o.pos.x,sz=n.pos.z-o.pos.z;
     const sq=sx*sx+sz*sz;
     if(sq>.003&&sq<1.05){
      const gap=Math.sqrt(sq),strength=(1.05-gap)/1.05;
      avoidX+=sx/gap*strength;avoidZ+=sz/gap*strength;
     }
    }
   }
   vx+=avoidX*.8;vz+=avoidZ*.8;
   if(d<1.6){vx-=dx/d*.75;vz-=dz/d*.75}
   const m=Math.hypot(vx,vz)||1;vx/=m;vz/=m;
   const speed=2.05*step;
   const before=n.pos;
   const moved=moveWithCollision(before,vx*speed,vz*speed,.33,{solidHurdles:true});
   n.pos=moved;
   const actualX=moved.x-before.x,actualZ=moved.z-before.z;
   if(actualX*actualX+actualZ*actualZ<.0004){
    n.stressStall=(n.stressStall||0)+step;
    if(n.stressStall>.6){
     // Local detour direction, still obeying geometry collision.
     const sign=n.id%2?1:-1;
     n.pos=moveWithCollision(before,-vz*speed*sign,vx*speed*sign,.33,{solidHurdles:true});
     n.stressStall=0;
    }
   }else n.stressStall=0;
   const movedX=n.pos.x-before.x,movedZ=n.pos.z-before.z;
   const faceX=Math.abs(movedX)+Math.abs(movedZ)>.0001?movedX:dx;
   const faceZ=Math.abs(movedX)+Math.abs(movedZ)>.0001?movedZ:dz;
   const heading=Math.atan2(faceX,faceZ);
   n.angle+=Math.atan2(Math.sin(heading-n.angle),Math.cos(heading-n.angle))*Math.min(1,step*11);
   if(n.anim.clip!=='Running'){n.anim.setClip('Running');n.anim.speed=1.1;}
  }
 }
}
export const createSurvivorBattle=opts=>new SurvivorCombat(opts);
