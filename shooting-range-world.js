/* ARMY3 Shooting v1.10 — real camp renderer bridge.
 * Loads the existing grenade WebGL environment and GLB character system in isolation.
 * Never overwrites those original files; keep the original playable 2D fallback.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const OFFSET={x:12,z:-37};
const HIDE_GLITCHES=false;
const state={ready:false,world:null,actors:[],barrels:[],view:null,last:0,loading:true,error:null};
const WORLD_SOURCE='./grenade-user-play-3d.js?v=110';
window.__armyShooting3D={
  ready:()=>state.ready,
  sync(actors,barrels,view){state.actors=actors;state.barrels=barrels;state.view=view;},
  explode(x,z){const w=state.world;if(!w||!state.ready)return;
    // Existing camp FX, impact smoke, shockwave, debris, mesh fractures.
    w.setLanding(x+OFFSET.x,z+OFFSET.z,true);w.beginTestPower(28);w.camPhase='intro';
  },
  reset(){const w=state.world;if(w&&state.ready){w.radius=-1;w.blastHistory=[];w.blastMax=0;w.timer=0;w.buildEvents({preserve:false});w.camPhase='intro';}},
  status:()=>({ready:state.ready,loading:state.loading,error:state.error}),
};
function patch(source,needle,replacement,name){
  if(!source.includes(needle))throw Error('軍營 3D 渲染介面更新，找不到 '+name);
  return source.replace(needle,replacement);
}
async function load(){
 const canvas=document.getElementById('world3d');if(!canvas)return;
 const status=document.getElementById('sceneStatus');
 try{
  const response=await fetch(WORLD_SOURCE,{cache:'default'});if(!response.ok)throw Error('軍營 3D 模組 '+response.status);
  let src=await response.text();
  // Blob module has no relative base: preserve real, same-origin module URLs.
  src=src.replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\/[^'"\n]+)\2/g,(_m,pre,q,path)=>pre+q+new URL(path,location.href).href+q);
  // This is a new FPS camera, not an approximation or a 2D redraw.
  const projection='const vp=mul(pers(54,c.width/c.height,.2,19000),lookAt(eye,tgt));';
  src=patch(src,projection,`const fps=window.__armyShootingView;
  if(fps){eye=fps.eye;tgt=fps.target;dist=30;}
  const vp=mul(pers(fps?.fov||54,c.width/c.height,.2,19000),lookAt(eye,tgt));`,'first person camera');
  src=patch(src,'for(const a of [...visibleActors,this.thrower]){',
    'for(const a of [...visibleActors,...(window.__armyShootingView?[]:[this.thrower])]){','hide player from FPS camera');
  // Group the *real* instanced green soldier GLBs by their original animation clip.
  src=patch(src,`const groups=[[actors.filter(a=>!a.hit),this.friendlyIdle]];`,
`let groups=[[actors.filter(a=>!a.hit),this.friendlyIdle]];
  if(window.__armyShootingView){
    if(!this.shootingFriendRigs){this.shootingFriendRigs=new Map();for(const key of ['run','sweep','weed','pullup','carry'])this.shootingFriendRigs.set(key,sa.makeAnim());}
    groups=[];
    for(const [key,rig] of this.shootingFriendRigs){
      const candidates={run:['Running','Walking'],sweep:['Army_Sweep','Sweeping_Both_Hands','Walking'],weed:['Weeding','Army_Weeding','Pull_Weeds','Army_Weed','push_up','Walking'],pullup:['Army_Pullup','Army_Pullup_Simple','Walking'],carry:['Walking','Running']}[key];
      const clip=candidates.find(name=>rig.hasClip(name))||'Walking';
      if(rig.clip!==clip)rig.setClip(clip);rig.evaluate(dt);
      groups.push([actors.filter(a=>!a.hit&&(a.shootingAction||'run')===key),rig]);
    }
  }`,'friendly NPC activities');
  // Allow existing barrel GLB (green) to be rendered as an actual red 3D prop,
  // both on the ground and held by a moving NPC.
  src=patch(src,'this.drawHighFriendlySoldiers(vp);this.drawCampProps(vp,dist);this.drawDetailed(vp,dist);',
    'this.drawHighFriendlySoldiers(vp);this.drawCampProps(vp,dist);this.drawDetailed(vp,dist);if(window.__armyShootingView)this.drawShootingBarrels(vp);','red barrel mesh draw');
  src=patch(src,' explodeBuilding(b){if(b.hit)return;',` drawShootingBarrels(vp){
   const prop=this.propModels?.barrel;if(!prop?.geo||!this.detailProg)return;
   const g=this.gl,p=this.detailProg,barrels=window.__armyShootingView?.barrels||[];
   const ext=prop.extents||[1,1,1],center=prop.center||[0,0,0];
   g.useProgram(p);
   g.uniformMatrix4fv(g.getUniformLocation(p,'uVP'),false,vp);
   g.uniform3f(g.getUniformLocation(p,'uTint'),1.55,.34,.28);
   g.uniform3fv(g.getUniformLocation(p,'uInnerColor'),[.53,.24,.19]);
   g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,prop.tex);
   g.uniform1i(g.getUniformLocation(p,'uTex'),0);g.bindVertexArray(prop.geo.vao);if(!prop.geo.hasCap)g.vertexAttrib1f(5,0);
   for(const b of barrels){if(!b.active)continue;
     const height=(b.carrier&&b.carrier.alive)?0.86:0;
     const x=b.x+${OFFSET.x},z=b.z+${OFFSET.z};
     const scale=mul(S3(.80/ext[0],1.05/ext[1],.81/ext[2]),T(-center[0],-center[1],-center[2]));
     const m=mul(T(x,height,z),scale);
     g.uniformMatrix4fv(g.getUniformLocation(p,'uModel'),false,m);
     g.drawElements(g.TRIANGLES,prop.geo.count,prop.geo.indexType,0);
   }
   g.bindVertexArray(null);
  }
 explodeBuilding(b){if(b.hit)return;`,'actual red barrel GLB');
  // The authoritative scene contains ~290 NPCs; render only those participating
  // in the 45-second shooting game, using shared high-quality GLB/texture.
  const blob=new Blob([src+'\n//# sourceURL=shooting-camp-runtime.js'],{type:'text/javascript'});
  const url=URL.createObjectURL(blob);
  try{await import(url);}finally{URL.revokeObjectURL(url);}
  const w=window.GrenadeWorld;if(!w)throw Error('軍營渲染器沒有建立');
  state.world=w;
  function frame(ms){
   const dt=clamp((ms-(state.last||ms))/1000,0,.06);state.last=ms;
   const {view,actors,barrels}=state;
   if(view){
     const {yaw,pitch}=view;
     const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
     const eye=[OFFSET.x,1.62,OFFSET.z],target=[eye[0]+sy*cp*18,eye[1]+sp*18,eye[2]+cy*cp*18];
     window.__armyShootingView={eye,target,barrels,fov:view.fov};
     if(w.modelState==='ready'&&!state.ready){
       // Keep original models, only narrow the render set to participants.
       state.ready=true;
       w.actors=w.actors.slice(0,0); // NPCs will be supplied by the game simulation.
       canvas.style.opacity='1';if(status)status.hidden=true;
     }
     if(state.ready){
       while(w.actors.length<actors.length){
         const index=w.actors.length;
         const dummy={uid:'shooting-'+index,px:0,pz:0,x:0,z:0,scale:1,enemy:false,hit:false,angle:0,renderLift:0,rot:0,seed:index*.137%1};
         if(w.soldierAssets?.high)dummy.anim=w.soldierAssets.high.makeAnim();
         w.actors.push(dummy);
       }
       if(w.actors.length>actors.length)w.actors.length=actors.length;
       for(let i=0;i<actors.length;i++){
         const source=actors[i],a=w.actors[i];
         a.enemy=source.team==='red';a.px=source.x+OFFSET.x;a.pz=source.z+OFFSET.z;
         a.x=a.px;a.z=a.pz;a.scale=1;a.angle=source.face<0?-Math.PI*.5:Math.PI*.5;
         a.renderLift=(source.lift||0)+(!source.alive&&source.down?.23:0);
         a.hit=!source.alive;
         if(a.hit&&!a.enemy){
           if(!w.friendlyKnockGroups)w.friendlyKnockGroups=new Map();
           if(!w.friendlyKnockGroups.has(0)){const rig=w.soldierAssets.high.makeAnim();rig.setClip('Knock_Down',{restart:true});w.friendlyKnockGroups.set(0,rig);}
           a.knockBucket=0;
         }
         a.shootingAction=source.action==='sweep'?'sweep':source.action==='weed'?'weed':source.action==='pullup'?'pullup':source.action==='carry'?'carry':'run';
         if(a.enemy&&a.anim){
           const anim=a.anim;
           const clips={run:['Running','Walking'],sweep:['Army_Sweep','Sweeping_Both_Hands'],weed:['Weeding','Army_Weeding','push_up'],pullup:['Army_Pullup','Army_Pullup_Simple'],carry:['Walking','Running']};
           const choices=a.hit?['Knock_Down','Idle_11','Idle']:clips[a.shootingAction]||clips.run;
           const clip=choices.find(n=>anim.hasClip(n))||'Walking';if(anim.clip!==clip)anim.setClip(clip);
         }
       }
       if(w.radius>=0){const finished=w.advance(dt);if(finished){w.finishBlast();w.radius=-1;}}
       // Keep the existing simulation in charge of aim and casualties, but reuse
       // original projectile/explosion rendering and broken building meshes.
       w.camPhase='intro';
       try{w.draw();}catch(err){console.error('3D shooting world draw',err)}
       if(w.modelState==='render-failed'){state.error=w.renderError||'WebGL render failed';state.ready=false;canvas.style.opacity='0';if(status){status.hidden=false;status.textContent='3D 暫時無法渲染，已切換簡化顯示';}}
     }
   }
   requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }catch(error){state.error=String(error?.message||error);console.error('ARMY3 shooting 3D bridge:',error);canvas.style.opacity='0';if(status){status.hidden=false;status.textContent='3D 資產載入失敗，已切換簡化顯示';}}
 finally{state.loading=false;}
}
load();
