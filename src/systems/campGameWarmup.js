import './shootingRangeLauncher.js?v=100';
/* ARMY3 v1.95 - near-portal-only network prefetch and single GPU-warmed mini-game.
 * Do not download dozens of unrelated audio files during ordinary camp travel.
 */
import {clearCampSession} from './campSession.js?v=144';
const ROOT = new URL('../../', import.meta.url);
const urls = {
 blanket:'blanket-stack.html?v=192',
 grenade:'grenade-workshop-test.html?v=192',
 shooting:'shooting-paper-range.html?v=192',
 swipe:'/Don-t-like-your-mom/army-test/index.html?v=4',
 weed:'weed-pulling.html?v=194',
 singing:'singing-memory-test.html?v=13'
};
const nearbyAssets={
 blanket:[
  urls.blanket,'blanket-stack.js?v=153','blanket-stack-scene.json?v=153',
  'assets/audio/minigames/blanket-parade-loop.mp3','src/systems/blanketSfx.js?v=170'
 ],
 grenade:[
  urls.grenade,'grenade-user-play.html?embedded=1&v=192',
  'grenade-user-scene.json?v=130','grenade-user-play-3d.js?v=138',
  'src/systems/grenadeEarlyAudio.js?v=190'
 ],
 shooting:[
  urls.shooting,'shooting-paper.css?v=153','shooting-paper.js?v=154',
  'shooting-paper-report.js?v=153','shooting-paper-world.js?v=149'
 ],
 swipe:[
  urls.swipe,'/Don-t-like-your-mom/army-test/game.js?v=3',
  '/Don-t-like-your-mom/army-test/army.css?v=4'
 ],
 weed:[urls.weed],
 singing:[
  urls.singing,'singing-memory-test.css?v=13','singing-memory-test.js?v=13',
  'singing-settlement.js?v=12','singing-samples/junji-backing-from-start-v10.mp3'
 ]
};
const status = {blanket:{},grenade:{},shooting:{},swipe:{},weed:{},singing:{}};
let enabled=false, active=null, warming=null, prefetching=false;
const seen = new Set();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const isIdle=()=>document.body.classList.contains('army-ready')&&!document.hidden&&!active;
const idle=()=>new Promise(resolve=>{if('requestIdleCallback'in window)requestIdleCallback(resolve,{timeout:1000});else setTimeout(resolve,120)});
async function fetchCached(path){
 const url=new URL(path,ROOT);
 if(seen.has(url.href))return;
 seen.add(url.href);
 try{
  const res=await fetch(url,{cache:'force-cache'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  // Read the whole body so the HTTP cache stores it, but do not retain binary buffers.
  await res.arrayBuffer();
 }catch(err){seen.delete(url.href);console.debug('[營區預載]略過',path,err?.message||err)}
}
// Only prefetch the CLOSEST relevant game, once the player approaches its portal.
const NEAR_PREFETCH_DISTANCE=24;
let suggestion=null,prefetchTimer=null;
function scheduleNearby(kind,distance){
 if(distance>NEAR_PREFETCH_DISTANCE||!isIdle())return;
 const now=performance.now();
 if(!suggestion||now-suggestion.at>900||distance<suggestion.distance-1.5){
  suggestion={kind,distance,at:now};
 }
 if(prefetchTimer||prefetching)return;
 prefetchTimer=setTimeout(()=>{
  prefetchTimer=null;
  if(!suggestion||!isIdle()||window.armyAssetNetBusy||window.armyAssetUploadBusy)return;
  prefetch(suggestion.kind);
 },450);
}
async function prefetch(kind){
 if(prefetching||!isIdle()||window.armyAssetNetBusy||window.armyAssetUploadBusy)return;
 if(navigator.connection?.saveData||/2g/.test(navigator.connection?.effectiveType||''))return;
 prefetching=true;
 try{
  await idle();
  for(const path of nearbyAssets[kind]||[]){
   if(!isIdle()||window.armyAssetNetBusy||window.armyAssetUploadBusy)break;
   if(suggestion&&suggestion.kind!==kind&&suggestion.distance<NEAR_PREFETCH_DISTANCE)break;
   await fetchCached(path);
   await idle();
  }
 }finally{
  prefetching=false;
 }
}
function discard(kind){
 const s=status[kind];if(!s?.frame)return;
 s.frame.remove();s.frame=null;s.loaded=false;s.ready=false;
 if(warming===kind)warming=null;
}
function readyFrame(kind){
 const s=status[kind],frame=s.frame;
 if(!frame||!s.loaded)return false;
 try{
  const w=frame.contentWindow;
  if(kind==='blanket')return !!w.__blanketTest&&w.__blanketTest.state==='intro';
  if(kind==='shooting')return !!w.__armyPaperTest?.status?.().ready;
  if(kind==='swipe')return !!w.armySwipeTest&&!!w.armySwipeReport&&!!w.document.getElementById('armyCampExit');
  if(kind==='weed')return !!w.document.getElementById('welcome')&&!!w.document.getElementById('armyQuickExit');
  if(kind==='singing')return w.armySingingTest?.status?.mode==='ready'&&!!w.document.getElementById('armyQuickExit');
  const nested=w.document.getElementById('grenadeArenaFrame');
  return !!nested?.contentWindow?.__grenadeTest?.world&&nested.contentWindow.__grenadeTest.world.modelState==='ready';
 }catch{return false}
}
function warm(kind,{force=false}={}){
 if(!isIdle()||!urls[kind]||(!force&&window.armyAssetUploadBusy))return;
 if(warming&&warming!==kind)discard(warming);
 if(status[kind].frame)return;
 const frame=document.createElement('iframe');
 frame.dataset.armyPrewarmedGame=kind;
 frame.id='armyWarmGameFrame';
 frame.title=kind==='blanket'?'棉被疊疊樂預先載入':kind==='grenade'?'手榴彈遊戲預先載入':kind==='shooting'?'實彈射擊預先載入':kind==='weed'?'拔草鑑測預先載入':kind==='singing'?'軍歌鑑測預先載入':'中山室滑手機預先載入';
 frame.setAttribute('loading','eager');
 frame.setAttribute('aria-hidden','true');
 frame.setAttribute('allow','autoplay');
 frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:90;opacity:0;visibility:hidden;pointer-events:none;background:#13251c;';
 const s=status[kind];s.frame=frame;s.loaded=false;s.ready=false;warming=kind;
 frame.addEventListener('load',()=>{
  if(s.frame!==frame)return;
  s.loaded=true;
  if(kind==='grenade'){
   try{
    // Workshop has the ability to preload its nested 3D scene without starting the challenge.
    const w=frame.contentWindow;
    // The workshop previously waited for its 3D sub-frame before loading any audio.
    // Boot the original workshop SFX and BGM here, while the player is still walking.
    const script=w.document.createElement('script');script.type='module';
    script.src=new URL('src/systems/grenadeEarlyAudio.js?v=190',ROOT).href;
    w.document.head.append(script);
    // The workshop wraps warmThrowingGame in a private closure. Its own start
    // button is the supported way to start the nested arena warm-up. Restore
    // the intro overlay so the player still makes the real start gesture.
    const start=w.document.getElementById('startBtn');
    if(start){start.click();const intro=w.document.getElementById('intro');if(intro)intro.style.display='';}
   }catch(e){console.debug('手榴彈預建投擲場',e)}
  }
 },{once:true});
 frame.addEventListener('error',()=>{if(s.frame===frame)discard(kind)},{once:true});
 frame.addEventListener('load',()=>{
  // An older cached return handler may navigate only the iframe. Recover safely.
  try{if(s.frame===frame&&active===kind&&/\/index\.html$/.test(frame.contentWindow.location.pathname))exit()}catch{}
 });
 const target=new URL(urls[kind],ROOT);
 target.searchParams.set('fromCamp','1');
 target.searchParams.set('armyPrewarmed','1');
 frame.src=target.href;
 document.body.appendChild(frame);
}
const lastApproach={blanket:0,grenade:0,shooting:0,swipe:0,weed:0,singing:0};
let rewarmAfter=0;
function approach(kind,distance){
 if(!enabled||active||!isIdle())return;
 const now=performance.now();
 if(now<rewarmAfter)return;
 if(now-(lastApproach[kind]||0)<380)return;lastApproach[kind]=now;
 scheduleNearby(kind,distance);
 if(distance<=11){
   if(!status[kind]?.frame)warm(kind);
   else status[kind].ready=readyFrame(kind);
 }else if(distance>23&&warming===kind){discard(kind)}
}
function enter(kind){
 const s=status[kind];if(!s||active)return false;
 // Even when the frame is still warming, display its real loading UI. No duplicate page navigation.
 if(!s.frame)warm(kind,{force:true});
 if(!s.frame)return false;
 active=kind;
 document.body.classList.add('army-in-minigame');
 window.armyMinigameActive=true;
 s.frame.style.visibility='visible';s.frame.style.opacity='1';s.frame.style.pointerEvents='auto';
 s.frame.setAttribute('aria-hidden','false');
 s.frame.contentWindow?.focus?.();
 return true;
}
function exit(){
 if(!active)return;
 const kind=active;active=null;rewarmAfter=performance.now()+3500;
 document.body.classList.remove('army-in-minigame');
 window.armyMinigameActive=false;
 clearCampSession();
 discard(kind);
 // No global prefetch after exit: next approach decides which game needs files.
}
window.addEventListener('message',event=>{
 if(!active||event.origin!==location.origin)return;
 const s=status[active];if(!s?.frame||event.source!==s.frame.contentWindow)return;
 if(event.data?.type==='ARMY3_RETURN_TO_CAMP')exit();
});
const observer=new MutationObserver(()=>{
 if(document.body.classList.contains('army-ready')){enabled=true;observer.disconnect();}
});
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
if(document.body.classList.contains('army-ready'))enabled=true;
window.addEventListener('pageshow',()=>{if(isIdle()&&suggestion)scheduleNearby(suggestion.kind,suggestion.distance)});
window.armyGameWarmup={approach,enter,exit,getState:(kind)=>({loaded:!!status[kind]?.loaded,ready:!!status[kind]?.ready,prefetching,suggestion:suggestion?.kind||null})};
