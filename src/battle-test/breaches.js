// Only the independent assault test opens these two perimeter fences.
export const SOUTH_BREACH={label:'大門哨口',xMin:-21,xMax:21,z:-21};
export const WEST_BREACH={label:'營舍外圍',zMin:-17,zMax:12};
export function removedFence(p){
 return p.type==='fence'&&(
  (p.z<=-19.8&&p.x>=SOUTH_BREACH.xMin&&p.x<=SOUTH_BREACH.xMax)||
  (p.x<=-43&&p.z>=WEST_BREACH.zMin&&p.z<=WEST_BREACH.zMax)
 );
}
export function westBoundary(z){
 if(z<=-9)return -45-(Math.max(-20,z)+20)*2/11;
 if(z<=5)return -47;
 if(z<=15)return -47+(z-5)*4/10;
 return -43;
}
export function waveEntry(index,total){
 const fromGate=index%2===0;
 const lanes=Math.max(1,fromGate?Math.ceil(total/2):Math.floor(total/2));
 const lane=Math.floor(index/2),t=lanes<=1?.5:lane/(lanes-1);
 if(fromGate){
  let x=-14+32*t; // Avoid the podium and flag area at the southwest fence.
  if(x>2.2&&x<6.3)x=x<4?1.1:6.5;
  return{side:'gate',start:{x,z:-25-(lane%3)*.65},entry:{x,z:-19.15}};
 }
 const z=-15.4+24.3*t,edge=westBoundary(z);
 return{side:'barracks',start:{x:edge-4.8-(lane%3)*.55,z},entry:{x:edge+2.6,z}};
}
