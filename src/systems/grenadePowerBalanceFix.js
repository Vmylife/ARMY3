/* ARMY3 v3.24 - Remove the old hidden 60-point / press-count hard caps from
 * the grenade workshop -> 3D arena handoff. Uses the real percent metrics in
 * the workshop's existing craft payload; no game physics or score is altered.
 * Runs before the arena's message handler, allowing the original UI to read
 * the corrected value, including on an embedded / prewarmed arena.
 */
(()=>{'use strict';
 if(window.__armyGrenadePowerFix324)return;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 function compute(craft){
   if(!craft||craft.source!=='workshop'||craft.version!==1)return null;
   const keys=['fill','press','shape'];
   if(!keys.every(k=>Number.isFinite(Number(craft[k]))))return null;
   const fill=clamp(Number(craft.fill)/100,0,1);
   const press=clamp(Number(craft.press)/100,0,1);
   const shape=clamp(Number(craft.shape)/100,0,1);
   // Percent 'press' already includes loss of shell health in the workshop.
   // No secret fixed 60 cap or count-of-presses cap. Still rewards deliberate
   // filling, high-quality compression and careful shaping.
   const quality=(.60+.40*press)*(.82+.18*shape);
   return clamp(Math.round(10+90*Math.pow(fill,1.25)*quality),10,100);
 }
 function onMessage(event){
   if(event?.data?.type!=='ARMY_GRENADE_START')return;
   const craft=event.data.craft;
   const corrected=compute(craft);
   if(corrected===null)return;
   // Mutate the received message's clone BEFORE the unmodified 3D game
   // handler applies it. Do not modify the sender's in-memory state.
   craft.power=corrected;
   try{
     const raw=sessionStorage.getItem('ARMY2_grenade_craft_v1');
     if(raw){const saved=JSON.parse(raw);if(saved?.source==='workshop'&&saved.createdAt===craft.createdAt){saved.power=corrected;sessionStorage.setItem('ARMY2_grenade_craft_v1',JSON.stringify(saved));}}
   }catch{}
 }
 window.addEventListener('message',onMessage,true);
 window.__armyGrenadePowerFix324={compute,dispose(){window.removeEventListener('message',onMessage,true);delete window.__armyGrenadePowerFix324;}};
})();
