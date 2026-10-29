
/* ARMY3 original minigame music v1.91.
   Fixes duplicate grenade controls, ugly off-screen icons, and iOS text selection. */
const TRACKS={
 blanket:'../../assets/audio/minigames/blanket-parade-loop.mp3',
 grenade:'../../assets/audio/minigames/grenade-ordnance-loop.mp3'
};
const CLAMP=(v,min,max)=>Math.max(min,Math.min(max,v));
const CONTROL_STYLE=`
[data-army-bgm]{position:fixed;top:calc(env(safe-area-inset-top) + 16px);right:max(12px,env(safe-area-inset-right));z-index:130}
[data-army-bgm] .army-bgm-btn{width:42px;height:42px;display:grid;place-items:center;border:1.8px solid #9faf86;border-radius:14px;background:#244836ee;color:#f6ebc2;font:900 20px/1 system-ui;box-shadow:0 8px 20px #0b241a4a;padding:0;touch-action:manipulation}
[data-army-bgm] .army-bgm-btn:focus-visible{outline:3px solid #e4b45d;outline-offset:3px}
[data-army-bgm] .army-bgm-pop{position:absolute;top:50px;right:0;width:182px;padding:12px 12px 10px;background:#112a20f6;color:#f7efd0;border:1px solid #d9c78977;border-radius:16px;box-shadow:0 12px 26px #07160f8a}
[data-army-bgm] .army-bgm-pop[hidden]{display:none!important}
[data-army-bgm] .army-bgm-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;font:800 12px/1.2 system-ui}
[data-army-bgm] .army-bgm-num{font-variant-numeric:tabular-nums;color:#f2d88e}
[data-army-bgm] input[type="range"]{display:block;width:100%;accent-color:#edca7d;touch-action:pan-x}
`;
const NO_SELECT_STYLE=`
html,body,canvas,button,div,p,span,strong,small,label,h1,h2,h3{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
*{-webkit-tap-highlight-color:transparent}
input[type="range"]{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
`;
function ensureStyle(doc,id,css){
 try{
  if(!doc||doc.getElementById(id))return;
  const style=doc.createElement('style');style.id=id;style.textContent=css;doc.head.append(style);
 }catch{}
}
export function installMinigameBgm(kind,{host=window,sceneWindow=window,control=true}={}){
 if(!TRACKS[kind])throw new Error('Unsupported minigame BGM: '+kind);
 const tag='__armyMinigameBgm_'+kind;
 try{host[tag]?.dispose?.()}catch{}
 const doc=host.document,sceneDoc=sceneWindow.document;
 ensureStyle(doc,'armyNoSelectGlobal',NO_SELECT_STYLE);
 if(sceneDoc!==doc)ensureStyle(sceneDoc,'armyNoSelectGlobal',NO_SELECT_STYLE);
 if(kind==='grenade')ensureStyle(doc,'armyGrenadeBgmUi',CONTROL_STYLE);
 const storageKey='ARMY3_minigame_bgm_'+kind+'_volume_v1';
 const stored=()=>{try{const s=host.localStorage.getItem(storageKey);if(s!==null&&Number.isFinite(+s))return CLAMP(+s,0,100)}catch{}return kind==='blanket'?57:52};
 let percent=stored(),started=false,disposed=false,audio=null,ctx=null,gain=null;
 let duckUntil=0,duckFactor=1,lastTarget=-1,pendingPlay=false;
 const disposers=[],ui=[];
 const listen=(el,ev,fn,opts)=>{if(!el)return;el.addEventListener(ev,fn,opts);disposers.push(()=>el.removeEventListener(ev,fn,opts))};
 const amp=0.27;
 function init(){
   if(disposed||audio)return;
   const src=new URL(TRACKS[kind],import.meta.url).href;
   audio=new host.Audio(src);audio.preload='auto';audio.loop=true;audio.playsInline=true;
   audio.setAttribute('playsinline','');audio.volume=0;
   try{
     const AC=host.AudioContext||host.webkitAudioContext;
     if(AC){ctx=new AC();const source=ctx.createMediaElementSource(audio);gain=ctx.createGain();gain.gain.value=0;source.connect(gain);gain.connect(ctx.destination);audio.volume=1;}
   }catch(e){console.warn('[ARMY3 music] WebAudio fallback',e);gain=null;ctx=null;}
 }
 function sourceReady(){
   if(kind==='blanket'){
     const state=sceneWindow.__blanketTest?.state;
     return !!state&&!['loading','intro','result'].includes(state);
   }
   if(host!==sceneWindow){
     const intro=doc.getElementById('intro');
     return !!intro&&intro.style.display==='none';
   }
   const workshopIntro=sceneDoc.getElementById('startBtn')&&sceneDoc.getElementById('intro');
   if(workshopIntro)return workshopIntro.style.display==='none';
   const state=sceneWindow.__grenadeTest?.state;
   return !!state&&!['intro','end'].includes(state);
 }
 function gesture(e){
   if(disposed||e?.isTrusted===false)return;
   const target=e?.target,button=target?.closest?.('#play,#startBtn,#skipIntro');
   if(button){
     if((kind==='blanket'&&button.id==='play')||(kind==='grenade'&&(button.id==='startBtn'||button.id==='skipIntro'))){started=true;play();}
   }else if(sourceReady()){
     started=true;
     if(!audio||audio.paused)play();
   }
 }
 function play(){
   if(disposed||percent===0||host.document.hidden)return;
   init();if(!audio)return;
   try{if(ctx?.state==='suspended')ctx.resume().catch(()=>{});}catch{}
   if(!audio.paused||pendingPlay)return;
   try{
     pendingPlay=true;
     const attempt=audio.play();
     if(attempt&&attempt.then)attempt.then(()=>{pendingPlay=false}).catch(()=>{pendingPlay=false});
     else pendingPlay=false;
   }catch{pendingPlay=false}
 }
 function targetLevel(){
   if(disposed||!started||!sourceReady()||host.document.hidden||percent===0)return 0;
   let factor=1;
   if(kind==='blanket'){
     if(sceneWindow.__blanketTest?.state==='collapsing')factor=.55;
   }else{
     const phase=sceneWindow.__grenadeTest?.state;
     if(phase==='flight')factor=.20;
     else if(phase==='landed')factor=.34;
     else if(phase==='blast')factor=.14;
     else if(phase==='aimX'||phase==='aimZ')factor=.62;
     else if(phase==='end')factor=.3;
   }
   if(host.performance.now()<duckUntil)factor=Math.min(factor,duckFactor);
   return amp*(percent/100)*factor;
 }
 function update(){
   if(disposed)return;
   const wanted=targetLevel();
   if(Math.abs(wanted-lastTarget)>.0001){
     lastTarget=wanted;
     if(ctx&&gain){gain.gain.setTargetAtTime(wanted,ctx.currentTime,.14)}
     else if(audio)audio.volume=wanted;
   }
   if(wanted<=0&&audio&&!audio.paused&&percent===0)audio.pause();
 }
 function setVolume(v){
   if(!Number.isFinite(+v))return;
   percent=CLAMP(Math.round(+v),0,100);
   try{host.localStorage.setItem(storageKey,String(percent))}catch{}
   if(percent>0&&started)play();
   if(percent===0&&audio){if(gain&&ctx)gain.gain.setTargetAtTime(0,ctx.currentTime,.025);else audio.volume=0;}
   lastTarget=-1;update();updateUI();
 }
 function duck(ms=1200,factor=.35){duckUntil=host.performance.now()+ms;duckFactor=CLAMP(factor,0,1);update();}
 function mountFloatingControl(targetDoc){
   if(!targetDoc||!targetDoc.body)return;
   const holder=targetDoc.createElement('div');holder.dataset.armyBgm=kind;
   const btn=targetDoc.createElement('button');btn.type='button';btn.className='army-bgm-btn';btn.setAttribute('aria-label','調整背景音樂音量');
   const pop=targetDoc.createElement('div');pop.className='army-bgm-pop';pop.hidden=true;
   pop.innerHTML='<div class="army-bgm-row"><span>背景音樂</span><span class="army-bgm-num"></span></div><input type="range" min="0" max="100" step="1" aria-label="背景音樂音量">';
   const input=pop.querySelector('input');
   const num=pop.querySelector('.army-bgm-num');
   holder.append(btn,pop);targetDoc.body.append(holder);
   listen(btn,'click',()=>{pop.hidden=!pop.hidden});
   listen(input,'input',()=>setVolume(input.value));
   listen(targetDoc,'pointerdown',e=>{if(!pop.hidden&&!holder.contains(e.target))pop.hidden=true},{passive:true});
   ui.push({holder,btn,input,num});
 }
 function updateUI(){for(const e of ui){e.btn.textContent=percent===0?'🔇':'♫';e.btn.title='背景音樂 '+percent+'%';e.input.value=percent;e.num.textContent=percent+'%';}}
 for(const d of new Set([doc,sceneDoc])){
   listen(d,'pointerdown',gesture,{passive:true,capture:true});
   listen(d,'keydown',gesture,{passive:true,capture:true});
   listen(d,'click',gesture,{capture:true});
 }
 if(control&&kind==='grenade')mountFloatingControl(doc);
 if(sceneWindow!==host)listen(sceneWindow,'pagehide',()=>{try{host[tag]?.dispose?.()}catch{}});
 listen(host,'pagehide',()=>{try{host[tag]?.dispose?.()}catch{}});
 listen(doc,'visibilitychange',()=>{if(doc.hidden){if(audio)audio.pause()}else if(started)play()});
 const timer=host.setInterval(update,145);
 if(kind!=='blanket')updateUI();
 const api={setVolume,getVolume:()=>percent,duck,play,dispose(){if(disposed)return;disposed=true;host.clearInterval(timer);for(const off of disposers)try{off()}catch{};for(const item of ui)item.holder.remove();try{audio?.pause()}catch{};try{ctx?.close()}catch{};if(host[tag]===api)delete host[tag];}};
 host[tag]=api;
 return api;
}
