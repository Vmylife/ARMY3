// ARMY3 map display v0.8.0 — edge-to-edge camp plan, tightened margins, no empty bottom panel.
// The shared 3D camp and the radar minimap are not changed.
import {CAMP} from '../map/camp.js?v=093';
import {drawCampMap} from '../map/mapDrawing.js?v=093';

export const FULL_MAP_YAW = Math.PI;

// Scoped style overrides are loaded with this module, leaving the other game HUD intact.
const styles = document.createElement('style');
styles.textContent = `
#worldMap.world-map { padding: max(6px,env(safe-area-inset-top)) max(5px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left)); }
#worldMap .world-map-panel { width:min(calc(100vw - 10px),860px)!important; height:auto!important; max-height:calc(100dvh - 16px); border-radius:17px; }
#worldMap .world-map-header { padding:9px 11px 7px; gap:7px; }
#worldMap .world-map-header strong { font-size:17px; }
#worldMap .world-map-header small { font-size:10px; }
#worldMap #closeWorldMap { width:39px; height:39px; font-size:21px; }
#worldMap .world-map-body { display:block!important; flex:none!important; margin:0 5px 5px!important; border-radius:9px; }
#worldMap .map-canvas-holder { width:100%!important; height:auto!important; max-height:none!important; max-width:100%!important; aspect-ratio:1.48!important; flex:none!important; border-radius:9px; background:#e9e6d6; }
#worldMap #worldMapCanvas { width:100%; height:100%; display:block; }
#worldMap .army-map-compass { position:absolute; right:7px; top:6px; z-index:1; display:flex; flex-direction:column; align-items:center; color:#21523e; font:900 13px/1 system-ui,sans-serif; text-shadow:0 1px 2px #f9f7ee; pointer-events:none; }
#worldMap .army-map-compass span { font-size:19px; line-height:1.1; }
@media (orientation:landscape) {
 #worldMap .world-map-panel { width:min(96vw,1000px,calc((100dvh - 72px)*1.745))!important; }
 #worldMap .world-map-header { padding:5px 10px; }
 #worldMap .map-canvas-holder { aspect-ratio:96/55!important; }
}
`;
document.head.append(styles);

const compass = document.createElement('div');
compass.className='army-map-compass';
compass.setAttribute('aria-hidden','true');
compass.innerHTML='N<span>↑</span>';
document.querySelector('#worldMap .map-canvas-holder')?.append(compass);

function render(canvas,player,enemy,actorAngle){
 const ctx=canvas.getContext('2d'); if(!ctx)return;
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 const dpr=Math.min(2,devicePixelRatio||1);
 canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 // The actual camp drawing occupied only the center of a wide, padded canvas.
 // Zoom the complete map in place without changing game coordinates or the player's arrow.
 const zoom=window.matchMedia('(orientation: landscape)').matches?1.12:1.24;
 ctx.save();
 ctx.translate(w/2,h/2);
 ctx.scale(zoom,zoom);
 ctx.translate(-w/2,-h/2);
 const heading=Math.PI-actorAngle+FULL_MAP_YAW;
 drawCampMap(ctx,{width:w,height:h,player,enemy,heading,mini:false,cameraYaw:FULL_MAP_YAW});
 ctx.restore();
}

export function initWorldMap(){
 const small=document.getElementById('minimap'),dialog=document.getElementById('worldMap');
 const close=document.getElementById('closeWorldMap'),canvas=document.getElementById('worldMapCanvas');
 let player={...CAMP.spawn},enemy=null,actorAngle=0;
 const isOpen=()=>!dialog.hidden;
 const paint=()=>{if(isOpen())render(canvas,player,enemy,actorAngle)};
 const open=()=>{
  if(isOpen())return;
  window.dispatchEvent(new Event('army-map-open'));
  dialog.hidden=false;small.setAttribute('aria-expanded','true');
  requestAnimationFrame(paint);close.focus({preventScroll:true});
 };
 const hide=()=>{
  if(!isOpen())return;
  dialog.hidden=true;small.setAttribute('aria-expanded','false');
  small.focus({preventScroll:true});
 };
 small.setAttribute('aria-expanded','false');
 small.addEventListener('click',open);close.addEventListener('click',hide);
 dialog.addEventListener('click',e=>{if(e.target===dialog)hide()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen()){e.preventDefault();hide()}});
 window.addEventListener('resize',paint);
 return {isOpen,update(pos,foe,angle){player={...pos};enemy=foe?{...foe}:null;actorAngle=angle;if(isOpen())paint()},open,close:hide};
}
