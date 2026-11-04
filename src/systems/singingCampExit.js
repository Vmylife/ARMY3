/* ARMY3 military singing – instant safe exit from any phase and the report. */
import {returnToCamp} from './campSession.js?v=144';

// The shared mini-game quit button keeps its ordinary click listener.
// During capture, first stop any active original vocals, review backing,
// countdown sounds and locally scheduled Web Audio nodes.
document.addEventListener('click',event=>{
 const target=event.target;
 if(!(target instanceof Element))return;
 const quickExit=target.closest('#armyQuickExit');
 const reportExit=target.closest('[data-army-return]');
 if(!quickExit&&!reportExit)return;
 try{window.armySingingTest?.stop?.()}catch(err){console.warn('軍歌音訊停止失敗',err)}
 if(reportExit){
  event.preventDefault();
  event.stopPropagation();
  returnToCamp();
 }
},true);
