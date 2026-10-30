/* ARMY3 高塔狙擊 v1.31 — standalone gameplay controller; 3D renderer reuses original grenade WebGL + GLB. */
(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('shootingOverlay'),ctx=canvas.getContext('2d',{alpha:true});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));const random=(a,b)=>a+Math.random()*(b-a);
const TOWER={x:41.76,y:13.42,z:33.36};const FOV=54,ZOOM=2.4,RED=50,GREEN=150,DURATION=45,MAG=20;
const audioFiles={shot:'./assets/audio/rifle/npc_rifle_B.mp3',boom:'./assets/audio/grenade/explosion_crack_rumble.mp3',debris:'./assets/audio/grenade/debris_scatter.mp3'};
const audio=Object.fromEntries(Object.entries(audioFiles).map(([key,src])=>{const a=new Audio(src);a.preload='auto';return [key,a]}));
let muted=false;try{muted=localStorage.getItem('ARMY3_shoot_muted')==='1'}catch{}
$('muteBtn').textContent=muted?'🔇':'🔊';
function playSound(key,volume=.5){if(muted)return;const base=audio[key];if(!base)return;const instance=base.cloneNode();instance.volume=clamp(volume,0,1);instance.play().catch(()=>{});instance.addEventListener('ended',()=>{instance.src='';instance.remove()},{once:true});}
let width=1,height=1,dpr=1;function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.45);canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}window.addEventListener('resize',resize);resize();
let scene=null,buildingBoxes=[],fencePoly=[],nodes=[],nodeSet=new Map(),barrels=[],actors=[],projectiles=[],dust=[];
let ready=false,playing=false,running=false,remain=DURATION,elapsed=0,lastTime=0,ammo=MAG,loading=0,nextShot=0,recoil=0,flinch=0,breathX=0,breathY=0,zoom=false,holdFire=false;
let yaw=-2.37,pitch=-.26,shots=0,hits=0,redKills=0,friendKills=0,barrelKills=0,shotId=0,hitToastUntil=0;
const hypot=(x,z)=>Math.hypot(x,z);const fovNow=()=>2*Math.atan(Math.tan(FOV*Math.PI/360/2)/(zoom?ZOOM:1));
function proj(x,y,z){
 const dx=x-TOWER.x,dy=y-TOWER.y,dz=z-TOWER.z,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const right=dx*cy-dz*sy,forward=dx*sy+dz*cy,up=dy*cp-forward*sp,depth=dy*sp+forward*cp;
 if(depth<=.24)return null;
 const factor=height/(2*Math.tan(fovNow()/2));return {x:width/2+factor*right/depth,y:height/2-factor*up/depth,z:depth,scale:factor/depth};
}
function boxCollision(x,z,item,pad=0){
 const dx=x-item.x,dz=z-item.z,rot=(item.rot||0)*Math.PI/180,cos=Math.cos(rot),sin=Math.sin(rot);
 const localX=dx*cos-dz*sin,localZ=dx*sin+dz*cos;
 return Math.abs(localX)<(item.size?.[0]||3)*(item.scale||1)/2+pad&&Math.abs(localZ)<(item.size?.[2]||3)*(item.scale||1)/2+pad;
}
function convexHull(points){const sorted=points.slice().sort((a,b)=>a.x-b.x||a.z-b.z);const cross=(o,a,b)=>(a.x-o.x)*(b.z-o.z)-(a.z-o.z)*(b.x-o.x);const lo=[],up=[];for(const p of sorted){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(const p of sorted.reverse()){while(up.length>=2&&cross(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}return lo.slice(0,-1).concat(up.slice(0,-1));}
function insideFence(x,z){if(fencePoly.length<3)return x>-42&&x<42&&z>-24&&z<33;let result=false;for(let i=0,j=fencePoly.length-1;i<fencePoly.length;j=i++){const a=fencePoly[i],b=fencePoly[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)result=!result;}return result;}
function free(x,z,pad=.5){if(!insideFence(x,z))return false;if(hypot(x-TOWER.x,z-TOWER.z)<4.8)return false;return !buildingBoxes.some(b=>boxCollision(x,z,b,pad));}
function buildNav(){const step=2.6;let i=0;nodes=[];nodeSet.clear();for(let z=-27;z<=37;z+=step)for(let x=-49;x<=48;x+=step){if(!free(x,z,1.25))continue;nodes.push({x,z,id:i++});}nodes.forEach(n=>n.links=[]);const index=(x,z)=>nodes.reduce((best,n)=>{let d=(x-n.x)**2+(z-n.z)**2;return d<best.d?{n,d}:best;},{n:null,d:Infinity}).n;nodeSet.set('nearest',index);for(const n of nodes){for(const m of nodes){if(m===n)continue;const dx=Math.abs(n.x-m.x),dz=Math.abs(n.z-m.z);if(dx<=step*1.06&&dz<=step*1.06&&dx+dz>0.001&&free((m.x+n.x)/2,(m.z+n.z)/2,1.0))n.links.push(m.id);}}}
// 200 NPCs reuse the same running animation in the renderer. Pathfinding runs only at destination changes.
function pathfind(start,end){if(!nodes.length)return [];const nearest=nodeSet.get('nearest');const source=nearest(start.x,start.z),target=nearest(end.x,end.z);if(!source||!target)return [];if(source.id===target.id)return [{x:target.x,z:target.z}];
 const g=new Float32Array(nodes.length).fill(Infinity),previous=new Int32Array(nodes.length).fill(-1),closed=new Uint8Array(nodes.length);g[source.id]=0;const open=[{id:source.id,f:0}];let loops=0;
 while(open.length&&loops++<1500){let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;let id=open.splice(best,1)[0].id;if(closed[id])continue;if(id===target.id)break;closed[id]=1;
  for(const next of nodes[id].links){const cost=hypot(nodes[id].x-nodes[next].x,nodes[id].z-nodes[next].z);const ng=g[id]+cost;if(ng>=g[next])continue;g[next]=ng;previous[next]=id;open.push({id:next,f:ng+hypot(nodes[next].x-target.x,nodes[next].z-target.z)});}}
 if(previous[target.id]<0)return [];const path=[];let id=target.id;while(id!==source.id&&id>=0&&path.length<500){path.push({x:nodes[id].x,z:nodes[id].z});id=previous[id];}return path.reverse();}
function randomPlace(){const n=nodes[Math.random()*nodes.length|0];return n?{x:n.x+random(-.55,.55),z:n.z+random(-.55,.55)}:{x:0,z:0};}
function routeNPC(a){const dest=randomPlace();a.route=pathfind(a,dest);a.routeIndex=0;a.routeExpire=elapsed+random(4,12);if(!a.route.length)a.route=[dest];}
function createNPC(team,id){let p=randomPlace(),a={id,team,x:p.x,z:p.z,angle:0,phase:id*.79%6.28,speed:random(2.0,3.6),route:[],routeIndex:0,routeExpire:0,alive:true,lift:0,vx:0,vy:0,vz:0,fall:false};routeNPC(a);return a;}
function setHUD(){$('timeDisplay').textContent=remain.toFixed(1);$('redDisplay').textContent=redKills;$('friendDisplay').textContent=friendKills;$('ammoDisplay').textContent=loading>0?'換彈中…':`${ammo} / ${MAG}`;$('reloadBtn').disabled=loading>0||ammo>=MAG;}
function resetGame(){remain=DURATION;elapsed=0;ammo=MAG;loading=0;nextShot=0;recoil=0;flinch=0;shots=0;hits=0;redKills=0;friendKills=0;barrelKills=0;shotId=0;holdFire=false;zoom=false;yaw=-2.37;pitch=-.26;document.body.classList.remove('scopeActive');$('zoomBtn').classList.remove('active');$('zoomBtn').textContent='◎ 開鏡 2.4×';
 barrels=scene.items.filter(o=>o.assetId==='barrel').map(o=>({uid:o.uid,x:o.x,z:o.z,scale:o.scale||1,active:true}));actors=[];for(let i=0;i<RED;i++)actors.push(createNPC('red',i));for(let i=0;i<GREEN;i++)actors.push(createNPC('green',i+RED));projectiles=[];dust=[];
 window.__armyShooting3D?.reset?.();setHUD();}
function startGame(){if(!ready)return;resetGame();playing=true;lastTime=performance.now();$('startScreen').hidden=true;$('resultScreen').hidden=true;$('hud').hidden=false;requestAnimationFrame(frame);}
function endGame(){if(!playing)return;playing=false;holdFire=false;$('shootBtn').classList.remove('pressed');$('hud').hidden=true;$('resultScreen').hidden=false;
 const accuracy=shots?hits/shots:0,score=clamp(Math.round(33+redKills*2.6+accuracy*20-friendKills*5.2+Math.min(8,barrelKills*.75)),1,100);
 $('scoreDisplay').textContent=score;$('gradeDisplay').textContent=score>=90?'S 級｜神射手，班長震驚':score>=70?'A 級｜國軍精銳':score>=50?'B 級｜勉強過關':score>=30?'C 級｜差點把營區拆了':'F 級｜危險人物';
 $('resultRed').textContent=redKills;$('resultFriend').textContent=friendKills;$('resultBarrel').textContent=barrelKills;$('resultAccuracy').textContent=Math.round(accuracy*100)+'%';
 const comment=friendKills>=15?'你是在清除紅軍，還是在裁員？':friendKills>redKills?'你打得很準，只是全打到自己人。':barrelKills>=12?'這是打靶訓練，不是國軍都更工程！':redKills>=20&&friendKills<=2?'你是國軍的希望，請不要申請退伍。':accuracy<.2?'長官說你放的鞭炮很熱鬧。':'報告！這份事故紀錄我能不能不要簽名？';
 $('officerComment').textContent='「'+comment+'」';}
function toast(s){$('hitFlash').textContent=s;$('hitFlash').classList.add('visible');hitToastUntil=elapsed+1.0;}
function shootImpact(target){if(target.kind==='barrel'){hits++;explode(target.b);}else if(target.kind==='actor'){hits++;const a=target.a;knock(a,a.x,a.z,.75);toast(a.team==='red'?'🎯 紅軍擊倒 +1':'⚠️ 友軍誤傷！');}setHUD();}
function knock(a,ox,oz,power=1){if(!a.alive)return;a.alive=false;a.fall=false;const d=hypot(a.x-ox,a.z-oz)||1;a.vx=(a.x-ox)/d*random(2,6)*power;a.vz=(a.z-oz)/d*random(2,6)*power;a.vy=random(3,7)*power;a.lift=.05;
 if(a.team==='red')redKills++;else friendKills++;}
function explode(b){if(!b||!b.active)return;b.active=false;barrelKills++;playSound('boom',.55);window.__armyShooting3D?.explode?.(b.x,b.z,b.uid);toast('💥 紅色爆炸桶！');
 const radius=6.9;for(const a of actors){if(!a.alive)continue;const d=hypot(a.x-b.x,a.z-b.z);if(d<radius)knock(a,b.x,b.z,clamp(1.6-d/radius,.42,1.4));}
 for(const other of barrels){if(other===b||!other.active)continue;const d=hypot(other.x-b.x,other.z-b.z);if(d<6.2){const id=++shotId;setTimeout(()=>{if(playing&&other.active)explode(other)},170+id%5*100);}}
 dust.push({x:b.x,y:.7,z:b.z,t:0,life:1.1});setHUD();}
function barrelHit(b,aim){const center=proj(b.x,.58,b.z),bottom=proj(b.x,0,b.z),top=proj(b.x,1.08,b.z);if(!center||!bottom||!top)return null;const height=Math.abs(bottom.y-top.y),width=Math.max(6,height*.45);return (Math.abs(aim.x-center.x)<=width/2+3&&aim.y>=top.y-4&&aim.y<=bottom.y+4)?center.z:null;}
function npcHit(a,aim){const top=proj(a.x,1.80,a.z),bottom=proj(a.x,0,a.z);if(!top||!bottom)return null;const mid=proj(a.x,.9,a.z),h=Math.abs(bottom.y-top.y);const half=Math.max(3,h*.18);return Math.abs(aim.x-mid.x)<=half+3&&aim.y>=top.y-3&&aim.y<=bottom.y+3?mid.z:null;}
// Shoot only actors / barrels that the tower can actually see through the original 3D buildings.
function visibleTarget(x,y,z){
 const dx=x-TOWER.x,dy=y-TOWER.y,dz=z-TOWER.z,total=Math.hypot(dx,dz);
 const steps=Math.ceil(total/1.6);
 for(let i=2;i<steps-1;i++){
   const t=i/steps,px=TOWER.x+dx*t,py=TOWER.y+dy*t,pz=TOWER.z+dz*t;
   for(const b of buildingBoxes){if(py<=(b.size?.[1]||3)*(b.scale||1)+.18&&boxCollision(px,pz,b,.05))return false;}
 }return true;
}
function fire(){if(!playing||elapsed<nextShot||loading>0)return;if(ammo===0){reload();return;}nextShot=elapsed+.18;ammo--;shots++;recoil=Math.min(17,recoil+4.8);flinch=9;playSound('shot',.37);
 const aim={x:width*.5+breathX,y:height*.5+breathY};const picks=[];
 for(const b of barrels)if(b.active){let z=barrelHit(b,aim);if(z!=null)picks.push({kind:'barrel',b,z});}
 for(const a of actors)if(a.alive){let z=npcHit(a,aim);if(z!=null)picks.push({kind:'actor',a,z});}
 picks.sort((a,b)=>a.z-b.z);const visible=picks.find(p=>p.kind==='barrel'?visibleTarget(p.b.x,.56,p.b.z):visibleTarget(p.a.x,1.0,p.a.z));if(visible)shootImpact(visible);
 const tx=visible?.b?.x??visible?.a?.x,ty=visible?.kind==='barrel'?.65:1.1,tz=visible?.b?.z??visible?.a?.z;
 const impact=Number.isFinite(tx)?proj(tx,ty,tz):{x:aim.x,y:aim.y-40};projectiles.push({sx:width*.5+20,sy:height*.9,ex:impact?.x??aim.x,ey:impact?.y??aim.y,t:0,life:.10});setHUD();}
function reload(){if(!playing||loading>0||ammo===MAG)return;holdFire=false;loading=1.40;toast('換彈中…');setHUD();}
function step(dt){elapsed+=dt;remain=Math.max(0,DURATION-elapsed);const v=elapsed*2.2;breathX=Math.sin(v*.91)*7+Math.sin(v*1.7)*2.3;breathY=Math.cos(v)*8+Math.sin(v*.6)*4-recoil*.27;recoil=Math.max(0,recoil-dt*28);flinch=Math.max(0,flinch-dt*39);
 if(holdFire&&elapsed>=nextShot)fire();if(loading>0){loading-=dt;if(loading<=0){loading=0;ammo=MAG;toast('換彈完畢！');}}
 for(const a of actors){if(!a.alive){if(!a.fall){a.x+=a.vx*dt;a.z+=a.vz*dt;a.lift=Math.max(0,a.lift+a.vy*dt);a.vy-=15*dt;a.vx*=Math.max(0,1-dt*2);a.vz*=Math.max(0,1-dt*2);if(a.lift===0&&a.vy<=0){a.vy=0;a.fall=true;}}continue;}
  if(a.routeIndex>=a.route.length||elapsed>a.routeExpire)routeNPC(a);
  const target=a.route[a.routeIndex];if(!target)continue;const dx=target.x-a.x,dz=target.z-a.z,d=hypot(dx,dz);if(d<.34){a.routeIndex++;continue;}
  const vx=dx/d,vz=dz/d,nx=a.x+vx*a.speed*dt,nz=a.z+vz*a.speed*dt;
  if(free(nx,nz,.40)){a.x=nx;a.z=nz;a.angle=Math.atan2(vx,vz);}else{a.routeIndex=a.route.length;a.routeExpire=0;}
 }
 for(const p of projectiles)p.t+=dt;projectiles=projectiles.filter(p=>p.t<p.life);
 for(const p of dust)p.t+=dt;dust=dust.filter(p=>p.t<p.life);
 if(elapsed>hitToastUntil)$('hitFlash').classList.remove('visible');setHUD();if(remain<=0)endGame();}
function render(){ctx.clearRect(0,0,width,height);const b=breathX,cy=breathY;const cross=$('realAim');cross.style.left=`calc(50% + ${b.toFixed(1)}px)`;cross.style.top=`calc(50% + ${cy.toFixed(1)}px)`;
 // The original rifle GLB is drawn in the 3D world. Canvas is HUD-only.
 for(const p of projectiles){ctx.save();ctx.globalAlpha=1-p.t/p.life;ctx.strokeStyle='#ffe8b2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.sx,p.sy);ctx.lineTo(p.ex,p.ey);ctx.stroke();ctx.restore();}
 for(const p of dust){let s=proj(p.x,p.y,p.z);if(!s)continue;ctx.save();ctx.globalAlpha=.15*(1-p.t/p.life);ctx.fillStyle='#8f8571';ctx.beginPath();ctx.ellipse(s.x,s.y,Math.max(2,(p.t*5+1)*s.scale),Math.max(1,(p.t*1.6+1)*s.scale),0,0,Math.PI*2);ctx.fill();ctx.restore();}
 window.__armyShooting3D?.sync?.(actors,barrels,{yaw,pitch,fov:fovNow()*180/Math.PI,zoom,flinch,eye:[TOWER.x,TOWER.y,TOWER.z]});}
function frame(now){if(!playing)return;const dt=clamp((now-lastTime)/1000,0,.045);lastTime=now;step(dt);render();if(playing)requestAnimationFrame(frame);}
// Touch/desktop aiming.  HUD is non-intercepting except action buttons; the
// transparent overlay is the actual drag surface. Listen globally for moves,
// because Safari may re-target a dragging touch during a WebGL/HUD redraw.
let dragging=null,aimDragCount=0;
function aimDelta(dx,dy){if(!playing)return;
  const k=zoom?.0021:.0055;
  yaw+=dx*k;
  if(yaw>Math.PI)yaw-=Math.PI*2;else if(yaw< -Math.PI)yaw+=Math.PI*2;
  // Upward drag raises the barrel / camera, just like a normal mobile FPS.
  pitch=clamp(pitch-dy*k,-1.19,.39);
  aimDragCount++;
}
canvas.addEventListener('pointerdown',e=>{if(!playing||dragging)return;
  e.preventDefault();dragging={id:e.pointerId,x:e.clientX,y:e.clientY};
  try{canvas.setPointerCapture(e.pointerId)}catch{}
},{passive:false});
window.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragging.id||!playing)return;
  e.preventDefault();aimDelta(e.clientX-dragging.x,e.clientY-dragging.y);
  dragging.x=e.clientX;dragging.y=e.clientY;
},{passive:false});
function releaseAim(e){if(!dragging||e&&e.pointerId!=null&&e.pointerId!==dragging.id)return;dragging=null;}
for(const ev of ['pointerup','pointercancel'])window.addEventListener(ev,releaseAim);
canvas.addEventListener('lostpointercapture',releaseAim);
window.addEventListener('blur',()=>{dragging=null;});

$('shootBtn').addEventListener('pointerdown',e=>{e.preventDefault();if(!playing)return;holdFire=true;e.currentTarget.setPointerCapture(e.pointerId);$('shootBtn').classList.add('pressed');fire();});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('shootBtn').addEventListener(ev,()=>{holdFire=false;$('shootBtn').classList.remove('pressed')});
$('reloadBtn').addEventListener('click',reload);$('zoomBtn').addEventListener('click',()=>{zoom=!zoom;$('zoomBtn').classList.toggle('active',zoom);$('zoomBtn').textContent=zoom?'◎ 關鏡':'◎ 開鏡 2.4×';document.body.classList.toggle('scopeActive',zoom);});
$('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=muted?'🔇':'🔊';try{localStorage.setItem('ARMY3_shoot_muted',muted?'1':'0')}catch{}});
function back(){playing=false;holdFire=false;if(window.parent!==window){try{window.parent.postMessage({type:'ARMY3_SHOOTING_RETURN'},location.origin);return}catch{}}location.href='./index.html';}
document.querySelectorAll('.backBtn').forEach(b=>b.addEventListener('click',back));$('startBtn').addEventListener('click',startGame);$('againBtn').addEventListener('click',startGame);
window.addEventListener('keydown',e=>{if(e.code==='Space'&&playing){e.preventDefault();holdFire=true;fire();}if(e.code==='KeyR')reload();if(e.code==='KeyF')$('zoomBtn').click();});window.addEventListener('keyup',e=>{if(e.code==='Space')holdFire=false;});
window.addEventListener('blur',()=>{holdFire=false;});
async function boot(){try{const res=await fetch('./shooting-user-scene.json?v=130',{cache:'no-store'});if(!res.ok)throw Error('打靶場景 JSON HTTP '+res.status);scene=await res.json();const valid=scene?.format==='army-shooting-scene'&&Array.isArray(scene.items);if(!valid)throw Error('打靶場景 JSON 格式錯誤');const sceneBarrels=scene.items.filter(x=>x.assetId==='barrel');if(sceneBarrels.length!==42)throw Error('場景桶子數不是 42，實際 '+sceneBarrels.length);
 buildingBoxes=scene.items.filter(x=>x.category==='building');fencePoly=convexHull(scene.items.filter(x=>x.assetId==='fence').map(x=>({x:x.x,z:x.z})));
 $('loadingStatus').textContent='場景檢查完成：'+scene.items.length+' 物件／'+sceneBarrels.length+' 紅桶；建立士兵路徑…';await new Promise(resolve=>setTimeout(resolve,0));buildNav();
 if(nodes.length<30)throw Error('場景可行走區域太少：'+nodes.length);$('loadingStatus').textContent='士兵路徑已準備好，等待原版 3D 軍營載入…';
 const started=performance.now();const check=setInterval(()=>{const state=window.__armyShooting3D?.status?.();if(state?.ready){clearInterval(check);ready=true;$('loadingStatus').textContent='✅ 3D 軍營、士兵 GLB、'+sceneBarrels.length+' 紅桶與高塔已載入';$('startBtn').textContent='開始 45 秒高塔狙擊';$('startBtn').disabled=false;return;}
 if(state?.error){clearInterval(check);$('loadingStatus').textContent='❌ 軍營載入失敗：'+state.error;return;}if(performance.now()-started>90000){clearInterval(check);$('loadingStatus').textContent='載入過久，請檢查網路、模型路徑與瀏覽器 Console。';}},300);
 }catch(e){console.error('[ARMY shooting]',e);$('loadingStatus').textContent='❌ '+e.message;}}
boot();window.__armyShootingDebug={status:()=>({ready,playing,actors:actors.length,red:actors.filter(a=>a.team==='red').length,green:actors.filter(a=>a.team==='green').length,barrels:barrels.length,remain,yaw,pitch,zoom,sceneObjects:scene?.items?.length,navNodes:nodes.length,aimDrags:aimDragCount,walking:actors.filter(a=>a.alive&&a.routeIndex<a.route.length).length}),finish:endGame,fire,zoom:()=>$('zoomBtn').click(),hitBarrel:()=>explode(barrels.find(b=>b.active))};
})();
