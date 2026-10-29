/* ARMY3 v3.23 | Shared 34-item grenade results/medal collection.
   Existing 18 crafting achievements no longer appear in the user-facing gallery.
   The NEW gallery uses the SAME saved unlock IDs as grenade-score.js and the
   three-throw results screen: army-grenade-training-v1.
   No score, kill count or challenge predicate is modified here. */
(() => {
 'use strict';
 const host=window.parent!==window&&new URLSearchParams(location.search).get('embedded')==='1'?window.parent:window;
 let doc;
 try{doc=host.document;if(!doc.getElementById('galCards')||!doc.getElementById('gallery'))return;}catch{return;}
 try{host.__armyGrenadeGalleryFix322?.dispose?.();}catch{}
 if(host.__armyGrenadeGallery323)return;
 const data=[{"id":"elite","icon":"🏅","name":"國軍之光","description":"殲滅9名紅軍，沒有誤傷友軍，也沒有摧毀建築","rarity":"傳說","secret":true},{"id":"catastrophe","icon":"☄️","name":"這不是手榴彈，這是天災","description":"9名紅軍全滅、150名以上友軍誤殺、12棟建築全毀","rarity":"傳說","secret":true},{"id":"undercover","icon":"🕵️","name":"敵軍派來的臥底","description":"紅軍0擊殺，卻誤殺至少30名友軍","rarity":"史詩","secret":true},{"id":"renovation","icon":"🏗️","name":"國軍都更計畫","description":"12棟建築全部摧毀","rarity":"史詩","secret":true},{"id":"peace","icon":"🕊️","name":"佛系投彈手","description":"紅軍、友軍、建築全部零損失","rarity":"罕見","secret":true},{"id":"war_win_f","icon":"💥","name":"戰術天才，軍紀災難","description":"紅軍全滅，但軍紀評價不合格","rarity":"史詩","secret":true},{"id":"enemy_full","icon":"🎯","name":"敵軍殲滅者","description":"三次投擲內殲滅全部9名紅軍","rarity":"史詩","secret":false},{"id":"clean_sweep","icon":"✨","name":"滴水不漏","description":"至少擊殺6名紅軍，0名友軍誤殺、0棟建築受損","rarity":"史詩","secret":true},{"id":"friendly_150","icon":"🚨","name":"國防部頭號通緝犯","description":"三投累計誤殺至少150名友軍","rarity":"史詩","secret":true},{"id":"friendly_50","icon":"📛","name":"國軍最大內鬼","description":"三投累計誤殺至少50名友軍","rarity":"罕見","secret":false},{"id":"friend_30","icon":"⚖️","name":"軍事法庭常客","description":"三投累計誤殺至少30名友軍","rarity":"罕見","secret":false},{"id":"enemy_six","icon":"🪖","name":"紅軍剋星","description":"擊殺至少6名紅軍","rarity":"罕見","secret":false},{"id":"enemy_three","icon":"🎖️","name":"初露鋒芒","description":"擊殺至少3名紅軍","rarity":"普通","secret":false},{"id":"enemy_one","icon":"🥉","name":"初次戰果","description":"擊殺至少1名紅軍","rarity":"普通","secret":false},{"id":"demolition_ten","icon":"🧨","name":"營區終結者","description":"三投累計摧毀至少10棟建築","rarity":"罕見","secret":false},{"id":"demolition_six","icon":"🚧","name":"國軍都更處處長","description":"三投累計摧毀至少6棟建築","rarity":"罕見","secret":false},{"id":"demolition_three","icon":"🏚️","name":"拆遷大隊","description":"三投累計摧毀至少3棟建築","rarity":"普通","secret":false},{"id":"first_building","icon":"🔨","name":"營產破壞者","description":"三投累計摧毀至少1棟建築","rarity":"普通","secret":false},{"id":"friend_15","icon":"📋","name":"損失慘重","description":"三投累計誤殺至少15名友軍","rarity":"罕見","secret":false},{"id":"friend_4","icon":"💢","name":"友軍殺手","description":"三投累計誤殺至少4名友軍","rarity":"普通","secret":false},{"id":"friendly_one","icon":"😱","name":"友軍不是靶子","description":"三投累計誤殺至少1名友軍","rarity":"普通","secret":false},{"id":"nothing_else","icon":"🫡","name":"軍紀模範生","description":"三投累計沒有造成任何友軍傷亡或營產損失","rarity":"普通","secret":false},{"id":"no_buildings","icon":"🏡","name":"愛護公物","description":"本次沒有摧毀任何建築","rarity":"普通","secret":false},{"id":"no_friends","icon":"🤝","name":"友軍守護者","description":"本次沒有誤殺友軍","rarity":"普通","secret":false},{"id":"red_zero_bldg","icon":"🧱","name":"只拆房不打仗","description":"沒有擊殺紅軍，卻至少摧毀5棟建築","rarity":"罕見","secret":true},{"id":"one_red_no_friend","icon":"🎯","name":"精準狙擊","description":"只擊殺1名紅軍且沒有誤傷友軍或建築","rarity":"罕見","secret":true},{"id":"one_miss","icon":"🥲","name":"就差一個","description":"擊殺8名紅軍且沒有任何友軍或建築損失","rarity":"罕見","secret":true},{"id":"nine_and_nine","icon":"⚔️","name":"一命換一命","description":"同時擊殺9名紅軍並誤殺至少9名友軍","rarity":"罕見","secret":true},{"id":"worst","icon":"📉","name":"年終考績不予評定","description":"本次訓練總分未滿20分","rarity":"罕見","secret":true},{"id":"no_red_many","icon":"🤯","name":"你到底是哪一邊的","description":"紅軍0擊殺，卻至少誤殺10名友軍","rarity":"罕見","secret":true},{"id":"grade_s","icon":"🌟","name":"鑑測特優","description":"本次訓練總分90分以上","rarity":"罕見","secret":false},{"id":"quick_one","icon":"⚡","name":"一發入魂","description":"第一投就殲滅全部9名紅軍","rarity":"史詩","secret":true},{"id":"quick_two","icon":"⏱️","name":"提前下課","description":"第二投就殲滅全部9名紅軍","rarity":"罕見","secret":true},{"id":"grade_a","icon":"📜","name":"鑑測優等","description":"本次訓練總分75分以上","rarity":"普通","secret":false}];
 const gallery=doc.getElementById('gallery'),grid=doc.getElementById('galCards'),counter=doc.getElementById('achievementProgress');
 // Remove old v3.22 controls if a cached module loaded in the same page.
 for(const id of ['armyGrenadeGalleryExit','armyGrenadeAchievementModal','armyGrenadeGalleryFixStyle322']){try{doc.getElementById(id)?.remove()}catch{}}
 const readUnlocked=()=>{try{const v=JSON.parse(host.localStorage.getItem('army-grenade-training-v1')||'{}');return new Set(Array.isArray(v.unlockedIds)?v.unlockedIds:[]);}catch{return new Set()}};
 const make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e};
 const css=doc.createElement('style');css.id='armyGrenadeGallery323Style';
 css.textContent=`
 #gallery.army-unified-gallery { position:fixed!important;inset:0!important;z-index:1300!important;
   overflow-y:auto!important;overflow-x:hidden!important;height:100dvh!important;
   padding:calc(22px + env(safe-area-inset-top)) 15px calc(90px + env(safe-area-inset-bottom))!important;
   overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;
   touch-action:pan-y!important;pointer-events:auto!important; }
 #gallery.army-unified-gallery .galInner,#gallery.army-unified-gallery .galCards{pointer-events:auto!important;touch-action:pan-y!important;}
 #gallery .galCards .galCard.army-34{display:block;min-height:105px;width:100%;text-align:left;border:1px solid #c9d9b13b;
   background:#1a3528;color:#f3e9cf;border-radius:13px;padding:12px;
   font:inherit;white-space:normal;cursor:pointer;touch-action:pan-y!important;pointer-events:auto!important;
   user-select:none!important;-webkit-user-select:none!important;}
 #gallery .galCards .galCard.army-34.locked{opacity:.56;}
 #gallery .galCards .galCard.army-34:active{border-color:#edcf8a;background:#2d4735;}
 #gallery .galCards .galCard.army-34:focus-visible{outline:3px solid #f0d490;}
 #gallery .galCard .army-34-rarity{display:block;color:#f0d38f;font-size:10px;font-weight:850;margin:4px 0;}
 #gallery .galCard .army-34-icon{display:block;font-size:23px;margin-bottom:3px;}
 #gallery .galCard .army-34-note{font-size:11px;line-height:1.45;color:#bdcbb7;margin-top:5px;}
 #armyGrenadeGalleryExit323{position:sticky;float:right;top:0;z-index:3;min-height:43px;padding:8px 13px;
   border:1px solid #e3cc94b3;border-radius:11px;background:#2e4a38;color:#f6e8bd;
   font:900 13px system-ui,-apple-system,sans-serif;touch-action:manipulation;cursor:pointer;}
 #armyGrenadeAchievementModal323{position:fixed;inset:0;z-index:1500;display:none;align-items:center;justify-content:center;
   padding:calc(14px + env(safe-area-inset-top)) 14px calc(14px + env(safe-area-inset-bottom));
   background:#03100be8;backdrop-filter:blur(7px);pointer-events:auto;}
 #armyGrenadeAchievementModal323.open{display:flex;}
 #armyGrenadeAchievementModal323 .army-34-detail{width:min(415px,100%);max-height:85dvh;overflow-y:auto;
   -webkit-overflow-scrolling:touch;touch-action:pan-y;background:linear-gradient(160deg,#284633,#11291e);
   border:1px solid #d1bd86;border-radius:20px;padding:23px 20px 19px;text-align:center;color:#f8e6be;box-shadow:0 16px 46px #000b;}
 #armyGrenadeAchievementModal323 .army-34-detail-icon{font-size:42px;margin:6px auto;}
 #armyGrenadeAchievementModal323 .army-34-detail-state{color:#efce86;font:850 11px system-ui;margin-top:6px;}
 #armyGrenadeAchievementModal323 .army-34-detail h3{font-size:23px;margin:10px 0 18px;line-height:1.35;}
 #armyGrenadeAchievementModal323 .army-34-description{text-align:left;background:#0c281d;border:1px solid #a1bf9c40;border-radius:11px;padding:14px;font-size:13px;line-height:1.7;}
 #armyGrenadeAchievementModal323 .army-34-close{width:100%;min-height:46px;margin-top:17px;border-radius:11px;border:0;
   background:#efce84;color:#183223;font:900 14px system-ui;touch-action:manipulation;cursor:pointer;}
 body:has(#gallery.army-unified-gallery) #grenadeArenaFrame{pointer-events:none!important;}
 `;
 doc.head.append(css);
 const exit=make('button','','✕ 關閉');exit.id='armyGrenadeGalleryExit323';exit.type='button';gallery.insertBefore(exit,gallery.firstChild);
 const modal=make('div');modal.id='armyGrenadeAchievementModal323';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 const panel=make('div','army-34-detail');const icon=make('div','army-34-detail-icon');const state=make('div','army-34-detail-state');
 const name=make('h3');const desc=make('div','army-34-description');const close=make('button','army-34-close','收到，長官！');close.type='button';
 panel.append(icon,state,name,desc,close);modal.append(panel);doc.body.append(modal);
 let open=false,disposed=false,rendering=false,unlocks='';
 const closeModal=()=>{open=false;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');};
 const hide=()=>{closeModal();gallery.classList.remove('show','army-unified-gallery');};
 const details=id=>{
   const a=data.find(x=>x.id===id);if(!a)return;
   const has=readUnlocked().has(id);const masked=a.secret&&!has;
   icon.textContent=masked?'🔒':a.icon;
   state.textContent=masked?'隱藏成就 · 尚未解鎖':(a.rarity+' · '+(has?'已解鎖':'尚未解鎖'));
   name.textContent=masked?'？？？ 未知成就':a.name;
   desc.textContent=masked?'完成特殊挑戰後將揭曉獲得條件。':a.description;
   modal.classList.add('open');modal.setAttribute('aria-hidden','false');open=true;
 };
 close.addEventListener('click',closeModal);
 modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
 exit.addEventListener('click',hide);
 doc.addEventListener('keydown',e=>{if(e.key==='Escape'){if(open)closeModal();else if(gallery.classList.contains('show'))hide();}},true);
 grid.addEventListener('click',e=>{const b=e.target.closest?.('.army-34');if(b&&grid.contains(b)){e.preventDefault();e.stopImmediatePropagation();details(b.dataset.id);}},true);
 function render(){
   if(disposed||rendering||!gallery.classList.contains('show'))return;
   const unlocked=readUnlocked();const key=[...unlocked].sort().join('|');
   if(grid.children.length===34&&grid.firstElementChild?.dataset.armyUnified==='323'&&unlocks===key)return;
   rendering=true;
   try{
     unlocks=key;const frag=doc.createDocumentFragment();
     for(const a of data){
       const has=unlocked.has(a.id),masked=a.secret&&!has;
       const b=make('button','galCard army-34'+(has?'':' locked'));b.type='button';b.dataset.id=a.id;b.dataset.armyUnified='323';
       b.setAttribute('aria-label','查看成就：'+(masked?'未知隱藏成就':a.name));
       b.append(make('div','army-34-icon',masked?'🔒':a.icon));
       b.append(make('small','',has?'🏅 已解鎖':masked?'🔒 隱藏成就':'🔒 尚未解鎖'));
       b.append(make('strong','',masked?'？？？ 未知成就':a.name));
       b.append(make('div','army-34-rarity',masked?'隱藏成就':a.rarity));
       b.append(make('div','army-34-note',masked?'完成特殊挑戰後將解鎖條件':a.description));
       frag.append(b);
     }
     grid.replaceChildren(frag);
     counter.textContent='已取得 '+data.filter(x=>unlocked.has(x.id)).length+' / '+data.length+' 項勳章與隱藏成就';
     gallery.classList.add('army-unified-gallery');
     const title=gallery.querySelector('h2');if(title)title.textContent='🏅 勳章與隱藏成就';
   }finally{rendering=false;}
 }
 const observer=new host.MutationObserver(()=>render());
 observer.observe(grid,{childList:true});
 const showWatcher=new host.MutationObserver(()=>{
   if(gallery.classList.contains('show'))render();else closeModal();
 });
 showWatcher.observe(gallery,{attributes:true,attributeFilter:['class']});
 // Old showGallery() runs synchronously and rewrites the card grid every time;
 // observe that update then replace it with exactly the same 34 report medals.
 render();
 host.__armyGrenadeGallery323={render,hide,details,dispose(){disposed=true;observer.disconnect();showWatcher.disconnect();closeModal();exit.remove();modal.remove();css.remove();delete host.__armyGrenadeGallery323;}};
})();
