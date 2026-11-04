// Keep the previously approved gate/barracks fence openings in this isolated
// test. Assault origins are now INSIDE the camp at the single-combat ground and
// on several sides of the HQ office, rather than funnelled through those gates.
export const SOUTH_BREACH={label:'大門哨口',xMin:-21,xMax:21,z:-21};
export const WEST_BREACH={label:'營舍外圍',zMin:-17,zMax:12};
export function removedFence(p){
 return p.type==='fence'&&(
  (p.z<=-19.8&&p.x>=SOUTH_BREACH.xMin&&p.x<=SOUTH_BREACH.xMax)||
  (p.x<=-43&&p.z>=WEST_BREACH.zMin&&p.z<=WEST_BREACH.zMax)
 );
}
function singleFront(index,count){
 const columns=Math.min(7,Math.max(3,Math.ceil(count/2)));
 const row=Math.floor(index/columns),column=index%columns;
 const t=columns<=1?.5:column/(columns-1);
 return {x:3.0+t*15.5+(row%2)*.28,z:5.7-row*2.7};
}
function officeFlanks(index){
 const side=index%3,lane=Math.floor(index/3);
 if(side===0)return {x:-12+lane*4.7,z:15.8+(lane%2)*1.8}; // HQ north
 if(side===1)return {x:-11.4+lane*4.5,z:2.45-(lane%2)*1.7}; // HQ south
 return {x:2.4+lane*3.8,z:8.4+(lane%2)*2.6}; // HQ east
}
export function waveEntry(index,total){
 // 3/5 single-combat field, 2/5 office; both attack at the same time.
 const single=index%5<3;
 let lane=0,singleCount=0;
 for(let i=0;i<total;i++)if(i%5<3)singleCount++;
 for(let i=0;i<index;i++)if((i%5<3)===single)lane++;
 return {side:single?'single':'office',start:single?singleFront(lane,singleCount):officeFlanks(lane)};
}
