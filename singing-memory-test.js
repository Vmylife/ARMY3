/* ARMY3 singing memory v1.2 — seven-line coach mode and continuous original backing review.
   Original vocals play during drills; original uninterrupted instrumental plays only during the final full-song review.
   Correct pitch is derived from the selected vocal waveform (no invented tune).
   Browser-only processing: Web Audio + short-time pitch detection + OLA pitch warp.
*/
(()=>{'use strict';
const $=id=>document.getElementById(id);
let CLIP=8;
const STEP=.05, VIEW_W=800, VIEW_H=240;
const BEAT_SECONDS=.55, COUNT_TEXT=['3','2','1','唱'], PRE_ROLL=.5;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=()=>new Promise(r=>setTimeout(r,0));
const E={
 main:$('mainButton'),repeat:$('skipButton'),stage:$('stageTag'),words:$('words'),
 board:$('board'),controls:$('controlsPanel'),overlay:$('boardOverlay'),guide:$('guideLine'),trace:$('yourLine'),
 head:$('playhead'),dot:$('controlDot'),mouth:$('mouth'),speech:$('speech'),
 coach:$('coachStage'),reaction:$('reactionGrade'),coachScore:$('coachMiniScore'),
 feedback:$('feedback'),rank:$('finalRank'),points:$('finalScore'),comment:$('comment'),
 replay:$('replayButton'),compare:$('compareButton'),hint:$('hint'),count:$('takeCount'),
 countdown:$('countdown'),countdownWord:$('countdownWord'),countdownLabel:$('countdownLabel'),
 rail:$('pitchRail'),thumb:$('pitchThumb'),
 phraseScores:$('phraseScores'),compareFirst:$('comparePhrase1'),compareSecond:$('comparePhrase2'),
 preview:$('previewClip'),info:$('voiceInfo'),mode:$('voiceMode'),timeline:$('timeline')
};
let ctx=null,vocals=null,clipStart=0,activePhrase=0,audioBuffers=[],sourcePitch=[];
let pitch=[],refBase=62,validPitch=0,mode='empty',session=0,frame=0,playerHeld=false;
let midiValue=refBase,pointerId=null,trace=[],lastScore=null,playSource=null,playPromise=null,comparison=false;
let ownActionCount=0,analysisToken=0,guideSegments=[],metronomeNodes=[],cancelCountIn=null,takes=[],liveVoice=null,backingBuffer=null,backingSource=null,reviewNodes=[],reportPresented=false;
const AUDIO_URL='./singing-samples/junji-original-vocals-intro.mp3?v=3';
// Extracted offline from the same original vocal MP3 with spectral tracking.
// A sung chorus has harmonics/overlapping voices; the old browser autocorrelation
// rejected 90% of the frames and painted only tiny invisible fragments.
// This derived contour stays synchronized to the shipped original, with
// nulls only for genuine pauses. No melody was composed or substituted.
const SOURCE_PITCH_50MS=[null,null,null,null,null,null,null,null,null,66.7,66.7,66.6,66.6,66.6,66.5,66.4,66.4,66.4,66.7,67,67,67,66.6,66.6,66.6,66.6,66.7,66.9,66.9,71.4,72,72.1,72.2,72.2,72.2,72.1,71.5,71.5,71.5,71.5,71.6,72,72,72,72.1,72.1,72.2,72.2,72.2,71.7,65.3,65.2,65.2,65,65,65,64.8,64.7,64.6,64.3,63.9,63.9,64.3,64.6,64.6,64.7,64.7,64.7,64.7,65,65,67.2,67.4,67.4,67.2,66.9,66.7,66.7,66.7,66.7,66.5,66.3,65.9,65.2,65.5,65.3,65.1,64.9,null,null,null,62.1,61.9,61.6,60,60,60,60,60,60.8,60.8,61.1,61.5,61.5,61.6,61.8,61.9,61.9,62.1,62.1,62.1,65.3,65.3,65.3,65,64.8,64.8,65,65,64.8,65.2,65.4,68.8,68.9,68.9,68.8,68,66.6,66.6,66.6,67.3,68.2,68.5,68.5,68.5,68.5,68.5,68.8,68.9,68.9,68.8,68.7,68.5,68.5,68.5,68.7,68.9,68.9,68.9,68.9,68.9,68.9,68.9,74.8,76,76,76.5,76.5,76.5,76.5,76.3];
// The previous v0.6 cut started at 16s (the NEXT line: 以三民主義為根基).
// Correct lyric boundaries in the user's 141s original vocal stem:
//  國家有綱常／軍隊有軍紀: 8.35–12.37s (4.02s)
//  軍紀是軍隊的命脈:     12.45–16.27s (3.82s)
// Existing spectral pitch analysis of source 8.0–16.0s is sliced to match.
const PHRASES=[
 {text:'國家有綱常　／　軍隊有軍紀',duration:4.02,
  audioUrl:'./singing-samples/junji-vocals-line1-v7.mp3',pitch:SOURCE_PITCH_50MS.slice(7,88)},
 {text:'軍紀是軍隊的命脈',duration:3.82,
  audioUrl:'./singing-samples/junji-vocals-line2-v7.mp3',
  pitch:SOURCE_PITCH_50MS.slice(89,161).concat([null,null,null,null,null])},
 {text:'以三民主義為根基',duration:3.80,
  audioUrl:'./singing-samples/junji-line3-v8.mp3',pitch:null},
 {text:'三信心，堅如鐵',duration:3.85,
  audioUrl:'./singing-samples/junji-line4-v8.mp3',pitch:null},
 {text:'上下團結成一體',duration:3.80,
  audioUrl:'./singing-samples/junji-line5-v8.mp3',pitch:null},
 {text:'號令嚴明，服從第一',duration:4.00,
  audioUrl:'./singing-samples/junji-line6-v8.mp3',pitch:null},
 {text:'革命軍人要牢記',duration:3.65,
  audioUrl:'./singing-samples/junji-line7-v8.mp3',pitch:null}
];
const PITCH_URL='./singing-samples/junji-pitches-v8.json?v=8';
const BACKING_URL='./singing-samples/junji-backing-from-start-v10.mp3?v=10';
// The instrumental begins at the actual song's 0:00. Each warped vocal part is
// inserted at its original song timestamp; the backing buffer is never split.
const BACKING_PHRASE_STARTS=[8.35,12.45,16.28,20.62,24.72,28.82,32.98];
const MIDI=f=>69+12*Math.log2(f/440);
function getAudio(){if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('此裝置不支援 Web Audio');ctx=new Audio()}return ctx}
function setText(s){E.info.textContent=s}
function setMode(next){
 mode=next;
 const playing=['countinTeacher','countinPlayer','listen','imitate','playback','react'].includes(next);
 E.main.disabled=playing||(!vocals&&next!=='error');
 E.repeat.disabled=playing||!vocals;
 E.preview.disabled=playing||!vocals;
 E.mouth.classList.toggle('singing',next==='listen'||next==='playback'||(next==='imitate'&&playerHeld));
 if(!next.startsWith('countin'))E.countdown.hidden=true;
 E.board.style.cursor='default';
 E.rail.style.cursor=(next==='imitate'||next==='countinPlayer')?'ns-resize':'default';
 const showReference=next==='countinTeacher'||next==='listen'||next==='reviewDone'||(next==='done'&&comparison);
 E.guide.style.display=showReference?'inline':'none';
 E.guide.setAttribute('visibility',showReference?'visible':'hidden');
 E.trace.style.display=(next==='playback'||next==='reviewDone'||(next==='done'&&comparison))?'inline':'none';
 E.dot.setAttribute('visibility',(next==='imitate'||next==='countinPlayer')?'visible':'hidden');
 E.overlay.hidden=playing||next==='reviewDone'||next==='done';
 E.main.textContent=next==='empty'?'載入中':next==='error'?'重新載入':next==='ready'?'開始':
  next==='countinPlayer'||next==='countinTeacher'?'準備開唱':
  next==='listen'?'班長演唱中':next==='imitate'?'玩家演唱中':
  next==='playback'?'總回顧播放中':next==='react'?'班長講評中':next==='reviewDone'?'結算':'重新挑戰';
 E.stage.textContent=next==='empty'?'載入中':next==='error'?'載入失敗':next==='ready'?'準備好了':
  next==='countinPlayer'||next==='countinTeacher'?'3 · 2 · 1 · 唱':
  next==='listen'?'班長示範':next==='imitate'?'換你唱':next==='react'?'班長評語':next==='playback'?'總回顧':next==='reviewDone'?'回顧完成':'完成';
 E.overlay.textContent=next==='empty'?'正在載入內建原版人聲…':next==='error'?'載入失敗，點擊重新載入':vocals?'按「班長先唱」開始':'正在載入內建原版人聲…';
 if(next==='countinTeacher')E.speech.textContent='「聽好！我直接唱，不用等！」';
 if(next==='countinPlayer')E.speech.textContent='「3、2、1、唱！第五拍才開始！」';
 if(next==='listen')E.speech.textContent='「聽好！原唱只播人聲，不放伴奏！」';
 if(next==='imitate')E.speech.textContent='「換你！我把音準答案收起來了！」';
 if(next==='playback')E.speech.textContent='「讓我聽聽你剛才唱成怎樣！」';
 if(next==='done')E.speech.textContent='「你自己聽聽看！這樣對嗎？」';
 if(next==='ready')E.speech.textContent='「記得剛才的旋律，等一下看你表現！」';
 if(next==='empty')setCoach('載入原版人聲中…','READY');
 if(next==='ready')setCoach('耳朵借我用一下，唱完一句我就評一次！','READY');
 if(next==='listen')setCoach('注意聽！這一句跟著我唱。','♪');
 if(next==='countinPlayer')setCoach('先把音高拉準，數完四拍換你唱！','READY');
 if(next==='imitate')setCoach('來！讓我聽聽你的實力。','GO!');
 if(next==='playback')setCoach('全連注意！來聽他的成果！','REPLAY');
 if(next==='done')setCoach('七句都唱完了，這是你的成績。','DONE');
}
function setCoach(message,grade='READY',mood=''){
 E.speech.textContent=message;
 E.reaction.textContent=grade;
 E.coachScore.textContent='';
 E.coach.classList.remove('mood-bad','mood-okay','mood-good','mood-great','mood-perfect','react');
 if(mood)E.coach.classList.add('mood-'+mood);
}
// Five intentionally stricter rhythm-game tiers, shared by every per-line result.
const RATING_TIERS=[
 {min:90,english:'PERFECT',chinese:'軍歌之神',mood:'perfect'},
 {min:75,english:'GREAT',chinese:'全連領唱',mood:'great'},
 {min:55,english:'GOOD',chinese:'尚可入耳',mood:'good'},
 {min:30,english:'OKAY',chinese:'音符菜鳥',mood:'okay'},
 {min:0,english:'BAD',chinese:'音準逃兵',mood:'bad'}
];
function ratingFor(points){return RATING_TIERS.find(tier=>points>=tier.min)||RATING_TIERS.at(-1)}
function getCoachReaction(score,index){
 const tier=ratingFor(score.points);
 const lines={
  BAD:['全連耳朵已經申請退伍！','音準擅離職守，現在給我集合！','你這是在唱軍歌，還是在發求救訊號？','連哨兵聽了都想拉警報。'],
  OKAY:['勉強有唱，但音符還在新訓。','有努力啦，音準還得多操幾次。','聽得出是軍歌，算你過第一關。','這句有到，但離領唱還很遠。'],
  GOOD:['嗯，這句勉強可以聽。','有進步，音高大致跟上了。','這回有抓到旋律，繼續保持。','不錯，但別以為這樣就能放假！'],
  GREAT:['這句像樣！可以帶著全班唱。','漂亮，班長總算不用摀耳朵。','夠穩！音符都有準時集合。','很好，差點以為你練過！'],
  PERFECT:['全音到位！直接升任軍歌教官。','唱得太準，今天讓你領唱！','這句零失誤，班長佩服！','哇，這水平可以去司令台領唱。']
 };
 return {
  level:tier.english,subtitle:tier.chinese,mood:tier.mood,
  message:lines[tier.english][index%lines[tier.english].length]
 };
}
function waitCoachReaction(seconds,id){
 const c=getAudio(),until=c.currentTime+seconds;
 return new Promise(resolve=>{
  const check=()=>{
   if(session!==id){resolve(false);return}
   if(c.currentTime>=until){resolve(true);return}
   frame=requestAnimationFrame(check);
  };
  frame=requestAnimationFrame(check);
 });
}
async function showCoachReaction(score,index){
 setMode('react');
 const rating=getCoachReaction(score,index);
 setCoach(rating.message,rating.level,rating.mood);
 E.coachScore.textContent=rating.subtitle+' · 第 '+(index+1)+' 句 '+score.points+' 分';
 E.coach.classList.add('react');
 return waitCoachReaction(1.6,session);
}
function resetHead(){E.head.setAttribute('x1','0');E.head.setAttribute('x2','0')}
function plotX(t){return VIEW_W*(PRE_ROLL+(1-PRE_ROLL)*clamp(t/CLIP,0,1))}
function headAt(t){const x=plotX(t).toFixed(1);E.head.setAttribute('x1',x);E.head.setAttribute('x2',x)}
function headAtPre(t){
 const x=(VIEW_W*PRE_ROLL*clamp(t/(4*BEAT_SECONDS),0,1)).toFixed(1);
 E.head.setAttribute('x1',x);E.head.setAttribute('x2',x);
 if(mode==='countinPlayer')E.dot.setAttribute('cx',x);
}
function toY(m){return clamp(216-(m-(refBase-9.5))/19*191,12,226)}
function toMidi(e){
 const r=E.board.getBoundingClientRect();
 const y=clamp((e.clientY-r.top)/Math.max(1,r.height-25),0,1);
 midiValue=refBase+9.5-y*19;
 E.dot.setAttribute('cy',String(toY(midiValue)));
}
function drawGrid(){
 let html='';
 for(let y=24;y<240;y+=40)html+='<line x1="0" x2="800" y1="'+y+'" y2="'+y+'" stroke="#486852" stroke-width="1" stroke-dasharray="3 7"/>';
 html+='<line x1="'+(VIEW_W*PRE_ROLL)+'" x2="'+(VIEW_W*PRE_ROLL)+'" y1="0" y2="240" stroke="#d4c28c" stroke-width="1.5" stroke-dasharray="6 6" opacity=".65"/>';
 $('gridLines').innerHTML=html;
 E.timeline.innerHTML='<span>3 · 2 · 1 · 唱</span><span>第 5 拍開唱</span><span>'+CLIP.toFixed(1)+' 秒</span>';
}
drawGrid();

// Low-latency live human voice: small overlapped grains from the actual vocal MP3.
// The player only changes pitch/phoneme playback, not the song timing.
// No synthetic oscillator, backing track, microphone, or external service.
function liveGain(on){
 if(!liveVoice)return;
 const c=getAudio(),p=liveVoice.master.gain,target=on?.40:0;
 try{
  if(typeof p.cancelScheduledValues==='function')p.cancelScheduledValues(c.currentTime);
  if(typeof p.setTargetAtTime==='function')p.setTargetAtTime(target,c.currentTime,on?.014:.008);
  else p.value=target;
 }catch{p.value=target}
 E.mouth.classList.toggle('singing',mode==='imitate'&&on);
}
function stopLiveVoice(){
 if(!liveVoice)return;
 const live=liveVoice;
 liveVoice=null;
 try{
  const gain=live.master.gain;
  if(typeof gain.cancelScheduledValues==='function')gain.cancelScheduledValues(getAudio().currentTime);
  gain.value=0;
 }catch{}
 for(const node of live.nodes){
  try{node.stop()}catch{}
 }
 try{live.master.disconnect()}catch{}
 E.mouth.classList.remove('singing');
}
function beginLiveVoice(c,playerStart){
 stopLiveVoice();
 const master=c.createGain();
 master.gain.value=0;
 master.connect(c.destination);
 liveVoice={master,start:playerStart,nextAt:playerStart+.025,grains:0,nodes:new Set()};
}
function pumpLiveVoice(){
 const live=liveVoice;
 if(!live||mode!=='imitate')return;
 const c=getAudio(),now=c.currentTime;
 if(live.nextAt<now+.012)live.nextAt=now+.012;
 if(!playerHeld)return;
 const GRAIN=.105,HOP=.027,lookAhead=.075;
 const sr=vocals.sampleRate,original=vocals.getChannelData(0);
 const length=Math.ceil(sr*GRAIN);
 // Schedule only ~75ms ahead so slider movement changes heard pitch immediately.
 let count=0;
 while(live.nextAt<=now+lookAhead&&live.nextAt<live.start+CLIP&&count<5){
  const t=live.nextAt-live.start;
  const half=(length-1)/2;
  const srcCenter=(clipStart+t+GRAIN/2)*sr;
  const semitones=clamp(midiValue-pitchAt(t),-13,13);
  const ratio=Math.pow(2,semitones/12);
  const grain=c.createBuffer(1,length,sr);
  const dst=grain.getChannelData(0);
  for(let j=0;j<length;j++){
   const at=srcCenter+(j-half)*ratio,index=Math.floor(at);
   if(index<0||index+1>=original.length)continue;
   const weight=.5-.5*Math.cos(2*Math.PI*j/(length-1));
   dst[j]=(original[index]+(original[index+1]-original[index])*(at-index))*weight;
  }
  const node=c.createBufferSource();
  node.buffer=grain;
  node.connect(live.master);
  live.nodes.add(node);
  node.onended=()=>live.nodes.delete(node);
  node.start(live.nextAt);
  live.grains++;
  live.nextAt+=HOP;
  count++;
 }
}

function stopAudio(){
 session++;
 stopBacking();
 stopLiveVoice();
 if(cancelCountIn){const cancel=cancelCountIn;cancelCountIn=null;cancel()}
 for(const node of metronomeNodes){try{node.stop()}catch{}}
 metronomeNodes.length=0;
 E.countdown.hidden=true;
 if(frame)cancelAnimationFrame(frame);frame=0;
 if(playSource){try{playSource.stop()}catch{}playSource=null}
 if(playPromise){playPromise();playPromise=null}
 E.mouth.classList.remove('singing');
}

// Final montage uses ONE uninterrupted instrumental from the original song's 0:00.
// All seven out-of-tune vocal tracks are placed at their original absolute times.
function stopBacking(){
 for(const node of reviewNodes){
  try{node.stop()}catch{}
 }
 reviewNodes=[];
 backingSource=null;
}
function scheduleContinuousReview(c,startAt){
 stopBacking();
 if(backingBuffer){
  const music=c.createBufferSource(),mix=c.createGain();
  music.buffer=backingBuffer;
  mix.gain.value=.58;
  music.connect(mix);mix.connect(c.destination);
  music.start(startAt,0); // no duration: the original backing plays start to finish
  backingSource=music;reviewNodes.push(music);
  music.onended=()=>{if(backingSource===music)backingSource=null;try{mix.disconnect()}catch{}};
 }
 for(let i=0;i<PHRASES.length;i++){
  const voice=c.createBufferSource(),gain=c.createGain();
  voice.buffer=takes[i].buffer;
  gain.gain.value=.94;
  voice.connect(gain);gain.connect(c.destination);
  // No slices or tempo stretching of the accompaniment.
  voice.start(startAt+BACKING_PHRASE_STARTS[i],0);
  reviewNodes.push(voice);
  voice.onended=()=>{try{gain.disconnect()}catch{}};
 }
 return backingBuffer?.duration||BACKING_PHRASE_STARTS.at(-1)+PHRASES.at(-1).duration+.5;
}

function playBuffer(buffer,offset=0,duration=CLIP,when=null){
 const c=getAudio(),node=c.createBufferSource(),g=c.createGain();
 node.buffer=buffer;g.gain.value=.94;
 node.connect(g);g.connect(c.destination);
 let done=false,end;
 const promise=new Promise(resolve=>end=()=>{if(done)return;done=true;resolve()});
 node.onended=end;playSource=node;playPromise=end;
 node.start(when===null?c.currentTime+.015:Math.max(c.currentTime+.005,when),offset,Math.max(.01,Math.min(duration,buffer.duration-offset)));
 return promise.finally(()=>{if(playSource===node)playSource=null;if(playPromise===end)playPromise=null});
}
async function animateAudio(promise,startWhen=null){
 const c=getAudio(),which=session,start=startWhen===null?c.currentTime:c.currentTime>startWhen+.03?c.currentTime:startWhen;
 return new Promise(resolve=>{
  let ended=false;
  promise.finally(()=>ended=true);
  const update=()=>{
   if(which!==session){resolve();return}
   const t=c.currentTime-start;headAt(Math.max(0,t));
   if(ended||t>=CLIP+.25){frame=0;resolve();return}
   frame=requestAnimationFrame(update);
  };
  frame=requestAnimationFrame(update);
 });
}

// Only a short wooden "答" click: no backing music, no pitched accompaniment.
function makeCueBuffer(c){
 const rate=c.sampleRate||44100,n=Math.ceil(rate*.075),buf=c.createBuffer(1,n,rate),data=buf.getChannelData(0);
 for(let i=0;i<n;i++){
  const t=i/rate,attack=Math.min(1,t/.0015),decay=Math.exp(-t*64);
  // A short stick-like transient, with fast-decaying noisy and low resonant body.
  const click=(Math.random()*2-1)*.69+Math.sin(2*Math.PI*(260-90*t)*t)*.31;
  data[i]=click*attack*decay*.64;
 }
 return buf;
}
function scheduleFourBeats(c,firstBeat){
 const cue=makeCueBuffer(c);
 for(let i=0;i<COUNT_TEXT.length;i++){
  const node=c.createBufferSource(),amp=c.createGain();
  node.buffer=cue;amp.gain.value=i===3?.8:.7;
  node.connect(amp);amp.connect(c.destination);
  node.start(firstBeat+i*BEAT_SECONDS);
  metronomeNodes.push(node);
 }
}
// The fourth click says「唱」; the following fifth beat is the FIRST moment
// when vocals or mouse pitch recording may begin.
function countIn(which,c,firstBeat){
 // The player is allowed to preselect and hold a pitch from beat one.
 // Do not allow the gesture to play the vocal before the fifth beat.
 if(which==='countinPlayer'){
  pointerId=null;playerHeld=false;midiValue=refBase;
  E.thumb.style.top='50%';
  E.dot.setAttribute('cy',String(toY(midiValue)));
  E.rail.classList.remove('active');
 }
 setMode(which);
 E.countdown.hidden=false;
 E.countdownLabel.textContent=which==='countinTeacher'?'班長準備開唱':'換你唱，記住旋律！';
 E.countdownWord.textContent='3';
 const id=session;
 headAtPre(0);
 scheduleFourBeats(c,firstBeat);
 return new Promise(resolve=>{
  let settled=false,lastBeat=-1;
  const end=ok=>{
   if(settled)return;
   settled=true;cancelCountIn=null;
   E.countdown.hidden=true;
   resolve(ok);
  };
  cancelCountIn=()=>end(false);
  const tick=()=>{
   if(id!==session){end(false);return}
   const delta=c.currentTime-firstBeat;
   headAtPre(Math.max(0,delta));
   if(delta>=4*BEAT_SECONDS){headAtPre(4*BEAT_SECONDS);end(true);return}
   const beat=clamp(Math.floor(delta/BEAT_SECONDS),0,3);
   if(beat!==lastBeat){
    lastBeat=beat;
    E.countdownWord.textContent=COUNT_TEXT[beat];
    E.countdown.classList.remove('pulse');
    // Force reflow for the pulse on every distinct audible beat.
    void E.countdown.offsetWidth;
    E.countdown.classList.add('pulse');
   }
   frame=requestAnimationFrame(tick);
  };
  tick();
 });
}

function frameWave(src,rate,start,n=2048,target=11025){
 const step=Math.max(1,Math.round(rate/target)),frame=new Float32Array(n);
 const begin=Math.floor(start*rate);
 for(let i=0;i<n;i++)frame[i]=src[begin+i*step]||0;
 return frame;
}
function rms(frame){let sum=0;for(let i=0;i<frame.length;i++)sum+=frame[i]*frame[i];return Math.sqrt(sum/frame.length)}
function pitchOf(frame,minimum=.006){
 const level=rms(frame);if(level<minimum)return null;
 const sr=11025,lo=19,hi=163,size=650;
 let bestTau=-1,bestVal=1,cum=0;
 let values=new Float64Array(hi+1);
 for(let tau=lo;tau<=hi;tau++){
  let d=0;for(let j=0;j<size;j++){const v=frame[j]-frame[j+tau];d+=v*v}
  values[tau]=d;cum+=d;
  const normalized=d*(tau-lo+1)/(cum+1e-9);
  if(normalized<bestVal){bestVal=normalized;bestTau=tau}
 }
 if(bestTau<0||bestVal>.28)return null;
 // Pick the first convincing periodic minimum to avoid octave errors.
 cum=0;
 for(let tau=lo;tau<=hi;tau++){
  cum+=values[tau];
  const cm=values[tau]*(tau-lo+1)/(cum+1e-9);
  if(cm<.17){bestTau=tau;while(bestTau+1<=hi&&values[bestTau+1]<values[bestTau])bestTau++;break}
 }
 return clamp(MIDI(sr/bestTau),45,85);
}
function onsetOf(buffer){
 const data=buffer.getChannelData(0),sr=buffer.sampleRate;
 const limit=Math.min(buffer.duration-CLIP,35);
 let max=0,first=-1,energy=[];
 for(let t=0;t<=Math.max(0,limit);t+=.10){
  const at=Math.floor(t*sr),len=Math.max(1,Math.round(sr*.055));
  let sum=0;
  for(let j=0;j<len;j+=12){const v=data[at+j]||0;sum+=v*v}
  const rmsValue=Math.sqrt(sum/Math.ceil(len/12));
  energy.push({t,r:rmsValue});max=Math.max(max,rmsValue);
 }
 const threshold=Math.max(.008,max*.13);
 for(let i=0;i<energy.length-2;i++)if(energy[i].r>threshold&&energy[i+1].r>threshold){first=energy[i].t;break}
 return clamp((first>=0?first:0)-.18,0,Math.max(0,buffer.duration-CLIP));
}

// Convert the recorded vocal contour to large, stable musical notes.
// Only the GUIDE is quantized; the user's red trace stays freehand.
// This deliberately ignores tremolo, micro-variations and tiny sub-0.35s runs.
function buildGuideSegments(raw){
 const median=arr=>{
  const values=arr.filter(Number.isFinite).sort((a,b)=>a-b);
  return values.length?values[Math.floor(values.length/2)]:null;
 };
 const spans=[];let start=-1;
 for(let i=0;i<=raw.length;i++){
  const has=i<raw.length&&Number.isFinite(raw[i]);
  if(has&&start<0)start=i;
  if(!has&&start>=0){spans.push([start,i]);start=-1}
 }
 const segments=[];
 for(const [from,to] of spans){
  if(to-from<3)continue;
  const smooth=[];
  for(let i=from;i<to;i++){
   smooth.push(median(raw.slice(Math.max(from,i-3),Math.min(to,i+4))));
  }
  const blocks=[];
  let blockStart=from,level=Math.round(median(smooth.slice(0,Math.min(9,smooth.length))));
  for(let i=from+3;i<to-3;i++){
   const candidate=Math.round(median(smooth.slice(i-from,Math.min(smooth.length,i-from+6))));
   if(Math.abs(candidate-level)>=1.7&&i-blockStart>=5){
    blocks.push({start:blockStart,end:i,midi:level});
    blockStart=i;level=candidate;i+=2;
   }
  }
  blocks.push({start:blockStart,end:to,midi:level});
  // Merge transient notes shorter than 7 frames (0.35s) into a neighbor.
  for(let k=0;k<blocks.length;k++){
   if(blocks.length===1||blocks[k].end-blocks[k].start>=7)continue;
   if(k===0){blocks[1].start=blocks[0].start;blocks.shift();k=-1;continue}
   if(k===blocks.length-1){blocks[k-1].end=blocks[k].end;blocks.pop();k--;continue}
   const left=Math.abs(blocks[k].midi-blocks[k-1].midi);
   const right=Math.abs(blocks[k].midi-blocks[k+1].midi);
   if(left<=right){blocks[k-1].end=blocks[k].end;blocks.splice(k,1);k--}
   else{blocks[k+1].start=blocks[k].start;blocks.splice(k,1);k--}
  }
  for(const block of blocks){
   block.midi=Math.round(median(raw.slice(block.start,block.end)));
   block.startTime=block.start*STEP;
   block.endTime=Math.min(CLIP,block.end*STEP);
   if(block.endTime>block.startTime)segments.push(block);
  }
 }
 return segments;
}
function pitchForGuide(t){
 const frame=clamp(Math.floor(t/STEP),0,pitch.length-1);
 const found=guideSegments.find(note=>frame>=note.start&&frame<note.end);
 return found?found.midi:pitchAt(t);
}
function renderGuide(){
 let d='';
 for(const note of guideSegments){
  const x=plotX(note.startTime).toFixed(1);
  const x2=plotX(note.endTime).toFixed(1);
  const y=toY(note.midi).toFixed(1);
  // Each note is a flat block; use a vertical jump only at an actual note change.
  // Silences begin a new move so no note bridges the gap.
  const previous=guideSegments[guideSegments.indexOf(note)-1];
  const linked=previous&&previous.end===note.start;
  d+=(linked?' L':' M')+x+' '+y+' L'+x2+' '+y;
 }
 E.guide.setAttribute('d',d);
 E.guide.setAttribute('stroke-width','10');
 E.guide.setAttribute('stroke-linecap','butt');
 E.guide.setAttribute('stroke-linejoin','miter');
 E.guide.setAttribute('stroke','#f2d39b');
}

async function extractPitch(){
 if(!vocals)return;
 // A prepared reference is reliably visible on phones and avoids slow, very
 // fragile autocorrelation on this multi-voice recording at 16 kHz.
 if(sourcePitch.length!==Math.round(CLIP/STEP)+1)throw Error('原唱音準資料不完整');
 const valid=sourcePitch.filter(Number.isFinite).sort((x,y)=>x-y);
 if(valid.length<CLIP/STEP*.5)throw Error('原唱音準有效資料不足');
 refBase=valid[Math.floor(valid.length/2)];
 validPitch=valid.length/sourcePitch.length;
 pitch=sourcePitch.map((m,i)=>({
   m:Number.isFinite(m)?m:refBase,
   voiced:Number.isFinite(m),
   t:i*STEP
 }));
 guideSegments=buildGuideSegments(sourcePitch);
 if(!guideSegments.length)throw Error('無法建立旋律音階');
 renderGuide();
 setText('✅ 原版人聲已載入。音準線由原唱聲音分析取得（有效 '+Math.round(validPitch*100)+'%），班長示範時顯示金色線；換玩家時隱藏。沒有伴奏。');
}
function pitchAt(t){
 if(!pitch.length)return refBase;
 const v=pitch[clamp(Math.round(t/STEP),0,pitch.length-1)];
 return v?.m??refBase;
}
function expectedVoiced(t){
 return !!pitch[clamp(Math.round(t/STEP),0,pitch.length-1)]?.voiced;
}

/* The actual original vocal excerpt is tracked as a binary MP3 in this
   repository, not synthesized. No instrumental track is decoded or played. */
function updateModeText(){
 E.mode.textContent=vocals?'原版人聲已內建 · 無伴奏':'原版人聲載入中…';
}
async function applyPhrase(index){
 activePhrase=index;
 const part=PHRASES[index];
 CLIP=part.duration;
 sourcePitch=part.pitch;
 vocals=audioBuffers[index];
 clipStart=0;
 E.words.textContent=part.text;
 E.count.textContent=(index+1)+' / '+PHRASES.length;
 for(let i=0;i<PHRASES.length;i++){
  const marker=$('phraseStep'+(i+1));
  if(!marker)continue;
  marker.classList.toggle('active',index===i);
  marker.classList.toggle('completed',!!takes[i]);
 }
 drawGrid();
 await extractPitch();
 E.rail.setAttribute('aria-valuenow','50');
 E.thumb.style.top='50%';
}
async function autoLoadVocal(){
 if(['listen','imitate','playback','countinTeacher','countinPlayer'].includes(mode))return;
 audioBuffers=[];vocals=null;takes=[];lastScore=null;activePhrase=0;backingBuffer=null;
 setMode('empty');updateModeText();
 setText('正在自動載入七段原版人聲（無伴奏），以及對應的原唱音高…');
 try{
  const c=getAudio();
  // Precomputed source-derived pitch tracks for the five added verses.
  const pitchResponse=await fetch(PITCH_URL,{cache:'force-cache'});
  if(!pitchResponse.ok)throw Error('七句原唱音準資料 HTTP '+pitchResponse.status);
  const extra=await pitchResponse.json();
  for(let index=2;index<PHRASES.length;index++){
   const line=extra['line'+(index+1)];
   if(!Array.isArray(line)||line.length!==Math.round(PHRASES[index].duration/STEP)+1)
    throw Error('第 '+(index+1)+' 句原唱音高資料不完整');
   PHRASES[index].pitch=line;
  }
  const decoded=await Promise.all(PHRASES.map(async part=>{
   const response=await fetch(part.audioUrl,{cache:'force-cache'});
   if(!response.ok)throw Error('音檔 HTTP '+response.status);
   const bytes=await response.arrayBuffer();
   if(bytes.byteLength<1000)throw Error('內建原版人聲不完整');
   const audio=await c.decodeAudioData(bytes.slice(0));
   if(audio.duration<part.duration-.06)throw Error('原版音檔片段太短');
   return audio;
  }));
  audioBuffers=decoded;
  // Accompaniment is a separate original stem. It is NEVER connected during
  // teacher demonstrations or the player's live performance.
  try{
   const response=await fetch(BACKING_URL,{cache:'force-cache'});
   if(!response.ok)throw Error('伴奏 HTTP '+response.status);
   backingBuffer=await c.decodeAudioData((await response.arrayBuffer()).slice(0));
  }catch(err){
   backingBuffer=null;
   console.warn('[軍歌鑑測] 回顧伴奏無法載入',err);
  }
  await applyPhrase(0);
  setMode('ready');updateModeText();
 }catch(err){
  console.error('[軍歌鑑測] 原版音檔載入失敗',err);
  setMode('error');
  setText('原版人聲載入失敗（'+err.message+'）。按重新載入即可，不需要上傳檔案。');
 }
}
function sample(t){return trace[clamp(Math.floor(t/STEP),0,Math.max(0,trace.length-1))]||{m:refBase,on:false}}
function createWarp(){
 const c=getAudio(),SR=22050;
 const out=c.createBuffer(1,Math.ceil(CLIP*SR),SR),dest=out.getChannelData(0),wt=new Float32Array(dest.length);
 const data=vocals.getChannelData(0),srcRate=vocals.sampleRate,grain=.112,hop=.026,half=Math.ceil(grain*SR/2);
 for(let t=0;t<CLIP;t+=hop){
  const p=sample(t);if(!p.on)continue;
  const reference=pitchAt(t),ratio=clamp(Math.pow(2,(p.m-reference)/12),.43,2.3);
  const sourceMid=(clipStart+t)*srcRate,outputMid=Math.floor(t*SR);
  for(let j=-half;j<=half;j++){
   const outIndex=outputMid+j;if(outIndex<0||outIndex>=dest.length)continue;
   const inPosition=sourceMid+j*ratio*srcRate/SR,idx=Math.floor(inPosition);
   if(idx<0||idx+1>=data.length)continue;
   const phase=.5+.5*Math.cos(Math.PI*j/half);
   dest[outIndex]+=(data[idx]+(data[idx+1]-data[idx])*(inPosition-idx))*phase;
   wt[outIndex]+=phase;
  }
 }
 let peak=0;
 for(let i=0;i<dest.length;i++){dest[i]=wt[i]>.002?dest[i]/wt[i]:0;peak=Math.max(peak,Math.abs(dest[i]))}
 const gain=Math.min(1.5,.8/(peak||1));
 for(let i=0;i<dest.length;i++)dest[i]*=gain;
 return out;
}
async function listen(){
 if(!vocals||!pitch.length)return;
 stopAudio();
 const id=session;
 comparison=false;E.feedback.hidden=true;
 E.trace.setAttribute('d','');resetHead();
 try{
  const c=getAudio();await c.resume();
  if(id!==session)return;
  // Teacher sings instantly; white playhead is already at midpoint.
 const songStart=c.currentTime+.025;
 setMode('listen');headAt(0);
 const playing=playBuffer(vocals,clipStart,CLIP,songStart);
 await animateAudio(playing,songStart);
  await playing;
  if(id!==session)return;
  await startImitate();
 }catch(e){console.error('[軍歌鑑測] 示範播放失敗',e);setText('無法播放原唱：'+e.message);setMode('ready')}
}
async function startImitate(){
 const c=getAudio(),id=session;
 if(id!==session)return;
 const firstBeat=c.currentTime+.12,playerStart=firstBeat+4*BEAT_SECONDS;
 if(!await countIn('countinPlayer',c,firstBeat)||id!==session)return;
 setMode('imitate');
 E.guide.style.display='none';
 E.guide.setAttribute('visibility','hidden');
 // Preserve slider pitch and pointer selected in beats 3-2-1-唱.
 trace=[];ownActionCount=0;
 beginLiveVoice(c,playerStart);
 if(playerHeld){liveGain(true);pumpLiveVoice()}
 E.hint.textContent='第五拍開始！右側滑桿上下移動時會即時聽見走音人聲；放開就停唱。';
 const step=()=>{
  if(id!==session||mode!=='imitate')return;
  const t=c.currentTime-playerStart;
  while(trace.length*STEP<=Math.min(CLIP,Math.max(0,t)))trace.push({m:midiValue,on:playerHeld});
  headAt(t);
  pumpLiveVoice();
  E.dot.setAttribute('cx',plotX(t).toFixed(1));
  if(t>=CLIP){frame=0;finishImitate();return}
  frame=requestAnimationFrame(step);
 };
 frame=requestAnimationFrame(step);
}
function updateFromRail(e){
 const r=E.rail.getBoundingClientRect();
 const position=clamp((e.clientY-r.top)/Math.max(r.height,1),0,1);
 midiValue=refBase+9.5-position*19;
 E.thumb.style.top=(position*100).toFixed(1)+'%';
 E.rail.setAttribute('aria-valuenow',String(Math.round((1-position)*100)));
 E.dot.setAttribute('cy',String(toY(midiValue)));
}
E.rail.addEventListener('pointerdown',e=>{
 if((mode!=='imitate'&&mode!=='countinPlayer')||pointerId!==null)return;
 e.preventDefault();pointerId=e.pointerId;playerHeld=true;ownActionCount++;
 E.rail.classList.add('active');updateFromRail(e);
 if(mode==='imitate'){liveGain(true);pumpLiveVoice()}
 try{E.rail.setPointerCapture(e.pointerId)}catch{}
});
E.rail.addEventListener('pointermove',e=>{
 if((mode!=='imitate'&&mode!=='countinPlayer')||pointerId!==e.pointerId)return;
 e.preventDefault();updateFromRail(e);
 if(mode==='imitate')pumpLiveVoice();
});
for(const event of ['pointerup','pointercancel','lostpointercapture']){
 E.rail.addEventListener(event,e=>{
  if(mode!=='imitate'&&mode!=='countinPlayer')return;
  if(pointerId!==null&&e.pointerId!==pointerId)return;
  pointerId=null;playerHeld=false;E.rail.classList.remove('active');liveGain(false);
 });
}
E.rail.addEventListener('keydown',e=>{
 if(mode!=='imitate'&&mode!=='countinPlayer')return;
 if(e.key==='ArrowUp'||e.key==='ArrowDown'){
  e.preventDefault();
  midiValue=clamp(midiValue+(e.key==='ArrowUp'?.7:-.7),refBase-9.5,refBase+9.5);
  const position=clamp((refBase+9.5-midiValue)/19,0,1);
  E.thumb.style.top=(position*100).toFixed(1)+'%';
  E.rail.setAttribute('aria-valuenow',String(Math.round((1-position)*100)));
  E.dot.setAttribute('cy',String(toY(midiValue)));if(mode==='imitate')pumpLiveVoice();
 }else if(e.code==='Space'){e.preventDefault();playerHeld=true;E.rail.classList.add('active');if(mode==='imitate'){liveGain(true);pumpLiveVoice()}}
});
E.rail.addEventListener('keyup',e=>{
 if(e.code==='Space'){playerHeld=false;E.rail.classList.remove('active');liveGain(false)}
});
function grade(s){return s>=92?'S':s>=80?'A':s>=65?'B':s>=45?'C':s>=25?'D':'F'}
function calculate(){
 const n=Math.floor(CLIP/STEP);
 let count=0,held=0,errorSum=0,scoreSum=0,precise=0,close=0;
 for(let i=0;i<n;i++){
  const t=i*STEP;
  if(!expectedVoiced(t))continue;
  count++;
  const sample=trace[i];
  if(!sample?.on||!Number.isFinite(sample.m))continue;
  held++;
  const diff=Math.abs(sample.m-pitchForGuide(t));
  errorSum+=Math.min(20,diff);
  if(diff<=.6)precise++;
  if(diff<=1.15)close++;
  // Tight quarter-semitone forgiveness followed by a steep curved penalty.
  // One semitone off earns ~58% for that frame, two semitones ~13%.
  const miss=Math.max(0,diff-.25);
  scoreSum+=100*Math.pow(Math.max(0,1-miss/2.8),1.8);
 }
 const coverage=held/Math.max(1,count);
 const pitchScore=scoreSum/Math.max(1,count);
 const preciseRate=precise/Math.max(1,count);
 const points=clamp(Math.round(pitchScore*.84+preciseRate*16),0,100);
 const error=held?errorSum/held:20;
 const tier=ratingFor(points);
 return {
  points,grade:grade(points),rating:tier.english,coverage:Math.round(coverage*100),
  error:+error.toFixed(2),precise:Math.round(preciseRate*100),
  near:Math.round(close/Math.max(1,count)*100),
  comment:coverage<.12?'班長：你根本沒開口，還想領分？':getCoachReaction({points},activePhrase).message,
  good:precise
 };
}
function tracePathFor(take,until=Infinity){
 let path='',drawing=false;
 const records=take?.trace||trace;
 const end=Number.isFinite(until)
  ?Math.min(records.length,Math.max(0,Math.floor(until/STEP)+1))
  :records.length;
 for(let i=0;i<end;i++){
  if(!records[i].on){drawing=false;continue}
  path+=(drawing?' L':' M')+plotX(i*STEP).toFixed(1)+' '+toY(records[i].m).toFixed(1);
  drawing=true;
 }
 E.trace.setAttribute('d',path);
}
async function replay(){
 if(takes.length!==PHRASES.length||!lastScore)return;
 E.controls.classList.remove('isComparing');
 stopAudio();const id=session;
 try{
  const c=getAudio();await c.resume();
  if(id!==session)return;
  E.feedback.hidden=true;
  setMode('playback');
  E.guide.style.display='none';
  E.trace.style.display='inline';
  E.trace.setAttribute('d',''); // The intro has no player vocals yet.
  E.words.textContent='♪ 前奏';
  E.count.textContent='總回顧';
  E.speech.textContent='先聽原版前奏，接著就是你的七句成果！';
  E.coachScore.textContent='原曲伴奏從 0:00 不間斷播放';
  E.reaction.textContent='♫';
  for(let i=0;i<PHRASES.length;i++)$('phraseStep'+(i+1))?.classList.remove('active');
  resetHead();
  // Keep one musical timeline. We never stop/restart or seek the accompaniment
  // when moving between lyrics: only the warped voices enter on their timestamps.
  const startedAt=c.currentTime+.12;
  const reviewDuration=scheduleContinuousReview(c,startedAt);
  let current=-1;
  const finished=await new Promise(resolve=>{
   const tick=()=>{
    if(id!==session){resolve(false);return}
    const t=c.currentTime-startedAt;
    if(t>=reviewDuration+.05){resolve(true);return}
    let next=-1;
    for(let i=0;i<PHRASES.length;i++){
     if(t>=BACKING_PHRASE_STARTS[i])next=i;
    }
    if(next!==current&&next>=0){
     current=next;
     // Switch the coordinate scale to this actual verse before displaying the
     // stored player gesture. The accompaniment remains completely untouched.
     applyPhrase(next).then(()=>{
      if(id!==session||mode!=='playback')return;
      E.trace.style.display='inline';
      E.guide.style.display='none';
     }).catch(err=>console.warn('[軍歌鑑測] 無法載入回顧音準',err));
     E.words.textContent=PHRASES[next].text;
     E.count.textContent=(next+1)+' / '+PHRASES.length;
     E.speech.textContent='這句你唱了 '+takes[next].score.points+' 分，自己聽聽看！';
     E.coachScore.textContent='第 '+(next+1)+' 句回放';
     for(let i=0;i<PHRASES.length;i++)$('phraseStep'+(i+1))?.classList.toggle('active',i===next);
    }
    if(current>=0){
     const elapsed=t-BACKING_PHRASE_STARTS[current];
     headAt(Math.max(0,elapsed));
     // Render the player's red pitch trace progressively, synchronized with the
     // single continuous original backing, not the hidden sergeant answer.
     tracePathFor(takes[current],Math.max(0,elapsed));
    }else{
     E.trace.setAttribute('d','');
     headAtPre(Math.max(0,t)*4*BEAT_SECONDS/BACKING_PHRASE_STARTS[0]);
    }
    frame=requestAnimationFrame(tick);
   };
   frame=requestAnimationFrame(tick);
  });
  if(!finished||id!==session)return;
  stopBacking();
  // The entire gold reference and red user pitch appear instantly after playback.
  await applyPhrase(PHRASES.length-1);
  if(id!==session)return;
  comparison=true;
  E.feedback.hidden=true;
  setMode('reviewDone');
  tracePathFor(takes[PHRASES.length-1]);
  headAt(CLIP);
  E.guide.style.display='inline';
  E.guide.setAttribute('visibility','visible');
  E.trace.style.display='inline';
  E.words.textContent=PHRASES.at(-1).text;
  E.count.textContent='7 / 7';
  setCoach('整首聽完了！金色是原唱、紅色是你唱的，全部音準都貼好了。按「結算」領戰報。','DONE');
  E.coachScore.textContent='完整音準比較 · 準備結算';
 }catch(err){
  stopBacking();
  console.error('[軍歌鑑測] 總回顧播放失敗',err);
  setText('總回顧播放失敗：'+err.message);
  setMode('reviewDone');
  E.feedback.hidden=true;
  comparison=true;
  E.guide.style.display='inline';
  E.trace.style.display='inline';
  tracePathFor(takes[PHRASES.length-1]);
 }
}
async function finishImitate(){
 playerHeld=false;pointerId=null;E.rail.classList.remove('active');
 stopLiveVoice();
 const index=activePhrase;
 const score=calculate(),warped=createWarp();
 takes[index]={index,score,trace:trace.slice(),buffer:warped};
 // Immediately grade this sentence beside the cartoon sergeant.
 const id=session;
 const survived=await showCoachReaction(score,index);
 if(!survived||id!==session)return;
 if(index<PHRASES.length-1){
  await applyPhrase(index+1);
  if(id===session)await listen();
  return;
 }
 const total=PHRASES.reduce((sum,part)=>sum+part.duration,0);
 const averaged=key=>takes.reduce((sum,take,i)=>sum+take.score[key]*PHRASES[i].duration,0)/total;
 const points=Math.round(averaged('points'));
 lastScore={
  points,grade:grade(points),coverage:Math.round(averaged('coverage')),
  error:+averaged('error').toFixed(1),
  comment:points>=90?'班長：七句居然都唱得像樣？檢討報告白印了。':
   points>=75?'班長：還可以，隔壁連沒有以為是空襲警報。':
   points>=50?'班長：七句唱完了，音準還有幾個在逃兵。':
   '班長：七句軍歌唱成七種求救訊號，回去加強練習！'
 };
 if(id===session)await replay();
}
async function showComparedPhrase(index){
 if(mode!=='done')return;
 await applyPhrase(index);
 setMode('done');
 for(let i=0;i<PHRASES.length;i++){
  $('comparePhrase'+(i+1))?.classList.toggle('selected',index===i);
 }
 tracePathFor(takes[index]);
 comparison=true;
 E.controls.classList.add('isComparing');
 E.guide.style.display='inline';E.guide.setAttribute('visibility','visible');
 E.trace.style.display='';
 E.compare.textContent='收起音準線';
}
function openSettlement(){
 if(mode!=='reviewDone'||reportPresented||!lastScore||takes.length!==PHRASES.length)return;
 const report=window.armySingingSettlement;
 if(!report){console.error('[軍歌鑑測] 結算模組未載入');setText('結算報告載入失敗，請重新整理頁面');return}
 reportPresented=true;
 report.open({
  score:lastScore,
  takes,
  renderPhrase:async index=>{
   await applyPhrase(index);
   tracePathFor(takes[index]);
   E.guide.style.display='inline';E.guide.setAttribute('visibility','visible');
   E.trace.style.display='inline';
   return{gold:E.guide.getAttribute('d')||'',red:E.trace.getAttribute('d')||''};
  },
  restart:()=>{
   reportPresented=false;
   E.controls.classList.remove('isComparing');
   setMode('ready');
   startChallenge();
  }
 });
}
async function startChallenge(){
 const unlockAudio=getAudio().resume(); // Keep user gesture for mobile Web Audio.
 E.controls.classList.remove('isComparing');
 reportPresented=false;
 takes=[];lastScore=null;comparison=false;
 E.feedback.hidden=true;
 await unlockAudio;
 await applyPhrase(0);
 if(mode==='ready'||mode==='done')await listen();
}
E.main.addEventListener('click',()=>{if(mode==='error')autoLoadVocal();else if(mode==='reviewDone')openSettlement();else if(mode==='ready'||mode==='done')startChallenge()});
E.repeat.addEventListener('click',()=>{if(mode==='ready'||mode==='done')startChallenge()});
E.preview.addEventListener('click',async()=>{
 if(!vocals)return;
 stopAudio();const id=session;setMode('listen');
 try{
  const c=getAudio();await c.resume();if(id!==session)return;
  const start=c.currentTime+.025;
  setMode('listen');headAt(0);
  const p=playBuffer(vocals,clipStart,CLIP,start);
  await animateAudio(p,start);await p;
  if(id===session)setMode('ready');
 }
 catch(e){setMode('ready');setText('原唱試聽失敗：'+e.message)}
});
E.replay.addEventListener('click',()=>{if(mode==='done')replay()});
E.compare.addEventListener('click',()=>{
 if(mode!=='done')return;
 comparison=!comparison;
 E.controls.classList.toggle('isComparing',comparison);
 E.guide.style.display=comparison?'inline':'none';E.guide.setAttribute('visibility',comparison?'visible':'hidden');
 E.trace.style.display=comparison?'':'none';
 E.compare.textContent=comparison?'收起音準線':'📈 查看音準差距';
});
for(let i=0;i<PHRASES.length;i++){
 $('comparePhrase'+(i+1))?.addEventListener('click',()=>showComparedPhrase(i));
}
window.addEventListener('pagehide',()=>stopAudio());
window.armySingingTest={
 get status(){return {mode,hasOriginalVocals:audioBuffers.length===PHRASES.length,hasOriginalMusic:!!backingBuffer,musicPlayback:mode==='playback'&&!!backingSource,embeddedAudio:true,liveVoiceEnabled:!!liveVoice&&mode==='imitate',
   phrase:activePhrase+1,phraseCount:PHRASES.length,completedTakes:takes.filter(Boolean).length,
   phraseSeconds:CLIP,referenceFrames:pitch.length,voicedPercent:Math.round(validPitch*100),
   referenceVisible:E.guide.style.display!=='none',guidePathPoints:sourcePitch.filter(Number.isFinite).length,
   flatGuideNotes:guideSegments.length,countdownVisible:!E.countdown.hidden,beatSeconds:BEAT_SECONDS,
   samples:trace.length,liveVoiceGrains:liveVoice?.grains||0,isComparing:E.controls.classList.contains('isComparing'),reviewTraceVisible:(mode==='playback'||mode==='reviewDone')&&E.trace.style.display!=='none',reviewTraceLength:E.trace.getAttribute?.('d')?.length||0,reportOpen:reportPresented,score:lastScore}},
 get refPitch(){return pitch.map(p=>({...p}))},
 analyzePitch:pitchOf,calculate,buildGuideSegments
};
E.main.disabled=true;E.repeat.disabled=true;E.preview.disabled=true;
E.guide.style.display='none';E.trace.style.display='none';E.dot.setAttribute('visibility','hidden');
setMode('empty');autoLoadVocal();
})();