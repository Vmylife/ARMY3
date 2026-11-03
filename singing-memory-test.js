/* ARMY3 military singing memory prototype v0.1.
 * Phrase text is a short quotation; the notes below are an ORIGINAL test melody,
 * not the copyrighted score. Human-sample mode stays entirely in the browser.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lyrics='國家有綱常軍隊有軍紀'.split('');
// Invented ten-syllable memory exercise. The actual military-song melody is NOT encoded.
const notes=[
  {m:60,d:.74},{m:62,d:.76},{m:64,d:.68},{m:62,d:.73},{m:60,d:.99},
  {m:62,d:.78},{m:65,d:.75},{m:64,d:.70},{m:62,d:.78},{m:60,d:.99}
];
const duration=notes.reduce((n,x)=>n+x.d,0),MIN_MIDI=55,MAX_MIDI=74;
const times=[];let cursor=0;for(const note of notes){times.push(cursor);cursor+=note.d}
const el={stage:$('stageTag'),main:$('mainButton'),repeat:$('skipButton'),board:$('board'),overlay:$('boardOverlay'),
 guide:$('guideLine'),trace:$('yourLine'),head:$('playhead'),dot:$('controlDot'),words:$('words'),
 speech:$('speech'),mouth:$('mouth'),timeline:$('timeline'),hint:$('hint'),rank:$('finalRank'),
 points:$('finalScore'),feedback:$('feedback'),comment:$('comment'),replay:$('replayButton'),
 compare:$('compareButton'),record:$('recordButton'),file:$('voiceFile'),info:$('voiceInfo'),
 mode:$('voiceMode'),preview:$('recordedPreview'),count:$('takeCount')
};
const phrases=['國家有綱常','軍隊有軍紀'];
let phase='intro',audio=null,recordedVoice=null,sourceObjectUrl=null,mediaRecorder=null,micStream=null;
let audioUrls=[],timeStart=0,raf=0,pointerId=null,pressed=false,currentMidi=62,samples=[],lastResult=null,stopPlayback=null;
const statusMsg=(msg,tag)=>{el.speech.textContent=msg;el.stage.textContent=tag||el.stage.textContent};
const midiToY=m=>219-(clamp(m,MIN_MIDI,MAX_MIDI)-MIN_MIDI)/(MAX_MIDI-MIN_MIDI)*193;
function noteAt(t){let index=notes.length-1;for(let i=0;i<notes.length;i++){if(t<times[i]+notes[i].d){index=i;break}}return index}
function drawGrid(){
 let html='';for(let y=20;y<=225;y+=38){html+='<line x1="0" x2="800" y1="'+y+'" y2="'+y+'" stroke="#496552" stroke-width=".9" stroke-dasharray="4 7"/>'}
 $('gridLines').innerHTML=html;
 let d='';for(let i=0;i<notes.length;i++){
  const x=800*times[i]/duration,x2=800*(times[i]+notes[i].d)/duration;
  const y=midiToY(notes[i].m);d+=(i?' L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' L'+x2.toFixed(2)+' '+y.toFixed(2);
 }
 el.guide.setAttribute('d',d);el.head.setAttribute('x1','0');el.head.setAttribute('x2','0');
 el.timeline.innerHTML='<span>0:00</span><span>記憶旋律 · '+duration.toFixed(1)+'秒</span><span>0:'+String(Math.round(duration)).padStart(2,'0')+'</span>';
}
drawGrid();
function getAudio(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('瀏覽器未支援 Web Audio');return audio||(audio=new AC())}
function setStage(next){
 phase=next;el.overlay.hidden=next!=='intro'&&next!=='done';el.dot.setAttribute('visibility',next==='imitate'?'visible':'hidden');
 el.guide.style.display=(next==='listen'||next==='compare')?'':'none';
 el.trace.style.display=(next==='compare')?'':'none';
 el.board.style.cursor=next==='imitate'?'crosshair':'default';
 if(next==='intro'){el.main.textContent='▶ 班長先唱';el.main.disabled=false;el.repeat.disabled=true;el.feedback.hidden=true;statusMsg('「跟著我唱，不准走音！」','等待開始')}
 if(next==='listen'){el.main.textContent='班長示範中…';el.main.disabled=true;el.repeat.disabled=true;el.feedback.hidden=true;el.overlay.hidden=true;statusMsg('「聽好，我只唱一遍！」','① 班長示範 · 有音準線')}
 if(next==='imitate'){el.main.textContent='🎤 你正在唱…';el.main.disabled=true;el.repeat.disabled=true;el.overlay.hidden=true;statusMsg('「換你！答案收起來！」','② 換你唱 · 不顯示答案')}
 if(next==='playback'){el.main.textContent='🔊 正在公開處刑…';el.main.disabled=true;el.repeat.disabled=true;statusMsg('「這、這是什麼聲音？」','③ 正在播放你的走音')}
 if(next==='done'){el.main.textContent='↻ 再挑戰一次';el.main.disabled=false;el.repeat.disabled=false;el.overlay.hidden=true;statusMsg('「下次點名給我小聲一點！」','④ 班長講評')}
}
function stopAllAudio(){
 if(raf)cancelAnimationFrame(raf);raf=0;
 try{speechSynthesis.cancel()}catch{}
 if(stopPlayback){stopPlayback();stopPlayback=null}
 el.mouth.classList.remove('singing');
}
function updateHead(t){const x=800*clamp(t/duration,0,1);el.head.setAttribute('x1',String(x));el.head.setAttribute('x2',String(x));}
function say(text,midi,seconds){
 return new Promise(resolve=>{
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){resolve(false);return}
  const u=new SpeechSynthesisUtterance(text);
  u.lang='zh-TW';u.rate=clamp(.50/Math.max(.25,seconds),.60,1.28);u.pitch=clamp(1+(midi-62)*.14,.25,1.95);u.volume=.94;
  const voices=window.speechSynthesis.getVoices();
  const v=voices.find(v=>v.lang.toLowerCase()==='zh-tw')||voices.find(v=>v.lang.toLowerCase().startsWith('zh'));
  if(v)u.voice=v;
  let settled=false;
  const finish=()=>{if(settled)return;settled=true;resolve(true)};
  u.onend=finish;u.onerror=finish;
  try{speechSynthesis.speak(u)}catch{resolve(false)}
  // Speech synthesis can stall on some mobile browsers.
  setTimeout(finish,Math.max(1100,seconds*2900));
 });
}
function playSynthTone(ctx,start,d,midi,amp=.12){
 // Backup only when a Chinese browser voice is unavailable.
 const f=440*Math.pow(2,(midi-69)/12);const osc=ctx.createOscillator();
 const osc2=ctx.createOscillator(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
 osc.type='sawtooth';osc.frequency.value=f;
 osc2.type='triangle';osc2.frequency.value=f*2.002;
 filter.type='lowpass';filter.frequency.value=620;filter.Q.value=.6;
 const g2=ctx.createGain();g2.gain.value=.3;
 osc.connect(filter);osc2.connect(g2);g2.connect(filter);filter.connect(g);g.connect(ctx.destination);
 g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(amp,start+.045);
 g.gain.setValueAtTime(amp,start+Math.max(.055,d-.07));g.gain.exponentialRampToValueAtTime(.0001,start+d);
 osc.start(start);osc.stop(start+d+.01);osc2.start(start);osc2.stop(start+d+.01);
 return ()=>{try{osc.stop();osc2.stop()}catch{}};
}
function animateUntil(end,frame){
 return new Promise(resolve=>{
  function step(){
   const t=(performance.now()-timeStart)/1000;
   updateHead(t);frame(Math.max(0,t));
   if(t>=end||phase==='intro'){raf=0;resolve();return}
   raf=requestAnimationFrame(step);
  }
  raf=requestAnimationFrame(step);
 });
}
function sampleAt(t,holdDefault=false){
 if(!samples.length)return {m:62,on:holdDefault};
 const index=clamp(Math.floor(t/.045),0,samples.length-1);
 return samples[index]||{m:62,on:false};
}
async function speakBySyllable(pitches,flags,liveMode=false){
 const ctx=getAudio();await ctx.resume();
 if(!('speechSynthesis' in window)){
  const starts=ctx.currentTime+.07;let killers=[];
  for(let i=0;i<notes.length;i++)if(!flags||flags[i])killers.push(playSynthTone(ctx,starts+times[i],notes[i].d,pitches[i]));
  stopPlayback=()=>killers.forEach(fn=>fn());
  await new Promise(r=>setTimeout(r,duration*1000+120));return;
 }
 for(let i=0;i<notes.length;i++){
  if(phase==='intro')break;
  const m=pitches[i],active=!flags||flags[i];
  const done=active?say(lyrics[i],m,notes[i].d):new Promise(r=>setTimeout(r,notes[i].d*1000));
  await done;
 }
}
async function startDemo(){
 if(phase==='listen'||phase==='imitate'||phase==='playback')return;
 stopAllAudio();setStage('listen');el.guide.style.display='';
 el.words.textContent='國家有綱常　／　軍隊有軍紀';
 const ctx=getAudio();await ctx.resume();
 timeStart=performance.now();
 el.mouth.classList.add('singing');
 const timer=animateUntil(duration,()=>{});
 const voice=recordedVoice?
  renderAndPlayVoice(notes.map(x=>x.m),()=>true,true):
  speakBySyllable(notes.map(x=>x.m),Array(notes.length).fill(true));
 await Promise.allSettled([timer,voice]);
 if(phase!=='listen')return;
 el.mouth.classList.remove('singing');
 setStage('imitate');samples=[];currentMidi=62;pressed=false;pointerId=null;
 el.hint.textContent='答案已消失！按住音準區域唱歌，上下移動控制音高；不按就會斷音。';
 timeStart=performance.now();raf=requestAnimationFrame(recordFrame);
}
function recordFrame(){
 if(phase!=='imitate'){raf=0;return}
 const t=(performance.now()-timeStart)/1000;
 while(samples.length*.045<=Math.min(duration,t))samples.push({m:currentMidi,on:pressed});
 updateHead(t);
 if(t>=duration){raf=0;endRound();return}
 raf=requestAnimationFrame(recordFrame);
}
function controlFromEvent(e){
 const rect=el.board.getBoundingClientRect();
 const ratio=clamp((e.clientY-rect.top)/(Math.max(50,rect.height-25)),0,1);
 currentMidi=MAX_MIDI-ratio*(MAX_MIDI-MIN_MIDI);
 el.dot.setAttribute('cy',String(midiToY(currentMidi)));
 el.dot.setAttribute('cx',String(800*clamp((performance.now()-timeStart)/1000/duration,0,1)));
}
el.board.addEventListener('pointerdown',e=>{
 if(phase!=='imitate'||pointerId!==null)return;
 e.preventDefault();pointerId=e.pointerId;pressed=true;controlFromEvent(e);
 try{el.board.setPointerCapture(pointerId)}catch{}
});
el.board.addEventListener('pointermove',e=>{
 if(phase!=='imitate'||pointerId!==e.pointerId)return;
 e.preventDefault();controlFromEvent(e);
});
for(const ev of ['pointerup','pointercancel','lostpointercapture']){
 el.board.addEventListener(ev,e=>{if(phase!=='imitate')return;if(pointerId!==e.pointerId&&ev!=='lostpointercapture')return;pressed=false;pointerId=null});
}
function scoreResult(){
 const total=Math.ceil(duration/.045),errors=[];let coverage=0;
 for(let i=0;i<total;i++){
  const t=i*.045,s=sampleAt(t),expected=notes[noteAt(t)].m;
  if(s.on){coverage++;errors.push(Math.abs(s.m-expected))}
 }
 const avg=errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:19;
 const percent=coverage/total;
 const score=clamp(Math.round(100-avg*8.8-(1-percent)*53),0,100);
 const grade=score>=92?'S':score>=80?'A':score>=65?'B':score>=45?'C':score>=25?'D':'F';
 const msgs=[
  '班長：你唱的是軍紀歌，還是冷氣壓縮機在求救？',
  '全連只剩你一個人在跟旋律吵架。',
  '班長：我唱一句，你幫我毀掉一首。',
  '你的音準比營區的網路還不穩定。',
  '這不是走音，這是音符正在逃兵。',
  '唱得很好，下次可不可以不要唱出聲音？'
 ];
 let comment=msgs[Math.floor(Math.random()*msgs.length)];
 if(percent<.12)comment='班長：整首都沒開口？安靜不等於音準滿分。';
 else if(score>=90)comment='班長：居然唱對了，害我想罵人都找不到理由。';
 else if(score>=75)comment='班長：還行，起碼隔壁營區沒有報警。';
 return {score,grade,coverage:Math.round(percent*100),avg:avg.toFixed(1),comment};
}
function buildPlayerTrace(){
 let path='';
 for(let i=0;i<samples.length;i++){
  const s=samples[i],x=i*.045/duration*800,y=midiToY(s.m);
  if(!s.on){if(i+1<samples.length&&samples[i+1].on)path+=' M'+x.toFixed(1)+' '+y.toFixed(1);continue}
  path+=(i&&!samples[i-1].on?' M':path?' L':'M')+x.toFixed(1)+' '+y.toFixed(1);
 }
 el.trace.setAttribute('d',path);
}
function getMidiForTime(t){
 const s=sampleAt(t);return s.m;
}
// Human recording is pitch-warped with overlapping 90 ms grains while
// retaining the original phonemes in time. This is real sample manipulation.
async function renderAndPlayVoice(midis,onPredicate,teacher=false){
 const ctx=getAudio();await ctx.resume();
 const input=recordedVoice;if(!input)return;
 const sr=22050,total=Math.floor(duration*sr),grain=.11,hop=.043;
 const out=ctx.createBuffer(1,total,sr),dst=out.getChannelData(0),weight=new Float32Array(total);
 const source=input.getChannelData(0),srcRate=input.sampleRate;
 const centers=Math.ceil(duration/hop);
 for(let n=0;n<centers;n++){
  const t=n*hop,pitch=midis?midis[noteAt(t)]:getMidiForTime(t);
  const ratio=clamp(Math.pow(2,(pitch-62)/12),.48,2.10);
  const active=teacher||onPredicate(t);if(!active)continue;
  const srcMid=(t/duration)*Math.max(.01,input.duration-.025)*srcRate;
  const dstMid=Math.floor(t*sr),half=Math.ceil(grain*sr/2);
  for(let j=-half;j<=half;j++){
   const oi=dstMid+j;if(oi<0||oi>=total)continue;
   const pos=srcMid+j*ratio*srcRate/sr;
   const p=Math.floor(pos);
   if(p<0||p+1>=source.length)continue;
   const fade=.5+.5*Math.cos(Math.PI*j/half);
   dst[oi]+=(source[p]+(source[p+1]-source[p])*(pos-p))*fade;
   weight[oi]+=fade;
  }
 }
 let peak=.0001;for(let i=0;i<total;i++){dst[i]=weight[i]>.01?dst[i]/weight[i]:0;peak=Math.max(peak,Math.abs(dst[i]))}
 const gain=Math.min(2.8,.78/peak);for(let i=0;i<total;i++)dst[i]*=gain;
 const node=ctx.createBufferSource(),master=ctx.createGain();
 master.gain.value=.85;node.buffer=out;node.connect(master);master.connect(ctx.destination);
 let end;
 const promise=new Promise(resolve=>end=resolve);
 node.onended=()=>end();
 const started=ctx.currentTime+.02;
 node.start(started);
 stopPlayback=()=>{try{node.stop()}catch{}end()};
 await promise;stopPlayback=null;
}
async function replay(){
 if(!lastResult||phase==='playback')return;
 stopAllAudio();setStage('playback');el.trace.style.display='none';el.guide.style.display='none';
 timeStart=performance.now();el.mouth.classList.add('singing');
 const animation=animateUntil(duration,()=>{});
 const midis=notes.map((_,i)=>{
  let sum=0,count=0;
  for(let j=0;j<samples.length;j++){const t=j*.045;if(t>=times[i]&&t<times[i]+notes[i].d&&samples[j].on){sum+=samples[j].m;count++}}
  return count?sum/count:62;
 });
 const onNotes=notes.map((_,i)=>samples.some((s,j)=>s.on&&j*.045>=times[i]&&j*.045<times[i]+notes[i].d));
 const audioPlayback=recordedVoice?
  renderAndPlayVoice(null,t=>sampleAt(t).on,false):
  speakBySyllable(midis,onNotes);
 await Promise.allSettled([animation,audioPlayback]);
 if(phase!=='playback')return;
 el.mouth.classList.remove('singing');
 setStage('done');el.feedback.hidden=false;
 el.rank.textContent=lastResult.grade+' 級';
 el.points.textContent=lastResult.score+' / 100';
 el.comment.textContent=lastResult.comment+'（按住唱歌比例 '+lastResult.coverage+'%｜平均偏差 '+lastResult.avg+' 個半音）';
 el.hint.textContent='已經播放完畢。按「再聽一次」可以重播，或查看和班長相差多少音。';
 buildPlayerTrace();
}
function endRound(){
 pressed=false;pointerId=null;
 lastResult=scoreResult();el.mouth.classList.remove('singing');replay();
}
el.main.addEventListener('click',()=>{
 if(phase==='intro'||phase==='done')startDemo();
});
el.repeat.addEventListener('click',()=>{if(phase==='done')startDemo()});
el.replay.addEventListener('click',()=>{if(phase==='done')replay()});
el.compare.addEventListener('click',()=>{
 if(phase!=='done')return;
 phase='compare';el.guide.style.display='';el.trace.style.display='';
 el.stage.textContent='音高比較 · 班長（金）／你（紅）';
 statusMsg('「你自己看看，唱成什麼樣子！」');
 el.compare.textContent='返回結算';
 const returnClick=()=>{phase='done';el.guide.style.display='none';el.trace.style.display='none';el.stage.textContent='④ 班長講評';el.compare.textContent='📈 查看音準差距';el.compare.removeEventListener('click',returnClick)};
 el.compare.addEventListener('click',returnClick,{once:true});
});
async function readVoice(file){
 try{
  const bytes=await file.arrayBuffer();
  const ctx=getAudio();await ctx.resume();
  const decoded=await ctx.decodeAudioData(bytes.slice(0));if(decoded.duration<.4)throw Error('錄音太短');
  recordedVoice=decoded;
  el.mode.textContent='真人錄音採樣變調';
  el.info.textContent='已載入 '+decoded.duration.toFixed(1)+' 秒真人音檔。現在班長示範與玩家回放都會使用這段人聲變調。建議錄製約 '+duration.toFixed(1)+' 秒。';
  if(sourceObjectUrl)URL.revokeObjectURL(sourceObjectUrl);
  sourceObjectUrl=URL.createObjectURL(file);
  el.preview.src=sourceObjectUrl;el.preview.hidden=false;
  if(phase==='done')el.hint.textContent='已切換到真人聲音，按「再聽一次」比較看看。';
 }catch(err){el.info.textContent='讀取音檔失敗：'+err.message}
}
el.file.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)readVoice(file)});
el.record.addEventListener('click',async()=>{
 if(mediaRecorder&&mediaRecorder.state==='recording'){mediaRecorder.stop();el.record.textContent='● 錄一段真人聲音';el.record.classList.remove('recording');return}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){el.info.textContent='此瀏覽器不支援錄音，請改用載入音檔。';return}
 try{
  micStream=await navigator.mediaDevices.getUserMedia({audio:true});
  const chunks=[];
  mediaRecorder=new MediaRecorder(micStream);
  mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  mediaRecorder.onstop=()=>{
   const blob=new Blob(chunks,{type:mediaRecorder.mimeType||'audio/webm'});
   micStream?.getTracks().forEach(t=>t.stop());micStream=null;
   readVoice(blob);
  };
  mediaRecorder.start();
  el.record.classList.add('recording');el.record.textContent='■ 停止錄音';
  el.info.textContent='錄音中：請用一般音高唱或唸完「國家有綱常、軍隊有軍紀」，再按停止。建議約 '+duration.toFixed(1)+' 秒。';
 }catch(err){el.info.textContent='無法錄音：'+err.message}
});
window.addEventListener('pagehide',()=>{stopAllAudio();micStream?.getTracks().forEach(t=>t.stop());if(sourceObjectUrl)URL.revokeObjectURL(sourceObjectUrl)});
window.armySingingTest={notes,duration,get status(){return {phase,voiceLoaded:!!recordedVoice,samples:samples.length,lastResult}},scoreResult,noteAt};
setStage('intro');
})();