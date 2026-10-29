/* ARMY3 Blanket Stacking SFX v1.62 quality bands + shared volume control.
   Event-driven foley; grenade blast/collapse SFX reuse the *existing* grenade assets.
   This module does not edit movement, physics, NPCs, rounds or scoring.
 */
const clips = {
  drop: '../../assets/audio/blanket/blanket_drop_fabric.mp3',
  land1: '../../assets/audio/blanket/blanket_land_1.mp3',
  land2: '../../assets/audio/blanket/blanket_land_2.mp3',
  land3: '../../assets/audio/blanket/blanket_land_3.mp3',
  land4: '../../assets/audio/blanket/blanket_land_4.mp3',
  perfect: '../../assets/audio/blanket/blanket_quality_perfect.mp3',
  good: '../../assets/audio/blanket/blanket_quality_good.mp3',
  bad: '../../assets/audio/blanket/blanket_quality_bad.mp3',
  danger: '../../assets/audio/blanket/blanket_quality_danger.mp3',
  tumble: '../../assets/audio/blanket/blanket_tower_tumble.mp3',
  tension: '../../assets/audio/blanket/blanket_tension_rustle.mp3',
  coin1: '../../assets/audio/blanket/coin_tick_1.mp3',
  coin2: '../../assets/audio/blanket/coin_tick_2.mp3',
  coin3: '../../assets/audio/blanket/coin_tick_3.mp3',
  coin4: '../../assets/audio/blanket/coin_tick_4.mp3',
  payout: '../../assets/audio/blanket/coin_payout_finish.mp3',
  // Reuse the same sound files already used by the grenade minigame.
  blast: '../../assets/audio/grenade/explosion_crack_rumble.mp3',
  collapse1: '../../assets/audio/grenade/collapse_1.mp3',
  collapse2: '../../assets/audio/grenade/collapse_2.mp3',
  collapse3: '../../assets/audio/grenade/collapse_3.mp3',
  debris: '../../assets/audio/grenade/debris_scatter.mp3'
};
const AC = window.AudioContext || window.webkitAudioContext;
const bytes = new Map(), buffers = new Map(), loading = new Map();
const activePayout = new Set();
let ctx = null, master = null, alive = true, lastTension = -1e8, lastBlast = -1e8;
let lastBuilding = -1e8, activeBuildingSounds = 0, buildingIndex = 0;
// One control affects ALL blanket minigame effects, including reused grenade effects.
const VOLUME_KEY='ARMY3_blanket_sfx_volume_v2';
const ORIGINAL_GAIN=.67;  // 100% matches v1.61's previous sound level.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function storedVolume(){
  try {
    const current=localStorage.getItem(VOLUME_KEY);
    if(current!==null&&current.trim()!==''){
      const n=Number(current);if(Number.isFinite(n))return clamp(Math.round(n),0,100);
    }
    return localStorage.getItem('ARMY3_blanket_sfx_muted_v1')==='1'?0:75;
  }catch{return 75}
}
let volumePct=storedVolume(),lastQuality='';
const muted=()=>volumePct===0;
function applyVolume(){
  if(!master||!ctx)return;
  const target=ORIGINAL_GAIN*volumePct/100;
  master.gain.setTargetAtTime(target,ctx.currentTime,.018);
}
function setVolume(value){
  const n=Number(value);if(!Number.isFinite(n))return;
  volumePct=clamp(Math.round(n),0,100);
  try{
    localStorage.setItem(VOLUME_KEY,String(volumePct));
    // Keep compatibility with the former mute setting.
    localStorage.setItem('ARMY3_blanket_sfx_muted_v1',volumePct===0?'1':'0');
  }catch{}
  applyVolume();
  syncVolumeUI();
}
// A compact mobile-friendly disclosure below the main game's top-right HUD.
const control=document.createElement('div');
control.id='blanketSfxControl';
control.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 75px);right:max(10px,env(safe-area-inset-right));z-index:10;pointer-events:auto;color:#f7f2d9;font:800 13px system-ui,-apple-system,sans-serif;';
const toggle=document.createElement('button');
toggle.id='blanketSfxToggle';toggle.type='button';
toggle.setAttribute('aria-label','調整棉被遊戲音效音量');toggle.setAttribute('aria-controls','blanketSfxPanel');toggle.setAttribute('aria-expanded','false');
toggle.style.cssText='width:43px;height:43px;display:grid;place-items:center;border-radius:13px;background:#173529ed;color:#fff5d4;border:1px solid #e9d495ad;box-shadow:0 4px 15px #09271966;font-size:20px;padding:0;cursor:pointer;touch-action:manipulation;float:right;';
const panel=document.createElement('div');panel.id='blanketSfxPanel';panel.hidden=true;
panel.style.cssText='clear:both;position:absolute;top:49px;right:0;width:236px;max-width:calc(100vw - 22px);border:1px solid #e9d495a8;border-radius:14px;background:#10271feF;box-shadow:0 8px 23px #04180cc0;padding:12px 14px;backdrop-filter:blur(8px);';
const label=document.createElement('label');label.htmlFor='blanketSfxRange';label.style.cssText='display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px;';
const labelText=document.createElement('span');labelText.textContent='音效音量';
const number=document.createElement('output');number.id='blanketSfxValue';number.htmlFor='blanketSfxRange';number.style.cssText='font-weight:950;color:#f4d78f;font-variant-numeric:tabular-nums;';
label.append(labelText,number);
const range=document.createElement('input');range.type='range';range.id='blanketSfxRange';range.min='0';range.max='100';range.step='1';range.value=String(volumePct);
range.setAttribute('aria-label','全部音效音量，0 到 100%');
range.style.cssText='display:block;width:100%;height:34px;margin:0;accent-color:#edcb79;cursor:pointer;touch-action:pan-x;';
const hint=document.createElement('small');hint.textContent='棉被、金幣、爆炸、倒塌統一調整';hint.style.cssText='display:block;font-size:10px;color:#bdcdbd;line-height:1.35;margin-top:3px;';
panel.append(label,range,hint);control.append(toggle,panel);document.body.append(control);
function syncVolumeUI(){range.value=String(volumePct);number.textContent=volumePct+'%';toggle.textContent=volumePct===0?'🔇':volumePct<=35?'🔈':'🔊';toggle.title='音效音量 '+volumePct+'%';}
syncVolumeUI();
toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});
range.addEventListener('input',()=>setVolume(range.value));
range.addEventListener('change',()=>setVolume(range.value));
document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!control.contains(e.target)){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}},{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
window.__armyBlanketSfx={setVolume,getVolume:()=>volumePct,get lastQuality(){return lastQuality}};
function audioContext() {
  if (!AC || !alive) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = ORIGINAL_GAIN*volumePct/100;
    master.connect(ctx.destination);
  }
  return ctx;
}
function decode(name, raw) {
  const c = audioContext();
  if (!c || buffers.has(name)) return;
  c.decodeAudioData(raw.slice(0)).then(b => buffers.set(name, b))
    .catch(e => console.warn('[Blanket SFX] decode:', name, e));
}
function preload(name) {
  if (loading.has(name)) return loading.get(name);
  const promise = fetch(new URL(clips[name], import.meta.url), { cache: 'force-cache' })
    .then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
    .then(raw => { bytes.set(name, raw); decode(name, raw); return true; })
    .catch(e => { console.warn('[Blanket SFX] load:', name, e); return false; });
  loading.set(name, promise);
  return promise;
}
function unlock() {
  const c = audioContext();
  if (c?.state === 'suspended') c.resume().catch(() => {});
  for (const [name, raw] of bytes) if (!buffers.has(name)) decode(name, raw);
}
function play(name, volume = 1, rate = 1, time = undefined, isPayout = false) {
  if (!alive || muted()) return null;
  const c = audioContext(), b = buffers.get(name);
  if (!c || c.state !== 'running' || !b) { preload(name); return null; }
  const src = c.createBufferSource(), gain = c.createGain();
  src.buffer = b; src.playbackRate.value = rate;
  gain.gain.value = Math.max(0, Math.min(1, volume));
  src.connect(gain); gain.connect(master);
  src.start(Math.max(c.currentTime, time ?? c.currentTime));
  if (isPayout) {
    activePayout.add({src, gain});
    // Remove the precise voice after its naturally scheduled end.
    src.addEventListener('ended', () => {
      for (const item of activePayout) if (item.src === src) { activePayout.delete(item); break; }
    }, {once: true});
  }
  return {src, gain};
}
function stopPayout() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const item of activePayout) {
    try {
      item.gain.gain.setValueAtTime(item.gain.gain.value, t);
      item.gain.gain.linearRampToValueAtTime(.0001, t + .035);
      item.src.stop(t + .04);
    } catch {}
  }
  activePayout.clear();
}
function on(name, fn) { window.addEventListener(name, fn); }
on('army:blanket:drop', () => { unlock(); play('drop', .44, .96 + Math.random() * .12); });
on('army:blanket:land', e => {
  const accuracy = Number(e.detail?.accuracy ?? 1);
  const layers = Math.max(1, Number(e.detail?.layers || 1));
  // Both the landing deviation and the actual tower stability decide the sound.
  // The game exposes lastRisk from its existing physics; this never changes scoring.
  const rawRisk=Number(window.__blanketTest?.danger ?? 0);
  const risk=Number.isFinite(rawRisk)?rawRisk:0;
  const off=Number.isFinite(accuracy)?Math.max(0,accuracy):1;
  const quality=(risk>=.88||off>=.95)?'danger'
    :off<.24&&risk<.78?'perfect'
    :off<.58&&risk<.74?'good':'bad';
  lastQuality=quality;
  const volumeByQuality={perfect:.54,good:.61,bad:.66,danger:.73};
  const v=Math.min(.83,volumeByQuality[quality]+Math.log1p(layers)*.014);
  play(quality,v,.96+Math.random()*.065);
  // Dangerous placement has a slightly stronger fabric drag; the pre-existing
  // tower-instability event remains separate, following the original game rule.
  if(quality==='danger'&&risk<.62)play('tension',.16,.98);
});
on('army:blanket:topple', () => {
  play('tumble', .66, .94 + Math.random() * .09);
});
on('army:blanket:tension', () => {
  const now = performance.now();
  if (now - lastTension > 820) { lastTension = now; play('tension', .31, .96 + Math.random() * .10); }
});
on('army:blanket:blast', () => {
  const now = performance.now();
  // Chain reactions play, but very rapid blasts do not clip each other.
  const volume = now - lastBlast < 180 ? .40 : .69;
  lastBlast = now;
  play('blast', volume, .96 + Math.random() * .07);
});
on('army:blanket:building', () => {
  const now = performance.now();
  if (now - lastBuilding < 150 || activeBuildingSounds >= 2) return;
  lastBuilding = now;
  const name = 'collapse' + (1 + (buildingIndex++ % 3));
  const voice = play(name, .57, .91 + Math.random() * .13);
  if (voice) {
    activeBuildingSounds++;
    voice.src.addEventListener('ended', () => {activeBuildingSounds = Math.max(0, activeBuildingSounds-1)}, {once:true});
    if (buildingIndex % 3 === 0) play('debris', .23, 1);
  }
});
on('army:blanket:cashout', e => {
  unlock();
  stopPayout();
  const c = audioContext();
  if (!c || c.state !== 'running' || muted()) return;
  const layers = Math.max(1, Math.floor(Number(e.detail?.layers) || 1));
  const steps = Math.min(24, Math.max(5, Math.round(4 + Math.sqrt(layers) * 3.2)));
  const start = c.currentTime + .018;
  let offset = 0;
  for (let i = 0; i < steps; i++) {
    const progress = i / Math.max(1, steps-1);
    const spacing = .118 - .041 * progress;
    play('coin' + (1 + i % 4), .40 + progress * .13, 1 + progress * .10, start + offset, true);
    offset += spacing;
  }
  play('payout', .55, 1, start + offset + .04, true);
});
// iPhone Safari unlock: listen in capture phase so the actual touch can resume WebAudio.
document.addEventListener('pointerdown', unlock, {capture: true, passive: true});
document.addEventListener('keydown', unlock, {capture: true, passive: true});
document.addEventListener('visibilitychange', () => {if (document.hidden) stopPayout()});
window.addEventListener('pagehide', () => {alive = false; stopPayout(); try {ctx?.close()} catch {}});
for (const name in clips) preload(name);
