// Independent assault navigation: all traversable grass and pavement cost the
// same. Buildings, fixtures and the real camp boundary still block movement.
import {canOccupy} from '../map/navCollision109.js?v=124';
const STEP=1,LEFT=-46,BOTTOM=-21,NX=92,NZ=48,COUNT=NX*NZ;
const RADIUS=.40,MAX_SEARCH=COUNT;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
let free=null;
const cell=(x,z)=>z*NX+x;
const world=(i)=>({x:LEFT+(i%NX)*STEP,z:BOTTOM+Math.floor(i/NX)*STEP});
function build(){
 if(free)return;
 free=new Uint8Array(COUNT);
 for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++)
  free[cell(x,z)]=canOccupy({x:LEFT+x*STEP,z:BOTTOM+z*STEP},RADIUS)?1:0;
}
function nearest(p){
 const cx=clamp(Math.round((p.x-LEFT)/STEP),0,NX-1);
 const cz=clamp(Math.round((p.z-BOTTOM)/STEP),0,NZ-1);
 for(let radius=0;radius<=8;radius++){
  let best=-1,bestD=Infinity;
  for(let z=Math.max(0,cz-radius);z<=Math.min(NZ-1,cz+radius);z++)
   for(let x=Math.max(0,cx-radius);x<=Math.min(NX-1,cx+radius);x++){
    if(radius&&Math.max(Math.abs(x-cx),Math.abs(z-cz))!==radius)continue;
    const index=cell(x,z);if(!free[index])continue;
    const dx=LEFT+x*STEP-p.x,dz=BOTTOM+z*STEP-p.z,score=dx*dx+dz*dz;
    if(score<bestD){bestD=score;best=index}
   }
  if(best>=0)return best;
 }
 return -1;
}
export function battleClear(a,b){
 const len=distance(a,b),count=Math.max(1,Math.ceil(len/.40));
 for(let i=1;i<=count;i++){
  const t=i/count;
  if(!canOccupy({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},RADIUS))return false;
 }
 return true;
}
const directions=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],
 [1,1,Math.SQRT2],[-1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,-1,Math.SQRT2]];
// A* is only used where direct, obstacle-safe travel is impossible.
// No roadDistance, pavement preference, squad lane or road penalty is used.
export function battleRoute(from,to){
 if(battleClear(from,to))return [{...to}];
 build();
 const source=nearest(from),target=nearest(to);
 if(source<0||target<0)return [];
 const final=canOccupy(to,RADIUS)?{...to}:world(target);
 if(source===target)return [final];
 const scores=new Float32Array(COUNT).fill(Infinity),parents=new Int32Array(COUNT).fill(-1);
 const closed=new Uint8Array(COUNT),heap=[];
 const heuristic=i=>Math.hypot((i%NX)-(target%NX),Math.floor(i/NX)-Math.floor(target/NX));
 function push(i,cost){
  let k=heap.length;heap.push({i,cost});
  while(k>0){const p=(k-1)>>1;if(heap[p].cost<=cost)break;heap[k]=heap[p];k=p;}
  heap[k]={i,cost};
 }
 function pop(){
  const top=heap[0].i,last=heap.pop();
  if(heap.length){
   let k=0;
   while(true){const a=k*2+1,b=a+1;if(a>=heap.length)break;
    const next=b<heap.length&&heap[b].cost<heap[a].cost?b:a;
    if(last.cost<=heap[next].cost)break;
    heap[k]=heap[next];k=next;
   }
   heap[k]=last;
  }
  return top;
 }
 scores[source]=0;push(source,heuristic(source));
 let found=false,expanded=0;
 while(heap.length&&expanded++<MAX_SEARCH){
  const current=pop();if(closed[current])continue;
  if(current===target){found=true;break}
  closed[current]=1;
  const x=current%NX,z=Math.floor(current/NX);
  for(const [dx,dz,step] of directions){
   const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=NX||zz>=NZ)continue;
   const next=cell(xx,zz);
   if(!free[next]||closed[next])continue;
   if(dx&&dz&&(!free[cell(x+dx,z)]||!free[cell(x,z+dz)]))continue;
   const cost=scores[current]+step;
   if(cost>=scores[next])continue;
   parents[next]=current;scores[next]=cost;push(next,cost+heuristic(next));
  }
 }
 if(!found)return [];
 const raw=[];
 for(let at=target;at!==source&&at>=0;at=parents[at])raw.push(world(at));
 raw.reverse();
 raw.push(final);
 const path=[];
 let previous=from;
 for(let i=0;i<raw.length;){
  let j=Math.min(i+8,raw.length-1);
  while(j>i&&!battleClear(previous,raw[j]))j--;
  path.push(raw[j]);previous=raw[j];i=j+1;
 }
 return path;
}
