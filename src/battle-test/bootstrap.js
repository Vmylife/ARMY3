// Shared 3D battle scene: sandbox laboratory OR official campaign mission.
import {initTalentLab} from './talentLab.js?v=6';
import {initWeaponLab} from './weaponLab.js?v=3';
import {needsTemporaryPistol} from '../systems/temporaryPistol.js?v=1';
const $=id=>document.getElementById(id);
const OFFICIAL=new URLSearchParams(location.search).get('official')==='1';
let authorised=false;
if(OFFICIAL){
 try{
  const parent=window.parent!==window?window.parent.armyProgression:null;
  const run=parent?.run(),results=parent?.trainingRewards?.()||[];
   const ownedWeapons={...parent?.state?.()?.weapons};
   const temporaryPistol=needsTemporaryPistol(ownedWeapons);
  if(!run||results.length!==6||run.battle?.outcome)
   throw Error('正式戰役須先取得六個不重複的訓練天賦，且本輪尚未結束。');
  window.armyBattleOfficial=true;
  window.armyBattleOfficialLoadout={
   traits:Object.fromEntries(results.map(t=>[t.name,
    Math.max(1,Math.min(3,Number(t.level)||1))])),
   weapons:temporaryPistol?{...ownedWeapons,pistol:1}:ownedWeapons,
   temporaryPistol,
   attemptId:'final-'+run.id+'-'+Date.now().toString(36)
  };
  document.body.classList.add('battle-official');
  // One confirmation is enough: the user already joined at the ammo depot.
  // Keep the official loading overlay to ONE simple sentence.
  $('battleIntro').querySelector('h1').textContent='敵軍來襲中';
  $('battleIntro').querySelector('.battle-intro-kicker').textContent='';
  $('battleIntro').querySelector('.battle-intro-sub').textContent='';
  $('battleStart').textContent='開始保衛軍營';
  $('battleReportNow').textContent='投降';
  // Same-origin frame shares sessionStorage with the live camp; award every
  // eligible enemy kill through the real progression system, not the lab.
  const script=document.createElement('script');
  script.src='./src/systems/armyProgression.js?v=14';
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
  document.body.classList.add('battle-loaded');
  $('battleLoadBar').style.width='100%';
  $('battleIntro').hidden=true;$('battleHUD').hidden=false;
  $('battleReportNow').hidden=false;
  $('battleReload').hidden=false;
  if(!OFFICIAL){$('battleGodToggle').hidden=false;$('battleWeaponLab').hidden=false}
 };
 window.armyLoadFailure=error=>{
  $('battleIntro').hidden=true;$('errorText').textContent=String(error?.message||error);
  $('fatal').hidden=false;
 };
 try{await import('./main.js?v=27')}
 catch(error){console.error('軍營保衛戰載入失敗',error);window.armyLoadFailure(error)}
});
// Official battle starts immediately after authorisation; no second button.
if(OFFICIAL&&authorised)queueMicrotask(()=>$('battleStart')?.click());
