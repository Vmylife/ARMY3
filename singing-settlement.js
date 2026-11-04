/* ARMY3 singing formal achievement report v1.2.
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
  {id:'first',icon:'📋',name:'軍歌鑑測報到',desc:'完整唱完七句軍紀歌',rarity:'普通',test:s=>s.scores.length===7},
  {id:'loud',icon:'🎤',name:'很敢唱喔',desc:'七句平均跟唱率至少85%',rarity:'普通',test:s=>s.coverage>=85},
  {id:'earplugs',icon:'🎧',name:'全連集體靜音',desc:'總分低於30分，班長耳朵申請公傷假',rarity:'普通',test:s=>s.total<30},
  {id:'one_good',icon:'🪖',name:'終於像在唱歌',desc:'任一句得分至少55分',rarity:'普通',test:s=>s.best>=55},
  {id:'one_great',icon:'🎖️',name:'音準順利歸隊',desc:'任一句得分至少75分',rarity:'稀有',test:s=>s.best>=75},
  {id:'one_perfect',icon:'🌟',name:'班長想放假',desc:'任一句得分至少90分',rarity:'史詩',test:s=>s.best>=90},
  {id:'steady',icon:'📏',name:'七句都能交差',desc:'七句全部達到GOOD等級',rarity:'稀有',test:s=>s.scores.every(v=>v>=55)},
  {id:'top',icon:'🏅',name:'司令台領唱員',desc:'七句平均分數至少75分',rarity:'史詩',test:s=>s.total>=75},
  {id:'improving',icon:'📈',name:'後段班逆襲',desc:'最後一句比第一句高20分以上',rarity:'稀有',test:s=>s.scores.at(-1)-s.scores[0]>=20},
  {id:'all_bad',icon:'🚑',name:'七連慘案',desc:'七句全都BAD，連醫護所都聽到了',rarity:'稀有',secret:true,test:s=>s.scores.every(v=>v<30)},
  {id:'monotone',icon:'📉',name:'一個音唱天下',desc:'七句音高都幾乎不變，堅持唱到底',rarity:'史詩',secret:true,test:s=>s.allFlat},
  {id:'all_perfect',icon:'👑',name:'軍歌本尊',desc:'七句全部PERFECT',rarity:'傳說',test:s=>s.scores.every(v=>v>=90)}
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
  if(s.scores.every(x=>x<30))return '班長：七句都在走音，你這不是唱軍紀歌，是讓全連體驗聲波攻擊。';
  if(s.total<20)return '班長：原曲唱的是軍紀，你唱的是國軍耳鼻喉科的業務成長計畫。';
  if(s.allFlat)return '班長：你是打算一個音唱到退伍？這種堅持應該用在站哨。';
  if(s.total>=93)return '班長：這不是你第一次來唱吧？音準準成這樣，我還能找什麼理由叫你加練？';
  if(s.total>=80)return '班長：唱得不錯，司令台可以借你十分鐘，下來照樣要掃地。';
  if(s.total>=60)return '班長：有像樣了！至少唱完不需要讓救護車來載我的耳朵。';
  if(s.total>=40)return '班長：有幾句唱得不錯，其餘幾句可能被友軍拿去當空襲警報。';
  if(s.scores.at(-1)-s.scores[0]>=20)return '班長：前面像在求救，後面倒是有進步。早點清醒不行嗎？';
  return '班長：七句唱完，音準大概有一半還在營區外面找集合場。';
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
  const cards=[...fresh,...earned.filter(a=>!fresh.includes(a))].slice(0,3);
  $('singReportAchievements').innerHTML=cards.length?cards.map(a=>
   '<div class="sgr-achcard" title="'+a.desc+'">'+
   '<span class="sgr-medal">'+a.icon+'</span><strong>'+a.name+'</strong>'+
   '<small>'+a.rarity+'</small>'+(fresh.includes(a)?'<span class="sgr-ach-new">NEW</span>':'')+
   '</div>').join(''):'<div class="sgr-ach-empty">這輪沒有解鎖新成就，班長說下次別只解鎖他的怒氣。</div>';
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
  if(!data||!data.score||data.takes.length!==7)return;
  current=data;
  const s=createStats(data),grade=rank(s.total);
  $('singReportPoints').textContent=String(s.total);
  $('singReportEnglish').textContent=grade.en;
  $('singReportChinese').textContent=grade.zh;
  $('singReportStats').textContent='最高 '+s.best+' 分 · 最低 '+s.worst+' 分';
  $('singReportBest').textContent='歷史最高 '+Math.max(progress.best,s.total)+' 分';
  $('singReportQuote').textContent='「'+reportQuote(s)+'」';
  paintRounds(s);
  renderAchievements(s);
  $('singReportCompareChoices').innerHTML=Array.from({length:7},(_,i)=>
   '<button type="button" data-index="'+i+'">'+(i+1)+'</button>').join('');
  for(const btn of $('singReportCompareChoices').querySelectorAll('button')){
   btn.addEventListener('click',()=>choosePhrase(Number(btn.dataset.index)));
  }
  $('singResultOverlay').hidden=false;
   window.armyProgression?.rewardPanel('singing',s.total,$('singReportPoints').closest('.sgr-scorebox')||$('singReportPoints'));
  $('singResultOverlay').querySelector('.sgr-scroll').scrollTop=0;
  choosePhrase(6);
 }
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