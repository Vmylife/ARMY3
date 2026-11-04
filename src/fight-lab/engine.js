// ARMY3 / Duel test engine. Isolated from all camp NPCs and training routines.
export const ATTACKS={
 jab:{length:.62,hit:.265,damage:12,reach:1.9,push:1.55,freeze:.055},
 heavy:{length:.98,hit:.405,damage:27,reach:2.08,push:3.4,freeze:.085},
 counter:{length:.78,hit:.32,damage:10,reach:1.94,push:1.4,freeze:.055}
};
const minmax=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function fighter(id,x){
 return{id,x,z:0,angle:id==='player'?Math.PI/2:-Math.PI/2,hp:100,
 state:'idle',attack:null,stun:0,down:0,rise:0,cd:0,
 pushX:0,pushZ:0,lean:0,chain:0,chainAt:-99};
}
export class FightEngine{
 constructor(){this.reset()}
 reset(){
  this.player=fighter('player',-.88);this.enemy=fighter('enemy',.88);
  this.time=0;this.freeze=0;this.aggressive=false;this.difficulty='normal';
  this.aiEnabled=true;this.winner=null;this.hits=0;this.enemyHits=0;this.events=[];
 }
 emit(type,payload={}){this.events.push({kind:type,...payload})}
 drain(){return this.events.splice(0)}
 face(a,b){a.angle=Math.atan2(b.x-a.x,b.z-a.z)}
 enableAI(on){this.aiEnabled=!!on;if(!on){this.enemy.attack=null;this.enemy.state='idle'}}
 attack(type='jab'){
  const p=this.player;
  if(this.winner||!['jab','heavy'].includes(type)||p.attack||p.stun>0||p.cd>0||['down','rise'].includes(p.state))return false;
  // A free-roaming player punches in their actual facing direction; never snap to a target.
  p.attack={type,clock:0,fired:false};p.state='attack';
  p.cd=ATTACKS[type].length+.12;this.emit('swing',{who:'player',type});return true;
 }
 impact(a,b,type){
  const atk=ATTACKS[type],d=distance(a,b);
  const fwdX=Math.sin(a.angle),fwdZ=Math.cos(a.angle);
  const forward=((b.x-a.x)*fwdX+(b.z-a.z)*fwdZ)/Math.max(d,.01);
  if(d>atk.reach||forward<.22){this.emit('miss',{who:a.id});return}
  b.hp=Math.max(0,b.hp-atk.damage);
  b.chain=this.time-b.chainAt<2.5?b.chain+1:1;b.chainAt=this.time;
  b.attack=null;b.stun=type==='heavy'?.64:.36;
  b.pushX=fwdX*atk.push;b.pushZ=fwdZ*atk.push;
  b.lean=type==='heavy'?-.54:-.36;b.state='hit';
  const ko=b.hp<=0,down=ko||(type==='heavy'&&(b.chain>=2||b.hp<=50));
  if(down){b.state='down';b.down=ko?4:1.6;b.lean=0;b.stun=0}
  if(a.id==='player'){this.hits++;this.aggressive=true}else this.enemyHits++;
  this.freeze=Math.max(this.freeze,atk.freeze);
  this.emit('hit',{who:a.id,target:b.id,type,damage:atk.damage,down,ko,chain:b.chain,
   health:b.hp,at:{x:b.x,z:b.z}});
  if(down)this.emit('down',{who:b.id,ko});
  if(ko){this.winner=a.id;this.emit('finished',{winner:a.id})}
 }
 updateFighter(a,b,dt){
  a.cd=Math.max(0,a.cd-dt);
  if(a.state==='down'){
   a.down=Math.max(0,a.down-dt);
   if(a.down<=0&&!this.winner){a.rise=.8;a.state='rise';this.emit('rise',{who:a.id})}
  }else if(a.state==='rise'){
   a.rise-=dt;if(a.rise<=0){a.state='idle';a.lean=0}
  }else if(a.attack){
   a.attack.clock+=dt;const atk=ATTACKS[a.attack.type];
   if(!a.attack.fired&&a.attack.clock>=atk.hit){
    a.attack.fired=true;this.impact(a,b,a.attack.type);
   }
   if(a.attack&&a.attack.clock>=atk.length){a.attack=null;a.state='idle'}
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
  const e=this.enemy,p=this.player;
  if(!this.aiEnabled||!this.aggressive||this.winner||e.attack||e.stun>0||['down','rise','hit'].includes(e.state))return;
  this.face(e,p);
  const d=distance(e,p);
  if(d>1.43){
   e.state='walk';
   const step=Math.min((this.difficulty==='hard'?2.0:1.55)*dt,d-1.32);
   e.x+=(p.x-e.x)/d*step;e.z+=(p.z-e.z)/d*step;
  }else e.state='idle';
  if(d<=1.94&&e.cd<=0&&p.state!=='down'&&p.state!=='rise'){
   e.attack={type:'counter',clock:0,fired:false};e.state='attack';
   e.cd=this.difficulty==='hard'?1.05:1.85;
   this.emit('swing',{who:'enemy',type:'counter'});
  }
 }
 step(dt,input={x:0,z:0}){
  dt=minmax(Number(dt)||0,0,.06);if(!dt)return;
  this.time+=dt;
  if(this.freeze>0){this.freeze=Math.max(0,this.freeze-dt);return}
  const p=this.player,e=this.enemy;
  this.updateFighter(p,e,dt);this.updateFighter(e,p,dt);
  if(this.winner)return;
  if(!p.attack&&p.stun<=0&&!['down','rise','hit'].includes(p.state)){
   const x=Number(input.x)||0,z=Number(input.z)||0,d=Math.hypot(x,z);
   if(d>.06){
    // Same camera-relative walking/running input as the main camp, supplied in world coordinates.
    const speed=minmax(Number(input.speed)||2.55,0,8.3),mx=x/d,mz=z/d;
    p.x+=mx*Math.min(1,d)*speed*dt;p.z+=mz*Math.min(1,d)*speed*dt;
    const desired=Math.atan2(mx,mz);
    const delta=Math.atan2(Math.sin(desired-p.angle),Math.cos(desired-p.angle));
    p.angle+=delta*Math.min(1,dt*13.2);
    p.state='walk';
   }else if(p.state==='walk')p.state='idle';
  }
  this.think(dt);
  for(const a of [p,e]){a.x=minmax(a.x,-5.6,5.6);a.z=minmax(a.z,-3.8,3.8)}
  const sep=distance(p,e);
  if(sep<.85&&sep>.001){
   const dx=(e.x-p.x)/sep,dz=(e.z-p.z)/sep,half=(.85-sep)/2;
   p.x-=dx*half;p.z-=dz*half;e.x+=dx*half;e.z+=dz*half;
  }
 }
 get status(){return{playerHP:this.player.hp,enemyHP:this.enemy.hp,
  playerState:this.player.state,enemyState:this.enemy.state,
  aggressive:this.aggressive,aiEnabled:this.aiEnabled,
  hits:this.hits,enemyHits:this.enemyHits,winner:this.winner,freeze:this.freeze}}
}