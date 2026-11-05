// ARMY3 official final-battle gateway. Lives in the NORMAL camp scene.
// Uses real six-training awards from armyProgression.run(); does not create
// invented training completions or write the battle laboratory selections.
import {clearCampSession} from './campSession.js?v=144';
const $=id=>document.getElementById(id);
export const BATTLE_RENDEZVOUS={x:22.4,z:16.8}; // Ammunition depot public entry.
const KINDS=['blanket','shooting','grenade','weed','swipe','singing'];
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function completedTrainingCount(){
 return Math.min(6,window.armyProgression?.trainingCount?.()||0);
}
function yellowGroundRing(renderer){
 const gl=renderer.gl,coords=[],colors=[],normals=[],segments=72;
 const add=(x,z,c)=>{coords.push(x,.19,z);colors.push(...c);normals.push(0,1,0)};
 for(let i=0;i<segments;i++){
  const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
  const point=(r,ang)=>[BATTLE_RENDEZVOUS.x+Math.cos(ang)*r,BATTLE_RENDEZVOUS.z+Math.sin(ang)*r];
  for(const [inner,outer,color] of [
   [.96,1.13,[1,.79,.09]],
   [1.04,1.09,[1,.96,.56]]
  ]){
   const p=point(inner,a),q=point(outer,a),r=point(outer,b),s=point(inner,b);
   add(...p,color);add(...q,color);add(...r,color);
   add(...p,color);add(...r,color);add(...s,color);
  }
 }
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 for(const [idx,data] of [[0,coords],[1,colors],[2,normals]]){
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(idx);
  gl.vertexAttribPointer(idx,3,gl.FLOAT,false,0,0);
 }
 gl.bindVertexArray(null);
 return ()=>{gl.useProgram(renderer.pFlat);gl.uniformMatrix4fv(renderer.flatVP,false,renderer.vp);
  gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLES,0,coords.length/3);gl.bindVertexArray(null)};
}
export function createFinalBattleGateway(renderer){
 const ring=yellowGroundRing(renderer);
 const mission=$('armyMissionObjective'),menu=$('battleAssemblyMenu'),
  start=$('battleAssemblyStart'),cancel=$('battleAssemblyCancel');
 if(!mission||!menu||!start||!cancel)throw Error('正式戰役入口 UI 未載入');
 let frame=null,dismissed=false,wasNear=false,lastScan=0,lastKey='';
 let checkedAt=-Infinity,cached={count:0,ready:false,finished:false};
 function status(force=false){
  const now=performance.now();
  if(!force&&now-checkedAt<280)return cached;
  checkedAt=now;
  const run=window.armyProgression?.run(),count=completedTrainingCount();
  const finished=!!run?.battle?.outcome,won=run?.battle?.outcome==='success';
  const key=finished?'finished-'+run.battle.outcome:count===6?'battle':String(count);
  if(lastKey!==key){
   lastKey=key;
   mission.classList.toggle('army-mission-alert',count>=6&&!finished);
   mission.querySelector('strong').textContent=finished?
    (won?'防禦成功':'本輪結束'):count>=6?'敵軍來襲':'完成訓練（'+count+'/6）';
   mission.querySelector('small').textContent=finished?
    '返回首頁準備新的一輪':count>=6?'前往彈藥庫集結':'每項訓練最多三次';
   mission.setAttribute('aria-label',count>=6&&!finished?'敵軍來襲，前往彈藥庫集結':
    '訓練進度 '+count+'/6');
  }
  cached={count,finished,ready:count>=6&&!finished};
  return cached;
 }
 function goHome(){
  if(frame){frame.remove();frame=null}
  window.armyMinigameActive=false;window.armyFinalBattleActive=false;
  // Clear the camp checkpoint so the homepage does not auto-resume the
  // old round. All medals/upgrades remain in persistent progression storage.
  clearCampSession();
  location.replace(new URL('./index.html?armyHome=1&v=23',document.baseURI).href);
 }
 function begin(){
  if(!status(true).ready||frame)return;
  menu.hidden=true;dismissed=true;
  const iframe=document.createElement('iframe');
  iframe.title='正式最終戰役：軍營保衛戰';
  iframe.id='armyOfficialBattleFrame';
  iframe.dataset.armyOfficialBattle='1';
  iframe.setAttribute('allow','autoplay');
  iframe.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100;background:#10231b;pointer-events:auto;';
  const url=new URL('./battle-test.html',document.baseURI);
  url.searchParams.set('official','1');
  url.searchParams.set('fromCamp','1');
  url.searchParams.set('v','23');
  iframe.src=url.href;
  frame=iframe;
  document.body.classList.add('army-in-final-battle');
  window.armyMinigameActive=true;window.armyFinalBattleActive=true;
  document.body.append(iframe);
 }
 window.addEventListener('message',event=>{
  if(!frame||event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type==='ARMY3_OFFICIAL_BATTLE_CLOSE')goHome();
 });
 start.addEventListener('click',begin);
 cancel.addEventListener('click',()=>{menu.hidden=true;dismissed=true});
 return {
  status,
  draw(){if(status().ready)ring()},
  update(playerPos,blocked=false){
   if(frame||blocked){menu.hidden=true;return}
   const now=performance.now();
   if(now-lastScan<240)return;lastScan=now;
   if(!status().ready){menu.hidden=true;return}
   const distance=near(playerPos,BATTLE_RENDEZVOUS);
   if(distance>3.9){wasNear=false;dismissed=false;menu.hidden=true;return}
   if(distance<=2.65&&!dismissed&&!wasNear){wasNear=true;menu.hidden=false}
  },
  interact(playerPos,blocked=false){
   if(frame||blocked||!status(true).ready||near(playerPos,BATTLE_RENDEZVOUS)>2.95)return false;
   dismissed=false;wasNear=true;menu.hidden=false;return true;
  },
  isActive:()=>!!frame,
  close:goHome
 };
}
