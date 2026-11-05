/* ARMY3 · 報告長官！我的子彈有上靶嗎？ — standalone target-paper shooting v1.54 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('shootingOverlay'),ctx=canvas.getContext('2d',{alpha:true}),min=Math.min,max=Math.max,clamp=(x,a,b)=>max(a,min(b,x));
const FIELD={x:12.272136337858274,z:.6765632048809667,y:1.58};
// Fit completely within target.glb's ~1.15 m by 1.48 m physical extent.
const PAPER={x:12.3,z:21.68,y:.97,w:.98,h:1.02};
const FOV=54,ZOOM=2.4,MAX_ROUNDS=10,MAX_TIME=45,FIRE_DELAY=.28;
const backZ=22.15;
// The original high-quality 3D cadets appear progressively as stages advance.
const MAX_LEVEL=5,REQUIRED_HITS=5;
let currentStage=1;
const runnerCount=()=>Math.min(16,(currentStage-1)*4);
let runners=[],runnerSeed=0x1B2C3D4E,friendlyHits=0;
function runnerRandom(){let x=runnerSeed|0;x^=x<<13;x^=x>>>17;x^=x<<5;runnerSeed=x;return (x>>>0)/4294967296;}
function makeRunners(){
 runnerSeed=0x1B2C3D4E;friendlyHits=0;runners=[];
 for(let i=0;i<runnerCount();i++){
  const row=Math.floor(i/5),lane=i%5;
  const z=7.0+row*3.45+lane*.18;
  const x=3.8+runnerRandom()*17.5;
  const dir= i%2===0 ? 1:-1;
  runners.push({id:i+1,team:'green',x,z,angle:dir>0?Math.PI/2:-Math.PI/2,dir,
   speed:1.6+runnerRandom()*.85,phase:i*.813,alive:true,seed:i/20,
   zig:runnerRandom()*Math.PI*2,zBase:z,turnTime:runnerRandom()*2.4,
   hitT:0,fall:0,airY:0,vx:0,vy:0,vz:0,landed:false,angleStart:0,targetAngle:0});
 }
}
function moveRunners(dt){
 for(const a of runners){
  if(!a.alive){
   a.hitT+=dt;
   if(!a.landed){
    a.x+=a.vx*dt;a.z+=a.vz*dt;
    const friction=Math.exp(-1.15*dt);a.vx*=friction;a.vz*=friction;
    a.airY+=a.vy*dt;a.vy-=12.5*dt;
    if(a.airY<=0&&a.hitT>.15){a.airY=0;a.vy=0;a.vx=0;a.vz=0;a.landed=true;}
   }
   const t=clamp(a.hitT/.20,0,1),turn=Math.atan2(Math.sin(a.targetAngle-a.angleStart),Math.cos(a.targetAngle-a.angleStart));
   a.angle=a.angleStart+turn*t;
   const f=clamp((a.hitT-.025)/.53,0,1);a.fall=f*f*(3-2*f);
   continue;
  }
  a.turnTime-=dt;
  if(a.turnTime<=0){a.turnTime=1.1+runnerRandom()*2.5;a.dir=runnerRandom()>.5?1:-1;}
  let nextX=a.x+a.dir*a.speed*dt;
  if(nextX<3.2||nextX>21.8){a.dir*=-1;nextX=clamp(nextX,3.2,21.8);}
  a.x=nextX;
  a.z=a.zBase+Math.sin(elapsed*.75+a.zig)*.65;
  const dz=Math.cos(elapsed*.75+a.zig)*.65*.75;
  // The GLB's forward is +Z; angle faces the current running direction.
  a.angle=Math.atan2(a.dir*a.speed,dz);
 }
}
function knockRunner(a,tip){
 const d=shotRay(tip),len=Math.hypot(d[0],d[2])||1,dx=d[0]/len,dz=d[2]/len;
 a.alive=false;a.hitT=0;a.fall=0;a.airY=.035;a.landed=false;
 a.vx=dx*(4.25+runnerRandom()*.6);a.vz=dz*(4.25+runnerRandom()*.6);a.vy=2.9;
 // Keep the projectile-aligned travel and let the renderer handle the tumble.
 // With a +90 degree hip rotation the head stays downrange and the chest faces sky.
 a.angleStart=a.angle;a.targetAngle=Math.atan2(dx,dz);
}
function shotRay(tip){
 const f=focal(),nx=(tip.x-width*.5)/f,ny=-(tip.y-height*.5)/f;
 const {forward,right,up}=cameraBasis();
 const d=forward.map((v,i)=>v+right[i]*nx+up[i]*ny);
 const len=Math.hypot(...d)||1;
 return d.map(v=>v/len);
}
function firstFriendlyInLine(tip){
 const d=shotRay(tip);if(d[2]<=.001)return null;
 const maxDist=(PAPER.z-FIELD.z)/d[2];
 let nearest=null,nearestT=maxDist;
 for(const a of runners){if(!a.alive)continue;
  // Capsule approximation: horizontal radius .38m, standing height ~1.70m.
  // Parameterize the ray at the NPC's world Z and compare the crossing point.
  const t=(a.z-FIELD.z)/d[2];if(t<=0||t>=nearestT)continue;
  const x=FIELD.x+d[0]*t,y=FIELD.y+d[1]*t;
  if(Math.abs(x-a.x)<.39&&y>.12&&y<1.74){nearest=a;nearestT=t;}
 }
 return nearest;
}

let width=1,height=1,dpr=1,ready=false,state='loading',zoom=false,rounds=MAX_ROUNDS,shots=0,hits=[],elapsed=0,remain=MAX_TIME,nextShot=0,holdFire=false,lastFrame=0,recoil=0,flinch=0,breathX=0,breathY=0;
let yaw=Math.atan2(PAPER.x-FIELD.x,PAPER.z-FIELD.z),pitch=Math.atan2(PAPER.y-FIELD.y,PAPER.z-FIELD.z);
let bullets=[],reviewElapsed=0,reviewOrigin=null,dragging=null,shotTick=0,shotAt=-10,kickReturn=0;
let shotHistory=[]; // Actual fired rounds, used only for collectible achievements and reports.
let runStartStage=1,runStages=[],runFailures=[],pendingStage=1,transitionUntil=0;
// Continuous, constant-speed wandering: the path may curve unpredictably,
// but there are no random speed changes, scripted holds, or spring deceleration.
// The setting controls travel range; the shot ray and sight post still agree.
const breathLevel=70; // Fixed difficulty; user-adjustable breathing deliberately removed.
const SWAY_SPEED=1.08, SWAY_RADIUS=1.60;
const sway={x:0,y:0,heading:0,turnRate:0,targetTurn:0,turnCountdown:0,seed:0x52A7D3E9};
function randomBreath(){let x=sway.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;sway.seed=x;return (x>>>0)/4294967296;}
function randomSigned(){return randomBreath()*2-1;}
function updateBreathing(dt){
  // A zero setting freezes the sight absolutely; recoil remains independent.
  if(breathLevel===0){breathX=breathY=0;return;}
  sway.turnCountdown-=dt;
  if(sway.turnCountdown<=0){
    // Only change the CURVATURE, never the travelling speed.
    sway.targetTurn=randomSigned()*2.5;
    sway.turnCountdown=.32+randomBreath()*.67;
  }
  // Smooth, unpredictable steering: no sudden direction teleporting.
  sway.turnRate+=(sway.targetTurn-sway.turnRate)*Math.min(1,dt*3.4);
  const radius=Math.hypot(sway.x,sway.y);
  let inwardSteer=0;
  if(radius>1.03){
    // Curve back into the allowed range before reaching the edge.
    const headingToCentre=Math.atan2(-sway.y,-sway.x);
    const delta=Math.atan2(Math.sin(headingToCentre-sway.heading),Math.cos(headingToCentre-sway.heading));
    inwardSteer=clamp((radius-1.03)/.43,0,1)*clamp(delta,-2.5,2.5)*2.7;
  }
  sway.heading+=(sway.turnRate+inwardSteer)*dt;
  const step=SWAY_SPEED*dt;
  let dx=Math.cos(sway.heading)*step,dy=Math.sin(sway.heading)*step;
  let nextX=sway.x+dx,nextY=sway.y+dy;
  if(Math.hypot(nextX,nextY)>SWAY_RADIUS){
    // Emergency reflection rather than clamping, which made the sight STOP.
    const r=Math.hypot(nextX,nextY),nx=nextX/r,ny=nextY/r;
    const dot=(dx*nx+dy*ny)/step;
    const vx=dx/step-2*dot*nx,vy=dy/step-2*dot*ny;
    sway.heading=Math.atan2(vy,vx);
    nextX=sway.x+vx*step;nextY=sway.y+vy*step;
  }
  const r=Math.hypot(nextX,nextY);
  if(r>SWAY_RADIUS){nextX*=SWAY_RADIUS/r;nextY*=SWAY_RADIUS/r;}
  sway.x=nextX;sway.y=nextY;
  const amplitude=Math.min(width,500)*.46*Math.pow(breathLevel/100,2.05);
  breathX=sway.x*amplitude;
  breathY=sway.y*amplitude;
}

function resetSway(){Object.assign(sway,{x:0,y:0,heading:randomBreath()*Math.PI*2,turnRate:0,targetTurn:0,turnCountdown:0});breathX=breathY=0;}
let muted=false;try{muted=localStorage.getItem('ARMY3_shoot_muted')==='1'}catch{}
$('muteBtn').textContent=muted?'🔇':'🔊';
// Main-camp rifle sample: one decoded AudioBufferSource per fire, no delayed HTMLAudio clone.
const SHOT_SAMPLE='./assets/audio/rifle/npc_rifle_B.mp3?v=1';
let shotAudioContext=null,shotBuffer=null,shotPromise=null,shotNoise=null,shotRetry=0;
function ensureShotAudio(){
 try{
  const API=window.AudioContext||window.webkitAudioContext;if(!API)return null;
  const ctx=shotAudioContext??=new API();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  if(!shotBuffer&&!shotPromise&&performance.now()>shotRetry){
   shotRetry=performance.now()+30000;
   shotPromise=fetch(SHOT_SAMPLE,{cache:'force-cache'})
    .then(r=>{if(!r.ok)throw Error('音效 HTTP '+r.status);return r.arrayBuffer()})
    .then(bytes=>ctx.decodeAudioData(bytes))
    .then(buffer=>{shotBuffer=buffer})
    .catch(err=>{console.warn('[打靶音效] 備用槍聲',err)})
    .finally(()=>{shotPromise=null});
  }
  return ctx;
 }catch(err){console.warn('[打靶音效] 初始化失敗',err);return null}
}
function sfx(){
 if(muted)return;
 try{if(localStorage.getItem('ARMY3_sfx_muted_v1')==='1')return}catch{}
 const ctx=ensureShotAudio();if(!ctx)return;
 const t=ctx.currentTime;
 if(shotBuffer){
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=shotBuffer;source.playbackRate.value=.95+Math.random()*.07;
  gain.gain.value=.52;source.connect(gain);gain.connect(ctx.destination);
  source.start(t);return;
 }
 // Immediate fallback only if sample still decoding, matching camp's synthetic shot.
 if(!shotNoise){
  shotNoise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.35),ctx.sampleRate);
  const pcm=shotNoise.getChannelData(0);for(let i=0;i<pcm.length;i++)pcm[i]=Math.random()*2-1;
 }
 const noise=(duration,volume,cutoff)=>{
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=shotNoise;filter.type='lowpass';filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  source.start(t);source.stop(t+duration+.012);
 };
 noise(.12,.33,2400);noise(.065,.14,850);
 const bass=ctx.createOscillator(),gain=ctx.createGain();
 bass.type='triangle';bass.frequency.setValueAtTime(150,t);bass.frequency.exponentialRampToValueAtTime(55,t+.16);
 gain.gain.setValueAtTime(.25,t);gain.gain.exponentialRampToValueAtTime(.001,t+.17);
 bass.connect(gain);gain.connect(ctx.destination);bass.start(t);bass.stop(t+.18);
}
// Pre-decode during the range load; Start/Fire user gesture unlocks iOS audio.
ensureShotAudio();
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
 const x=width*.5+breathX,y=height*.5+breathY-recoil*.68;
 const scale=clamp(min(width/390,height/690),.67,1.34)*(zoom?1.06:1);
 const tilt=(sway.x*.012+sway.y*.007)*Math.pow(breathLevel/100,1.2)+flinch*.0065;
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
function setHUD(){
 $('timeDisplay').textContent=remain.toFixed(1);$('ammoDisplay').textContent=`${rounds} / ${MAX_ROUNDS}`;
 $('hitsDisplay').textContent=hits.length;$('shotsDisplay').textContent=shots;
 const passed=hits.length>=REQUIRED_HITS;
 $('collectBtn').disabled=!passed;
 $('collectBtn').textContent=passed?'過關收靶':'上靶5發可收靶';
 if($('stageHud'))$('stageHud').textContent='第 '+currentStage+' / 5 關 · '+runnerCount()+' 名友軍';
 if($('stageHitsHud'))$('stageHitsHud').textContent='上靶 '+hits.length+' / '+REQUIRED_HITS+(passed?' ✓':'');
}
function toast(text){const el=$('hitFlash');el.textContent=text;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),550)}
function fire(){if(state!=='playing'||elapsed<nextShot)return;
 if(rounds<=0){finish();return}
 nextShot=elapsed+FIRE_DELAY;rounds--;shots++;
 // Snapshot the sight before firing recoil. The hole, post peak and tracer agree.
 const tip=sightTip(),friend=firstFriendlyInLine(tip),hit=friend?null:hitFromSight(tip);
 shotAt=elapsed;recoil=24;flinch=15;
 const oldPitch=pitch;pitch=clamp(pitch+.059,-1.1,.58);kickReturn+=pitch-oldPitch;
 sfx();
 if(friend){knockRunner(friend,tip);friendlyHits++;toast('誤傷友軍！');}
 if(hit){hits.push({...hit,shot:shots});toast('上靶！第 '+shots+' 發');}
 const distance=hit?Math.hypot(hit.x*600-300,hit.y*760-380):Infinity;
 const ring=distance<=248?clamp(10-Math.floor(distance/(248/10)),1,10):0;
 shotHistory.push({shot:shots,kind:friend?'friendly':hit?'target':'miss',ring,zoom,time:elapsed});
 bullets.push({t:0,life:.12,x:tip.x,y:tip.y,hit:!!hit});setHUD();if(rounds<=0){holdFire=false;setTimeout(()=>{if(state==='playing'&&rounds===0)finish()},530)}
}
// Only one real result screen exists: after the last stage of this run.
// Intermediate successes/failures display a brief, non-interactive overlay.
function stageSnapshot(){
 return {stage:currentStage,shots,hits:hits.map(h=>({...h})),friendlyHits,
  shotHistory:shotHistory.map(h=>({...h})),elapsed};
}
function showTransition(message,nextStage){
 pendingStage=nextStage;
 transitionUntil=performance.now()+1150;
 state='transition';holdFire=false;dragging=null;
 $('shootBtn').classList.remove('pressed');
 const banner=$('shootTransition');if(banner){banner.textContent=message;banner.hidden=false;}
}
function finish(){
 if(state!=='playing')return;
 const outcome=stageSnapshot(),passed=outcome.hits.length>=REQUIRED_HITS;
 if(passed){
  runStages.push(outcome);
  try{window.armyPaperReport?.recordStage?.(outcome);}catch(e){console.warn('射擊進度保存失敗',e);}
  if(currentStage<MAX_LEVEL){
   showTransition('✓ 第 '+currentStage+' 關過關！準備第 '+(currentStage+1)+' 關',currentStage+1);
   return;
  }
  // One-and-only end-of-run report after level five.
  state='reviewing';holdFire=false;reviewElapsed=0;reviewOrigin=getPaperRect();
  $('hud').hidden=true;$('shootBtn').classList.remove('pressed');
  return;
 }
 runFailures.push(outcome);
 // A failed stage immediately ends the ENTIRE five-stage run.
 // Never repeat the failed stage, and never show an intermediate report.
 state='reviewing';holdFire=false;reviewElapsed=0;reviewOrigin=getPaperRect();
 $('hud').hidden=true;$('shootBtn').classList.remove('pressed');
 presentResult();
}
function presentResult(){
 if(state!=='reviewing')return;
 state='result';$('resultScreen').hidden=false;
 try{
  window.armyPaperReport?.showRun?.({
   startStage:runStartStage,stages:runStages.map(s=>({...s})),
   failures:runFailures.map(s=>({...s}))
  });
 }catch(error){
  console.error('[Army shooting] 五關總結算失敗',error);
  const totalHits=runStages.reduce((n,s)=>n+s.hits.length,0);
  const totalShots=runStages.reduce((n,s)=>n+s.shots,0);
  $('resultTitle').textContent='實彈射擊總結算';
  $('resultRank').textContent='完成 '+runStages.length+' 個關卡';
  $('resultHits').textContent=totalHits;$('resultShots').textContent=totalShots;
  $('reportText').textContent='本次共上靶 '+totalHits+' 發，累計重考 '+runFailures.length+' 次。';
 }
}
function update(dt){elapsed+=dt;remain=max(0,MAX_TIME-elapsed);
 updateBreathing(dt);moveRunners(dt);
 const recovery=kickReturn*(1-Math.exp(-dt*12.5));pitch-=recovery;kickReturn-=recovery;
 recoil=max(0,recoil-dt*125);flinch=max(0,flinch-dt*85);
 bullets=bullets.filter(b=>(b.t+=dt)<b.life);if(remain<=0)finish();setHUD();}
function drawAnimation(dt){reviewElapsed+=dt;const t=clamp(reviewElapsed/.85,0,1),ease=1-Math.pow(1-t,3),start=reviewOrigin||{x:width/2,y:height/2,w:30,h:38};
 const desiredW=min(width*.76,360),desiredH=desiredW*760/600,dx=(width-desiredW)/2,dy=clamp((height-desiredH)/2,70,height*.3);
 const r={x:start.x+(dx-start.x)*ease,y:start.y+(dy-start.y)*ease,w:start.w+(desiredW-start.w)*ease,h:start.h+(desiredH-start.h)*ease};
 ctx.fillStyle=`rgba(8,25,18,${.72*ease})`;ctx.fillRect(0,0,width,height);ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=25*ease;ctx.drawImage(paperImage(),r.x,r.y,r.w,r.h);ctx.restore();
 if(t>=1)presentResult();}
function drawGunFlash(){
 const age=elapsed-shotAt;if(age<0||age>.42)return;
 const p=sightPose(),x=p.x,y=p.y+16,flash=clamp(1-age/.105,0,1);
 if(flash>0){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const radius=122*flash+16,g=ctx.createRadialGradient(x,y,2,x,y,radius);
  g.addColorStop(0,'rgba(255,252,223,'+(.91*flash)+')');
  g.addColorStop(.19,'rgba(255,204,100,'+(.74*flash)+')');
  g.addColorStop(.58,'rgba(255,118,37,'+(.20*flash)+')');
  g.addColorStop(1,'rgba(255,120,40,0)');
  ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  ctx.translate(x,y);ctx.rotate(shots*1.29);
  for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.fillStyle='rgba(255,222,132,'+(.70*flash)+')';
   ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(0,-(28+i%2*18)*flash);ctx.lineTo(5,0);ctx.closePath();ctx.fill();}
  ctx.restore();
 }
 if(age>.045){
  const t=(age-.045)/.375;ctx.save();ctx.globalAlpha=.22*(1-t);
  ctx.strokeStyle='#c7cdc2';ctx.lineWidth=3+9*t;ctx.beginPath();
  ctx.ellipse(x+20*t,y-18-32*t,14+17*t,7+11*t,-.23,0,Math.PI*1.7);ctx.stroke();ctx.restore();
 }
}
function render(dt){
 ctx.clearRect(0,0,width,height);
 if(state==='playing'){
  for(const b of bullets){ctx.globalAlpha=clamp(1-b.t/b.life,0,1);ctx.strokeStyle=b.hit?'#e5d1a2':'#d6ad6c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(width*.5+26,height*.88);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=1;}
  drawGunFlash();drawIronSights();
 }else if(state==='reviewing')drawAnimation(dt);
 window.__armyShooting3D?.sync?.(runners,[],{yaw,pitch,fov:fovNow()*180/Math.PI,zoom,flinch,shotAge:Math.max(0,elapsed-shotAt),breathX,breathY,eye:[FIELD.x,FIELD.y,FIELD.z]});
}
function loop(now){const dt=clamp((now-lastFrame)/1000,0,.045);lastFrame=now;if(state==='playing')update(dt);if(state==='transition'&&now>=transitionUntil){
  currentStage=pendingStage;
  resetStage();state='playing';
  if($('shootTransition'))$('shootTransition').hidden=true;
 }
 if(state==='playing'||state==='reviewing'||state==='transition')render(dt);
 if(state==='playing'||state==='reviewing'||state==='transition')requestAnimationFrame(loop)}
function resetStage(){
 cachedPaper=null;cachedPaperKey='';rounds=MAX_ROUNDS;shots=0;hits=[];elapsed=0;remain=MAX_TIME;nextShot=0;holdFire=false;zoom=false;recoil=0;flinch=0;shotAt=-10;kickReturn=0;breathX=0;breathY=0;bullets=[];shotHistory=[];reviewElapsed=0;reviewOrigin=null;
 yaw=Math.atan2(PAPER.x-FIELD.x,PAPER.z-FIELD.z);pitch=Math.atan2(PAPER.y-FIELD.y,PAPER.z-FIELD.z);resetSway();makeRunners();window.__armyShooting3D?.restartNPCs?.();$('zoomBtn').classList.remove('active');$('zoomBtn').textContent='◎ 開鏡';document.body.classList.remove('scopeActive');setHUD();}
function start(){
 if(!ready)return;
 ensureShotAudio();
 currentStage=1; // Every new attempt starts at stage one, regardless of past unlocks.
 runStartStage=1;runStages=[];runFailures=[];pendingStage=1;
 resetStage();
 if($('shootTransition'))$('shootTransition').hidden=true;
 state='playing';$('hud').hidden=false;$('startScreen').hidden=true;$('resultScreen').hidden=true;lastFrame=performance.now();requestAnimationFrame(loop);}
function changeAim(dx,dy){if(state!=='playing')return;const k=zoom?.0021:.0055;yaw-=dx*k;while(yaw>Math.PI)yaw-=Math.PI*2;while(yaw< -Math.PI)yaw+=Math.PI*2;pitch=clamp(pitch-dy*k,-1.1,.58)}
canvas.addEventListener('pointerdown',e=>{if(state!=='playing'||dragging!==null)return;e.preventDefault();dragging={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch{}},{passive:false});
addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragging.id||state!=='playing')return;e.preventDefault();changeAim(e.clientX-dragging.x,e.clientY-dragging.y);dragging.x=e.clientX;dragging.y=e.clientY;},{passive:false});
function stopDrag(e){if(!dragging||e&&e.pointerId!=null&&e.pointerId!==dragging.id)return;dragging=null}
for(const event of ['pointerup','pointercancel'])addEventListener(event,stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);
$('shootBtn').addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;fire();$('shootBtn').classList.add('pressed');});
for(const e of ['pointerup','pointercancel','lostpointercapture'])$('shootBtn').addEventListener(e,()=>{$('shootBtn').classList.remove('pressed')});
$('collectBtn').addEventListener('click',finish);
$('zoomBtn').addEventListener('click',()=>{if(state!=='playing')return;zoom=!zoom;$('zoomBtn').classList.toggle('active',zoom);$('zoomBtn').textContent=zoom?'◎ 關鏡':'◎ 開鏡';document.body.classList.toggle('scopeActive',zoom)});
$('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=muted?'🔇':'🔊';try{localStorage.setItem('ARMY3_shoot_muted',muted?'1':'0')}catch{}});
async function back(){
 if(state==='leaving')return;
 state='leaving';holdFire=false;dragging=null;
 // Reuse the same camp-return function as blanket and grenade training.
 // In a prewarmed iframe it posts ARMY3_RETURN_TO_CAMP to the live camp;
 // on a cold navigation it restores the saved player/camera/NPC snapshot.
 try{
  const {returnToCamp}=await import('./src/systems/campSession.js?v=144');
  returnToCamp();
 }catch(error){
  console.error('[射擊鑑測] 返回軍營失敗',error);
  location.replace('./index.html?armyResume=1');
 }
}
document.querySelectorAll('.backBtn').forEach(b=>b.addEventListener('click',back));
 $('startBtn').addEventListener('click',start);
addEventListener('keydown',e=>{if(e.code==='Space'&&state==='playing'&&!e.repeat){e.preventDefault();fire()}if(e.code==='KeyF')$('zoomBtn').click();if(e.code==='Enter'&&state==='playing'&&hits.length>=REQUIRED_HITS)finish()});addEventListener('keyup',e=>{if(e.code==='Space')holdFire=false});addEventListener('blur',()=>{holdFire=false;dragging=null});
async function boot(){try{const r=await fetch('./shooting-paper-scene.json?v=140',{cache:'no-store'});if(!r.ok)throw Error('場景檔 HTTP '+r.status);
 const s=await r.json(),player=s.items.filter(o=>o.category==='soldier'),targets=s.items.filter(o=>o.assetId==='target');if(player.length!==1||targets.length!==1)throw Error('本次場景應有 1 位射手和 1 座靶架');
 if(Math.hypot(player[0].x-FIELD.x,player[0].z-FIELD.z)>.02||Math.hypot(targets[0].x-PAPER.x,targets[0].z-backZ)>.02)throw Error('射手或靶架座標已更動，請更新瞄準設定');
 $('loadStatus').textContent='位置確認完成，模型載入中…';
 const started=performance.now(),timer=setInterval(()=>{const v=window.__armyShooting3D?.status?.();if(v?.ready){clearInterval(timer);ready=true;$('loadStatus').textContent='準備完成';$('startBtn').disabled=false;$('startBtn').textContent='開始射擊';return}
  if(v?.error){clearInterval(timer);$('loadStatus').textContent='❌ 3D 載入失敗：'+v.error;return}
  if(performance.now()-started>90000){clearInterval(timer);$('loadStatus').textContent='3D 載入逾時，請確認所有原版 GLB 檔案已上傳';}},250);
 }catch(e){console.error('[ARMY 紙靶打靶]',e);$('loadStatus').textContent='❌ '+e.message}}
boot();
window.__armyPaperTest={status:()=>({ready,state,shots,hits:hits.length,rounds,yaw,pitch,zoom,remain,paper:PAPER,breathLevel,breathX,breathY,npcCount:runners.length,aliveNPCs:runners.filter(a=>a.alive).length,friendlyHits,stage:currentStage,requiredHits:REQUIRED_HITS,qualified:hits.length>=REQUIRED_HITS,completedStages:runStages.length,failedAttempts:runFailures.length}),start,fire,finish,aim:changeAim,getHoles:()=>hits.slice(),getPaperIntersection:hitFromSight,getSightTip:sightTip,getRunners:()=>runners.map(a=>({...a})),getShotHistory:()=>shotHistory.map(s=>({...s})),testFriendlyRay:firstFriendlyInLine};
})();
