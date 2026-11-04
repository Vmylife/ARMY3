
// ARMY3 main camp BGM v1.92: compact settings and audio controls.
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
style.textContent="\n#campMusicWrap{position:fixed;z-index:22;left:max(3px,env(safe-area-inset-left));right:auto;top:calc(env(safe-area-inset-top) + 3px);display:none}\nbody.army-ready #campMusicWrap{display:block}\n#campMusicBtn{width:27px;height:27px;border:1px solid #a1b084;border-radius:9px;background:#244836e8;color:#f6ebc2;box-shadow:0 2px 8px #0b241a55;display:grid;place-items:center;padding:0;touch-action:manipulation}\n#campMusicBtn svg{width:17px;height:17px;display:block;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\n#campMusicBtn:focus-visible,#campMusicPanel button:focus-visible{outline:2px solid #e4b45d;outline-offset:2px}\n#campMusicPanel{position:absolute;top:139px;left:0;right:auto;width:204px;padding:9px;border-radius:13px;border:1px solid #d9c78977;background:#112a20f8;color:#f7efd0;box-shadow:0 8px 22px #07160f8a}\n@media(orientation:landscape){#campMusicPanel{top:116px}}\n#campMusicPanel[hidden],#campSettingsSound[hidden]{display:none!important}\n#campMusicPanel button{touch-action:manipulation;cursor:pointer;font-family:system-ui,-apple-system,'PingFang TC',sans-serif}\n#campSettingsRetire,#campSettingsAudio{display:block;width:100%;min-height:38px;padding:9px 11px;text-align:left;background:#214234;border:1px solid #a4b29155;color:#f5e9c8;font-size:13px;font-weight:850;border-radius:9px}\n#campSettingsRetire{border-color:#bf91784d;color:#f2c5ae}\n#campSettingsAudio{margin-top:6px}\n#campSettingsAudio[aria-expanded=\"true\"]{background:#335b42}\n#campSettingsSound{border-top:1px solid #d9c78940;margin-top:9px;padding:11px 3px 4px}\n#campSettingsSound .row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 9px;font:800 12px/1.2 system-ui}\n#campSettingsSound output{font-variant-numeric:tabular-nums;color:#f2d88e}\n#campMusicRange{display:block;width:100%;accent-color:#edca7d;touch-action:pan-x;margin:4px 0 9px}\n#campSfxToggle{display:block;width:100%;border:1px solid #9db09a55;border-radius:9px;background:#244b38;color:#f5e8c9;padding:8px;font-size:12px;font-weight:800}\n";
document.head.append(style);
const wrap=document.createElement('div');wrap.id='campMusicWrap';
const btn=document.createElement('button');btn.id='campMusicBtn';btn.type='button';btn.setAttribute('aria-label','設定');
btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z"/><path d="M19 13.5l1.3-1.5L19 10.5l-1.7-.3-.7-1.7.9-1.4-2-2-1.4.9-1.7-.7L12 3l-2.4 2.3-1.7.7-1.4-.9-2 2 .9 1.4-.7 1.7-1.7.3L2.7 12 4 13.5l1.7.3.7 1.7-.9 1.4 2 2 1.4-.9 1.7.7L12 21l1.5-2.3 1.7-.7 1.4.9 2-2-.9-1.4.7-1.7Z"/></svg>';
const panel=document.createElement('div');panel.id='campMusicPanel';panel.hidden=true;
panel.innerHTML='<button id="campSettingsRetire" type="button">立即退伍</button>'+
 '<button id="campSettingsAudio" type="button" aria-expanded="false">音效設定</button>'+
 '<div id="campSettingsSound" hidden>'+
 '<div class="row"><span>背景音樂</span><output id="campMusicValue"></output></div>'+
 '<input id="campMusicRange" type="range" min="0" max="100" step="1" />'+
 '<button id="campSfxToggle" type="button"></button></div>';
wrap.append(btn,panel);document.body.append(wrap);
const range=panel.querySelector('#campMusicRange'),out=panel.querySelector('#campMusicValue');
const sound=panel.querySelector('#campSettingsSound'),soundBtn=panel.querySelector('#campSettingsAudio');
const sfxBtn=panel.querySelector('#campSfxToggle'),retireBtn=panel.querySelector('#campSettingsRetire');
let sfxMuted=false;try{sfxMuted=localStorage.getItem('ARMY3_sfx_muted_v1')==='1'}catch{}
function updateButton(){
 btn.title='設定';range.value=String(percent);out.textContent=percent+'%';
 sfxBtn.textContent='戰鬥／打靶音效：'+(sfxMuted?'關':'開');
 sfxBtn.setAttribute('aria-pressed',String(!sfxMuted));
}
updateButton();
btn.addEventListener('click',()=>{
 panel.hidden=!panel.hidden;
 if(!panel.hidden){sound.hidden=true;soundBtn.setAttribute('aria-expanded','false')}
});
soundBtn.addEventListener('click',()=>{
 sound.hidden=!sound.hidden;soundBtn.setAttribute('aria-expanded',String(!sound.hidden));
});
range.addEventListener('input',()=>setPercent(range.value));
sfxBtn.addEventListener('click',()=>{
 sfxMuted=!sfxMuted;
 try{localStorage.setItem('ARMY3_sfx_muted_v1',sfxMuted?'1':'0')}catch{}
 updateButton();
});
let retiring=false;
retireBtn.addEventListener('click',()=>{
 if(retiring||!ready())return;
 retiring=true;panel.hidden=true;
 // Training medals are already credited. Keep the run result for a future debrief.
 try{
  const result=window.armyProgression?.battleSummary?.();
  if(result)localStorage.setItem('ARMY3_last_retirement_v1',JSON.stringify({...result,reason:'retired',endedAt:Date.now()}));
 }catch{}
 try{sessionStorage.removeItem('ARMY3_camp_resume_v1')}catch{}
 location.replace(new URL('../../index.html?armyRetire=1',import.meta.url).href);
});
document.addEventListener('pointerdown',e=>{
 if(!panel.hidden&&!wrap.contains(e.target))panel.hidden=true
},{passive:true});
document.getElementById('armyStart')?.addEventListener('click',start,{capture:true});
const watch=new MutationObserver(()=>{if(ready()){if(percent>0&&!muted){play();fade()}watch.disconnect()}});
watch.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pagehide',()=>{audio.pause();level=0;if(gain)gain.gain.value=0});
window.addEventListener('pageshow',()=>{if(started&&!muted&&percent>0)play()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();level=0;if(gain)gain.gain.value=0}else if(started&&!muted&&percent>0)play()});
document.addEventListener('pointerdown',()=>{if(started&&!muted&&percent>0&&audio.paused)play()},{capture:true,passive:true});
new MutationObserver(fade).observe(document.body,{attributes:true,attributeFilter:['class']});
