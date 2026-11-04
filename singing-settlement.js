/* ARMY3 singing achievement report v1.4. Interactive compact field report.
   Dark-olive field-report design matches blanket and shooting minigames.
   No additional audio is played by this report. */
(() => {'use strict';
 const $=id=>document.getElementById(id);
 const KEY='ARMY3_singing_achievements_v1';
 const TIERS=[
  {min:90,en:'PERFECT',zh:'軍歌之神'},
  {min:75,en:'GREAT',zh:'全連領唱'},
  {min:55,en:'GOOD',zh:'尚可入耳'},
  {min:30,en:'OKAY',zh:'音符菜鳥'},
  {min:0,en:'BAD',zh:'音準逃兵'}
 ];
 const rank=points=>TIERS.find(t=>points>=t.min)||TIERS.at(-1);
 const A=[
  {id:'first',icon:'📋',name:'軍歌鑑測報到',desc:'完整唱完四句軍紀歌',rarity:'普通',test:s=>s.scores.length===4},
  {id:'loud',icon:'🎤',name:'很敢唱喔',desc:'四句平均跟唱率至少85%',rarity:'普通',test:s=>s.coverage>=85},
  {id:'earplugs',icon:'🎧',name:'全連集體靜音',desc:'總分低於30分，班長耳朵申請公傷假',rarity:'普通',test:s=>s.total<30},
  {id:'one_good',icon:'🪖',name:'終於像在唱歌',desc:'任一句得分至少55分',rarity:'普通',test:s=>s.best>=55},
  {id:'one_great',icon:'🎖️',name:'音準順利歸隊',desc:'任一句得分至少75分',rarity:'稀有',test:s=>s.best>=75},
  {id:'one_perfect',icon:'🌟',name:'班長想放假',desc:'任一句得分至少90分',rarity:'史詩',test:s=>s.best>=90},
  {id:'steady',icon:'📏',name:'四句都能交差',desc:'四句全部達到GOOD等級',rarity:'稀有',test:s=>s.scores.every(v=>v>=55)},
  {id:'top',icon:'🏅',name:'司令台領唱員',desc:'四句平均分數至少75分',rarity:'史詩',test:s=>s.total>=75},
  {id:'improving',icon:'📈',name:'後段班逆襲',desc:'最後一句比第一句高20分以上',rarity:'稀有',test:s=>s.scores.at(-1)-s.scores[0]>=20},
  {id:'all_bad',icon:'🚑',name:'四連慘案',desc:'四句全都BAD，連醫護所都聽到了',rarity:'稀有',secret:true,test:s=>s.scores.every(v=>v<30)},
  {id:'monotone',icon:'📉',name:'一個音唱天下',desc:'四句音高都幾乎不變，堅持唱到底',rarity:'史詩',secret:true,test:s=>s.allFlat},
  {id:'all_perfect',icon:'👑',name:'軍歌本尊',desc:'四句全部PERFECT',rarity:'傳說',test:s=>s.scores.every(v=>v>=90)},
   {id:'survivor',icon:'🫡',name:'至少班長還活著',desc:'總分介於30至49分，勉強守住耳朵',rarity:'普通',test:s=>s.total>=30&&s.total<50},
   {id:'rollercoaster',icon:'🎢',name:'音準坐雲霄飛車',desc:'最高分與最低分相差至少45分',rarity:'稀有',test:s=>s.best-s.worst>=45},
   {id:'comeback',icon:'🔥',name:'最後一句才醒',desc:'第一句低於40分、最後一句達70分',rarity:'稀有',test:s=>s.scores[0]<40&&s.scores.at(-1)>=70},
   {id:'all_seventy',icon:'🎵',name:'四句全員到齊',desc:'四句各達70分以上',rarity:'史詩',test:s=>s.scores.every(v=>v>=70)}
 ];
 let progress=readProgress(),current=null,comparisonToken=0;
 function readProgress(){
  try{
   const p=JSON.parse(localStorage.getItem(KEY)||'{}');
   return{ids:Array.isArray(p.ids)?p.ids.filter(x=>typeof x==='string'):[],best:Number(p.best)||0,played:Number(p.played)||0};
  }catch{return{ids:[],best:0,played:0}}
 }
 function persist(){
  try{localStorage.setItem(KEY,JSON.stringify(progress))}catch{}
 }
 function reportQuote(s){
  const variants=s.scores.every(x=>x<30)?
   ['班長：四句都在走音，我以為紅軍已經開始心理戰。',
    '班長：我是叫你唱軍歌，不是叫你測試營區的防空警報。',
    '班長：軍紀的命脈還在，但我的耳膜已經申請退伍。']:
   s.allFlat?
   ['班長：四句只唱一個音，你是把音階全部送去放假？',
    '班長：整首同一個音，你的音準比哨兵站得還死。']:
   s.total>=93?
   ['班長：你唱成這樣，我還怎麼找理由叫你留下來加練？',
    '班長：原唱是不是偷偷混進來了？給我查一下你的入伍資料！',
    '班長：完美到我以為耳機壞了。今天軍歌教官換你當。']:
   s.total>=80?
   ['班長：司令台借你十分鐘，唱完記得回來掃廁所。',
    '班長：唱得不錯！全連終於不用靠口型對付軍歌鑑測。',
    '班長：這種音準，隔壁連都想把你借過去充場面。']:
   s.total>=65?
   ['班長：不錯，有一半時間我甚至想跟著你一起唱。',
    '班長：這次算你過關，明天早點名先不要自告奮勇。',
    '班長：音準有歸隊，士氣也差點跟著回來了。']:
   s.total>=45?
   ['班長：有幾句像軍歌，另外幾句像在跟音符吵架。',
    '班長：進步空間很大，大到可以拿來當全連集合場。',
    '班長：唱得還行，至少不需要出動軍醫所。']:
   s.total>=25?
   ['班長：我叫你唱軍紀，你唱得像軍紀在逃兵。',
    '班長：四句歌唱完，音符有三句還在外面集合。',
    '班長：你有開口我很感動，音準沒有跟來我很難過。',
    '班長：這不是唱錯，是直接開闢新的軍歌流派。']:
   ['班長：原曲唱的是軍紀，你唱的是國軍耳鼻喉科業績成長計畫。',
    '班長：剛剛那段是軍歌還是求救訊號？要不要幫你呼叫衛生兵？'];
  const seed=s.scores.reduce((a,v,i)=>a+Math.round(v)*(i+3),s.total);
  return variants[Math.abs(seed)%variants.length];
 }
 function subtitle(s){
  if(s.total>=90)return '班長確認：你不是原唱本人？';
  if(s.total>=75)return '這次軍歌終於沒有出人命。';
  if(s.total>=50)return '整體尚可，部分音符仍待集合。';
  if(s.total>=30)return '報告班長，音準還在路上。';
  return '鑑測完成，請班長先保護耳朵。';
 }
 function createStats(data){
  const scores=data.takes.map(t=>Math.round(t.score.points));
  const tones=data.takes.flatMap(t=>t.trace.filter(x=>x.on&&Number.isFinite(x.m)).map(x=>x.m));
  const allFlat=tones.length>15&&(Math.max(...tones)-Math.min(...tones)<.7);
  const coverage=Math.round(data.takes.reduce((a,t)=>a+t.score.coverage,0)/Math.max(1,data.takes.length));
  return{scores,total:Math.round(data.score.points),best:Math.max(...scores),worst:Math.min(...scores),coverage,allFlat};
 }
 function renderAchievements(stats){
  const prev=new Set(progress.ids);
  const earned=A.filter(a=>{try{return a.test(stats)}catch{return false}});
  const fresh=earned.filter(a=>!prev.has(a.id));
  progress.ids=[...new Set([...progress.ids,...earned.map(a=>a.id)])];
  progress.best=Math.max(progress.best,stats.total);
  progress.played++;
  persist();
  $('singReportAchCount').textContent=earned.length+' 項達成 · '+fresh.length+' 項 NEW';
  // Highlight surprising/specific achievements, not just "completed once".
  const spotlight=['all_perfect','comeback','rollercoaster','survivor','earplugs','monotone',
   'top','all_seventy','one_perfect','one_great','improving','steady','all_bad','loud'];
  const featureRank=a=>{const n=spotlight.indexOf(a.id);return n<0?100:n};
  const cards=[...earned].sort((a,b)=>
   (fresh.includes(a)?0:100)-(fresh.includes(b)?0:100)||
   featureRank(a)-featureRank(b)||A.indexOf(a)-A.indexOf(b)).slice(0,3);
  $('singReportAchievements').innerHTML=cards.length?cards.map(a=>
   '<button class="sgr-achcard" type="button" data-achievement="'+a.id+'" aria-label="查看成就：'+a.name+'">'+
   '<span class="sgr-medal">'+a.icon+'</span><strong>'+a.name+'</strong>'+
   '<small>'+a.rarity+'</small>'+(fresh.includes(a)?'<span class="sgr-ach-new">NEW</span>':'')+
   '</button>').join(''):'<div class="sgr-ach-empty">本輪未達成成就，班長表示下一次再來。</div>';
  $('singReportAchDetail').hidden=true;
  $('singReportAchDetail').textContent='';
  const gallery=$('singReportGallery');
  gallery.hidden=true;
  $('singReportGalleryToggle').textContent='🏅 成就圖鑑 '+progress.ids.length+' / '+A.length;
  const known=new Set(progress.ids);
  gallery.innerHTML=A.map(a=>{
   const unlock=known.has(a.id),title=unlock||!a.secret?a.name:'？？？ 機密成就';
   const detail=unlock||!a.secret?a.desc:'這項隱藏成就尚未解鎖';
   return '<div class="sgr-galleryitem'+(unlock?'':' locked')+'"><strong>'+a.icon+' '+title+'</strong>'+
    '<small>'+a.rarity+' · '+detail+(unlock?' · 已解鎖':' · 未解鎖')+'</small></div>';
  }).join('');
 }
 function paintRounds(stats){
  $('singReportRounds').innerHTML=stats.scores.map((score,i)=>
   '<div class="sgr-round"><small>第 '+(i+1)+' 句</small><strong>'+score+'</strong>'+
   '<em>'+rank(score).en+'</em></div>').join('');
 }
 async function choosePhrase(index){
  if(!current)return;
  const token=++comparisonToken;
  const draw=await current.renderPhrase(index);
  if(token!==comparisonToken||!current)return;
  $('singReportGold').setAttribute('d',draw.gold);
  $('singReportRed').setAttribute('d',draw.red);
  for(const btn of $('singReportCompareChoices').querySelectorAll('button')){
   btn.classList.toggle('active',Number(btn.dataset.index)===index);
  }
 }
 function open(data){
  if(!data||!data.score||data.takes.length!==4)return;
  current=data;
  const s=createStats(data),grade=rank(s.total);
  $('singReportPoints').textContent=String(s.total);
  $('singReportEnglish').textContent=grade.en;
  $('singReportChinese').textContent=grade.zh;
  $('singReportStats').textContent='最高 '+s.best+' 分 · 最低 '+s.worst+' 分';
  $('singReportBest').textContent='歷史最高 '+Math.max(progress.best,s.total)+' 分';
  $('singReportQuote').textContent='「'+reportQuote(s)+'」';
  $('singReportSubtitle').textContent=subtitle(s);
  paintRounds(s);
  renderAchievements(s);
  $('singReportCompareChoices').innerHTML=Array.from({length:4},(_,i)=>
   '<button type="button" data-index="'+i+'">'+(i+1)+'</button>').join('');
  for(const btn of $('singReportCompareChoices').querySelectorAll('button')){
   btn.addEventListener('click',()=>choosePhrase(Number(btn.dataset.index)));
  }
  $('singReportCompareDetails').open=false;
  $('singResultOverlay').hidden=false;
   window.armyProgression?.rewardPanel('singing',s.total,$('singReportPoints').closest('.sgr-scorebox')||$('singReportPoints'));
  $('singResultOverlay').querySelector('.sgr-scroll').scrollTop=0;
  choosePhrase(3);
 }
 // Tap a medal to read the condition on a touchscreen.
 $('singReportAchievements').addEventListener('click',event=>{
  const card=event.target.closest('[data-achievement]');
  if(!card)return;
  const ach=A.find(a=>a.id===card.dataset.achievement);
  if(!ach)return;
  const panel=$('singReportAchDetail');
  if(!panel.hidden&&panel.dataset.achievement===ach.id){panel.hidden=true;return}
  panel.dataset.achievement=ach.id;
  panel.replaceChildren();
  const title=document.createElement('strong');title.textContent=ach.icon+' '+ach.name+' · '+ach.rarity;
  const desc=document.createElement('span');desc.textContent=ach.desc;
  panel.append(title,desc);panel.hidden=false;
 });
 $('singReportAgain').addEventListener('click',()=>{
  if(!current)return;
  const run=current;current=null;++comparisonToken;
  $('singResultOverlay').hidden=true;
  run.restart();
 });
 $('singReportGalleryToggle').addEventListener('click',()=>{
  const gallery=$('singReportGallery');gallery.hidden=!gallery.hidden;
 });
 window.armySingingSettlement={open,rank,achievements:A.map(({test,...a})=>a),get progress(){return{...progress,ids:[...progress.ids]}}};
})();