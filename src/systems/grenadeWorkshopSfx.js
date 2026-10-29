/* ARMY3 grenade workshop sound overlay v1. Works from the preloaded same-origin 3D iframe.
   Zero changes to crafting/aiming/scoring logic. All audio is original game-only FX. */
import './grenadeArenaSfx.js?v=324';
import {installMinigameBgm} from './minigameBgm.js?v=170';
(()=>{'use strict';
const host=window.parent!==window&&new URLSearchParams(location.search).get('embedded')==='1'?window.parent:window;
installMinigameBgm('grenade',{host,sceneWindow:window,control:true});
let doc;
try{doc=host.document;if(!doc.querySelector('#pourBtn')&&!doc.querySelector('#startBtn'))return}catch{return}
// The 3D arena iframe can be re-created. Always unhook the previous instance first.
try{host.__armyWorkshopAudioAgent?.dispose?.()}catch{}
const FILES={pour:'01_fill_loop.mp3',settle:'02_fill_stop.mp3',pump:'03_press_start.mp3',good:'04_press_good.mp3',perfect:'05_press_perfect.mp3',bad:'06_press_bad.mp3',grab:'ratchet_4.mp3',tick:'ratchet_1.mp3',tick2:'ratchet_2.mp3',tick3:'ratchet_3.mp3',tick4:'ratchet_4.mp3',done:'aim_lock.mp3',overflow:'10_overflow.mp3'};
const BASE=new URL('./assets/audio/grenade/',host.location.href).href;
const buffers=new Map(),loading=new Map();const disposers=[];
let context=null,master=null,pour=null,muted=false,angleAccum=0,lastTick=-1,drag=false,prevAngle=0,pouring=false;
try{muted=host.localStorage.getItem('ARMY3_grenade_sfx_muted_v1')==='1'}catch{}
function listen(target,event,fn,opt){target.addEventListener(event,fn,opt);disposers.push(()=>target.removeEventListener(event,fn,opt))}
function getContext(){const C=host.AudioContext||host.webkitAudioContext;if(!C)return null;if(!context){context=new C();master=context.createGain();master.gain.value=muted?0:.69;master.connect(context.destination)}return context}
function load(name){if(loading.has(name))return loading.get(name);const c=getContext();if(!c)return Promise.resolve(null);
 const promise=host.fetch(BASE+FILES[name]).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.arrayBuffer()}).then(b=>c.decodeAudioData(b))
 .then(b=>{buffers.set(name,b);return b}).catch(e=>{console.warn('音效載入失敗：'+name,e);return null});loading.set(name,promise);return promise}
function unlock(){const c=getContext();if(!c)return;if(c.state!=='running')c.resume().catch(()=>{});for(const k of Object.keys(FILES))load(k)}
function play(name,volume=1,rate=1){if(muted)return null;const c=getContext(),b=buffers.get(name);if(!c||!b||c.state!=='running')return null;
 const source=c.createBufferSource(),gain=c.createGain();source.buffer=b;source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);gain.connect(master);source.start();return {source,gain}}
function stopPour(tail=true){if(!pour)return;const p=pour;pour=null;try{const t=context.currentTime;p.gain.gain.cancelScheduledValues(t);p.gain.gain.setValueAtTime(p.gain.gain.value,t);p.gain.gain.linearRampToValueAtTime(0,t+.09);p.source.stop(t+.10)}catch{}if(tail)play('settle',.46)}
function startPour(){unlock();if(pour||muted||!pouring)return;const c=context,b=buffers.get('pour');if(!c||c.state!=='running')return; if(!b){load('pour').then(()=>{if(pouring&&!pour)startPour()});return;}
 const source=c.createBufferSource(),gain=c.createGain();source.buffer=b;source.loop=true;gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(.47,c.currentTime+.095);source.connect(gain);gain.connect(master);source.start();pour={source,gain}}
function setMuted(v){muted=!!v;if(muted)stopPour(false);try{host.localStorage.setItem('ARMY3_grenade_sfx_muted_v1',muted?'1':'0')}catch{}if(context&&master)master.gain.setTargetAtTime(muted?0:.69,context.currentTime,.02);toggle.textContent=muted?'🔇':'🔊';toggle.title=muted?'開啟製作音效':'關閉製作音效'}
function stopAll(){pouring=false;stopPour(false);drag=false;angleAccum=0}
function pressResult(label){if(label==='PERFECT！'){play('good',.95);play('perfect',.75)}else if(label==='GREAT！'||label==='GOOD！')play('good',label==='GREAT！'?1:.82);else play('bad',label==='MISS！'?1:.78)}
function wheelMove(delta){if(delta<=0||muted)return;angleAccum+=Math.min(1.3,delta);const t=host.performance.now();if(angleAccum>=.122&&t-lastTick>=62){angleAccum=Math.min(.16,angleAccum-.122);lastTick=t;play(['tick','tick2','tick3','tick4'][Math.floor(Math.random()*4)],.76,.96+Math.random()*.08)}}
let toggle=doc.getElementById('grenadeSoundToggle');if(!toggle){toggle=doc.createElement('button');toggle.id='grenadeSoundToggle';toggle.type='button';toggle.style.cssText='height:32px;min-width:37px;border:1px solid #bacfa85b;border-radius:9px;background:#5a705238;color:#e1edce;font-size:17px;margin-left:3px;';const restart=doc.getElementById('restart');if(restart)restart.before(toggle)}
toggle.textContent=muted?'🔇':'🔊';toggle.title=muted?'開啟製作音效':'關閉製作音效';toggle.setAttribute('aria-label','切換手榴彈製作音效');listen(toggle,'click',()=>{unlock();setMuted(!muted)});
function target(e,id){return !!e.target?.closest?.('#'+id)}
listen(doc,'pointerdown',e=>{
 if(target(e,'pourBtn')){pouring=true;startPour()}
 if(target(e,'wheelPad')){unlock();drag=true;const r=e.target.closest('#wheelPad').getBoundingClientRect();prevAngle=Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2));angleAccum=0;lastTick=host.performance.now();play('grab',.74)}
},true);
listen(doc,'pointermove',e=>{if(!drag)return;const el=doc.getElementById('wheelPad');if(!el){drag=false;return}const r=el.getBoundingClientRect(),angle=Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2));let delta=angle-prevAngle;if(delta>Math.PI)delta-=Math.PI*2;if(delta<-Math.PI)delta+=Math.PI*2;prevAngle=angle;if(delta>0&&delta<1.3)wheelMove(delta)},true);
function pointerEnd(){if(pouring){pouring=false;stopPour(true)}drag=false}
for(const type of ['pointerup','pointercancel'])listen(doc,type,pointerEnd,true);
listen(doc,'click',e=>{
 if(target(e,'startBtn')){unlock();return}
 if(target(e,'pressBtn')){
   unlock();if(e.target.closest('#pressBtn')?.textContent?.includes('啟動壓實')){stopPour(false);play('pump',.93)}
   else{host.setTimeout(()=>{const t=doc.getElementById('toast')?.textContent||'';pressResult(t.includes('PERFECT！')?'PERFECT！':t.includes('GREAT！')?'GREAT！':t.includes('GOOD！')?'GOOD！':t.includes('MISS！')?'MISS！':'BAD…')},10)}
 }
 if(target(e,'shapeDone')){stopAll();play('done',.92)}
 if(target(e,'restart')||target(e,'retryBtn'))stopAll();
},true);
const toast=doc.getElementById('toast');if(toast){let seen='';const observer=new host.MutationObserver(()=>{let t=toast.textContent||'';if(t===seen)return;seen=t;if(t.includes('火藥滿出來')){stopAll();play('overflow',.90)} });observer.observe(toast,{childList:true,characterData:true,subtree:true});disposers.push(()=>observer.disconnect())}
listen(doc,'visibilitychange',()=>{if(doc.hidden)stopAll()});
listen(host,'pagehide',stopAll);
// Preload buffers while the 3D arena initializes. The first real touch resumes audio on iPhone Safari.
unlock();
host.__armyWorkshopAudioAgent={dispose(){stopAll();for(const f of disposers)f();try{toggle.remove()}catch{}},setMuted,unlock};
listen(window,'pagehide',()=>{if(host.__armyWorkshopAudioAgent?.dispose)host.__armyWorkshopAudioAgent.dispose()},{once:true});
})();
