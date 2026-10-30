/* ARMY3 · 報告長官！我的子彈有上靶嗎？ — standalone target-paper shooting v1.42 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('shootingOverlay'),ctx=canvas.getContext('2d',{alpha:true}),min=Math.min,max=Math.max,clamp=(x,a,b)=>max(a,min(b,x));
const FIELD={x:12.272136337858274,z:.6765632048809667,y:1.58};
// Fit completely within target.glb's ~1.15 m by 1.48 m physical extent.
const PAPER={x:12.3,z:21.68,y:.97,w:.98,h:1.02};
const FOV=54,ZOOM=2.4,MAX_ROUNDS=20,MAX_TIME=45,FIRE_DELAY=.22;
const backZ=22.15;
let width=1,height=1,dpr=1,ready=false,state='loading',zoom=false,rounds=MAX_ROUNDS,shots=0,hits=[],elapsed=0,remain=MAX_TIME,nextShot=0,holdFire=false,lastFrame=0,recoil=0,flinch=0,breathX=0,breathY=0;
let yaw=Math.atan2(PAPER.x-FIELD.x,PAPER.z-FIELD.z),pitch=Math.atan2(PAPER.y-FIELD.y,PAPER.z-FIELD.z);
let bullets=[],reviewElapsed=0,reviewOrigin=null,dragging=null,shotTick=0;
// Breath is deliberately a damped random walk, NOT several repeating sine waves.
// The user controls only the amplitude; the motion style does not affect scoring rules.
let breathLevel=30;
try { const stored=Number(localStorage.getItem('ARMY3_paper_breath_level_v1')); if(Number.isFinite(stored))breathLevel=clamp(stored,0,100); }catch{}
const sway={x:0,y:0,vx:0,vy:0,gx:0,gy:0,remaining:0,rate:4.2,seed:0x52A7D3E9};
function randomBreath(){let x=sway.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;sway.seed=x;return (x>>>0)/4294967296;}
function randomSigned(){return randomBreath()*2-1;}
function updateBreathing(dt){
  // Zero really means NO respiratory sway; recoil is a separate gun effect.
  if(breathLevel===0){breathX=breathY=0;return;}
  sway.remaining-=dt;
  if(sway.remaining<=0){
    const burst=randomBreath()<.19,linger=randomBreath()<.12;
    // Some quick, sharp corrections, some quiet holds, with no fixed period.
    sway.remaining=linger?.85+randomBreath()*1.5:burst?.07+randomBreath()*.27:.22+randomBreath()*1.0;
    sway.rate=burst?7+randomBreath()*4:2.4+randomBreath()*4.3;
    const bias=burst?1.6:.85;
    sway.gx=clamp(sway.x*.22+randomSigned()*bias,-1.7,1.7);
    sway.gy=clamp(sway.y*.16+randomSigned()*bias,-1.7,1.7);
  }
  // Critically damped spring avoids noisy per-frame trembling and keeps motion irregular.
  const omega=sway.rate,damping=2*omega;
  sway.vx+=(omega*omega*(sway.gx-sway.x)-damping*sway.vx)*dt;
  sway.vy+=(omega*omega*(sway.gy-sway.y)-damping*sway.vy)*dt;
  sway.x=clamp(sway.x+sway.vx*dt,-1.85,1.85);
  sway.y=clamp(sway.y+sway.vy*dt,-1.85,1.85);
  const strength=Math.pow(breathLevel/100,2.05),base=Math.min(width,500);
  breathX=sway.x*base*.42*strength;
  breathY=sway.y*base*.50*strength;
}
function setBreathLevel(value){
  breathLevel=clamp(Math.round(Number(value)||0),0,100);
  $('breathSlider').value=String(breathLevel);
  const description=breathLevel===0?'完全不呼吸':breathLevel<22?'幾乎不晃':breathLevel<48?'輕度晃動':breathLevel<77?'劇烈亂晃':'極限亂晃';
  $('breathValue').textContent=`${breathLevel}% · ${description}`;
  if(breathLevel===0)breathX=breathY=0;
  try{localStorage.setItem('ARMY3_paper_breath_level_v1',String(breathLevel));}catch{}
}
function resetSway(){Object.assign(sway,{x:0,y:0,vx:0,vy:0,gx:0,gy:0,remaining:0,rate:4.2});breathX=breathY=0;}
let muted=false;try{muted=localStorage.getItem('ARMY3_shoot_muted')==='1'}catch{}
$('muteBtn').textContent=muted?'🔇':'🔊';
const audio=new Audio('./assets/audio/rifle/npc_rifle_B.mp3');audio.preload='auto';
function sfx(){if(muted)return;const a=audio.cloneNode();a.volume=.4;a.play().catch(()=>{});a.addEventListener('ended',()=>{a.remove();a.src=''}, {once:true});}
function resize(){width=innerWidth;height=innerHeight;dpr=min(devicePixelRatio||1,1.4);canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();
const focal=()=>height/(2*Math.tan(fovNow()/2));
const fovNow=()=>2*Math.atan(Math.tan(FOV*Math.PI/360/2)/(zoom?ZOOM:1));
// Match the ORIGINAL ARMY3 WebGL lookAt() camera basis exactly. Its horizontal
// camera-right vector is cross(forward, worldUp), i.e. negative world X at yaw=0.
function cameraBasis(){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);return {forward:[sy*cp,sp,cy*cp],right:[-cy,0,sy],up:[-sy*sp,cp,-cy*sp]}}
function project(x,y,z){const dx=x-FIELD.x,dy=y-FIELD.y,dz=z-FIELD.z,{forward,right,up}=cameraBasis();
  const depth=dx*forward[0]+dy*forward[1]+dz*forward[2];if(depth<=.12)return null;
  const sx=dx*right[0]+dy*right[1]+dz*right[2],sy=dx*up[0]+dy*up[1]+dz*up[2],f=focal();
  return {x:width/2+f*sx/depth,y:height/2-f*sy/depth,depth};
}
// The physical front-post peak is local (0,-8), NOT the centre of the viewport.
// Use this SAME exact transformed point for visuals, bullet ray and tracer.
function sightPose(){
 const x=width*.5+breathX,y=height*.5+breathY-recoil*.28;
 const scale=clamp(min(width/390,height/690),.67,1.34)*(zoom?1.06:1);
 const tilt=(sway.x*.012+sway.y*.007)*Math.pow(breathLevel/100,1.2)+flinch*.0016;
 return {x,y,scale,tilt};
}
function sightTip(){const p=sightPose(),postTopY=-8;
 return {x:p.x-postTopY*p.scale*Math.sin(p.tilt),y:p.y+postTopY*p.scale*Math.cos(p.tilt)};
}
function hitFromSight(tip=sightTip()){const f=focal(),nx=(tip.x-width*.5)/f,ny=-(tip.y-height*.5)/f,{forward,right,up}=cameraBasis();
  const direction=forward.map((v,i)=>v+right[i]*nx+up[i]*ny),t=(PAPER.z-FIELD.z)/direction[2];
  if(t<=0||!Number.isFinite(t))return null;
  const x=FIELD.x+direction[0]*t,y=FIELD.y+direction[1]*t;
  if(Math.abs(x-PAPER.x)>PAPER.w/2||Math.abs(y-PAPER.y)>PAPER.h/2)return null;
  return {x:.5-(x-PAPER.x)/PAPER.w,y:.5-(y-PAPER.y)/PAPER.h};
}
const basePaper=document.createElement('canvas');basePaper.width=600;basePaper.height=760;
const pctx=basePaper.getContext('2d');
let cachedPaper=null,cachedPaperKey='';
function paperImage(){const key=shots+':'+hits.length; if(cachedPaperKey===key&&cachedPaper)return cachedPaper;
 const c=document.createElement('canvas');c.width=600;c.height=760;const q=c.getContext('2d');
 q.fillStyle='#f8f4e8';q.fillRect(0,0,600,760);q.fillStyle='#ded5bd';q.fillRect(14,14,572,732);q.fillStyle='#fbf8ed';q.fillRect(18,18,564,724);
 q.lineWidth=3;q.strokeStyle='#6d6860';q.strokeRect(18,18,564,724);q.fillStyle='#4a4942';q.font='bold 23px system-ui';q.textAlign='center';q.fillText('國軍射擊鑑測紀錄紙',300,65);
 q.font='17px system-ui';q.fillText('射手專用｜每個彈孔都是證據',300,95);
 const x=300,y=380,R=248;
 q.fillStyle='#f1ead2';q.beginPath();q.arc(x,y,R+13,0,Math.PI*2);q.fill();
 for(let i=1;i<=9;i++){let rad=R*(10-i)/9;q.beginPath();q.arc(x,y,rad,0,Math.PI*2);q.fillStyle=i>=7?'#181a19':i>=4?'#d9d6ca':'#eae5d8';q.fill();q.strokeStyle=i>=7?'#edebdd':'#403e39';q.lineWidth=2.2;q.stroke()}
 q.beginPath();q.arc(x,y,8,0,Math.PI*2);q.fillStyle='#bf563b';q.fill();
 // Rings, score labels, and minor quadrants.
 for(let i=1;i<=9;i++){const r=R*(10-i)/9;q.fillStyle=i>=7?'#f9f7ed':'#383830';q.font='bold 14px system-ui';q.fillText(String(i+1),x,y-r+18)}
 q.textAlign='left';q.font='16px system-ui';q.fillStyle='#44413d';q.fillText('全靶 '+shots+' 發｜上靶 '+hits.length+' 發',32,706);
 // Each actual landed round is plotted on the paper itself, in firing order.
 hits.forEach((h,i)=>{const px=h.x*600,py=h.y*760;q.beginPath();q.arc(px,py,8.0,0,Math.PI*2);q.fillStyle='#121614';q.fill();q.strokeStyle='#f5e0b0';q.lineWidth=2;q.stroke();
  q.font='bold 13px system-ui';q.textAlign='left';q.fillStyle='#a12522';q.fillText(String(h.shot),px+10,py-9);
 });
 cachedPaper=c;cachedPaperKey=key;return c;
}
// Only used for the final paper-collection animation. The live target paper
// is a real 3D world-space quad rendered with the SAME view-projection matrix
// and depth buffer as the target GLB, so it cannot slide independently.
function paperCorners(){const l=PAPER.x+PAPER.w/2,r=PAPER.x-PAPER.w/2,t=PAPER.y+PAPER.h/2,b=PAPER.y-PAPER.h/2;
 return [project(l,t,PAPER.z),project(r,t,PAPER.z),project(l,b,PAPER.z)];}
function getPaperRect(){const [tl,tr,bl]=paperCorners();if(!tl||!tr||!bl)return null;
 const w=Math.hypot(tr.x-tl.x,tr.y-tl.y),h=Math.hypot(bl.x-tl.x,bl.y-tl.y);return {x:tl.x,y:tl.y,w,h,tl,tr,bl};}
// The WebGL module reads this canvas + immutable world transform to texture a
// paper mesh fixed on the physical target. Never tie it to muzzle sway/yaw.
window.__armyFixedPaper={geometry:{...PAPER},image:paperImage,version:()=>shots+':'+hits.length};
function drawIronSights(){const {x,y,scale,tilt}=sightPose();
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(tilt);
 ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#101612';ctx.lineWidth=22;ctx.shadowColor='#050a08a8';ctx.shadowBlur=5;
 ctx.beginPath();ctx.arc(0,30,128,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle='#303b34';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,30,114,Math.PI*1.13,Math.PI*1.87);ctx.stroke();
 ctx.strokeStyle='#0e1310';ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(-75,-16);ctx.bezierCurveTo(-86,-18,-81,6,-73,29);ctx.bezierCurveTo(-59,75,-59,103,-50,112);ctx.stroke();
 ctx.beginPath();ctx.moveTo(75,-16);ctx.bezierCurveTo(86,-18,81,6,73,29);ctx.bezierCurveTo(59,75,59,103,50,112);ctx.stroke();
 ctx.fillStyle='#101512';ctx.beginPath();ctx.arc(0,0,8,Math.PI,0);ctx.lineTo(8,125);ctx.lineTo(-8,125);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(-55,110);ctx.lineTo(55,110);ctx.lineTo(82,140);ctx.lineTo(93,189);ctx.lineTo(-93,189);ctx.lineTo(-82,140);ctx.closePath();ctx.fill();
 ctx.fillStyle='#202b23';ctx.beginPath();ctx.moveTo(-40,128);ctx.lineTo(40,128);ctx.lineTo(54,147);ctx.lineTo(-54,147);ctx.closePath();ctx.fill();
 const bottom=max(205,(height-y)/scale+8);ctx.fillStyle='#101512';ctx.beginPath();ctx.moveTo(-91,188);ctx.lineTo(-80,208);ctx.lineTo(-73,bottom);ctx.lineTo(73,bottom);ctx.lineTo(80,208);ctx.lineTo(91,188);ctx.closePath();ctx.fill();ctx.restore();}
function setHUD(){$('timeDisplay').textContent=remain.toFixed(1);$('ammoDisplay').textContent=`${rounds} / ${MAX_ROUNDS}`;$('hitsDisplay').textContent=hits.length;$('shotsDisplay').textContent=shots;$('collectBtn').disabled=shots===0;}
function toast(text){const el=$('hitFlash');el.textContent=text;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),550)}
function fire(){if(state!=='playing'||elapsed<nextShot)return;
 if(rounds<=0){finish();return}
 nextShot=elapsed+FIRE_DELAY;rounds--;shots++;
 // Snapshot the sight before firing recoil. The hole, post peak and tracer agree.
 const tip=sightTip(),hit=hitFromSight(tip);
 recoil=min(17,recoil+4.5);flinch=8.8;sfx();
 if(hit){hits.push({...hit,shot:shots});toast('上靶！第 '+shots+' 發');}
 bullets.push({t:0,life:.12,x:tip.x,y:tip.y,hit:!!hit});setHUD();if(rounds<=0){holdFire=false;setTimeout(()=>{if(state==='playing')finish()},530)}
}
function finish(){if(state!=='playing')return;state='reviewing';holdFire=false;reviewElapsed=0;reviewOrigin=getPaperRect();$('hud').hidden=true;$('shootBtn').classList.remove('pressed');}
function presentResult(){if(state==='result')return;state='result';$('resultScreen').hidden=false;const image=paperImage();const dest=$('resultPaper');const q=dest.getContext('2d');dest.width=600;dest.height=760;q.clearRect(0,0,600,760);q.drawImage(image,0,0);
 $('resultShots').textContent=shots;$('resultHits').textContent=hits.length;$('resultMisses').textContent=shots-hits.length;$('resultRate').textContent=shots?Math.round(100*hits.length/shots)+'%':'0%';
 $('reportText').textContent=hits.length===0?'報告班長！紙沒事，軍費有事。':hits.length===shots?'全部上靶！槍比你還懂得瞄準。':'射偏的那幾發，報告上就當沒看見？';}
function update(dt){elapsed+=dt;remain=max(0,MAX_TIME-elapsed);
 updateBreathing(dt);
 recoil=max(0,recoil-dt*28);flinch=max(0,flinch-dt*38);
 if(holdFire&&elapsed>=nextShot)fire();bullets=bullets.filter(b=>(b.t+=dt)<b.life);if(remain<=0)finish();setHUD();}
function drawAnimation(dt){reviewElapsed+=dt;const t=clamp(reviewElapsed/.85,0,1),ease=1-Math.pow(1-t,3),start=reviewOrigin||{x:width/2,y:height/2,w:30,h:38};
 const desiredW=min(width*.76,360),desiredH=desiredW*760/600,dx=(width-desiredW)/2,dy=clamp((height-desiredH)/2,70,height*.3);
 const r={x:start.x+(dx-start.x)*ease,y:start.y+(dy-start.y)*ease,w:start.w+(desiredW-start.w)*ease,h:start.h+(desiredH-start.h)*ease};
 ctx.fillStyle=`rgba(8,25,18,${.72*ease})`;ctx.fillRect(0,0,width,height);ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=25*ease;ctx.drawImage(paperImage(),r.x,r.y,r.w,r.h);ctx.restore();
 if(t>=1)presentResult();}
function render(dt){ctx.clearRect(0,0,width,height);if(state==='playing'){for(const b of bullets){ctx.globalAlpha=clamp(1-b.t/b.life,0,1);ctx.strokeStyle=b.hit?'#e5d1a2':'#d6ad6c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(width*.5+26,height*.88);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=1}drawIronSights();}
 else if(state==='reviewing')drawAnimation(dt);
 window.__armyShooting3D?.sync?.([],[],{yaw,pitch,fov:fovNow()*180/Math.PI,zoom,flinch,breathX,breathY,eye:[FIELD.x,FIELD.y,FIELD.z]});}
function loop(now){const dt=clamp((now-lastFrame)/1000,0,.045);lastFrame=now;if(state==='playing')update(dt);if(state==='playing'||state==='reviewing')render(dt);if(state==='playing'||state==='reviewing')requestAnimationFrame(loop)}
function reset(){cachedPaper=null;cachedPaperKey='';rounds=MAX_ROUNDS;shots=0;hits=[];elapsed=0;remain=MAX_TIME;nextShot=0;holdFire=false;zoom=false;recoil=0;flinch=0;breathX=0;breathY=0;bullets=[];reviewElapsed=0;reviewOrigin=null;
 yaw=Math.atan2(PAPER.x-FIELD.x,PAPER.z-FIELD.z);pitch=Math.atan2(PAPER.y-FIELD.y,PAPER.z-FIELD.z);resetSway();$('breathPanel').hidden=true;$('breathBtn').setAttribute('aria-expanded','false');$('zoomBtn').classList.remove('active');$('zoomBtn').textContent='◎ 開鏡 2.4×';document.body.classList.remove('scopeActive');setHUD();}
function start(){if(!ready)return;reset();state='playing';$('hud').hidden=false;$('startScreen').hidden=true;$('resultScreen').hidden=true;lastFrame=performance.now();requestAnimationFrame(loop);}
function changeAim(dx,dy){if(state!=='playing')return;const k=zoom?.0021:.0055;yaw-=dx*k;while(yaw>Math.PI)yaw-=Math.PI*2;while(yaw< -Math.PI)yaw+=Math.PI*2;pitch=clamp(pitch-dy*k,-1.1,.58)}
canvas.addEventListener('pointerdown',e=>{if(state!=='playing'||dragging!==null)return;e.preventDefault();dragging={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch{}},{passive:false});
addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragging.id||state!=='playing')return;e.preventDefault();changeAim(e.clientX-dragging.x,e.clientY-dragging.y);dragging.x=e.clientX;dragging.y=e.clientY;},{passive:false});
function stopDrag(e){if(!dragging||e&&e.pointerId!=null&&e.pointerId!==dragging.id)return;dragging=null}
for(const event of ['pointerup','pointercancel'])addEventListener(event,stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);
$('shootBtn').addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;holdFire=true;try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}$('shootBtn').classList.add('pressed');fire()});
for(const e of ['pointerup','pointercancel','lostpointercapture'])$('shootBtn').addEventListener(e,()=>{holdFire=false;$('shootBtn').classList.remove('pressed')});
$('collectBtn').addEventListener('click',finish);
$('zoomBtn').addEventListener('click',()=>{if(state!=='playing')return;zoom=!zoom;$('zoomBtn').classList.toggle('active',zoom);$('zoomBtn').textContent=zoom?'◎ 關鏡':'◎ 開鏡 2.4×';document.body.classList.toggle('scopeActive',zoom)});
$('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=muted?'🔇':'🔊';try{localStorage.setItem('ARMY3_shoot_muted',muted?'1':'0')}catch{}});
$('breathBtn').addEventListener('click',()=>{const panel=$('breathPanel');panel.hidden=!panel.hidden;$('breathBtn').setAttribute('aria-expanded',String(!panel.hidden));});
$('breathSlider').addEventListener('input',e=>setBreathLevel(e.target.value));
setBreathLevel(breathLevel);
function back(){state='result';holdFire=false;if(parent!==window){try{parent.postMessage({type:'ARMY3_SHOOTING_RETURN'},location.origin);return}catch{}}location.href='./index.html'}
document.querySelectorAll('.backBtn').forEach(b=>b.addEventListener('click',back));$('startBtn').addEventListener('click',start);$('againBtn').addEventListener('click',start);
addEventListener('keydown',e=>{if(e.code==='Space'&&state==='playing'){e.preventDefault();holdFire=true;fire()}if(e.code==='KeyF')$('zoomBtn').click();if(e.code==='Enter'&&state==='playing')finish()});addEventListener('keyup',e=>{if(e.code==='Space')holdFire=false});addEventListener('blur',()=>{holdFire=false;dragging=null});
async function boot(){try{const r=await fetch('./shooting-paper-scene.json?v=140',{cache:'no-store'});if(!r.ok)throw Error('場景檔 HTTP '+r.status);
 const s=await r.json(),player=s.items.filter(o=>o.category==='soldier'),targets=s.items.filter(o=>o.assetId==='target');if(player.length!==1||targets.length!==1)throw Error('本次場景應有 1 位射手和 1 座靶架');
 if(Math.hypot(player[0].x-FIELD.x,player[0].z-FIELD.z)>.02||Math.hypot(targets[0].x-PAPER.x,targets[0].z-backZ)>.02)throw Error('射手或靶架座標已更動，請更新瞄準設定');
 $('loadStatus').textContent='場景位置確認完成，等待原版 3D 模型載入…';
 const started=performance.now(),timer=setInterval(()=>{const v=window.__armyShooting3D?.status?.();if(v?.ready){clearInterval(timer);ready=true;$('loadStatus').textContent='✅ 原版軍營、射手位置、靶架及步槍已準備好';$('startBtn').disabled=false;$('startBtn').textContent='開始射擊';return}
  if(v?.error){clearInterval(timer);$('loadStatus').textContent='❌ 3D 載入失敗：'+v.error;return}
  if(performance.now()-started>90000){clearInterval(timer);$('loadStatus').textContent='3D 載入逾時，請確認所有原版 GLB 檔案已上傳';}},250);
 }catch(e){console.error('[ARMY 紙靶打靶]',e);$('loadStatus').textContent='❌ '+e.message}}
boot();
window.__armyPaperTest={status:()=>({ready,state,shots,hits:hits.length,rounds,yaw,pitch,zoom,remain,paper:PAPER,breathLevel,breathX,breathY}),start,fire,finish,aim:changeAim,getHoles:()=>hits.slice(),getPaperIntersection:hitFromSight,getSightTip:sightTip,setBreathLevel};
})();
