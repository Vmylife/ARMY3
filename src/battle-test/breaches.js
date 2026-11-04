// Only the independent battle test cuts these perimeter gaps.
export const SOUTH_BREACH={label:'南側防線',xMin:-21,xMax:35,z:-21};
export const WEST_BREACH={label:'西側營舍',zMin:-17,zMax:15};
export function removedFence(p){
 if(p.type!=='fence')return false;
 return (p.z<=-19.7&&p.x>=-21&&p.x<=35)||
  (p.x<=-43&&p.z>=-17&&p.z<=15)||
  (p.z>=22&&((p.x>=-16.5&&p.x<=-13)||(p.x>=-6&&p.x<=1)));
}
// Verified against camp collisions, including the lamp/tree on the south wall.
const SINGLE_LANES=[10.5,13.4,14.7,16.1,17.5,18.8,20.2,21.6,23,24.4,25.8,29.2,30.6,32,33.4];
const southEdge=x=>x<=18?-21:-21+(x-18)/17;
const northEdge=x=>x<=-12?19+(x+32)*7/20:26;
const westEdge=z=>-47+(z-5)*.4;
const south=x=>{const z=southEdge(x);return {start:{x,z:z-3.55},entry:{x,z:z+1.78}}};
const north=i=>{const x=[-15.7,-14.1,-4.6,-2.1][i%4],z=northEdge(x);return {start:{x,z:z+1.17},entry:{x,z:z-2}}};
const west=i=>{const z=[9.4,11,14.9][i%3],x=westEdge(z);return {start:{x:x-2.25,z},entry:{x:x+3.2,z}}};
const office=i=>{
 const side=i%3,lane=Math.floor(i/3);
 if(side===0)return {side:'hq-north',...north(lane)};
 if(side===1)return {side:'hq-south',...south(-14.4+Math.min(2,lane)*3)};
 return {side:'hq-west',...west(lane)};
};
export function waveEntry(index,total){
 // Two simultaneous assault groups; the HQ group has three entrances.
 const single=index%5<3;let lane=0,totalSingle=0;
 for(let i=0;i<total;i++)if(i%5<3)totalSingle++;
 for(let i=0;i<index;i++)if((i%5<3)===single)lane++;
 if(!single)return office(lane);
 const slot=Math.round((totalSingle<=1?.5:lane/(totalSingle-1))*(SINGLE_LANES.length-1));
 return {side:'single-south',...south(SINGLE_LANES[slot])};
}
