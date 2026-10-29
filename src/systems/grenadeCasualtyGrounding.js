/* ARMY3 v3.23 — Correct the rendering floor height of defeated actors.
   Only compensates the rendered model while grounded; NEVER changes physical
   blast velocity, casualties, score, positions, or the original Knock_Down clip.
   Applies to the same drawLand path that renders instanced friendly soldiers. */
(()=>{
 'use strict';
 if(window.__armyGrenadeGrounded323)return;
 // The workshop document also imports the arena audio, but only the nested 3D
 // arena has a live GrenadeWorld with actor meshes.
 const world=window.GrenadeWorld;
 if(!world||typeof world.drawLand!=='function')return;
 const original=world.drawLand;
 const correction=actor=>{
   if(!actor?.hit || !Number.isFinite(actor.flyT))return 0;
   // No additional lift in flight; only adjust the final prone pose.  The
   // Knock_Down rig has feet-based ground origin, not a prone contact origin.
   const lift=Number(actor.renderLift)||0;
   if(lift>.12 || (Number(actor.vy)||0)>0.02 || actor.flyT<0.5)return 0;
   const settled=Math.min(1,Math.max(0,(actor.flyT-.5)/.32));
   const clearance=actor.enemy?.41:.47;
   // Allow a tiny amount of easing as the character comes to rest.
   return clearance*settled;
 };
 world.drawLand=function(...args){
   const lifted=[];
   try{
     if(this.modelState==='ready'&&Array.isArray(this.actors)){
       for(const actor of this.actors){
         const dy=correction(actor);
         if(dy){actor.renderLift=(actor.renderLift||0)+dy;lifted.push([actor,dy]);}
       }
     }
     return original.apply(this,args);
   }finally{
     // The physics loop must continue from its real height, not the visual
     // adjustment, preventing permanent levitation or oscillating bounces.
     for(const [actor,dy] of lifted)actor.renderLift-=dy;
   }
 };
 window.__armyGrenadeGrounded323={world,restore(){world.drawLand=original;delete window.__armyGrenadeGrounded323}};
})();
