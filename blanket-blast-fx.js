// ARMY3 blanket game: same hot core / travelling fire-and-smoke front /
// hemispherical blast-bowl approach as the grenade game's drawExplosion().
// Kept in a reusable renderer so the stacking game's WebGL state stays isolated.
const vs=`#version 300 es
precision highp float;
layout(location=0) in vec3 p;
uniform mat4 uVP;uniform vec3 uCenter,uSize;
out vec3 vP;
void main(){vP=p;gl_Position=uVP*vec4(uCenter+p*uSize,1.);}`;
const fs=`#version 300 es
precision highp float;
in vec3 vP;uniform vec3 uColor;uniform float uAlpha,uHot,uTime;
out vec4 frag;
void main(){float pattern=sin(vP.x*17.+uTime*4.)*sin(vP.y*13.-uTime*2.)*sin(vP.z*15.+uTime*3.);
float lit=.64+.36*max(0.,dot(normalize(vP),normalize(vec3(-.33,.9,.64))));
float glow=mix(lit,.85+.40*pattern,uHot);
frag=vec4(uColor*glow,clamp(uAlpha*(.90+.10*pattern),0.,1.));}`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
function makeProgram(gl){const p=gl.createProgram();for(const [kind,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('爆炸 Shader：'+gl.getShaderInfoLog(s));gl.attachShader(p,s)}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('爆炸 Shader 連結：'+gl.getProgramInfoLog(p));return p}
function sphere(){const a=[],rows=13,cols=22;for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
 const th=i*Math.PI/rows,th2=(i+1)*Math.PI/rows,ph=j*Math.PI*2/cols,ph2=(j+1)*Math.PI*2/cols;
 const v=(t,p)=>[Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)];
 a.push(...v(th,ph),...v(th2,ph),...v(th2,ph2),...v(th,ph),...v(th2,ph2),...v(th,ph2));}
 return new Float32Array(a);
}
export function createGrenadeStyleBlastFX(gl){
 const program=makeProgram(gl),mesh=sphere(),vao=gl.createVertexArray(),buf=gl.createBuffer();
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 const loc={vp:gl.getUniformLocation(program,'uVP'),pos:gl.getUniformLocation(program,'uCenter'),size:gl.getUniformLocation(program,'uSize'),col:gl.getUniformLocation(program,'uColor'),alpha:gl.getUniformLocation(program,'uAlpha'),hot:gl.getUniformLocation(program,'uHot'),time:gl.getUniformLocation(program,'uTime')};
 function draw(vp,blasts){if(!blasts.length)return;
  gl.useProgram(program);gl.uniformMatrix4fv(loc.vp,false,vp);gl.bindVertexArray(vao);
  gl.enable(gl.BLEND);gl.depthMask(false);gl.disable(gl.CULL_FACE);
  const blob=(x,y,z,sx,sy,sz,r,g,b,alpha,hot)=>{if(alpha<=.015)return;gl.uniform3f(loc.pos,x,y,z);gl.uniform3f(loc.size,sx,sy,sz);gl.uniform3f(loc.col,r,g,b);gl.uniform1f(loc.alpha,alpha);gl.uniform1f(loc.hot,hot);gl.drawArrays(gl.TRIANGLES,0,mesh.length/3)};
  for(const blast of blasts){const t=blast.time,r=blast.radius,progress=smooth(t/1.85),wave=Math.max(.05,r*progress),life=Math.max(0,1-t/3.7),seed=blast.seed||0;
   gl.uniform1f(loc.time,t);
   // Scorched surface, hot fireball and rising central mushroom column.
   gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   blob(blast.x,.205,blast.z,r*.78,.018,r*.78,.14,.125,.115,.50*progress,0);
   const hot=clamp(1-t/1.35,0,1),core=Math.min(3.6,.4+t*4.2);
   if(t<1.6){gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    blob(blast.x,1.0+core*.38,blast.z,core,core*.95,core,1.,.42+hot*.3,.09,hot*.86,1);
    blob(blast.x,1.2+core*.36,blast.z,core*.72,core*.85,core*.72,1.,.85,.28,hot*.72,1);}
   // Grenade-style advancing orange fire ring and darker trailing smoke.
   if(t<2.5){const fade=clamp(1-t/2.5,0,1),n=innerWidth<500?14:22,blobWidth=Math.max(.42,wave*.19);
    for(let i=0;i<n;i++){
     const a=Math.PI*2*(i+.14*Math.sin(i*7.31+t*2))/n+seed,wobble=.97+.035*Math.sin(i*2.7+t*3),rad=wave*wobble;
     const x=blast.x+Math.cos(a)*rad,z=blast.z+Math.sin(a)*rad;
     gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
     blob(x,.40+blobWidth*.38,z,blobWidth*.86,blobWidth*.8,blobWidth*.86,1.,.53+.12*Math.sin(i*3.2+t*5),.09,.55*fade,1);
     if(i%2===0){gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      blob(blast.x+Math.cos(a)*rad*.83,blobWidth*.85+.35,blast.z+Math.sin(a)*rad*.83,blobWidth*.9,blobWidth*.74,blobWidth*.9,.28,.27,.25,.50*fade,0);}
    }
   }
   // Rounded blast bowl expands outward, matching the grenade visual language.
   if(t<2.6){gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const shellR=Math.max(.3,wave*.98),shellH=Math.max(.18,Math.pow(shellR,.78)*.72),alpha=(.25-.12*progress)*clamp(1-t/2.6,0,1);
    blob(blast.x,shellH*.42,blast.z,shellR,shellH,shellR,1.,.56,.12,alpha,.55);
    blob(blast.x,shellH*.34,blast.z,shellR*.82,shellH*.78,shellR*.82,.24,.21,.19,alpha*.55,0);
   }
   // Smoke puffs linger after the flash instead of vanishing at impact.
   gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   for(let i=0;i<(innerWidth<500?4:6);i++){const a=i*2.399+seed*11,rad=(1.1+t*(.65+i*.13)),s=(1.4+(i%3)*.4+t*.68)*Math.min(1,t*3.3);
    blob(blast.x+Math.cos(a)*rad,.95+i*.23+t*(1.15+i*.17),blast.z+Math.sin(a)*rad,s,s*.86,s,.28+i*.018,.27+i*.02,.25+i*.025,life*.64,0)}
  }
  gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.bindVertexArray(null);
 }
 return {draw};
}
