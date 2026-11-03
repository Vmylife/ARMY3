/* ARMY3 shooting field report + persistent achievement collection v1.50.
   Presentation-only; live bullet hit detection and scene simulation remain unchanged. */
(()=>{'use strict';
const KEY='ARMY3_shooting_achievements_v1';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const int=v=>Math.max(0,Math.floor(Number(v)||0));
const RARITY={'傳說':0,'史詩':1,'稀有':2,'普通':3};
const ACH=[
 {id:'first',icon:'🪖',name:'報告！我有開槍',desc:'完成第一次實彈鑑測',rarity:'普通',test:s=>s.completed},
 {id:'one_hit',icon:'🎯',name:'靶紙終於受傷了',desc:'本次至少有1發上靶',rarity:'普通',test:s=>s.hits>=1},
 {id:'three_hit',icon:'🥉',name:'不是完全靠運氣',desc:'本次至少有3發上靶',rarity:'普通',test:s=>s.hits>=3},
 {id:'five_hit',icon:'📜',name:'可以交差了吧',desc:'本次至少有5發上靶',rarity:'普通',test:s=>s.hits>=5},
 {id:'eight_hit',icon:'🏅',name:'班長忍住沒罵',desc:'本次至少有8發上靶',rarity:'稀有',test:s=>s.hits>=8},
 {id:'ten_hit',icon:'👑',name:'靶紙上的戶口名簿',desc:'10發全部上靶，且沒有誤傷友軍',rarity:'傳說',test:s=>s.shots===10&&s.hits===10&&s.friends===0},
 {id:'ring_nine',icon:'🟡',name:'不小心打到中心',desc:'至少1發落在9環以上',rarity:'普通',test:s=>s.center>=1},
 {id:'ring_three',icon:'🏹',name:'準星有在上班',desc:'至少3發落在9環以上',rarity:'稀有',test:s=>s.center>=3},
 {id:'ring_five',icon:'🔭',name:'班長懷疑你外掛',desc:'至少5發落在9環以上',rarity:'史詩',test:s=>s.center>=5},
 {id:'ring_ten',icon:'💎',name:'十環比點名還準',desc:'同一場至少3發打進10環',rarity:'史詩',test:s=>s.tenRing>=3},
 {id:'center_ten',icon:'✨',name:'靶心拆遷戶',desc:'10發全中9環以上、0誤傷',rarity:'傳說',secret:true,test:s=>s.shots===10&&s.center===10&&s.friends===0},
 {id:'first_center',icon:'🥇',name:'第一發就交作業',desc:'第一發直接命中9環以上',rarity:'稀有',test:s=>s.history[0]?.ring>=9},
 {id:'last_center',icon:'🧠',name:'壓線交卷王',desc:'第10發命中9環以上',rarity:'稀有',test:s=>s.history[9]?.ring>=9},
 {id:'five_streak',icon:'🔥',name:'連長突然有笑容',desc:'連續5發上靶',rarity:'史詩',test:s=>s.streak>=5},
 {id:'three_streak',icon:'🫡',name:'手感稍微回來了',desc:'連續3發上靶',rarity:'普通',test:s=>s.streak>=3},
 {id:'high_score',icon:'🌟',name:'國軍之光候選人',desc:'總分達90分且0誤傷友軍',rarity:'稀有',test:s=>s.score>=90&&s.friends===0},
 {id:'score_seventy',icon:'🎖️',name:'鑑測及格有望',desc:'總分達70分',rarity:'普通',test:s=>s.score>=70},
 {id:'score_full',icon:'🏆',name:'長官申請調閱監視器',desc:'本次獲得100分',rarity:'傳說',secret:true,test:s=>s.score===100},
 {id:'clean',icon:'🤝',name:'友軍安全宣導大使',desc:'打滿10發且完全沒有誤傷友軍',rarity:'普通',test:s=>s.shots===10&&s.friends===0},
 {id:'no_zoom',icon:'👀',name:'肉眼自帶四倍鏡',desc:'不開鏡打滿10發，且至少5發上靶',rarity:'史詩',test:s=>s.shots===10&&s.hits>=5&&s.zoomShots===0},
 {id:'scope',icon:'🔎',name:'瞄準鏡住戶',desc:'10發全部在開鏡狀態射擊',rarity:'普通',test:s=>s.shots===10&&s.zoomShots===10},
 {id:'quick',icon:'⚡',name:'比班長集合還快',desc:'20秒內打完10發，且至少5發上靶',rarity:'稀有',test:s=>s.shots===10&&s.elapsed<=20&&s.hits>=5},
 {id:'slow',icon:'🐢',name:'慢工出不了細活',desc:'耗時40秒以上才完成鑑測',rarity:'普通',test:s=>s.elapsed>=40},
 {id:'single',icon:'🪄',name:'一發入魂後下課',desc:'只射1發、命中9環以上就主動收靶紙',rarity:'史詩',secret:true,test:s=>s.shots===1&&s.center===1&&s.elapsed<44.9},
 {id:'nine_hit',icon:'😮‍💨',name:'就差那一個啊',desc:'打滿10發，恰好9發上靶且0誤傷',rarity:'稀有',test:s=>s.shots===10&&s.hits===9&&s.friends===0},
 {id:'edge',icon:'📎',name:'擦邊球專家',desc:'同一場至少3發上靶，但都落在靶圈外',rarity:'稀有',secret:true,test:s=>s.hits>=3&&s.ringHits===0},
 {id:'empty',icon:'🕊️',name:'愛好和平的射手',desc:'45秒結束時一發都沒射',rarity:'稀有',secret:true,test:s=>s.shots===0},
 {id:'all_miss',icon:'🌬️',name:'空氣受害者',desc:'10發全部脫靶，且沒有誤傷友軍',rarity:'稀有',test:s=>s.shots===10&&s.hits===0&&s.friends===0},
 {id:'one_miss',icon:'🍃',name:'靶紙跟你有仇嗎',desc:'打滿10發且只上靶1發，沒有誤傷友軍',rarity:'普通',test:s=>s.shots===10&&s.hits===1&&s.friends===0},
 {id:'friendly_one',icon:'🚑',name:'那個是我們的人！',desc:'本次誤傷至少1名友軍',rarity:'普通',test:s=>s.friends>=1},
 {id:'friendly_three',icon:'🚨',name:'醫護所VIP',desc:'本次誤傷至少3名友軍',rarity:'稀有',test:s=>s.friends>=3},
 {id:'friendly_five',icon:'💥',name:'友軍的頭號天敵',desc:'本次誤傷至少5名友軍',rarity:'史詩',test:s=>s.friends>=5},
 {id:'friendly_seven',icon:'📋',name:'軍紀會議主講人',desc:'本次誤傷至少7名友軍',rarity:'史詩',secret:true,test:s=>s.friends>=7},
 {id:'friendly_ten',icon:'☠️',name:'國防部特別關切',desc:'10發全部誤傷友軍',rarity:'傳說',secret:true,test:s=>s.shots===10&&s.friends===10},
 {id:'inside',icon:'🕵️',name:'紅軍不用來了',desc:'一張靶紙都沒打中，卻誤傷至少5名友軍',rarity:'史詩',secret:true,test:s=>s.hits===0&&s.friends>=5},
 {id:'teamwork',icon:'⚖️',name:'敵我不分的天才',desc:'同時上靶5發以上、誤傷3名以上友軍',rarity:'史詩',secret:true,test:s=>s.hits>=5&&s.friends>=3},
 {id:'oops_first',icon:'💔',name:'第一槍就出事',desc:'第一發子彈直接射中友軍',rarity:'稀有',test:s=>s.history[0]?.kind==='friendly'},
 {id:'perfect_discipline',icon:'🕯️',name:'班長今天沒寫檢討',desc:'10發至少8發上靶、0誤傷、0脫靶不可能？',rarity:'傳說',secret:true,test:s=>s.shots===10&&s.hits===10&&s.center>=5&&s.friends===0}
];
const COMMENTS=[
 {when:s=>s.shots===0,texts:['全程沒有開槍。你是來守護地球和平，還是忘記把槍帶來？','射擊鑑測唯一零傷亡的，是子彈和班長的信心。','你連扳機都捨不得扣，我要不要幫你申請文書兵？','這場最準的一件事，是你準時下課。']},
 {when:s=>s.friends===10,texts:['我叫你打十發，你把全連點名名冊打掉了十個。','紅軍看完戰報，主動向你頒發最佳友軍獎。','這份靶紙空白，醫護所倒是忙到需要加班費。','你是我們的射手，還是對面的秘密武器？']},
 {when:s=>s.friends>=7,texts:['友軍正在找你，這次不是要揪你吃宵夜。','醫護所表示希望你明天直接請假，不要再來練了。','十發子彈，軍紀案件比彈孔還多，真有你的。','班長現在不敢站你前面，也不敢站你後面。','現在開始你不能再喊「友軍掩護」，因為友軍在躲你。']},
 {when:s=>s.friends>=3,texts:['打靶打到變成人事調動，下一場你直接去保防室報到。','那個穿綠色衣服的是自己人，不是移動式加分靶。','鑑測成績可以重考，弟兄的心理陰影要多久才能恢復？','我第一次看到射擊成績單需要附傷亡統計表。','你這不是射擊訓練，你是幫醫護所衝業績。']},
 {when:s=>s.friends>0&&s.hits>=5,texts:['上靶是有上靶啦，但被你打到的弟兄也上了救護車。','成績看起來很精實，軍紀看起來很刺激。','班長原本想稱讚你，後來看到友軍欄就把筆放下了。','你有敵我辨識能力，只是偶爾會請假。','射擊技術不差，唯一問題是我們開始缺人。']},
 {when:s=>s.friends>0,texts:['靶紙跟你無冤無仇，怎麼倒楣的是旁邊弟兄？','你是不是把「友軍」理解成比較熟的靶子？','開槍前請先看軍服顏色，我們真的穿同一套。','你這槍法很危險，因為不知道危險會落在哪個方向。','射擊鑑測沒過，軍紀鑑測倒是直接破紀錄。']},
 {when:s=>s.score===100,texts:['十發打完，靶紙想請求職災補助。','這份成績單我先影印十份，明天拿去當教材。','你是不是把靶心當家裡門鈴？每發都按得到。','連長看完很滿意，現在全連要照你的標準重新測。','鑑測滿分！但這個成績下次可能會害全連多練兩小時。']},
 {when:s=>s.hits===10&&s.friends===0,texts:['十發全上靶，班長突然找不到罵人的切入點。','你把靶紙打得像洞洞樂，等一下記得自己回收。','今天你的準星有上班，還有打卡。','國軍難得出現一張可以不用修飾的成績單。','十個彈孔都在，連長的血壓終於回歸正常。']},
 {when:s=>s.center>=5,texts:['靶心都快被你拆掉了，這算射擊還是土木工程？','我叫你瞄準，沒叫你把靶心打成零錢洞。','這種準度，班長開始懷疑你的眼睛有裝輔助瞄準。','你的槍法很準，但等下不要拿這個要求榮譽假。','準星看起來比隔壁班的集合隊伍還整齊。']},
 {when:s=>s.hits===9,texts:['九發上靶，最後一發是在替天空做健康檢查？','你差點拿到完美成績，結果子彈決定出去散心。','很好，只差一發。班長現在只想知道是哪一發。','你離特優只差一點，就跟離放假只差一天一樣痛苦。']},
 {when:s=>s.hits>=7,texts:['有模有樣。這張成績我先收好，免得全連被你拖去加訓。','表現不錯！下次記得準心不是用來裝飾的。','這次可以交差。班長終於不用表演深呼吸。','你瞄的是靶紙，至少這點我們達成共識。','七八發有上靶，剩下的算不算射去隔壁營區？']},
 {when:s=>s.hits>=4,texts:['一半左右有上靶，另一半子彈出去尋找自我。','可以再練。你的槍法跟集合速度一樣不太穩定。','勉強有點成績，不然我以為你在對空鳴槍。','靶紙證明你曾努力過，只是證據不太多。','你跟靶紙的關係若即若離，像是快退伍的學長。']},
 {when:s=>s.hits>0,texts:['至少不是零分，靶紙有感受到你的存在。','這一發上靶很珍貴，建議裱框留念。','你射中的那幾發，靶紙說是意外。','靶紙的工作是被射中，不是跟子彈玩躲貓貓。','這場最大的收穫是知道準星在哪。']},
 {when:s=>s.zoomShots===0&&s.shots===10,texts:['全程沒開鏡，你用的是瞄具還是第六感？','不用瞄準鏡很好，至少錯得很有自信。','十發都靠肉眼，難怪靶紙感覺不到威脅。','這副眼睛建議拿去驗光，不要直接申請神射手。']},
 {when:s=>true,texts:['十發子彈出去後，靶紙依然能用下一梯。','你打的不是靶，是國軍對你的期待。','報告班長！我成功讓靶紙保持完整！','長官看完默默拿出再測一次的表單。','這份成績唯一的優點，是字跡很工整。']}
];
const titles=[
 {when:s=>s.friends===10,title:'十發子彈，十份檢討',stamp:'重大違規'},
 {when:s=>s.friends>=7,title:'友軍正在找你',stamp:'軍紀調查'},
 {when:s=>s.friends>=3,title:'醫護所年度VIP',stamp:'重大違規'},
 {when:s=>s.friends>0,title:'你先放下那把槍',stamp:'軍紀注意'},
 {when:s=>s.shots===0,title:'還沒開槍就下課',stamp:'缺考'},
 {when:s=>s.score===100,title:'班長難得笑了',stamp:'滿分'},
 {when:s=>s.hits===10,title:'靶紙申請職災',stamp:'特優'},
 {when:s=>s.center>=5,title:'連長懷疑你偷練',stamp:'精準'},
 {when:s=>s.hits>=8,title:'這次真的有在瞄',stamp:'優等'},
 {when:s=>s.hits>=5,title:'勉強能交差',stamp:'合格'},
 {when:s=>s.hits>0,title:'靶紙擦邊球',stamp:'待加強'},
 {when:s=>true,title:'靶紙毫髮無傷',stamp:'重測'}
];
function load(){
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
  return {ids:Array.isArray(raw.ids)?[...new Set(raw.ids.filter(id=>typeof id==='string'&&ACH.some(a=>a.id===id)))]:[],best:clamp(int(raw.best),0,100),played:int(raw.played),last:raw.last||null};
 }catch{return {ids:[],best:0,played:0,last:null};}
}
let progress=load(),current=null,filter='all',focusBefore=null;
function getRing(hit){
 const x=Number(hit?.x),y=Number(hit?.y);
 if(!Number.isFinite(x)||!Number.isFinite(y))return 0;
 const r=Math.hypot(x*600-300,y*760-380);
 return r<=248?clamp(10-Math.floor(r/(248/10)),1,10):0;
}
function calculate(input={}){
 const history=Array.isArray(input.shotHistory)?input.shotHistory.slice(0,10).map(v=>({...v,ring:int(v.ring)})):[];
 const paperHits=Array.isArray(input.hits)?input.hits:[];
 const shots=clamp(int(input.shots),0,10),hits=clamp(paperHits.length,0,shots);
 const friends=clamp(int(input.friendlyHits),0,shots-hits);
 const rings=paperHits.slice(0,hits).map(getRing);
 const ringTotal=rings.reduce((a,b)=>a+b,0),center=rings.filter(n=>n>=9).length,tenRing=rings.filter(n=>n===10).length;
 const zoomShots=history.filter(h=>h.zoom).length,ringHits=rings.filter(r=>r>0).length;
 let streak=0,run=0;
 for(const shot of history){if(shot.kind==='target'){streak=Math.max(streak,++run);}else run=0;}
 // One actual hit can earn at most 10 points: 7.5 for the paper hit and
 // up to 2.5 for ring quality. Every friendly hit deducts 12 points.
 const score=clamp(Math.round(hits*7.5+ringTotal*.25-friends*12),0,100);
 const grade=score>=90?'S':score>=75?'A':score>=55?'B':score>=35?'C':score>=20?'D':'F';
 const entry={completed:true,shots,hits,friends,misses:shots-hits-friends,accuracy:shots?Math.round(hits/shots*100):0,
  center,tenRing,ringHits,ringTotal,zoomShots,streak,elapsed:Math.max(0,Number(input.elapsed)||0),history,score,grade};
 return entry;
}
const choose=(texts)=>texts[Math.floor(Math.random()*texts.length)]||'班長目前無言以對。';
function evaluate(s){
 const prev=new Set(progress.ids);
 const earned=ACH.filter(a=>a.test(s)).sort((a,b)=>RARITY[a.rarity]-RARITY[b.rarity]||ACH.indexOf(a)-ACH.indexOf(b));
 const fresh=earned.filter(a=>!prev.has(a.id));
 progress.ids=[...new Set([...progress.ids,...earned.map(a=>a.id)])];
 progress.best=Math.max(progress.best,s.score);progress.played++;
 progress.last={score:s.score,hits:s.hits,shots:s.shots,friends:s.friends,date:new Date().toISOString()};
 try{localStorage.setItem(KEY,JSON.stringify(progress))}catch{}
 try{window.dispatchEvent(new CustomEvent('army:shooting:result',{detail:{...progress.last,grade:s.grade,newAchievements:fresh.map(a=>a.id)}}))}catch{}
 return {earned,fresh};
}
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
function card(parent,a,isNew){
 const el=make('button','shootAchCard');el.type='button';
 const sym=make('span','shootAchSymbol',a.icon),name=make('strong','',a.name),rar=make('small','',a.rarity);
 el.append(sym,name,rar);if(isNew)el.append(make('span','shootAchNew','NEW'));
 el.setAttribute('aria-label','查看成就：'+a.name);el.addEventListener('click',()=>detail(a));
 parent.append(el);
}
function show(input){
 const s=calculate(input),{earned,fresh}=evaluate(s);current={s,earned,fresh};
 const t=titles.find(x=>x.when(s));
 const phrase=choose(COMMENTS.find(x=>x.when(s)).texts);
 $('resultTitle').textContent=t.title;$('resultRank').textContent='射擊等第：'+s.grade+' 級';
 $('resultStamp').textContent=t.stamp;$('reportText').textContent=phrase;
 $('shootScore').textContent=s.score;$('shootGrade').textContent=s.grade+' 級';
 $('shootHistoryBest').textContent='歷史最高 '+progress.best+' 分';
 $('resultHits').textContent=s.hits;$('resultShots').textContent=s.shots;
 $('resultRate').textContent=s.accuracy+'%';$('resultMisses').textContent=s.misses;
 $('resultFriendly').textContent=s.friends;$('shootCenter').textContent=s.center;
 $('shootScoreExplanation').textContent='命中 '+s.hits+' 發 · 9環以上 '+s.center+' 發 · 友軍 '+s.friends+' 人';
 const list=$('shootAchCards');list.replaceChildren();
 const selected=[...fresh,...earned.filter(a=>!fresh.includes(a))].slice(0,3);
 if(selected.length)selected.forEach(a=>card(list,a,fresh.includes(a)));
 else list.append(make('div','shootAchEmpty','這次尚未達成成就。班長表示還有很多機會丟臉。'));
 $('shootAchMeta').textContent='本次達成 '+earned.length+' 項 · 新解鎖 '+fresh.length+' 項';
 updateCounts();
 try{$('resultScreen').querySelector('.panel').scrollTop=0;}catch{}
 return s;
}
function updateCounts(){
 const n=progress.ids.length;
 const label='🏅 成就圖鑑 '+n+' / '+ACH.length;
 for(const id of ['shootGalleryIntro','shootGalleryResult'])if($(id))$(id).textContent=label;
}
function layer(id,title){
 let overlay=$(id);if(overlay)return overlay;
 overlay=make('div','shootModal');overlay.id=id;overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label',title);overlay.setAttribute('aria-modal','true');
 const shell=make('div','shootModalShell'),hdr=make('div','shootModalHead');
 hdr.append(make('h2','',title));
 const close=make('button','shootClose','✕');close.type='button';close.setAttribute('aria-label','關閉');
 close.addEventListener('click',()=>closeLayer(overlay));hdr.append(close);shell.append(hdr);overlay.append(shell);
 overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)closeLayer(overlay)});
 document.body.append(overlay);return overlay;
}
function showLayer(overlay){focusBefore=document.activeElement;overlay.hidden=false;overlay.querySelector('.shootClose')?.focus();}
function closeLayer(overlay){overlay.hidden=true;focusBefore?.focus?.();}
function detail(a){
 const overlay=layer('shootAchDetail','成就詳細資料'),shell=overlay.querySelector('.shootModalShell');
 const old=shell.querySelector('.shootModalBody');if(old)old.remove();
 const content=make('div','shootModalBody shootDetailBody');
 content.append(make('div','shootDetailIcon',a.icon),make('div','shootDetailRarity',a.rarity),make('h3','',a.name));
 content.append(make('div','shootDetailLabel','解鎖條件'),make('p','shootDetailRequirement',a.desc));
 content.append(make('p','shootDetailQuote',progress.ids.includes(a.id)?'🏅 已收錄國軍榮譽簿。班長准許你炫耀三分鐘。':'尚未解鎖。去靶場給班長一點驚喜。'));
 shell.append(content);showLayer(overlay);
}
function gallery(){
 filter='all';renderGallery();
 const overlay=$('shootAchGallery');showLayer(overlay);
}
function renderGallery(){
 const overlay=layer('shootAchGallery','🏅 實彈射擊成就圖鑑'),shell=overlay.querySelector('.shootModalShell');
 let body=shell.querySelector('.shootModalBody');if(!body){body=make('div','shootModalBody');shell.append(body);}
 body.replaceChildren();
 body.append(make('p','shootGalleryProgress','已解鎖 '+progress.ids.length+' / '+ACH.length+' 項 · 歷史最高 '+progress.best+' 分'));
 const tabs=make('div','shootGalleryTabs');
 for(const [key,text] of [['all','全部'],['earned','已解鎖'],['locked','未解鎖']]){
  const b=make('button',filter===key?'active':'',text);b.type='button';b.addEventListener('click',()=>{filter=key;renderGallery()});tabs.append(b);
 }body.append(tabs);
 const grid=make('div','shootGalleryGrid');body.append(grid);
 const list=ACH.filter(a=>filter==='all'||(filter==='earned'?progress.ids.includes(a.id):!progress.ids.includes(a.id)));
 if(!list.length)grid.append(make('p','shootAchEmpty','目前沒有符合條件的成就。'));
 for(const a of list){
  const known=progress.ids.includes(a.id);
  const item=make('button','shootGalleryCard'+(known?'':' locked'));item.type='button';
  item.append(make('span','shootGallerySymbol',known?a.icon:'🔒'));
  item.append(make('strong','',known||!a.secret?a.name:'？？？'));
  item.append(make('small','',a.rarity+' · '+(known?'已解鎖':'未解鎖')));
  item.append(make('p','',known||!a.secret?a.desc:'神秘成就，達成條件保密。'));
  item.addEventListener('click',()=>{if(known||!a.secret)detail(a)});
  if(!known&&a.secret){item.disabled=true;item.title='神秘成就';}
  grid.append(item);
 }
}
window.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 const detailLayer=$('shootAchDetail'),galleryLayer=$('shootAchGallery');
 if(detailLayer&&!detailLayer.hidden){closeLayer(detailLayer);e.preventDefault();}
 else if(galleryLayer&&!galleryLayer.hidden){closeLayer(galleryLayer);e.preventDefault();}
});
for(const id of ['shootGalleryIntro','shootGalleryResult'])$(id)?.addEventListener('click',gallery);
updateCounts();
window.armyPaperReport={show,calculate,achievements:ACH.map(({test,...meta})=>meta),gallery,progress:()=>({...progress})};
})();