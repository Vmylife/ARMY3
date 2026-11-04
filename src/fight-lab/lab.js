// ARMY3 FIGHT LAB V1 — real skinned soldiers + layered hits, no edits to army camp.
// Standalone: only one animation asset is downloaded and one GPU mesh is shared by both actors.
import {ArmyRenderer} from '../core/renderer.js?v=116';
import {RigAnimator} from '../characters/rigAnimator.js?v=121';
import {loadGlb} from '../core/glb111.js?v=111';
import {mul,translation,rotateY} from '../core/math.js?v=060';
import {FightEngine,ATTACKS} from './engine.js?v=1';

const $=id=>document.getElementById(id);
const e=new FightEngine();
let renderer=null,ground=null,actors=null,ready=false,last=0,shake=0,noticeUntil=0,roundSerial=0,audio=null,sample=null;
const keys=new Set(),stick={pointer:null,x:0,z:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rotateX=rad=>{const c=Math.cos(rad),s=Math.sin(rad);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])};
function tell(text,ms=1700){
 $('callout').textContent=text;
 noticeUntil=performance.now()+ms;
}
function loadProgress(got,total){
 if(total>0)$('loadBar').style.width=Math.min(92,Math.round(got/total*85))+'%';
 $('loadText').textContent='正在載入拳擊動畫與士兵模型…'+(total?Math.round(got/total*100)+'%':'');
}
function makeGround(gl){
 const pos=[],cols=[],norms=[];
 const push=(a,b,c,color)=>{for(const p of [a,b,c]){pos.push(...p);cols.push(...color);norms.push(0,1,0)}};
 const quad=(x1,z1,x2,z2,y,color)=>{
  push([x1,y,z1],[x2,y,z1],[x1,y,z2],color);
  push([x1,y,z2],[x2,y,z1],[x2,y,z2],color);
 };
 // Boxing test mat, drawn above the original camp's static terrain.
 for(let x=-7;x<7;x++)for(let z=-5;z<5;z++){
  const edge=x===-7||x===6||z===-5||z===4;
  quad(x,z,x+1,z+1,.075,edge?[.22,.40,.31]:(x+z)%2?[.66,.76,.61]:[.70,.78,.65]);
 }
 for(let k=0;k<86;k++){
  const a=k*2*Math.PI/86,b=(k+1)*2*Math.PI/86;
  const ring=(r,th,c)=>{
   const p=(rad,angle)=>[Math.cos(angle)*rad,.087,Math.sin(angle)*rad];
   push(p(r,a),p(r+th,a),p(r,b),c);
   push(p(r,b),p(r+th,a),p(r+th,b),c);
  };
  ring(3.65,.10,[.91,.73,.33]);
  ring(3.47,.028,[.93,.88,.64]);
 }
 quad(-.023,-3.4,.023,3.4,.093,[.87,.86,.62]);
 for(const side of [-1,1]){
  const color=side<0?[.26,.57,.47]:[.75,.36,.27];
  for(let k=0;k<58;k++){
   const a=2*Math.PI*k/58,b=2*Math.PI*(k+1)/58;
   const px=side*1.0,r=.40,y=.105;
   const pos=(ang,rad)=>[px+Math.cos(ang)*rad,y,Math.sin(ang)*rad];
   push(pos(a,r),pos(a,r+.065),pos(b,r),color);
   push(pos(b,r),pos(a,r+.065),pos(b,r+.065),color);
  }
 }
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 for(const [index,data] of [[0,pos],[1,cols],[2,norms]]){
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,3,gl.FLOAT,false,0,0);
 }
 gl.bindVertexArray(null);
 return{vao,count:pos.length/3};
}
function renderFloor(){
 if(!renderer||!ground)return;
 const gl=renderer.gl;
 gl.useProgram(renderer.pFlat);
 gl.uniformMatrix4fv(renderer.flatVP,false,renderer.vp);
 gl.bindVertexArray(ground.vao);gl.drawArrays(gl.TRIANGLES,0,ground.count);gl.bindVertexArray(null);
}
function lowFootLift(asset,anim){
 if(!['Knock_Down','Arise','BeHit_FlyUp'].includes(anim.clip)||!asset?.sample?.length)return 0;
 let low=Infinity;
 for(const s of asset.sample){
  let y=0;for(let k=0;k<4;k++){const weight=s.w[k];if(weight<=0)continue;
   const base=s.j[k]*16;
   y+=weight*(anim.bones[base+1]*s.p[0]+anim.bones[base+5]*s.p[1]+anim.bones[base+9]*s.p[2]+anim.bones[base+13]);
  }
  if(y<low)low=y;
 }
 return Number.isFinite(low)?clamp(.015-low,0,1.0):0;
}
function drawFighter(f,actor){
 const r=renderer,gl=r.gl,a=r.assets.get('duelist'),anim=actor.anim;
 if(!a)return;
 // Additive torso recoil around the waist, ON TOP of the original punch/knockdown animation.
 const lean=clamp(f.lean,-.65,.30);
 const pivot=mul(translation(0,.77,0),mul(rotateX(lean),translation(0,-.77,0)));
 const model=mul(translation(f.x,lowFootLift(a,anim)+.095,f.z),mul(rotateY(f.angle),pivot));
 gl.useProgram(r.p);
 gl.uniformMatrix4fv(r.uniforms.vp,false,r.vp);
 gl.uniformMatrix4fv(r.uniforms.model,false,model);
 gl.uniformMatrix4fv(r.uniforms.bones,false,anim.bones);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,a.tex);
 gl.uniform1i(r.uniforms.tex,0);
 gl.bindVertexArray(a.vao);gl.drawElements(gl.TRIANGLES,a.count,a.indexType,0);
 gl.bindVertexArray(null);
}
const CLIP={idle:'Idle',walk:'Walking',attack:'Punch_Combo_1',hit:'Idle',down:'Knock_Down',rise:'Arise',dodge:'Running'};
function syncActor(f,actor,dt){
 const anim=actor.anim;
 let clip=CLIP[f.state]||'Idle';
 if(!anim.hasClip(clip))clip=anim.hasClip('Walking')?'Walking':Object.keys(anim.clips)[0];
 if(clip!==actor.clip){
  anim.setClip(clip,{restart:true});
  if(f.state==='attack'||f.state==='down'||f.state==='rise'){anim.transition=0;anim.prevClip=null}
  actor.clip=clip;
 }
 if(f.state==='attack'&&f.attack){
  const duration=anim.clips[clip]?.duration||1.5;
  anim.speed=clamp(duration/(ATTACKS[f.attack.type].length*1.45),.85,2.5);
 }else if(f.state==='down'){
  anim.speed=clamp((anim.clips[clip]?.duration||1.2)/.8,.75,1.75);
 }else anim.speed=1;
 anim.evaluate(dt);
}
function project(x,y,z){
 if(!renderer)return{x:innerWidth/2,y:innerHeight/2};
 const m=renderer.vp,w=m[3]*x+m[7]*y+m[11]*z+m[15];
 if(w<.05)return{x:innerWidth/2,y:innerHeight/2};
 const sx=m[0]*x+m[4]*y+m[8]*z+m[12],sy=m[1]*x+m[5]*y+m[9]*z+m[13];
 const rect=$('arena').getBoundingClientRect();
 return{x:rect.left+(sx/w*.5+.5)*rect.width,y:rect.top+(.5-sy/w*.5)*rect.height};
}
function followLabel(id,f){
 const at=project(f.x,2.0,f.z),node=$(id);
 node.style.left=at.x+'px';node.style.top=at.y+'px';
}
function hitBurst(event){
 if(!renderer)return;
 const at=project(event.at.x,1.18,event.at.z);
 const node=document.createElement('div');node.className='hitBurst '+(event.type==='heavy'?'heavy ':'')+(event.who==='enemy'?'enemy':'');
 node.dataset.text=event.type==='heavy'?'砰！':'啪！';
 node.style.left=at.x+'px';node.style.top=at.y+'px';
 $('burstLayer').appendChild(node);setTimeout(()=>node.remove(),410);
 const damage=document.createElement('div');damage.className='floatDamage';
 damage.textContent='-'+event.damage;damage.style.left=at.x+'px';damage.style.top=(at.y-23)+'px';
 $('burstLayer').appendChild(damage);setTimeout(()=>damage.remove(),810);
 const flash=$('flash');flash.style.transition='none';flash.style.opacity=event.type==='heavy'?.7:.42;
 requestAnimationFrame(()=>{flash.style.transition='opacity 110ms ease-out';flash.style.opacity=0});
}
function unlockAudio(){
 if(audio)return audio;
 const Constructor=window.AudioContext||window.webkitAudioContext;
 if(!Constructor)return null;
 try{audio=new Constructor();audio.resume?.();
  const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.35),audio.sampleRate);
  const pcm=buffer.getChannelData(0);
  for(let i=0;i<pcm.length;i++)pcm[i]=Math.random()*2-1;
  sample=buffer;
 }catch(err){console.warn('打擊音效暫時無法使用',err);audio=null}
 return audio;
}
function noise(duration,level,frequency,highpass=false){
 if(!unlockAudio()||!sample)return;
 const t=audio.currentTime,source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
 source.buffer=sample;filter.type=highpass?'highpass':'lowpass';filter.frequency.value=frequency;
 gain.gain.setValueAtTime(Math.max(.001,level),t);
 gain.gain.exponentialRampToValueAtTime(.001,t+duration);
 source.connect(filter);filter.connect(gain);gain.connect(audio.destination);
 source.start(t);source.stop(t+duration+.01);
}
function whoosh(heavy=false){noise(heavy?.19:.13,heavy?.12:.07,heavy?520:900,true)}
function thump(heavy=false){
 if(!unlockAudio())return;
 noise(heavy?.19:.115,heavy?.32:.23,heavy?900:1300);
 const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
 osc.type='triangle';osc.frequency.setValueAtTime(heavy?150:185,t);
 osc.frequency.exponentialRampToValueAtTime(heavy?52:75,t+(heavy?.19:.12));
 gain.gain.setValueAtTime(heavy?.48:.31,t);
 gain.gain.exponentialRampToValueAtTime(.001,t+(heavy?.21:.145));
 osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+(heavy?.22:.16));
}
function react(){
 for(const event of e.drain()){
  if(event.type==='swing'){
   whoosh(event.type==='heavy'||event.type==='counter');
   if(event.who==='enemy')tell('對方準備還手了！按閃避！',950);
  }else if(event.type==='hit'){
   const heavy=event.type==='heavy';
   shake=Math.max(shake,heavy?.20:.11);
   hitBurst(event);thump(heavy);
   if(event.who==='player'){
    tell(event.down?'重拳打趴！班長：你們是來當兵還是打 UFC？':event.chain>=2?event.chain+' 連擊！這拳有重量！':'命中！對方要反擊了！',1200);
   }else tell(event.down?'你被打倒了！班長都看不下去了！':'欸靠！對方真的還手！',1250);
   if(event.who==='player'&&event.chain>=2){
    $('combo').textContent=event.chain+' HIT COMBO';$('combo').hidden=false;
    clearTimeout(react.comboTimer);react.comboTimer=setTimeout(()=>$('combo').hidden=true,1000);
   }
  }else if(event.type==='miss'){
   if(event.who==='player')tell('揮空了！靠近一點再打。',850);
  }else if(event.type==='evade'){tell(event.who==='player'?'漂亮！閃過一拳！':'對手閃掉了！',850)}
  else if(event.type==='dodge'){tell('閃避！等他揮空再反擊。',750)}
  else if(event.type==='rise'&&event.who==='enemy'){tell('對手站起來了：「幹！還來？」',1200)}
  else if(event.type==='finished'){
   const serial=roundSerial;
   setTimeout(()=>{if(serial===roundSerial)showEnd(event.winner)},1700);
  }
 }
}
function updateHUD(){
 for(const [id,hp] of [['player',e.player.hp],['enemy',e.enemy.hp]]){
  const fill=$(id+'HP'),text=$(id+'HPText');
  const display=Math.ceil(hp);
  if(fill.dataset.hp!==String(display)){fill.style.width=hp+'%';fill.dataset.hp=String(display);text.textContent=display+' / 100'}
 }
 $('dodge').disabled=e.player.dodgeCD>.01||Boolean(e.winner)||!ready;
 $('light').disabled=!ready||Boolean(e.winner);
 $('heavy').disabled=!ready||Boolean(e.winner);
 const title=e.winner?'本回合已結束':e.aggressive?(e.aiEnabled?'AI 已進入反擊模式':'AI 反擊已關閉'):'對手等待你先出拳';
 $('sceneStatus').textContent=title;
}
function showEnd(winner){
 $('endTitle').textContent=winner==='player'?'你把阿兵哥打趴了！':'被阿兵哥反過來教育';
 $('endComment').textContent=winner==='player'?
  '班長：「你很會打嘛？晚點自己去找連長報到。」':'班長：「不是你先動手的嗎？怎麼躺地上的是你？」';
 $('playerHits').textContent=e.hits;
 $('enemyHits').textContent=e.enemyHits;
 $('endScreen').hidden=false;
}
function reset(){
 roundSerial++;
 const settings={ai:$('counter').checked,difficulty:$('difficulty').value};
 e.reset();e.enableAI(settings.ai);e.difficulty=settings.difficulty;
 $('endScreen').hidden=true;$('burstLayer').replaceChildren();$('combo').hidden=true;
 shake=0;last=0;tell('先靠近對手，再出拳！',1700);updateHUD();
 if(actors){for(const a of Object.values(actors)){a.clip='';a.anim.setClip('Idle',{restart:true});a.anim.evaluate(0)}}
}
function controls(){
 const s=$('stick');
 const move=event=>{
  if(stick.pointer!==event.pointerId)return;
  const rect=s.getBoundingClientRect(),x=event.clientX-(rect.left+rect.width/2),z=event.clientY-(rect.top+rect.height/2);
  const r=rect.width*.32,d=Math.hypot(x,z),ratio=Math.min(1,r/Math.max(d,.001));
  stick.x=clamp(x*ratio/r,-1,1);stick.z=clamp(-z*ratio/r,-1,1);
  $('stickThumb').style.transform='translate('+(stick.x*40)+'px,'+(-stick.z*40)+'px)';
 };
 s.addEventListener('pointerdown',event=>{event.preventDefault();stick.pointer=event.pointerId;s.setPointerCapture?.(event.pointerId);move(event)});
 s.addEventListener('pointermove',move);
 const stop=()=>{stick.pointer=null;stick.x=stick.z=0;$('stickThumb').style.transform='translate(0,0)'};
 s.addEventListener('pointerup',stop);s.addEventListener('pointercancel',stop);window.addEventListener('blur',stop);
 function playAction(type){
  if(!ready)return;
  unlockAudio();
  if(type==='dodge'){e.dodge()}else e.attack(type);
  react();updateHUD();
 }
 $('light').addEventListener('click',()=>playAction('jab'));
 $('heavy').addEventListener('click',()=>playAction('heavy'));
 $('dodge').addEventListener('click',()=>playAction('dodge'));
 $('reset').addEventListener('click',reset);$('again').addEventListener('click',reset);
 $('counter').addEventListener('change',event=>{e.enableAI(event.target.checked);tell(event.target.checked?'反擊模式開啟，對手會還手。':'反擊模式關閉，練習出拳手感。',1150)});
 $('difficulty').addEventListener('change',event=>{e.difficulty=event.target.value});
 window.addEventListener('keydown',event=>{
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyJ','KeyK'].includes(event.code))event.preventDefault();
  if(event.repeat)return;
  keys.add(event.code);
  if(event.code==='KeyJ')playAction('jab');
  if(event.code==='KeyK')playAction('heavy');
  if(event.code==='Space')playAction('dodge');
 });
 window.addEventListener('keyup',event=>keys.delete(event.code));
 window.addEventListener('blur',()=>keys.clear());
 let drag=null;
 $('arena').addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX};$('arena').setPointerCapture?.(event.pointerId)});
 $('arena').addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  cameraYaw=clamp(cameraYaw+(event.clientX-drag.x)*.004,-.55,.75);drag.x=event.clientX;
 });
 $('arena').addEventListener('pointerup',()=>drag=null);
 $('arena').addEventListener('pointercancel',()=>drag=null);
}
let cameraYaw=.04;
function direction(){
 const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 const z=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
 if(x||z){const len=Math.hypot(x,z);return{x:x/len,z:z/len}}
 return{x:stick.x,z:stick.z};
}
function frame(now){
 requestAnimationFrame(frame);
 if(!ready)return;
 const dt=last?clamp((now-last)/1000,0,.055):0;
 last=now;
 if(document.hidden){last=0;return}
 e.step(dt,direction());
 react();
 const frozen=e.freeze>0;
 if(!frozen){syncActor(e.player,actors.player,dt);syncActor(e.enemy,actors.enemy,dt)}
 shake=Math.max(0,shake-dt*.73);
 const cameraJitter=shake*Math.sin(now*.091)*.075;
 renderer.setCamera({yaw:cameraYaw+cameraJitter,pitch:.47+shake*Math.cos(now*.11)*.035,zoom:7.3});
 renderer.startFrame({x:(e.player.x+e.enemy.x)/2,z:(e.player.z+e.enemy.z)/2});
 renderFloor();drawFighter(e.player,actors.player);drawFighter(e.enemy,actors.enemy);
 followLabel('playerLabel',e.player);followLabel('enemyLabel',e.enemy);
 if(now>noticeUntil&&e.aggressive&&!e.winner){
  $('callout').textContent=e.aiEnabled?'NPC 會還手，注意閃避時機！':'練習模式：NPC 暫不還手';
 }
 updateHUD();
}
async function boot(){
 try{
  $('loadText').textContent='初始化 WebGL2 與格鬥測試場…';
  renderer=new ArmyRenderer($('arena'));
  ground=makeGround(renderer.gl);
  // The existing animation laboratory model includes real Punch_Combo_1 and Knock_Down clips.
  // It is deliberately loaded ONCE and rendered twice, saving texture and GPU memory.
  const glb=await loadGlb('./assets/characters/cadet/cadet-animation-lab.glb?v=1181',
   {timeoutMs:90000,onProgress:loadProgress});
  const base=new RigAnimator(glb);
  if(!base.hasClip('Punch_Combo_1')||!base.hasClip('Knock_Down')){
   throw new Error('目前士兵 GLB 沒有拳擊或倒地動畫，請確認動畫模型版本');
  }
  $('loadText').textContent='建立士兵骨架與貼圖…';$('loadBar').style.width='92%';
  await renderer.addModel('duelist',glb);
  actors={player:{anim:base,clip:''},enemy:{anim:new RigAnimator(glb),clip:''}};
  for(const actor of Object.values(actors)){actor.anim.setClip('Idle');actor.anim.evaluate(0)}
  $('loadBar').style.width='100%';
  ready=true;$('loading').hidden=true;
  reset();requestAnimationFrame(frame);
 }catch(error){
  console.error('[國軍格鬥實驗室]',error);
  $('loadText').textContent='載入失敗：'+String(error.message||error);
  $('retry').hidden=false;$('retry').onclick=()=>location.reload();
 }
}
document.addEventListener('visibilitychange',()=>{last=0});
controls();boot();
window.armyFightLab={
 get status(){return{...e.status,ready,modelLoaded:!!actors,
  hasPunch:!!actors?.player.anim.hasClip('Punch_Combo_1'),
  hasKnockdown:!!actors?.player.anim.hasClip('Knock_Down')}},
 attack:type=>{const ok=e.attack(type||'jab');react();return ok},
 dodge:()=>e.dodge(),reset,engine:e
};
