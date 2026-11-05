// One shared grid field around the player, instead of 200 separate A* searches.
import {canOccupy} from '../battle-test/battleCollision.js?v=1';
const MIN_X=-46,MIN_Z=-21,STEP=1.35;
const NX=69,NZ=37,COUNT=NX*NZ,INF=65535;
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1]];
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export class CrowdFlowField{
 constructor(){
  this.free=new Uint8Array(COUNT);this.dist=new Uint16Array(COUNT);
  this.cells=new Array(COUNT);this.queue=new Int32Array(COUNT);
  for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){
   const i=z*NX+x,pos={x:MIN_X+x*STEP,z:MIN_Z+z*STEP};
   this.cells[i]=pos;
   this.free[i]=canOccupy(pos,.43)?1:0;
  }
  this.goal=-1;this.lastBuild=-Infinity;
 }
 index(pos){
  const x=clamp(Math.round((pos.x-MIN_X)/STEP),0,NX-1);
  const z=clamp(Math.round((pos.z-MIN_Z)/STEP),0,NZ-1);
  return z*NX+x;
 }
 nearestFree(pos){
  const start=this.index(pos);if(this.free[start])return start;
  const ix=start%NX,iz=Math.floor(start/NX);let best=-1,ds=Infinity;
  for(let radius=1;radius<=8;radius++){
   for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
    const x=ix+dx,z=iz+dz;if(x<0||z<0||x>=NX||z>=NZ)continue;
    const i=z*NX+x;if(!this.free[i])continue;
    const px=this.cells[i].x-pos.x,pz=this.cells[i].z-pos.z;
    const d=px*px+pz*pz;if(d<ds){ds=d;best=i}
   }
   if(best>=0)break;
  }
  return best;
 }
 update(player,clock){
  const idx=this.nearestFree(player);
  if(idx<0||idx===this.goal&&clock-this.lastBuild<1.5)return;
  this.lastBuild=clock;this.goal=idx;this.dist.fill(INF);
  let front=0,end=0;this.queue[end++]=idx;this.dist[idx]=0;
  while(front<end){
   const at=this.queue[front++],x=at%NX,z=Math.floor(at/NX),nextD=this.dist[at]+1;
   for(const [dx,dz] of DIRECTIONS){
    const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=NX||zz>=NZ)continue;
    const n=zz*NX+xx;
    if(!this.free[n]||this.dist[n]!==INF)continue;
    this.dist[n]=nextD;this.queue[end++]=n;
   }
  }
 }
 next(pos,player){
  const here=this.nearestFree(pos);
  if(here<0||this.dist[here]===INF)return player;
  const ix=here%NX,iz=Math.floor(here/NX);
  let best=here,cost=this.dist[here];
  for(const [dx,dz] of DIRECTIONS){
   const x=ix+dx,z=iz+dz;if(x<0||z<0||x>=NX||z>=NZ)continue;
   const at=z*NX+x;
   if(this.free[at]&&this.dist[at]<cost){best=at;cost=this.dist[at]}
  }
  if(best===here)return player;
  return this.cells[best];
 }
}
