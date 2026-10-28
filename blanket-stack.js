// ARMY3 v1.46 — Blanket Bloxx. Uses the player's exported ARMY3 scene verbatim.
import {makeEnvironment as makeOriginalCampGround} from './src/map/ground103.js?v=103';
import {loadGlb} from './src/core/glb111.js?v=111';
import {RigAnimator} from './src/characters/rigAnimator.js';
import {returnToCamp} from './src/systems/campSession.js?v=144';
const $=id=>document.getElementById(id);
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=cap(t,0,1);return t*t*(3-2*t)};
const TAU=Math.PI*2;
const canvas=$('field');
let gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});
let program=null,skinProgram=null,flatProgram=null;
const cache=new Map(),pending=new Map(),failed=new Set();
let npcIdle=null,npcDown=null;
// WebGL matrices: column-major, original ARMY3 renderer coordinate conventions.
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function lookAt(e,t){const f=norm(sub(t,e)),s=norm(cross(f,[0,1,0])),u=cross(s,f);return new Float32Array([s[0],u[0],-f[0],0,s[1],u[1],-f[1],0,s[2],u[2],-f[2],0,-dot(s,e),-dot(u,e),dot(f,e),1])}
function pers(fov,asp,near,far){const f=1/Math.tan(fov*Math.PI/360),k=1/(near-far);return new Float32Array([f/asp,0,0,0,0,f,0,0,0,0,(far+near)*k,-1,0,0,2*far*near*k,0])}
function mul(a,b){const o=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[i+j*4]+=a[i+k*4]*b[k+j*4];return o}
const T=(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
const S=(x,y,z)=>new Float32Array([x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]);
function ry(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])}
function rx(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])}
function rz(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])}
const ASSET_FALLBACK={blanket:'./assets/blanket/folded-blanket.glb',skullMine:'./assets/mines/skull-mine.glb',friendly:'./assets/characters/cadet/cadet-green.glb'};
const cleanPath=p=>{if(typeof p!=='string')return '';const b=p.split('?')[0];return /^\.\/assets\/[\w\-\/]+\.glb$/i.test(b)?b:''};
const modelPath=o=>cleanPath(o?.model||ASSET_FALLBACK[o?.assetId]);
const qualityOf=o=>o.quality==='high'?'high':'low';
const BY={}; // asset lookup for shared editor shader routines

function shader(gl,t,src){const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function makeProgram(vs,fs){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
const VS=`#version 300 es\nprecision highp float;layout(location=0)in vec3 p;layout(location=1)in vec3 n;layout(location=2)in vec2 uv;uniform mat4 uVP,uModel;out vec2 vUV;out vec3 vN;void main(){gl_Position=uVP*uModel*vec4(p,1.);vUV=uv;vN=normalize(mat3(uModel)*n);}`;
const SKINVS=`#version 300 es\nprecision highp float;layout(location=0)in vec3 p;layout(location=1)in vec3 n;layout(location=2)in vec2 uv;layout(location=3)in vec4 j;layout(location=4)in vec4 w;uniform mat4 uVP,uModel,uBones[44];out vec2 vUV;out vec3 vN;void main(){ivec4 ji=ivec4(j+.5);mat4 m=uBones[ji.x]*w.x+uBones[ji.y]*w.y+uBones[ji.z]*w.z+uBones[ji.w]*w.w;gl_Position=uVP*uModel*m*vec4(p,1.);vUV=uv;vN=normalize(mat3(uModel)*mat3(m)*n);}`;
const FS=`#version 300 es\nprecision highp float;in vec2 vUV;in vec3 vN;uniform sampler2D uTex;uniform vec3 uTint;uniform float uRed;out vec4 outColor;void main(){vec3 col=texture(uTex,vUV).rgb;float cloth=smoothstep(.025,.10,col.g-col.r)*smoothstep(.055,.13,col.g-col.b);vec3 redCloth=vec3(min(1.,col.g*1.58),col.g*.47,col.g*.38);col=mix(col,redCloth,uRed*cloth);float light=.76+.29*max(0.,dot(normalize(vN),normalize(vec3(-.45,1.,.60))));outColor=vec4(col*uTint*light,1.);}`;
const FLATVS=`#version 300 es\nprecision highp float;layout(location=0)in vec3 p;uniform mat4 uVP,uModel;void main(){gl_Position=uVP*uModel*vec4(p,1.);}`;
const FLATFS=`#version 300 es\nprecision highp float;uniform vec3 uColor;out vec4 outColor;void main(){outColor=vec4(uColor,1.);}`;
const cube=[];function face(a,b,c,d){for(const q of [a,b,c,a,c,d])cube.push(...q)}
face([-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]);face([-.5,1,-.5],[-.5,1,.5],[.5,1,.5],[.5,1,-.5]);
for(let i=0;i<4;i++){const t=i*Math.PI/2,t2=t+Math.PI/2;const p=[Math.cos(t)*.5,Math.sin(t)*.5],q=[Math.cos(t2)*.5,Math.sin(t2)*.5];face([p[0],0,p[1]],[q[0],0,q[1]],[q[0],1,q[1]],[p[0],1,p[1]])}
let cubeVAO=null,white=null;
// A single immutable GPU buffer, copied from the main game's exact terrain
// generator. Geometry includes road curves, oval track and basketball lines.
const CAMP_GROUND_VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 p;
layout(location=1) in vec3 c;
layout(location=2) in vec3 n;
uniform mat4 uVP;
out vec3 vColor;
out vec3 vN;
void main(){gl_Position=uVP*vec4(p,1.);vColor=c;vN=n;}`;
const CAMP_GROUND_FS=`#version 300 es
precision highp float;
in vec3 vColor;
in vec3 vN;
out vec4 frag;
void main(){float sun=max(0.,dot(normalize(vN),normalize(vec3(-.5,1.,.4))));frag=vec4(vColor*(.82+.22*sun),1.);}`;
let originalGroundVAO=null,originalGroundProgram=null,originalGroundCount=0;
function initOriginalGround(){
 // Construct only once. All subsequent frames are one drawElements-free draw call.
 const env=makeOriginalCampGround();
 if(!env?.verts||!env?.cols||!env?.norms||env.verts.length!==env.cols.length||env.verts.length!==env.norms.length)throw Error('主遊戲地板頂點資料不完整');
 originalGroundProgram=makeProgram(CAMP_GROUND_VS,CAMP_GROUND_FS);
 originalGroundVAO=gl.createVertexArray();gl.bindVertexArray(originalGroundVAO);
 for(const [index,data] of [[0,env.verts],[1,env.cols],[2,env.norms]]){
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,3,gl.FLOAT,false,0,0);
 }
 gl.bindVertexArray(null);originalGroundCount=env.count;
}
function drawOriginalGround(vp){
 if(!originalGroundVAO)return;
 gl.useProgram(originalGroundProgram);
 gl.uniformMatrix4fv(gl.getUniformLocation(originalGroundProgram,'uVP'),false,vp);
 gl.bindVertexArray(originalGroundVAO);gl.disable(gl.CULL_FACE);
 gl.drawArrays(gl.TRIANGLES,0,originalGroundCount);gl.enable(gl.CULL_FACE);
 gl.bindVertexArray(null);
}

function initGL(){if(!gl){msg('目前瀏覽器沒有 WebGL2，使用平面編輯預覽；JSON 仍可匯出');return}
 program=makeProgram(VS,FS);skinProgram=makeProgram(SKINVS,FS);flatProgram=makeProgram(FLATVS,FLATFS);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
 cubeVAO=gl.createVertexArray();gl.bindVertexArray(cubeVAO);const arr=new Float32Array(cube),buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 white=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,white);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);initOriginalGround()}
function gpuAsset(gltf){const a=gltf.json.meshes[0].primitives[0],pr=a.attributes;
 const mesh=gl.createVertexArray();gl.bindVertexArray(mesh);
 for(const [key,i,sz] of [['POSITION',0,3],['NORMAL',1,3],['TEXCOORD_0',2,2],['JOINTS_0',3,4],['WEIGHTS_0',4,4]]){
  if(pr[key]===undefined)continue;const arr=gltf.read(pr[key]),idx=gltf.json.accessors[pr[key]],b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,sz,idx.componentType,!!idx.normalized,0,0)}
 const inds=gltf.read(a.indices),b=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,inds,gl.STATIC_DRAW);gl.bindVertexArray(null);
 const ac=gltf.json.accessors[pr.POSITION];const positions=gltf.read(pr.POSITION);let lo=ac.min,hi=ac.max;
 if(!lo||!hi){lo=[Infinity,Infinity,Infinity];hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],positions[i+k]);hi[k]=Math.max(hi[k],positions[i+k])}}
 const mat=gltf.json.materials?.[a.material||0],textureIndex=mat?.pbrMetallicRoughness?.baseColorTexture?.index,source=gltf.json.textures?.[textureIndex]?.source;
 return{mesh,count:inds.length,itype:gltf.json.accessors[a.indices].componentType,lo,hi,textureSource:source,skin:pr.JOINTS_0!==undefined}}
async function texture(gltf,source){if(source==null)return white;const blob=gltf.imageFrom(source),url=URL.createObjectURL(blob),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url})}finally{URL.revokeObjectURL(url)}
 const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}

// Batch and cache per model; draw the supplied 529 editable objects at their exported coordinates.
async function ensureModel(o){
 const path=modelPath(o);
 if(!path||!gl||failed.has(path))return null;
 if(cache.has(path))return cache.get(path);
 if(pending.has(path))return pending.get(path);
 const job=(async()=>{
  try{
   const g=await loadGlb(path,{timeoutMs:45000});
   const geo=gpuAsset(g),tex=await texture(g,geo.textureSource);
   let animator=null;
   if(geo.skin){
    animator=new RigAnimator(g);animator.setClip('Idle',{restart:true});animator.evaluate(.01);
    if(o.assetId==='friendly'){npcIdle=animator;try{npcDown=new RigAnimator(g);if(!npcDown.setClip('Knock_Down',{restart:true}))npcDown.setClip('Dead',{restart:true});npcDown.evaluate(.85)}catch{npcDown=null}}
   }
   const m={geo,tex,animator};cache.set(path,m);return m;
  }catch(err){console.error('棉被場景模型載入失敗:',path,err);failed.add(path);return null}
  finally{pending.delete(path)}
 })();pending.set(path,job);return job;
}
function modelMatrix(o,geo){
 const sz=o.size||[1,1,1],oScale=o.scale||1,lo=geo.lo,hi=geo.hi,midX=(lo[0]+hi[0])/2,midZ=(lo[2]+hi[2])/2;
 let sx=sz[0]*oScale/Math.max(.0001,hi[0]-lo[0]),sy=sz[1]*oScale/Math.max(.0001,hi[1]-lo[1]),sz0=sz[2]*oScale/Math.max(.0001,hi[2]-lo[2]);
 if(o.useSourceModelUnits&&Array.isArray(o.sourceScaleXYZ)){
  [sx,sy,sz0]=o.sourceScaleXYZ.map(v=>v*oScale);
 }else if(o.fitMode==='uniform3D'&&o.sourceFootprint){
  const b=o.sourceFootprint,turn=Math.abs(Math.sin(o.rot*Math.PI/180))>.5;
  const uni=Math.min((turn?b.d:b.w)*.95/Math.max(.0001,hi[0]-lo[0]),(turn?b.w:b.d)*.95/Math.max(.0001,hi[2]-lo[2]))*oScale;
  sx=sy=sz0=uni;
 }else if(o.fitMode==='uniformXZ'&&o.sourceFootprint){
  const b=o.sourceFootprint,uni=Math.min(b.w*.91/Math.max(.0001,hi[0]-lo[0]),b.d*.91/Math.max(.0001,hi[2]-lo[2]))*1.14*oScale;
  sx=sz0=uni;
 }
 let m=mul(T(o.x,o.y??o.sourceY??0,o.z),ry((o.rot||0)*Math.PI/180));
 if(o.tiltX)m=mul(m,rx(o.tiltX));
 if(o.tiltZ)m=mul(m,rz(o.tiltZ));
 return mul(m,mul(S(sx,sy,sz0),T(-midX,-lo[1],-midZ)));
}
let lastUsed=null;
function drawModel(o,vp){
 const path=modelPath(o),m=cache.get(path);if(!m)return false;
 const p=m.geo.skin?skinProgram:program;
 if(lastUsed!==p){gl.useProgram(p);lastUsed=p}
 const u=n=>gl.getUniformLocation(p,n);
 gl.uniformMatrix4fv(u('uVP'),false,vp);
 gl.uniformMatrix4fv(u('uModel'),false,modelMatrix(o,m.geo));
 const tint=o.crushed?[.54,.56,.52]:o.broken?[.67,.62,.57]:[1,1,1];
 gl.uniform3fv(u('uTint'),tint);gl.uniform1f(u('uRed'),o.team==='enemy'?1:0);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,m.tex);gl.uniform1i(u('uTex'),0);
 if(m.geo.skin){
  const animator=o.crushed&&npcDown?npcDown:m.animator;
  if(!animator)return false;
  gl.uniformMatrix4fv(u('uBones[0]'),false,animator.bones);
 }
 gl.bindVertexArray(m.geo.mesh);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,m.geo.count,m.geo.itype,0);gl.enable(gl.CULL_FACE);
 return true;
}
function flatDraw(vp,model,color){gl.useProgram(flatProgram);lastUsed=flatProgram;const u=n=>gl.getUniformLocation(flatProgram,n);gl.uniformMatrix4fv(u('uVP'),false,vp);gl.uniformMatrix4fv(u('uModel'),false,model);gl.uniform3fv(u('uColor'),color);gl.bindVertexArray(cubeVAO);gl.disable(gl.CULL_FACE);gl.drawArrays(gl.TRIANGLES,0,cube.length/3);gl.enable(gl.CULL_FACE)}
let ringVAO=null,ringCount=0;
function initRings(){const segments=48,vertices=[];for(let i=0;i<segments;i++){const a=i*TAU/segments,b=(i+1)*TAU/segments;const p=(t,r)=>[Math.cos(t)*r,0,Math.sin(t)*r];vertices.push(...p(a,.965),...p(a,1.035),...p(b,1.035),...p(a,.965),...p(b,1.035),...p(b,.965));}
 ringCount=vertices.length/3;ringVAO=gl.createVertexArray();gl.bindVertexArray(ringVAO);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null)
}
function drawRing(vp,x,z,r,c,y=.23){gl.useProgram(flatProgram);lastUsed=flatProgram;gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram,'uVP'),false,vp);gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram,'uModel'),false,mul(T(x,y,z),S(r,1,r)));gl.uniform3fv(gl.getUniformLocation(flatProgram,'uColor'),c);gl.bindVertexArray(ringVAO);gl.disable(gl.CULL_FACE);gl.drawArrays(gl.TRIANGLES,0,ringCount);gl.enable(gl.CULL_FACE)}
let scene=null,foundation=null,things=[],mines=[],soldiers=[],buildings=[],stack=[],flying=null,falling=null,blasts=[];
let state='loading',round=1,roundResults=[],collapsingAt=0,collapseDir=[1,0],collapseImpactTime=0;
let totalCrushed=0,totalBuildings=0,totalMines=0,roundCrushed=0,roundBuildings=0,roundMines=0;
let angleChoice=0,camYaw=.34,camDist=38,camTargetHeight=1.0,camFocus={x:-20.8,z:-2};
let ready=false,last=performance.now(),gameTime=0,pendingCelebration=null,messageEnds=0;
let audioContext=null;
const originalFoundation=()=>({...foundation,y:foundation.y||0,tiltX:0,tiltZ:0});
const tierHeight=()=>foundation.size[1]*foundation.scale;
function setState(next){state=next;const active=next!=='loading'&&next!=='intro'&&next!=='result';$('hud').hidden=!active;$('actions').hidden=!active;
 $('cleanup').disabled=!(next==='flying'||next==='collapseDone');$('cleanup').textContent=next==='collapseDone'?'收拾倒塌棉被':'收拾棉被';syncHUD()}
function syncHUD(){$('round').textContent=String(round);$('left').textContent=String(4-round);$('layers').textContent=String(state==='collapseDone'?0:stack.length)}
function say(message,seconds=1.25){$('message').textContent=message;$('message').classList.add('show');messageEnds=performance.now()+seconds*1000}
function startRound(){
 for(const o of things){o.crushed=false;o.broken=false;o.tiltX=0;o.tiltZ=0;o.model=o.originalModel||o.model}
 for(const m of mines){m.ignited=false;m.queued=0}
 stack=[originalFoundation()];flying=null;falling=null;blasts=[];roundCrushed=0;roundBuildings=0;roundMines=0;
 camFocus={x:foundation.x,z:foundation.z};camTargetHeight=1.5;camDist=36;
 spawnFlying();setState('flying');
}
function spawnFlying(){
 const directions=[0,Math.PI/2,Math.PI,3*Math.PI/2,Math.PI/4,5*Math.PI/4,3*Math.PI/4,7*Math.PI/4];
 angleChoice=(angleChoice+1+Math.floor(Math.random()*3))%directions.length;
 const dir=directions[angleChoice];const u=[Math.cos(dir),Math.sin(dir)],v=[-u[1],u[0]];
 const lane=(Math.random()-.5)*(stack.length<5?.7:1.15);
 const target=stack[stack.length-1];const range=6.4+Math.min(3,stack.length*.13);
 const obj={...foundation,uid:'flying',x:target.x-u[0]*range+v[0]*lane,z:target.z-u[1]*range+v[1]*lane,y:stack.length*tierHeight()+1.65,rot:foundation.rot,tiltX:0,tiltZ:0};
 flying={obj,dir:u,side:v,targetX:target.x,targetZ:target.z,lane,dist:-range,range,speed:4.3+Math.min(5.5,stack.length*.18),bob:0};
}
function dropFlying(){if(state!=='flying'||!flying)return;playTap();falling={o:{...flying.obj},velocity:0,landingY:stack.length*tierHeight(),time:0};flying=null;setState('dropping')}
function stackRisk(){
 const halfX=foundation.size[0]*foundation.scale*.5,halfZ=foundation.size[2]*foundation.scale*.5;
 let worst=0,mx=0,mz=0;
 for(let i=0;i<stack.length-1;i++){
  const above=stack.slice(i+1),cx=above.reduce((sum,o)=>sum+o.x,0)/above.length,cz=above.reduce((sum,o)=>sum+o.z,0)/above.length;
  const dx=(cx-stack[i].x)/Math.max(.3,halfX*.91),dz=(cz-stack[i].z)/Math.max(.3,halfZ*.91);
  const risk=Math.hypot(dx,dz)*(1+Math.min(.31,(stack.length-i-1)*.013));
  if(risk>worst){worst=risk;mx=cx-stack[i].x;mz=cz-stack[i].z}
 }
 const lastLayer=stack[stack.length-1],below=stack[stack.length-2];
 if(below){const dx=Math.abs(lastLayer.x-below.x),dz=Math.abs(lastLayer.z-below.z);if(dx>halfX*1.6||dz>halfZ*1.6)worst=2}
 return {value:worst,dx:mx,dz:mz};
}
function landBlanket(){
 const landed=falling.o;landed.y=stack.length*tierHeight();landed.tiltX=0;landed.tiltZ=0;stack.push(landed);falling=null;
 const risk=stackRisk();
 if(risk.value>=1){beginCollapse(risk);return}
 if(stack.length%10===0)say('成功疊到 '+stack.length+' 層！',1.35);
 else if(risk.value>.75)say('棉被塔正在晃！',1.05);
 spawnFlying();setState('flying');
}
function beginCollapse(risk){
 for(const o of stack){o.baseX=o.x;o.baseZ=o.z;o.baseY=o.y}
 setState('collapsing');collapsingAt=0;collapseImpactTime=0;let dx=risk.dx,dz=risk.dz;
 if(Math.hypot(dx,dz)<.2){dx=stack[stack.length-1].x-foundation.x;dz=stack[stack.length-1].z-foundation.z}
 if(Math.hypot(dx,dz)<.15){const a=Math.random()*TAU;dx=Math.cos(a);dz=Math.sin(a)}
 const d=Math.hypot(dx,dz)||1;collapseDir=[dx/d,dz/d];
 say('棉被塔倒塌！',2.4);playCollapse();
}
function squashPoint(x,z,r,reason='blanket'){
 for(const o of soldiers){if(o.crushed||Math.hypot(o.x-x,o.z-z)>r)continue;o.crushed=true;o.tiltZ=1.26;o.y=Math.max(0,(o.y||0)-.25);roundCrushed++;totalCrushed++;}
 for(const o of buildings){if(o.broken||Math.hypot(o.x-x,o.z-z)>r+Math.max(o.size[0],o.size[2])*.25)continue;o.broken=true;roundBuildings++;totalBuildings++;const fracture=cleanPath(o.destructible?.fracturedModel);if(fracture){o.originalModel=o.originalModel||o.model;o.model=fracture;void ensureModel(o)} }
}
function detonateMine(m){if(m.ignited)return;m.ignited=true;m.queued=0;roundMines++;totalMines++;const radius=9.5;
 blasts.push({x:m.x,z:m.z,time:0,radius,seed:Math.random()*TAU});playBlast();squashPoint(m.x,m.z,radius,'mine');
 for(const other of mines){if(!other.ignited&&!other.queued&&Math.hypot(other.x-m.x,other.z-m.z)<=radius*.9){other.queued=gameTime+.28+Math.random()*.25}}
}
function updateFall(dt){
 collapsingAt+=dt;
 const h=tierHeight();let front=0;
 for(let i=0;i<stack.length;i++){
  const o=stack[i],t=ease((collapsingAt-i*.025)/1.22),reach=i*h*.92*t;
  o.x=mix(o.baseX,foundation.x+collapseDir[0]*i*h*.92,t);
  o.z=mix(o.baseZ,foundation.z+collapseDir[1]*i*h*.92,t);
  o.y=Math.max(.06,o.baseY*(1-t)*.96);
  o.tiltZ=collapseDir[0]*t*1.48;o.tiltX=-collapseDir[1]*t*1.48;
  front=Math.max(front,reach);
  if(t>.63)squashPoint(o.x,o.z,1.55);
 }
 // A blanket must physically sweep over a mine before it can detonate.
 for(const m of mines){if(m.ignited||m.queued)continue;
  const dx=m.x-foundation.x,dz=m.z-foundation.z,along=dx*collapseDir[0]+dz*collapseDir[1],perp=Math.abs(dx*collapseDir[1]-dz*collapseDir[0]);
  if(along>=0&&along<=front+1.2&&perp<=1.60)detonateMine(m);
 }
 if(collapsingAt>Math.max(2.8,stack.length*.03+2)){setState('collapseDone');say('本輪 0 層',2.1)}
}
function updateGame(dt){
 gameTime+=dt;
 if(state==='flying'&&flying){
  const f=flying;f.dist+=f.speed*dt;if(f.dist>f.range)f.dist=-f.range;
  f.bob+=dt*4;f.obj.x=f.targetX+f.dir[0]*f.dist+f.side[0]*f.lane;f.obj.z=f.targetZ+f.dir[1]*f.dist+f.side[1]*f.lane;
  f.obj.y=stack.length*tierHeight()+1.48+Math.sin(f.bob)*.09;
 }else if(state==='dropping'&&falling){
  falling.time+=dt;falling.velocity+=27*dt;falling.o.y=Math.max(falling.landingY,falling.o.y-falling.velocity*dt);
  if(falling.o.y<=falling.landingY+.002)landBlanket();
 }else if(state==='collapsing')updateFall(dt);
 for(const m of mines){if(m.queued&&gameTime>=m.queued){m.queued=0;detonateMine(m)}}
 blasts=blasts.filter(b=>(b.time+=dt)<1.65);
 const desired=state==='collapsing'||state==='collapseDone'?Math.max(45,22+stack.length*tierHeight()*1.6):Math.max(29,32+stack.length*tierHeight()*.64);
 camDist=mix(camDist,desired,Math.min(1,dt*1.65));
 const targetHeight=state==='collapsing'||state==='collapseDone'?stack.length*tierHeight()*.3:Math.max(1.5,stack.length*tierHeight()*.67);
 camTargetHeight=mix(camTargetHeight,targetHeight,Math.min(1,dt*2.2));
}
function finishRound(){
 if(!['flying','collapseDone'].includes(state))return;
 const score=state==='collapseDone'?0:stack.length;
 roundResults.push({layers:score,collapsed:state==='collapseDone',friends:roundCrushed,buildings:roundBuildings,mines:roundMines});
 if(round>=3){showResult();return}
 round++;startRound();say('第 '+round+' 輪',1.2);
}
function showResult(){setState('result');$('actions').hidden=true;$('hud').hidden=true;
 const best=Math.max(...roundResults.map(r=>r.layers));const total=roundResults.reduce((n,r)=>n+r.layers,0);
 const score=cap(Math.round(1+Math.min(70,best*2.25)+Math.min(20,total*.35)+(best>0?Math.max(0,9-totalMines*3-totalCrushed*.16-totalBuildings*2):0)),1,100);
 try{const key='ARMY3_blanket_progress_v1';const old=JSON.parse(localStorage.getItem(key)||'{}');localStorage.setItem(key,JSON.stringify({best:Math.max(old.best||0,best),last:roundResults,played:(old.played||0)+1,highestTotal:Math.max(old.highestTotal||0,total),lastScore:score,highScore:Math.max(old.highScore||0,score),savedAt:Date.now()}))}catch{}
 const t=$('modal');t.replaceChildren();
 const title=document.createElement('h1');title.textContent='棉被鑑測結算';t.append(title);
 const big=document.createElement('div');big.className='big';big.textContent=score+' 分';t.append(big);const summary=document.createElement('p');summary.textContent='最高 '+best+' 層　·　累計 '+total+' 層';t.append(summary);
 const result=document.createElement('div');result.id='scores';result.innerHTML=roundResults.map((r,i)=>`<div><small>第 ${i+1} 輪</small>${r.layers} 層</div>`).join('');t.append(result);
 if(totalCrushed||totalBuildings||totalMines){const p=document.createElement('p');p.textContent=`友軍 ${totalCrushed}　建築 ${totalBuildings}　地雷 ${totalMines}`;t.append(p)}
 const back=document.createElement('button');back.textContent='返回軍營';back.onclick=()=>returnToCamp();t.append(back);
 const again=document.createElement('button');again.className='secondary';again.textContent='再玩一次';again.onclick=()=>{round=1;roundResults=[];totalCrushed=0;totalBuildings=0;totalMines=0;$('overlay').hidden=true;startRound()};t.append(again);
 $('overlay').hidden=false;
}
function worldToScreen(x,y,z,vp){
 const w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];if(w<=.01)return null;
 return{x:(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w,y:(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w}
}
let firstRender=false;
function camera(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),ratio=w/h,portrait=ratio<.8;
 const pitch=state==='collapsing'||state==='collapseDone'?.48:.39;
 const target=[camFocus.x,camTargetHeight,camFocus.z];
 const eye=[target[0]+camDist*Math.sin(camYaw)*Math.cos(pitch),target[1]+camDist*Math.sin(pitch),target[2]+camDist*Math.cos(camYaw)*Math.cos(pitch)];
 return mul(pers(portrait?50:53,ratio,.1,850),lookAt(eye,target));
}
function draw(){
 if(!gl)return;
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),ratio=Math.min(window.devicePixelRatio||1,1.45);
 const cw=Math.max(1,Math.round(w*ratio)),ch=Math.max(1,Math.round(h*ratio));
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
 gl.viewport(0,0,cw,ch);gl.clearColor(.63,.78,.83,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const vp=camera();gl.useProgram(originalGroundProgram);lastUsed=originalGroundProgram;
 gl.uniformMatrix4fv(gl.getUniformLocation(originalGroundProgram,'uVP'),false,vp);gl.bindVertexArray(originalGroundVAO);gl.disable(gl.CULL_FACE);gl.drawArrays(gl.TRIANGLES,0,originalGroundCount);gl.enable(gl.CULL_FACE);
 const far=state==='collapsing'||state==='collapseDone'?105:Math.max(45,camDist*1.65);
 // Draw opaque static objects first; soldiers use the game's animated skinned model.
 let soldierDrawn=0;
 for(const o of things){
  if(o.category==='mine'&&o.ignited)continue;
  if(Math.hypot(o.x-camFocus.x,o.z-camFocus.z)>far)continue;
  const ndc=worldToScreen(o.x,Math.min(1.2,(o.size?.[1]||1)*.4),o.z,vp);
  if(!ndc||Math.abs(ndc.x)>1.4||Math.abs(ndc.y)>1.38)continue;
  if(o.category==='soldier'&&++soldierDrawn>115)continue;
  if(!cache.has(modelPath(o)))continue;
  drawModel(o,vp);
 }
 for(const o of stack)drawModel(o,vp);
 if(flying)drawModel(flying.obj,vp);
 if(falling)drawModel(falling.o,vp);
 for(const b of blasts){const t=b.time/1.65,r=b.radius*ease(Math.min(1,t*1.9));drawRing(vp,b.x,b.z,r,[1,.48+.24*t,.14],.24);
  if(t<.5){for(let j=0;j<7;j++){const a=b.seed+j*TAU/7,rr=t*13;flatDraw(vp,mul(T(b.x+Math.cos(a)*rr,.3+Math.sin(t*Math.PI)*1.5,b.z+Math.sin(a)*rr),S(.25+(.5-t),.25+(.5-t),.25+(.5-t))),[1,.66,.24])}}
 }
 // Overlay explosion glow tracks the real 3D mine positions.
 const visibleBoom=blasts.find(b=>b.time<1.25);
 const glow=$('boomFlash');
 if(visibleBoom){const pt=worldToScreen(visibleBoom.x,.5,visibleBoom.z,vp);
  if(pt){glow.style.left=((pt.x+1)*.5*w)+'px';glow.style.top=((1-pt.y)*.5*h)+'px';glow.style.width=Math.max(110,Math.min(460,(visibleBoom.radius*(.5+visibleBoom.time)*w/camDist)*1.9))+'px';glow.style.height=glow.style.width;glow.style.opacity=String(Math.max(0,.75-visibleBoom.time*.6))}
 }else glow.style.opacity='0';
 gl.bindVertexArray(null);
 if(!firstRender){firstRender=true}
}
function playTap(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audioContext=audioContext||new C();if(audioContext.state==='suspended')void audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime;o.type='triangle';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(90,t+.14);g.gain.setValueAtTime(.1,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.2)}catch{}}
function playCollapse(){playTap()}
function playBlast(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audioContext=audioContext||new C();const t=audioContext.currentTime,n=Math.round(audioContext.sampleRate*.65),buff=audioContext.createBuffer(1,n,audioContext.sampleRate),data=buff.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const node=audioContext.createBufferSource(),low=audioContext.createBiquadFilter(),gain=audioContext.createGain();node.buffer=buff;low.type='lowpass';low.frequency.value=480;gain.gain.setValueAtTime(.35,t);gain.gain.exponentialRampToValueAtTime(.001,t+.61);node.connect(low);low.connect(gain);gain.connect(audioContext.destination);node.start(t);node.stop(t+.65)}catch{}}
function tick(now){
 try{
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(ready&&state!=='result'&&state!=='intro'&&state!=='loading')updateGame(dt);
  if($('message').classList.contains('show')&&now>messageEnds)$('message').classList.remove('show');
  if(ready)draw();
  requestAnimationFrame(tick);
 }catch(e){console.error('棉被遊戲迴圈失敗',e);fatal(e)}
}
function fatal(e){$('reason').textContent=String(e?.message||e);$('fatal').hidden=false}
async function boot(){
 if(!gl){fatal(new Error('此裝置無法使用 WebGL2'));return}
 try{
  const resp=await fetch('./blanket-stack-scene.json?v=146',{cache:'no-cache'});
  if(!resp.ok)throw Error('無法下載玩家設定的棉被場景：HTTP '+resp.status);
  scene=await resp.json();
  if(scene.format!=='army3-blanket-scene'||scene.schemaVersion!==1||!Array.isArray(scene.items))throw Error('棉被場景 JSON 格式不相容');
  foundation=scene.items.find(o=>o.uid===scene.foundationId&&o.category==='blanket');
  if(!foundation)throw Error('找不到你指定的第一層棉被');
  things=scene.items.filter(o=>o.category!=='blanket').map(o=>({...o}));
  for(const o of things){if(o.category==='mine')mines.push(o);else if(o.category==='soldier')soldiers.push(o);else if(o.category==='building')buildings.push(o)}
  camFocus={x:foundation.x,z:foundation.z};
  initGL();initRings();
  // Keep the opening responsive: load the actual blanket first, then mines and soldiers.
  const priority=[foundation,mines[0],soldiers[0]].filter(Boolean);
  for(let i=0;i<priority.length;i++){
   $('loadingText').textContent=['載入棉被模型…','準備骷髏地雷…','準備友軍模型…'][i];
   $('loadBar').style.width=((i+1)*25)+'%';await ensureModel(priority[i]);
  }
  if(!cache.has(modelPath(foundation)))throw Error('棉被 3D 模型未能載入');
  const group=[...new Map(things.filter(o=>modelPath(o)).map(o=>[modelPath(o),o])).values()]
    .filter(o=>!cache.has(modelPath(o)))
    .sort((a,b)=>Math.hypot(a.x-foundation.x,a.z-foundation.z)-Math.hypot(b.x-foundation.x,b.z-foundation.z));
  const launch=async()=>{let cursor=0;const worker=async()=>{while(cursor<group.length){const o=group[cursor++];await ensureModel(o);await new Promise(r=>setTimeout(r,35))}};await Promise.all([worker(),worker()])};
  void launch();
  stack=[originalFoundation()];state='intro';ready=true;
  $('loadingText').textContent='';$('loadLine').hidden=true;$('play').disabled=false;$('play').textContent='開始挑戰';$('loadBar').style.width='100%';
  $('play').onclick=()=>{$('overlay').hidden=true;round=1;roundResults=[];totalCrushed=0;totalBuildings=0;totalMines=0;startRound()};
  // Draw a real WebGL frame before unlocking start.
  draw();
 }catch(e){console.error('棉被遊戲初始化失敗',e);fatal(e)}
}
canvas.addEventListener('pointerdown',e=>{if(e.cancelable)e.preventDefault();if(state==='flying')dropFlying()},{passive:false});
$('cleanup').addEventListener('click',finishRound);
$('reload').addEventListener('click',()=>location.reload());
document.addEventListener('visibilitychange',()=>{last=performance.now()});
window.addEventListener('pageshow',()=>{last=performance.now()});
requestAnimationFrame(tick);
void boot();
// Exposed only for deterministic automated gameplay checks.
window.__blanketTest={get state(){return state},get layers(){return stack.length},get round(){return round},get mines(){return roundMines},get soldiers(){return roundCrushed},tap:dropFlying,cleanup:finishRound,collapse:()=>beginCollapse({dx:1,dz:0}),get scene(){return scene}};
