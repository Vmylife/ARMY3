/* ARMY3 blanket result + achievement collection v1.80.
   Result stats come from the REAL three-round blanket simulation. No scores or physics altered.
   Same dark-olive field-report language as the grenade training result screen. */
const KEY='ARMY3_blanket_achievements_v1';
const $=id=>document.getElementById(id);
const toInt=x=>Math.max(0,Math.floor(Number(x)||0));
const rarityOrder={'傳說':0,'史詩':1,'稀有':2,'普通':3};
const ACHIEVEMENTS=[
 {id:'first_report',icon:'📋',name:'內務鑑測初體驗',desc:'完成一次完整的三輪棉被鑑測',rarity:'普通',check:s=>s.rounds.length===3},
 {id:'five_layers',icon:'🛏️',name:'棉被初學者',desc:'任一輪疊到5層以上',rarity:'普通',check:s=>s.best>=5},
 {id:'ten_layers',icon:'🧱',name:'蓋棉被大樓',desc:'任一輪疊到10層以上',rarity:'普通',check:s=>s.best>=10},
 {id:'fifteen_layers',icon:'🏗️',name:'豆腐乾有點高',desc:'任一輪疊到15層以上',rarity:'普通',check:s=>s.best>=15},
 {id:'total_twenty',icon:'📦',name:'棉被搬運工',desc:'三輪合計達到20層',rarity:'普通',check:s=>s.total>=20},
 {id:'score_sixty',icon:'📜',name:'勉強能交差',desc:'棉被鑑測總分達60分',rarity:'普通',check:s=>s.score>=60},
 {id:'first_collapse',icon:'🫠',name:'地心引力的勝利',desc:'至少有一輪棉被塔倒塌',rarity:'普通',check:s=>s.collapses>=1},
 {id:'first_friend',icon:'🪖',name:'友軍不是地墊',desc:'壓扁至少1名友軍',rarity:'普通',check:s=>s.friends>=1},
 {id:'first_mine',icon:'💣',name:'床底下有驚喜',desc:'引爆至少1顆地雷',rarity:'普通',check:s=>s.mines>=1},
 {id:'first_building',icon:'🏚️',name:'營產破壞新手',desc:'壓倒至少1棟建築',rarity:'普通',check:s=>s.buildings>=1},
 {id:'clean_desk',icon:'🧹',name:'營區平安無事',desc:'三輪沒有壓扁友軍、引爆地雷或摧毀建築',rarity:'普通',check:s=>s.friends===0&&s.mines===0&&s.buildings===0},
 {id:'twenty_layers',icon:'🗼',name:'棉被摩天樓',desc:'單輪至少20層',rarity:'稀有',check:s=>s.best>=20},
 {id:'thirty_layers',icon:'🏙️',name:'內務股長的惡夢',desc:'單輪至少30層',rarity:'稀有',check:s=>s.best>=30},
 {id:'total_sixty',icon:'🏋️',name:'全營棉被都在這',desc:'三輪累計至少60層',rarity:'稀有',check:s=>s.total>=60},
 {id:'three_tens',icon:'🥇',name:'穩定得很可疑',desc:'三輪各至少10層',rarity:'稀有',check:s=>s.rounds.every(r=>r.layers>=10)},
 {id:'improving',icon:'📈',name:'越疊越囂張',desc:'三輪層數逐輪嚴格增加',rarity:'稀有',check:s=>s.rounds[0].layers<s.rounds[1].layers&&s.rounds[1].layers<s.rounds[2].layers},
 {id:'no_toppoll',icon:'🧘',name:'抗震豆腐乾',desc:'三輪沒有任何一輪倒塌',rarity:'稀有',check:s=>s.collapses===0},
 {id:'two_toppolls',icon:'🚧',name:'工安事故連發',desc:'三輪中恰好有兩輪倒塌',rarity:'稀有',check:s=>s.collapses===2},
 {id:'mine_three',icon:'🎆',name:'連環床底煙火',desc:'引爆至少3顆地雷',rarity:'稀有',check:s=>s.mines>=3},
 {id:'building_three',icon:'🏘️',name:'軍營都市更新',desc:'摧毀至少3棟建築',rarity:'稀有',check:s=>s.buildings>=3},
 {id:'friends_ten',icon:'🚑',name:'醫護所今天加班',desc:'壓扁至少10名友軍',rarity:'稀有',check:s=>s.friends>=10},
 {id:'score_eighty',icon:'🏅',name:'班長一時失語',desc:'本次總分達80分',rarity:'稀有',check:s=>s.score>=80},
 {id:'single_forty',icon:'🚀',name:'棉被通天塔',desc:'單輪至少40層',rarity:'史詩',check:s=>s.best>=40},
 {id:'total_ninety',icon:'📚',name:'棉被倉庫搬空了',desc:'三輪累計至少90層',rarity:'史詩',check:s=>s.total>=90},
 {id:'score_ninety',icon:'✨',name:'內務示範兵',desc:'本次總分達90分',rarity:'史詩',check:s=>s.score>=90},
 {id:'perfect_conduct',icon:'🕊️',name:'人與建築都平安',desc:'三輪都未倒塌，且沒有任何友軍、地雷或建築損失',rarity:'史詩',check:s=>s.collapses===0&&s.friends===0&&s.mines===0&&s.buildings===0},
 {id:'six_buildings',icon:'🏛️',name:'工程連直接失業',desc:'三輪累計摧毀至少6棟建築',rarity:'史詩',check:s=>s.buildings>=6},
 {id:'friends_fifty',icon:'☠️',name:'友軍集體請假',desc:'三輪累計壓扁至少50名友軍',rarity:'史詩',check:s=>s.friends>=50},
 {id:'five_mines',icon:'🧨',name:'被套式連鎖爆破',desc:'三輪引爆至少5顆地雷',rarity:'史詩',check:s=>s.mines>=5},
 {id:'all_collapsed',icon:'📉',name:'三輪全倒，國軍驕傲',desc:'三輪棉被塔全數倒塌',rarity:'史詩',secret:true,check:s=>s.collapses===3},
 {id:'score_full',icon:'👑',name:'豆腐乾本尊',desc:'棉被鑑測拿下100分',rarity:'傳說',check:s=>s.score===100},
 {id:'fifty_layers',icon:'🛰️',name:'你要疊到外太空？',desc:'單輪達到50層',rarity:'傳說',check:s=>s.best>=50},
 {id:'total_150',icon:'🌌',name:'內務無限公司',desc:'三輪累計150層以上',rarity:'傳說',check:s=>s.total>=150},
 {id:'hundred_friends',icon:'🪦',name:'棉被大規模殺傷武器',desc:'三輪累計壓扁至少100名友軍',rarity:'傳說',secret:true,check:s=>s.friends>=100},
 {id:'total_disaster',icon:'☄️',name:'報告班長，營區不見了',desc:'同一局壓扁20名友軍、摧毀4棟建築並引爆3顆地雷',rarity:'傳說',secret:true,check:s=>s.friends>=20&&s.buildings>=4&&s.mines>=3},
 {id:'three_one',icon:'🥲',name:'地基就是我的極限',desc:'三輪各只有1層',rarity:'稀有',secret:true,check:s=>s.rounds.every(r=>r.layers===1)},
 {id:'three_equal',icon:'📐',name:'一分不差，疑似作弊',desc:'三輪層數完全相同且每輪至少10層',rarity:'史詩',secret:true,check:s=>s.best>=10&&s.rounds.every(r=>r.layers===s.best)},
 {id:'safe_high',icon:'🎖️',name:'連長沒理由罵你',desc:'本次總分至少90分，且無人員、地雷及建築損失',rarity:'傳說',secret:true,check:s=>s.score>=90&&s.friends===0&&s.mines===0&&s.buildings===0}
];
const QUOTES={
 score_full:['你的棉被有稜有角，我現在懷疑你偷帶了水泥。','這麼完美的豆腐乾，不拿去砌營舍可惜了。'],
 total_disaster:['你一個人用棉被完成了營區拆遷計畫。','以後你不用折棉被，直接去軍法處報到。'],
 friends_fifty:['你折的是棉被，醫護所收到的是傷亡名冊。'],
 perfect_conduct:['今天沒人受傷、建築沒倒。我先確認你是不是走錯遊戲。'],
 all_collapsed:['三次都倒？你是在挑戰地心引力，不是在接受內務鑑測。']
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function loadProgress(){try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');return {ids:Array.isArray(p.ids)?p.ids.filter(id=>typeof id==='string'):[],best:toInt(p.best),last:p.last||null};}catch{return {ids:[],best:0,last:null}}}
let progress=loadProgress(),currentResult=null,focusBefore=null,galleryFilter='all';
function normalize(detail){
 const rounds=Array.isArray(detail.rounds)?detail.rounds.slice(0,3).map(r=>({layers:toInt(r.layers),collapsed:!!r.collapsed,friends:toInt(r.friends),buildings:toInt(r.buildings),mines:toInt(r.mines)})):[];
 if(rounds.length!==3)return null;
 const totals=detail.totals||{},best=Math.max(...rounds.map(r=>r.layers)),total=rounds.reduce((n,r)=>n+r.layers,0);
 return {rounds,best,total,score:clamp(toInt(detail.score),1,100),friends:toInt(totals.friends),buildings:toInt(totals.buildings),mines:toInt(totals.mines),collapses:rounds.filter(r=>r.collapsed).length};
}
function grade(s){return s>=90?'S':s>=76?'A':s>=60?'B':s>=40?'C':s>=25?'D':'F'}
function title(s){
 if(s.friends>=20&&s.buildings>=4&&s.mines>=3)return '國軍棉被戰略核武';
 if(s.score>=98)return '豆腐乾本尊';
 if(s.score>=85)return '內務示範兵';
 if(s.score>=70)return '差點騙過班長';
 if(s.score>=50)return '豆腐乾未遂';
 if(s.score>=30)return '國軍認證歪棉被';
 return s.collapses===3?'一疊就倒股份有限公司':'折了個寂寞';
}
function comment(s){
 if(s.friends>=20&&s.buildings>=4&&s.mines>=3)return '報告單上寫的是內務訓練，結果你把它玩成了國軍都更計畫。';
 if(s.friends>=50)return '你只是疊個棉被，醫護所卻以為今天有實彈演習。';
 if(s.mines>=3)return '棉被下面藏了幾顆地雷？你的內務檢查需要防爆小組陪同。';
 if(s.buildings>=3)return '我叫你收拾棉被，不是收拾整座營區！';
 if(s.collapses===3)return '三輪都倒！你該去研究地心引力，不要研究豆腐乾。';
 if(s.score>=90&&s.collapses===0)return '這床棉被有稜有角，我開始懷疑你晚上都在幫水泥工讀生代班。';
 if(s.score>=80)return '難得有一床棉被讓我找不到藉口罵人。你下次不要給我退步。';
 if(s.score>=60)return '看起來勉強能交差。唯一問題是我得假裝沒看見那個角。';
 if(s.collapses>=1)return '這不是豆腐乾，是有預謀的棉被山崩。';
 return '你折的不是棉被，是國軍的尊嚴。明天早上再來一次。';
}
function evaluate(result){
 const prev=new Set(progress.ids);
 const earned=ACHIEVEMENTS.filter(a=>{try{return a.check(result)}catch{return false}})
    .sort((a,b)=>rarityOrder[a.rarity]-rarityOrder[b.rarity]||ACHIEVEMENTS.indexOf(a)-ACHIEVEMENTS.indexOf(b));
 const fresh=earned.filter(a=>!prev.has(a.id));
 progress.ids=[...new Set([...progress.ids,...earned.map(a=>a.id)])];
 progress.best=Math.max(progress.best,result.score);
 progress.last={score:result.score,rounds:result.rounds,totals:{friends:result.friends,buildings:result.buildings,mines:result.mines}};
 try{localStorage.setItem(KEY,JSON.stringify(progress))}catch{}
 return {earned,fresh};
}
function el(tag,className='',text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;}
function node(tag,className,parent,text){const n=el(tag,className,text);if(parent)parent.append(n);return n;}
function button(label,className,click){const b=el('button',className,label);b.type='button';b.addEventListener('click',click);return b;}
function section(parent,caption,meta){const sec=node('section','abr-section',parent),head=node('div','abr-heading',sec);node('strong','',head,caption);if(meta)node('span','',head,meta);return sec;}
function resultCard(parent,a,isNew){
 const b=el('button','abr-ach-card');b.type='button';b.setAttribute('aria-label','查看成就：'+a.name);
 node('span','abr-emblem',b,a.icon);const box=node('span','abr-ach-copy',b);node('strong','',box,a.name);node('small','',box,a.rarity);
 if(isNew)node('span','abr-new',b,'NEW');b.addEventListener('click',()=>openDetail(a,true));parent.append(b);
}
function showResult(detail){
 const s=normalize(detail);if(!s)return;
 const modal=$('modal');if(!modal||!$('overlay'))return;
 const originalButtons=[...modal.querySelectorAll('button')];
 const back=originalButtons.find(b=>b.textContent.trim()==='返回軍營');
 const again=originalButtons.find(b=>b.textContent.trim()==='再玩一次');
 if(!back||!again)return;
 const {earned,fresh}=evaluate(s);currentResult={s,earned,fresh};
 modal.replaceChildren();modal.classList.add('army-blanket-report');
 const header=node('div','abr-fixedhead',modal);
 const small=node('div','abr-kicker',header);node('span','',small,'國軍內務鑑測　/　結算報告');node('span','abr-report-id',small,'NO. B-003');
 node('h1','abr-title',header,'棉被鑑測結算');node('div','abr-subtitle',header,'報告班長！這不是豆腐乾');
 const scoreBox=node('div','abr-scorebox',header),scoreLeft=node('div','abr-scoreleft',scoreBox);
 node('span','abr-scorelabel',scoreLeft,'本次鑑測總分');const number=node('div','abr-number',scoreLeft,String(s.score));node('small','',number,'/ 100');
 const scoreRight=node('div','abr-scoreright',scoreBox);node('span','abr-grade',scoreRight,grade(s.score)+' 級');node('strong','abr-rankname',scoreRight,title(s));node('small','abr-highscore',scoreRight,'歷史最高 '+progress.best+' 分');
 const body=node('div','abr-scroll',modal);
 const roundsSec=section(body,'三輪疊放戰報','最高 '+s.best+' 層 · 合計 '+s.total+' 層');const cards=node('div','abr-rounds',roundsSec);
 s.rounds.forEach((r,i)=>{
  const card=node('div','abr-round',cards);node('span','abr-round-label',card,'第 '+(i+1)+' 輪');node('strong','abr-round-number',card,String(r.layers)+' 層');
  node('span',r.collapsed?'abr-round-result disaster':'abr-round-result',card,r.collapsed?'💥 全塔倒塌':'✓ 成功收拾');
  const loss=r.friends+r.buildings+r.mines;
  if(loss)node('small','abr-round-loss',card,'友 '+r.friends+' / 建 '+r.buildings+' / 雷 '+r.mines);
 });
 const battle=section(body,'本次戰果','戰損會記錄在國軍史冊');const metrics=node('div','abr-metrics',battle);
 for(const [icon,label,value] of [['🪖','友軍壓扁',s.friends],['🏚️','建築倒塌',s.buildings],['💣','地雷引爆',s.mines]]){
  const box=node('div','abr-metric',metrics);node('span','abr-metric-icon',box,icon);node('small','',box,label);node('b','',box,value);
 }
 const achSec=section(body,'本次解鎖成就',earned.length+' 項達成 · '+fresh.length+' 項 NEW');const achGrid=node('div','abr-ach-grid',achSec);
 const chosen=[...fresh,...earned.filter(a=>!fresh.includes(a))].slice(0,3);
 if(chosen.length)chosen.forEach(a=>resultCard(achGrid,a,fresh.includes(a)));
 else node('div','abr-empty',achGrid,'這次沒有達成成就，班長表示還可以再丟臉一次。');
 const book=button('🏅 查看全部成就圖鑑（'+progress.ids.length+' / '+ACHIEVEMENTS.length+'）','abr-book',()=>openGallery());achSec.append(book);
 const officer=section(body,'班長講評','出於好意，僅供參考');
 const commentBox=node('div','abr-officer',officer);node('strong','',commentBox,'「'+title(s)+'」');node('p','',commentBox,comment(s));
 const actions=node('div','abr-actions',modal);back.classList.add('abr-back');again.classList.add('abr-again');actions.append(back,again);
 modal.scrollTop=0;body.scrollTop=0;
}
function setupModal(id,titleText){
 let scr=$(id);if(scr)return scr;
 scr=node('div','abr-layer',document.body);scr.id=id;scr.hidden=true;scr.setAttribute('role','dialog');scr.setAttribute('aria-modal','true');
 const surface=node('div','abr-dialog',scr),hdr=node('div','abr-dialoghead',surface);
 node('h2','',hdr,titleText);const close=button('✕','abr-close',()=>closeModal(scr));close.setAttribute('aria-label','關閉');hdr.append(close);
 scr.addEventListener('click',e=>{if(e.target===scr)closeModal(scr)});
 return scr;
}
function openModal(scr){focusBefore=document.activeElement;scr.hidden=false;document.body.classList.add('abr-popup-open');scr.querySelector('.abr-close')?.focus({preventScroll:true});}
function closeModal(scr){scr.hidden=true;const gallery=$('blanketAchievementsGallery'),detail=$('blanketAchievementDetail');if((gallery&&!gallery.hidden)||(detail&&!detail.hidden))return;document.body.classList.remove('abr-popup-open');try{focusBefore?.focus({preventScroll:true})}catch{}}
function openGallery(){
 const scr=setupModal('blanketAchievementsGallery','🎖️ 國軍內務成就圖鑑'),surface=scr.querySelector('.abr-dialog');
 surface.querySelectorAll('.abr-gallery-stats,.abr-gallery-filters,.abr-gallery-list').forEach(e=>e.remove());
 const unlocked=new Set(progress.ids);
 node('div','abr-gallery-stats',surface,'已解鎖 '+ACHIEVEMENTS.filter(a=>unlocked.has(a.id)).length+' / '+ACHIEVEMENTS.length+' 項　·　隱藏成就達成後才公開名稱');
 const filterBox=node('div','abr-gallery-filters',surface);
 const list=node('div','abr-gallery-list',surface);
 function render(){list.replaceChildren();filterBox.replaceChildren();
  for(const [mode,name] of [['all','全部成就'],['unlocked','已解鎖']]){
   const b=button(name,mode===galleryFilter?'abr-filter active':'abr-filter',()=>{galleryFilter=mode;render()});filterBox.append(b);
  }
  const shown=ACHIEVEMENTS.filter(a=>galleryFilter==='all'||unlocked.has(a.id))
   .sort((a,b)=>rarityOrder[a.rarity]-rarityOrder[b.rarity]||ACHIEVEMENTS.indexOf(a)-ACHIEVEMENTS.indexOf(b));
  if(!shown.length)node('div','abr-empty',list,'還沒有解鎖任何成就，去疊幾床棉被吧！');
  for(const a of shown){const yes=unlocked.has(a.id),hidden=a.secret&&!yes;
   const b=el('button','abr-gallery-card'+(yes?'':' locked'));b.type='button';
   node('span','abr-gallery-icon',b,yes?a.icon:hidden?'🔒':a.icon);
   const copy=node('span','abr-gallery-copy',b);node('strong','',copy,hidden?'？？？ 機密成就':a.name);
   node('small','',copy,a.rarity+(yes?' · 已解鎖':' · 尚未解鎖'));
   node('span','abr-gallery-mark',b,yes?'✓':'🔒');b.addEventListener('click',()=>openDetail(a,yes));list.append(b);
  }
 }
 render();openModal(scr);
}
function openDetail(a,unlocked){
 const scr=setupModal('blanketAchievementDetail','🎖️ 成就詳細資料'),surface=scr.querySelector('.abr-dialog');
 surface.querySelectorAll('.abr-detail').forEach(e=>e.remove());
 const hidden=a.secret&&!unlocked,content=node('div','abr-detail',surface);
 node('div','abr-detail-icon',content,unlocked?a.icon:hidden?'🔒':a.icon);
 node('h3','',content,hidden?'？？？ 機密成就':a.name);
 node('div','abr-detail-rarity',content,a.rarity+' · '+(unlocked?'已解鎖':'尚未解鎖'));
 node('p','',content,hidden?'這項隱藏成就尚未解鎖，達成特殊條件後才會公開。':a.desc);
 if(unlocked){const qs=QUOTES[a.id];node('blockquote','',content,'「'+(qs?.[0]||'班長已收到這份奇怪的成就申請，正在研究要不要給你放榮譽假。')+'」');}
 const ok=button('知道了，班長','abr-okay',()=>closeModal(scr));content.append(ok);openModal(scr);
}
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if($('blanketAchievementDetail')&&!$('blanketAchievementDetail').hidden){closeModal($('blanketAchievementDetail'));e.stopPropagation();return;}
 if($('blanketAchievementsGallery')&&!$('blanketAchievementsGallery').hidden){closeModal($('blanketAchievementsGallery'));e.stopPropagation();}
});
const INTRO_BOOK_ID='blanketIntroAchievementBook';
function mountIntroBook(){
 const start=$('play');if(!start||$(INTRO_BOOK_ID))return;
 const book=button('🏅 成就圖鑑　'+progress.ids.length+' / '+ACHIEVEMENTS.length,'abr-intro-book',()=>openGallery());
 book.id=INTRO_BOOK_ID;start.insertAdjacentElement('afterend',book);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountIntroBook,{once:true});else mountIntroBook();
window.addEventListener('army:blanket:finished',e=>showResult(e.detail||{}));
window.__armyBlanketAchievements={get achievements(){return ACHIEVEMENTS.map(({check,...a})=>a)},get progress(){return progress},evaluate:detail=>{const s=normalize(detail);return s?ACHIEVEMENTS.filter(a=>a.check(s)).map(a=>a.id):[]},showResult,openGallery};
const css=document.createElement('style');css.id='armyBlanketReportCss';css.textContent=`
#overlay:has(.army-blanket-report){padding:calc(7px + env(safe-area-inset-top)) 8px calc(7px + env(safe-area-inset-bottom));background:#09170eda;backdrop-filter:blur(7px)}
#modal.army-blanket-report{display:flex;flex-direction:column;gap:0;width:min(500px,100%);height:auto;max-height:calc(100dvh - 18px - env(safe-area-inset-top) - env(safe-area-inset-bottom));min-height:0;background:linear-gradient(180deg,#1c3629,#12271f);color:#f5ead0;border:1px solid #d4ba7e86;padding:12px 13px 10px;border-radius:17px;box-shadow:0 10px 48px #0009;overflow:hidden;text-align:left}
#modal .abr-fixedhead{flex:none}.abr-kicker{display:flex;justify-content:space-between;gap:10px;font-size:9px;font-weight:800;color:#b9c8ab;letter-spacing:.6px}.abr-report-id{color:#ddc68d}#modal .abr-title{font-size:clamp(22px,6.2vw,29px);margin:5px 0 1px;color:#f7e2a9;line-height:1.15;font-weight:950;letter-spacing:.5px}#modal .abr-subtitle{font-size:10px;font-weight:750;color:#cbd6be;margin-bottom:9px}
.abr-scorebox{display:flex;gap:10px;align-items:center;background:linear-gradient(115deg,#2d4c35,#1d3b2a);border:1px solid #e9c98975;border-radius:13px;padding:9px 12px;margin-bottom:8px}.abr-scoreleft{min-width:110px;border-right:1px solid #e2cb9352;padding-right:12px;text-align:center}.abr-scorelabel{font-size:10px;letter-spacing:.5px;font-weight:850;color:#cabd8a}.abr-number{font-size:49px;font-weight:950;line-height:1.04;color:#f6d788;letter-spacing:-1px;font-variant-numeric:tabular-nums}.abr-number small{font-size:10px;letter-spacing:0;color:#b9cbb8;margin-left:2px}.abr-scoreright{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}.abr-grade{font-size:11px;font-weight:900;color:#192c21;background:#f3d28b;border-radius:5px;padding:3px 6px;width:max-content}.abr-rankname{font-size:16px;font-weight:950;color:#f4e5c2;line-height:1.28;overflow-wrap:anywhere}.abr-highscore{font-size:10px;color:#afc0ad}
.abr-scroll{overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:0;scrollbar-color:#95ae8690 transparent}.abr-section{margin-bottom:9px}.abr-heading{display:flex;align-items:center;justify-content:space-between;gap:4px;color:#efd699;font-size:11px;font-weight:900;padding-bottom:4px;border-bottom:1px solid #dcc78c50;margin-bottom:6px}.abr-heading span{font-size:9px;color:#b4c6b2;font-weight:650;text-align:right}
.abr-rounds,.abr-metrics,.abr-ach-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.abr-round{background:#213c2b;border:1px solid #c8c28a34;border-radius:10px;text-align:center;padding:8px 4px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px}.abr-round-label{font-size:10px;color:#b8cbb6}.abr-round-number{font-size:21px;color:#f4e6bb;font-weight:950;line-height:1.18}.abr-round-result{font-size:9px;color:#a5dbac;white-space:nowrap}.abr-round-result.disaster{color:#f2a48f}.abr-round-loss{font-size:8px;color:#cfc7b7;white-space:nowrap}
.abr-metric{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;border:1px solid #a9b99d2b;border-radius:9px;background:#10291e;padding:7px 3px}.abr-metric-icon{font-size:21px;line-height:1.2}.abr-metric small{font-size:9px;color:#b6c9b6}.abr-metric b{font-size:21px;color:#eca68d;line-height:1.2;font-variant-numeric:tabular-nums}
#modal .abr-ach-card,.abr-gallery-card{color:inherit;cursor:pointer;background:#294632;border:1px solid #c6ba8150;min-height:53px;padding:6px 4px}.abr-ach-card{min-width:0;min-height:53px;padding:6px 4px;display:flex;gap:5px;align-items:center;position:relative;text-align:left;border:1px solid #c6ba8150;border-radius:9px;background:#294632}.abr-emblem{font-size:19px;display:grid;place-items:center;background:#3e583e;border-radius:7px;width:28px;height:28px;flex:none}.abr-ach-copy{min-width:0;display:grid;gap:2px}.abr-ach-copy strong{font-size:10px;color:#f6e5bb;line-height:1.2;overflow-wrap:anywhere}.abr-ach-copy small{font-size:9px;color:#b5c8b7}.abr-new{position:absolute;right:2px;top:2px;font-size:7px;font-weight:950;padding:2px 3px;color:#25371f;border-radius:3px;background:#f4dc90}.abr-empty{grid-column:1/-1;color:#b9ccbd;font-size:11px;line-height:1.5;background:#203b2c;padding:9px;border-radius:8px}
#modal .abr-book{background:transparent;border:1px solid #cfbb826f;border-radius:8px;min-height:30px;padding:5px 8px;margin-top:7px;color:#e8d29e;font-size:11px;font-weight:850;width:100%}.abr-officer{background:#20382b;border-left:3px solid #d1b874;padding:8px 10px;border-radius:0 8px 8px 0}.abr-officer strong{display:block;font-size:10px;color:#efd695}.abr-officer p{font-size:11px!important;color:#f2e8cf!important;line-height:1.5!important;margin:3px 0 0!important;text-align:left}
.abr-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:none;margin-top:5px;padding-top:7px;border-top:1px solid #e6d59a44}#modal .abr-actions button{font-size:13px;min-height:43px;border-radius:10px;padding:7px 5px;margin:0;font-weight:900}#modal .abr-back{background:#365242;color:#f3e9cb;border:1px solid #b6caac78}#modal .abr-again{background:#e4bf72;color:#253727;border:1px solid #f6d69a}
#modal .abr-intro-book{background:#dfe4d5;color:#355343;font-size:14px;min-height:42px;margin-top:7px}
.abr-layer[hidden]{display:none!important}.abr-layer{position:fixed;inset:0;z-index:45;padding:calc(9px + env(safe-area-inset-top)) 9px calc(9px + env(safe-area-inset-bottom));display:flex;justify-content:center;align-items:center;background:#07170ee6;backdrop-filter:blur(5px)}#blanketAchievementDetail{z-index:50}.abr-dialog{width:min(495px,100%);max-height:calc(100dvh - 20px);overflow-y:auto;overscroll-behavior:contain;background:#1b3527;color:#f3e7ca;border:1px solid #d2ba8078;border-radius:16px;padding:15px;box-shadow:0 9px 45px #0008}.abr-dialoghead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:1px solid #d8bd7854}.abr-dialoghead h2{font-size:18px;margin:0;color:#efddae}.abr-close{border:1px solid #b2c2a762;border-radius:9px;background:#2b4b38;color:#f6e1ae;padding:5px 10px;font-size:16px;min-width:36px;min-height:33px;cursor:pointer}.abr-gallery-stats{font-size:11px;color:#adc5ae;margin:10px 0 7px;line-height:1.4}.abr-gallery-filters{display:flex;gap:7px;margin-bottom:9px}.abr-filter{background:#294534;color:#c8d8c4;border:1px solid #b7bb8c4e;padding:7px 10px;border-radius:9px;font-weight:850;cursor:pointer;font-size:11px}.abr-filter.active{background:#d7bd78;color:#1c3020}.abr-gallery-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.abr-gallery-card{display:flex;align-items:center;gap:9px;background:#284534;border:1px solid #b3be926a;border-radius:10px;padding:9px;min-height:75px;text-align:left;min-width:0}.abr-gallery-card.locked{opacity:.63}.abr-gallery-icon{font-size:24px;flex:none}.abr-gallery-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.abr-gallery-copy strong{font-size:12px;color:#f3e1b9;line-height:1.25;overflow-wrap:anywhere}.abr-gallery-copy small{font-size:10px;color:#b8c5b5}.abr-gallery-mark{font-size:13px;color:#ead18d}.abr-detail{text-align:center;padding:14px 5px 3px}.abr-detail-icon{font-size:56px}.abr-detail h3{font-size:21px;color:#f3e2ab;margin:6px 0}.abr-detail-rarity{font-size:11px;color:#e4c586}.abr-detail p{font-size:13px;line-height:1.65;color:#c5d5c2;margin:14px auto}.abr-detail blockquote{font-size:12px;line-height:1.6;text-align:left;color:#eed7a3;border-left:3px solid #d0ae72;background:#203e2c;padding:9px 12px;margin:9px 0}.abr-okay{font-size:13px;background:#e1c37d;color:#1d3626;border:0;border-radius:10px;padding:10px 18px;cursor:pointer;font-weight:900;margin-top:9px}
@media(max-width:390px){#modal.army-blanket-report{padding:9px 10px 8px}#modal .abr-title{font-size:23px}.abr-scorebox{padding:7px 9px}.abr-number{font-size:43px}.abr-round{padding:6px 3px}.abr-round-number{font-size:18px}.abr-ach-card{gap:3px}.abr-gallery-card{gap:5px;padding:7px}.abr-gallery-icon{font-size:19px}.abr-gallery-copy strong{font-size:11px}}
@media(orientation:landscape) and (max-height:530px){#modal.army-blanket-report{max-height:calc(100dvh - 12px);padding:7px 9px}.abr-number{font-size:34px}.abr-scorebox{margin-bottom:5px;padding:5px 8px}.abr-title{font-size:20px!important}}
`;
document.head.append(css);
