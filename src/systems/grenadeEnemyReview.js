/* ARMY3 v3.21: Replay the existing seven-second enemy-location flyover.
 * No change to target coordinates, aiming selection, throw counters, damage or scores.
 * Uses the same camera introProgress already drawn by GrenadeWorld; no new camera path.
 */
(() => {
  'use strict';
  if (window.__armyGrenadeEnemyReview?.dispose) return;

  const DURATION = 7000; // matches the actual initial cinematic: clock / 7
  const TARGET = '確認敵方位置';
  const SKIP = '跳過運鏡';
  const doc = document;
  // The workshop's early-audio bootstrap can import this module in the parent page too.
  // The review control belongs ONLY to the actual 3D throwing arena.
  if (!doc.getElementById('world3d')) return;
  let playing = false;
  let startTime = 0;
  let destroyed = false;

  const button = doc.createElement('button');
  button.type = 'button';
  button.id = 'armyEnemyLocationReplay';
  button.textContent = TARGET;
  button.title = '重播開場敵軍位置運鏡，不影響本次投擲';
  button.setAttribute('aria-label', '確認敵方位置：重播開場運鏡');
  button.style.cssText = [
    'position:fixed',
    'left:max(12px,env(safe-area-inset-left))',
    'top:clamp(126px,25dvh,244px)',
    'z-index:71',
    'display:none',
    'min-height:43px',
    'padding:9px 12px',
    'max-width:calc(100vw - 24px)',
    'border:1px solid rgba(235,214,151,.82)',
    'border-radius:12px',
    'background:rgba(24,57,43,.93)',
    'color:#f9e3a0',
    'box-shadow:0 5px 16px rgba(0,20,12,.36)',
    'font:800 13px/1.25 system-ui,-apple-system,sans-serif',
    'white-space:nowrap',
    'touch-action:manipulation',
    '-webkit-user-select:none',
    'user-select:none',
    '-webkit-touch-callout:none',
    'cursor:pointer'
  ].join(';');

  // Shield the two tap-to-lock meters during the camera replay. The underlying
  // game listens on document.pointerup, so simply hiding the meters would still
  // let a tap accidentally confirm aim or throw a grenade.
  const shield = doc.createElement('div');
  shield.id = 'armyEnemyLocationReplayShield';
  shield.setAttribute('aria-hidden', 'true');
  shield.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:70', 'display:none',
    'background:transparent', 'touch-action:none',
    '-webkit-user-select:none', 'user-select:none'
  ].join(';');
  for (const event of ['pointerdown','pointermove','pointerup','pointercancel','click','touchstart','touchend']) {
    shield.addEventListener(event, e => { if (e.cancelable) e.preventDefault(); e.stopPropagation(); }, {passive:false});
  }
  doc.body.append(shield, button);

  const game = () => window.__grenadeTest;
  const isAiming = () => {
    const g = game(), state = g?.state;
    return (state === 'aimX' || state === 'aimZ') && g?.world?.modelState === 'ready';
  };

  function stop() {
    if (!playing) return;
    playing = false;
    shield.style.display = 'none';
    button.textContent = TARGET;
    button.setAttribute('aria-label', '確認敵方位置：重播開場運鏡');
    // The real initial intro is phase==='intro'. Never override that camera.
    const g = game();
    if (isAiming() && g.world.camPhase === 'intro') {
      g.world.introProgress = 1;
      g.world.camPhase = 'aim';
    }
  }

  function start() {
    if (destroyed || playing || !isAiming()) return false;
    const w = game().world;
    if (w.camPhase !== 'aim') return false;
    playing = true;
    startTime = performance.now();
    shield.style.display = 'block';
    button.textContent = SKIP;
    button.setAttribute('aria-label', '跳過敵方位置運鏡');
    w.introProgress = 0;
    w.camPhase = 'intro';
    return true;
  }

  button.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (playing) stop();
    else start();
  });

  function frame(now) {
    if (destroyed) return;
    const g = game();
    if (playing) {
      if (!isAiming() || doc.hidden || g.world.camPhase !== 'intro') {
        stop();
      } else {
        g.world.introProgress = Math.min(1, Math.max(0, (now - startTime) / DURATION));
        if (g.world.introProgress >= 1) stop();
      }
    }
    const show = playing || (isAiming() && g.world.camPhase === 'aim' && !doc.hidden);
    button.style.display = show ? 'block' : 'none';
    requestAnimationFrame(frame);
  }

  doc.addEventListener('visibilitychange', () => {if (doc.hidden) stop();});
  window.addEventListener('pagehide', () => stop());
  window.__armyGrenadeEnemyReview = {
    start, stop,
    get active() {return playing;},
    dispose() {
      if (destroyed) return;
      stop(); destroyed = true;
      button.remove(); shield.remove();
      delete window.__armyGrenadeEnemyReview;
    }
  };
  requestAnimationFrame(frame);
})();
