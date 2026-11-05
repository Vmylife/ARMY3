// Five balanced entry sectors in the independent ARMY3 battle sandbox.
// NO attacks from the north fence. All reds start outside a visible gap;
// canteen-side attackers return via the south/east perimeter.
export const SOUTH_BREACH={label:'南側防線',xMin:-21,xMax:35,z:-21};
export const WEST_BREACH={label:'西側營舍',zMin:-17,zMax:15};
export function removedFence(p){
 if(p.type!=='fence')return false;
 return (p.z<=-19.7&&p.x>=SOUTH_BREACH.xMin&&p.x<=SOUTH_BREACH.xMax)||
  (p.x<=-43&&p.z>=WEST_BREACH.zMin&&p.z<=WEST_BREACH.zMax)||
  // One southeast approach between the dining hall and the exterior fence.
  (p.x>=43.5&&p.z>=-13.5&&p.z<=-6.5);
}
const southEdge=x=>x<=18?-21:-21+(x-18)/17;
const westEdge=z=>-47+(z-5)*.4;
const eastEdge=z=>z<=-10?45:45-(z+10)/19;
const south=x=>{const z=southEdge(x);return {start:{x,z:z-3.55},entry:{x,z:z+1.78}}};
const west=z=>{const x=westEdge(z);return {start:{x:x-2.25,z},entry:{x:x+3.2,z}}};
const east=z=>{const x=eastEdge(z);return {start:{x:x+2.6,z},entry:{x:x-2.2,z}}};
const SECTORS=[
 {side:'single-south',lanes:[10.5,13.4,15.7,17.5,18.8,20.2],cross:south,
  stages:[[10,5],[12,5],[14,5],[16,6],[18,6],[17,8]],flank:[0,-3.4]},
 {side:'hq-south',lanes:[-14.4,-12.5,-10.6,-9.4,-8.4,-6.6],cross:south,
  stages:[[-2,1],[0,1],[2,1],[4,1],[5,1],[2,4]],flank:[-3.4,-2.5]},
 {side:'canteen-south',lanes:[29.2,30.6,32,33.4,34],cross:south,
  stages:[[32,-6],[32,-4],[31.5,-2],[32.4,-1],[31,1]],flank:[2.4,-2.6]},
 {side:'canteen-east',lanes:[-12,-11,-10,-9,-8,-7],cross:east,
  stages:[[32,-5],[32,-3],[32,-2],[33,0],[32.8,1],[33,2]],flank:[3.1,0.8]},
 {side:'hq-west',lanes:[8.5,10.3,11.9,13.8,14.9],cross:west,
  stages:[[-12,15],[-11,10],[-10,11],[-9,12],[-8,14]],flank:[-4.1,1]}
];
export function waveEntry(index,total,wave=1){
 // Rotate entry priority, never entry LOCATION. 10 reds = 2 per sector.
 const sector=SECTORS[(index+(wave-1)%SECTORS.length)%SECTORS.length];
 const lane=Math.floor(index/SECTORS.length),slot=lane%sector.lanes.length;
 const crossing=sector.cross(sector.lanes[slot]),approach=sector.stages[slot];
 return {...crossing,side:sector.side,approach:{x:approach[0],z:approach[1]},
  flank:{x:sector.flank[0]+(lane%3-1)*.7,z:sector.flank[1]+(lane%2)*.3}};
}
