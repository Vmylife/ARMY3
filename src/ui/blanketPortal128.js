// ARMY3 v1.94: six training portals, including singing pitch-memory challenge at the marked map coordinate.
export const BLANKET_PORTAL=Object.freeze({x:-36.37,z:1.49});
export const GRENADE_PORTAL=Object.freeze({x:-22.79,z:-27.52});
export const SHOOTING_PORTAL=Object.freeze({x:12.37,z:16.84});
export const SWIPE_PORTAL=Object.freeze({x:-21.22,z:15.77});
export const WEED_PORTAL=Object.freeze({x:-4.29,z:-6.61});
export const SINGING_PORTAL=Object.freeze({x:-20.51,z:-2.25});
const OPEN_RADIUS=3.05,RESET_RADIUS=3.65;
function makeGroundRing(renderer,position){
 const gl=renderer.gl,p=[],c=[],n=[];
 const add=(x,y,z,col)=>{p.push(x,y,z);c.push(...col);n.push(0,1,0)};
 const tri=(a,b,d,col)=>{add(...a,col);add(...b,col);add(...d,col)};
 const quad=(a,b,d,e,col)=>{tri(a,b,d,col);tri(a,d,e,col)};
 const y=.184,segments=72;
 function band(inner,outer,col){for(let i=0;i<segments;i++){
   const a=2*Math.PI*i/segments,b=2*Math.PI*(i+1)/segments;
   const at=r=>[position.x+Math.cos(a)*r,y,position.z+Math.sin(a)*r];
   const bt=r=>[position.x+Math.cos(b)*r,y,position.z+Math.sin(b)*r];
   quad(at(inner),at(outer),bt(outer),bt(inner),col);
 }}
 band(.72,.99,[.40,.32,.075]);band(.76,.95,[1,.82,.07]);band(.80,.85,[1,.97,.44]);
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 for(const [i,data] of [[0,p],[1,c],[2,n]]){
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,0,0);
 }
 gl.bindVertexArray(null);
 return ()=>{gl.useProgram(renderer.pFlat);gl.uniformMatrix4fv(renderer.flatVP,false,renderer.vp);
   gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLES,0,p.length/3);gl.bindVertexArray(null)};
}
function createPortalMenu({position,kind,panelId,startId,cancelId,destination,onStart,initialDismissed=false,isAlerted=()=>false}){
 const panel=document.getElementById(panelId),start=document.getElementById(startId),cancel=document.getElementById(cancelId);
 if(!panel||!start||!cancel)throw new Error('Missing portal menu: '+panelId);
 let dismissed=initialDismissed,wasNear=false;
 cancel.addEventListener('click',()=>{dismissed=true;panel.hidden=true});
 start.addEventListener('click',()=>{
  if(isAlerted()){panel.hidden=true;return}
  try{onStart?.()}catch(error){console.error('軍營進度儲存失敗',error);alert('目前無法保存軍營位置，請重試。');return}
  dismissed=true;panel.hidden=true;
  // Re-use the exact iframe whose models were preinitialized while walking.
  if(window.armyGameWarmup?.enter(kind))return;
  const url=new URL(destination,location.href);url.searchParams.set('fromCamp','1');location.assign(url.href);
 });
 return {update(playerPos,blocked=false){
   const distance=Math.hypot(playerPos.x-position.x,playerPos.z-position.z);
   if(!blocked&&!isAlerted())window.armyGameWarmup?.approach(kind,distance);
   if(isAlerted()){panel.hidden=true;return}
   if(distance>RESET_RADIUS){dismissed=false;wasNear=false;panel.hidden=true;return}
   const near=distance<=OPEN_RADIUS||(wasNear&&distance<=RESET_RADIUS);
   if(!near){panel.hidden=true;return}
   // Entering the yellow circle never opens the menu on its own.
   // Only a press on the dedicated interaction button may reveal it.
   wasNear=true;
   if(blocked)panel.hidden=true;
  },
  interact(playerPos,blocked=false){
   if(blocked||isAlerted())return false;
   const distance=Math.hypot(playerPos.x-position.x,playerPos.z-position.z);
   if(distance>OPEN_RADIUS)return false;
   dismissed=false;wasNear=true;panel.hidden=false;
   return true;
  },
  hide(){panel.hidden=true}
 };
}
export function createBlanketPortal(renderer,{onTrainingStart=()=>{},resuming=false,isAlerted=()=>false}={}){
 const blanketDraw=makeGroundRing(renderer,BLANKET_PORTAL),
  grenadeDraw=makeGroundRing(renderer,GRENADE_PORTAL),
  shootingDraw=makeGroundRing(renderer,SHOOTING_PORTAL),
  swipeDraw=makeGroundRing(renderer,SWIPE_PORTAL),
  weedDraw=makeGroundRing(renderer,WEED_PORTAL),
  singingDraw=makeGroundRing(renderer,SINGING_PORTAL);
 const blanket=createPortalMenu({position:BLANKET_PORTAL,kind:'blanket',panelId:'blanketPortalMenu',startId:'blanketPortalStart',cancelId:'blanketPortalCancel',destination:'./blanket-stack.html?v=194',onStart:()=>onTrainingStart('blanket'),initialDismissed:resuming,isAlerted});
 const grenade=createPortalMenu({position:GRENADE_PORTAL,kind:'grenade',panelId:'grenadePortalMenu',startId:'grenadePortalStart',cancelId:'grenadePortalCancel',destination:'./grenade-workshop-test.html?v=194',onStart:()=>onTrainingStart('grenade'),initialDismissed:resuming,isAlerted});
 const shooting=createPortalMenu({position:SHOOTING_PORTAL,kind:'shooting',panelId:'shootingPortalMenu',startId:'shootingPortalStart',cancelId:'shootingPortalCancel',destination:'./shooting-paper-range.html?v=195',onStart:()=>onTrainingStart('shooting'),initialDismissed:resuming,isAlerted});
 const swipe=createPortalMenu({position:SWIPE_PORTAL,kind:'swipe',panelId:'swipePortalMenu',startId:'swipePortalStart',cancelId:'swipePortalCancel',
  destination:'/Don-t-like-your-mom/army-test/index.html?v=6',onStart:()=>onTrainingStart('swipe'),initialDismissed:resuming,isAlerted});
 const weed=createPortalMenu({position:WEED_PORTAL,kind:'weed',panelId:'weedPortalMenu',startId:'weedPortalStart',cancelId:'weedPortalCancel',
  destination:'./weed-pulling.html?v=196',onStart:()=>onTrainingStart('weed'),initialDismissed:resuming,isAlerted});
 const singing=createPortalMenu({position:SINGING_PORTAL,kind:'singing',panelId:'singingPortalMenu',startId:'singingPortalStart',cancelId:'singingPortalCancel',
  destination:'./singing-memory-test.html?v=16',onStart:()=>onTrainingStart('singing'),initialDismissed:resuming,isAlerted});
 const portals=[
  {position:BLANKET_PORTAL,menu:blanket},
  {position:GRENADE_PORTAL,menu:grenade},
  {position:SHOOTING_PORTAL,menu:shooting},
  {position:SWIPE_PORTAL,menu:swipe},
  {position:WEED_PORTAL,menu:weed},
  {position:SINGING_PORTAL,menu:singing}
 ];
 return {
  draw(){blanketDraw();grenadeDraw();shootingDraw();swipeDraw();weedDraw();singingDraw()},
  update(playerPos,blocked=false){
   for(const portal of portals)portal.menu.update(playerPos,blocked||isAlerted());
  },
  interact(playerPos,blocked=false){
   if(blocked||isAlerted())return false;
   const ordered=[...portals].sort((a,b)=>
    Math.hypot(playerPos.x-a.position.x,playerPos.z-a.position.z)-
    Math.hypot(playerPos.x-b.position.x,playerPos.z-b.position.z));
   const selected=ordered[0];
   if(!selected||Math.hypot(playerPos.x-selected.position.x,playerPos.z-selected.position.z)>OPEN_RADIUS)return false;
   for(const portal of portals)if(portal!==selected)portal.menu.hide();
   return selected.menu.interact(playerPos,false);
  }
 };
}
