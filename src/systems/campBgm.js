
// ARMY3 main camp BGM v1.91: single clean control + real volume slider.
const MUTE_KEY='ARMY3_camp_music_muted_v1';
const VOLUME_KEY='ARMY3_camp_music_volume_v2';
const MAX_GAIN=.17;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const readPercent=()=>{try{const raw=localStorage.getItem(VOLUME_KEY);if(raw!==null&&Number.isFinite(+raw))return clamp(Math.round(+raw),0,100)}catch{}return 34};
let percent=readPercent();
let muted=false;
try{
  const legacyMuted=localStorage.getItem(MUTE_KEY)==='1';
  muted=legacyMuted||percent===0;
}catch{muted=percent===0}
let started=false,unlocked=false,raf=0,level=0,context=null,gain=null;
const audio=new Audio(new URL('../../assets/audio/army-camp-march-loop.mp3?v=1',import.meta.url).href);
audio.loop=true;
audio.preload='none';
audio.volume=0;
audio.setAttribute('playsinline','');
function initializeAudio(){
 if(context)return;
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return;
 try{
  context=new AC();
  const source=context.createMediaElementSource(audio);
  gain=context.createGain();
  gain.gain.value=0;
  source.connect(gain);gain.connect(context.destination);
  audio.volume=1;
 }catch(e){console.warn('背景音樂音量控制初始化失敗',e);context=null;gain=null;}
}
function ready(){return document.body.classList.contains('army-ready')}
function desiredVolume(){
 const active=started&&!muted&&percent>0&&ready()&&!document.hidden&&!document.body.classList.contains('army-in-minigame');
 return active ? MAX_GAIN*(percent/100) : 0;
}
function animateVolume(){
 raf=0;
 const desired=desiredVolume();
 level+=(desired-level)*.14;
 if(Math.abs(desired-level)<.002)level=desired;
 if(gain)gain.gain.value=level; else audio.volume=level;
 if(level!==desired)raf=requestAnimationFrame(animateVolume);
}
function fade(){if(!raf)raf=requestAnimationFrame(animateVolume)}
function play(){
 if(!started||muted||percent===0||document.hidden)return;
 initializeAudio();
 if(context?.state==='suspended')context.resume().catch(()=>{});
 const p=audio.play();
 if(p?.then)p.then(()=>{unlocked=true;fade()}).catch(()=>{unlocked=false});
 else{unlocked=true;fade()}
}
function start(){if(!started){started=true;play()}else if(!unlocked&&!muted&&percent>0)play();fade();}
function save(){try{localStorage.setItem(VOLUME_KEY,String(percent));localStorage.setItem(MUTE_KEY,muted?'1':'0')}catch{}}
function setPercent(v){percent=clamp(Math.round(+v||0),0,100);muted=percent===0;save();updateButton();if(percent>0&&started)play();fade();}
const style=document.createElement('style');
style.textContent=`
#campMusicWrap{position:fixed;z-index:21;right:max(12px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 16px);display:none}
body.army-ready #campMusicWrap{display:block}
#campMusicBtn{width:42px;height:42px;border:1.8px solid #a1b084;border-radius:14px;background:#244836ee;color:#f6ebc2;box-shadow:0 8px 20px #0b241a4a;font:900 20px/1 system-ui;display:grid;place-items:center;padding:0;touch-action:manipulation}
#campMusicBtn:focus-visible{outline:3px solid #e4b45d;outline-offset:3px}
#campMusicPanel{position:absolute;top:50px;right:0;width:190px;padding:12px 12px 10px;border-radius:16px;border:1px solid #d9c78977;background:#112a20f6;color:#f7efd0;box-shadow:0 12px 26px #07160f8a}
#campMusicPanel[hidden]{display:none!important}
#campMusicPanel .row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;font:800 12px/1.2 system-ui}
#campMusicPanel output{font-variant-numeric:tabular-nums;color:#f2d88e}
#campMusicRange{display:block;width:100%;accent-color:#edca7d;touch-action:pan-x}
`;
document.head.append(style);
const wrap=document.createElement('div');wrap.id='campMusicWrap';
const btn=document.createElement('button');btn.id='campMusicBtn';btn.type='button';btn.setAttribute('aria-label','調整軍營背景音樂音量');
const panel=document.createElement('div');panel.id='campMusicPanel';panel.hidden=true;
panel.innerHTML='<div class="row"><span>軍營背景音樂</span><output id="campMusicValue"></output></div><input id="campMusicRange" type="range" min="0" max="100" step="1" />';
wrap.append(btn,panel);document.body.append(wrap);
const range=panel.querySelector('#campMusicRange');
const out=panel.querySelector('#campMusicValue');
function updateButton(){
 btn.textContent=percent===0?'🔇':'♫';
 btn.title='軍營背景音樂 '+percent+'%';
 btn.setAttribute('aria-pressed',String(percent>0));
 range.value=String(percent);
 out.textContent=percent+'%';
}
updateButton();
btn.addEventListener('click',()=>{panel.hidden=!panel.hidden});
range.addEventListener('input',()=>setPercent(range.value));
document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!wrap.contains(e.target))panel.hidden=true},{passive:true});
document.getElementById('armyStart')?.addEventListener('click',start,{capture:true});
const watch=new MutationObserver(()=>{if(ready()){if(percent>0&&!muted){play();fade()}watch.disconnect()}});
watch.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pagehide',()=>{audio.pause();level=0;if(gain)gain.gain.value=0});
window.addEventListener('pageshow',()=>{if(started&&!muted&&percent>0)play()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();level=0;if(gain)gain.gain.value=0}else if(started&&!muted&&percent>0)play()});
document.addEventListener('pointerdown',()=>{if(started&&!muted&&percent>0&&audio.paused)play()},{capture:true,passive:true});
new MutationObserver(fade).observe(document.body,{attributes:true,attributeFilter:['class']});
