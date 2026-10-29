/* ARMY3 original minigame music v1.70. One track per minigame, not the main-camp song.
   Audio is deliberately quieter than effects and follows the iOS user-gesture rule.
   The grenade track lives in the parent workshop document so it survives the iframe handoff. */
const TRACKS={
 blanket:'../../assets/audio/minigames/blanket-parade-loop.mp3',
 grenade:'../../assets/audio/minigames/grenade-ordnance-loop.mp3'
};
const CLAMP=(v,min,max)=>Math.max(min,Math.min(max,v));
export function installMinigameBgm(kind,{host=window,sceneWindow=window,control=true}={}){
 if(!TRACKS[kind])throw new Error('Unsupported minigame BGM: '+kind);
 const tag='__armyMinigameBgm_'+kind;
 try{host[tag]?.dispose?.()}catch{}
 const doc=host.document,sceneDoc=sceneWindow.document;
 const storageKey='ARMY3_minigame_bgm_'+kind+'_volume_v1';
 const stored=()=>{try{const s=host.localStorage.getItem(storageKey);if(s!==null&&Number.isFinite(+s))return CLAMP(+s,0,100)}catch{}return kind==='blanket'?57:52};
 let percent=stored(),started=false,disposed=false,audio=null,ctx=null,gain=null;
 let duckUntil=0,duckFactor=1,lastTarget=-1,pendingPlay=false;
 const disposers=[],ui=[];
 const listen=(el,ev,fn,opts)=>{if(!el)return;el.addEventListener(ev,fn,opts);disposers.push(()=>el.removeEventListener(ev,fn,opts))};
 const amp=0.27; // 100% BGM deliberately stays below the effect peaks.
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
     // In the workshop, the 3D arena is preloaded hidden. Stay active while crafting.
     return !!intro&&intro.style.display==='none';
   }
   const state=sceneWindow.__grenadeTest?.state;
   return !!state&&!['intro','end'].includes(state);
 }
 function gesture(e){
   if(disposed)return;
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
 function mountControl(where,inline=false){
   if(!where||!where.createElement)return;
   const anchor=inline?where.querySelector('#heading')||where.querySelector('#titlebar'):null;
   const holder=where.createElement('div');holder.dataset.armyBgm=kind;
   holder.style.cssText=inline?'position:relative;display:inline-flex;align-items:center;margin-left:4px;z-index:110;':'position:fixed;top:calc(env(safe-area-inset-top) + 66px);right:max(12px,env(safe-area-inset-right));z-index:110;';
   const btn=where.createElement('button');btn.type='button';btn.setAttribute('aria-label','調整背景音樂音量');
   btn.style.cssText='width:35px;height:34px;display:grid;place-items:center;border:1px solid #c8d7ab77;border-radius:9px;background:#25442ce8;color:#f7ecc2;font:900 18px system-ui;touch-action:manipulation;cursor:pointer;';
   const pop=where.createElement('div');pop.hidden=true;
   pop.style.cssText=inline?'position:absolute;top:38px;right:0;width:187px;padding:12px;background:#132a20f5;color:#fff3d9;border:1px solid #e3ca8477;border-radius:12px;box-shadow:0 8px 16px #07130c88;':'position:absolute;top:38px;right:0;width:187px;padding:12px;background:#132a20f5;color:#fff3d9;border:1px solid #e3ca8477;border-radius:12px;box-shadow:0 8px 16px #07130c88;';
   const title=where.createElement('label');title.style.cssText='font:800 12px system-ui;display:block;margin-bottom:6px;';title.textContent='背景音樂 ';
   const num=where.createElement('span');num.textContent=percent+'%';title.append(num);
   const input=where.createElement('input');input.type='range';input.min='0';input.max='100';input.step='1';input.value=percent;input.setAttribute('aria-label','背景音樂音量');input.style.cssText='display:block;width:100%;accent-color:#edca7d;touch-action:pan-x;';
   pop.append(title,input);holder.append(btn,pop);
   if(anchor){anchor.append(holder)}else where.body.append(holder);
   listen(btn,'click',()=>{pop.hidden=!pop.hidden});listen(input,'input',()=>setVolume(input.value));
   listen(where,'pointerdown',e=>{if(!pop.hidden&&!holder.contains(e.target))pop.hidden=true},{passive:true});
   ui.push({holder,btn,input,num});
 }
 function updateUI(){for(const e of ui){e.btn.textContent=percent===0?'🔇':'♫';e.btn.title='背景音樂 '+percent+'%';e.input.value=percent;e.num.textContent=percent+'%'}}
 // User gestures can originate in the parent workshop *or* the full-screen 3D iframe.
 for(const d of new Set([doc,sceneDoc])){
   listen(d,'pointerdown',gesture,{passive:true,capture:true});
   listen(d,'keydown',gesture,{passive:true,capture:true});
   listen(d,'click',gesture,{capture:true});
 }
 if(control&&kind==='grenade'){
   if(host!==sceneWindow){mountControl(doc,true);mountControl(sceneDoc,false)}
   else mountControl(doc,false);
 }
 if(sceneWindow!==host)listen(sceneWindow,'pagehide',()=>{try{host[tag]?.dispose?.()}catch{}});
 listen(host,'pagehide',()=>{try{host[tag]?.dispose?.()}catch{}});
 listen(doc,'visibilitychange',()=>{if(doc.hidden){if(audio)audio.pause()}else if(started)play()});
 const timer=host.setInterval(update,145);
 if(kind==='blanket'){
   // Do not add a second floating button over the top HUD; its existing sound panel contains the music slider.
 }else updateUI();
 const api={setVolume,getVolume:()=>percent,duck,play,dispose(){if(disposed)return;disposed=true;host.clearInterval(timer);for(const off of disposers)try{off()}catch{};for(const item of ui)item.holder.remove();try{audio?.pause()}catch{};try{ctx?.close()}catch{};if(host[tag]===api)delete host[tag];}};
 host[tag]=api;
 return api;
}
