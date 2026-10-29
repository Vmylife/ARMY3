// ARMY3: shared training/camp checkpoint, supports a warm iframe within live camp.
export const CAMP_RETURN_KEY = 'ARMY3_camp_resume_v1';
const MAX_AGE_MS=4*60*60*1000;
export function readCampSession(){
 try{const v=JSON.parse(sessionStorage.getItem(CAMP_RETURN_KEY)||'null');
  if(!v||v.version!==1||!['away','returning'].includes(v.status)||!Number.isFinite(v.savedAt)||Date.now()-v.savedAt>MAX_AGE_MS||Date.now()<v.savedAt-120000||!Number.isFinite(v.player?.x)||!Number.isFinite(v.player?.z))return null;
  return v;
 }catch{return null}
}
export function saveCampSession(snapshot,trainingId){
 if(!snapshot||!Number.isFinite(snapshot.player?.x)||!Number.isFinite(snapshot.player?.z))throw Error('無法儲存軍營的角色位置');
 const v={...snapshot,version:1,status:'away',trainingId,savedAt:Date.now()};sessionStorage.setItem(CAMP_RETURN_KEY,JSON.stringify(v));return v;
}
export function getReturningCampSession(){const v=readCampSession();return v?.status==='returning'?v:null}
export function clearCampSession(){try{sessionStorage.removeItem(CAMP_RETURN_KEY)}catch{}}
export function returnToCamp(){
 // If running inside the prewarmed overlay, return to the already-live camp.
 try{if(window.parent!==window&&window.frameElement?.dataset?.armyPrewarmedGame){
   window.parent.postMessage({type:'ARMY3_RETURN_TO_CAMP'},location.origin);
   return;
 }}catch{}
 const saved=readCampSession();if(!saved){location.replace(new URL('./index.html?v=144',location.href));return}
 saved.status='returning';try{sessionStorage.setItem(CAMP_RETURN_KEY,JSON.stringify(saved))}catch(e){console.warn('軍營回程儲存失敗',e)}
 const fallback=new URL('./index.html?armyResume=1&v=144',location.href);
 if(new URLSearchParams(location.search).has('fromCamp')&&history.length>1){
   const timer=setTimeout(()=>location.replace(fallback.href),2500);
   addEventListener('pagehide',()=>clearTimeout(timer),{once:true});history.back();
 }else location.replace(fallback.href);
}
