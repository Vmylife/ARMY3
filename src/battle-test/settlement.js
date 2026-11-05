// Standalone ARMY3 white final-battle dossier. Intentionally distinct from
// the olive-green minigame reports; official medal storage remains untouched.
const KEY='ARMY3_battle_test_achievements_v1';
const $=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ACHIEVEMENTS=[
 {id:'first',icon:'📋',name:'初次上前線',desc:'至少迎接第一波紅軍。',rarity:'普通',check:s=>s.wave>=1},
 {id:'first_blood',icon:'🎯',name:'這不是演習',desc:'親手擊殺至少一名紅軍。',rarity:'普通',check:s=>s.kills>=1},
 {id:'five_kills',icon:'💥',name:'班長開始點名',desc:'親手擊殺五名紅軍。',rarity:'普通',check:s=>s.kills>=5},
 {id:'ten_kills',icon:'🎖️',name:'國軍十人斬',desc:'親手擊殺十名紅軍。',rarity:'稀有',check:s=>s.kills>=10},
 {id:'twenty_kills',icon:'🏅',name:'彈藥補給請加倍',desc:'親手擊殺二十名紅軍。',rarity:'史詩',check:s=>s.kills>=20},
 {id:'three_waves',icon:'📯',name:'報告！還有下一波',desc:'撐到第三波敵軍進場。',rarity:'普通',check:s=>s.wave>=3},
 {id:'five_waves',icon:'🛡️',name:'加班單已經送簽',desc:'撐到第五波敵軍進場。',rarity:'稀有',check:s=>s.wave>=5},
 {id:'eight_waves',icon:'👑',name:'退伍令無限延期',desc:'撐到第八波敵軍進場。',rarity:'傳說',check:s=>s.wave>=8},
 {id:'all_allies',icon:'🤝',name:'全員平安下哨',desc:'至少迎接第三波，五名友軍全數生還。',rarity:'史詩',check:s=>s.wave>=3&&s.allies===5},
 {id:'solo',icon:'🪖',name:'剩我一個是怎樣',desc:'五名友軍全部陣亡，仍親手擊殺五名紅軍。',rarity:'稀有',check:s=>s.allies===0&&s.kills>=5},
 {id:'observer',icon:'🔭',name:'戰地觀察員',desc:'撐到第二波，但本人零擊殺。',rarity:'稀有',check:s=>s.wave>=2&&s.kills===0},
 {id:'god_tester',icon:'🧪',name:'國軍神祕黑科技',desc:'本場開啟過無敵測試模式。',rarity:'測試',check:s=>s.god}
];
const ORDER={普通:0,稀有:1,史詩:2,傳說:3,測試:4};
function scoreOf(s){
 // Infinite-wave survival has no hard victory condition; this is a report
 // grade, NOT a reward conversion formula or formal training score.
 return clamp(Math.round(s.kills*1.9+Math.min(s.wave,10)*5.5+
  Math.min(s.seconds,220)/14+s.allies*2),0,100);
}
function medalsForKills(kills){
 // Same tiering as armyProgression.enemyKill, based ONLY on player kills.
 return Math.min(10,kills)+2*Math.max(0,Math.min(30,kills)-10)+
  3*Math.max(0,kills-30);
}
function rating(score){return score>=90?'S':score>=75?'A':score>=60?'B':score>=40?'C':score>=22?'D':'F'}
function titleOf(s){
 if(s.god)return '戰場規則測試員';
 if(s.wave>=8&&s.kills>=20)return '防線傳說';
 if(s.kills>=20)return '紅軍收割機';
 if(s.wave>=5)return '鐵血守備班';
 if(s.wave>=3)return '防線頂樑柱';
 if(s.kills>=5)return '臨時戰鬥英雄';
 return '菜鳥防衛兵';
}
function quoteOf(s){
 let lines;
 if(s.god)lines=['你開無敵打成這樣，紅軍想先找程式設計師理論。','國軍最新裝備：無敵開關。採購單上找不到這一項。'];
 else if(s.kills===0)lines=['全程零擊殺，班長懷疑你是在替敵軍導覽營區。','槍拿得很穩，穩到一個紅軍都沒被你送走。'];
 else if(s.allies===0)lines=['友軍全部退場，你一個人扛起了全連的加班費。','其他人都躺了，你還在打。這叫戰鬥意志，還是沒看到撤退通知？'];
 else if(s.wave>=8)lines=['第八波都來了，紅軍的人力資源部應該已經崩潰。','連長說可以休息了，下一秒才發現敵人還在排隊入場。'];
 else if(s.kills>=20)lines=['你殺的紅軍比營站今天賣出的麵包還多。','班長原本要寫你的缺失報告，現在改寫推薦表。'];
 else if(s.allies===5&&s.wave>=3)lines=['五個友軍一個都沒少，連長難得找不到人背鍋。','全員都活著？你可能比我們的醫務所還有用。'];
 else if(s.kills>=10)lines=['十個紅軍倒地，班長問你是不是把打靶當成打卡。','這次不是射擊鑑測，是紅軍的生涯轉換說明會。'];
 else if(s.wave>=3)lines=['第三波都撐到了，現在你可以開始擔心明天的集合時間。','連長說增援快到了，沒說增援的是哪一邊。'];
 else lines=['防線撐了一陣子，班長表示下次記得帶更多彈匣。','至少你不是第一個跑的。這已經算有紀律。'];
 return lines[(s.kills+s.wave+s.allies)%lines.length];
}
function make(tag,cls,text){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
}
function safelyLoad(){
 try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return new Set(Array.isArray(value)?value:[])}
 catch{return new Set()}
}
function safelySave(set){try{localStorage.setItem(KEY,JSON.stringify([...set]))}catch{}}
function line(label,value,glyph){
 const div=make('div','btr-stat');
 div.append(make('span','btr-stat-icon',glyph),make('small','',label),make('strong','',String(value)));
 return div;
}
export function calculateBattleStats(combat,manual=false){
 const kills=Math.max(0,Math.floor(Number(combat.kills)||0));
 const allies=combat.liveAllies.length;
 const seconds=Math.max(0,Math.round(Number(combat.survivalSeconds)||0));
 const stats={
  kills,medals:medalsForKills(kills),allies,wave:Math.max(1,combat.wave),
  seconds,allyKills:Math.max(0,Math.floor(combat.defenderKills||0)),
  spawned:Math.max(0,Math.floor(combat.totalSpawns||0)),
  god:!!combat.usedInvincible,manual:!!manual
 };
 stats.score=scoreOf(stats);stats.grade=rating(stats.score);
 return stats;
}
export function renderBattleSettlement(combat,{manual=false}={}){
 const root=$('campCombatFinish'),title=$('campFinishTitle'),restart=$('campCombatRestart');
 if(!root||!title||!restart)return null;
 if(root.dataset.reportDone==='1')return null;
 root.dataset.reportDone='1';
 const s=calculateBattleStats(combat,manual);
 const known=safelyLoad(),earned=ACHIEVEMENTS.filter(a=>a.check(s));
 const fresh=earned.filter(a=>!known.has(a.id));
 for(const a of earned)known.add(a.id);
 safelySave(known);
 const shell=make('article','btr-sheet');
 shell.setAttribute('aria-label','最終戰役結算報告');
 shell.setAttribute('role','dialog');
 shell.setAttribute('aria-modal','true');
 const head=make('header','btr-head');
 const kicker=make('div','btr-kicker');
 kicker.append(make('span','btr-kicker-label','FINAL BATTLE REPORT'),
  make('span','btr-number','ARMY / AFTER ACTION'));
 const stars=make('div','btr-stars','✦  ✦  ✦');
 title.textContent='最終戰役';
 title.className='btr-title';
 const state=make('p','btr-subtitle',manual?'防守任務結束 · 本場戰績':'防線失守 · 陣亡戰績');
 const banner=make('section','btr-gradehero');
 const left=make('div','btr-gradepanel');
 const gradeBadge=make('div','btr-gradebadge');
 gradeBadge.append(make('span','btr-grade-star','★'),make('strong','btr-grade-value',s.grade),
  make('span','btr-grade-unit','GRADE'));
 left.append(gradeBadge,make('div','btr-graderank',titleOf(s)));
 const right=make('div','btr-heroquote');
 right.append(make('small','btr-hero-label',manual?'防守任務結束':'任務結果：陣亡'),
  make('strong','btr-hero-title',manual?'完成本次演練':'榮譽留在戰場'),
  make('span','btr-hero-wave','最高抵達第 '+s.wave+' 波'));
 banner.append(left,right);
 const medals=make('section','btr-medalband');
 medals.append(make('span','btr-medal-emblem','✦'));
 const medalLabel=make('div','btr-medal-label');
 medalLabel.append(make('span','','榮譽勳章'),make('small','','個人擊殺獎勵 · 試算'));
 medals.append(medalLabel,make('strong','btr-medal-number',String(s.medals)));
 head.append(kicker,stars,title,state,banner,medals);
 const contents=make('div','btr-scroll');
 const statsHead=make('div','btr-sectiontitle');
 statsHead.append(make('strong','','戰績總覽'),make('span','',s.god?'無敵測試模式':'一般防守模式'));
 contents.append(statsHead);
 const grid=make('section','btr-stats');
 const mm=String(Math.floor(s.seconds/60)).padStart(2,'0'),ss=String(s.seconds%60).padStart(2,'0');
 grid.append(line('個人殺敵',s.kills+' 人','◎'),line('最高波次','第 '+s.wave+' 波','≋'),
  line('存活時間',mm+':'+ss,'◷'),line('剩餘友軍',s.allies+' / 5','♟'),
  line('友軍擊殺',s.allyKills+' 人','✚'),line('敵軍總投入',s.spawned+' 人','◇'));
 contents.append(grid);
 const qu=make('blockquote','btr-quote');
 qu.append(make('strong','btr-quote-label','戰場評語'),
   make('p','btr-quote-copy','「'+quoteOf(s)+'」'));
 contents.append(qu);
 const achHead=make('div','btr-sectiontitle');
 achHead.append(make('strong','','本次達成'),make('span','',earned.length+' 項達成 · '+fresh.length+' 項 NEW'));
 contents.append(achHead);
 const achGrid=make('div','btr-achgrid');
 const sorted=[...earned].sort((a,b)=>Number(fresh.includes(b))-Number(fresh.includes(a))||ORDER[a.rarity]-ORDER[b.rarity]);
 for(const a of sorted.slice(0,6)){
  const box=make('div','btr-ach');
  box.append(make('span','btr-achicon',a.icon));
  const desc=make('div','btr-achtext');
  desc.append(make('strong','',a.name),make('small','',a.desc));
  box.append(desc);
  if(fresh.includes(a))box.append(make('span','btr-new','NEW'));
  achGrid.append(box);
 }
 if(!earned.length)achGrid.append(make('p','btr-ach-empty','這次還沒解鎖成就，班長說不急，紅軍還會再來。'));
 contents.append(achGrid);
 const gallery=make('details','btr-gallery');
 const summary=make('summary','btr-gallery-toggle','查看全部成就圖鑑　'+known.size+' / '+ACHIEVEMENTS.length);
 gallery.append(summary);
 const book=make('div','btr-gallery-grid');
 for(const a of ACHIEVEMENTS){
  const unlocked=known.has(a.id),row=make('div','btr-book-entry'+(unlocked?'':' locked'));
  row.append(make('span','',unlocked?a.icon:'🔒'));
  const description=make('span','btr-book-text');
  description.append(make('strong','',a.name),make('small','',a.desc));
  row.append(description,make('span','btr-rarity',a.rarity));
  book.append(row);
 }
 gallery.append(book);contents.append(gallery);
 const foot=make('footer','btr-foot');
 const note=make('p','btr-note','測試戰報 · 勳章僅供試算，不影響正式軍旅進度。');
 foot.append(note);
 const actions=make('div','btr-actions');
 restart.textContent='重新挑戰';
 restart.classList.add('btr-restart');
 const home=make('a','btr-home','返回軍營');home.href='./index.html';
 actions.append(restart,home);foot.append(actions);
 shell.append(head,contents,foot);
 root.classList.add('btr-active');
 root.replaceChildren(shell);
 return s;
}
export const battleAchievementDefinitions=ACHIEVEMENTS.map(({check,...a})=>a);
