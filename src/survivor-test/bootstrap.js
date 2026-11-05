// Independent crowd benchmark. Does not touch player progression / medals.
import {BattlePerks} from '../battle-test/talentLab.js?v=9';
import {BattleWeaponLevels} from '../battle-test/weaponLab.js?v=3';
const $=id=>document.getElementById(id);
window.armyBattleOfficial=false;
window.armyBattleTalents=new BattlePerks({});
window.armyBattleWeapons=new BattleWeaponLevels({rifle:5,pistol:0});
let started=false;
$('battleExit').addEventListener('click',()=>location.assign('./index.html?armyHome=1&v=survivor'));
$('retry').addEventListener('click',()=>location.reload());
$('battleStart').addEventListener('click',async()=>{
 if(started)return;started=true;
 const button=$('battleStart');button.disabled=true;button.hidden=true;
 $('battleLoading').hidden=false;
 window.armySetLoading=(done,total,message)=>{
  $('battleLoadText').textContent=message||'準備軍營…';
  $('battleLoadBar').style.width=Math.max(1,Math.min(99,Math.round(done/Math.max(1,total)*100)))+'%';
 };
 window.armyLoadComplete=()=>{
  $('battleLoadBar').style.width='100%';
  document.body.classList.add('battle-loaded','survivor-loaded');
  $('battleIntro').hidden=true;
  $('stressPanel').hidden=false;
  $('battleGodToggle').hidden=false;
 };
 window.armyLoadFailure=error=>{
  $('battleIntro').hidden=true;
  $('errorText').textContent=String(error?.message||error);
  $('fatal').hidden=false;
 };
 try{await import('./main.js?v=1')}
 catch(error){console.error('倖存者測試載入失敗',error);window.armyLoadFailure(error)}
});
