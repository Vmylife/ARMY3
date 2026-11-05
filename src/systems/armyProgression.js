/* ARMY3 progression preview v1: economy, rank, armory, training skill and per-run trait journal.
 * Gameplay-affecting bonuses are still a preview here; the final-battle combat test implements its own hit feel.
 */
(()=>{
'use strict';
const STORE='ARMY3_progression_v1',RUN='ARMY3_progression_run_v1';
const $=id=>document.getElementById(id);
const RANKS=['新兵','二等兵','一等兵','上等兵','下士','中士','上士','少尉','中尉','上尉','少校','中校','上校','少將','中將','上將'];
const NAMES={blanket:'棉被疊疊樂',shooting:'實彈射擊',grenade:'手榴彈投擲',weed:'拔草鑑測',swipe:'中山室滑手機',singing:'唱軍歌'};
const TRAINING=[
 {id:'blanket-stack',kind:'blanket',name:'疊被大師',effect:['一次疊 2 層棉被','一次疊 3 層棉被','一次疊 4 層棉被'],note:'一次完成多層棉被'},
 {id:'blanket-align',kind:'blanket',name:'豆腐干職人',effect:['對齊容錯 +25%','對齊容錯 +50%','對齊容錯 +75%'],note:'更容易把棉被疊整齊'},
 {id:'shoot-breathe',kind:'shooting',name:'呼吸控制',effect:['準星晃動 -20%','準星晃動 -50%','準星晃動 -80%'],note:'降低準星晃動'},
 {id:'shoot-paper',kind:'shooting',name:'靶場老鳥',effect:['靶紙左右寬度 +20%','靶紙左右寬度 +50%','靶紙左右寬度 +80%'],note:'只增加靶紙左右寬度'},
 {id:'grenade-pitch',kind:'grenade',name:'棒球投手',effect:['計量條速度 -20%','計量條速度 -40%','計量條速度 -60%'],note:'方向、距離計量條放慢'},
 {id:'grenade-retry',kind:'grenade',name:'再給我一次機會',effect:['每場可重投 1 次','每場可重投 2 次','每場可重投 3 次'],note:'投歪時可以重新投擲'},
 {id:'weed-tolerance',kind:'weed',name:'鏟土容錯',effect:['額外允許鏟錯 1 次','額外允許鏟錯 2 次','額外允許鏟錯 3 次'],note:'原本鏟錯兩次會壞，Lv.1 改成三次'},
 {id:'weed-boss',kind:'weed',name:'王草剋星',effect:['每點王草多鏟 1 下','每點王草多鏟 2 下','每點王草多鏟 3 下'],note:'王草一次點擊可鏟更多下'},
 {id:'swipe-score',kind:'swipe',name:'班長媽媽雷達',effect:['滑卡總分 ×1.2','滑卡總分 ×1.5','滑卡總分 ×2'],note:'分數上限 100 分'},
 {id:'swipe-undo',kind:'swipe',name:'後悔藥',effect:['每場撤銷錯誤滑卡 1 次','每場撤銷錯誤滑卡 2 次','每場撤銷錯誤滑卡 3 次'],note:'滑錯可以撤銷'},
 {id:'singing-memory',kind:'singing',name:'軍歌速記',effect:['記憶顯示 +1 秒','記憶顯示 +2 秒','記憶顯示 +3 秒'],note:'軍歌記憶時間延長'},
 {id:'singing-pitch',kind:'singing',name:'絕對音感',effect:['音準容錯 +20%','音準容錯 +40%','音準容錯 +60%'],note:'音準判定更寬鬆'}
];
const TRAITS={
 blanket:{
  good:[
   ['彈簧棉被',['每擊殺 5 名敵軍，回復 3 HP（每波最多 1 次）','每擊殺 5 名敵軍，回復 5 HP（每波最多 1 次）','每擊殺 5 名敵軍，回復 8 HP（每波最多 1 次）']],
   ['金鐘罩',['受到敵軍傷害 -8%','受到敵軍傷害 -15%','受到敵軍傷害 -22%']],
   ['起床氣',["HP 低於 40%，所有傷害 +10%","HP 低於 40%，所有傷害 +20%","HP 低於 40%，所有傷害 +30%"]]],
  bad:[
   ['賴床王',['移動速度 -5%','移動速度 -10%','移動速度 -15%']],
   ['起床腿麻',['全力衝刺速度 -8%','全力衝刺速度 -16%','全力衝刺速度 -24%']],
   ['被角纏腳',["換完彈匣後 2 秒內所有傷害 -20%","換完彈匣後 2 秒內所有傷害 -30%","換完彈匣後 2 秒內所有傷害 -50%"]]]},
 shooting:{
  good:[
   ['分裂子彈',["開槍時射出最多 2 發可見追蹤彈，分別攻擊不同敵軍","開槍時射出最多 3 發可見追蹤彈，分別攻擊不同敵軍","開槍時射出最多 4 發可見追蹤彈，分別攻擊不同敵軍"]],
   ['穩如老狗',['射擊容忍角度 +10°','射擊容忍角度 +20°','射擊容忍角度 +30°']],
   ['跳彈藝術家',['子彈撞牆後可追擊 1 次','子彈撞牆後可追擊 2 次','子彈撞牆後可追擊 3 次']]],
  bad:[
   ['描邊大師',["20% 機率故意射偏","35% 機率故意射偏","50% 機率故意射偏"]],
   ['空包彈專家',["15% 機率射出無傷害子彈","30% 機率射出無傷害子彈","45% 機率射出無傷害子彈"]],
   ['卡彈之王',["15% 機率卡彈 2 秒","25% 機率卡彈 4 秒","35% 機率卡彈 6 秒"]]]},
 grenade:{
  good:[
   ['子母手榴彈',['爆炸後分裂 2 顆小炸彈','爆炸後分裂 3 顆小炸彈','爆炸後分裂 4 顆小炸彈']],
   ['連環爆炸',['原地追加 1 次延遲爆炸','原地追加 2 次延遲爆炸','原地追加 3 次延遲爆炸']],
   ['爆炸藝術家',['手榴彈爆炸半徑 +25%','手榴彈爆炸半徑 +50%','手榴彈爆炸半徑 +80%']]],
  bad:[
   ['啞彈大師',["20% 機率不爆炸","35% 機率不爆炸","50% 機率不爆炸"]],
   ['彈力球',['碰地後額外亂彈 1 次','碰地後額外亂彈 2 次','碰地後額外亂彈 3 次']],
   ['保險絲太長',['爆炸額外延遲 1 秒','爆炸額外延遲 2 秒','爆炸額外延遲 3 秒']]]},
 weed:{
  good:[
   ['人體割草機',['一拳最多掃到 2 名敵人','一拳最多掃到 3 名敵人','一拳最多掃到 4 名敵人']],
   ['力大無窮',['被你擊飛的敵人落地時，對周圍 1.5 公尺敵人造成傷害','被你擊飛的敵人落地時，對周圍 3 公尺敵人造成傷害','被你擊飛的敵人落地時，對周圍 4.5 公尺敵人造成傷害']],
   ['雜草的根性',['每輪免除一次致命傷並無敵 1 秒','每輪免除一次致命傷並無敵 2 秒','每輪免除一次致命傷並無敵 3 秒']]],
  bad:[
   ['拔錯根',["20% 機率揮拳打到自己（6 HP）","35% 機率揮拳打到自己（9 HP）","50% 機率揮拳打到自己（12 HP）"]],
   ['手套破洞',['連打 5 拳後短暫無法出拳','連打 4 拳後短暫無法出拳','連打 3 拳後短暫無法出拳']],
   ['吃土專家',['生命低於 30% 時，受到敵軍傷害 +10%','生命低於 30% 時，受到敵軍傷害 +20%','生命低於 30% 時，受到敵軍傷害 +30%']]]},
 swipe:{
  good:[
   ['已讀不回',['護盾最多 2 層，每 15 秒恢復 1 層','護盾最多 2 層，每 10 秒恢復 1 層','護盾最多 2 層，每 6 秒恢復 1 層']],
   ['反彈訊息',["10% 機率反擊敵軍子彈","20% 機率反擊敵軍子彈","30% 機率反擊敵軍子彈"]],
   ['極限手速',["換完彈匣後首次射擊追加 1 發（耗彈）","換完彈匣後首次射擊追加 2 發（耗彈）","換完彈匣後首次射擊追加 3 發（耗彈）"]]],
  bad:[
   ['滑錯邊',["20% 機率瞄向其他敵人","35% 機率瞄向其他敵人","50% 機率瞄向其他敵人"]],
   ['推播轟炸',["換完彈匣後 25% 機率鎖住射擊 1.2 秒","換完彈匣後 40% 機率鎖住射擊 1.2 秒","換完彈匣後 55% 機率鎖住射擊 1.2 秒"]],
   ['拇指打結',["20% 機率需放開再按一次才能射擊","35% 機率需放開再按一次才能射擊","50% 機率需放開再按一次才能射擊"]]]},
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
// Old session rewards may already have been rolled before the perk redesign.
 // Keep the same rolled name/tier and display the NEW level text.
const refreshTraitText=t=>{
 if(!t?.name||!t.kind)return t;
 const row=(TRAITS[t.kind]?.[t.positive?'good':'bad']||[]).find(x=>x[0]===t.name);
 return row?{...t,description:row[1][clamp(t.level||1,1,3)-1]}:t;
};
const run=()=>{
 const r=read(RUN,freshRun);
 return {...freshRun(),...r,
  trainings:Object.fromEntries(Object.entries(r.trainings||{}).map(([k,v])=>[k,refreshTraitText(v)])),
  battle:r.battle||{kills:0,medals:0,seen:[]}};
};
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
 const foot=make('div','army-reward__foot','本輪限定');
 box.append(detail,foot);
 anchor.insertAdjacentElement('afterend',box);
 return record;
}
// Military rank progress is a saved blueprint in this release, not live combat buffs.
const RANK_GAIN={hp:15,defense:2,damage:3,speed:1};
const rankBonus=level=>({hp:level*RANK_GAIN.hp,defense:level*RANK_GAIN.defense,
 damage:level*RANK_GAIN.damage,speed:level*RANK_GAIN.speed});
// Explicit per-level weapon specifications; none are applied to the current combat engine yet.
const WEAPON_LEVELS={
 pistol:[
  {mag:1,damage:20,reload:2.5,interval:0.50,mode:'單發'},
  {mag:3,damage:22,reload:2.2,interval:0.42,mode:'單發'},
  {mag:6,damage:24,reload:1.9,interval:0.35,mode:'單發'},
  {mag:9,damage:27,reload:1.6,interval:0.30,mode:'單發'},
  {mag:12,damage:30,reload:1.3,interval:0.25,mode:'單發'}],
 rifle:[
  {mag:3,damage:30,reload:3.0,interval:0.42,mode:'半自動'},
  {mag:6,damage:32,reload:2.7,interval:0.35,mode:'三連發'},
  {mag:12,damage:35,reload:2.4,interval:0.25,mode:'慢速連發'},
  {mag:20,damage:38,reload:2.0,interval:0.17,mode:'連發'},
  {mag:30,damage:40,reload:1.6,interval:0.125,mode:'高速連發'}]
};
const WEAPON_NAMES={fists:'拳頭',pistol:'手槍',rifle:'步槍'};
const weaponStats=x=>['彈匣 '+x.mag+' 發','傷害 '+x.damage,'換彈 '+x.reload+' 秒','射擊間隔 '+x.interval+' 秒',x.mode];
function updateHomeWallet(){
 const target=$('armyHomeMedals');if(!target)return;
 const s=state();
 target.textContent='🎖 '+s.medals+' · '+RANKS[clamp(s.rank,0,RANKS.length-1)];
}
function upgradeUI(){
 const host=$('armyUpgradeDialog'),open=$('armyUpgradeOpen');
 if(!host||!open)return;
 const view=$('armyUpgradeView'),head=$('armyUpgradeMedals'),tabs=host.querySelectorAll('[data-tab]'),toast=$('armyUpgradeToast');
 let tab='rank';
 const detailLine=(el,label,value)=>{
  const row=make('div','army-upgrade-metric');
  row.append(make('span','',label),make('strong','',value));
  el.append(row);
 };
 const addCard=({id,name,caption,tip,lines=[],cost=null,action=null,levels=[]})=>{
  const card=make('details','army-upgrade-card');card.dataset.key=id;
  const summary=make('summary','army-upgrade-card__summary');
  const meta=make('span','');
  meta.append(make('strong','',name),make('small','',caption));
  summary.append(meta,make('span','army-upgrade-card__chevron','›'));
  card.append(summary);
  const body=make('div','army-upgrade-card__body');
  if(tip)body.append(make('p','army-upgrade-explain',tip));
  if(lines.length){
   const metrics=make('div','army-upgrade-metrics');
   for(const [label,val]of lines)detailLine(metrics,label,val);
   body.append(metrics);
  }
  if(levels.length){
   const list=make('div','army-upgrade-levels');
   for(const item of levels){
    const row=make('div','army-upgrade-level'+(item.active?' active':'')+(item.next?' next':''));
    row.append(make('strong','',item.label),make('span','',item.text));list.append(row);
   }
   body.append(list);
  }
  if(cost!==null&&action){
   const btn=make('button','army-upgrade-buy','🎖 '+cost+' · 升級');
   btn.type='button';btn.disabled=cost>state().medals;
   btn.addEventListener('click',event=>{
    event.preventDefault();
    const outcome=action();
    if(!outcome.success)return;
    render(id);
    if(toast){toast.hidden=false;toast.textContent='升級成功'}
   });
   body.append(btn);
  }
  card.append(body);view.append(card);
  return card;
 };
 function render(focusId=null){
  const y=view.scrollTop,s=state();
  head.textContent='🎖 '+s.medals+' 枚';updateHomeWallet();
  for(const t of tabs){
   t.classList.toggle('selected',t.dataset.tab===tab);
   t.setAttribute('aria-selected',String(t.dataset.tab===tab));
  }
  view.replaceChildren();
  if(tab==='rank'){
   const k=clamp(s.rank,0,RANKS.length-1),next=k<RANKS.length-1?rankCost(k):null;
   const now=rankBonus(k),after=rankBonus(k+1);
   addCard({id:'rank',name:RANKS[k],caption:next===null?'最高軍階':'下一階：'+RANKS[k+1],
    tip:next===null?'已達最高軍階':'升階增加的能力',
    lines:next===null?
     [['生命加成','+'+now.hp+' HP'],['防禦加成','+'+now.defense+'%'],['攻擊加成','+'+now.damage+'%'],['移速加成','+'+now.speed+'%']]:
     [['生命上限','+'+RANK_GAIN.hp+' HP'],['防禦減傷','+'+RANK_GAIN.defense+'%'],['攻擊傷害','+'+RANK_GAIN.damage+'%'],['移動速度','+'+RANK_GAIN.speed+'%']],
    levels:next===null?[]:[{label:'升階後累計',text:'HP +'+after.hp+' · 防禦 +'+after.defense+'% · 攻擊 +'+after.damage+'% · 移速 +'+after.speed+'%'}],
    cost:next,action:()=>buy('rank')});
  }else if(tab==='weapon'){
   for(const id of ['pistol','rifle']){
    const level=clamp(s.weapons[id],0,5),spec=WEAPON_LEVELS[id];
    const next=level<5?spec[level]:null;
    addCard({id,name:WEAPON_NAMES[id],caption:level?'Lv.'+level+'/5':'未解鎖',
     tip:level===0?'解鎖後可升級五個階段':null,
     lines:next?[['下級彈匣',next.mag+' 發'],['下級傷害',String(next.damage)],['下級換彈',next.reload+' 秒'],['下級射擊間隔',next.interval+' 秒']]:[],
     levels:spec.map((x,i)=>({label:'Lv.'+(i+1),text:weaponStats(x).join(' · '),active:level===i+1,next:level===i})),
     cost:level<5?gunCost(id,level):null,action:()=>buy('weapon',id)});
   }
  }else{
   for(const kind of Object.keys(NAMES)){
    view.append(make('h3','army-upgrade-group',NAMES[kind]));
    for(const t of TRAINING.filter(x=>x.kind===kind)){
     const level=clamp(s.training[t.id]||0,0,3);
     addCard({id:t.id,name:t.name,caption:'Lv.'+level+'/3'+(level?' · '+t.effect[level-1]:''),
      tip:t.note,
      levels:t.effect.map((x,i)=>({label:'Lv.'+(i+1),text:x,active:level===i+1,next:level===i})),
      cost:level<3?trainingCost(level):null,action:()=>buy('training',t.id)});
    }
   }
  }
  if(focusId){
   const selected=Array.from(view.querySelectorAll('details')).find(x=>x.dataset.key===focusId);
   if(selected)selected.open=true;
   view.scrollTop=y;
  }else view.scrollTop=0;
 }
 open.addEventListener('click',()=>{
  host.hidden=false;tab='rank';if(toast)toast.hidden=true;render();
 });
 $('armyUpgradeClose').addEventListener('click',()=>{host.hidden=true});
 host.addEventListener('click',e=>{if(e.target===host)host.hidden=true});
 for(const t of tabs)t.addEventListener('click',()=>{tab=t.dataset.tab;if(toast)toast.hidden=true;render()});
 window.addEventListener('storage',()=>{updateHomeWallet();if(!host.hidden)render()});
 updateHomeWallet();
}
function mountCampStatus(combat,options={}){
 if(!combat?.root||$('campCharacterButton'))return false;
 const root=combat.root;
 const button=make('button','army-character-trigger');
 button.id='campCharacterButton';button.type='button';
 button.setAttribute('aria-label','角色狀態');
 button.innerHTML='<span aria-hidden="true">🪖</span><small>狀態</small>';
 const dialog=make('div','army-character-dialog');
 dialog.id='campCharacterDialog';dialog.hidden=true;
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label','角色狀態');
 dialog.innerHTML=
 '<section class="army-character-panel">'+
 '<header class="army-character-header"><div><h2>角色狀態</h2><small id="campCharacterRank"></small></div>'+
 '<button id="campCharacterClose" type="button" aria-label="關閉">×</button></header>'+
 '<nav class="army-character-tabs" aria-label="角色狀態分頁">'+
 '<button type="button" data-status-tab="base">素質</button>'+
 '<button type="button" data-status-tab="weapon">武器</button>'+
 '<button type="button" data-status-tab="training">訓練</button>'+
 '<button type="button" data-status-tab="traits">特質</button>'+
 '<button type="button" data-status-tab="record">紀錄</button>'+
 '</nav><div class="army-character-body" id="campCharacterBody"></div></section>';
 root.append(button,dialog);
 const view=$('campCharacterBody'),tabs=dialog.querySelectorAll('[data-status-tab]'),close=$('campCharacterClose');
 let tab='base';
 const section=title=>view.append(make('h3','army-character-section',title));
 const row=(label,value)=>{
  const item=make('div','army-character-row');
  item.append(make('span','',label),make('strong','',value));
  view.append(item);
 };
 const chip=(label,value)=>{
  const el=make('div','army-character-chip');
  el.append(make('small','',label),make('strong','',value));
  return el;
 };
 const cards=(data)=>{
  const grid=make('div','army-character-grid');
  for(const [label,value]of data)grid.append(chip(label,value));
  view.append(grid);
 };
 const card=(title,subtitle,description,tone='')=>{
  const el=make('details','army-character-card'+(tone?' '+tone:''));
  const summary=make('summary','');
  const name=make('span','');
  name.append(make('strong','',title),make('small','',subtitle));
  summary.append(name,make('span','army-character-chevron','›'));
  el.append(summary);
  if(description)el.append(make('p','',description));
  view.append(el);
 };
 const fmt=n=>Number(n).toFixed(1).replace(/\.0$/,'');
 function render(){
  const s=state(),r=run(),rank=clamp(s.rank,0,RANKS.length-1);
  $('campCharacterRank').textContent=RANKS[rank]+' · 🎖 '+s.medals;
  for(const t of tabs){
   t.classList.toggle('selected',t.dataset.statusTab===tab);
   t.setAttribute('aria-selected',String(t.dataset.statusTab===tab));
  }
  view.replaceChildren();
  if(tab==='base'){
   section('目前作戰數值');
   cards([['生命',Math.ceil(combat.hp)+' / 100'],['防禦減傷','0%'],
    ['目前武器',WEAPON_NAMES[combat.weapon]||'拳頭'],['軍階',RANKS[rank]]]);
   section('攻擊力');
   row('拳頭','10');row('手槍','25');row('步槍','40');
   section('移動速度');
   row('走路',fmt(options.moveSpeed??4.2)+' m/s');
   row('跑步',fmt(options.runSpeed??6.6)+' m/s');
   row('衝刺',fmt(options.sprintSpeed??8.3)+' m/s');
   section('軍階增益');
   const bonus=rankBonus(rank);
   cards([['生命','+'+bonus.hp+' HP'],['防禦','+'+bonus.defense+'%'],['攻擊','+'+bonus.damage+'%'],['移速','+'+bonus.speed+'%']]);
   view.append(make('p','army-character-footnote','軍階增益目前尚未生效'));
   section('當前狀態');
   row('警戒',combat.provoked?'警戒中':'正常');
   row('角色',combat.gameOver?'陣亡':combat.playerDown>0?'倒地':combat.playerRise>0?'起身中':'正常');
  }else if(tab==='weapon'){
   section('目前裝備');
   row('手持武器',WEAPON_NAMES[combat.weapon]||'拳頭');
   row('拳頭傷害','10');row('手槍傷害','25');row('步槍傷害','40');
   section('武器升級');
   for(const id of ['pistol','rifle']){
    const level=clamp(s.weapons[id],0,5),spec=level?WEAPON_LEVELS[id][level-1]:null;
    card(WEAPON_NAMES[id],level?'Lv.'+level+'/5':'尚未解鎖',
      spec?weaponStats(spec).join(' · '):'前往首頁升級以解鎖');
   }
   view.append(make('p','army-character-footnote','武器升級數值目前尚未生效'));
  }else if(tab==='training'){
   const owned=TRAINING.filter(t=>clamp(s.training[t.id]||0,0,3)>0);
   section('已學習 · '+owned.length+'/12');
   if(!owned.length)view.append(make('p','army-character-empty','尚未學習訓練天賦'));
   for(const kind of Object.keys(NAMES)){
    const selected=owned.filter(t=>t.kind===kind);
    if(!selected.length)continue;
    section(NAMES[kind]);
    for(const t of selected){
     const lvl=clamp(s.training[t.id]||0,1,3);
     card(t.name,'Lv.'+lvl,t.effect[lvl-1]);
    }
   }
  }else if(tab==='traits'){
   const earned=Object.values(r.trainings||{}).filter(t=>t?.name);
   section('本輪戰鬥特質 · '+earned.length+'/6');
   if(!earned.length)view.append(make('p','army-character-empty','尚未取得戰鬥特質'));
   for(const t of earned)card(t.name+' · Lv.'+t.level,(NAMES[t.kind]||'訓練')+' · '+(t.positive?'正面':'負面'),
    t.description,t.positive?'good':'bad');
  }else{
   const b=r.battle||{},earned=Object.values(r.trainings||{});
   section('本輪戰績');
   cards([['訓練完成',earned.length+' / 6'],['軍營擊殺',String(combat.kills)],
    ['敵軍擊殺',String(b.kills||0)],['榮譽勳章',String(s.medals)]]);
   section('本輪榮譽勳章');
   row('訓練獎勵','+'+earned.reduce((n,x)=>n+(x.medals||0),0));
   row('敵軍擊殺','+'+(b.medals||0));
   section('訓練成績');
   for(const kind of Object.keys(NAMES)){
    const result=r.trainings?.[kind];
    row(NAMES[kind],result?result.score+' 分 · 🎖 +'+result.medals:'未完成');
   }
  }
  view.scrollTop=0;
 }
 function shut(){dialog.hidden=true;window.armyCharacterStatusOpen=false;}
 function show(){
  if(combat.gameOver||window.armyMinigameActive)return;
  if(combat.wheelOpen)combat.closeWheel(false);
  combat.attackPointer=null;combat.attackKeyboard=false;
  tab='base';render();dialog.hidden=false;window.armyCharacterStatusOpen=true;
 }
 button.addEventListener('click',show);
 close.addEventListener('click',shut);
 dialog.addEventListener('click',e=>{if(e.target===dialog)shut()});
 for(const t of tabs)t.addEventListener('click',()=>{tab=t.dataset.statusTab;render()});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();shut()}});
 window.addEventListener('army-map-open',shut);
 window.addEventListener('pagehide',shut);
 return true;
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
window.armyProgression={NAMES,TRAINING,TRAITS,RANKS,scoreTier,medalsForScore,beginRun,awardTraining,enemyKill,buy,state,run,battleSummary,rewardPanel,renderBattleSummary,mountCampStatus,RANK_GAIN,rankBonus,WEAPON_LEVELS};
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