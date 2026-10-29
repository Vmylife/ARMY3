/* ARMY3 v2.09 — 3D grenade aiming, throwing and demolition sound effects.
 * Only observes game states and counters; never changes physics, targeting, scores or NPCs.
 * This module is loaded by grenadeWorkshopSfx from the 3D range's score module.
 */
(()=>{'use strict';
if(window.__armyGrenadeArenaSfx?.dispose)return;
const files={meter:'11_aim_meter_tick.mp3',lock:'12_aim_lock_confirm.mp3',flight:'13_throw_flight_whoosh.mp3',land:'14_grenade_ground_impact.mp3',collapse:'15_building_collapse.mp3',crack:'16_debris_crack.mp3'};
const base=new URL('../../assets/audio/grenade/',import.meta.url);
const AudioCtor=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null;
const buffers=new Map(),pending=new Map();
let flying=null,phase='',lastTick=0,lastCollapse=0,lastBuildings=0,pendingBuildings=0,disposed=false;
let volume=0.72; // The 3D range's existing explosion stays louder than UI sounds.
function muted(){try{return localStorage.getItem('ARMY3_grenade_sfx_muted_v1')==='1'}catch{return false}}
function ensure(){if(disposed||!AudioCtor)return null;
 if(!ctx){ctx=new AudioCtor();master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination)}
 return ctx;
}
function load(key){if(pending.has(key))return pending.get(key);
 const c=ensure();if(!c)return Promise.resolve(null);
 const job=fetch(new URL(files[key],base),{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status+' '+files[key]);return r.arrayBuffer()})
  .then(ab=>c.decodeAudioData(ab)).then(b=>{buffers.set(key,b);return b}).catch(e=>{console.warn('Grenade sound:',e);return null});
 pending.set(key,job);return job;
}
function unlock(){const c=ensure();if(!c)return;
 if(c.state!=='running')c.resume().catch(()=>{});
 Object.keys(files).forEach(load);
}
function play(key,gain=1,rate=1,loop=false){
 if(disposed||muted())return null;
 const c=ensure();if(!c||c.state!=='running')return null;
 const b=buffers.get(key);if(!b){load(key);return null}
 try{
  const src=c.createBufferSource(),g=c.createGain();src.buffer=b;src.loop=loop;src.playbackRate.value=rate;
  g.gain.value=Math.max(0,Math.min(1.4,gain));src.connect(g);g.connect(master);src.start();
  return {src,g};
 }catch(e){console.warn('Grenade play sound failed',e);return null}
}
function stopFlight(){if(!flying)return;try{
 const now=ctx.currentTime;
 flying.g.gain.cancelScheduledValues(now);
 flying.g.gain.setValueAtTime(flying.g.gain.value,now);
 flying.g.gain.linearRampToValueAtTime(0,now+.12);
 flying.src.stop(now+.13);
 }catch{}flying=null}
// Audio contexts on mobile Safari require a real interaction. Both documents
// share an origin: the crafting screen remains interactive while this range loads.
const parentDoc=(()=>{try{return window.parent!==window&&window.parent.location.origin===location.origin?window.parent.document:null}catch{return null}})();
const listeners=[];
function listen(el,type,fn,opts){if(!el)return;el.addEventListener(type,fn,opts);listeners.push(()=>el.removeEventListener(type,fn,opts))}
listen(document,'pointerdown',unlock,{passive:true});listen(document,'keydown',unlock,{passive:true});
listen(parentDoc,'pointerdown',unlock,{passive:true});listen(parentDoc,'keydown',unlock,{passive:true});
listen(window,'pagehide',stopFlight);listen(document,'visibilitychange',()=>{if(document.hidden)stopFlight()});
// Predecode while 3D textures stream; the next legitimate touch resumes sound.
Object.keys(files).forEach(load);
function cycle(ts){
 if(disposed)return;
 requestAnimationFrame(cycle);
 const game=window.__grenadeTest;
 if(!game||!game.world)return;
 const next=game.state,world=game.world;
 if(!next)return;
 if(next!==phase){
  // Play a confirmation exactly once when the player locks each moving bar.
  if(phase==='aimX'&&next==='aimZ')play('lock',.55,1.04);
  if(phase==='aimZ'&&next==='flight')play('lock',.69,.89);
  if(next==='flight'){
    // Continuous airborne whoosh. Fades the instant the actual landing callback fires.
    stopFlight();flying=play('flight',.63,1,true);
  }
  if(next==='landed'){
    stopFlight();play('land',.92,.96+Math.random()*.07);
  }
  if(next==='blast'){stopFlight();lastBuildings=Math.max(0,world.counter?.buildings||0);pendingBuildings=0}
  if(next==='aimX'||next==='aimZ'){lastTick=ts;stopFlight()}
  if(next==='end'||next==='intro')stopFlight();
  phase=next;
 }
 if(document.hidden)return;
 // Soft electromechanical ticks while either bar is oscillating.
 if((next==='aimX'||next==='aimZ')&&ts-lastTick>=145){
  lastTick=ts;
  const pos=next==='aimX'?Number(document.getElementById('grenadeDirectionRay')?.getAttribute('x2')||150)/300:
   (parseFloat(document.getElementById('needleV')?.style.top)||50)/100;
  play('meter',.17,.90+Math.min(.19,Math.max(0,pos*.19)));
 }
 // The game's persistent cumulative building count can increase several times per frame.
 // Sound each group of fresh collapses, capped so multiple buildings do not cause distortion.
 if(next==='blast'){
  const count=Math.max(0,Number(world.counter?.buildings)||0);
  if(count>lastBuildings){pendingBuildings+=count-lastBuildings;lastBuildings=count;}
  if(pendingBuildings&&ts-lastCollapse>175){
   const delta=pendingBuildings;pendingBuildings=0;
   play('collapse',Math.min(.96,.44+delta*.14),.91+Math.random()*.14);
   if(delta>1)play('crack',Math.min(.65,.31+delta*.05),.92+Math.random()*.18);
   lastCollapse=ts;
  }
 }
}
requestAnimationFrame(cycle);
window.__armyGrenadeArenaSfx={unlock,dispose(){disposed=true;stopFlight();for(const f of listeners)try{f()}catch{};try{ctx?.close()}catch{}}};
})();
