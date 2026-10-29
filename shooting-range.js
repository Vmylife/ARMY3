/* ARMY3 shooting range: first playable FPS prototype. No external game engine. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('scene'),ctx=cv.getContext('2d',{alpha:true});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a),choice=a=>a[Math.random()*a.length|0],TAU=Math.PI*2;
const AUDIO={shot:'./assets/audio/rifle/npc_rifle_B.mp3',blast:'./assets/audio/grenade/explosion_crack_rumble.mp3',collapse:'./assets/audio/grenade/collapse_1.mp3',land:'./assets/audio/grenade/ground_land.mp3'};
let muted=false;try{muted=localStorage.getItem('ARMY3_shoot_muted')==='1'}catch{}
const soundPool={};for(const [name,src] of Object.entries(AUDIO)){soundPool[name]=new Audio(src);soundPool[name].preload='auto';}
function sound(name,volume=1){if(muted)return;try{const a=soundPool[name].cloneNode();a.volume=clamp(volume,0,1);a.play().catch(()=>{});a.addEventListener('ended',()=>a.remove(),{once:true});}catch{}}
let W=0,H=0,DPR=1,F=500;function resize(){W=window.innerWidth;H=window.innerHeight;DPR=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);F=Math.min(880,Math.max(W*1.8,H*.94));}window.addEventListener('resize',resize);resize();
let playing=false,last=0,elapsed=0,remaining=45,ammo=20,reloading=0,recoil=0,kick=0,camYaw=0,camPitch=.012,breathX=0,breathY=0,showUntil=0,shownText='',shots=0,hits=0,redKills=0,friendKills=0,barrelsBlown=0,buildingDamage=0,shootHold=false,nextShot=0,actors=[],barrels=[],particles=[],tracers=[],supplyTime=12,delayedBlasts=[],barrelId=0,actorId=0;
const quotes={perfect:'紅軍全滅了，友軍也平安。你這次真的有瞄準？',bad:'我叫你打紅軍，你卻替醫護所製造業績。',boom:'那個紅色桶子是誰搬進來的？現在全營都在找他。',miss:'開了這麼多槍，紅軍以為你在放鞭炮。',normal:'你打靶的時候，旁邊有人在拔草。這才是最不合理的部分。'};
function P(x,y,z){let dx=x,dz=z,cy=Math.cos(camYaw),sy=Math.sin(camYaw);const u=dx*cy-dz*sy,v=dx*sy+dz*cy,dy=y-1.62,cp=Math.cos(camPitch),sp=Math.sin(camPitch),yy=dy*cp-v*sp,zz=dy*sp+v*cp;if(zz<.18)return null;return {x:W*.5+F*u/zz,y:H*.5-F*yy/zz,z:zz,s:F/zz};}
function poly3(vertices,color,stroke){const pts=vertices.map(v=>P(...v));if(pts.some(p=>!p))return;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function textAt(txt,x,y,color='#ffe2a1',size=13){ctx.font=`900 ${size}px system-ui`;ctx.fillStyle=color;ctx.strokeStyle='#10251e';ctx.lineWidth=3;ctx.textAlign='center';ctx.strokeText(txt,x,y);ctx.fillText(txt,x,y);}
function line(x1,y1,x2,y2,color,w){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function makeActor(team,x,z,action='run'){return {id:++actorId,team,x,z,tx:rand(-22,22),tz:rand(13,62),speed:rand(1.8,3.7),action,actionClock:rand(0,6),phase:rand(0,7),alive:true,flight:0,lift:0,vy:0,vx:0,vz:0,down:false,carrying:null,face:1,life:1};}
function reset(){elapsed=0;remaining=45;ammo=20;reloading=0;recoil=0;kick=0;camYaw=0;camPitch=.012;shots=0;hits=0;redKills=0;friendKills=0;barrelsBlown=0;buildingDamage=0;shootHold=false;nextShot=0;showUntil=0;actors=[];barrels=[];particles=[];tracers=[];delayedBlasts=[];barrelId=0;actorId=0;supplyTime=11;
  for(let i=0;i<9;i++){let a=makeActor('red',rand(-22,22),rand(18,59),i%4===0?'sweep':'run');actors.push(a)}
  for(let i=0;i<15;i++){const action=i%5===0?'weed':i%6===0?'pullup':i%3===0?'sweep':'run';let a=makeActor('green',rand(-21,21),rand(17,63),action);if(action==='pullup'){const pos=i%2?[-17,31]:[16,47];a.x=a.tx=pos[0];a.z=a.tz=pos[1];}actors.push(a)}
  for(const [x,z] of [[-6,25],[12,36],[-15,51]])barrels.push({id:++barrelId,x,z,active:true,carrier:null});
  window.__armyShooting3D?.reset?.();updateHUD();$('alert').classList.remove('show');
}
function startGame(){reset();playing=true;last=performance.now();$('start').hidden=true;$('results').hidden=true;$('hud').hidden=false;requestAnimationFrame(loop);}
function endGame(){if(!playing)return;playing=false;shootHold=false;$('hud').hidden=true;$('results').hidden=false;
 const accuracy=shots?hits/shots:0;const score=clamp(Math.round(20+redKills*8+accuracy*22-friendKills*7-barrelsBlown*2),1,100);
 $('score').textContent=score;$('rank').textContent=score>=90?'S 級｜國軍神射手':score>=70?'A 級｜班長勉強點頭':score>=50?'B 級｜打靶有點東西':score>=30?'C 級｜友軍需要保險':'F 級｜子彈比你清醒';
 $('rRed').textContent=redKills;$('rFriend').textContent=friendKills;$('rBarrel').textContent=barrelsBlown;$('rAccuracy').textContent=Math.round(accuracy*100)+'%';
 $('comment').textContent='「'+(friendKills>=7?quotes.bad:barrelsBlown>=3?quotes.boom:shots>=12&&accuracy<.15?quotes.miss:redKills>=9&&friendKills===0?quotes.perfect:quotes.normal)+'」';
 const medals=[];if(redKills>=1)medals.push('🎯 初次戰果');if(redKills>=7)medals.push('🏅 紅軍剋星');if(friendKills>=3)medals.push('🪖 敵我不分');if(barrelsBlown>=2)medals.push('💣 國軍拆彈反面教材');if(friendKills===0&&redKills>=5)medals.push('🕊️ 友軍守護者');if(accuracy>=.85&&shots>=8)medals.push('👑 國軍神射手');
 $('medals').replaceChildren(...medals.map(t=>{let el=document.createElement('span');el.className='medal';el.textContent=t;return el}));
}
function updateHUD(){$('clock').textContent=remaining.toFixed(1);$('redCount').textContent=redKills;$('friendCount').textContent=friendKills;$('ammoValue').textContent=reloading>0?'換彈中…':ammo+' / 20';$('reload').disabled=reloading>0||ammo===20;}
function alertText(str){shownText=str;showUntil=elapsed+1.65;$('alert').textContent=str;$('alert').classList.add('show')}
function setAction(a,action){a.action=action;a.actionClock=0;if(action==='run'){a.tx=rand(-23,23);a.tz=rand(15,64)}else if(action==='pullup'){const place=choice([[-17,31],[16,47]]);a.tx=place[0]+rand(-.6,.6);a.tz=place[1]+rand(-.6,.6)}else if(action==='weed'){a.tx=rand(-21,21);a.tz=rand(17,61)}else if(action==='sweep'){a.tx=rand(-19,19);a.tz=rand(14,57)}}
function sendCarrier(){if(barrels.length>=8)return;const side=Math.random()<.5?-1:1,z=rand(20,54),a=makeActor(Math.random()<.55?'red':'green',side*32,z,'carry');a.x=side*32;a.z=z;a.tx=rand(-17,17);a.tz=rand(19,51);a.speed=rand(2.5,3.6);const b={id:++barrelId,x:a.x,z:a.z,active:true,carrier:a};a.carrying=b;actors.push(a);barrels.push(b);alertText((a.team==='red'?'紅軍':'友軍')+'正抱著紅色桶子走進靶場！')}
function updateActors(dt){for(const a of actors){if(!a.alive){if(a.lift>0||a.vy>0){a.x+=a.vx*dt;a.z+=a.vz*dt;a.lift=Math.max(0,a.lift+a.vy*dt);a.vy-=14.8*dt;a.vx*=.985;a.vz*=.985;if(a.lift===0&&a.vy<0){a.vy=0;a.down=true;}}continue}
  a.actionClock+=dt;const t=a.actionClock;
  if(a.action==='carry'||a.action==='run'||a.action==='sweep'&&t<.8){let dx=a.tx-a.x,dz=a.tz-a.z,dist=Math.hypot(dx,dz)||1;const speed=(a.action==='carry'?a.speed: a.action==='sweep'?1.4:a.speed);a.x+=dx/dist*speed*dt;a.z+=dz/dist*speed*dt;a.face=dx<0?-1:1;
    if(a.carrying){a.carrying.x=a.x;a.carrying.z=a.z;}
    if(dist<.65){if(a.action==='carry'){const b=a.carrying;b.carrier=null;b.x=a.x;b.z=a.z;a.carrying=null;setAction(a,'run');alertText((a.team==='red'?'紅軍':'友軍')+'把炸彈桶放在地上就走了！');}
      else if(a.action==='run'){setAction(a,choice(['run','run','weed','sweep','pullup']))}else{a.tx+=rand(-4,4);a.tz+=rand(-4,4)}}
  } else if(a.action==='pullup'){
    const dx=a.tx-a.x,dz=a.tz-a.z,d=Math.hypot(dx,dz);
    if(d>.5){a.x+=dx/d*dt*2;a.z+=dz/d*dt*2}else if(t>rand(8,14)){setAction(a,'run')}
  }else if(a.action==='weed'&&t>rand(6,11)||a.action==='sweep'&&t>rand(7,12)){setAction(a,'run')}
  if(a.action==='sweep'&&t>=.8){a.x+=Math.sin(t*1.5+a.phase)*dt*.32;}
  a.x=clamp(a.x,-36,36);a.z=clamp(a.z,12,65);
 }}
function spawnBurst(x,z,count=30,kind='blast'){const col=kind==='blast'?['#fff1a0','#ffbd62','#9e795b','#29382e']:['#e9dca7','#b1c49b'];for(let i=0;i<count;i++){particles.push({x,y:rand(.1,2),z,vx:rand(-7,7),vy:rand(1.8,9),vz:rand(-6,6),life:rand(.36,1.2),age:0,color:choice(col),r:rand(.05,.26)})}}
function knock(a,fromX,fromZ,impulse=1){if(!a.alive)return;a.alive=false;const dx=a.x-fromX,dz=a.z-fromZ,dist=Math.hypot(dx,dz)||1;a.vx=dx/dist*rand(4,9)*impulse;a.vz=dz/dist*rand(4,9)*impulse;a.vy=rand(4,7)*impulse;a.lift=.1;a.down=false;if(a.carrying){a.carrying.carrier=null;a.carrying.x=a.x;a.carrying.z=a.z;a.carrying=null}
 if(a.team==='red')redKills++;else friendKills++;updateHUD();}
function explode(b){if(!b||!b.active)return;b.active=false;window.__armyShooting3D?.explode?.(b.x,b.z);barrelsBlown++;sound('blast',.58);spawnBurst(b.x,b.z,48);kick+=13;alertText(choice(['💥 報告！這個桶子真的會爆！','💥 國軍安全教育：請勿亂射紅桶！','💥 班長！友軍怎麼飛那麼遠？']));
 for(const a of actors)if(a.alive){const d=Math.hypot(a.x-b.x,a.z-b.z);if(d<7.4)knock(a,b.x,b.z,clamp(1.15-d/14,.48,1.15))}
 for(const other of barrels)if(other.active&&other!==b&&Math.hypot(other.x-b.x,other.z-b.z)<8.4){if(!delayedBlasts.some(x=>x.b===other))delayedBlasts.push({b:other,at:elapsed+rand(.24,.48)})}
}
function reload(){if(!playing||reloading>0||ammo===20)return;reloading=1.55;shootHold=false;alertText('換彈中……班長叫你手不要抖')}
function fire(){if(!playing||reloading>0||elapsed<nextShot)return;if(ammo<=0){reload();return;}nextShot=elapsed+.19;ammo--;shots++;kick=16;recoil=Math.min(32,recoil+rand(6,10));sound('shot',.38);updateHUD();
 // A shot always follows the visibly drifting yellow sight, never hidden aim assist.
 const aimX=W/2+breathX+rand(-2.5,2.5),aimY=H/2+breathY-recoil*.12+rand(-2,2);
 const targets=[];
 for(const b of barrels)if(b.active){const p=P(b.x,.66,b.z);if(!p)continue;const bw=p.s*.38,bh=p.s*.54;const dx=Math.abs(aimX-p.x),dy=Math.abs(aimY-p.y);if(dx<bw+4&&dy<bh+5)targets.push({d:p.z,kind:'barrel',b});}
 for(const a of actors)if(a.alive){const p=P(a.x,1.0,a.z),head=P(a.x,1.64,a.z),foot=P(a.x,0,a.z);if(!p||!head||!foot)continue;const w=Math.max(7,p.s*.51);const left=p.x-w,right=p.x+w,top=head.y-p.s*.14,bottom=foot.y;
  if(aimX>=left&&aimX<=right&&aimY>=top&&aimY<=bottom)targets.push({d:p.z,kind:'npc',a});}
 targets.sort((a,b)=>a.d-b.d);const target=targets[0];let strike=null;
 if(target){hits++;if(target.kind==='barrel'){strike=P(target.b.x,.6,target.b.z);explode(target.b);}else{strike=P(target.a.x,1.0,target.a.z);knock(target.a,0,3,.5);spawnBurst(target.a.x,target.a.z,8,'dust');alertText(target.a.team==='red'?'🎯 擊倒紅軍！':'💢 友軍：「你到底在打哪裡？！」');}}
 tracers.push({x1:W*.64,y1:H*.95,x2:strike?.x??aimX,y2:strike?.y??aimY,t:0.16});
 if(ammo<=0){setTimeout(()=>{if(playing&&ammo===0)reload()},280)}
}
function update(dt){elapsed+=dt;remaining=Math.max(0,45-elapsed);const cycle=elapsed*2.12;breathX=Math.sin(cycle*.76+1.1)*10+Math.sin(cycle*1.77)*4+Math.sin(cycle*.39)*5;breathY=Math.sin(cycle)*13+Math.sin(cycle*2.31)*2;recoil=Math.max(0,recoil-dt*46);kick=Math.max(0,kick-dt*52);breathY-=recoil*.46;
 if(shootHold&&elapsed>=nextShot)fire();if(reloading>0){reloading-=dt;if(reloading<=0){reloading=0;ammo=20;alertText('換彈完畢！')}}
 updateActors(dt);if(elapsed>=supplyTime){sendCarrier();supplyTime+=rand(9.5,12.5)}
 for(const d of delayedBlasts.filter(d=>d.at<=elapsed)){explode(d.b)}delayedBlasts=delayedBlasts.filter(d=>d.at>elapsed);
 for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y=Math.max(.09,p.y+p.vy*dt);p.z+=p.vz*dt;p.vy-=12*dt}
 particles=particles.filter(p=>p.age<p.life);for(const t of tracers)t.t-=dt;tracers=tracers.filter(t=>t.t>0);
 $('actualAim').style.left=`calc(50% + ${breathX.toFixed(1)}px)`;$('actualAim').style.top=`calc(50% + ${breathY.toFixed(1)}px)`;$('breathIndicator').textContent=Math.cos(cycle)>0?'呼吸：吸氣中 ↑':'呼吸：吐氣中 ↓';
 if(elapsed>showUntil)$('alert').classList.remove('show');$('clock').textContent=remaining.toFixed(1);$('clock').style.color=remaining<10?'#ff9f81':'#ffdf93';$('progressBar')?.firstElementChild&&( $('progressBar').firstElementChild.style.width=(elapsed/45*100)+'%' );
 if(remaining<=0)endGame();
}
function box3(x,z,w,d,h,front='#647a52',side='#425a40',top='#89986b'){
  poly3([[x-w/2,0,z-d/2],[x+w/2,0,z-d/2],[x+w/2,h,z-d/2],[x-w/2,h,z-d/2]],front);
  poly3([[x+w/2,0,z-d/2],[x+w/2,0,z+d/2],[x+w/2,h,z+d/2],[x+w/2,h,z-d/2]],side);
  poly3([[x-w/2,h,z-d/2],[x+w/2,h,z-d/2],[x+w/2,h,z+d/2],[x-w/2,h,z+d/2]],top);
}
function barAt(x,z){const a=P(x-1.2,0,z),b=P(x-1.2,2.55,z),c=P(x+1.2,2.55,z),d=P(x+1.2,0,z);if([a,b,c,d].some(x=>!x))return;line(a.x,a.y,b.x,b.y,'#3d4f43',Math.max(2,a.s*.10));line(b.x,b.y,c.x,c.y,'#b5bca6',Math.max(2,a.s*.09));line(c.x,c.y,d.x,d.y,'#3d4f43',Math.max(2,a.s*.10));}
function drawFloor(){const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#79a9c0');grad.addColorStop(.55,'#b6d0b6');grad.addColorStop(1,'#6c986a');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  poly3([[-150,0,4],[150,0,4],[150,0,105],[-150,0,105]],'#86a47a');
  poly3([[-5.7,.005,6],[5.7,.005,6],[7.8,.005,100],[-7.8,.005,100]],'#a99e7f');
  for(let zz=12;zz<=90;zz+=7){poly3([[-5.9,.02,zz],[-5.3,.02,zz],[-5.3,.02,zz+2],[-5.9,.02,zz+2]],'#e6d9b0');poly3([[5.3,.02,zz],[5.9,.02,zz],[5.9,.02,zz+2],[5.3,.02,zz+2]],'#e6d9b0');}
  for(let z=11;z<75;z+=8)for(let x=-52;x<=52;x+=9){if(Math.abs(x)<7)continue;const p=P(x,0,z);if(!p||p.x<-20||p.x>W+20)continue;ctx.fillStyle=(x+z)%3>1?'#6c926d':'#769975';ctx.fillRect(p.x-p.s*.2,p.y-p.s*.12,Math.max(2,p.s*.4),Math.max(1,p.s*.1));}
  for(const [x,z,w,d,h] of [[-31,49,16,17,7],[32,66,20,15,8],[-37,75,18,13,6]]){box3(x,z,w,d,h,'#a0a78c','#798778','#b3b49a');for(let i=0;i<4;i++)poly3([[x-w/2+(i+.3)*w/4,.9,z-d/2-.025],[x-w/2+(i+.8)*w/4,.9,z-d/2-.025],[x-w/2+(i+.8)*w/4,3,z-d/2-.025],[x-w/2+(i+.3)*w/4,3,z-d/2-.025]],'#405d63')}
  for(const [x,z] of [[-17,31],[16,47]])barAt(x,z);
  for(let x=-37;x<=37;x+=2.8){box3(x,80,.1,.22,1.5,'#879376','#536c56','#b9bc96')}
}
function soldier(a){const py=(!a.alive?a.lift:0),base=P(a.x,py,a.z);if(!base||base.x<-100||base.x>W+100)return;const scale=base.s;const alive=a.alive,t=elapsed*5.3+a.phase,dir=a.face;
  ctx.fillStyle='#263e2f66';ctx.beginPath();ctx.ellipse(base.x,base.y,Math.max(3,scale*.53),Math.max(1,scale*.17),0,0,TAU);ctx.fill();
  if(!alive&&a.lift<.22){const p=P(a.x,.23,a.z);if(!p)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate((a.id%2?1:-1)*.1);ctx.fillStyle=a.team==='red'?'#ad5b4d':'#426c47';ctx.beginPath();ctx.ellipse(0,0,Math.max(6,scale*.95),Math.max(3,scale*.20),0,0,TAU);ctx.fill();ctx.fillStyle='#dab58c';ctx.beginPath();ctx.arc(-scale*.83,0,Math.max(2,scale*.18),0,TAU);ctx.fill();ctx.restore();return;}
  const action=a.action,actTime=a.actionClock,dy=action==='pullup'&&alive?Math.max(0,Math.sin(actTime*3.2))*.5:0,stoop=action==='weed'&&alive?.70:0,bodyY=.95-stoop+dy,headY=1.65-stoop+dy,run=alive&&action==='run',leg=Math.sin(t)*(run?.35:action==='sweep'?.05:.02),sway=run?Math.sin(t)*.08:0;
  const X=base.x,Y=base.y;const sy=v=>Y-scale*v;const upper=sy(bodyY),head=sy(headY),color=a.team==='red'?'#ba5649':'#507b54',dark=a.team==='red'?'#753b38':'#31583a';
  const lift=(!alive&&a.lift>.22)?Math.sin(a.flyT*6):0;
  ctx.save();ctx.translate(X,0);ctx.translate(0,lift*scale*.17);ctx.translate(-X,0);
  line(X-scale*.15,sy(.69),X-scale*(.15+leg),sy(.07),dark,Math.max(3,scale*.21));line(X+scale*.15,sy(.69),X+scale*(.15+leg),sy(.07),dark,Math.max(3,scale*.21));
  ctx.fillStyle=color;ctx.strokeStyle='#26372e';ctx.lineWidth=Math.max(.5,scale*.034);ctx.beginPath();ctx.roundRect(X-scale*.32+sway*scale,upper-scale*.35,scale*.64,scale*.79,Math.max(3,scale*.10));ctx.fill();ctx.stroke();
  if(action==='pullup'&&alive){line(X-scale*.27,upper,X-scale*.66,sy(2.55),color,Math.max(3,scale*.18));line(X+scale*.27,upper,X+scale*.66,sy(2.55),color,Math.max(3,scale*.18));}
  else if(action==='weed'&&alive){line(X-scale*.28,upper,X-scale*.49,sy(.28),color,Math.max(3,scale*.17));line(X+scale*.28,upper,X+scale*.52,sy(.14),color,Math.max(3,scale*.17));}
  else{const ar=Math.sin(t+2)*.18;line(X-scale*.29,upper,X-scale*(.48-ar),sy(.62),color,Math.max(3,scale*.18));line(X+scale*.29,upper,X+scale*(.48-ar),sy(.62),color,Math.max(3,scale*.18));}
  ctx.fillStyle='#d2ad85';ctx.beginPath();ctx.ellipse(X,head,Math.max(2,scale*.235),Math.max(2,scale*.245),0,0,TAU);ctx.fill();ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(X,head-scale*.15,Math.max(2,scale*.255),Math.max(1.5,scale*.12),0,0,Math.PI*2);ctx.fill();
  if(action==='sweep'&&alive){line(X+scale*.30,sy(.85),X+scale*.66,sy(.1),'#9a8263',Math.max(1,scale*.075));line(X+scale*.44,sy(.12),X+scale*.87,sy(.10),'#d0b68c',Math.max(2,scale*.11));}
  if(a.team==='red'){ctx.fillStyle='#e3c79e';ctx.fillRect(X-scale*.09,upper-scale*.06,scale*.18,scale*.12)}
  ctx.restore();
}
function barrelDraw(b){if(!b.active)return;let x=b.x,z=b.z,lev=0;if(b.carrier){x=b.carrier.x+b.carrier.face*.58;z=b.carrier.z;lev=.84;}const p=P(x,.53+lev,z);if(!p)return;const s=p.s;if(p.x<-100||p.x>W+100)return;
 ctx.fillStyle='#17221d64';ctx.beginPath();ctx.ellipse(p.x,p.y+s*.57,s*.40,s*.16,0,0,TAU);ctx.fill();
 const grad=ctx.createLinearGradient(p.x-s*.34,p.y,p.x+s*.34,p.y);grad.addColorStop(0,'#742521');grad.addColorStop(.22,'#c04b3e');grad.addColorStop(.57,'#d74737');grad.addColorStop(1,'#732c27');
 ctx.fillStyle=grad;ctx.strokeStyle='#582923';ctx.lineWidth=Math.max(1,s*.046);ctx.beginPath();ctx.moveTo(p.x-s*.34,p.y-s*.47);ctx.bezierCurveTo(p.x-s*.40,p.y-s*.24,p.x-s*.36,p.y+s*.30,p.x-s*.27,p.y+s*.48);ctx.quadraticCurveTo(p.x,p.y+s*.56,p.x+s*.27,p.y+s*.48);ctx.bezierCurveTo(p.x+s*.36,p.y+s*.25,p.x+s*.40,p.y-s*.24,p.x+s*.34,p.y-s*.47);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#2b1e1a';ctx.beginPath();ctx.ellipse(p.x,p.y-s*.47,s*.35,s*.13,0,0,TAU);ctx.fill();ctx.strokeStyle='#e9845e';ctx.lineWidth=Math.max(1,s*.045);ctx.stroke();
 ctx.fillStyle='#f3bd76';ctx.fillRect(p.x-s*.33,p.y-s*.05,s*.66,s*.11);ctx.fillStyle='#fff2bf';ctx.font=`900 ${Math.max(8,s*.30)}px system-ui`;ctx.textAlign='center';ctx.fillText('!',p.x,p.y+s*.29);
}
function weapon(){// Hand-drawn first-person rifle: tiny breath motion + firing recoil.
 const sx=breathX*.45,sy=breathY*.32+kick*.67;const x=W*.55+sx,y=H+28+sy,sc=Math.min(W/390,1.2);ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.rotate((breathX*.0014));
 ctx.fillStyle='#14251e';ctx.strokeStyle='#253f31';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(-113,0);ctx.lineTo(-93,-89);ctx.lineTo(-29,-127);ctx.lineTo(29,-128);ctx.lineTo(96,-80);ctx.lineTo(116,15);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#1a2b25';ctx.fillRect(-25,-182,50,106);ctx.fillStyle='#425449';ctx.fillRect(-11,-218,22,92);ctx.fillStyle='#18251d';ctx.fillRect(-12,-238,24,35);ctx.fillStyle='#778476';ctx.fillRect(-10,-248,20,8);ctx.fillStyle='#586a60';ctx.fillRect(-8,-226,16,13);
 ctx.strokeStyle='#0f1b16';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-89,14);ctx.lineTo(-64,-80);ctx.moveTo(86,14);ctx.lineTo(64,-80);ctx.stroke();
 ctx.fillStyle='#b79072';ctx.beginPath();ctx.ellipse(-76,-52,22,34,.4,0,TAU);ctx.ellipse(76,-52,22,34,-.4,0,TAU);ctx.fill();
 if(kick>8){ctx.fillStyle=`rgba(255,213,117,${clamp((kick-8)/8,0,.85)})`;ctx.beginPath();ctx.arc(0,-247,rand(10,26),0,TAU);ctx.fill();}
 ctx.restore()}
function render(){
 const world3D=window.__armyShooting3D?.ready?.();
 window.__armyShooting3D?.sync?.(actors,barrels,{yaw:camYaw,pitch:camPitch,fov:2*Math.atan(H/(2*F))*180/Math.PI});
 ctx.clearRect(0,0,W,H);if(!world3D){drawFloor();}const list=[];for(const a of actors){const p=P(a.x,0,a.z);if(p)list.push({depth:p.z,kind:'actor',item:a});}for(const b of barrels){if(!b.active)continue;const p=P(b.x,0,b.z);if(p)list.push({depth:p.z,kind:'barrel',item:b});}list.sort((a,b)=>b.depth-a.depth);if(!world3D)for(const it of list){if(it.kind==='actor')soldier(it.item);else barrelDraw(it.item)}
 for(const p of particles){const v=P(p.x,p.y,p.z);if(!v)continue;ctx.globalAlpha=clamp(1-p.age/p.life,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(v.x,v.y,Math.max(1,v.s*p.r),0,TAU);ctx.fill();ctx.globalAlpha=1}
 for(const t of tracers){ctx.globalAlpha=clamp(t.t/.16,0,1);line(t.x1,t.y1,t.x2,t.y2,'#ffe3aa',2.4);ctx.globalAlpha=1}weapon();}
function loop(now){if(!playing)return;const dt=clamp((now-last)/1000,.001,.05);last=now;update(dt);render();if(playing)requestAnimationFrame(loop);}
let dragging=null;cv.addEventListener('pointerdown',e=>{if(!playing)return;dragging={id:e.pointerId,x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragging.id||!playing)return;const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;dragging.x=e.clientX;dragging.y=e.clientY;camYaw=clamp(camYaw+dx*.0031,-.94,.94);camPitch=clamp(camPitch-dy*.0024,-.25,.32)});
cv.addEventListener('pointerup',()=>dragging=null);cv.addEventListener('pointercancel',()=>dragging=null);
$('shoot').addEventListener('pointerdown',e=>{e.preventDefault();if(!playing)return;shootHold=true;$('shoot').classList.add('pressed');$('shoot').setPointerCapture(e.pointerId);fire()});for(const n of ['pointerup','pointercancel','lostpointercapture'])$('shoot').addEventListener(n,()=>{shootHold=false;$('shoot').classList.remove('pressed')});
$('reload').addEventListener('click',reload);$('begin').addEventListener('click',startGame);$('again').addEventListener('click',startGame);
$('mute').textContent=muted?'🔇':'🔊';$('mute').addEventListener('click',()=>{muted=!muted;try{localStorage.setItem('ARMY3_shoot_muted',muted?'1':'0')}catch{}$('mute').textContent=muted?'🔇':'🔊'});
function back(){shootHold=false;playing=false;if(window.parent!==window){try{window.parent.postMessage({type:'ARMY3_SHOOTING_RETURN'},location.origin);return}catch{}}location.href='./index.html'};
document.querySelectorAll('.backToCamp').forEach(x=>x.addEventListener('click',back));
window.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Space'){e.preventDefault();if(playing)fire()}if(e.key.toLowerCase()==='r')reload()});
reset();render();
window.__armyShootingTest={state:()=>({playing,remaining,ammo,redKills,friendKills,aimYaw:camYaw,aimPitch:camPitch,barrels:barrels.map(b=>({x:b.x,z:b.z,active:b.active,carrier:!!b.carrier})),actors:actors.length}),fire,finish:endGame,shootAt:(yaw,pitch)=>{camYaw=yaw;camPitch=pitch},debugExplode:()=>explode(barrels.find(b=>b.active))};
})();
