// ARMY3 integrated camp combat V1 — civilian routines remain intact until provoked.
// Shared A* navigation and static clearance; bullets respect buildings, props and perimeter.
import {moveSquadMember,releaseForSquad} from './npcLife113.js?v=128';
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
export const COMBAT_RISE_SECONDS=1.70; // Match the fight lab's full standing-up motion.
// Larger local aggro zones, but ten kills still uniquely triggers GLOBAL pursuit.
const SENSE_RADIUS=k=>k>=10?Infinity:k===0?7:k<5?8.5+k*1.5:17+(k-5)*2;

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


const CAMP_GUN_SAMPLE='./assets/audio/rifle/npc_rifle_B.mp3?v=1';
function soundDisabled(){try{return localStorage.getItem('ARMY3_sfx_muted_v1')==='1'}catch{return false}}
// A distinguishable side-on rifle silhouette, shared by the weapon wheel and HUD.
const RIFLE_ICON='<svg class="campRifleGlyph" viewBox="0 0 100 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M4 21h14l10 6h24v-7h28v-5h5v5h11v8H71l-9 6-3 17H47l1-17H36l-10 9-10-11H4z"/><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M38 19l5-7h19l5 7M9 17v-7M57 34l-3 12"/></svg>';
function startAudio(){
 try{
  const Ctor=window.AudioContext||window.webkitAudioContext;
  if(!Ctor)return null;
  const ctx=startAudio.ctx??=new Ctor();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  if(!startAudio.pcm){
   const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.35),ctx.sampleRate),samples=b.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
   startAudio.pcm=b;
  }
  // Preload and decode at camp initialization, before the first range volley.
  // Playback still needs a user gesture to resume AudioContext on mobile.
  if(!startAudio.gunBuffer&&!startAudio.gunPromise&&
     (!startAudio.retryAt||performance.now()>startAudio.retryAt)){
   startAudio.gunPromise=fetch(CAMP_GUN_SAMPLE)
    .then(res=>{if(!res.ok)throw Error('Gun sample '+res.status);return res.arrayBuffer()})
    .then(bytes=>ctx.decodeAudioData(bytes))
    .then(b=>{startAudio.gunBuffer=b})
    .catch(err=>{console.warn('[戰鬥音效] 使用合成備用音效',err);startAudio.retryAt=performance.now()+30000})
    .finally(()=>{startAudio.gunPromise=null});
  }
  return ctx;
 }catch(err){console.warn('[戰鬥音效] 初始化失敗',err);return null}
}
function noise(duration,level,frequency,highpass=false){
 if(soundDisabled())return;
 const ctx=startAudio(),pcm=startAudio.pcm;if(!ctx||!pcm)return;
 const t=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
 source.buffer=pcm;filter.type=highpass?'highpass':'lowpass';filter.frequency.value=frequency;
 gain.gain.setValueAtTime(Math.max(.001,level),t);
 gain.gain.exponentialRampToValueAtTime(.001,t+duration);
 source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
 source.start(t);source.stop(t+duration+.012);
}
function whooshSound(level=1){noise(.13,.09*level,900,true)}
function thumpSound(heavy=false,level=1){
 if(soundDisabled())return;
 const ctx=startAudio();if(!ctx)return;
 noise(heavy?.19:.115,(heavy?.30:.23)*level,heavy?900:1300);
 const t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type='triangle';osc.frequency.setValueAtTime(heavy?150:185,t);
 osc.frequency.exponentialRampToValueAtTime(heavy?52:75,t+(heavy?.19:.12));
 gain.gain.setValueAtTime((heavy?.42:.27)*level,t);
 gain.gain.exponentialRampToValueAtTime(.001,t+(heavy?.21:.145));
 osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+(heavy?.22:.16));
}
function shotSound(rifle=false,level=1){
 if(soundDisabled())return;
 const ctx=startAudio();if(!ctx)return;
 const buffer=startAudio.gunBuffer,volume=Math.max(.05,Math.min(1,level));
 if(buffer){
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=buffer;source.playbackRate.value=(rifle?.95:1.22)+Math.random()*(rifle?.07:.09);
  gain.gain.value=.52*volume;source.connect(gain);gain.connect(ctx.destination);source.start(ctx.currentTime);
 }else{
  noise(rifle?.12:.17,(rifle?.33:.44)*volume,rifle?2400:2800);
  noise(rifle?.065:.10,(rifle?.14:.20)*volume,rifle?850:750);
  const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
  osc.type='triangle';osc.frequency.setValueAtTime(rifle?150:190,t);
  osc.frequency.exponentialRampToValueAtTime(rifle?55:58,t+.16);
  gain.gain.setValueAtTime(.25*volume,t);
  gain.gain.exponentialRampToValueAtTime(.001,t+.17);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.18);
 }
}

export class CampCombat{
 constructor({player,npcs,renderer,rifleGlb,npcGlb}){
  this.player=player;this.npcs=npcs;this.renderer=renderer;this.hp=100;this.kills=0;
  this.weapon='fists';this.provoked=false;this.gameOver=false;this.time=0;
  this.interactionMode=true;this.onInteract=null;
  this.playerAttack=0;this.playerAttackApplied=false;this.playerCooldown=0;this.attackKeyboard=false;this.attackPointer=null;
  this.wheelOpen=false;this.wheelSelection='up';this.wheelPointer=null;this.wheelTouch=null;
  this.bullets=[];this.seq=1;this.playerShotAt=-100;this.npcFireAt=-100;
  this.canvas=renderer.canvas;this.lastState='';this.lastRangeShotMs=-1000;
  this.hitStop=0;this.shake=0;this.cameraRecoil=0;this.playerHurt=0;
  this.playerDamageSinceFall=0;this.playerDown=0;this.playerRise=0;
  this.player.combatDown=0;this.player.combatRise=0;this.player.combatDead=false;this.player.combatDeathClip=false;
  this.hitChain=0;this.hitChainAt=-100;
  this.mountUI();
  // Start the MP3 preload during camp boot instead of waiting for the first volley.
  // Listen in capture phase so the home/start button and virtual joystick count too.
  startAudio();
  window.addEventListener('pointerdown',()=>startAudio(),{capture:true,passive:true});
  window.addEventListener('keydown',()=>startAudio(),{capture:true,passive:true});
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
   n.combatPush=null;n.combatRestLift=undefined;n.combatDeathClip=false;n.combatDeathAt=-100;
   n.combatCooldown=0;n.combatAttack=0;n.combatStrikeApplied=true;n.combatStall=0;n.combatGoal=null;
   n.combatWeapon='fists';n.combatLastMove=-100;n.combatNextMove=0;
  }
  this.refreshHUD(true);
 }
 mountUI(){
  const root=document.createElement('div');root.id='campCombatUI';root.innerHTML=`
   <div id="campCombatStatus" aria-live="polite"><span id="campHealth">HP 100</span><span id="campKills">擊殺 0</span><span id="campAlert">正常操課</span></div>
   <div class="campCombatButtons">
    <button id="campAttack" class="interaction" type="button" aria-label="互動"><span id="campAttackIcon">✋</span><small id="campAttackText">互動</small></button>
    <div class="campCombatTools">
     <button id="campModeSwitch" type="button" aria-label="切換戰鬥與互動模式" aria-pressed="true"><span>⇄</span><small>切換</small></button>
     <button id="campWeaponSwitch" type="button" aria-label="選擇武器"><span>◉</span><small>武器</small></button>
    </div>
   </div>
   <div id="campCombatTip" hidden></div>
   <div id="campCombatCombo" hidden></div>
   <div id="campCombatWheel" role="dialog" aria-label="武器輪盤" hidden>
    <div id="campWheelDisc">
     <button data-choice="up" class="campWheelSlot up" type="button"><span>✊</span><small>拳頭</small></button>
     <button data-choice="right" class="campWheelSlot right" type="button"><span>🔫</span><small>手槍</small></button>
     <button data-choice="bottom" class="campWheelSlot bottom" type="button"><span>${RIFLE_ICON}</span><small>步槍</small></button>
     <button data-choice="left" class="campWheelSlot left inactive" type="button"><span>🔒</span><small>預留</small></button>
     <button id="campWheelCancel" type="button"><strong id="campWheelName">拳頭</strong><small>取消</small></button>
    </div>
    <div class="campWheelHint">按住、滑動選擇、放開切換</div>
   </div>
   <div id="campCombatFinish" hidden><strong id="campFinishTitle">你陣亡了</strong><button id="campCombatRestart" type="button">重新開始軍營</button></div>
  `;
  document.body.appendChild(root);
  const layer=document.createElement('div');layer.id='campProjectileLayer';document.body.appendChild(layer);
  const flash=document.createElement('div');flash.id='campCombatFlash';flash.setAttribute('aria-hidden','true');document.body.appendChild(flash);
  const fx=document.createElement('div');fx.id='campCombatFx';fx.setAttribute('aria-hidden','true');document.body.appendChild(fx);
  this.root=root;this.fxLayer=fx;this.screenFlash=flash;
  const sw=$('campWeaponSwitch'),attack=$('campAttack'),mode=$('campModeSwitch'),
   wheel=$('campCombatWheel'),disc=$('campWheelDisc');
  mode.addEventListener('click',()=>{
   if(this.gameOver||window.armyMinigameActive)return;
   this.interactionMode=!this.interactionMode;
   this.attackKeyboard=false;this.attackPointer=null;
   if(this.wheelOpen)this.closeWheel(false);
   this.refreshHUD(true);
  });
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
   if(this.gameOver||this.wheelOpen||this.playerDown>0||this.playerRise>0||
      this.playerHurt>0||this.playerAttack>0||window.armyMinigameActive)return false;
   this.wheelOpen=true;this.attackPointer=null;this.attackKeyboard=false;
   this.wheelSelection=this.weapon==='rifle'?'bottom':this.weapon==='pistol'?'right':'up';
   wheel.hidden=false;document.body.classList.add('campWheelOpen');
   select(this.wheelSelection);return true;
  };
  this.openWheel=open;this.closeWheel=close;
  // On mobile the browser may re-target a release (especially a right swipe
  // toward the screen edge) away from the original button. Finalize at window
  // capture phase so every direction uses the same release path.
  let suppressSwitchClickUntil=0;
  const updateSwitchGesture=(event)=>{
   const p=this.wheelPointer;if(!p||p.id!==event.pointerId)return false;
   const choice=dir(event.clientX-p.x,event.clientY-p.y);
   if(choice){select(choice);p.dragged=true}
   return true;
  };
  const finishSwitchGesture=(event,cancel=false)=>{
   const p=this.wheelPointer;
   if(!p||p.id!==event.pointerId)return false;
   if(!cancel)updateSwitchGesture(event);
   const dragged=p.dragged;
   this.wheelPointer=null;
   if(dragged){
    // Some browsers synthesize a click after pointerup. Without this guard
    // the wheel instantly re-opens and looks like the swipe never closed it.
    suppressSwitchClickUntil=performance.now()+500;
    close(true);
   }else if(cancel)close(false);
   // A stationary tap should keep the wheel visible for a second selection.
   if(event.cancelable)event.preventDefault();
   return true;
  };
  sw.addEventListener('pointerdown',event=>{
   if(event.pointerType==='mouse'&&event.button!==0)return;
   if(!open())return;
   this.wheelPointer={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};
   try{sw.setPointerCapture(event.pointerId)}catch{}
   event.preventDefault();
  });
  sw.addEventListener('pointermove',updateSwitchGesture);
  // Capture-phase fallback also handles release over the wheel/right slot.
  window.addEventListener('pointermove',updateSwitchGesture,true);
  window.addEventListener('pointerup',event=>finishSwitchGesture(event),true);
  sw.addEventListener('pointerup',event=>finishSwitchGesture(event));
  window.addEventListener('pointercancel',event=>finishSwitchGesture(event,true),true);
  sw.addEventListener('lostpointercapture',event=>finishSwitchGesture(event,true));
  sw.addEventListener('click',event=>{
   event.preventDefault();
   if(event.detail>0&&performance.now()<suppressSwitchClickUntil)return;
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
   if(this.interactionMode){
    this.tryInteract();
    event.preventDefault();
    return;
   }
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
    if(this.interactionMode){
     if(!event.repeat)this.tryInteract();
    }else if(!this.attackKeyboard&&!event.repeat){
     this.attackKeyboard=true;startAudio();this.tryAttack();
    }
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
 setInteractionHandler(handler){this.onInteract=handler}
 tryInteract(){
  if(!this.interactionMode||this.gameOver||this.wheelOpen||
     this.playerDown>0||this.playerRise>0||this.playerHurt>0||
     window.armyMinigameActive)return false;
  if(this.provoked){
   this.notice('警戒中無法進行訓練');
   return false;
  }
  const result=this.onInteract?.();
  if(!result)this.notice('附近沒有可互動的項目');
  return !!result;
 }
 refreshHUD(force=false){
  const cur=[this.hp,this.kills,this.weapon,this.interactionMode,this.gameOver].join('/');
  if(!force&&this.lastState===cur)return;
  this.lastState=cur;
  $('campHealth').textContent='HP '+Math.ceil(this.hp);
  $('campKills').textContent='擊殺 '+this.kills;
  $('campAlert').textContent=this.kills>=10?'全營追擊':this.kills>=5?'步槍警戒':this.kills>=1?'手槍警戒':this.provoked?'徒手警戒':'正常操課';
  if(this.interactionMode){
   $('campAttackIcon').textContent='✋';
   $('campAttackText').textContent='互動';
  }else{
   if(this.weapon==='rifle')$('campAttackIcon').innerHTML=RIFLE_ICON;
   else $('campAttackIcon').textContent=this.weapon==='fists'?'✊':'🔫';
   $('campAttackText').textContent=this.weapon==='rifle'?'連發':this.weapon==='pistol'?'開火':'攻擊';
  }
  $('campAttack').setAttribute('aria-label',this.interactionMode?'互動':'攻擊');
  $('campModeSwitch').setAttribute('aria-pressed',String(this.interactionMode));
  $('campAttack').classList.toggle('interaction',this.interactionMode);
  $('campAttack').disabled=this.gameOver;
  $('campModeSwitch').disabled=this.gameOver;
  $('campWeaponSwitch').disabled=this.gameOver;
 }
 // Rifle-range NPCs use the identical sample/pitch as their combat counterparts.
 // Avoid clipping when 5 squads fire at nearly the same instant.
 playRangeShot(distance,now=performance.now()){
  if(!Number.isFinite(distance)||distance<0||distance>28)return false;
  if(now-this.lastRangeShotMs<50)return false;
  this.lastRangeShotMs=now;
  const loudness=Math.pow(Math.max(0,1-distance/32),1.2);
  shotSound(true,Math.max(.09,.90*loudness));
  return true;
 }
 scaledDt(realDt){
  const d=clamp(realDt,0,.05);
  const locked=Math.min(d,Math.max(0,this.hitStop||0));
  this.hitStop=Math.max(0,(this.hitStop||0)-d);
  return (d-locked)*(this.wheelOpen?.12:1);
 }
 cameraOffsets(realDt,now){
  const shake=this.shake||0;
  this.shake=Math.max(0,shake-realDt*.73);
  this.cameraRecoil=(this.cameraRecoil||0)*Math.exp(-realDt*13);
  return {yaw:shake*Math.sin(now*.091)*.075,
   pitch:shake*Math.cos(now*.11)*.035-this.cameraRecoil};
 }
 spawnFx(pos,cls,caption,life=420){
  if(!this.fxLayer||!this.renderer)return;
  const pt=this.project(pos.x,pos.y??1.17,pos.z);
  if(!pt)return;
  const node=document.createElement('span');
  node.className=cls;if(caption)node.dataset.text=caption;
  node.style.left=pt.x+'px';node.style.top=pt.y+'px';
  this.fxLayer.appendChild(node);
  setTimeout(()=>node.remove(),life);
 }
 flashScreen(hostile=false,strong=false){
  if(!this.screenFlash)return;
  const f=this.screenFlash;
  f.style.background=hostile?'rgba(252,84,67,.37)':'rgba(255,227,165,.33)';
  f.style.transition='none';f.style.opacity=strong?'.52':'.29';
  requestAnimationFrame(()=>{f.style.transition='opacity 125ms ease-out';f.style.opacity='0'});
 }
 onPlayerShot(pos,rifle=false){
  this.shake=Math.max(this.shake||0,rifle?.11:.13);
  this.cameraRecoil=Math.min(.040,(this.cameraRecoil||0)+(rifle?.006:.014));
  this.spawnFx({...pos,y:1.16},'campMuzzle','',135);
 }
 onCombatHit(pos,damage,{kind='bullet',down=false,dead=false,grounded=false,playerTarget=false}={}){
  const heavy=down||dead,rifle=this.weapon==='rifle';
  const freeze=kind==='punch'?(heavy?.087:.059):(heavy?.055:rifle?.012:.040);
  this.hitStop=Math.min(.10,Math.max(this.hitStop||0,freeze));
  this.shake=Math.max(this.shake||0,heavy?.25:playerTarget?.16:kind==='punch'?.10:.088);
  if(kind==='punch')thumpSound(heavy,playerTarget?.9:1);
  else if(heavy)thumpSound(true,.18);
  if(!playerTarget){
   this.spawnFx({...pos,y:1.17},'campHitBurst'+(heavy?' heavy':kind==='bullet'?' bullet':''),dead?'擊倒！':down?'擊飛！':grounded?'命中！':kind==='punch'?'啪！':'命中！',420);
   this.spawnFx({...pos,y:1.43},'campFloatDamage','-'+Math.round(damage),800);
  }else this.spawnFx({...pos,y:1.9},'campFloatDamage hostile','-'+Math.round(damage),800);
  this.flashScreen(playerTarget,heavy);
  if(!playerTarget){
   this.hitChain=this.time-this.hitChainAt<2.5?this.hitChain+1:1;
   this.hitChainAt=this.time;
   const display=$('campCombatCombo');
   if(display){
    display.hidden=this.hitChain<2;
    if(this.hitChain>=2){
     display.textContent=this.hitChain+' HIT COMBO';
     clearTimeout(this.comboTimer);
     this.comboTimer=setTimeout(()=>{display.hidden=true},950);
    }
   }
  }
 }
 // Start a real sampled combat clip. All 35 NPCs share the same immutable
 // skeleton clip data, so this doesn't allocate 35 sets of animation tracks.
 playCombatClip(actor,name,seconds,{restart=true}={}){
  const anim=actor.anim;
  if(!anim?.hasClip?.(name))return false;
  if(anim.clip!==name||restart)anim.setClip(name,{restart});
  anim.transition=0;anim.prevClip=null;
  const duration=anim.clips[name]?.duration||seconds;
  anim.speed=duration/Math.max(.1,seconds);
  return true;
 }
 get isActive(){return this.provoked}
 get playerAlive(){return !this.gameOver}
 playerPose(normalClip,normalSpeed){
  if(this.gameOver){
   if(this.player.combatDeathClip)return {clip:'falling_down',speed:this.player.anim.speed||1};
   return {clip:'Idle',speed:1};
  }
  if(this.playerDown>0){
   if(this.player.anim.hasClip('falling_down'))return {clip:'falling_down',speed:this.player.anim.clips.falling_down.duration/COMBAT_DOWN_SECONDS};
   return {clip:'Idle',speed:1};
  }
  if(this.playerRise>0){
   if(this.player.anim.hasClip('Arise'))return {clip:'Arise',speed:this.player.anim.clips.Arise.duration/COMBAT_RISE_SECONDS};
   return {clip:'Idle',speed:1};
  }
  if(this.playerHurt>0&&this.player.anim.hasClip('Hit_Reaction'))
   return {clip:'Hit_Reaction',speed:this.player.anim.clips.Hit_Reaction.duration/.64};
  if(this.playerAttack>0&&this.weapon==='fists'&&this.player.anim.hasClip('Punch_Combo_1'))
   return {clip:'Punch_Combo_1',speed:(this.player.anim.clips.Punch_Combo_1.duration||1.3)/(.72*1.45)};
  return {clip:normalClip,speed:normalSpeed};
 }
 // Battle overrides only these projectile and melee collision policies.
 // All other camp callers receive the previous line/clearance behavior.
 shotLineClear(a,b,padding=.11){return lineClear(a,b,padding)}
 meleeLineClear(a,b,padding=.11){return lineClear(a,b,padding)}
 shotClearance(pos){return staticClearance(pos)}
 tryAttack(){
  if(this.gameOver||this.interactionMode||this.wheelOpen||this.playerDown>0||this.playerRise>0||
     this.playerHurt>0||window.armyMinigameActive||this.playerCooldown>0)return false;
  if(this.weapon==='fists'){
   this.provoked=true;this.playerAttack=.72;this.playerAttackApplied=false;this.playerCooldown=.79;
   whooshSound();
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
   if(!this.shotLineClear(p,n.pos,.10))continue;
   if(d<min){min=d;target=n}
  }
  if(target)aim=Math.atan2(target.pos.x-p.x,target.pos.z-p.z);
  const muzzle=this.weapon==='rifle'?1.00:.73;
  const x=p.x+forward.x*muzzle-Math.cos(this.player.angle)*.085;
  const z=p.z+forward.z*muzzle+Math.sin(this.player.angle)*.085;
  this.bullets.push({id:this.seq++,owner:'player',x,z,dx:Math.sin(aim),dz:Math.cos(aim),
   angle:aim,targetId:target?.id??null,
   range:28,speed:49,damage:this.weapon==='rifle'?40:25});
  this.playerCooldown=this.weapon==='rifle'?.125:.25;
  this.playerShotAt=performance.now();
  this.player.shotUntil=this.playerShotAt+(this.weapon==='rifle'?100:115);
  shotSound(this.weapon==='rifle');
  this.onPlayerShot({x,z},this.weapon==='rifle');
  return true;
 }
 melee(){
  const p=this.player.pos,direction={x:Math.sin(this.player.angle),z:Math.cos(this.player.angle)};
  const nearby=this.npcs.filter(n=>!n.combatDead).map(n=>({n,d:distance(p,n.pos)})).sort((a,b)=>a.d-b.d);
  for(const {n,d} of nearby){
   if(d>1.85)break;
   const vx=(n.pos.x-p.x)/Math.max(.01,d),vz=(n.pos.z-p.z)/Math.max(.01,d);
   if(vx*direction.x+vz*direction.z<.22||!this.meleeLineClear(p,n.pos,.1))continue;
   this.damageNPC(n,10,'punch');return;
  }
 }
 damageNPC(n,damage,kind='bullet'){
  if(n.combatDead||damage<=0)return;
  this.provoked=true;
  // Provoking ANY soldier of a five-person training squad alerts all surviving
  // squadmates immediately, even on the other side of the camp.
  this.engageWithSquad(n);
  const grounded=n.combatDown>0||n.combatRise>0;
  n.combatHP=Math.max(0,n.combatHP-damage);
  const dead=n.combatHP<=0;
  const down=!grounded&&!dead&&n.combatDamageSinceFall+damage>=COMBAT_KNOCKDOWN_DAMAGE;
  this.onCombatHit(n.pos,damage,{kind,down,dead,grounded});
  // Damage while grounded/getting up never fills the next knockdown meter.
  if(!grounded)n.combatDamageSinceFall+=damage;
  if(n.combatHP<=0){
   const recovering=n.combatRise>0;
   n.combatDead=true;n.combatActive=false;n.combatWeapon='fists';
   n.combatDown=0;n.combatRise=0;n.combatFall=0;n.combatPush=null;
   n.combatHurtFull=0;
   n.combatDamageSinceFall=0;n.combatGoal=null;n.combatHurt=0;n.combatRestLift=undefined;
   n.anim.rifleAim=0;
   // Finish the falling animation even after a fatal blow. If already lying
   // down, keep its current clip time so finishing shots don't restart it.
   n.combatDeathAt=this.time;
   n.combatDeathClip=this.playCombatClip(n,'falling_down',COMBAT_DOWN_SECONDS,
    {restart:!grounded||recovering||n.anim.clip!=='falling_down'});
   if(!n.combatDeathClip){
    n.anim.setClip('Idle',{restart:true});n.anim.transition=0;n.anim.prevClip=null;
   }
   n.anim.evaluate(0);
   n.renderLift=0;n.shotPending=false;n.home.job='life';n.activity='倒地';
   this.kills++;
   // Friendly camp NPCs never grant medals: only future marked enemy-wave actors.
   if(n.isEnemy===true||n.faction==='enemy'||n.team==='enemy')
    window.armyProgression?.enemyKill(n.id);
   this.notice(this.kills===10?'全營警報！所有存活阿兵哥開始追擊！':
    this.kills===5?'步槍警戒！':this.kills===1?'手槍警戒！':'擊殺 '+this.kills);
   if(this.kills>=10)for(const alive of this.npcs)if(!alive.combatDead)this.engage(alive);
   this.refreshHUD(true);
   return;
  }
  if(!grounded&&n.combatDamageSinceFall>=COMBAT_KNOCKDOWN_DAMAGE){
   n.combatDamageSinceFall=0;n.combatDown=COMBAT_DOWN_SECONDS;
   n.combatDeathClip=false;
   n.combatHurt=0;n.combatHurtFull=0;
   n.combatRise=0;n.combatFall=.42;n.combatRestLift=undefined;
   const dx=n.pos.x-this.player.pos.x,dz=n.pos.z-this.player.pos.z;
   const len=Math.hypot(dx,dz)||1;
   n.combatPush={x:dx/len,z:dz/len};
   n.combatAttack=0;n.combatCooldown=.75;
   n.route=null;n.routeGoal=null;n.routeIndex=0;n.replanAt=0;
   n.anim.rifleAim=0;
   if(!this.playCombatClip(n,'falling_down',COMBAT_DOWN_SECONDS)){
    n.anim.setClip('Idle',{restart:true});n.anim.transition=0;n.anim.prevClip=null;
   }
   n.anim.evaluate(0);
   n.state='combatDown';n.activity='被擊飛';
   return;
  }
  if(!grounded){
   n.combatHurt=kind==='bullet'?.48:.62;
   n.combatHurtFull=n.combatHurt;
   n.combatAttack=0;n.combatStrikeApplied=true;
   n.anim.rifleAim=0;
   if(n.anim.hasClip('Hit_Reaction')){
    n.anim.setClip('Hit_Reaction',{restart:true});
    n.anim.transition=0;n.anim.prevClip=null;
   }
  }
 }
 engageWithSquad(n){
  const group=n.squadId;
  // Independent recruits have no integer squad ID. Never treat them as
  // one giant group merely because all their squadId values are undefined.
  if(!Number.isInteger(group)||group<0){
   this.engage(n);
   return;
  }
  for(const member of this.npcs){
   if(member.squadId===group&&!member.combatDead)this.engage(member);
  }
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
 damagePlayer(amount,kind='bullet'){
  if(this.gameOver)return;
  const grounded=this.playerDown>0||this.playerRise>0;
  this.hp=Math.max(0,this.hp-amount);
  const dead=this.hp<=0;
  if(!grounded)this.playerDamageSinceFall+=amount;
  const down=!dead&&!grounded&&this.playerDamageSinceFall>=COMBAT_KNOCKDOWN_DAMAGE;
  this.onCombatHit(this.player.pos,amount,{kind,down,playerTarget:true,dead,grounded});
  if(dead){
   this.gameOver=true;this.attackPointer=null;this.attackKeyboard=false;
   if(this.wheelOpen)this.closeWheel(false);
   this.player.combatDead=true;this.player.combatDown=0;this.player.combatRise=0;
   this.playerDown=0;this.playerRise=0;this.playerDamageSinceFall=0;this.playerHurt=0;
   this.player.anim.rifleAim=0;
   this.player.combatDeathAt=this.time;
   this.player.combatDeathClip=this.playCombatClip(this.player,'falling_down',COMBAT_DOWN_SECONDS,
    {restart:!grounded||this.player.anim.clip!=='falling_down'});
   // Keep the final fall visible instead of instantly covering it with a menu.
   clearTimeout(this.endTimer);
   this.endTimer=setTimeout(()=>{
    window.armyProgression?.renderBattleSummary();
    $('campCombatFinish').hidden=false;
   },2100);
   this.notice('你被全營阿兵哥制伏了');
  }else if(down){
   this.playerDown=COMBAT_DOWN_SECONDS;this.player.combatDown=this.playerDown;
   if(this.wheelOpen)this.closeWheel(false);
   this.player.combatDeathClip=false;
   this.playerRise=0;this.player.combatRise=0;this.playerDamageSinceFall=0;
   this.playerHurt=0;this.playerAttack=0;this.attackPointer=null;this.attackKeyboard=false;
   this.player.anim.rifleAim=0;
   this.playCombatClip(this.player,'falling_down',COMBAT_DOWN_SECONDS);
  }else if(!grounded){
   this.playerHurt=Math.max(this.playerHurt||0,kind==='bullet'?.48:.62);
   this.player.anim.rifleAim=0;
   if(this.player.anim.hasClip('Hit_Reaction'))
    this.playCombatClip(this.player,'Hit_Reaction',.64);
  }
  this.refreshHUD(true);
 }
 canSeeNPC(n){
  const p=this.player.pos,c=n.combatSight;
  if(c&&this.time-c.time<.18&&distance(n.pos,c.from)<.65&&distance(p,c.to)<.65)return c.visible;
  const visible=this.shotLineClear(n.pos,p,.13);
  n.combatSight={time:this.time,from:{...n.pos},to:{...p},visible};
  return visible;
 }
 shootingNPCs(){
  if(this.playerDown>0||this.playerRise>0||this.gameOver)return [];
  // Limit simultaneously firing NPCs; cache line-of-sight for large crowds.
  return this.npcs.filter(n=>n.combatActive&&!n.combatDead&&n.combatDown<=0&&n.combatRise<=0&&n.combatWeapon!=='fists'&&
   distance(n.pos,this.player.pos)<20&&this.canSeeNPC(n))
   .sort((a,b)=>distance(a.pos,this.player.pos)-distance(b.pos,this.player.pos)).slice(0,4);
 }
 fireNPC(n){
  if(this.playerDown>0||this.playerRise>0||this.gameOver)return;
  const origin=n.pos,p=this.player.pos;
  if(!this.shotLineClear(origin,p,.13))return;
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
  const audibility=Math.max(.15,1-distance(n.pos,this.player.pos)/26);
  shotSound(n.combatWeapon==='rifle',audibility*.72);
 }
 updateBullets(dt){
  if(!this.bullets.length)return;
  const remaining=[];
  for(const b of this.bullets){
   // The lab's gentle 15-degree target tracking also works while opponents
   // run across the camp. Locks stop when a building blocks the view.
   if(b.owner==='player'&&b.targetId!=null){
    const tracked=this.npcs.find(n=>n.id===b.targetId&&!n.combatDead);
    if(tracked&&this.shotLineClear({x:b.x,z:b.z},tracked.pos,.10)){
     const desired=Math.atan2(tracked.pos.x-b.x,tracked.pos.z-b.z);
     const current=Math.atan2(b.dx,b.dz);
     const delta=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
     const angle=current+clamp(delta,-4.5*dt,4.5*dt);
     b.dx=Math.sin(angle);b.dz=Math.cos(angle);b.angle=angle;
    }else b.targetId=null;
   }
   let travel=Math.min(b.range,b.speed*dt),alive=true;
   while(travel>0&&alive){
    const segment=Math.min(travel,.095);
    const x=b.x+b.dx*segment,z=b.z+b.dz*segment,at={x,z};
    // A real bullet disappears at the first collision; no through-wall hits.
    if(!insidePerimeter(at)||this.shotClearance(at)<.065){alive=false;break}
    b.x=x;b.z=z;b.range-=segment;travel-=segment;
    if(b.owner==='player'){
     for(const n of this.npcs){
      if(n.combatDead)continue;
      if(distance(at,n.pos)<.47){this.damageNPC(n,b.damage,'bullet');alive=false;break}
     }
    }else if(distance(at,this.player.pos)<.38){
     this.damagePlayer(b.damage,'bullet');alive=false;
    }
   }
   if(alive&&b.range>.01)remaining.push(b);
  }
  this.bullets=remaining;
 }
 update(dt,now,{blocked=false}={}){
  if(blocked||window.armyMinigameActive)return;
  dt=clamp(dt,0,.05);
  // Real hit-stop freezes AI, cooldowns and projectiles, not just animation.
  if(dt<=0)return;
  this.time+=dt;
  if(this.player.combatDeathClip&&this.time-(this.player.combatDeathAt||0)>=COMBAT_DOWN_SECONDS){
   this.player.combatDeathClip=false;
   this.player.anim.setClip('Idle',{restart:true});
   this.player.anim.transition=0;this.player.anim.prevClip=null;
   this.player.combatRestLift=undefined;
  }
  for(const n of this.npcs){
   if(!n.combatDead||!n.combatDeathClip)continue;
   if(this.time-n.combatDeathAt>=COMBAT_DOWN_SECONDS){
    n.combatDeathClip=false;
    n.anim.setClip('Idle',{restart:true});
    n.anim.transition=0;n.anim.prevClip=null;
    n.combatRestLift=undefined;
   }
  }
  this.playerHurt=Math.max(0,(this.playerHurt||0)-dt);
  // Players use the exact same falling/getting-up clips as camp NPCs.
  if(this.playerDown>0){
   this.playerDown=Math.max(0,this.playerDown-dt);
   this.player.combatDown=this.playerDown;
   if(this.playerDown===0&&this.hp>0){
    this.playerRise=COMBAT_RISE_SECONDS;this.player.combatRise=this.playerRise;
    this.playCombatClip(this.player,'Arise',COMBAT_RISE_SECONDS);
   }
  }else if(this.playerRise>0){
   this.playerRise=Math.max(0,this.playerRise-dt);
   this.player.combatRise=this.playerRise;
   if(this.playerRise===0){
    this.playerDamageSinceFall=0;this.player.combatRestLift=undefined;
   }
  }
  this.playerCooldown=Math.max(0,this.playerCooldown-dt);
  if(this.playerAttack>0){
   this.playerAttack=Math.max(0,this.playerAttack-dt);
   if(!this.playerAttackApplied&&this.playerAttack<=.43){
    this.playerAttackApplied=true;this.melee();
   }
  }
  if(!this.interactionMode&&(this.attackKeyboard||this.attackPointer!==null)&&
      this.weapon==='rifle'&&!this.wheelOpen)this.tryAttack();
  if(!this.provoked||this.gameOver){this.updateBullets(dt);return}
  const stage=weaponForKills(this.kills);
  const radius=chaseRadius(this.kills);
  for(const n of this.npcs){
   if(n.combatDead)continue;
   if(!n.combatActive&&distance(n.pos,this.player.pos)<=radius)
    this.engageWithSquad(n);
  }
  const shooters=this.shootingNPCs(),shooterSet=new Set(shooters);
  for(const n of this.npcs){
   if(!n.combatActive||n.combatDead)continue;
   n.clock+=dt;n.combatCooldown=Math.max(0,n.combatCooldown-dt);
   if(n.combatAttack>0){
    n.combatAttack=Math.max(0,n.combatAttack-dt);
    if(!n.combatStrikeApplied&&n.combatAttack<=.41){
     n.combatStrikeApplied=true;
     // Mid-swing hit frame: moving out of range makes the punch miss.
     if(!this.playerDown&&!this.playerRise&&!this.gameOver&&
         distance(n.pos,this.player.pos)<1.93&&this.canSeeNPC(n))
      this.damagePlayer(9,'punch');
    }
   }
   if(n.combatDown>0){
    n.combatDown=Math.max(0,n.combatDown-dt);
    if(n.combatFall>0&&n.combatPush){
     const k=Math.min(dt,n.combatFall);
     const pushed=moveNpc(n,n.combatPush.x*7.0*k,n.combatPush.z*7.0*k,this.npcs,this.player.pos);
     n.pos=pushed;
     n.combatFall=Math.max(0,n.combatFall-dt);
    }
    n.anim.rifleAim=0;n.state='combatDown';n.activity='倒地中';
    if(n.combatDown===0){
     n.combatRise=COMBAT_RISE_SECONDS;n.combatRestLift=undefined;
     this.playCombatClip(n,'Arise',COMBAT_RISE_SECONDS);
    }
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
   if(n.combatHurt>0){
    n.combatHurt=Math.max(0,n.combatHurt-dt);
    n.state='combatHit';n.activity='受擊';
    if(n.anim.hasClip('Hit_Reaction')){
     if(n.anim.clip!=='Hit_Reaction')this.playCombatClip(n,'Hit_Reaction',.64);
     n.anim.speed=n.anim.clips.Hit_Reaction.duration/.64;
    }else if(n.anim.clip!=='Idle')n.anim.setClip('Idle');
    if(n.combatHurt>0)continue;
   }
   n.combatWeapon=stage;
   n.anim.rifleAim=stage==='fists'?0:Math.min(1,(n.anim.rifleAim||0)+dt*7);
   n.renderLift=0;n.home.job='life';n.state='combat';n.activity='追擊玩家';
   const d=distance(n.pos,this.player.pos),sees=this.canSeeNPC(n);
   const ranged=stage!=='fists'&&d<20&&sees;
   if(stage==='fists'&&d<=1.64&&sees){
    n.anim.rifleAim=0;
    if(n.combatCooldown<=0&&n.combatAttack<=0){
     n.combatCooldown=1.42+n.id%3*.15;
     whooshSound(.25);
     n.combatAttack=.72;n.combatStrikeApplied=false;
     if(n.anim.hasClip('Punch_Combo_1'))this.playCombatClip(n,'Punch_Combo_1',.70);
    }
   }else if(ranged&&shooterSet.has(n)){
    if(n.combatCooldown<=0&&n.anim.rifleAim>.55){
     this.fireNPC(n);
     n.combatCooldown=stage==='rifle'?.65:.96;
    }
   }
   // No firing at walls. Instead use the SAME A* route used by daily squad drills.
   // Periodically refresh the player's destination without rebuilding 35 paths per frame.
   const shouldChase=n.combatAttack<=0&&(stage==='fists'||!ranged||!shooterSet.has(n));
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
    if(n.anim.clip!=='Punch_Combo_1')this.playCombatClip(n,'Punch_Combo_1',.70);
    n.anim.speed=(n.anim.clips.Punch_Combo_1.duration||1.4)/.70;
   }else{
    n.anim.setClip('Idle');n.anim.speed=1;
   }
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
    ...(!this.playerDown&&!this.playerRise&&!this.gameOver&&!this.playerHurt
      ?[{actor:this.player,weapon:this.weapon,npc:false}]:[]),
    ...this.npcs.filter(n=>n.combatActive&&!n.combatDead&&n.combatDown<=0&&n.combatRise<=0&&(n.combatHurt||0)<=0).map(n=>({actor:n,weapon:n.combatWeapon,npc:true}))
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
