// Standalone final-battle weapon lab. Specs mirror armyProgression.js exactly.
export const WEAPON_LEVELS={
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
const STORAGE_KEY='ARMY3_battle_test_weapon_levels_v1';
const $=id=>document.getElementById(id);
const sane=n=>Math.max(1,Math.min(5,Math.trunc(Number(n)||5)));
function stored(){
 try{
  const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
  return {pistol:sane(v.pistol),rifle:sane(v.rifle)};
 }catch{return {pistol:5,rifle:5}}
}
export class BattleWeaponLevels{
 constructor(){this.levels=stored();this.combat=null;this.onSelect=null}
 level(gun){return this.levels[gun]||0}
 stats(gun){return WEAPON_LEVELS[gun]?.[this.level(gun)-1]||null}
 attach(combat){
  this.combat=combat;
  for(const gun of ['pistol','rifle'])
   combat.perks?.setMagazine(gun,this.stats(gun).mag);
 }
 setLevel(gun,level){
  if(!WEAPON_LEVELS[gun])return;
  const next=sane(level);
  if(this.levels[gun]===next)return;
  this.levels[gun]=next;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.levels))}catch{}
  if(this.combat){
   this.combat.cancelRifleBurst?.();
   this.combat.perks?.setMagazine(gun,this.stats(gun).mag);
   this.combat.playerCooldown=0;
   this.combat.perks?.updateIndicator(this.combat);
   this.combat.refreshHUD?.(true);
  }
  this.onSelect?.(gun);
 }
}
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
export function initWeaponLab(){
 const api=new BattleWeaponLevels();
 window.armyBattleWeapons=api;
 const root=$('battleWeaponLab'),body=$('battleWeaponBody'),count=$('battleWeaponSummary');
 if(!root||!body)return api;
 body.append(el('p','bwl-intro','直接切換等級，即時套用原版素質。測試不扣勳章，也不影響正式進度。'));
 const sections={};
 for(const [gun,label] of [['pistol','手槍'],['rifle','步槍']]){
  const section=el('section','bwl-section'),line=el('div','bwl-head');
  line.append(el('strong','',label));
  const select=el('select');
  select.setAttribute('aria-label',label+'測試等級');
  for(let lv=1;lv<=5;lv++){
   const option=el('option','','Lv.'+lv);
   option.value=String(lv);select.append(option);
  }
  select.value=String(api.level(gun));line.append(select);
  const stats=el('div','bwl-stats');
  const refresh=()=>{
   const spec=api.stats(gun);
   stats.replaceChildren();
   for(const [key,val]of [['彈匣',spec.mag+' 發'],['傷害',String(spec.damage)],
    ['換彈',spec.reload+' 秒'],['射速',spec.interval+' 秒 / 發']]){
    const tile=el('div','bwl-metric');
    tile.append(el('small','',key),el('strong','',val));stats.append(tile);
   }
   stats.append(el('p','bwl-mode',spec.mode));
   select.value=String(api.level(gun));
   if(count)count.textContent='手槍 '+api.level('pistol')+' · 步槍 '+api.level('rifle');
  };
  select.addEventListener('change',()=>api.setLevel(gun,select.value));
  sections[gun]=refresh;section.append(line,stats);body.append(section);
 }
 api.onSelect=()=>{for(const refresh of Object.values(sections))refresh()};
 api.onSelect();
 root.addEventListener('toggle',()=>{
  if(root.open){
   const other=$('battleTalentLab');if(other)other.open=false;
  }
 });
 const other=$('battleTalentLab');
 other?.addEventListener('toggle',()=>{if(other.open)root.open=false});
 return api;
}
