// ARMY3 final-battle talent runtime & in-lab selector. Never changes the
// official trait awards, honor wallet or any other minigame.
import {TRAITS,GROUPS} from './traitCatalog.js?v=3';
import {insidePerimeter} from '../map/camp.js?v=093';
const KEY='ARMY3_battle_test_selected_traits_v1';
const $=id=>document.getElementById(id);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const TIERS=Object.fromEntries(TRAITS.map(t=>[t.name,t.effects]));
function readPrefs(){
 try{
  const v=JSON.parse(localStorage.getItem(KEY)||'{}');
  return Object.fromEntries(Object.entries(v).filter(([n,l])=>TIERS[n]&&[1,2,3].includes(l)));
 }catch{return {}}
}
export class BattlePerks{
 constructor(){
  this.values=readPrefs();this.combat=null;this.lastWeapon='';
  this.shield=0;this.shieldNext=0;this.rootSaved=-1;this.invincibleUntil=0;
  this.healedWave=-1;this.gloveCount=0;this.gloveUntil=0;
  this.gunLockUntil=0;this.reloadPenaltyUntil=0;
  // Independent real magazines. Reloading always costs time, even with
  // positive traits enabled; magic split projectiles cost one base round.
  this.capacity={pistol:12,rifle:30};this.ammo={pistol:12,rifle:30};
  this.reloadWeapon=null;this.reloadAt=0;this.bonusShots={pistol:0,rifle:0};
  this.waitRelease=false;this.secondPressReady=false;this.grenadeAt=0;
  this.events=[];this.ricochetQueue=[];this.focus=null;this.reflecting=false;
  this.flashAt=-10;this.announceUntil=0;
 }
 level(name){return this.values[name]||0}
 count(){return Object.keys(this.values).length}
 set(name,level){
  if(!TIERS[name])return;
  level=clamp(Math.trunc(Number(level)||0),0,3);
  if(level)this.values[name]=level;else delete this.values[name];
  try{localStorage.setItem(KEY,JSON.stringify(this.values))}catch{}
  if(name==='已讀不回'){this.shield=level?2:0;this.shieldNext=0}
  if(this.combat)this.updateIndicator(this.combat);
 }
 attach(combat){
  this.combat=combat;this.lastWeapon=combat.weapon;
  this.shield=this.level('已讀不回')?2:0;
  this.shieldNext=0;
  this.updateIndicator(combat);
 }
 setMagazine(gun,size){
  if(!['pistol','rifle'].includes(gun))return;
  const mag=Math.max(1,Math.trunc(size));
  this.capacity[gun]=mag;this.ammo[gun]=mag;
  // Level swaps replenish that gun for testing and cancel its old reload.
  if(this.reloadWeapon===gun){this.reloadWeapon=null;this.reloadAt=0}
  this.bonusShots[gun]=0;
  if(this.combat?.weapon===gun)this.reloadPenaltyUntil=0;
  if(this.combat)this.updateIndicator(this.combat);
 }
 message(msg){
  let el=$('battleTalentToast');
  if(!el)return;
  el.textContent=msg;el.hidden=false;
  clearTimeout(this.toastTimer);
  this.toastTimer=setTimeout(()=>{el.hidden=true},1150);
 }
 movementRate(clip){
  const slow=this.level('賴床王'),sprint=this.level('起床腿麻');
  const base=1-slow*.05;
  return base*(clip==='RunFast'?1-sprint*.08:1);
 }
 aimAngle(){return 7.5+this.level('穩如老狗')*10}
 fireRate(){return 1+this.level('全軍士氣高昂')*.20}
 allyDamage(d){return d*(1-this.level('班長的口令')*.15)}
 allyMuted(combat,ally,index){
  if(ally.talentJoinAt&&combat.time<ally.talentJoinAt)return true;
  const count=this.level('全員走音');
  if(count&&index<count&&combat.time%10<1.65)return true;
  return false;
 }
 wrongGoal(combat,ally){
  return ally.talentWrongGoal&&combat.time<ally.talentWrongUntil?ally.talentWrongGoal:null;
 }
 focusAlly(combat,ally,index){
  const limit=[0,1,3,5][this.level('精神答數！')];
  const target=this.focus;
  if(index>=limit||!target||target.combatDead||target.incoming||
   dist(ally.pos,target.pos)>24||!combat.shotLineClear(ally.pos,target.pos,.12))return null;
  return target;
 }
 onWave(combat){
  const wrong=this.level('聽錯口令'),late=this.level('忘詞王');
  for(const [i,a]of combat.allies.entries()){
   a.talentJoinAt=i<late?combat.time+3.2+(i%2)*.7:0;
   a.talentWrongGoal=null;a.talentWrongUntil=0;
   if(i<wrong){
    const home=a.pos,angles=[Math.PI*1.25,Math.PI*.7,-Math.PI*.5];
    for(const angle of angles){
     const candidate={x:home.x+Math.cos(angle)*4,z:home.z+Math.sin(angle)*4};
     if(combat.canTalentStand(candidate)){
      a.talentWrongGoal=candidate;a.talentWrongUntil=combat.time+5;break;
     }
    }
   }
  }
 }
 beforeFrame(combat){
  if(!this.combat)this.attach(combat);
  if(this.waitRelease&&!combat.attackPointer&&!combat.attackKeyboard){
   this.waitRelease=false;this.secondPressReady=true;
  }
  if(this.lastWeapon!==combat.weapon)this.lastWeapon=combat.weapon;
  if(this.reloadWeapon&&combat.time>=this.reloadAt){
   const gun=this.reloadWeapon;
   this.ammo[gun]=this.capacity[gun];this.reloadWeapon=null;
   // Penalty and bonus both start ONLY when a real reload finishes.
   this.reloadPenaltyUntil=combat.time+2;
   this.bonusShots[gun]=this.level('極限手速');
   const risk=[0,.25,.40,.55][this.level('推播轟炸')];
   if(Math.random()<risk){
    this.gunLockUntil=Math.max(this.gunLockUntil,combat.time+1.2);
    this.message('推播轟炸：換彈後卡住射擊');
   }else this.message('換彈完成：'+this.ammo[gun]+' 發');
  }
  const shieldLv=this.level('已讀不回');
  if(shieldLv&&this.shield<2){
   const interval=[0,15,10,6][shieldLv];
   if(!this.shieldNext)this.shieldNext=combat.time+interval;
   if(combat.time>=this.shieldNext){
    this.shield++;this.shieldNext=this.shield<2?combat.time+interval:0;
   }
  }
  this.processGrenades(combat);
  this.checkLandings(combat);
  this.updateIndicator(combat);
 }
 updateIndicator(combat){
  const badge=$('battleTalentStatus'),btn=$('battleGrenade'),reload=$('battleReload');
  const gun=combat.weapon,isGun=gun==='pistol'||gun==='rifle';
  if(badge){
   const items=[];
   if(isGun)items.push('彈匣 '+this.ammo[gun]+'/'+this.capacity[gun]);
   if(this.count())items.push('天賦 '+this.count());
   if(this.level('已讀不回'))items.push('護盾 '+this.shield+'/2');
   if(this.invincibleUntil>combat.time)items.push('免死 '+Math.ceil(this.invincibleUntil-combat.time)+'s');
   if(this.gunLockUntil>combat.time)items.push('卡彈');
   badge.textContent=items.join(' · ');
  }
  if(reload&&!reload.hidden){
   const waiting=this.reloadWeapon!==null;
   const remaining=Math.max(0,this.reloadAt-combat.time);
   reload.textContent=waiting?'換彈 '+remaining.toFixed(1)+'s':'換彈';
   reload.disabled=!isGun||waiting||this.ammo[gun]>=this.capacity[gun]||combat.gameOver||!combat.running;
  }
  if(btn&&!btn.hidden){
   const left=Math.max(0,this.grenadeAt-combat.time);
   btn.textContent=left>0?'榴彈 '+Math.ceil(left)+'s':'榴彈';
   btn.disabled=left>0||combat.gameOver||!combat.running;
  }
 }
 beginReload(combat,manual=false){
  const gun=combat.weapon;
  if(!['pistol','rifle'].includes(gun)||this.reloadWeapon||combat.gameOver||!combat.running)return false;
  if(this.ammo[gun]>=this.capacity[gun]){
   if(manual)this.message('彈匣已滿');return false;
  }
  this.reloadWeapon=gun;
  this.reloadAt=combat.time+(combat.weaponLab?.stats(gun)?.reload??(gun==='rifle'?1.6:1.3));
  this.message(gun==='rifle'?'更換步槍彈匣…':'更換手槍彈匣…');
  this.updateIndicator(combat);return true;
 }
 reload(combat){return this.beginReload(combat,true)}
 beforeAttack(combat){
  if(combat.weapon==='fists'){
   if(combat.time<this.gloveUntil){this.message('手套破洞：拳頭短暫失效');return false}
   return true;
  }
  if(this.reloadWeapon===combat.weapon){this.message('正在換彈');return false}
  if(this.ammo[combat.weapon]===0){
   this.beginReload(combat);return false;
  }
  if(combat.time<this.gunLockUntil){this.message('射擊受阻');return false}
  if(this.waitRelease)return false;
  if(this.secondPressReady){this.secondPressReady=false;return true}
  const tie=[0,.20,.35,.50][this.level('拇指打結')];
  if(Math.random()<tie){
   this.waitRelease=true;this.message('拇指打結！放開再按一次');return false;
  }
  const jam=[0,.15,.25,.35][this.level('卡彈之王')];
  if(jam&&Math.random()<jam){
   this.gunLockUntil=combat.time+2*this.level('卡彈之王');
   this.message('卡彈！'+2*this.level('卡彈之王')+' 秒');return false;
  }
  return true;
 }
 onPunch(){
  const level=this.level('手套破洞');
  if(!level)return;
  this.gloveCount++;
  if(this.gloveCount>=6-level){
   this.gloveCount=0;
   this.gloveUntil=this.combat.time+1.45;
   this.message('手套破洞：拳頭冷卻');
  }
 }
 onShot(combat,bullet){
  if(!bullet||!this.capacity[combat.weapon])return;
  const gun=combat.weapon;
  // A successful trigger ALWAYS uses one real cartridge.
  this.ammo[gun]=Math.max(0,this.ammo[gun]-1);
  bullet.reloadPenalty=combat.time<this.reloadPenaltyUntil
   ?1-[0,.20,.30,.50][this.level('被角纏腳')]:1;
  const blank=[0,.15,.30,.45][this.level('空包彈專家')];
  if(Math.random()<blank){bullet.damage=0;bullet.blank=true;this.message('空包彈！')}
  const off=[0,.20,.35,.50][this.level('描邊大師')];
  if(Math.random()<off){
   const heading=Math.atan2(bullet.dx,bullet.dz)+(Math.random()<.5?-1:1)*.65;
   this.pointBullet(bullet,heading);bullet.targetId=null;
  }else{
   const wrong=[0,.20,.35,.50][this.level('滑錯邊')];
   if(Math.random()<wrong){
    const pool=combat.enemies.filter(n=>!n.combatDead&&!n.incoming&&n.id!==bullet.targetId&&
      combat.shotLineClear(combat.player.pos,n.pos,.1)&&dist(combat.player.pos,n.pos)<25);
    if(pool.length){
     const target=pool[Math.floor(Math.random()*pool.length)];
     bullet.targetId=target.id;this.pointBullet(bullet,Math.atan2(target.pos.x-bullet.x,target.pos.z-bullet.z));
    }
   }
  }
  bullet.bounces=0;
  // Visible, real projectiles: one glowing branch per DIFFERENT opponent.
  // Unlike the former invisible instant-damage chain, these must actually fly
  // and hit, obeying walls, character collisions and projectile life cycles.
  if(!bullet.blank&&this.level('分裂子彈')){
   const original=bullet.targetId,used=new Set(original==null?[]:[original]);
   const candidates=combat.enemies.filter(n=>!n.combatDead&&!n.incoming&&!used.has(n.id)&&
    dist(combat.player.pos,n.pos)<=26&&combat.shotLineClear(combat.player.pos,n.pos,.10))
    .sort((a,b)=>{
     const aAngle=Math.atan2(a.pos.x-bullet.x,a.pos.z-bullet.z);
     const bAngle=Math.atan2(b.pos.x-bullet.x,b.pos.z-bullet.z);
     const heading=Math.atan2(bullet.dx,bullet.dz);
     const delta=a=>Math.abs(Math.atan2(Math.sin(a-heading),Math.cos(a-heading)));
     return delta(aAngle)-delta(bAngle)||dist(bullet,a.pos)-dist(bullet,b.pos);
    });
   let emitted=0;
   for(const target of candidates){
    if(emitted>=this.level('分裂子彈'))break;
    const heading=Math.atan2(target.pos.x-bullet.x,target.pos.z-bullet.z);
    const extra={...bullet,id:combat.seq++,targetId:target.id,splitTargetId:target.id,
     splitDepth:1,range:bullet.range,speed:36,
     damage:bullet.damage*Math.pow(.75,emitted+1)};
    extra.x+=Math.cos(heading)*(.10+emitted*.08);
    extra.z-=Math.sin(heading)*(.10+emitted*.08);
    this.pointBullet(extra,heading);
    combat.bullets.push(extra);used.add(target.id);emitted++;
   }
   if(emitted)this.message('分裂子彈：'+(emitted+1)+' 道彈線');
  }
  // Extreme quick hands consumes real additional cartridges, unlike splits.
  const extraCount=Math.min(this.bonusShots[gun],this.ammo[gun]);
  this.bonusShots[gun]=0;
  if(extraCount>0){
   const heading=Math.atan2(bullet.dx,bullet.dz);
   for(let i=0;i<extraCount;i++){
    const clone={...bullet,id:combat.seq++,targetId:bullet.targetId,
     splitDepth:0,splitTargetId:null};
    this.pointBullet(clone,heading+(i-(extraCount-1)/2)*.085);
    combat.bullets.push(clone);
    this.ammo[gun]--;
   }
   this.message('極限手速：追加 '+extraCount+' 發（耗彈）');
  }
  if(this.ammo[gun]===0)this.beginReload(combat);
  this.updateIndicator(combat);
 }
 pointBullet(b,angle){b.angle=angle;b.dx=Math.sin(angle);b.dz=Math.cos(angle)}
 onBlockedBullet(combat,b,impact){
  const limit=this.level('跳彈藝術家');
  if(!limit||(b.bounces||0)>=limit||b.blank)return;
  const targets=combat.enemies.filter(n=>!n.combatDead&&!n.incoming&&
   dist(impact,n.pos)<17&&combat.shotLineClear(impact,n.pos,.10))
   .sort((a,c)=>dist(a.pos,impact)-dist(c.pos,impact));
  if(!targets.length)return;
  const target=targets[0],heading=Math.atan2(target.pos.x-impact.x,target.pos.z-impact.z);
  const bullet={...b,id:combat.seq++,x:impact.x,z:impact.z,bounces:(b.bounces||0)+1,
    damage:Math.max(1,b.damage*.77),targetId:target.id,
    // A ricochet from a split bullet must update its exclusive target.
    splitTargetId:b.splitTargetId==null?null:target.id,
    range:Math.min(22,b.range)};
  this.pointBullet(bullet,heading);
  // Parent bullet update replaces its active array at frame end; queue the
  // ricochet until that update is complete to avoid silently losing it.
  this.ricochetQueue.push(bullet);
 }
 flushRicochets(combat){
  if(this.ricochetQueue.length)combat.bullets.push(...this.ricochetQueue.splice(0));
 }
 onKill(combat){
  const n=this.level('彈簧棉被');
  if(n&&combat.kills%5===0&&this.healedWave!==combat.wave){
   this.healedWave=combat.wave;
   const old=combat.hp;combat.hp=Math.min(100,combat.hp+[0,3,5,8][n]);
   if(combat.hp>old){combat.refreshHUD(true);this.message('彈簧棉被：恢復 '+Math.ceil(combat.hp-old)+' HP')}
  }
 }
 damageMultiplier(combat,kind,bullet=null){
  const rage=this.level('起床氣');
  let factor=rage&&combat.hp<40?1+rage*.10:1;
  const reloadPenalty=this.level('被角纏腳');
  if(reloadPenalty){
   const current=combat.time<this.reloadPenaltyUntil
    ?1-[0,.20,.30,.50][reloadPenalty]:1;
   // Bullet remembers its penalty at the instant of FIRING, not impact.
   factor*=kind==='bullet'&&bullet?.reloadPenalty!==undefined
    ?bullet.reloadPenalty:current;
  }
  return factor;
 }
 backfirePunch(combat){
  const level=this.level('拔錯根');
  if(!level||Math.random()>=[0,.20,.35,.50][level])return false;
  // Player suffers the hit instead of the intended red soldier.
  this.message('拔錯根！拳頭打到自己');
  combat.damagePlayer([0,6,9,12][level],'self');
  return true;
 }
 landed(combat,n){
  const lvl=this.level('力大無窮');
  if(!lvl)return;
  const radius=[0,1.5,3,4.5][lvl];
  this.explode(combat,n.pos,radius,13,'landing',n);
 }
 checkLandings(combat){
  if(!this.level('力大無窮'))return;
  for(const n of combat.enemies){
   if(n.combatDead||n.incoming||n.combatDown<=0||n.combatFall>.001||n.talentLandDone)continue;
   n.talentLandDone=true;this.landed(combat,n);
  }
 }
 damageToPlayer(combat,amount,kind){
  if(this.invincibleUntil>combat.time)return 0;
  // Failed punches are self-inflicted. They must not be reduced by the
  // ENEMY-only 金鐘罩 armor or absorbed by the incoming-bullet shield.
  if(kind==='self')return amount;
  const shieldLevel=this.level('已讀不回');
  if(shieldLevel&&this.shield>0){
   this.shield--;this.shieldNext=combat.time+[0,15,10,6][shieldLevel];
   this.message('已讀不回：護盾抵擋');return 0;
  }
  let d=amount*(1-[0,.08,.15,.22][this.level('金鐘罩')]);
  if(combat.hp<30)d*=1+this.level('吃土專家')*.1;
  const reflect=[0,.10,.20,.30][this.level('反彈訊息')];
  if(kind==='bullet'&&!this.reflecting&&Math.random()<reflect){
   const target=combat.enemies.filter(n=>!n.combatDead&&!n.incoming&&
    dist(n.pos,combat.player.pos)<20&&combat.shotLineClear(combat.player.pos,n.pos,.12))
    .sort((a,b)=>dist(a.pos,combat.player.pos)-dist(b.pos,combat.player.pos))[0];
   if(target){
    this.reflecting=true;
    try{combat.damageNPC(target,Math.max(1,Math.round(d)),'reflect')}
    finally{this.reflecting=false}
    this.message('反彈訊息：彈回敵軍！');
    return 0; // A truly reflected bullet no longer hurts the player.
   }
  }
  const level=this.level('雜草的根性');
  if(level&&d>=combat.hp&&this.rootSaved!==combat.wave){
   this.rootSaved=combat.wave;this.invincibleUntil=combat.time+level;
   combat.hp=1;combat.refreshHUD(true);this.message('雜草的根性：擋下致命傷');
   return 0;
  }
  return d;
 }
 useGrenade(combat){
  if(!combat.running||combat.gameOver||combat.time<this.grenadeAt)return false;
  this.grenadeAt=combat.time+12;
  const p=combat.player.pos,a=combat.player.angle,dx=Math.sin(a),dz=Math.cos(a);
  let land={...p};
  for(let d=.3;d<=7.2;d+=.2){
   const at={x:p.x+dx*d,z:p.z+dz*d};
   if(!insidePerimeter(at)||combat.shotClearance(at)<.20)break;
   land=at;
  }
  const bounce=this.level('彈力球'),fuse=this.level('保險絲太長');
  for(let i=0;i<bounce;i++){
   const theta=Math.random()*Math.PI*2,attempt={x:land.x+Math.cos(theta)*1.1,
    z:land.z+Math.sin(theta)*1.1};
   if(insidePerimeter(attempt)&&combat.shotClearance(attempt)>.2)land=attempt;
  }
  this.events.push({kind:'main',at:combat.time+.78+bounce*.22+fuse,pos:land});
  this.message('手榴彈投擲！');this.updateIndicator(combat);return true;
 }
 processGrenades(combat){
  if(!this.events.length)return;
  const due=this.events.filter(e=>e.at<=combat.time);
  this.events=this.events.filter(e=>e.at>combat.time);
  for(const e of due){
   if(e.kind==='main'&&Math.random()<([0,.20,.35,.50][this.level('啞彈大師')])){
    combat.spawnFx({...e.pos,y:1.2},'campHitBurst','啞彈',420);this.message('啞彈！');continue;
   }
   const area=1+[0,.25,.50,.80][this.level('爆炸藝術家')];
   const scale=e.kind==='main'?1:e.kind==='child'?.68:.83;
   this.explode(combat,e.pos,2.3*area*scale,e.kind==='main'?34:e.kind==='child'?16:21,e.kind);
   if(e.kind==='main'){
    const pieces=this.level('子母手榴彈')?this.level('子母手榴彈')+1:0;
    for(let i=0;i<pieces;i++){
     const angle=(i/pieces)*Math.PI*2,at={x:e.pos.x+Math.cos(angle)*2.25,
      z:e.pos.z+Math.sin(angle)*2.25};
     if(insidePerimeter(at)&&combat.shotClearance(at)>.2)
      this.events.push({kind:'child',pos:at,at:combat.time+.30+i*.10});
    }
    for(let i=0;i<this.level('連環爆炸');i++)
     this.events.push({kind:'chain',pos:e.pos,at:combat.time+(i+1)*.42});
   }
  }
 }
 explode(combat,pos,radius,damage,label,excluded=null){
  combat.spawnFx({...pos,y:1.3},'campHitBurst heavy',label==='landing'?'震地！':'轟！',440);
  for(const n of combat.enemies){
   if(n===excluded||n.combatDead||n.incoming||dist(n.pos,pos)>radius||
     !combat.shotLineClear(pos,n.pos,.10))continue;
   combat.damageNPC(n,damage,'blast');
  }
 }
}
export function initTalentLab(){
 const perks=new BattlePerks();
 window.armyBattleTalents=perks;
 const root=$('battleTalentLab'),count=$('battleTalentCount'),inner=$('battleTalentBody');
 if(!root||!inner)return perks;
 function countText(){if(count)count.textContent=perks.count()+' / 36'}
 function make(tag,cls,value){
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;return el;
 }
 const toolbar=make('div','btl-headrow');
 toolbar.append(make('strong','', '自由搭配 · 正負皆可同時啟用'));
 const clear=make('button','','全部清除');clear.type='button';
 toolbar.append(clear);inner.append(toolbar);
 inner.append(make('p','btl-hint','選擇 Lv.1～Lv.3 即時生效。開啟選單時戰鬥暫停；只影響實驗室，不扣勳章。'));
 const selects=[];
 for(const [id,label] of GROUPS){
  const group=make('details','btl-group'),summary=make('summary','',label);
  group.append(summary);
  for(const trait of TRAITS.filter(t=>t.kind===id)){
   const row=make('div','btl-item');
   const info=make('div','');
   const name=make('span','btl-name '+(trait.positive?'btl-positive':'btl-negative'),
    (trait.positive?'＋ ':'－ ')+trait.name);
   const desc=make('small','btl-desc','');
   info.append(name,desc);
   const select=make('select');
   select.setAttribute('aria-label',trait.name+'天賦等級');
   for(let level=0;level<=3;level++){
    const option=make('option','',level?'Lv.'+level:'關閉');
    option.value=String(level);select.append(option);
   }
   const refresh=()=>{
    const level=Number(select.value)||0;
    row.classList.toggle('btl-selected',!!level);
    desc.textContent=trait.effects[level?level-1:0]+(level?'':'（未啟用）');
   };
   select.value=String(perks.level(trait.name));
   select.addEventListener('change',()=>{
    perks.set(trait.name,Number(select.value));refresh();countText();
   });
   refresh();row.append(info,select);group.append(row);selects.push({trait,select,refresh});
  }
  inner.append(group);
 }
 clear.addEventListener('click',()=>{
  for(const s of selects){perks.set(s.trait.name,0);s.select.value='0';s.refresh()}
  countText();
 });
 countText();
 return perks;
}
