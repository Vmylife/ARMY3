// ARMY3 final-battle talent runtime & in-lab selector. Never changes the
// official trait awards, honor wallet or any other minigame.
import {TRAITS,GROUPS} from './traitCatalog.js?v=1';
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
  this.gunLockUntil=0;this.switchUntil=0;this.bonusShots=0;
  this.waitRelease=false;this.secondPressReady=false;this.grenadeAt=0;
  this.events=[];this.ricochetQueue=[];this.focus=null;this.splitting=false;this.reflecting=false;
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
  if(this.lastWeapon!==combat.weapon){
   this.lastWeapon=combat.weapon;this.switchUntil=combat.time+2;
   if(combat.weapon!=='fists'){
    this.bonusShots=this.level('極限手速');
    const risk=[0,.15,.25,.35][this.level('推播轟炸')];
    if(Math.random()<risk){this.gunLockUntil=Math.max(this.gunLockUntil,combat.time+1.2);this.message('推播轟炸：暫時無法射擊')}
   }
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
  const badge=$('battleTalentStatus'),btn=$('battleGrenade');
  if(badge){
   const items=['天賦 '+this.count()];
   if(this.level('已讀不回'))items.push('護盾 '+this.shield+'/2');
   if(this.invincibleUntil>combat.time)items.push('免死 '+Math.ceil(this.invincibleUntil-combat.time)+'s');
   if(this.gunLockUntil>combat.time)items.push('卡彈');
   badge.textContent=this.count()?items.join(' · '):'';
  }
  if(btn&&!btn.hidden){
   const left=Math.max(0,this.grenadeAt-combat.time);
   btn.textContent=left>0?'榴彈 '+Math.ceil(left)+'s':'榴彈';
   btn.disabled=left>0||combat.gameOver||!combat.running;
  }
 }
 beforeAttack(combat){
  if(combat.weapon==='fists'){
   if(combat.time<this.gloveUntil){this.message('手套破洞：拳頭短暫失效');return false}
   return true;
  }
  if(combat.time<this.gunLockUntil){this.message('射擊受阻');return false}
  if(this.waitRelease)return false;
  if(this.secondPressReady){this.secondPressReady=false;return true}
  const tie=[0,.08,.16,.24][this.level('拇指打結')];
  if(Math.random()<tie){
   this.waitRelease=true;this.message('拇指打結！放開再按一次');return false;
  }
  if(this.level('卡彈之王')&&Math.random()<.08){
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
  if(!bullet)return;
  const step=bullet.damage;
  if(combat.time<this.switchUntil)
   bullet.damage*=1-this.level('被角纏腳')*.1;
  const blank=[0,.08,.15,.22][this.level('空包彈專家')];
  if(Math.random()<blank){bullet.damage=0;bullet.blank=true;this.message('空包彈！')}
  const off=[0,.10,.20,.30][this.level('描邊大師')];
  if(Math.random()<off){
   const heading=Math.atan2(bullet.dx,bullet.dz)+(Math.random()<.5?-1:1)*.65;
   this.pointBullet(bullet,heading);bullet.targetId=null;
  }else{
   const wrong=[0,.10,.20,.30][this.level('滑錯邊')];
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
  if(this.bonusShots>0){
   const count=this.bonusShots;this.bonusShots=0;
   const heading=Math.atan2(bullet.dx,bullet.dz);
   for(let i=0;i<count;i++){
    const clone={...bullet,id:combat.seq++,range:bullet.range,
     angle:heading+(i-(count-1)/2)*.035};
    this.pointBullet(clone,clone.angle);
    combat.bullets.push(clone);
   }
   this.message('極限手速：追加 '+count+' 發');
  }
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
    damage:Math.max(1,b.damage*.77),targetId:target.id,range:Math.min(22,b.range)};
  this.pointBullet(bullet,heading);
  // Parent bullet update replaces its active array at frame end; queue the
  // ricochet until that update is complete to avoid silently losing it.
  this.ricochetQueue.push(bullet);
 }
 flushRicochets(combat){
  if(this.ricochetQueue.length)combat.bullets.push(...this.ricochetQueue.splice(0));
 }
 splitHit(combat,first,base){
  const maxTargets=this.level('分裂子彈')+1;
  if(maxTargets<=1||this.splitting||!first||first.combatDead&&base<=0)return;
  this.splitting=true;
  try{
   const used=new Set([first.id]);let origin=first.pos;
   for(let i=1;i<maxTargets;i++){
    const target=combat.enemies.filter(n=>!n.combatDead&&!n.incoming&&!used.has(n.id)&&
      dist(n.pos,origin)<=5.5&&combat.shotLineClear(origin,n.pos,.1))
      .sort((a,b)=>dist(a.pos,origin)-dist(b.pos,origin))[0];
    if(!target)break;
    used.add(target.id);origin=target.pos;
    combat.damageNPC(target,Math.max(1,Math.round(base*Math.pow(.72,i))),'bullet');
   }
  }finally{this.splitting=false}
 }
 onKill(combat){
  const n=this.level('彈簧棉被');
  if(n&&combat.kills%5===0&&this.healedWave!==combat.wave){
   this.healedWave=combat.wave;
   const old=combat.hp;combat.hp=Math.min(100,combat.hp+[0,3,5,8][n]);
   if(combat.hp>old){combat.refreshHUD(true);this.message('彈簧棉被：恢復 '+Math.ceil(combat.hp-old)+' HP')}
  }
 }
 punchDamage(combat,damage){
  return this.level('起床氣')&&combat.hp<40
   ?damage*(1+this.level('起床氣')*.1):damage;
 }
 pullTarget(combat,target){
  const p=[0,.10,.20,.30][this.level('拔錯根')];
  if(!p||Math.random()>=p||target.combatDead)return;
  const a=combat.player.pos,d=dist(a,target.pos);
  if(d<.85)return;
  const amount=Math.min(.85,d-.85);
  const next=combat.moveTalentEnemy(target,(a.x-target.pos.x)/d*amount,
    (a.z-target.pos.z)/d*amount);
  target.pos=next;
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
    this.message('反彈訊息！');
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
   if(e.kind==='main'&&Math.random()<([0,.08,.16,.24][this.level('啞彈大師')])){
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
