// Quiet homepage preloader. No simulation, game saves, controls or GPU work.
import {primeGlb} from '../core/glb111.js?v=112';
import {BUILDING_MODELS} from '../buildings/buildingRenderer.js?v=112';
import {PROP_MODELS} from '../props/propRenderer.js?v=120';

const HERO='./assets/characters/cadet/cadet-green.glb?v=120';
const NPC='./assets/characters/cadet/cadet-life-lite.glb?v=119';
const RIFLE='./assets/weapons/rifle.glb?v=111';
const resources=[RIFLE,...BUILDING_MODELS.map(m=>m.url),...PROP_MODELS.map(m=>m.url)];
const idle=()=>new Promise(resolve=>{
 if('requestIdleCallback' in window)requestIdleCallback(resolve,{timeout:650});
 else setTimeout(resolve,120);
});

export function startCampPreload(){
 let stopped=false,next=0;
 const network=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const limited=!!network?.saveData||/^(slow-2g|2g)$/.test(network?.effectiveType||'');
 async function worker(){
  while(!stopped&&next<resources.length){
   await idle();
   if(stopped)return;
   if(document.hidden)continue;
   const url=resources[next++];
   try{
    const response=await fetch(url,{cache:'default',priority:'low'});
    if(response.ok)await response.arrayBuffer();
   }catch{
    // Best-effort fetch; gameplay uses its original normal loader on failure.
   }
  }
 }
 if(!limited){
  // Decode the two essential actors FIRST and share them with the real game.
  // Only then cache the rest, at two low-priority requests at a time.
  void Promise.allSettled([primeGlb(HERO),primeGlb(NPC)]).then(()=>{
   if(!stopped){void worker();void worker()}
  });
 }
 return ()=>{stopped=true};
}
