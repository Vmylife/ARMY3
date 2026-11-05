// Shared 3D battle scene: sandbox laboratory OR official campaign mission.
import {initTalentLab} from './talentLab.js?v=4';
import {initWeaponLab} from './weaponLab.js?v=3';
const $=id=>document.getElementById(id);
const OFFICIAL=new URLSearchParams(location.search).get('official')==='1';
let authorised=false;
if(OFFICIAL){
 try{
  const parent=window.parent!==window?window.parent.armyProgression:null;
  const run=parent?.run(),keys=['blanket','shooting','grenade','weed','swipe','singing'];
  if(!run||!keys.every(k=>run.trainings?.[k]?.name)||run.battle?.outcome==='success')
   throw Error('正式戰役須先完成本輪六項訓練，且尚未防禦成功。');
  window.armyBattleOfficial=true;
  window.armyBattleOfficialLoadout={
   traits:Object.fromEntries(keys.map(k=>run.trainings[k]).map(t=>[t.name,
    Math.max(1,Math.min(3,Number(t.level)||1))])),
   weapons:{...parent.state().weapons},
   attemptId:'final-'+run.id+'-'+Date.now().toString(36)
  };
  document.body.classList.add('battle-official');
  $('battleIntro').querySelector('.battle-intro-kicker').textContent='正式最終戰役';
  $('battleIntro').querySelector('.battle-intro-sub').textContent=
   '本輪六項訓練天賦和已購買的武器等級已自動裝備。擊殺勳章將正式存入軍功簿。';
  $('battleStart').textContent='開始保衛軍營';
  $('battleReportNow').textContent='投降';
  // Same-origin frame shares sessionStorage with the live camp; award every
  // eligible enemy kill through the real progression system, not the lab.
  const script=document.createElement('script');
  script.src='./src/systems/armyProgression.js?v=8';
  await new Promise((resolve,reject)=>{
   script.addEventListener('load',resolve,{once:true});
   script.addEventListener('error',()=>reject(Error('軍功系統載入失敗')),{once:true});
   document.head.append(script);
  });
  authorised=!!window.armyProgression;
  if(!authorised)throw Error('正式軍功系統初始化失敗');
 }catch(error){
  $('battleIntro').hidden=true;$('errorText').textContent=String(error?.message||error);
  $('fatal').hidden=false;
 }
}else{
 initWeaponLab();initTalentLab();
}
let started=false;
$('battleExit').addEventListener('click',()=>{
 if(OFFICIAL){
  if(window.armyBattleTest?.running&&!window.armyBattleTest?.gameOver)
   window.armyBattleTest.endForReport();
  else window.parent.postMessage({type:'ARMY3_OFFICIAL_BATTLE_CLOSE'},location.origin);
 }else location.assign('./index.html');
});
$('retry').addEventListener('click',()=>location.reload());
$('battleStart').addEventListener('click',async()=>{
 if(started||(OFFICIAL&&!authorised))return;
 started=true;$('battleStart').disabled=true;$('battleStart').hidden=true;
 $('battleLoading').hidden=false;
 window.armySetLoading=(done,total,message)=>{
  $('battleLoadText').textContent=message||'載入戰場…';
  $('battleLoadBar').style.width=Math.max(1,Math.min(99,Math.round(done/Math.max(1,total)*100)))+'%';
 };
 window.armyLoadComplete=()=>{
  $('battleLoadBar').style.width='100%';
  $('battleIntro').hidden=true;$('battleHUD').hidden=false;
  $('battleReportNow').hidden=false;$('battleGrenade').hidden=false;
  $('battleReload').hidden=false;
  if(!OFFICIAL){$('battleGodToggle').hidden=false;$('battleWeaponLab').hidden=false}
 };
 window.armyLoadFailure=error=>{
  $('battleIntro').hidden=true;$('errorText').textContent=String(error?.message||error);
  $('fatal').hidden=false;
 };
 try{await import('./main.js?v=22')}
 catch(error){console.error('軍營保衛戰載入失敗',error);window.armyLoadFailure(error)}
});
