// ARMY3 official final-battle gateway. Lives in the NORMAL camp scene.
// Uses real six-training awards from armyProgression.run(); does not create
// invented training completions or write the battle laboratory selections.
const $=id=>document.getElementById(id);
export const BATTLE_RENDEZVOUS={x:22.4,z:16.8}; // Ammunition depot public entry.
const KINDS=['blanket','shooting','grenade','weed','swipe','singing'];
const COST={pistol:[20,12,18,25,36],rifle:[60,24,34,48,70]};
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const complete=()=>window.armyProgression?.run()?.trainings||{};
export function completedTrainingCount(){
 const records=complete();
 return KINDS.reduce((total,kind)=>total+(records[kind]?.name?1:0),0);
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
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(idx);
  gl.vertexAttribPointer(idx,3,gl.FLOAT,false,0,0);
 }
 gl.bindVertexArray(null);
 return ()=>{gl.useProgram(renderer.pFlat);gl.uniformMatrix4fv(renderer.flatVP,false,renderer.vp);
  gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLES,0,coords.length/3);gl.bindVertexArray(null)};
}
export function createFinalBattleGateway(renderer,{onBegin=()=>{},onReturn=()=>{}}={}){
 const ring=yellowGroundRing(renderer),mission=$('armyMissionObjective'),menu=$('battleAssemblyMenu'),
  start=$('battleAssemblyStart'),cancel=$('battleAssemblyCancel'),guns=$('battleAssemblyWeapons'),
  wallet=$('battleAssemblyWallet');
 if(!mission||!menu||!start||!cancel||!guns||!wallet)throw Error('正式戰役入口 UI 未載入');
 let frame=null,dismissed=false,wasClose=false,lastScan=0,lastKey='';
 let checkedAt=-Infinity,cachedStatus={count:0,won:false,ready:false};
 function progress(){return window.armyProgression}
 function status(force=false){
  // 3D draws 60 fps; avoid six-record sessionStorage parsing every frame.
  const now=performance.now();
  if(!force&&now-checkedAt<280)return cachedStatus;
  checkedAt=now;
  const run=progress()?.run(),records=run?.trainings||{};
  const won=run?.battle?.outcome==='success';
  const count=KINDS.reduce((sum,k)=>sum+(records[k]?.name?1:0),0);
  const code=won?'won':count===6?'battle':String(count);
  if(code!==lastKey){
   lastKey=code;
   mission.classList.toggle('army-mission-alert',count===6&&!won);
   mission.querySelector('strong').textContent=won?'防禦成功':count===6?'敵軍來襲':'完成訓練（'+count+'/6）';
   mission.querySelector('small').textContent=won?'營區安全':count===6?'前往彈藥庫集結':'完成六項不同訓練';
   mission.setAttribute('aria-label',won?'任務完成：防禦成功':count===6?'任務：敵軍來襲，前往彈藥庫':'任務：完成訓練 '+count+'/6');
  }
  cachedStatus={count,won,ready:count>=6&&!won};
  return cachedStatus;
 }
 function renderSupplies(){
  const s=progress()?.state();
  if(!s)return;
  const owned=(s.weapons?.pistol||0)+(s.weapons?.rifle||0);
  wallet.textContent='🎖 '+s.medals+' 枚 · '+(owned?
   '已購買的武器將帶入戰役':'尚未購買槍械，進場後只能使用拳頭');
  guns.replaceChildren();
  for(const [gun,label] of [['pistol','手槍'],['rifle','步槍']]){
   const level=Math.min(5,Math.max(0,Number(s.weapons?.[gun])||0));
   const row=document.createElement('div');row.className='army-assembly-weapon';
   const info=document.createElement('span');info.textContent=label+' · '+(level?'Lv.'+level:'未解鎖');
   const button=document.createElement('button');button.type='button';
   const cost=COST[gun][level];
   button.textContent=level>=5?'已滿級':'🎖 '+cost+' 升級';
   button.disabled=level>=5||s.medals<cost;
   button.addEventListener('click',()=>{
    const transaction=progress()?.buy('weapon',gun);
    if(transaction?.success)renderSupplies();
   });
   row.append(info,button);guns.append(row);
  }
 }
 function close(){
  if(!frame)return;
  frame.remove();frame=null;
  document.body.classList.remove('army-in-final-battle');
  window.armyMinigameActive=false;
  window.armyFinalBattleActive=false;
  dismissed=true;wasClose=false;menu.hidden=true;
  lastScan=0;lastKey='';checkedAt=-Infinity;
  status(true);
  onReturn();
 }
 function begin(){
  const s=status(true);if(!s.ready||frame)return;
  try{onBegin()}catch(error){
   console.error('最終戰役進度儲存失敗',error);
   alert('無法儲存軍營位置，請稍後再試。');return;
  }
  menu.hidden=true;dismissed=true;
  const iframe=document.createElement('iframe');
  iframe.title='正式最終戰役：軍營保衛戰';
  iframe.id='armyOfficialBattleFrame';
  iframe.dataset.armyOfficialBattle='1';
  iframe.setAttribute('allow','autoplay');
  iframe.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100;background:#10231b;pointer-events:auto;';
  const url=new URL('./battle-test.html',document.baseURI);
  url.searchParams.set('official','1');url.searchParams.set('fromCamp','1');url.searchParams.set('v','22');
  iframe.src=url.href;
  frame=iframe;
  document.body.classList.add('army-in-final-battle');
  window.armyMinigameActive=true;window.armyFinalBattleActive=true;
  document.body.append(iframe);
 }
 const receive=event=>{
  if(!frame||event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type==='ARMY3_OFFICIAL_BATTLE_CLOSE')close();
 };
 window.addEventListener('message',receive);
 start.addEventListener('click',begin);
 cancel.addEventListener('click',()=>{menu.hidden=true;dismissed=true});
 return {
  status,
  draw(){if(status().ready)ring()},
  update(playerPos,blocked=false){
   if(frame||blocked){menu.hidden=true;return}
   const now=performance.now();
   if(now-lastScan<240)return;lastScan=now;
   const s=status();
   if(!s.ready){menu.hidden=true;return}
   const distance=near(playerPos,BATTLE_RENDEZVOUS);
   if(distance>3.9){wasClose=false;dismissed=false;menu.hidden=true;return}
   if(distance<=2.65&&!dismissed&&!wasClose){
    wasClose=true;renderSupplies();menu.hidden=false;
   }
  },
  interact(playerPos,blocked=false){
   if(frame||blocked||!status().ready||near(playerPos,BATTLE_RENDEZVOUS)>2.95)return false;
   renderSupplies();menu.hidden=false;dismissed=false;wasClose=true;
   return true;
  },
  isActive:()=>!!frame,
  close
 };
}
