/* ARMY3 singing memory v0.6 — ORIGINAL VOICE STEM ONLY.
   Original isolated vocal MP3 is bundled with ARMY3; users never upload files. Music stem is NEVER played.
   Correct pitch is derived from the selected vocal waveform (no invented tune).
   Browser-only processing: Web Audio + short-time pitch detection + OLA pitch warp.
*/
(()=>{'use strict';
const $=id=>document.getElementById(id);
let CLIP=8;
const STEP=.05, VIEW_W=800, VIEW_H=240;
const BEAT_SECONDS=.55, COUNT_TEXT=['3','2','1','唱'];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=()=>new Promise(r=>setTimeout(r,0));
const E={
 main:$('mainButton'),repeat:$('skipButton'),stage:$('stageTag'),words:$('words'),
 board:$('board'),overlay:$('boardOverlay'),guide:$('guideLine'),trace:$('yourLine'),
 head:$('playhead'),dot:$('controlDot'),mouth:$('mouth'),speech:$('speech'),
 feedback:$('feedback'),rank:$('finalRank'),points:$('finalScore'),comment:$('comment'),
 replay:$('replayButton'),compare:$('compareButton'),hint:$('hint'),count:$('takeCount'),
 countdown:$('countdown'),countdownWord:$('countdownWord'),countdownLabel:$('countdownLabel'),
 rail:$('pitchRail'),thumb:$('pitchThumb'),phrase1:$('phraseStep1'),phrase2:$('phraseStep2'),
 phraseScores:$('phraseScores'),compareFirst:$('comparePhrase1'),compareSecond:$('comparePhrase2'),
 preview:$('previewClip'),info:$('voiceInfo'),mode:$('voiceMode'),timeline:$('timeline')
};
let ctx=null,vocals=null,clipStart=0,activePhrase=0,audioBuffers=[],sourcePitch=[];
let pitch=[],refBase=62,validPitch=0,mode='empty',session=0,frame=0,playerHeld=false;
let midiValue=refBase,pointerId=null,trace=[],lastScore=null,playSource=null,playPromise=null,comparison=false;
let ownActionCount=0,analysisToken=0,guideSegments=[],metronomeNodes=[],cancelCountIn=null,takes=[];
const AUDIO_URL='./singing-samples/junji-original-vocals-intro.mp3?v=3';
// Extracted offline from the same original vocal MP3 with spectral tracking.
// A sung chorus has harmonics/overlapping voices; the old browser autocorrelation
// rejected 90% of the frames and painted only tiny invisible fragments.
// This derived contour stays synchronized to the shipped original, with
// nulls only for genuine pauses. No melody was composed or substituted.
const SOURCE_PITCH_50MS=[null,null,null,null,null,null,null,null,null,66.7,66.7,66.6,66.6,66.6,66.5,66.4,66.4,66.4,66.7,67,67,67,66.6,66.6,66.6,66.6,66.7,66.9,66.9,71.4,72,72.1,72.2,72.2,72.2,72.1,71.5,71.5,71.5,71.5,71.6,72,72,72,72.1,72.1,72.2,72.2,72.2,71.7,65.3,65.2,65.2,65,65,65,64.8,64.7,64.6,64.3,63.9,63.9,64.3,64.6,64.6,64.7,64.7,64.7,64.7,65,65,67.2,67.4,67.4,67.2,66.9,66.7,66.7,66.7,66.7,66.5,66.3,65.9,65.2,65.5,65.3,65.1,64.9,null,null,null,62.1,61.9,61.6,60,60,60,60,60,60.8,60.8,61.1,61.5,61.5,61.6,61.8,61.9,61.9,62.1,62.1,62.1,65.3,65.3,65.3,65,64.8,64.8,65,65,64.8,65.2,65.4,68.8,68.9,68.9,68.8,68,66.6,66.6,66.6,67.3,68.2,68.5,68.5,68.5,68.5,68.5,68.8,68.9,68.9,68.8,68.7,68.5,68.5,68.5,68.7,68.9,68.9,68.9,68.9,68.9,68.9,68.9,74.8,76,76,76.5,76.5,76.5,76.5,76.3];
// Measured from the second sung phrase in the user's original vocal audio.
const SOURCE_PITCH_2_50MS=[null,null,null,null,null,null,null,null,68.8,68.7,68.7,68.7,67.6,67.7,67.7,67.4,66.7,66.8,66.9,67,69.5,68.2,67,66.9,66.9,66.8,66.5,66.2,65.1,65,65,64.5,64.5,64.5,64.5,65.1,65.3,64.5,64.5,64.5,64.5,64.5,64.5,null,null,null,null,null,63.2,62.7,62.5,62.3,62.4,60,61.5,62.7,60.5,60.6,64.3,64.3,65.8,66,65.8,65.9,65.9,66.1,62.7,62.7,62.8,62.5,62.7,62.7,59.8,59.8,63.3,65.8,65.7,64.3,63,63.7,63.6,62.4,62.2,59.7,61.5,62.8,62.4,61.5,60,62.7];
const PHRASES=[
 {text:'國家有綱常　／　軍隊有軍紀',duration:8,audioUrl:AUDIO_URL,pitch:SOURCE_PITCH_50MS},
 {text:'軍紀是軍隊的命脈',duration:4.45,audioUrl:'./singing-samples/junji-original-vocals-phrase-2.mp3?v=6',pitch:SOURCE_PITCH_2_50MS}
];
const MIDI=f=>69+12*Math.log2(f/440);
function getAudio(){if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('此裝置不支援 Web Audio');ctx=new Audio()}return ctx}
function setText(s){E.info.textContent=s}
function setMode(next){
 mode=next;
 const playing=['countinTeacher','countinPlayer','listen','imitate','playback'].includes(next);
 E.main.disabled=playing||(!vocals&&next!=='error');
 E.repeat.disabled=playing||!vocals;
 E.preview.disabled=playing||!vocals;
 E.mouth.classList.toggle('singing',next==='listen'||next==='playback');
 if(!next.startsWith('countin'))E.countdown.hidden=true;
 E.board.style.cursor='default';
 E.rail.style.cursor=next==='imitate'?'ns-resize':'default';
 const showReference=next==='countinTeacher'||next==='listen'||(next==='done'&&comparison);
 E.guide.style.display=showReference?'inline':'none';
 E.guide.setAttribute('visibility',showReference?'visible':'hidden');
 E.trace.style.display=next==='done'&&comparison?'':'none';
 E.dot.setAttribute('visibility',next==='imitate'?'visible':'hidden');
 E.overlay.hidden=playing||next==='done';
 E.main.textContent=next==='empty'?'原版人聲載入中…':
  next==='error'?'↻ 重新載入原版人聲':
  next==='ready'?'▶ 班長先唱':
  next==='countinTeacher'||next==='countinPlayer'?'答、答、答、答…':
  next==='listen'?'班長正在唱原版人聲…':
  next==='imitate'?'輪到你，憑記憶滑！':
  next==='playback'?'正在播放你的走音…':'↻ 再挑戰一次';
 E.stage.textContent=next==='empty'?'正在自動載入原唱':
  next==='error'?'原唱載入失敗':
  next==='ready'?'音檔就緒 · 原版人聲':
  next==='countinTeacher'?'① 班長預備拍 · 3 2 1 唱':
  next==='countinPlayer'?'② 玩家預備拍 · 3 2 1 唱':
  next==='listen'?'① 班長示範 · 原唱音準線':
  next==='imitate'?'② 你唱 · 答案完全隱藏':
  next==='playback'?'③ 公開播放玩家走音':'④ 鑑測報告';
 E.stage.textContent='第 '+(activePhrase+1)+'/2 句 · '+E.stage.textContent;
 E.overlay.textContent=next==='empty'?'正在載入內建原版人聲…':next==='error'?'載入失敗，點擊重新載入':vocals?'按「班長先唱」開始':'正在載入內建原版人聲…';
 if(next==='countinTeacher')E.speech.textContent='「聽好！先數四拍，第五拍開始！」';
 if(next==='countinPlayer')E.speech.textContent='「3、2、1、唱！第五拍才開始！」';
 if(next==='listen')E.speech.textContent='「聽好！原唱只播人聲，不放伴奏！」';
 if(next==='imitate')E.speech.textContent='「換你！我把音準答案收起來了！」';
 if(next==='playback')E.speech.textContent='「讓我聽聽你剛才唱成怎樣！」';
 if(next==='done')E.speech.textContent='「你自己聽聽看！這樣對嗎？」';
 if(next==='ready')E.speech.textContent='「記得剛才的旋律，等一下看你表現！」';
}
function resetHead(){E.head.setAttribute('x1','0');E.head.setAttribute('x2','0')}
function headAt(t){const x=(VIEW_W*clamp(t/CLIP,0,1)).toFixed(1);E.head.setAttribute('x1',x);E.head.setAttribute('x2',x)}
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
 $('gridLines').innerHTML=html;
 E.timeline.innerHTML='<span>0:00</span><span>原唱片段 · '+CLIP.toFixed(1)+' 秒</span><span>0:'+CLIP.toFixed(1)+'</span>';
}
drawGrid();
function stopAudio(){
 session++;
 if(cancelCountIn){const cancel=cancelCountIn;cancelCountIn=null;cancel()}
 for(const node of metronomeNodes){try{node.stop()}catch{}}
 metronomeNodes.length=0;
 E.countdown.hidden=true;
 if(frame)cancelAnimationFrame(frame);frame=0;
 if(playSource){try{playSource.stop()}catch{}playSource=null}
 if(playPromise){playPromise();playPromise=null}
 E.mouth.classList.remove('singing');
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
 setMode(which);
 E.countdown.hidden=false;
 E.countdownLabel.textContent=which==='countinTeacher'?'班長準備開唱':'換你唱，記住旋律！';
 E.countdownWord.textContent='3';
 const id=session;
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
   if(delta>=4*BEAT_SECONDS){end(true);return}
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
  const x=(VIEW_W*note.startTime/CLIP).toFixed(1);
  const x2=(VIEW_W*note.endTime/CLIP).toFixed(1);
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
async function loadVocals(bytes){
 const c=getAudio(),buffer=await c.decodeAudioData(bytes.slice(0));
 if(buffer.duration<CLIP-.04)throw Error('內建人聲長度不足');
 vocals=buffer;clipStart=0;
 await extractPitch();
 if(pitch.length<Math.floor(CLIP/STEP*.12))throw Error('無法分析原版人聲音準');
 E.count.textContent='原版人聲 · '+CLIP+' 秒';
 setMode('ready');updateModeText();
}
async function autoLoadVocal(){
 if(['listen','imitate','playback'].includes(mode))return;
 vocals=null;setMode('empty');updateModeText();
 setText('正在載入內建原版人聲（無伴奏），並分析原唱音準…');
 try{
  const response=await fetch(AUDIO_URL,{cache:'force-cache'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<1000)throw Error('內建原版音檔不完整');
  await loadVocals(bytes);
 }catch(err){
  console.error('[軍歌鑑測] 內建人聲載入失敗',err);
  setMode('error');setText('內建原版人聲載入失敗（'+err.message+'）。請按重新載入；不需要上傳任何音檔。');
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
 lastScore=null;trace=[];comparison=false;E.feedback.hidden=true;
 E.trace.setAttribute('d','');resetHead();
 try{
  const c=getAudio();await c.resume();
  if(id!==session)return;
  // Schedule vocals at beat FIVE before sounding any of the four clicks.
  // Web Audio clock ensures a consistent 4-click count-in on desktop and mobile.
  const firstBeat=c.currentTime+.12,songStart=firstBeat+4*BEAT_SECONDS;
  const playing=playBuffer(vocals,clipStart,CLIP,songStart);
  if(!await countIn('countinTeacher',c,firstBeat)||id!==session)return;
  setMode('listen');
  await animateAudio(playing,songStart);
  await playing;
  if(id!==session)return;
  await startImitate();
 }catch(e){console.error('[軍歌鑑測] 示範播放失敗',e);setText('無法播放原唱：'+e.message);setMode('ready')}
}
async function startImitate(){
 const c=getAudio(),id=session;
 if(id!==session)return;
 // A NEW four-beat count-in before the player's take.
 const firstBeat=c.currentTime+.12,playerStart=firstBeat+4*BEAT_SECONDS;
 if(!await countIn('countinPlayer',c,firstBeat)||id!==session)return;
 setMode('imitate');
 E.guide.style.display='none';
 E.guide.setAttribute('visibility','hidden');
 pointerId=null;playerHeld=false;midiValue=refBase;trace=[];ownActionCount=0;
 E.hint.textContent='第五拍開唱！已隱藏班長音準線。按住滑鼠／手指上下滑動控制音高，放開會斷音。';
 const step=()=>{
  if(id!==session||mode!=='imitate')return;
  // Use the same AudioContext timeline as the four click sounds.
  const t=c.currentTime-playerStart;
  while(trace.length*STEP<=Math.min(CLIP,Math.max(0,t))){
   trace.push({m:midiValue,on:playerHeld});
  }
  headAt(t);
  E.dot.setAttribute('cx',(VIEW_W*clamp(t/CLIP,0,1)).toFixed(1));
  if(t>=CLIP){frame=0;finishImitate();return}
  frame=requestAnimationFrame(step);
 };
 frame=requestAnimationFrame(step);
}
E.board.addEventListener('pointerdown',e=>{
 if(mode!=='imitate'||pointerId!==null)return;
 e.preventDefault();pointerId=e.pointerId;playerHeld=true;ownActionCount++;
 toMidi(e);try{E.board.setPointerCapture(e.pointerId)}catch{}
});
E.board.addEventListener('pointermove',e=>{
 if(mode!=='imitate'||pointerId!==e.pointerId)return;
 e.preventDefault();toMidi(e);
});
for(const ev of ['pointerup','pointercancel','lostpointercapture']){
 E.board.addEventListener(ev,e=>{
  if(mode!=='imitate')return;
  if(pointerId!==null&&e.pointerId!==pointerId)return;
  pointerId=null;playerHeld=false;
 });
}
function grade(s){return s>=92?'S':s>=80?'A':s>=65?'B':s>=45?'C':s>=25?'D':'F'}
function calculate(){
 const n=Math.floor(CLIP/STEP);
 let count=0,held=0,totalError=0,good=0;
 for(let i=0;i<n;i++){
  const t=i*STEP,ref=expectedVoiced(t),p=trace[i];
  if(!ref)continue;
  count++;
  if(p?.on){held++;const diff=Math.abs((p.m||refBase)-pitchForGuide(t));totalError+=Math.min(20,diff);if(diff<=1.5)good++}
 }
 const coverage=held/Math.max(1,count),error=held?totalError/held:20;
 const points=clamp(Math.round(100-error*8.4-(1-coverage)*55),0,100);
 const comments=[
 '班長：我是叫你唱軍紀歌，不是叫你模仿機車發不動。',
 '全連唱得好好的，只有你的音符被禁假。',
 '你這個音準，連軍中廣播都想申請靜音。',
 '班長：唱歌不是亂拉滑鼠！這份戰報寫不下去了。',
 '我唱的是軍歌，你回的是隔壁營區求救訊號。'
 ];
 let comment=comments[Math.floor(Math.random()*comments.length)];
 if(coverage<.12)comment='班長：你根本沒開口，安靜不代表音準正確。';
 else if(points>=90)comment='班長：很好，竟然唱得像原唱，我本來準備罵你的。';
 else if(points>=75)comment='班長：至少隔壁連沒有以為發生空襲。';
 return {points,grade:grade(points),coverage:Math.round(coverage*100),error:+error.toFixed(1),comment,good};
}
function tracePath(){
 let p='',drawing=false;
 for(let i=0;i<trace.length;i++){
  if(!trace[i].on){drawing=false;continue}
  p+=(drawing?' L':' M')+(VIEW_W*i*STEP/CLIP).toFixed(1)+' '+toY(trace[i].m).toFixed(1);
  drawing=true;
 }
 E.trace.setAttribute('d',p);
}
async function replay(){
 if(!vocals||!lastScore)return;
 stopAudio();const id=session;
 setMode('playback');E.guide.style.display='none';E.trace.style.display='none';
 const c=getAudio();await c.resume();if(id!==session)return;
 try{
  const warped=createWarp();
  const promise=playBuffer(warped,0,CLIP);
  await animateAudio(promise);
  await promise;
  if(id!==session)return;
  setMode('done');comparison=false;E.feedback.hidden=false;
  E.rank.textContent=lastScore.grade+' 級';
  E.points.textContent=lastScore.points+' / 100';
  E.comment.textContent=lastScore.comment+'（原唱有聲段跟唱 '+lastScore.coverage+'%；平均走音 '+lastScore.error+' 個半音）';
  E.hint.textContent='這就是你的音高軌跡套在原唱人聲上的版本；沒有伴奏。可以重聽或看音準比較。';
 }catch(err){setText('播放變調人聲失敗：'+err.message);setMode('done')}
}
function finishImitate(){
 playerHeld=false;pointerId=null;lastScore=calculate();tracePath();
 replay();
}
E.main.addEventListener('click',()=>{if(mode==='error')autoLoadVocal();else if(mode==='ready'||mode==='done')listen()});
E.repeat.addEventListener('click',()=>{if(mode==='ready'||mode==='done')listen()});
E.preview.addEventListener('click',async()=>{
 if(!vocals)return;
 stopAudio();const id=session;setMode('listen');
 try{
  const c=getAudio();await c.resume();if(id!==session)return;
  const firstBeat=c.currentTime+.12,start=firstBeat+4*BEAT_SECONDS;
  const p=playBuffer(vocals,clipStart,CLIP,start);
  if(!await countIn('countinTeacher',c,firstBeat)||id!==session)return;
  setMode('listen');await animateAudio(p,start);await p;
  if(id===session)setMode('ready');
 }
 catch(e){setMode('ready');setText('原唱試聽失敗：'+e.message)}
});
E.replay.addEventListener('click',()=>{if(mode==='done')replay()});
E.compare.addEventListener('click',()=>{
 if(mode!=='done')return;
 comparison=!comparison;E.guide.style.display=comparison?'inline':'none';E.guide.setAttribute('visibility',comparison?'visible':'hidden');
 E.trace.style.display=comparison?'':'none';
 E.compare.textContent=comparison?'收起音準線':'📈 查看音準差距';
});
window.addEventListener('pagehide',()=>stopAudio());
window.armySingingTest={
 get status(){return {mode,hasOriginalVocals:!!vocals,hasOriginalMusic:false,musicPlayback:false,embeddedAudio:true,
   phraseSeconds:CLIP,referenceFrames:pitch.length,voicedPercent:Math.round(validPitch*100),referenceVisible:E.guide.style.display!=='none',guidePathPoints:SOURCE_PITCH_50MS.filter(Number.isFinite).length,flatGuideNotes:guideSegments.length,countdownVisible:!E.countdown.hidden,beatSeconds:BEAT_SECONDS,samples:trace.length,score:lastScore}},
 get refPitch(){return pitch.map(p=>({...p}))},
 analyzePitch:pitchOf,calculate,buildGuideSegments
};
E.main.disabled=true;E.repeat.disabled=true;E.preview.disabled=true;
E.guide.style.display='none';E.trace.style.display='none';E.dot.setAttribute('visibility','hidden');
setMode('empty');autoLoadVocal();
})();