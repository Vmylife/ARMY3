// ARMY3 NPC rifle range audio — B 'balanced camp rifle'.
// Reuses the original NPC shot flags, rhythms, and animation without touching training logic.
export function updateRangeShooter(n,now){
 const period=10.6;
 const phase=((now*.001+n.seed*.127)%period+period)%period;
 const fade=x=>Math.max(0,Math.min(1,x));
 n.state='range';n.pos.x=n.home.x;n.pos.z=n.home.z;n.angle=0;
 n.anim.rifleAim=phase<.85?fade(phase/.85):phase>8.5?fade((9.5-phase)/1):1;
 const fireAt=[2.5,3.8,5.1,6.4],cycle=Math.floor((now*.001+n.seed*.127)/period);
 for(let i=0;i<fireAt.length;i++)if(phase>=fireAt[i]&&phase<fireAt[i]+.35){
  const id=cycle*10+i;
  if(n.lastShot!==id){n.lastShot=id;n.shotUntil=now+90;n.shotPending=true;}
 }
 n.anim.setClip('Idle');
}
export function createRangeAudio(){
 const C=window.AudioContext||window.webkitAudioContext;
 let ctx=null,buffer=null,loading=null,master=null,lastShot=-1;
 function ensure(){if(!C)return null;
  if(!ctx){ctx=new C();master=ctx.createGain();master.gain.value=.77;master.connect(ctx.destination)}
  return ctx;
 }
 function prepare(){const c=ensure();if(!c)return;
  if(c.state!=='running')c.resume().catch(()=>{});
  if(!loading){loading=fetch(new URL('../../assets/audio/rifle/npc_rifle_B.mp3',import.meta.url))
    .then(r=>{if(!r.ok)throw Error('NPC rifle audio '+r.status);return r.arrayBuffer()})
    .then(data=>c.decodeAudioData(data)).then(b=>buffer=b)
    .catch(err=>{loading=null;console.warn('NPC rifle B 音效載入失敗',err)});}
 }
 window.addEventListener('pointerdown',prepare,{passive:true});
 window.addEventListener('keydown',prepare,{passive:true});
 window.addEventListener('pagehide',()=>{ctx?.suspend?.().catch(()=>{})},{once:true});
 return dist=>{
  if(dist>26||!Number.isFinite(dist))return;
  const c=ensure();if(!c)return;
  if(c.state==='suspended'){c.resume().catch(()=>{});prepare();}
  if(!buffer){prepare();return;}
  // Limit simultaneous NPC shots to keep a packed range from clipping.
  const now=c.currentTime;if(now-lastShot<.048)return;lastShot=now;
  try{
   const src=c.createBufferSource(),g=c.createGain(),lp=c.createBiquadFilter();
   src.buffer=buffer;src.playbackRate.value=.96+Math.random()*.075;
   const distance=Math.max(0,dist);
   g.gain.value=.26*Math.pow(Math.max(0,1-distance/28),1.25);
   lp.type='lowpass';lp.frequency.value=Math.max(2000,17000-distance*270);
   src.connect(lp);lp.connect(g);g.connect(master);
   src.start(now);
  }catch(err){console.warn('NPC rifle sound',err)}
 };
}
