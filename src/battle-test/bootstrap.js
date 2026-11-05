// Independent battle-test loader. No modification to the normal ARMY3 homepage.
const $=id=>document.getElementById(id);
let started=false;
$('battleExit').addEventListener('click',()=>location.assign('./index.html'));
$('retry').addEventListener('click',()=>location.reload());
$('battleStart').addEventListener('click',async()=>{
 if(started)return;started=true;
 $('battleStart').disabled=true;$('battleStart').hidden=true;
 $('battleLoading').hidden=false;
 window.armySetLoading=(done,total,message)=>{
  $('battleLoadText').textContent=message||'載入戰場…';
  $('battleLoadBar').style.width=Math.max(1,Math.min(99,Math.round(done/Math.max(1,total)*100)))+'%';
 };
 window.armyLoadComplete=()=>{
  $('battleLoadBar').style.width='100%';
  $('battleIntro').hidden=true;$('battleHUD').hidden=false;$('battleGodToggle').hidden=false;$('battleReportNow').hidden=false;
 };
 window.armyLoadFailure=err=>{
  $('battleIntro').hidden=true;$('errorText').textContent=String(err?.message||err);
  $('fatal').hidden=false;
 };
 try{await import('./main.js?v=14')}
 catch(err){console.error('敵軍來襲測試版載入失敗',err);window.armyLoadFailure(err)}
});
