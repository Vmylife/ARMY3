// ARMY3 survivors pressure test: one skinned draw per far crowd animation pose.
// Close enemies retain the original independently animated combat renderer.
import {ArmyRenderer,SKIN_VS,SKIN_FS} from '../battle-test/renderer.js?v=2';

function shader(gl,type,source){
 const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('群眾 shader：'+gl.getShaderInfoLog(sh));
 return sh;
}
function buildProgram(gl,vs,fs){
 const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));
 gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('群眾 shader 連結：'+gl.getProgramInfoLog(p));
 return p;
}
const CROWD_VS=SKIN_VS
 .replace('uniform mat4 uVP,uModel;','uniform mat4 uVP;')
 .replace('uniform mat4 uVP;','layout(location=5) in vec4 instance0;layout(location=6) in vec4 instance1;layout(location=7) in vec4 instance2;layout(location=8) in vec4 instance3;uniform mat4 uVP;')
 .replace('void main(){ivec4 ji=', 'void main(){mat4 uModel=mat4(instance0,instance1,instance2,instance3);ivec4 ji=');
export class CrowdRenderer extends ArmyRenderer{
 constructor(canvas){
  super(canvas);const gl=this.gl;
  this.crowdProgram=buildProgram(gl,CROWD_VS,SKIN_FS);
  this.crowdUniforms={
   vp:gl.getUniformLocation(this.crowdProgram,'uVP'),
   bones:gl.getUniformLocation(this.crowdProgram,'uBones[0]'),
   tex:gl.getUniformLocation(this.crowdProgram,'uTexture'),
   tint:gl.getUniformLocation(this.crowdProgram,'uEnemyTint')
  };
  this.maxCrowd=320;
  this.instanceBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,this.maxCrowd*16*4,gl.DYNAMIC_DRAW);
  this.transforms=new Float32Array(this.maxCrowd*16);
  gl.bindBuffer(gl.ARRAY_BUFFER,null);
 }
 async addModel(name,gltf,options){
  await super.addModel(name,gltf,options);
  if(name!=='lifeRecruit')return;
  const gl=this.gl,a=this.assets.get(name);
  gl.bindVertexArray(a.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);
  for(let col=0;col<4;col++){
   const ix=5+col;gl.enableVertexAttribArray(ix);
   gl.vertexAttribPointer(ix,4,gl.FLOAT,false,64,col*16);
   gl.vertexAttribDivisor(ix,1);
  }
  gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);
 }
 drawCrowd(name,actors,pose){
  if(!actors.length)return 0;
  const gl=this.gl,a=this.assets.get(name);if(!a||!pose)return 0;
  let drawn=0;
  gl.useProgram(this.crowdProgram);
  gl.uniformMatrix4fv(this.crowdUniforms.vp,false,this.vp);
  gl.uniformMatrix4fv(this.crowdUniforms.bones,false,pose.bones);
  gl.uniform1f(this.crowdUniforms.tint,1);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,a.tex);
  gl.uniform1i(this.crowdUniforms.tex,0);
  gl.bindVertexArray(a.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);
  for(let start=0;start<actors.length;start+=this.maxCrowd){
   const count=Math.min(this.maxCrowd,actors.length-start);
   for(let i=0;i<count;i++){
    const n=actors[start+i],off=i*16,c=Math.cos(n.angle),s=Math.sin(n.angle);
    const a=this.transforms;
    a[off]=c;a[off+1]=0;a[off+2]=-s;a[off+3]=0;
    a[off+4]=0;a[off+5]=1;a[off+6]=0;a[off+7]=0;
    a[off+8]=s;a[off+9]=0;a[off+10]=c;a[off+11]=0;
    a[off+12]=n.pos.x;a[off+13]=0;a[off+14]=n.pos.z;a[off+15]=1;
   }
   gl.bufferSubData(gl.ARRAY_BUFFER,0,this.transforms.subarray(0,count*16));
   gl.drawElementsInstanced(gl.TRIANGLES,a.count,a.indexType,0,count);
   drawn+=count;
  }
  gl.bindVertexArray(null);
  return drawn;
 }
}
