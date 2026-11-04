// ARMY3 Fight Lab V2 — expanded open yard, 4 independent recruits and group retaliation.
// Damage threshold is cumulative SINCE the last knockdown: 30 normal damage,
/// then the NEXT hit launches the victim. Never touches camp NPCs.
export const ATTACKS=Object.freeze({
 punch:{length:.72,hit:.29,damage:10,reach:1.93,push:1.35,freeze:.059},
 counter:{length:.80,hit:.33,damage:9,reach:1.90,push:1.28,freeze:.055}
});
export const LAUNCH_AFTER_DAMAGE=30;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const createFighter=(id,x,z)=>({id,x,z,angle:id==='player'?Math.PI/2:-Math.PI/2,hp:100,
 state:'idle',attack:null,stun:0,down:0,rise:0,cd:0,moveSpeed:0,
 pushX:0,pushZ:0,lean:0,chain:0,chainAt:-99,damageSinceFall:0,
 impactAnim:'Hit_Reaction',fallen:false});
export class FightEngine{
 constructor(){this.reset()}
 reset(){
  this.player=createFighter('player',0,0);
  this.enemy=createFighter('enemy',1.65,0);
  this.allies=[createFighter('ally1',5.8,-3.6),createFighter('ally2',6.7,3.5),createFighter('ally3',-5.5,6.2)];
  this.opponents=[this.enemy,...this.allies];
  this.opponents.forEach((f,i)=>{f.aiIndex=i;f.cd=1.0+i*.3});
  this.time=0;this.freeze=0;this.aggressive=false;this.reinforcements=false;this.alertAt=Infinity;
  this.difficulty='normal';this.aiEnabled=true;this.winner=null;
  this.hits=0;this.enemyHits=0;this.events=[];
 }
 emit(kind,payload={}){this.events.push({kind,...payload})}
 drain(){return this.events.splice(0)}
 face(a,b){a.angle=Math.atan2(b.x-a.x,b.z-b.z)}
 enableAI(on){this.aiEnabled=Boolean(on);
  if(!on)for(const f of this.opponents){f.attack=null;if(f.state==='attack')f.state='idle'}
 }
 attack(){
  const p=this.player;
  if(this.winner||p.attack||p.stun>0||p.cd>0||['down','rise'].includes(p.state))return false;
  // No lock-on. Punch travels in the direction the player was freely walking.
  p.attack={type:'punch',clock:0,fired:false};p.state='attack';p.cd=ATTACKS.punch.length+.07;
  this.emit('swing',{who:'player',type:'punch'});return true;
 }
 impact(a,b,type){
  const def=ATTACKS[type],d=distance(a,b);
  const fx=Math.sin(a.angle),fz=Math.cos(a.angle);
  const face=((b.x-a.x)*fx+(b.z-a.z)*fz)/Math.max(.01,d);
  if(d>def.reach||face<.27||b.hp<=0||['down','rise'].includes(b.state)){
   this.emit('miss',{who:a.id,type});return false;
  }
  b.hp=Math.max(0,b.hp-def.damage);b.damageSinceFall+=def.damage;
  b.chain=this.time-b.chainAt<2.5?b.chain+1:1;b.chainAt=this.time;
  b.attack=null;b.stun=.62;b.lean=-.35;b.state='hit';b.impactAnim='Hit_Reaction';
  const ko=b.hp<=0,down=ko||(b.damageSinceFall>LAUNCH_AFTER_DAMAGE);
  if(down){
   b.damageSinceFall=0;b.state='down';b.down=ko?5:2.0;b.stun=0;b.lean=0;b.fallen=true;
  }
  const push=down?4.6:def.push;
  b.pushX=fx*push;b.pushZ=fz*push;
  if(a.id==='player'){
   this.hits++;this.aggressive=true;
   if(this.alertAt===Infinity){this.alertAt=this.time+.70;this.emit('alarm',{who:b.id})}
  }else this.enemyHits++;
  this.freeze=Math.max(this.freeze,def.freeze);
  this.emit('hit',{who:a.id,target:b.id,type,damage:def.damage,down,ko,chain:b.chain,
   health:b.hp,damageSinceFall:b.damageSinceFall,at:{x:b.x,z:b.z}});
  if(down)this.emit('down',{who:b.id,ko});
  if(ko&&a.id!=='player'){this.winner='opponents';this.emit('finished',{winner:'opponents'})}
  if(ko&&a.id==='player'&&this.opponents.every(f=>f.hp<=0)){
   this.winner='player';this.emit('finished',{winner:'player'});
  }
  return true;
 }
 attackCollision(a){
  if(a.id!=='player'){this.impact(a,this.player,'counter');return}
  const def=ATTACKS.punch,fx=Math.sin(a.angle),fz=Math.cos(a.angle);
  // Nearest eligible target in the active punching arc; does not change facing.
  const eligible=this.opponents
   .filter(b=>b.hp>0&&!['down','rise'].includes(b.state))
   .map(b=>({b,d:distance(a,b)})).sort((l,r)=>l.d-r.d);
  for(const {b,d} of eligible){
   const dot=((b.x-a.x)*fx+(b.z-a.z)*fz)/Math.max(.01,d);
   if(d<=def.reach&&dot>=.27){this.impact(a,b,'punch');return}
  }
  this.emit('miss',{who:'player',type:'punch'});
 }
 updateFighter(a,dt){
  a.cd=Math.max(0,a.cd-dt);
  if(a.state==='down'){
   a.down=Math.max(0,a.down-dt);
   if(a.down===0&&a.hp>0){a.rise=1.70;a.state='rise';this.emit('rise',{who:a.id})}
  }else if(a.state==='rise'){
   a.rise=Math.max(0,a.rise-dt);
   if(a.rise===0){a.state='idle';a.lean=0;a.fallen=false}
  }else if(a.attack){
   a.attack.clock+=dt;const def=ATTACKS[a.attack.type];
   if(!a.attack.fired&&a.attack.clock>=def.hit){a.attack.fired=true;this.attackCollision(a)}
   if(a.attack&&a.attack.clock>=def.length){a.attack=null;a.state='idle'}
  }else if(a.stun>0){
   a.stun=Math.max(0,a.stun-dt);a.lean+=(0-a.lean)*Math.min(1,dt*6);
   if(a.stun===0&&a.state==='hit')a.state='idle';
  }
  if(Math.abs(a.pushX)+Math.abs(a.pushZ)>.002){
   a.x+=a.pushX*dt;a.z+=a.pushZ*dt;
   a.pushX*=Math.exp(-8.1*dt);a.pushZ*=Math.exp(-8.1*dt);
  }
  if(a.state!=='hit')a.lean+=(0-a.lean)*Math.min(1,dt*8);
 }
 think(dt){
  if(!this.aiEnabled||!this.aggressive||this.winner)return;
  for(const foe of this.opponents){
   if(foe.hp<=0||foe.stun>0||foe.attack||['down','rise','hit'].includes(foe.state))continue;
   if(foe!==this.enemy&&!this.reinforcements)continue;
   const p=this.player;this.face(foe,p);const d=distance(foe,p);
   const desired=1.28+foe.aiIndex*.10;
   if(d>desired+.16){
    foe.state='walk';
    const speed=this.difficulty==='hard'?3.10:2.60;
    const step=Math.min(speed*dt,d-desired);
    foe.x+=(p.x-foe.x)/d*step;foe.z+=(p.z-foe.z)/d*step;foe.moveSpeed=speed;
   }else{foe.state='idle';foe.moveSpeed=0}
   if(d<=1.86&&foe.cd<=0&&p.hp>0&&!['down','rise'].includes(p.state)){
    foe.attack={type:'counter',clock:0,fired:false};foe.state='attack';
    foe.cd=(this.difficulty==='hard'?1.35:2.10)+foe.aiIndex*.19;
    this.emit('swing',{who:foe.id,type:'counter'});
   }
  }
 }
 step(dt,input={x:0,z:0}){
  dt=clamp(Number(dt)||0,0,.06);if(!dt)return;
  this.time+=dt;
  if(this.freeze>0){this.freeze=Math.max(0,this.freeze-dt);return}
  const p=this.player;this.updateFighter(p,dt);
  for(const foe of this.opponents)this.updateFighter(foe,dt);
  if(this.winner)return;
  if(!p.attack&&p.stun<=0&&!['down','rise','hit'].includes(p.state)){
   const x=Number(input.x)||0,z=Number(input.z)||0,d=Math.hypot(x,z);
   if(d>.06){
    const speed=clamp(Number(input.speed)||2.55,0,8.3),mx=x/d,mz=z/d;
    p.x+=mx*Math.min(1,d)*speed*dt;p.z+=mz*Math.min(1,d)*speed*dt;
    const aim=Math.atan2(mx,mz),turn=Math.atan2(Math.sin(aim-p.angle),Math.cos(aim-p.angle));
    p.angle+=turn*Math.min(1,dt*13.2);p.moveSpeed=speed;p.state='walk';
   }else if(p.state==='walk'){p.moveSpeed=0;p.state='idle'}
  }
  if(!this.reinforcements&&this.time>=this.alertAt){
   this.reinforcements=true;this.emit('reinforcements',{count:this.allies.length});
  }
  this.think(dt);
  for(const a of [p,...this.opponents]){a.x=clamp(a.x,-15.6,15.6);a.z=clamp(a.z,-11.4,11.4)}
  // Keep 4 attackers from blending into one another; crowd surrounds, not stacks.
  const bodies=[p,...this.opponents];
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   const a=bodies[i],b=bodies[j];if(a.hp<=0||b.hp<=0)continue;
   const d=distance(a,b);
   if(d<.88&&d>.001){
    const x=(b.x-a.x)/d,z=(b.z-a.z)/d,push=(.88-d)/2;
    a.x-=x*push;a.z-=z*push;b.x+=x*push;b.z+=z*push;
   }
  }
 }
 get status(){return{playerHP:this.player.hp,enemyHP:this.enemy.hp,
  playerState:this.player.state,enemyState:this.enemy.state,aggressive:this.aggressive,
  reinforcements:this.reinforcements,allies:this.allies.map(a=>({id:a.id,hp:a.hp,state:a.state,x:a.x,z:a.z})),
  aiEnabled:this.aiEnabled,hits:this.hits,enemyHits:this.enemyHits,winner:this.winner,freeze:this.freeze}}
}