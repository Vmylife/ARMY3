/* ARMY3 shooting field report + persistent achievement collection v1.53.
   Presentation-only; live bullet hit detection and scene simulation remain unchanged. */
(()=>{'use strict';
const KEY='ARMY3_shooting_achievements_v1';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const int=v=>Math.max(0,Math.floor(Number(v)||0));
const RARITY={'傳說':0,'史詩':1,'稀有':2,'普通':3};
const LEVELS=[
 {name:'新兵適應',hint:'單純射擊',friends:0},
 {name:'友軍暖身',hint:'友軍開始亂跑',friends:4},
 {name:'移動靶危機',hint:'小心自己人',friends:8},
 {name:'全連大亂鬥',hint:'注意射線',friends:12},
 {name:'班長的陰謀',hint:'最終鑑測',friends:16}
];
const REQUIRED_HITS=5;
const clampStage=x=>clamp(int(x)||1,1,5);
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
 {id:'clean',icon:'🤝',name:'友軍安全宣導大使',desc:'第2關以後打滿10發，完全沒有誤傷友軍',rarity:'普通',test:s=>s.stage>=2&&s.shots===10&&s.friends===0},
 {id:'no_zoom',icon:'👀',name:'肉眼自帶四倍鏡',desc:'不開鏡打滿10發，且至少5發上靶',rarity:'史詩',test:s=>s.shots===10&&s.hits>=5&&s.zoomShots===0},
 {id:'scope',icon:'🔎',name:'瞄準鏡住戶',desc:'10發全部在開鏡狀態射擊',rarity:'普通',test:s=>s.shots===10&&s.zoomShots===10},
 {id:'quick',icon:'⚡',name:'比班長集合還快',desc:'20秒內打完10發，且至少5發上靶',rarity:'稀有',test:s=>s.shots===10&&s.elapsed<=20&&s.hits>=5},
 {id:'slow',icon:'🐢',name:'慢工出不了細活',desc:'耗時40秒以上才完成鑑測',rarity:'普通',test:s=>s.elapsed>=40},
 {id:'single',icon:'🪄',name:'五發打卡下班',desc:'只用5發子彈就過關，且5發全部上靶',rarity:'史詩',secret:true,test:s=>s.passed&&s.shots===5&&s.hits===5},
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
 {id:'perfect_discipline',icon:'🕯️',name:'班長今天沒寫檢討',desc:'10發全上靶，其中至少5發9環以上且0誤傷',rarity:'傳說',secret:true,test:s=>s.shots===10&&s.hits===10&&s.center>=5&&s.friends===0},
 {id:'level1',icon:'🪖',name:'新兵過了第一關',desc:'通過第1關：0名友軍、至少5發上靶',rarity:'普通',test:s=>s.stage===1&&s.passed},
 {id:'level2',icon:'🏃',name:'終於有人來干擾',desc:'通過第2關：4名跑動友軍',rarity:'普通',test:s=>s.stage===2&&s.passed},
 {id:'level3',icon:'🚧',name:'人體迷宮解題王',desc:'通過第3關：8名跑動友軍',rarity:'稀有',test:s=>s.stage===3&&s.passed},
 {id:'level4',icon:'🫡',name:'全連讓你練膽量',desc:'通過第4關：12名跑動友軍',rarity:'稀有',test:s=>s.stage===4&&s.passed},
 {id:'level5',icon:'🏆',name:'五關總算放你走',desc:'通過第5關：16名跑動友軍',rarity:'傳說',test:s=>s.stage===5&&s.passed},
 {id:'level1perfect',icon:'🥇',name:'新兵不是新手',desc:'第1關10發全上靶',rarity:'稀有',test:s=>s.stage===1&&s.shots===10&&s.hits===10},
 {id:'level2clean',icon:'🛡️',name:'四個弟兄平安無事',desc:'第2關過關且完全沒有誤傷友軍',rarity:'普通',test:s=>s.stage===2&&s.passed&&s.friends===0},
 {id:'level3clean',icon:'🎖️',name:'八人穿梭零擦傷',desc:'第3關過關且完全沒有誤傷友軍',rarity:'稀有',test:s=>s.stage===3&&s.passed&&s.friends===0},
 {id:'level4clean',icon:'🌟',name:'十二人都是自己人',desc:'第4關過關且完全沒有誤傷友軍',rarity:'史詩',test:s=>s.stage===4&&s.passed&&s.friends===0},
 {id:'level5clean',icon:'👑',name:'全連無傷通關',desc:'第5關過關且完全沒有誤傷友軍',rarity:'傳說',test:s=>s.stage===5&&s.passed&&s.friends===0},
 {id:'allclean',scope:'run',icon:'🕊️',name:'班長的醫療費歸零',desc:'單次從第1關到第5關全過，而且零誤傷',rarity:'傳說',secret:true,test:r=>r.completed&&r.friends===0},
 {id:'allhigh',scope:'run',icon:'💯',name:'五關全是榜首',desc:'同一輪的五個關卡，每關都取得90分以上',rarity:'傳說',secret:true,test:r=>r.completed&&r.stages.every(s=>s.score>=90)},
 {id:'fastpass',icon:'⏱️',name:'五發就收工',desc:'任一關只打5發就通過關卡',rarity:'稀有',test:s=>s.passed&&s.hits===5&&s.shots===5},
 {id:'closecall',icon:'😵',name:'壓線過關的藝術',desc:'打滿10發，恰好5發上靶通關',rarity:'普通',test:s=>s.shots===10&&s.hits===5&&s.passed},
 {id:'retest',icon:'📒',name:'班長再給你一次機會',desc:'任一關10發打完、上靶未滿5發',rarity:'普通',test:s=>s.shots===10&&!s.passed},
 {id:'level5disaster',icon:'🚑',name:'最後一關全連住院',desc:'第5關誤傷至少5位友軍',rarity:'史詩',secret:true,test:s=>s.stage===5&&s.friends>=5},
 {id:'level5perfect',icon:'💎',name:'班長懷疑你是機器人',desc:'第5關10發全上靶，無誤傷',rarity:'傳說',secret:true,test:s=>s.stage===5&&s.shots===10&&s.hits===10&&s.friends===0},
 {id:'firstfail',icon:'🫠',name:'連無人靶場都會卡',desc:'第1關10發打完，仍未過關',rarity:'稀有',secret:true,test:s=>s.stage===1&&s.shots===10&&!s.passed},
 {id:'run_complete',scope:'run',icon:'🏆',name:'連續五關總算下課',desc:'從第1關連續通過第5關',rarity:'史詩',test:r=>r.completed},
 {id:'run_clean',scope:'run',icon:'🛡️',name:'軍醫連放假日',desc:'單次五關全過，沒有一名友軍被誤傷',rarity:'傳說',secret:true,test:r=>r.completed&&r.friends===0},
 {id:'run_avg90',scope:'run',icon:'🌟',name:'全程績優示範兵',desc:'一次完整五關鑑測，最終總分達90分',rarity:'傳說',test:r=>r.completed&&r.score>=90},
 {id:'run_25',scope:'run',icon:'⚡',name:'全營最快收靶兵',desc:'五關全過而且全程只打25發',rarity:'傳說',secret:true,test:r=>r.completed&&r.shots===25},
 {id:'run_50',scope:'run',icon:'📦',name:'五十發彈殼收藏家',desc:'五關全部通過而且剛好打滿50發',rarity:'史詩',test:r=>r.completed&&r.shots===50},
 {id:'run_failed5',scope:'run',icon:'😵',name:'在終點線前仆街',desc:'前四關全過，卻倒在第5關',rarity:'史詩',secret:true,test:r=>r.failedStage===5},
 {id:'run_oneoff',scope:'run',icon:'🥲',name:'再一發就不用回來',desc:'最後失敗的一關恰好只上靶4發',rarity:'稀有',test:r=>r.failedStage>0&&r.failed?.hits===4},
 {id:'run_fivefive',scope:'run',icon:'🪄',name:'五關都精準打卡',desc:'一次五關通關，每關都恰好5發上靶',rarity:'史詩',test:r=>r.completed&&r.stages.every(s=>s.hits===5)},
 {id:'run_35',scope:'run',icon:'🎯',name:'靶紙大批發',desc:'同一次五關通關，累計至少35發上靶',rarity:'史詩',test:r=>r.completed&&r.hits>=35},
 {id:'run_total100',scope:'run',icon:'👑',name:'國軍鑑測傳說',desc:'五關全過且總分達到100分',rarity:'傳說',secret:true,test:r=>r.completed&&r.score===100}
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

/* A five-stage attempt never exposes a result until it succeeds at stage 5
   or fails at any stage. Previous achievement IDs persist for compatibility. */
function emptyProgress(){return {ids:[],best:0,bestRun:0,played:0,last:null,clearedStages:[],cleanStages:[],unlockedStage:1,stageBests:[0,0,0,0,0]};}
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
  const cleared=Array.isArray(raw.clearedStages)?raw.clearedStages.map(clampStage):[];
  const clean=Array.isArray(raw.cleanStages)?raw.cleanStages.map(clampStage):[];
  return {
   ids:Array.isArray(raw.ids)?[...new Set(raw.ids.filter(id=>typeof id==='string'&&ACH.some(a=>a.id===id)))]:[],
   best:clamp(int(raw.best),0,100),bestRun:clamp(int(raw.bestRun),0,100),
   played:int(raw.played),last:raw.last||null,
   clearedStages:[...new Set(cleared)],cleanStages:[...new Set(clean)],
   unlockedStage:Math.max(1,...cleared.map(v=>Math.min(5,v+1))),
   stageBests:Array.from({length:5},(_,i)=>clamp(int(raw.stageBests?.[i]),0,100))
  };
 }catch{return emptyProgress();}
}
let progress=load(),current=null,filter='all',focusBefore=null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress))}catch{}}
function renderStagePicker(){
 const box=$('shootStageChoices');
 if(box){box.replaceChildren();
  for(let i=1;i<=5;i++){
   const cleared=progress.clearedStages.includes(i);
   const span=make('span','shootStageCard static'+(cleared?' cleared':''),undefined);
   span.append(make('strong','',i),make('small','',cleared?'✓':''));
   box.append(span);
  }
 }
 if($('shootStageTitle'))$('shootStageTitle').textContent='五關連續鑑測 · 一律從第1關開始';
 if($('shootStageDetail'))$('shootStageDetail').textContent='10發上靶至少5發就過關；失敗立即結算，不可接關';
 if($('shootProgressNote'))$('shootProgressNote').textContent='歷史通過 '+progress.clearedStages.length+' / 5 關';
}
function recordStage(input){
 const stage=calculate(input);
 if(!stage.passed)return stage;
 const i=stage.stage-1;
 progress.best=Math.max(progress.best,stage.score);
 progress.stageBests[i]=Math.max(progress.stageBests[i],stage.score);
 if(!progress.clearedStages.includes(stage.stage))progress.clearedStages.push(stage.stage);
 if(stage.friends===0&&!progress.cleanStages.includes(stage.stage))progress.cleanStages.push(stage.stage);
 progress.unlockedStage=Math.max(progress.unlockedStage,Math.min(5,stage.stage+1));
 save();
 return stage;
}
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
 const stage=clampStage(input.stage??selectedStage),passed=hits>=REQUIRED_HITS;
 const entry={completed:true,shots,hits,friends,misses:shots-hits-friends,accuracy:shots?Math.round(hits/shots*100):0,stage,passed,requiredHits:REQUIRED_HITS,
  cleanStages:progress.cleanStages.slice(),stageBests:progress.stageBests.slice(),
  center,tenRing,ringHits,ringTotal,zoomShots,streak,elapsed:Math.max(0,Number(input.elapsed)||0),history,score,grade};
 return entry;
}

const choose=texts=>texts[Math.floor(Math.random()*texts.length)]||'班長目前無言以對。';
const RUN_COMMENTS=[
 {when:r=>r.completed&&r.friends===0,texts:[
  '五關全過、友軍零傷。班長現在找不到叫你留下來的理由。',
  '全連平安無事，靶紙卻滿身是洞。這份戰報總算可以送上去了。',
  '五關都過，醫護所感謝你讓他們準時下班。',
  '這份成績太乾淨，我懷疑靶紙是自己走過來讓你射的。']},
 {when:r=>r.completed&&r.score>=90,texts:[
  '五關平均九十分以上。班長感動到差點說「今天提早收操」。',
  '這個成績很漂亮，連長現在想拿去當下一梯的標準。',
  '你把五關打得像在做簡單算術，害班長的重測表全部白印了。',
  '五關結束，唯一抱怨的是靶紙希望申請職災補助。']},
 {when:r=>r.completed&&r.friends>=5,texts:[
  '五關通過是好事，但你這份友軍傷亡名冊讓我笑不出來。',
  '射擊鑑測完成，醫護所也被迫完成加班鑑測。',
  '你有打中靶紙，甚至還打到很多不該被打中的弟兄。',
  '班長現在同時在準備獎狀和軍紀檢討報告。']},
 {when:r=>r.completed,texts:[
  '五關全部過了，恭喜你成功撐過比射擊還危險的友軍動線。',
  '連長說可以交卷，班長說最好還是再檢查一下軍紀欄。',
  '五關通關！靶紙收齊，今天總算不用再練了。',
  '畢業！班長本來準備的罵人稿，只好留給下一梯。']},
 {when:r=>r.failedStage===1,texts:[
  '第一關連友軍都沒出現，你怎麼就直接下課了？',
  '靶場沒有任何人擋你，靶紙卻還是等不到五發。',
  '你成功通過了穿戴裝備，射擊鑑測部分明天再說。',
  '第一關就收工，這樣班長的五張鑑測表只用掉一張。']},
 {when:r=>r.failedStage===5,texts:[
  '前四關都熬過了，偏偏第五關倒在終點線上。請從第一關重新排隊。',
  '班長原本已經要蓋通過章，結果你讓他重新拿起紅筆。',
  '第五關沒過。十六名友軍表示，這次終於有人理解他們的工作。',
  '九成路都走完了，最後一關連長還是幫你打了回票。']},
 {when:r=>true,texts:[
  '鑑測提前結束。未滿五發上靶，請回第一關重新報到。',
  '班長：我沒叫你在這一關留下來永久服役，重頭再測。',
  '靶紙回收，本輪成績只能送進重測資料夾。',
  '射擊沒過關，長官倒是多收集了一份新檢討報告。',
  '下一次進靶場記得帶上準星，別只帶勇氣。']}
];
const make=(tag,cls,text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
function card(parent,a,isNew){
 const el=make('button','shootAchCard');el.type='button';
 el.append(make('span','shootAchSymbol',a.icon),make('strong','',a.name),make('small','',a.rarity));
 if(isNew)el.append(make('span','shootAchNew','NEW'));
 el.setAttribute('aria-label','查看成就：'+a.name);
 el.addEventListener('click',()=>detail(a));parent.append(el);
}
function showRun(input={}){
 const succeeded=(Array.isArray(input.stages)?input.stages:[]).map(calculate).filter(s=>s.passed).sort((a,b)=>a.stage-b.stage);
 const failures=(Array.isArray(input.failures)?input.failures:[]).map(calculate).filter(s=>!s.passed);
 const failed=failures[0]||null;
 const stages=succeeded.slice(0,5);
 const completed=stages.length===5&&stages.every((s,i)=>s.stage===i+1)&&!failed;
 const attempts=[...stages,...(failed?[failed]:[])];
 const sum=key=>attempts.reduce((n,s)=>n+s[key],0);
 const hits=sum('hits'),shots=sum('shots'),friends=sum('friends'),center=sum('center'),misses=sum('misses');
 const score=clamp(Math.round(sum('score')/5),0,100);
 const grade=score>=90?'S':score>=75?'A':score>=55?'B':score>=35?'C':score>=20?'D':'F';
 const run={stages,failed,completed,failedStage:failed?.stage||0,score,grade,hits,shots,friends,center,misses,
  accuracy:shots?Math.round(hits/shots*100):0};
 for(const s of stages)recordStage(s);
 const decorated=attempts.map(s=>({...s,cleanStages:progress.cleanStages.slice(),stageBests:progress.stageBests.slice()}));
 const prev=new Set(progress.ids);
 const earned=ACH.filter(a=>{
  try{return a.scope==='run'?a.test(run):decorated.some(s=>a.test(s));}catch{return false;}
 }).sort((a,b)=>RARITY[a.rarity]-RARITY[b.rarity]||ACH.indexOf(a)-ACH.indexOf(b));
 const fresh=earned.filter(a=>!prev.has(a.id));
 progress.ids=[...new Set([...progress.ids,...earned.map(a=>a.id)])];
 progress.bestRun=Math.max(progress.bestRun,score);
 progress.played++;
 progress.last={score,grade,completed,failedStage:run.failedStage,hits,shots,friends,completedStages:stages.length,date:new Date().toISOString()};
 save();current={run,earned,fresh};renderStagePicker();
 $('resultTitle').textContent=completed?'五關射擊總結算':'鑑測提前結束';
 $('resultRank').textContent=completed?'第1～5關完成 · '+grade+' 級':'第 '+run.failedStage+' 關未過 · '+grade+' 級';
 $('resultStamp').textContent=completed?'五關制霸':'重測';
 $('reportText').textContent=choose(RUN_COMMENTS.find(x=>x.when(run)).texts);
 $('shootStageOutcome').textContent=completed?'🏆 五關全部通關！':'✕ 第 '+run.failedStage+' 關失敗，整輪結束';
 $('shootStageOutcome').className='shootStageOutcome '+(completed?'pass':'fail');
 $('shootScore').textContent=score;$('shootGrade').textContent=grade+' 級';
 $('shootHistoryBest').textContent='歷史最高總分 '+progress.bestRun+' 分';
 $('resultHits').textContent=hits;$('resultShots').textContent=shots;$('resultRate').textContent=run.accuracy+'%';
 $('resultMisses').textContent=misses;$('resultFriendly').textContent=friends;$('shootCenter').textContent=center;
 $('shootScoreExplanation').textContent='總分 = 五關分數總和 ÷ 5 · 累計 '+shots+' 發';
 $('shootNextHint').textContent=completed?'本次鑑測完成，成就與紀錄已保存。':'本次鑑測已結束；再次挑戰必須從第1關開始。';
 $('againBtn').textContent='從第1關重新挑戰';
 const strip=$('shootResultStageProgress'),rows=$('shootRunRows');
 strip.replaceChildren();if(rows)rows.replaceChildren();
 for(let i=1;i<=5;i++){
  const passed=stages.find(s=>s.stage===i),failedHere=failed?.stage===i,entry=passed||(failedHere?failed:null);
  strip.append(make('span','shootStageDot'+(passed?' passed':'')+(failedHere?' failed':''),
   passed?'✓':failedHere?'✕':String(i)));
  if(!rows)continue;
  const row=make('div','shootRunRow'+(failedHere?' failed':'')+(!entry?' unplayed':''));
  row.append(make('span','shootRunLevel','第 '+i+' 關'));
  row.append(make('strong','shootRunPoints',entry?entry.score+' 分':'—'));
  row.append(make('small','shootRunStats',entry?
   entry.hits+' / '+entry.shots+' 上靶 · 友軍 '+entry.friends+' 人 · '+(passed?'通過':'失敗'):
   '尚未進入'));rows.append(row);
 }
 const list=$('shootAchCards');list.replaceChildren();
 const show=[...fresh,...earned.filter(a=>!fresh.includes(a))].slice(0,3);
 if(show.length)show.forEach(a=>card(list,a,fresh.includes(a)));
 else list.append(make('div','shootAchEmpty','本輪沒有解鎖新成就。班長仍然有話想說。'));
 $('shootAchMeta').textContent='本輪達成 '+earned.length+' 項 · 新解鎖 '+fresh.length+' 項';
 updateCounts();
 try{$('resultScreen').querySelector('.panel').scrollTop=0;}catch{}
 try{window.dispatchEvent(new CustomEvent('army:shooting:result',{detail:{...progress.last,newAchievements:fresh.map(a=>a.id)}}))}catch{}
 return run;
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
 body.append(make('p','shootGalleryProgress','已解鎖 '+progress.ids.length+' / '+ACH.length+' 項 · 歷史最高總分 '+progress.bestRun+' 分'));
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
updateCounts();renderStagePicker();
window.armyPaperReport={showRun,recordStage,calculate,achievements:ACH.map(({test,...meta})=>meta),gallery,
 renderStagePicker,stageInfo:stage=>LEVELS[clampStage(stage)-1],progress:()=>({...progress})};
})();