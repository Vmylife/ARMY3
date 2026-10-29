// ARMY3 main camp BGM v1.0: original commissioned camp march.
// Must be activated by a real click for iOS Safari; only the main camp loads this file.
const STORE_KEY='ARMY3_camp_music_muted_v1';
const TARGET_VOLUME=.27;
let muted=false;
try { muted=localStorage.getItem(STORE_KEY)==='1'; } catch {}
let started=false,unlocked=false,raf=0,level=0,context=null,gain=null;
const audio=new Audio(new URL('../../assets/audio/army-camp-march-loop.mp3?v=1',import.meta.url).href);
audio.loop=true;
audio.preload='none';
audio.volume=.27;
audio.setAttribute('playsinline','');

// WebAudio gain works on iPhone, where changing HTMLMediaElement.volume can be ignored.
function initializeAudio(){
 if(context)return;
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return;
 try {
  context=new AC();
  const source=context.createMediaElementSource(audio);
  gain=context.createGain();gain.gain.value=0;
  source.connect(gain);gain.connect(context.destination);
 } catch(e) { console.warn('背景音樂音量控制初始化失敗',e);context=null;gain=null; }
}
function ready(){return document.body.classList.contains('army-ready')}
function desiredVolume(){return started&&!muted&&ready()&&!document.hidden?TARGET_VOLUME:0}
function animateVolume(){
 raf=0;
 const desired=desiredVolume();
 level+=(desired-level)*.12;
 if(Math.abs(desired-level)<.002)level=desired;
 if(gain)gain.gain.value=level;
 else audio.volume=level;
 if(level!==desired)raf=requestAnimationFrame(animateVolume);
}
function fade(){if(!raf)raf=requestAnimationFrame(animateVolume)}
function play(){
 if(!started||muted||document.hidden)return;
 initializeAudio();
 if(context?.state==='suspended')context.resume().catch(()=>{});
 const p=audio.play();
 if(p?.then) p.then(()=>{unlocked=true;fade()}).catch(()=>{unlocked=false});
 else {unlocked=true;fade()}
}
function start(){
 if(!started){started=true;play()}
 else if(!unlocked&&!muted)play();
 fade();
}
const btn=document.createElement('button');
btn.id='campMusicToggle';btn.type='button';
btn.title='背景音樂開關';
btn.setAttribute('aria-label','背景音樂開關');
btn.setAttribute('aria-pressed',String(!muted));
const css=document.createElement('style');
css.textContent=`
#campMusicToggle {position:fixed;z-index:7;right:max(12px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 16px);width:43px;height:43px;padding:0;border:2px solid #f7f4dc;border-radius:50%;background:#284637df;color:#fff9dc;box-shadow:0 4px 10px #0b231b50;font-size:21px;display:none;align-items:center;justify-content:center;touch-action:manipulation}
body.army-ready #campMusicToggle {display:flex}
#campMusicToggle:focus-visible {outline:3px solid #e4b45d;outline-offset:3px}
`;
document.head.append(css);document.body.append(btn);
function updateButton(){btn.textContent=muted?'🔇':'♫';btn.setAttribute('aria-pressed',String(!muted));btn.title=muted?'開啟背景音樂':'關閉背景音樂'}
updateButton();
btn.addEventListener('click',()=>{
 muted=!muted;
 try{localStorage.setItem(STORE_KEY,muted?'1':'0')}catch{}
 updateButton();
 if(muted){fade();audio.pause()}
 else {started=true;play();fade()}
});
// Capture the genuine gesture before boot() begins its asynchronous loading.
document.getElementById('armyStart')?.addEventListener('click',start,{capture:true});
const watch=new MutationObserver(()=>{if(ready()){if(!muted){play();fade()}watch.disconnect()}});
watch.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pagehide',()=>{audio.pause();level=0;if(gain)gain.gain.value=0});
window.addEventListener('pageshow',()=>{if(started&&!muted)play()});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){audio.pause();level=0;if(gain)gain.gain.value=0}
 else if(started&&!muted)play();
});
// If a browser blocked the automatic return-from-minigame start, the next real tap unlocks it.
document.addEventListener('pointerdown',()=>{if(started&&!muted&&audio.paused)play()},{capture:true,passive:true});
