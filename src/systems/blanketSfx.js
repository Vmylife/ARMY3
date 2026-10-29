/* ARMY3 Blanket Stacking SFX v1.61.
   Event-driven foley; grenade blast/collapse SFX reuse the *existing* grenade assets.
   This module does not edit movement, physics, NPCs, rounds or scoring.
 */
const clips = {
  drop: '../../assets/audio/blanket/blanket_drop_fabric.mp3',
  land1: '../../assets/audio/blanket/blanket_land_1.mp3',
  land2: '../../assets/audio/blanket/blanket_land_2.mp3',
  land3: '../../assets/audio/blanket/blanket_land_3.mp3',
  land4: '../../assets/audio/blanket/blanket_land_4.mp3',
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
const muted = () => {
  try { return localStorage.getItem('ARMY3_blanket_sfx_muted_v1') === '1'; }
  catch { return false; }
};
function audioContext() {
  if (!AC || !alive) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.67;
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
  const variant = 1 + Math.floor(Math.random() * 4);
  const v = Math.min(.75, .49 + Math.log1p(layers) * .047);
  play('land' + variant, v, .94 + Math.random() * .11);
  // Accurate stacking stays soft; a harder/misaligned impact is slightly louder.
  if (accuracy > .6 && Math.random() < .25) play('tension', .16, 1.12);
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
