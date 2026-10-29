/* ARMY3 - shooting range playtest launcher, without disturbing camp portals. */
(()=>{'use strict';
if(window.__armyShootingLauncher100)return;window.__armyShootingLauncher100=true;
const css=document.createElement('style');css.textContent=`
#armyShootHomeTest,#armyShootCampTest{background:linear-gradient(140deg,#f2d68a,#dba95a);color:#26321e;font-weight:900;border:1px solid #fff1b1;border-radius:13px;min-height:44px;padding:9px 13px;font:900 14px system-ui,-apple-system,sans-serif;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
#armyShootHomeTest{width:100%;margin:12px 0 4px}
#armyShootCampTest{display:none;position:fixed;top:calc(49% + env(safe-area-inset-top)/2);right:8px;z-index:11;padding:8px 10px;max-width:93px;box-shadow:0 4px 12px #001a0c70;font-size:12px;opacity:.91}
body.army-ready:not(.army-in-minigame) #armyShootCampTest{display:block}
#armyShootingFrame{position:fixed;inset:0;width:100%;height:100%;height:100dvh;border:0;z-index:3000;background:#142d22}
`;document.head.append(css);
let frame=null;
function open(){if(frame||document.querySelector('#fatal:not([hidden])'))return;
 const el=document.createElement('iframe');el.id='armyShootingFrame';el.title='國軍射擊鑑測 · 第一人稱打靶';el.setAttribute('allow','autoplay');el.src=new URL('../../shooting-range.html?fromCamp=1',import.meta.url).href;
 frame=el;document.body.classList.add('army-in-minigame');window.armyMinigameActive=true;document.body.append(el);el.focus();
}
function close(){if(!frame)return;frame.remove();frame=null;document.body.classList.remove('army-in-minigame');window.armyMinigameActive=false;}
window.addEventListener('message',e=>{if(frame&&e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='ARMY3_SHOOTING_RETURN')close()});
function mount(){if(!document.getElementById('armyShootHomeTest')){const host=document.querySelector('.army-home__panel'),start=document.getElementById('armyStart');if(host&&start){const b=document.createElement('button');b.id='armyShootHomeTest';b.type='button';b.textContent='🎯 試玩打靶小遊戲（第一版）';start.insertAdjacentElement('afterend',b);b.addEventListener('click',open)}}
 if(!document.getElementById('armyShootCampTest')){const b=document.createElement('button');b.type='button';b.id='armyShootCampTest';b.textContent='🎯 打靶試玩';b.setAttribute('aria-label','試玩第一人稱打靶');b.addEventListener('click',open);document.body.append(b)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
