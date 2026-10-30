/* ARMY3 v1.44: old shooting playtest entrance retired from main game.
 * The standalone shooting-paper-range.html is still available by direct URL.
 * Both injected buttons were created by this module, not by index.html.
 */
(()=>{'use strict';
  if(window.__armyShootingLauncher100)return;
  window.__armyShootingLauncher100=true;
  const remove=()=>{
    document.getElementById('armyShootHomeTest')?.remove();
    document.getElementById('armyShootCampTest')?.remove();
    document.getElementById('armyShootingFrame')?.remove();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',remove,{once:true});
  else remove();
})();
