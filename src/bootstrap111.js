import {getReturningCampSession} from './systems/campSession.js?v=144';
// ARMY3 v1.90: same camp boot; only suspend the expensive camp WebGL loop
// while a prewarmed minigame iframe covers the screen.
const $=id=>document.getElementById(id);
const button=$('armyStart'),loading=$('armyLoading'),bar=$('armyBar');
let highestPercentage=0;
window.armySetLoading=(done,total,message)=>{
 loading.hidden=false;$('armyMessage').textContent=message;
 const percentage=highestPercentage=Math.max(highestPercentage,Math.min(99,Math.floor(100*done/Math.max(1,total))));
 bar.style.width=percentage+'%';$('armyCount').textContent=percentage+'%';
};
window.armyLoadComplete=()=>{
 $('armyMessage').textContent='完成！準備進入軍營';bar.style.width='100%';$('armyCount').textContent='100%';
 document.body.classList.add('army-ready');$('armyHome').hidden=true;
};
window.armyLoadFailure=err=>{
 loading.hidden=false;$('armyMessage').textContent='載入失敗：'+String(err?.message||err);
 $('armyMessage').style.color='#a52c27';button.hidden=false;button.disabled=false;button.textContent='重新載入';button.onclick=()=>location.reload();
};
async function loadCampWithPause(){
 const sourceURL=new URL('./src/main111.js?v=144',location.href);
 const response=await fetch(sourceURL,{cache:'default'});
 if(!response.ok)throw Error('軍營程式 HTTP '+response.status);
 let source=await response.text();
 const needle='  function tick(now){\n   try{';
 if(source.split(needle).length!==2)throw Error('軍營更新迴圈版本不相容，請確認目前 GitHub 版本');
 source=source.replace(needle,`  function tick(now){
   // Do not update/render the hidden 3D camp while a loaded minigame is open.
   // Clock still advances so returning to the camp never causes a large dt jump.
   if(window.armyMinigameActive){last=now;requestAnimationFrame(tick);return;}
   try{`);
 // Blob modules need full import URLs; preserve the current app's exact module versions.
 source=source.replace(/(\bfrom\s+)(['"])(\.\/[^'"]+)\2/g,(_m,p,q,path)=>p+q+new URL(path,sourceURL).href+q);
 const blob=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
 try{await import(blob)}finally{URL.revokeObjectURL(blob)}
}
button.addEventListener('click',async()=>{
 button.disabled=true;button.hidden=true;
 window.armySetLoading(0,1,getReturningCampSession()?'正在恢復軍營進度…':'建立軍營場景…');
 try{
  await import('./map/activeCampLayout116.js?v=126');
  await import('./lighting96.js?v=096');
  await loadCampWithPause();
 }catch(error){console.error('軍營載入錯誤',error);window.armyLoadFailure(error)}
},{once:true});
if(getReturningCampSession()){
 $('armyHome').querySelector('h1').textContent='返回軍營';
 $('armyHome').querySelector('.army-home__tagline').textContent='正在恢復你剛剛的位置';
 button.hidden=true;queueMicrotask(()=>{button.hidden=false;button.click()});
}
