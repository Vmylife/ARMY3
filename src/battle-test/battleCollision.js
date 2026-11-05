// ARMY3 isolated final battle: solid cover for movement/melee, bullets pass
// ABOVE sandbags, hurdles and wooden crates. Never alter normal camp physics.
import {
 canOccupy as sharedCanOccupy,
 movePlayer as sharedMovePlayer,
 moveNpc as sharedMoveNpc,
 staticClearance
} from '../map/navCollision109.js?v=125';
import {insidePerimeter} from '../map/camp.js?v=093';
const SOLID={solidHurdles:true},SHOTS={ignoreLowCover:true};
export const canOccupy=(p,r)=>sharedCanOccupy(p,r,SOLID);
export const movePlayer=(p,dx,dz,npcs)=>sharedMovePlayer(p,dx,dz,npcs,SOLID);
export const moveNpc=(n,dx,dz,npcs,player)=>sharedMoveNpc(n,dx,dz,npcs,player,SOLID);
export const bulletClearance=p=>staticClearance(p,SHOTS);
function clearRay(a,b,padding,physics){
 const length=Math.hypot(a.x-b.x,a.z-b.z);
 if(length<.05)return true;
 const steps=Math.ceil(length/.12);
 for(let i=1;i<steps;i++){
  const t=i/steps,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
  if(!insidePerimeter(p)||staticClearance(p,physics)<=padding)return false;
 }
 return true;
}
export const bulletLineClear=(a,b,padding=.11)=>clearRay(a,b,padding,SHOTS);
export const meleeLineClear=(a,b,padding=.11)=>clearRay(a,b,padding,SOLID);
