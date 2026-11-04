// ARMY3 integrated camp combat V1 — civilian routines remain intact until provoked.
// Shared A* navigation and static clearance; bullets respect buildings, props and perimeter.
import {moveSquadMember,releaseForSquad} from './npcLife113.js?v=127';
import {staticClearance,canOccupy,NPC_RADIUS,moveNpc} from '../map/navCollision109.js?v=124';
import {PistolRenderer} from '../fight-lab/pistolRenderer.js?v=1';
import {RifleRenderer} from '../fight-lab/rifleRenderer.js?v=2';
import {RigAnimator} from '../characters/rigAnimator.js?v=121';
import {insidePerimeter} from '../map/camp.js?v=093';

const $=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const TAU=Math.PI*2;
const WEAPONS={up:'fists',right:'pistol',bottom:'rifle',left:null};
const WEAPON_NAME={fists:'拳頭',pistol:'手槍',rifle:'步槍'};
export const COMBAT_KNOCKDOWN_DAMAGE=50;
export const NPC_MAX_HP=100;
export const COMBAT_DOWN_SECONDS=2.3;
export const COMBAT_RISE_SECONDS=.85;
const SENSE_RADIUS=k=>k>=10?Infinity:k===0?4:k<5?5.5+k*.9:10+(k-5)*1.2;

// Obstacles are exactly those used to keep players/NPCs out of structures.
export function lineClear(a,b,padding=.11){
 const d=distance(a,b);
 if(d<.05)return true;
 const steps=Math.ceil(d/.18);
 for(let i=1;i<steps;i++){
  const t=i/steps;
  const at={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
  if(!insidePerimeter(at)||staticClearance(at)<=padding)return false;
 }
 return true;
}
export function chaseRadius(kills){return SENSE_RADIUS(kills)}
export function weaponForKills(kills){return kills>=5?'rifle':kills>=1?'pistol':'fists'}

function showFlash(container,pt,label){
 const n=document.createElement('span');n.className='campShotHit';n.textContent=label;
 n.style.left=pt.x+'px';n.style.top=pt.y+'px';container.appendChild(n);
 setTimeout(()=>n.remove(),400);
}
function startAudio(){
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return null;
  startAudio.ctx??=new Audio();
  if(startAudio.ctx.state==='suspended')startAudio.ctx.resume().catch(()=>{});
  return startAudio.ctx;
 }catch{return null}
}
function shotSound(rifle=false){
 const c=startAudio();if(!c)return;
 const t=c.currentTime,osc=c.createOscillator(),gain=c.createGain();
 osc.type='sawtooth';osc.frequency.setValueAtTime(rifle?135:205,t);
 osc.frequency.exponentialRampToValueAtTime(rifle?45:58,t+.10);
 gain.gain.setValueAtTime(rifle?.075:.11,t);
 gain.gain.exponentialRampToValueAtTime(.001,t+.12);
 osc.connect(gain);gain.connect(c.destination);osc.start(t);osc.stop(t+.13);
}

export class CampCombat{
 constructor({player,npcs,renderer,rifleGlb,npcGlb}){
  this.player=player;this.npcs=npcs;this.renderer=renderer;this.hp=100;this.kills=0;
  this.weapon='fists';this.provoked=false;this.gameOver=false;this.time=0;
  this.playerAttack=0;this.playerAttackApplied=false;this.playerCooldown=0;this.attackKeyboard=false;this.attackPointer=null;
  this.wheelOpen=false;this.wheelSelection='up';this.wheelPointer=null;this.wheelTouch=null;
  this.bullets=[];this.seq=1;this.playerShotAt=-100;this.npcFireAt=-100;
  this.canvas=renderer.canvas;this.lastState='';
  this.mountUI();
  this.playerPistol=new PistolRenderer(renderer.gl);
  this.npcPistol=new PistolRenderer(renderer.gl);
  this.playerRifle=new RifleRenderer(renderer.gl);
  this.npcRifle=new RifleRenderer(renderer.gl);
  this.playerPistol.addModel();this.npcPistol.addModel();
  this.playerRifle.addModel(rifleGlb);this.npcRifle.addModel(rifleGlb);
  const calibrate=(model,anim)=>{
   const oldAim=anim.rifleAim;
   anim.rifleAim=1;anim.evaluate(0);
   model.setGripReference(anim.rightHandWorld);
   anim.rifleAim=oldAim;anim.evaluate(0);
  };
  calibrate(this.playerPistol,player.anim);
  calibrate(this.playerRifle,player.anim);
  // NPCs use a separate lighter GLB, requiring their own wrist calibration.
  const sampleAnim=new RigAnimator(npcGlb);
  sampleAnim.setClip('Idle');sampleAnim.rifleAim=1;sampleAnim.evaluate(0);
  this.npcPistol.setGripReference(sampleAnim.rightHandWorld);
  this.npcRifle.setGripReference(sampleAnim.rightHandWorld);
  for(const n of npcs){
   n.combatActive=false;n.combatDead=false;n.combatHP=NPC_MAX_HP;
   n.combatDamageSinceFall=0;n.combatDown=0;n.combatRise=0;n.combatFall=0;
   n.combatPush=null;n.combatRestLift=undefined;
   n.combatCooldown=0;n.combatAttack=0;n.combatStall=0;n.combatGoal=null;
   n.combatWeapon='fists';n.combatLastMove=-100;n.combatNextMove=0;
  }
  this.refreshHUD(true);
 }
 mountUI(){
  const root=document.createElement('div');root.id='campCombatUI';root.innerHTML=`
   <div id="campCombatStatus" aria-live="polite"><span id="campHealth">HP 100</span><span id="campKills">擊殺 0</span><span id="campAlert">正常操課</span></div>
   <div class="campCombatButtons">
    <button id="campWeaponSwitch" type="button" aria-label="選擇武器"><span>◉</span><small>武器</small></button>
    <button id="campAttack" type="button" aria-label="攻擊"><span id="campAttackIcon">✊</span><small id="campAttackText">攻擊</small></button>
   </div>
   <div id="campCombatTip" hidden></div>
   <div id="campCombatWheel" role="dialog" aria-label="武器輪盤" hidden>
    <div id="campWheelDisc">
     <button data-choice="up" class="campWheelSlot up" type="button"><span>✊</span><small>拳頭</small></button>
     <button data-choice="right" class="campWheelSlot right" type="button"><span>🔫</span><small>手槍</small></button>
     <button data-choice="bottom" class="campWheelSlot bottom" type="button"><span>🔫</span><small>步槍</small></button>
     <button data-choice="left" class="campWheelSlot left inactive" type="button"><span>🔒</span><small>預留</small></button>
     <button id="campWheelCancel" type="button"><strong id="campWheelName">拳頭</strong><small>取消</small></button>
    </div>
    <div class="campWheelHint">按住、滑動選擇、放開切換</div>
   </div>
   <div id="campCombatFinish" hidden><strong id="campFinishTitle">你陣亡了</strong><button id="campCombatRestart" type="button">重新開始軍營</button></div>
  `;
  document.body.appendChild(root);
  const layer=document.createElement('div');layer.id='campProjectileLayer';document.body.appendChild(layer);
  this.root=root;
  const sw=$('campWeaponSwitch'),attack=$('campAttack'),wheel=$('campCombatWheel'),disc=$('campWheelDisc');
  const dir=(x,y)=>{
   if(Math.hypot(x,y)<22)return null;
   return Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'bottom':'up';
  };
  const select=(side)=>{
   if(!WEAPONS.hasOwnProperty(side))return;
   this.wheelSelection=side;
   for(const node of wheel.querySelectorAll('[data-choice]'))node.classList.toggle('selected',node.dataset.choice===side);
   $('campWheelName').textContent=WEAPON_NAME[WEAPONS[side]]||'尚未解鎖';
  };
  const centerChoice=(event)=>{
   const rect=disc.getBoundingClientRect();
   return dir(event.clientX-rect.left-rect.width/2,event.clientY-rect.top-rect.height/2);
  };
  const close=(take=true)=>{
   if(!this.wheelOpen)return;
   this.wheelOpen=false;this.wheelPointer=null;this.wheelTouch=null;wheel.hidden=true;
   document.body.classList.remove('campWheelOpen');
   if(take&&WEAPONS[this.wheelSelection])this.weapon=WEAPONS[this.wheelSelection];
   this.refreshHUD(true);
  };
  const open=()=>{
   if(this.gameOver||this.wheelOpen||window.armyMinigameActive)return false;
   this.wheelOpen=true;this.attackPointer=null;this.attackKeyboard=false;
   this.wheelSelection=this.weapon==='rifle'?'bottom':this.weapon==='pistol'?'right':'up';
   wheel.hidden=false;document.body.classList.add('campWheelOpen');
   select(this.wheelSelection);return true;
  };
  this.openWheel=open;this.closeWheel=close;
  sw.addEventListener('pointerdown',event=>{
   if(event.pointerType==='mouse'&&event.button!==0)return;
   if(!open())return;
   this.wheelPointer={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};
   try{sw.setPointerCapture(event.pointerId)}catch{}
   event.preventDefault();
  });
  sw.addEventListener('pointermove',event=>{
   const p=this.wheelPointer;if(!p||p.id!==event.pointerId)return;
   const choice=dir(event.clientX-p.x,event.clientY-p.y);
   if(choice){select(choice);p.dragged=true}
  });
  sw.addEventListener('pointerup',event=>{
   if(this.wheelPointer?.id!==event.pointerId)return;
   const moved=this.wheelPointer.dragged;this.wheelPointer=null;
   if(moved)close(true);
   event.preventDefault();
  });
  sw.addEventListener('pointercancel',()=>close(false));
  sw.addEventListener('click',event=>{
   event.preventDefault();
   // Pointer tap deliberately leaves the selector open for a second tap.
   if(!this.wheelOpen)open();
  });
  wheel.addEventListener('pointerdown',event=>{
   if(event.target===wheel){close(false);return}
   const target=event.target.closest('[data-choice]');
   if(target)select(target.dataset.choice);
   this.wheelTouch={id:event.pointerId,cancel:!!event.target.closest('#campWheelCancel')};
   try{wheel.setPointerCapture(event.pointerId)}catch{}
   event.preventDefault();
  });
  wheel.addEventListener('pointermove',event=>{
   if(this.wheelTouch?.id!==event.pointerId)return;
   const choice=centerChoice(event);if(choice)select(choice);
  });
  wheel.addEventListener('pointerup',event=>{
   if(this.wheelTouch?.id!==event.pointerId)return;
   const cancel=this.wheelTouch.cancel;
   if(!cancel){const choice=centerChoice(event);if(choice)select(choice)}
   close(!cancel);
  });
  wheel.addEventListener('pointercancel',()=>close(false));
  $('campWheelCancel').addEventListener('click',()=>close(false));
  attack.addEventListener('pointerdown',event=>{
   if(event.pointerType==='mouse'&&event.button!==0)return;
   if(this.gameOver||this.wheelOpen)return;
   startAudio();
   this.attackPointer=event.pointerId;
   this.tryAttack();
   try{attack.setPointerCapture(event.pointerId)}catch{}
   event.preventDefault();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture']){
   attack.addEventListener(name,event=>{if(this.attackPointer===event.pointerId)this.attackPointer=null});
  }
  // Native click from a mobile pointer is ignored; actual taps fire on pointerdown.
  attack.addEventListener('click',event=>event.preventDefault());
  window.addEventListener('keydown',event=>{
   if(window.armyMinigameActive)return;
   if(event.code==='KeyQ'){event.preventDefault();if(!event.repeat)open();return}
   if(this.wheelOpen){
    if(event.code==='Escape'){event.preventDefault();close(false);return}
    const d={ArrowUp:'up',ArrowRight:'right',ArrowDown:'bottom',ArrowLeft:'left'}[event.code];
    if(d){event.preventDefault();select(d)}return;
   }
   if(event.code==='KeyJ'){
    event.preventDefault();
    if(!this.attackKeyboard&&!event.repeat){this.attackKeyboard=true;startAudio();this.tryAttack()}
   }
  });
  window.addEventListener('keyup',event=>{
   if(event.code==='KeyJ')this.attackKeyboard=false;
   if(event.code==='KeyQ'&&this.wheelOpen){event.preventDefault();close(true)}
  });
  window.addEventListener('blur',()=>{this.attackPointer=null;this.attackKeyboard=false;close(false)});
  $('campCombatRestart').addEventListener('click',()=>location.reload());
 }
 notice(msg){
  const n=$('campCombatTip');n.textContent=msg;n.hidden=false;
  clearTimeout(this.tipTimer);this.tipTimer=setTimeout(()=>n.hidden=true,1700);
 }
 refreshHUD(force=false){
  const cur=[this.hp,this.kills,this.weapon,this.gameOver].join('/');
  if(!force&&this.lastState===cur)return;
  this.lastState=cur;
  $('campHealth').textContent='HP '+Math.ceil(this.hp);
  $('campKills').textContent='擊殺 '+this.kills;
  $('campAlert').textContent=this.kills>=10?'全營追擊':this.kills>=5?'步槍警戒':this.kills>=1?'手槍警戒':this.provoked?'徒手警戒':'正常操課';
  $('campAttackIcon').textContent=this.weapon==='fists'?'✊':'🔫';
  $('campAttackText').textContent=this.weapon==='rifle'?'連發':this.weapon==='pistol'?'開火':'攻擊';
  $('campAttack').disabled=this.gameOver;
  $('campWeaponSwitch').disabled=this.gameOver;
 }
 get isActive(){return this.provoked}
 get playerAlive(){return !this.gameOver}
 playerPose(normalClip,normalSpeed){
  if(this.gameOver)return {clip:'Idle',speed:1};
  if(this.playerAttack>0&&this.weapon==='fists'&&this.player.anim.hasClip('Punch_Combo_1'))
   return {clip:'Punch_Combo_1',speed:1.5};
  return {clip:normalClip,speed:normalSpeed};
 }
 tryAttack(){
  if(this.gameOver||this.wheelOpen||window.armyMinigameActive||this.playerCooldown>0)return false;
  if(this.weapon==='fists'){
   this.provoked=true;this.playerAttack=.55;this.playerAttackApplied=false;this.playerCooldown=.72;
   this.refreshHUD(true);return true;
  }
  const p=this.player.pos,forward={x:Math.sin(this.player.angle),z:Math.cos(this.player.angle)};
  let aim=this.player.angle,target=null,min=Infinity;
  for(const n of this.npcs){
   if(n.combatDead)continue;
   const dx=n.pos.x-p.x,dz=n.pos.z-p.z,d=Math.hypot(dx,dz);
   if(d>26||d<.01)continue;
   const dot=(dx*forward.x+dz*forward.z)/d;
   if(dot<Math.cos(7.5*Math.PI/180))continue;
   if(!lineClear(p,n.pos,.10))continue;
   if(d<min){min=d;target=n}
  }
  if(target)aim=Math.atan2(target.pos.x-p.x,target.pos.z-p.z);
  const speed=this.weapon==='rifle'?58:48,scatter=0;
  const x=p.x+Math.sin(this.player.angle)*.75,z=p.z+Math.cos(this.player.angle)*.75;
  this.bullets.push({id:this.seq++,owner:'player',x,z,dx:Math.sin(aim+scatter),dz:Math.cos(aim+scatter),
   range:27,speed,damage:this.weapon==='rifle'?40:25});
  this.playerCooldown=this.weapon==='rifle'?.125:.25;
  this.playerShotAt=performance.now();
  this.player.shotUntil=this.playerShotAt+(this.weapon==='rifle'?100:115);
  shotSound(this.weapon==='rifle');
  return true;
 }
 melee(){
  const p=this.player.pos,direction={x:Math.sin(this.player.angle),z:Math.cos(this.player.angle)};
  const nearby=this.npcs.filter(n=>!n.combatDead).map(n=>({n,d:distance(p,n.pos)})).sort((a,b)=>a.d-b.d);
  for(const {n,d} of nearby){
   if(d>1.85)break;
   const vx=(n.pos.x-p.x)/Math.max(.01,d),vz=(n.pos.z-p.z)/Math.max(.01,d);
   if(vx*direction.x+vz*direction.z<.22||!lineClear(p,n.pos,.1))continue;
   this.damageNPC(n,27);return;
  }
 }
 damageNPC(n,damage){
  if(n.combatDead||damage<=0)return;
  this.provoked=true;
  if(!n.combatActive)this.engage(n);
  const grounded=n.combatDown>0||n.combatRise>0;
  n.combatHP=Math.max(0,n.combatHP-damage);
  // Damage while grounded/getting up never fills the next knockdown meter.
  if(!grounded)n.combatDamageSinceFall+=damage;
  if(n.combatHP<=0){
   n.combatDead=true;n.combatActive=false;n.combatWeapon='fists';
   n.combatDown=0;n.combatRise=0;n.combatFall=0;n.combatPush=null;
   n.combatDamageSinceFall=0;n.combatGoal=null;n.combatHurt=0;n.combatRestLift=undefined;
   n.anim.rifleAim=0;n.anim.setClip('Idle',{restart:true});
   n.anim.transition=0;n.anim.prevClip=null;n.anim.evaluate(0);
   n.renderLift=0;n.shotPending=false;n.home.job='life';n.activity='倒地';
   this.kills++;
   this.notice(this.kills===10?'全營警報！所有存活阿兵哥開始追擊！':
    this.kills===5?'步槍警戒！':this.kills===1?'手槍警戒！':'擊殺 '+this.kills);
   if(this.kills>=10)for(const alive of this.npcs)if(!alive.combatDead)this.engage(alive);
   this.refreshHUD(true);
   return;
  }
  if(!grounded&&n.combatDamageSinceFall>=COMBAT_KNOCKDOWN_DAMAGE){
   n.combatDamageSinceFall=0;n.combatDown=COMBAT_DOWN_SECONDS;
   n.combatRise=0;n.combatFall=.42;n.combatRestLift=undefined;
   const dx=n.pos.x-this.player.pos.x,dz=n.pos.z-this.player.pos.z;
   const len=Math.hypot(dx,dz)||1;
   n.combatPush={x:dx/len,z:dz/len};
   n.combatAttack=0;n.combatCooldown=.75;
   n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
   n.anim.rifleAim=0;n.anim.setClip('Idle',{restart:true});
   n.anim.transition=0;n.anim.prevClip=null;n.anim.evaluate(0);
   n.state='combatDown';n.activity='被擊飛';
   return;
  }
  if(!grounded)n.combatHurt=.24;
 }
 engage(n){
  if(n.combatActive||n.combatDead)return;
  releaseForSquad(n);
  n.combatActive=true;n.combatGoal=null;n.combatNextMove=this.time+(n.id%9)*.075;
  n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
  n.lifeEscape=null;n.squadEscape=null;n.trafficYield=null;
  n.renderLift=0;n.anim.rifleAim=0;
  n.home.job='life';n.activity='追擊玩家';
 }
 damagePlayer(amount){
  if(this.gameOver)return;
  this.hp=Math.max(0,this.hp-amount);
  if(this.hp<=0){
   this.gameOver=true;this.attackPointer=null;this.attackKeyboard=false;
   $('campCombatFinish').hidden=false;
   this.notice('你被全營阿兵哥制伏了');
  }
  this.refreshHUD(true);
 }
 canSeeNPC(n){
  const p=this.player.pos,c=n.combatSight;
  if(c&&this.time-c.time<.18&&distance(n.pos,c.from)<.65&&distance(p,c.to)<.65)return c.visible;
  const visible=lineClear(n.pos,p,.13);
  n.combatSight={time:this.time,from:{...n.pos},to:{...p},visible};
  return visible;
 }
 shootingNPCs(){
  // Limit simultaneously firing NPCs; cache line-of-sight for large crowds.
  return this.npcs.filter(n=>n.combatActive&&!n.combatDead&&n.combatDown<=0&&n.combatRise<=0&&n.combatWeapon!=='fists'&&
   distance(n.pos,this.player.pos)<20&&this.canSeeNPC(n))
   .sort((a,b)=>distance(a.pos,this.player.pos)-distance(b.pos,this.player.pos)).slice(0,4);
 }
 fireNPC(n){
  const origin=n.pos,p=this.player.pos;
  if(!lineClear(origin,p,.13))return;
  const dx=p.x-origin.x,dz=p.z-origin.z,d=Math.hypot(dx,dz);
  if(d<.01)return;
  const precision=n.combatWeapon==='rifle'?.095:.13;
  // Deliberate spread and warning time keep 35 soldiers from instantly killing player.
  const scatter=(Math.random()*2-1)*precision*(d>9?1.65:1);
  const heading=Math.atan2(dx,dz)+scatter;
  this.bullets.push({id:this.seq++,owner:'npc',x:origin.x+dx/d*.62,z:origin.z+dz/d*.62,
   dx:Math.sin(heading),dz:Math.cos(heading),range:25,speed:n.combatWeapon==='rifle'?47:39,
   damage:n.combatWeapon==='rifle'?6:9});
  n.shotUntil=performance.now()+110;
  if(distance(n.pos,this.player.pos)<14)shotSound(n.combatWeapon==='rifle');
 }
 updateBullets(dt){
  if(!this.bullets.length)return;
  const remaining=[];
  for(const b of this.bullets){
   let travel=Math.min(b.range,b.speed*dt),alive=true;
   while(travel>0&&alive){
    const segment=Math.min(travel,.095);
    const x=b.x+b.dx*segment,z=b.z+b.dz*segment,at={x,z};
    // A real bullet disappears at the first collision; no through-wall hits.
    if(!insidePerimeter(at)||staticClearance(at)<.065){alive=false;break}
    b.x=x;b.z=z;b.range-=segment;travel-=segment;
    if(b.owner==='player'){
     for(const n of this.npcs){
      if(n.combatDead)continue;
      if(distance(at,n.pos)<.47){this.damageNPC(n,b.damage);alive=false;break}
     }
    }else if(distance(at,this.player.pos)<.38){
     this.damagePlayer(b.damage);alive=false;
    }
   }
   if(alive&&b.range>.01)remaining.push(b);
  }
  this.bullets=remaining;
 }
 update(dt,now,{blocked=false}={}){
  if(blocked||window.armyMinigameActive)return;
  dt=clamp(dt,0,.05);this.time+=dt;
  this.playerCooldown=Math.max(0,this.playerCooldown-dt);
  if(this.playerAttack>0){
   this.playerAttack=Math.max(0,this.playerAttack-dt);
   if(!this.playerAttackApplied&&this.playerAttack<=.30){
    this.playerAttackApplied=true;this.melee();
   }
  }
  if((this.attackKeyboard||this.attackPointer!==null)&&this.weapon==='rifle'&&!this.wheelOpen)this.tryAttack();
  if(!this.provoked||this.gameOver){this.updateBullets(dt);return}
  const stage=weaponForKills(this.kills);
  const radius=chaseRadius(this.kills);
  for(const n of this.npcs){
   if(n.combatDead)continue;
   if(!n.combatActive&&distance(n.pos,this.player.pos)<=radius)this.engage(n);
  }
  const shooters=this.shootingNPCs(),shooterSet=new Set(shooters);
  for(const n of this.npcs){
   if(!n.combatActive||n.combatDead)continue;
   n.clock+=dt;n.combatCooldown=Math.max(0,n.combatCooldown-dt);
   if(n.combatDown>0){
    n.combatDown=Math.max(0,n.combatDown-dt);
    if(n.combatFall>0&&n.combatPush){
     const k=Math.min(dt,n.combatFall);
     const pushed=moveNpc(n,n.combatPush.x*3.0*k,n.combatPush.z*3.0*k,this.npcs,this.player.pos);
     n.pos=pushed;
     n.combatFall=Math.max(0,n.combatFall-dt);
    }
    n.anim.rifleAim=0;n.state='combatDown';n.activity='倒地中';
    if(n.combatDown===0){n.combatRise=COMBAT_RISE_SECONDS;n.combatRestLift=undefined}
    continue;
   }
   if(n.combatRise>0){
    n.combatRise=Math.max(0,n.combatRise-dt);
    n.anim.rifleAim=0;n.state='combatRise';n.activity='起身中';
    if(n.combatRise===0){
     n.combatDamageSinceFall=0;n.combatRestLift=undefined;
     n.state='combat';n.activity='繼續追擊';
     n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
    }
    continue;
   }
   n.combatWeapon=stage;
   n.anim.rifleAim=stage==='fists'?0:Math.min(1,(n.anim.rifleAim||0)+dt*7);
   n.renderLift=0;n.home.job='life';n.state='combat';n.activity='追擊玩家';
   const d=distance(n.pos,this.player.pos),sees=this.canSeeNPC(n);
   const ranged=stage!=='fists'&&d<20&&sees;
   if(stage==='fists'&&d<=1.64&&sees){
    n.anim.rifleAim=0;
    if(n.combatCooldown<=0){
     n.combatCooldown=1.42+n.id%3*.15;
     this.damagePlayer(8);
     n.combatAttack=.5;
     if(n.anim.hasClip('Punch_Combo_1')){n.anim.setClip('Punch_Combo_1',{restart:true});n.anim.speed=1.4}
    }
   }else if(ranged&&shooterSet.has(n)){
    if(n.combatCooldown<=0&&n.anim.rifleAim>.55){
     this.fireNPC(n);
     n.combatCooldown=stage==='rifle'?.65:.96;
    }
   }
   // No firing at walls. Instead use the SAME A* route used by daily squad drills.
   // Periodically refresh the player's destination without rebuilding 35 paths per frame.
   const shouldChase=stage==='fists'||!ranged||!shooterSet.has(n);
   if(shouldChase&&d>(stage==='fists'?1.55:stage==='rifle'?5.0:4.0)&&this.time>=n.combatNextMove){
    if(!n.combatGoal||distance(n.combatGoal,this.player.pos)>3.5||
       this.time-n.combatLastMove>2.3){
     n.combatGoal={...this.player.pos};n.combatLastMove=this.time;
    }
    const before={...n.pos};
    moveSquadMember(n,n.combatGoal,dt,true,false);
    if(distance(n.pos,before)>.008){
     n.combatStall=0;n.activity='繞路追擊';
    }else n.combatStall+=dt;
    if(n.combatStall>1.6){
     n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
     n.combatGoal={...this.player.pos};n.combatLastMove=this.time;
     n.combatStall=0;
    }
   }else if(n.combatAttack>0&&n.anim.hasClip('Punch_Combo_1')){
    n.anim.setClip('Punch_Combo_1');n.anim.speed=1.4;
   }else{
    n.anim.setClip('Idle');n.anim.speed=1;
   }
   if(n.combatAttack>0)n.combatAttack=Math.max(0,n.combatAttack-dt);
   const dx=this.player.pos.x-n.pos.x,dz=this.player.pos.z-n.pos.z;
   if(Math.hypot(dx,dz)>.08){
    const aim=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(aim-n.angle),Math.cos(aim-n.angle));
    n.angle+=delta*Math.min(1,dt*8);
   }
  }
  this.updateBullets(dt);
  this.refreshHUD();
 }
 project(x,y,z){
  const m=this.renderer.vp,w=m[3]*x+m[7]*y+m[11]*z+m[15];
  if(w<=.01)return null;
  const rect=this.canvas.getBoundingClientRect(),sx=m[0]*x+m[4]*y+m[8]*z+m[12],sy=m[1]*x+m[5]*y+m[9]*z+m[13];
  return {x:rect.left+(sx/w*.5+.5)*rect.width,y:rect.top+(.5-sy/w*.5)*rect.height};
 }
 drawWeapons(now){
  for(const {actor,weapon,npc} of [
    {actor:this.player,weapon:this.weapon,npc:false},
    ...this.npcs.filter(n=>n.combatActive&&!n.combatDead).map(n=>({actor:n,weapon:n.combatWeapon,npc:true}))
  ]){
   if(weapon==='fists'||(npc&&!this.renderer.isActorVisible(actor.pos)))continue;
   actor.anim.rifleAim=Math.max(.01,actor.anim.rifleAim||0);
   if(!actor.shotUntil)actor.shotUntil=0;
   (weapon==='rifle'?(npc?this.npcRifle:this.playerRifle):(npc?this.npcPistol:this.playerPistol))
    .draw(this.renderer.vp,actor,now);
  }
  const layer=$('campProjectileLayer'),live=new Set();
  for(const b of this.bullets){
   live.add(b.id);
   let el=layer.querySelector('[data-bullet="'+b.id+'"]');
   if(!el){el=document.createElement('div');el.className='campBullet';el.dataset.bullet=b.id;layer.appendChild(el)}
   const tail=this.project(b.x-b.dx*.65,1.06,b.z-b.dz*.65),tip=this.project(b.x,1.06,b.z);
   if(!tail||!tip){el.style.display='none';continue}
   el.style.display='';el.style.left=tail.x+'px';el.style.top=tail.y+'px';
   el.style.width=Math.hypot(tip.x-tail.x,tip.y-tail.y)+'px';
   el.style.transform='rotate('+Math.atan2(tip.y-tail.y,tip.x-tail.x)+'rad)';
  }
  for(const el of [...layer.children])if(!live.has(Number(el.dataset.bullet)))el.remove();
 }
}
export function createCampCombat(opts){return new CampCombat(opts)}
