// ARMY3 standalone battle only: five balanced assault sectors. All enemies
// begin outside the real perimeter and pass through visible removed fence
// pieces. Staging marks keep their routes spread out around the whole camp.
export const SOUTH_BREACH={label:'南側防線',xMin:-21,xMax:35,z:-21};
export const WEST_BREACH={label:'西側營舍',zMin:-17,zMax:15};
export function removedFence(p){
 if(p.type!=='fence')return false;
 return (p.z<=-19.7&&p.x>=-21&&p.x<=35)||
  (p.x<=-43&&p.z>=-17&&p.z<=15)||
  (p.z>=22&&((p.x>=-16.5&&p.x<=-13)||(p.x>=-6&&p.x<=19)));
}
const southEdge=x=>x<=18?-21:-21+(x-18)/17;
const northEdge=x=>x<=-12?19+(x+32)*7/20:26;
const westEdge=z=>-47+(z-5)*.4;
const south=x=>{const z=southEdge(x);return {start:{x,z:z-3.55},entry:{x,z:z+1.78}}};
const north=x=>{const z=northEdge(x);return {start:{x,z:z+1.17},entry:{x,z:z-2.0}}};
const west=z=>{const x=westEdge(z);return {start:{x:x-2.25,z},entry:{x:x+3.2,z}}};
const SECTORS=[
 {side:'single-south',lanes:[10.5,13.4,15.7,17.5,18.8,20.2],cross:south,
  stages:[[10,5],[12,5],[14,5],[16,6],[18,6],[17,8]],flank:[0,-3.4]},
 {side:'hq-south',lanes:[-14.4,-12.5,-10.6,-9.4,-8.4,-6.6],cross:south,
  stages:[[-2,1],[0,1],[2,1],[4,1],[5,1],[2,4]],flank:[-3.4,-2.5]},
 {side:'hq-north',lanes:[-16.5,-14.6,-5.5,-3.5,-2.1,0.5],cross:north,
  stages:[[-2,17],[0,17],[2,17],[4,17],[6,17],[8,17]],flank:[-3.5,2.7]},
 {side:'range-north',lanes:[7.5,9.5,11.5,14.5,16.5,18.5],cross:north,
  stages:[[13,17],[15,17],[16.5,16.5],[18,17],[19,16],[18,14]],flank:[1.7,3]},
 {side:'hq-west',lanes:[8.5,10.3,11.9,13.8,14.9],cross:west,
  stages:[[-12,15],[-11,10],[-10,11],[-9,12],[-8,14]],flank:[-4.1,1]}
];
export function waveEntry(index,total,wave=1){
 // Each wave cycles through all five entries: 10 enemies = 2 per sector.
 const sector=SECTORS[(index+(wave-1)%5)%SECTORS.length];
 const lane=Math.floor(index/SECTORS.length);
 const slot=lane%sector.lanes.length;
 const approach=sector.stages[slot];
 const crossing=sector.cross(sector.lanes[slot]);
 return {...crossing,side:sector.side,approach:{x:approach[0],z:approach[1]},
  flank:{x:sector.flank[0]+(lane%3-1)*.7,z:sector.flank[1]+(lane%2)*.3}};
}
