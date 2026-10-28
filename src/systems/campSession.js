// ARMY3: Common handoff between the live camp and standalone training pages.
// sessionStorage is confined to this tab / installed-home-screen window.
export const CAMP_RETURN_KEY = 'ARMY3_camp_resume_v1';
const MAX_AGE_MS = 4 * 60 * 60 * 1000;

export function readCampSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(CAMP_RETURN_KEY) || 'null');
    if (!value || value.version !== 1 || !['away', 'returning'].includes(value.status) ||
        !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > MAX_AGE_MS ||
        Date.now() < value.savedAt - 120000 ||
        !Number.isFinite(value.player?.x) || !Number.isFinite(value.player?.z)) return null;
    return value;
  } catch { return null; }
}

export function saveCampSession(snapshot, trainingId) {
  if (!snapshot || !Number.isFinite(snapshot.player?.x) || !Number.isFinite(snapshot.player?.z)) {
    throw new Error('無法儲存軍營的角色位置');
  }
  const state = { ...snapshot, version: 1, status: 'away', trainingId,
    savedAt: Date.now() };
  sessionStorage.setItem(CAMP_RETURN_KEY, JSON.stringify(state));
  return state;
}

export function getReturningCampSession() {
  const state = readCampSession();
  return state?.status === 'returning' ? state : null;
}

export function clearCampSession() {
  try { sessionStorage.removeItem(CAMP_RETURN_KEY); } catch {}
}

// All minigames call the same return routine, never link straight to index.html.
export function returnToCamp() {
  const saved=readCampSession();
  if (!saved) {
    location.replace(new URL('./index.html?v=144', location.href));
    return;
  }
  saved.status='returning';
  try { sessionStorage.setItem(CAMP_RETURN_KEY, JSON.stringify(saved)); }
  catch (error) { console.warn('軍營回程進度儲存失敗', error); }
  const fallback=new URL('./index.html?armyResume=1&v=144',location.href);
  if(new URLSearchParams(location.search).has('fromCamp') && history.length > 1) {
    // Back/forward cache resumes the live camp without reinitializing models or NPCs.
    const timer=setTimeout(()=>location.replace(fallback.href),2500);
    addEventListener('pagehide',()=>clearTimeout(timer),{once:true});
    history.back();
  } else {
    location.replace(fallback.href);
  }
}
