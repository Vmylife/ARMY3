/* ARMY3 singing memory v0.3 — ORIGINAL VOICE STEM ONLY.
   Original isolated vocal MP3 is bundled with ARMY3; users never upload files. Music stem is NEVER played.
   Correct pitch is derived from the selected vocal waveform (no invented tune).
   Browser-only processing: Web Audio + short-time pitch detection + OLA pitch warp.
*/
(()=>{'use strict';
const $=id=>document.getElementById(id);
const CLIP=8, STEP=.05, VIEW_W=800, VIEW_H=240;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=()=>new Promise(r=>setTimeout(r,0));
const E={
 main:$('mainButton'),repeat:$('skipButton'),stage:$('stageTag'),words:$('words'),
 board:$('board'),overlay:$('boardOverlay'),guide:$('guideLine'),trace:$('yourLine'),
 head:$('playhead'),dot:$('controlDot'),mouth:$('mouth'),speech:$('speech'),
 feedback:$('feedback'),rank:$('finalRank'),points:$('finalScore'),comment:$('comment'),
 replay:$('replayButton'),compare:$('compareButton'),hint:$('hint'),count:$('takeCount'),
 preview:$('previewClip'),info:$('voiceInfo'),mode:$('voiceMode'),timeline:$('timeline')
};
let ctx=null,vocals=null,clipStart=0;
let pitch=[],refBase=62,validPitch=0,mode='empty',session=0,frame=0,playerHeld=false;
let midiValue=refBase,pointerId=null,trace=[],lastScore=null,playSource=null,playPromise=null,comparison=false;
let ownActionCount=0,analysisToken=0;
const AUDIO_URL='./singing-samples/junji-original-vocals-intro.mp3?v=3';
const MIDI=f=>69+12*Math.log2(f/440);
function getAudio(){if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('此裝置不支援 Web Audio');ctx=new Audio()}return ctx}
function setText(s){E.info.textContent=s}
function setMode(next){
 mode=next;
 const playing=['listen','imitate','playback'].includes(next);
 E.main.disabled=playing||(!vocals&&next!=='error');
 E.repeat.disabled=playing||!vocals;
 E.preview.disabled=playing||!vocals;
 E.mouth.classList.toggle('singing',next==='listen'||next==='playback');
 E.board.style.cursor=next==='imitate'?'crosshair':'default';
 E.guide.style.display=(next==='listen'||(next==='done'&&comparison))?'':'none';
 E.trace.style.display=next==='done'&&comparison?'':'none';
 E.dot.setAttribute('visibility',next==='imitate'?'visible':'hidden');
 E.overlay.hidden=playing||next==='done';
 E.main.textContent=next==='empty'?'原版人聲載入中…':
  next==='error'?'↻ 重新載入原版人聲':
  next==='ready'?'▶ 班長先唱':
  next==='listen'?'班長正在唱原版人聲…':
  next==='imitate'?'輪到你，憑記憶滑！':
  next==='playback'?'正在播放你的走音…':'↻ 再挑戰一次';
 E.stage.textContent=next==='empty'?'正在自動載入原唱':
  next==='error'?'原唱載入失敗':
  next==='ready'?'音檔就緒 · 原版人聲':
  next==='listen'?'① 班長示範 · 原唱音準線':
  next==='imitate'?'② 你唱 · 答案完全隱藏':
  next==='playback'?'③ 公開播放玩家走音':'④ 鑑測報告';
 E.overlay.textContent=next==='empty'?'正在載入內建原版人聲…':next==='error'?'載入失敗，點擊重新載入':vocals?'按「班長先唱」開始':'正在載入內建原版人聲…';
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
 E.timeline.innerHTML='<span>0:00</span><span>原唱片段 · '+CLIP+'秒</span><span>0:'+String(CLIP).padStart(2,'0')+'</span>';
}
drawGrid();
function stopAudio(){
 session++;
 if(frame)cancelAnimationFrame(frame);frame=0;
 if(playSource){try{playSource.stop()}catch{}playSource=null}
 if(playPromise){playPromise();playPromise=null}
 E.mouth.classList.remove('singing');
}
function playBuffer(buffer,offset=0,duration=CLIP){
 const c=getAudio(),node=c.createBufferSource(),g=c.createGain();
 node.buffer=buffer;g.gain.value=.94;
 node.connect(g);g.connect(c.destination);
 let done=false,end;
 const promise=new Promise(resolve=>end=()=>{if(done)return;done=true;resolve()});
 node.onended=end;playSource=node;playPromise=end;
 node.start(c.currentTime+.015,offset,Math.max(.01,Math.min(duration,buffer.duration-offset)));
 return promise.finally(()=>{if(playSource===node)playSource=null;if(playPromise===end)playPromise=null});
}
async function animateAudio(promise){
 const which=session,start=performance.now();
 return new Promise(resolve=>{
  let ended=false;
  promise.finally(()=>ended=true);
  const update=()=>{
   if(which!==session){resolve();return}
   const t=(performance.now()-start)/1000;headAt(t);
   if(ended||t>=CLIP+.25){frame=0;resolve();return}
   frame=requestAnimationFrame(update);
  };
  frame=requestAnimationFrame(update);
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
async function extractPitch(){
 if(!vocals)return;
 const token=++analysisToken;
 const data=vocals.getChannelData(0),sr=vocals.sampleRate;
 const frames=Math.floor(CLIP/STEP)+1,raw=[];
 let loudest=.008;
 const amps=[];
 for(let k=0;k<frames;k++){
  const t=clipStart+k*STEP;
  const x=frameWave(data,sr,t);
  amps.push(rms(x));raw.push(x);
  loudest=Math.max(loudest,amps[k]);
  if(k%35===0)await sleep();
 }
 if(token!==analysisToken)return;
 const threshold=Math.max(.004,loudest*.12);
 let vals=[],strong=[];
 for(let k=0;k<frames;k++){
  let m=pitchOf(raw[k],threshold);
  vals.push(m);
  if(Number.isFinite(m))strong.push(m);
  if(k%22===0)await sleep();
 }
 if(token!==analysisToken)return;
 if(!strong.length){
  pitch=[];validPitch=0;setText('找不到足夠的清楚歌聲音準。請把起點移到有人聲的地方，或使用分離乾淨的人聲檔。');E.guide.setAttribute('d','');return;
 }
 strong.sort((a,b)=>a-b);
 refBase=strong[Math.floor(strong.length/2)];
 validPitch=strong.length/frames;
 // Fill holes for timing/score interpolation, but preserve natural nonvoiced gaps.
 const values=vals.map((m,i)=>{
  if(Number.isFinite(m))return m;
  for(let d=1;d<12;d++)if(Number.isFinite(vals[i-d]))return vals[i-d];
  for(let d=1;d<12;d++)if(Number.isFinite(vals[i+d]))return vals[i+d];
  return refBase;
 });
 for(let i=1;i<values.length;i++)if(Math.abs(values[i]-values[i-1])>9)values[i]=values[i-1];
 pitch=vals.map((m,i)=>({m:values[i],voiced:Number.isFinite(m),t:i*STEP}));
 let path='',open=false;
 pitch.forEach((p,i)=>{
  if(!p.voiced){open=false;return}
  const x=(i*STEP/CLIP*VIEW_W).toFixed(1);
  path+=(open?' L':' M')+x+' '+toY(p.m).toFixed(1);open=true;
 });
 E.guide.setAttribute('d',path);
 setText('✅ 原版人聲已載入。原唱音準辨識率 '+Math.round(validPitch*100)+'%。起點 '+clipStart.toFixed(1)+' 秒，示範只播人聲，伴奏不播放。');
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
 E.trace.setAttribute('d','');resetHead();setMode('listen');
 try{
  const c=getAudio();await c.resume();
  if(id!==session)return;
  const playing=playBuffer(vocals,clipStart,CLIP);
  await animateAudio(playing);
  await playing;
  if(id!==session)return;
  startImitate();
 }catch(e){setText('無法播放原唱：'+e.message);setMode('ready')}
}
function startImitate(){
 setMode('imitate');E.guide.style.display='none';
 pointerId=null;playerHeld=false;midiValue=refBase;trace=[];ownActionCount=0;
 const id=session,start=performance.now();
 E.hint.textContent='記得剛才原唱的音準嗎？現在看不到答案！按住滑鼠／手指上下滑動，放開就停止發聲。';
 const step=()=>{
  if(id!==session||mode!=='imitate')return;
  const t=(performance.now()-start)/1000;
  while(trace.length*STEP<=Math.min(CLIP,t)){
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
  if(p?.on){held++;const diff=Math.abs((p.m||refBase)-pitchAt(t));totalError+=Math.min(20,diff);if(diff<=1.5)good++}
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
 try{await getAudio().resume();if(id!==session)return;const p=playBuffer(vocals,clipStart,CLIP);await animateAudio(p);await p;if(id===session)setMode('ready')}
 catch(e){setMode('ready');setText('原唱試聽失敗：'+e.message)}
});
E.replay.addEventListener('click',()=>{if(mode==='done')replay()});
E.compare.addEventListener('click',()=>{
 if(mode!=='done')return;
 comparison=!comparison;E.guide.style.display=comparison?'':'none';
 E.trace.style.display=comparison?'':'none';
 E.compare.textContent=comparison?'收起音準線':'📈 查看音準差距';
});
window.addEventListener('pagehide',()=>stopAudio());
window.armySingingTest={
 get status(){return {mode,hasOriginalVocals:!!vocals,hasOriginalMusic:false,musicPlayback:false,embeddedAudio:true,
   phraseSeconds:CLIP,referenceFrames:pitch.length,voicedPercent:Math.round(validPitch*100),samples:trace.length,score:lastScore}},
 get refPitch(){return pitch.map(p=>({...p}))},
 analyzePitch:pitchOf,calculate
};
E.main.disabled=true;E.repeat.disabled=true;E.preview.disabled=true;
E.guide.style.display='none';E.trace.style.display='none';E.dot.setAttribute('visibility','hidden');
setMode('empty');autoLoadVocal();
})();