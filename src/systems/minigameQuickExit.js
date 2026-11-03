/* ARMY3 v1.92 — one-tap return to camp from every official mini-game.
 * The grenade workshop owns its full-screen throwing iframe; don't create
 * another button inside that child. Parent control remains above the iframe.
 */
import {returnToCamp} from './campSession.js?v=144';

const kind=document.body.dataset.armyMinigame||'';
const isEmbeddedGrenade=kind==='grenade-arena'&&
 new URLSearchParams(location.search).has('embedded');

if(kind){
 const style=document.createElement('style');
 style.id='armyQuickExitStyles';
 style.textContent=`
 #armyQuickExit{
  position:fixed!important;
  top:calc(10px + env(safe-area-inset-top))!important;
  left:calc(10px + env(safe-area-inset-left))!important;
  right:auto!important;bottom:auto!important;
  z-index:250!important;
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  min-width:91px;min-height:42px;padding:9px 13px;
  box-sizing:border-box;
  border:1px solid rgba(238,218,165,.77);border-radius:12px;
  background:rgba(22,48,36,.94);
  color:#f6e6bc;font:850 14px/1.15 system-ui,-apple-system,"Noto Sans TC",sans-serif;
  box-shadow:0 5px 17px rgba(6,22,13,.42);
  -webkit-appearance:none;appearance:none;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
  cursor:pointer;touch-action:manipulation;pointer-events:auto;
 }
 #armyQuickExit:active{transform:scale(.97);background:#365540}
 #armyQuickExit:focus-visible{outline:2px solid #ffe5a3;outline-offset:3px}
 #armyQuickExit:disabled{opacity:.65;cursor:default}
 /* Keep score counters clear of the button on compact phones. */
 body[data-army-minigame="blanket"] #hud{
   top:calc(69px + env(safe-area-inset-top));
 }
 body[data-army-minigame="blanket"] #message{
   top:calc(139px + env(safe-area-inset-top));
 }
 body[data-army-minigame="shooting"] .hudTop{
   top:calc(65px + env(safe-area-inset-top));
 }
 body[data-army-minigame="shooting"] .shootStageHud{
   top:calc(131px + env(safe-area-inset-top));
 }
 body[data-army-minigame="shooting"] #muteBtn{
   top:calc(171px + env(safe-area-inset-top));
 }
 body[data-army-minigame="grenade"] #root{
   padding-top:calc(65px + env(safe-area-inset-top));
 }
 /* The nested full-screen throw scene is beneath its workshop's exit button. */
 body[data-army-minigame="grenade-arena"] #top{
   top:calc(64px + env(safe-area-inset-top));
 }
 body[data-army-minigame="grenade-arena"] #powerDock{
   top:calc(227px + env(safe-area-inset-top));
 }
 @media(orientation:landscape) and (max-height:530px){
  body[data-army-minigame="blanket"] #hud{top:calc(57px + env(safe-area-inset-top))}
  body[data-army-minigame="shooting"] .hudTop{top:calc(57px + env(safe-area-inset-top))}
  body[data-army-minigame="shooting"] .shootStageHud{top:calc(115px + env(safe-area-inset-top))}
  body[data-army-minigame="grenade-arena"] #top{top:calc(54px + env(safe-area-inset-top))}
  body[data-army-minigame="grenade-arena"] #powerDock{top:calc(9px + env(safe-area-inset-top))}
 }
 `;
 document.head.append(style);
 if(!isEmbeddedGrenade){
  const btn=document.createElement('button');
  btn.id='armyQuickExit';btn.type='button';
  btn.textContent='← 退出';
  btn.setAttribute('aria-label','隨時退出小遊戲並返回軍營');
  let leaving=false;
  btn.addEventListener('pointerdown',event=>event.stopPropagation(),{passive:true});
  btn.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(leaving)return;
   leaving=true;btn.disabled=true;btn.textContent='返回中…';
   try{
    returnToCamp();
   }catch(err){
    console.error('[國軍小遊戲] 返回軍營失敗',err);
    location.replace(new URL('./index.html?armyResume=1',location.href));
   }
  });
  document.body.append(btn);
 }
}
