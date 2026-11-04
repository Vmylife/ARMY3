/* ARMY3 progression preview v1: economy, rank, armory, training skill and per-run trait journal.
 * Gameplay-affecting bonuses intentionally DO NOT run in this version.
 */
(()=>{
'use strict';
const STORE='ARMY3_progression_v1',RUN='ARMY3_progression_run_v1';
const $=id=>document.getElementById(id);
const RANKS=['新兵','二等兵','一等兵','上等兵','下士','中士','上士','少尉','中尉','上尉','少校','中校','上校','少將','中將','上將'];
const NAMES={blanket:'棉被疊疊樂',shooting:'實彈射擊',grenade:'手榴彈投擲',weed:'拔草鑑測',swipe:'中山室滑手機',singing:'唱軍歌'};
const TRAINING=[
 {id:'blanket-stack',kind:'blanket',name:'疊被大師',effect:['一次疊 2 層棉被','一次疊 3 層棉被','一次疊 4 層棉被'],note:'一個操作直接完成多層，不拖慢移動速度'},
 {id:'blanket-align',kind:'blanket',name:'豆腐干職人',effect:['對齊容錯 +25%','對齊容錯 +50%','對齊容錯 +75%'],note:'降低堆疊失誤率'},
 {id:'shoot-breathe',kind:'shooting',name:'呼吸控制',effect:['準星晃動 -20%','準星晃動 -50%','準星晃動 -80%'],note:'降低靶場準星自然晃動幅度'},
 {id:'shoot-paper',kind:'shooting',name:'靶場老鳥',effect:['靶紙左右寬度 +20%','靶紙左右寬度 +50%','靶紙左右寬度 +80%'],note:'只加寬靶紙，絕不改上下高度'},
 {id:'grenade-pitch',kind:'grenade',name:'棒球投手',effect:['計量條速度 -20%','計量條速度 -40%','計量條速度 -60%'],note:'方向、距離計量條變慢'},
 {id:'grenade-retry',kind:'grenade',name:'再給我一次機會',effect:['每場可重投 1 次','每場可重投 2 次','每場可重投 3 次'],note:'用來挽救投歪的手榴彈'},
 {id:'weed-tolerance',kind:'weed',name:'鏟土容錯',effect:['額外允許鏟錯 1 次','額外允許鏟錯 2 次','額外允許鏟錯 3 次'],note:'例如原本錯兩次會壞，Lv.1 改成第三次才壞'},
 {id:'weed-boss',kind:'weed',name:'王草剋星',effect:['每點王草多鏟 1 下','每點王草多鏟 2 下','每點王草多鏟 3 下'],note:'只針對王草，每次點擊合計鏟 2／3／4 下'},
 {id:'swipe-score',kind:'swipe',name:'班長媽媽雷達',effect:['滑卡總分 ×1.2','滑卡總分 ×1.5','滑卡總分 ×2'],note:'結算分數最多 100 分'},
 {id:'swipe-undo',kind:'swipe',name:'後悔藥',effect:['每場撤銷錯誤滑卡 1 次','每場撤銷錯誤滑卡 2 次','每場撤銷錯誤滑卡 3 次'],note:'給誤觸的玩家一次補救機會'},
 {id:'singing-memory',kind:'singing',name:'軍歌速記',effect:['記憶顯示 +1 秒','記憶顯示 +2 秒','記憶顯示 +3 秒'],note:'讓記憶階段有更多觀察時間'},
 {id:'singing-pitch',kind:'singing',name:'絕對音感',effect:['音準容錯 +20%','音準容錯 +40%','音準容錯 +60%'],note:'擴大軍歌音準合格範圍'}
];
const TRAITS={
 blanket:{
  good:[
   ['彈簧棉被',['倒地時震退附近最多 1 名敵人','倒地時震退附近最多 3 名敵人','倒地時震退附近最多 5 名敵人']],
   ['金鐘罩',['起身完成後無敵 1 秒','起身完成後無敵 2 秒','起身完成後無敵 3 秒']],
   ['起床氣',['起身後下一次攻擊震暈最多 1 名敵人','起身後下一次攻擊震暈最多 2 名敵人','起身後下一次攻擊震暈最多 3 名敵人']]],
  bad:[
   ['賴床王',['倒地額外延遲 1 秒','倒地額外延遲 2 秒','倒地額外延遲 3 秒']],
   ['起床腿麻',['起身後 3 秒內移速 -15%','起身後 3 秒內移速 -30%','起身後 3 秒內移速 -45%']],
   ['被角纏腳',['起身後 1 秒不能使用武器','起身後 2 秒不能使用武器','起身後 3 秒不能使用武器']]]},
 shooting:{
  good:[
   ['分裂子彈',['同一發子彈最多追擊 2 名不同敵人','同一發子彈最多追擊 3 名不同敵人','同一發子彈最多追擊 4 名不同敵人']],
   ['穩如老狗',['射擊容忍角度 +10°','射擊容忍角度 +20°','射擊容忍角度 +30°']],
   ['跳彈藝術家',['子彈撞牆後可追擊 1 次','子彈撞牆後可追擊 2 次','子彈撞牆後可追擊 3 次']]],
  bad:[
   ['描邊大師',['10% 機率故意射偏','20% 機率故意射偏','30% 機率故意射偏']],
   ['空包彈專家',['8% 機率射出無傷害子彈','15% 機率射出無傷害子彈','22% 機率射出無傷害子彈']],
   ['卡彈之王',['卡彈後需 2 秒修復','卡彈後需 4 秒修復','卡彈後需 6 秒修復']]]},
 grenade:{
  good:[
   ['子母手榴彈',['爆炸後分裂 2 顆小炸彈','爆炸後分裂 3 顆小炸彈','爆炸後分裂 4 顆小炸彈']],
   ['連環爆炸',['原地追加 1 次延遲爆炸','原地追加 2 次延遲爆炸','原地追加 3 次延遲爆炸']],
   ['爆炸藝術家',['手榴彈爆炸半徑 +25%','手榴彈爆炸半徑 +50%','手榴彈爆炸半徑 +80%']]],
  bad:[
   ['啞彈大師',['8% 機率不爆炸','16% 機率不爆炸','24% 機率不爆炸']],
   ['彈力球',['碰地後額外亂彈 1 次','碰地後額外亂彈 2 次','碰地後額外亂彈 3 次']],
   ['保險絲太長',['爆炸額外延遲 1 秒','爆炸額外延遲 2 秒','爆炸額外延遲 3 秒']]]},
 weed:{
  good:[
   ['人體割草機',['一拳最多掃到 2 名敵人','一拳最多掃到 3 名敵人','一拳最多掃到 4 名敵人']],
   ['力大無窮',['被你擊飛的敵人落地時，對周圍 1.5 公尺敵人造成傷害','被你擊飛的敵人落地時，對周圍 3 公尺敵人造成傷害','被你擊飛的敵人落地時，對周圍 4.5 公尺敵人造成傷害']],
   ['雜草的根性',['每輪免除一次致命傷並無敵 1 秒','每輪免除一次致命傷並無敵 2 秒','每輪免除一次致命傷並無敵 3 秒']]],
  bad:[
   ['拔錯根',['10% 機率把敵人拉向自己','20% 機率把敵人拉向自己','30% 機率把敵人拉向自己']],
   ['手套破洞',['連打 5 拳後短暫無法出拳','連打 4 拳後短暫無法出拳','連打 3 拳後短暫無法出拳']],
   ['吃土專家',['倒地後 2 秒無法換武器','倒地後 4 秒無法換武器','倒地後 6 秒無法換武器']]]},
 swipe:{
  good:[
   ['已讀不回',['護盾被打破後每 15 秒恢復 1 層','護盾被打破後每 10 秒恢復 1 層','護盾被打破後每 6 秒恢復 1 層']],
   ['反彈訊息',['10% 機率反彈敵方子彈','20% 機率反彈敵方子彈','30% 機率反彈敵方子彈']],
   ['極限手速',['換彈後自動追加 1 次射擊（耗彈）','換彈後自動追加 2 次射擊（耗彈）','換彈後自動追加 3 次射擊（耗彈）']]],
  bad:[
   ['滑錯邊',['10% 機率瞄向其他敵人','20% 機率瞄向其他敵人','30% 機率瞄向其他敵人']],
   ['推播轟炸',['換彈後 15% 機率短暫不能射擊','換彈後 25% 機率短暫不能射擊','換彈後 35% 機率短暫不能射擊']],
   ['拇指打結',['8% 機率需再按一次才能射擊','16% 機率需再按一次才能射擊','24% 機率需再按一次才能射擊']]]},
 singing:{
  good:[
   ['精神答數！',['最多 1 名友軍同步集火','最多 3 名友軍同步集火','最多 5 名友軍同步集火']],
   ['全軍士氣高昂',['五名友軍射擊頻率 +20%','五名友軍射擊頻率 +40%','五名友軍射擊頻率 +60%']],
   ['班長的口令',['五名友軍承受傷害 -15%','五名友軍承受傷害 -30%','五名友軍承受傷害 -45%']]],
  bad:[
   ['全員走音',['偶爾有 1 名友軍暫停射擊','偶爾有 2 名友軍暫停射擊','偶爾有 3 名友軍暫停射擊']],
   ['聽錯口令',['每波 1 名友軍跑向錯誤位置','每波 2 名友軍跑向錯誤位置','每波 3 名友軍跑向錯誤位置']],
   ['忘詞王',['每波 1 名友軍延後參戰','每波 2 名友軍延後參戰','每波 3 名友軍延後參戰']]]}
};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(n))?Number(n):a));
const scoreTier=s=>{
 const score=clamp(Math.round(Number(s)),0,100);
 return score>=90?{positive:true,level:3}:score>=70?{positive:true,level:2}:score>=50?{positive:true,level:1}:
  score<20?{positive:false,level:3}:score<35?{positive:false,level:2}:{positive:false,level:1};
};
const medalsForScore=s=>s>=90?7:s>=70?5:s>=50?4:s>=35?3:s>=20?2:1;
const fresh=()=>({version:1,medals:0,rank:0,weapons:{pistol:0,rifle:0},training:{}});
const freshRun=()=>({version:1,id:Date.now()+'-'+Math.random().toString(36).slice(2,7),trainings:{},battle:{kills:0,medals:0,seen:[]}});
function read(key,fallback){
 try{return JSON.parse((key===RUN?sessionStorage:localStorage).getItem(key)||'null')||fallback()}catch{return fallback()}
}
function write(key,obj){
 try{(key===RUN?sessionStorage:localStorage).setItem(key,JSON.stringify(obj));return true}catch(e){console.warn('[軍功簿] 儲存失敗',e);return false}
}
const state=()=>{const s=read(STORE,fresh);return {...fresh(),...s,weapons:{...fresh().weapons,...(s.weapons||{})},training:s.training||{}}};
const run=()=>{const r=read(RUN,freshRun);return {...freshRun(),...r,trainings:r.trainings||{},battle:r.battle||{kills:0,medals:0,seen:[]}}};
function beginRun(){const r=freshRun();write(RUN,r);return r}
function awardTraining(kind,score){
 if(!NAMES[kind])return null;
 const r=run(),s=state();
 const previous=r.trainings[kind];
 if(previous)return {...previous,first:false};
 const points=clamp(Math.round(Number(score)),0,100);
 const tier=scoreTier(points),pool=TRAITS[kind][tier.positive?'good':'bad'];
 const pick=pool[Math.floor(Math.random()*pool.length)];
 const reward={kind,score:points,medals:medalsForScore(points),positive:tier.positive,
   level:tier.level,name:pick[0],description:pick[1][tier.level-1],first:true};
 r.trainings[kind]=reward;
 s.medals+=reward.medals;
 if(!write(RUN,r))return null;
 write(STORE,s);
 return reward;
}
function enemyKill(id){
 // Friendly camp NPCs are NEVER eligible for medal rewards.
 if(id==null)return 0;
 const r=run(),b=r.battle;if(!Array.isArray(b.seen))b.seen=[];
 if(b.seen.includes(String(id)))return 0;
 const n=(b.kills||0)+1;
 const award=n<=10?1:n<=30?2:3;
 b.seen.push(String(id));b.kills=n;b.medals=(b.medals||0)+award;
 const s=state();s.medals+=award;
 if(!write(RUN,r))return 0;
 write(STORE,s);
 return award;
}
const rankCost=i=>8+Math.round(i*i*1.8+i*2);
const gunCost=(name,lvl)=>lvl===0?(name==='pistol'?20:60):(name==='pistol'?[12,18,25,36][Math.min(lvl-1,3)]:[24,34,48,70][Math.min(lvl-1,3)]);
const trainingCost=lvl=>[8,18,35][Math.min(lvl,2)];
function buy(category,id){
 const s=state();let price=Infinity,success=false;
 if(category==='rank'&&s.rank<RANKS.length-1){
  price=rankCost(s.rank);
  if(s.medals>=price){s.rank++;success=true}
 }else if(category==='weapon'&&['pistol','rifle'].includes(id)&&s.weapons[id]<5){
  price=gunCost(id,s.weapons[id]);
  if(s.medals>=price){s.weapons[id]++;success=true}
 }else if(category==='training'&&TRAINING.some(t=>t.id===id)){
  const level=clamp(s.training[id]||0,0,3);
  if(level<3){price=trainingCost(level);if(s.medals>=price){s.training[id]=level+1;success=true}}
 }
 if(success){s.medals-=price;write(STORE,s)}
 return {success,price,medals:s.medals};
}
function make(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;
}
function rewardPanel(kind,score,anchor){
 if(!anchor||!anchor.parentNode)return null;
 const record=awardTraining(kind,score);if(!record)return null;
 const id='armyTrainingReward-'+kind;
 let box=document.getElementById(id);
 if(box)box.remove();
 box=make('details','army-reward');box.id=id;
 const summary=make('summary','army-reward__summary',(record.first?'🎖 +'+record.medals:'🎖 已領取')+'　'+(record.positive?'正面':'負面')+'：'+record.name+' Lv.'+record.level);
 box.append(summary);
 const detail=make('div','army-reward__desc',record.description);
 const foot=make('div','army-reward__foot','本輪特質 · 暫不生效 · 本輪每項訓練僅發獎一次');
 box.append(detail,foot);
 anchor.insertAdjacentElement('afterend',box);
 return record;
}
function upgradeUI(){
 const host=$('armyUpgradeDialog'),open=$('armyUpgradeOpen');
 if(!host||!open)return;
 const view=$('armyUpgradeView'),head=$('armyUpgradeMedals'),tabs=host.querySelectorAll('[data-tab]');
 let tab='rank';
 function render(){
  const s=state();head.textContent='🎖 '+s.medals+' 枚';$('armyHomeMedals').textContent='🎖 '+s.medals+' · '+RANKS[clamp(s.rank,0,RANKS.length-1)];
  for(const t of tabs)t.classList.toggle('selected',t.dataset.tab===tab);
  view.replaceChildren();
  const addCard=(name,caption,description,level,cost,action)=>{
   const card=make('details','army-upgrade-card');
   const sum=make('summary','army-upgrade-card__summary');
   const meta=make('span','','');
   const title=make('strong','',name);const sub=make('small','',caption);
   meta.append(title,sub);sum.append(meta,make('span','army-upgrade-card__chevron','›'));
   card.append(sum);
   const info=make('div','army-upgrade-card__body');
   info.append(make('p','',description));
   if(level!==null&&cost!==null){
    const btn=make('button','army-upgrade-buy', '🎖 '+cost+' · 升級');
    btn.type='button';btn.disabled=cost>s.medals;
    btn.addEventListener('click',ev=>{ev.preventDefault();const result=action();if(result.success){render();const toast=$('armyUpgradeToast');toast.textContent='升級已記錄（能力尚未生效）'}});
    info.append(btn);
   }else info.append(make('small','','已達目前最高等級'));
   card.append(info);view.append(card);
  };
  if(tab==='rank'){
   const k=clamp(s.rank,0,RANKS.length-1),next=k<RANKS.length-1?rankCost(k):null;
   addCard('軍階：'+RANKS[k],next!==null?'下一階：'+RANKS[k+1]:'最高軍階',
    '預計提升血量、防禦、基礎傷害及移動速度，並解鎖軍階專屬趣味事件。現在僅記錄軍階。',k,next,()=>buy('rank'));
  }else if(tab==='weapon'){
   for(const [id,name,note] of [['pistol','手槍','彈匣、換彈、射速、武器傷害'],['rifle','步槍','彈匣、射擊模式、換彈、武器傷害']]){
    const lvl=clamp(s.weapons[id],0,5);
    addCard(name,lvl?'已解鎖 · Lv.'+lvl:'尚未解鎖',
     '永久解鎖後預計從進營區就能使用；逐級強化'+note+'。目前不改動任何槍械使用權或數值。',
     lvl,lvl<5?gunCost(id,lvl):null,()=>buy('weapon',id));
   }
  }else{
   for(const kind of Object.keys(NAMES)){
    view.append(make('h3','army-upgrade-group',NAMES[kind]));
    for(const t of TRAINING.filter(t=>t.kind===kind)){
     const lvl=clamp(s.training[t.id]||0,0,3);
     const levelDesc=lvl?'目前：'+t.effect[lvl-1]:'尚未學習';
     addCard(t.name,'Lv.'+lvl+'/3 · '+levelDesc,
      t.note+'。升級後：'+(lvl<3?t.effect[lvl]:'已達最高等級')+'（目前僅記錄，尚未套用）。',
      lvl,lvl<3?trainingCost(lvl):null,()=>buy('training',t.id));
    }
   }
  }
 }
 open.addEventListener('click',()=>{host.hidden=false;tab='rank';$('armyUpgradeToast').textContent='所有能力目前僅供展示，不影響遊戲';render()});
 $('armyUpgradeClose').addEventListener('click',()=>{host.hidden=true});
 host.addEventListener('click',e=>{if(e.target===host)host.hidden=true});
 for(const t of tabs)t.addEventListener('click',()=>{tab=t.dataset.tab;render()});
 window.addEventListener('storage',()=>{if(!host.hidden)render()});
 const s=state();$('armyHomeMedals').textContent='🎖 '+s.medals+' · '+RANKS[clamp(s.rank,0,RANKS.length-1)];
}
function battleSummary(){
 const r=run(),b=r.battle||{},trainings=Object.values(r.trainings||{});
 return {kills:b.kills||0,battleMedals:b.medals||0,trainingMedals:trainings.reduce((n,t)=>n+(t.medals||0),0),trainings};
}
function renderBattleSummary(){
 const parent=$('campCombatFinish');
 if(!parent)return;
 const s=battleSummary();
 let el=$('armyBattleMedalSummary');if(!el){el=make('div','army-battle-summary');el.id='armyBattleMedalSummary';const btn=$('campCombatRestart');btn?.insertAdjacentElement('beforebegin',el)}
 if(el)el.textContent='🎖 本輪訓練 +'+s.trainingMedals+'　·　敵軍擊殺 +'+s.battleMedals+'　·　合計 '+(s.trainingMedals+s.battleMedals);
}
window.armyProgression={NAMES,TRAINING,TRAITS,RANKS,scoreTier,medalsForScore,beginRun,awardTraining,enemyKill,buy,state,run,battleSummary,rewardPanel,renderBattleSummary};
window.addEventListener('army:blanket:finished',e=>{
 const anchor=document.getElementById('modal')?.querySelector('.big');
 if(anchor)rewardPanel('blanket',e.detail?.score,anchor);
});
window.addEventListener('army:shooting:result',e=>{
 const anchor=$('shootScore')?.closest('.shootScorebox')||$('shootScore');
 if(anchor)rewardPanel('shooting',e.detail?.score,anchor);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',upgradeUI,{once:true});
else upgradeUI();
})();