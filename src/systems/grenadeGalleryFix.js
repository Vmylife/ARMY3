/* ARMY3 v3.22 | iPhone-safe grenade workshop achievements gallery.
   Runs in the workshop window or from its same-origin 3D preloader iframe.
   Repairs scrolling/touch hit testing and supplies achievement-card details.
   Does not modify scores, unlock rules, audio, or gameplay. */
(() => {
  'use strict';
  const host = window.parent !== window && new URLSearchParams(location.search).get('embedded') === '1'
    ? window.parent : window;
  let doc;
  try {
    doc = host.document;
    if (!doc.getElementById('galCards') || !doc.getElementById('gallery')) return;
  } catch { return; }
  if (host.__armyGrenadeGalleryFix322) return;

  const gallery = doc.getElementById('gallery');
  const grid = doc.getElementById('galCards');
  const style = doc.createElement('style');
  style.id = 'armyGrenadeGalleryFixStyle322';
  style.textContent = `
    /* Gallery must be above the prewarmed 3D iframe (z-index 40) and audio dock. */
    #gallery.show {
      position:fixed!important; inset:0!important;
      z-index:1100!important; display:block!important;
      height:100dvh!important; max-height:100dvh!important;
      overflow-y:auto!important; overflow-x:hidden!important;
      touch-action:pan-y!important; -webkit-overflow-scrolling:touch!important;
      overscroll-behavior-y:contain!important; pointer-events:auto!important;
      padding-bottom:calc(92px + env(safe-area-inset-bottom))!important;
    }
    #gallery .galInner, #gallery .galCards { pointer-events:auto!important; }
    #gallery .galCard {
      display:block; width:100%; text-align:left;
      color:inherit; font:inherit; font-weight:normal;
      -webkit-appearance:none; appearance:none;
      border:1px solid #c9d9b12c; border-radius:12px;
      background:#1a3025; padding:12px;
      cursor:pointer; pointer-events:auto!important;
      touch-action:pan-y!important;
      -webkit-user-select:none!important; user-select:none!important;
    }
    #gallery .galCard:active { border-color:#e7cb87; background:#294637; }
    #gallery .galCard:focus-visible { outline:3px solid #e5cc85; outline-offset:2px; }
    #gallery .galCard.locked { opacity:.55; }
    #armyGrenadeGalleryExit {
      position:sticky; float:right; top:0; z-index:2;
      border:1px solid #e4cf92a6; border-radius:10px;
      background:#294636; color:#f5e7c6;
      min-height:43px; min-width:75px; margin:-5px 0 9px 8px;
      font:800 13px system-ui,-apple-system,sans-serif;
      touch-action:manipulation; cursor:pointer;
      -webkit-user-select:none!important;user-select:none!important;
    }
    body:has(#gallery.show) #grenadeArenaFrame { pointer-events:none!important; }
    #armyGrenadeAchievementModal {
      display:none; position:fixed; inset:0; z-index:1250;
      padding:calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));
      align-items:center; justify-content:center;
      background:#06140de8; backdrop-filter:blur(7px);
      touch-action:pan-y!important; pointer-events:auto!important;
    }
    #armyGrenadeAchievementModal.open { display:flex; }
    #armyGrenadeAchievementModal .army-ach-card {
      width:min(420px,100%); max-height:85dvh; overflow-y:auto;
      -webkit-overflow-scrolling:touch; touch-action:pan-y;
      background:linear-gradient(155deg,#264735,#12281e);
      color:#f2e7cb; border:1px solid #d3bb82;
      border-radius:19px; padding:24px 19px 19px;
      box-shadow:0 18px 65px #000a; text-align:center;
    }
    #armyGrenadeAchievementModal .army-ach-icon {font-size:40px;margin-bottom:8px}
    #armyGrenadeAchievementModal .army-ach-state {font-size:12px;color:#e5cb8c;font-weight:850}
    #armyGrenadeAchievementModal h3 {font-size:23px;line-height:1.28;margin:10px 0}
    #armyGrenadeAchievementModal p {font-size:14px;line-height:1.7;color:#d0dbca;margin:12px 0 23px}
    #armyGrenadeAchievementClose {
      width:100%;min-height:49px; border-radius:12px;
      background:#e2c481;color:#14291c;
      font:900 16px system-ui,-apple-system,sans-serif;
      border:0;touch-action:manipulation;cursor:pointer;
    }
  `;
  doc.head.appendChild(style);

  const exit = doc.createElement('button');
  exit.id = 'armyGrenadeGalleryExit';
  exit.type = 'button';
  exit.textContent = '✕ 關閉';
  exit.setAttribute('aria-label','關閉手榴彈成就圖鑑');
  gallery.insertBefore(exit, gallery.firstChild);

  const modal = doc.createElement('div');
  modal.id = 'armyGrenadeAchievementModal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','armyGrenadeAchievementName');
  modal.innerHTML = `<div class="army-ach-card">
    <div class="army-ach-icon" id="armyGrenadeAchievementIcon">🏅</div>
    <div class="army-ach-state" id="armyGrenadeAchievementState"></div>
    <h3 id="armyGrenadeAchievementName"></h3>
    <p id="armyGrenadeAchievementDesc"></p>
    <button type="button" id="armyGrenadeAchievementClose">返回成就圖鑑</button>
  </div>`;
  doc.body.appendChild(modal);
  const closeDetails = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  };
  closeDetails();
  const openDetails = card => {
    const unlocked = !card.classList.contains('locked');
    const name = card.querySelector('strong')?.textContent?.trim() || '未知成就';
    const description = card.querySelector('p')?.textContent?.trim() || '尚無說明';
    doc.getElementById('armyGrenadeAchievementIcon').textContent = unlocked?'🏅':'🔒';
    doc.getElementById('armyGrenadeAchievementState').textContent = unlocked?'已解鎖的軍旅成就':'尚未解鎖';
    doc.getElementById('armyGrenadeAchievementName').textContent = name;
    doc.getElementById('armyGrenadeAchievementDesc').textContent = description;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    doc.getElementById('armyGrenadeAchievementClose')?.focus({preventScroll:true});
  };
  doc.getElementById('armyGrenadeAchievementClose').addEventListener('click',closeDetails);
  modal.addEventListener('click',e=>{if(e.target===modal)closeDetails()});
  exit.addEventListener('click',()=>{
    closeDetails(); gallery.classList.remove('show');
    doc.getElementById('intro')?.setAttribute('aria-hidden','false');
  });
  doc.addEventListener('keydown',e=>{
    if(e.key==='Escape' && modal.classList.contains('open')) {e.stopPropagation();closeDetails()}
  },{capture:true});

  function upgradeCards(){
    for(const card of [...grid.children]){
      if(!card.classList.contains('galCard') || card.tagName==='BUTTON')continue;
      const btn=doc.createElement('button');
      btn.type='button';
      btn.className=card.className;
      btn.innerHTML=card.innerHTML;
      btn.setAttribute('aria-label','查看成就：'+(card.querySelector('strong')?.textContent?.trim()||'尚未解鎖'));
      card.replaceWith(btn);
    }
  }
  // Original game's showGallery() recreates the card HTML on every open.
  // Re-upgrade after each rebuild without changing its 18 achievements or unlocks.
  const observer=new host.MutationObserver(upgradeCards);
  observer.observe(grid,{childList:true});
  upgradeCards();
  grid.addEventListener('click',e=>{
    const card=e.target.closest?.('.galCard');
    if(!card||!grid.contains(card))return;
    e.stopPropagation();
    openDetails(card);
  });
  new host.MutationObserver(()=>{if(!gallery.classList.contains('show'))closeDetails()})
    .observe(gallery,{attributes:true,attributeFilter:['class']});

  host.__armyGrenadeGalleryFix322 = {upgradeCards,closeDetails};
})();
