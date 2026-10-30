/* ARMY3 高塔狙擊 v1.31: reuse existing ARMY3 camp WebGL, destructible GLB environment and actual rifle GLB. */
import {loadGlb} from './src/core/glb111.js';
import {RifleRenderer} from './src/training/rifleRenderer.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const state={ready:false,error:null,world:null,actors:[],barrels:[],view:null,loading:true,rifle:null,lastTime:0};
const $=id=>document.getElementById(id);
const SOURCE='./grenade-user-play-3d.js?v=130';
const matMul=(a,b)=>{const o=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[i+j*4]+=a[i+k*4]*b[k+j*4];return o;};
const matT=(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
const matS=s=>new Float32Array([s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1]);
const matRY=a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);};
function patch(src,needle,replace,label){if(!src.includes(needle))throw Error('原版軍營渲染器與打靶版本不相容（'+label+'）');return src.replace(needle,replace);}
function batchFunction(){return `  drawHighFriendlySoldiers(vp){
    if(this.modelState!=='ready'||!this.soldierAssets?.high)return;
    this.setupHighFriendlyBatch();
    const g=this.gl,sa=this.soldierAssets.high;
    const now=performance.now(),dt=Math.min(.035,Math.max(.001,(now-(this.lastFriendlyTime||now))/1000));this.lastFriendlyTime=now;
    if(!this.shootingRunRigs){this.shootingRunRigs=[];for(let i=0;i<3;i++){
      const rig=sa.makeAnim();rig.setClip(rig.hasClip('Running')?'Running':'Walking',{restart:true});rig.clock=i*.23;this.shootingRunRigs.push(rig);}
      this.shootingFallRigs=[];for(let i=0;i<3;i++){const rig=sa.makeAnim();rig.setClip(rig.hasClip('Knock_Down')?'Knock_Down':'Idle',{restart:true});this.shootingFallRigs.push(rig);}}
    this.shootingRunRigs.forEach(r=>r.evaluate(dt));this.shootingFallRigs.forEach(r=>r.evaluate(dt));
    const actors=this.actors.filter(a=>this.visibleDuringFlight(a.px,(a.renderLift||0)+1.05,a.pz,2*(a.scale||1)));
    if(!actors.length)return;
    const groups=[];
    for(const enemy of [false,true])for(let i=0;i<3;i++)for(const hit of [false,true]){
      const members=actors.filter(a=>a.enemy===enemy&&a.hit===hit&&((a.id||0)%3)===i);
      if(members.length)groups.push({members,rig:hit?this.shootingFallRigs[i]:this.shootingRunRigs[i],enemy});}
    g.useProgram(this.friendlyBatchProg);const u=n=>g.getUniformLocation(this.friendlyBatchProg,n);
    g.uniformMatrix4fv(u('uVP'),false,vp);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,sa.tex);g.uniform1i(u('uTex'),0);
    g.bindVertexArray(this.friendlyBatch.vao);g.disable(g.CULL_FACE);
    for(const {members,rig,enemy} of groups){const instances=new Float32Array(members.length*7);
      for(let i=0;i<members.length;i++){const a=members[i],p=i*7;instances[p]=a.px;instances[p+1]=a.renderLift||0;instances[p+2]=a.pz;instances[p+3]=a.angle;instances[p+4]=a.scale||1;instances[p+5]=a.hit?1:0;instances[p+6]=a.seed||0;}
      g.bindBuffer(g.ARRAY_BUFFER,this.friendlyBatch.buffer);g.bufferData(g.ARRAY_BUFFER,instances,g.DYNAMIC_DRAW);
      g.uniform1f(u('uRed'),enemy?1:0);g.uniformMatrix4fv(u('uBones[0]'),false,rig.bones);
      g.drawElementsInstanced(g.TRIANGLES,sa.geo.count,sa.geo.type,0,members.length);
    }
    g.enable(g.CULL_FACE);g.bindVertexArray(null);
  }
`}
window.__armyShooting3D={
  ready:()=>state.ready,
  sync(actors,barrels,view){state.actors=actors;state.barrels=barrels;state.view=view;},
  status:()=>({ready:state.ready,loading:state.loading,error:state.error,modelState:state.world?.modelState}),
  explode(x,z,uid){const w=state.world;if(!state.ready||!w)return;
    const p=w.campProps?.find(p=>p.uid===uid);if(p&&!p.hit){w.impact=[x,z];w.explodeProp(p);}
    w.setLanding(x,z,true);w.beginTestPower(30);w.camPhase='intro';},
  reset(){const w=state.world;if(!w||!state.ready)return;
    w.resetDetailed();w.radius=-1;w.blastHistory=[];w.blastMax=0;w.timer=0;w.camPhase='intro';w.actors=[];state.lastTime=0;},
};
async function boot(){try{
  const response=await fetch(SOURCE,{cache:'default'});if(!response.ok)throw Error('原版 3D 渲染器 HTTP '+response.status);
  let src=await response.text();
  // Keep all existing building and prop placements; load the user-edited shooting scene directly.
  src=patch(src,"fetch('./grenade-user-scene.json?v=130')","fetch('./shooting-user-scene.json?v=130')",'射擊場景 JSON');
  src=patch(src,"const REMOVED_THROW_LANE_FENCES=new Set(['main-prop-134','main-prop-171','main-prop-172','main-prop-173','main-prop-174','main-prop-175','main-prop-176','main-prop-177','main-prop-178']);","const REMOVED_THROW_LANE_FENCES=new Set();",'保留圍欄');
  src=patch(src,"const PLAYER_ITEM=ITEMS.find(v=>v.uid===(USER_SCENE.throwerUid||'g10001'));","const PLAYER_ITEM={uid:'shooting-watchtower-player',x:41.76,z:33.36,rot:0,scale:1};",'高塔玩家');
  src=patch(src,"const ALL_RED=ITEMS.filter(v=>v.team==='enemy');","const ALL_RED=Array.from({length:36},(_,i)=>({uid:'setup-enemy-'+i,team:'enemy',x:-4+i%9,z:6+Math.floor(i/9),rot:0,scale:1}));",'射擊 NPC 初始化');
  // Substitute the independent 200-NPC simulation as soon as scene GLBs finish loading.
  src=patch(src,"return this.actors.filter(a=>a.enemy);","return window.__armyShootingView?[]:this.actors.filter(a=>a.enemy);",'跳過重複士兵逐人繪製');
  const projection='const vp=mul(pers(54,c.width/c.height,.2,19000),lookAt(eye,tgt));';
  src=patch(src,projection,`const fps=window.__armyShootingView;
   if(fps){const angle=fps.yaw,tilt=fps.pitch,cos=Math.cos(tilt),sin=Math.sin(tilt);
     eye=fps.eye;tgt=[eye[0]+Math.sin(angle)*cos*28,eye[1]+sin*28,eye[2]+Math.cos(angle)*cos*28];dist=90;}
   const vp=mul(pers(fps?.fov||54,c.width/c.height,.2,19000),lookAt(eye,tgt));`,'第一人稱透視視角');
  src=patch(src,'for(const a of [...visibleActors,this.thrower]){','for(const a of (window.__armyShootingView?[]:[...visibleActors,this.thrower])){','隱藏原本投擲者');
  src=patch(src,'this.drawHighFriendlySoldiers(vp);this.drawCampProps(vp,dist);this.drawDetailed(vp,dist);',
    'this.drawHighFriendlySoldiers(vp);this.drawCampProps(vp,dist);this.drawDetailed(vp,dist);if(window.__armyShootingView)window.__armyShootingExternalDrawRifle?.(vp,this);',
    '狙擊步槍與軍營繪製');
  // Green and red troops all use GPU skin instancing, 3 shared run phases / team.
  const beg=src.indexOf(' drawHighFriendlySoldiers(vp){'),end=src.indexOf(' drawDetailed(vp,dist){',beg);
  if(beg<0||end<0)throw Error('無法找到原版 NPC 批次渲染函式');
  src=src.slice(0,beg)+batchFunction()+src.slice(end);
  src=patch(src,'precision highp float;in vec2 vUV;in vec3 vN;uniform sampler2D uTex;out vec4 frag;',
    'precision highp float;in vec2 vUV;in vec3 vN;uniform sampler2D uTex;uniform float uRed;out vec4 frag;',
    '紅軍實例化染色 uniform');
  src=patch(src,'void main(){vec3 col=texture(uTex,vUV).rgb;float l=.70+.31*max(0.,dot(normalize(vN),normalize(vec3(-.4,1.1,.55))));frag=vec4(col*l,1.);}',
    "void main(){vec3 col=texture(uTex,vUV).rgb;float l=.70+.31*max(0.,dot(normalize(vN),normalize(vec3(-.4,1.1,.55))));float cloth=smoothstep(.025,.10,col.g-col.r)*smoothstep(.055,.13,col.g-col.b);col=mix(col,vec3(min(1.,col.g*1.58),col.g*.47,col.g*.38),uRed*cloth);frag=vec4(col*l,1.);}",
    '紅軍共用骨架材質');
  // Tint only existing barrels, using their original GLB UVs; tower is a separate new GLB.
  src=patch(src,"drawStaticMesh(geo,tex,model,vp){","drawStaticMesh(geo,tex,model,vp,tint=null){",'可調色 GLB 繪製');
  src=patch(src,"g.uniform3f(g.getUniformLocation(p,'uTint'),1,1,1);g.uniform3fv(g.getUniformLocation(p,'uInnerColor'),geo.innerColor||[.42,.41,.37]);",
    "g.uniform3fv(g.getUniformLocation(p,'uTint'),tint||[1,1,1]);g.uniform3fv(g.getUniformLocation(p,'uInnerColor'),geo.innerColor||[.42,.41,.37]);",
    'GLB 色調參數');
  src=patch(src,'this.drawStaticMesh(a.geo,a.tex,model2,vp);',
    "this.drawStaticMesh(a.geo,a.tex,model2,vp,p.type==='barrel'?[1.58,.31,.25]:p.type==='watchtower'?[.42,.51,.43]:null);",
    '紅桶與高塔色調');
  // Preserve existing project imports: Blob modules have no relative import base URL.
  src=src.replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\/[^'"\n]+)\2/g,(_,prefix,quote,path)=>prefix+quote+new URL(path,location.href).href+quote);
  const blob=new Blob([src+'\n//# sourceURL=shooting-original-camp-v131.js'],{type:'text/javascript'}),url=URL.createObjectURL(blob);
  try{await import(url);}finally{URL.revokeObjectURL(url);}
  const w=window.GrenadeWorld;if(!w)throw Error('原版 WebGL 軍營未建立');state.world=w;
  if(!w.gl?.createVertexArray)throw Error('本裝置不支援 WebGL2，無法顯示原版 3D GLB 軍營');
  // Load the original ARMY3 rifle as an actual 3D gun, with its original vertex colors.
  try{const rifleGlb=await loadGlb('./assets/weapons/rifle.glb');state.rifle=new RifleRenderer(w.gl);state.rifle.addModel(rifleGlb);}
  catch(err){console.warn('原版 3D 步槍載入失敗，仍可使用準星射擊',err);}
  window.__armyShootingExternalDrawRifle=(vp,world)=>{
    const view=state.view,rifle=state.rifle;if(!view||!rifle?.weapon||view.zoom)return;
    const theta=view.yaw,phi=view.pitch,cy=Math.cos(theta),sy=Math.sin(theta),cp=Math.cos(phi),sp=Math.sin(phi);
    const forward=[sy*cp,sp,cy*cp],right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp];
    const e=view.eye,recoil=(view.flinch||0)*.007;
    const px=e[0]+forward[0]*(.96-recoil)+right[0]*.34-up[0]*.38;
    const py=e[1]+forward[1]*(.96-recoil)+right[1]*.34-up[1]*.38;
    const pz=e[2]+forward[2]*(.96-recoil)+right[2]*.34-up[2]*.38;
    const model=matMul(matT(px,py,pz),matMul(matRY(theta-Math.PI/2),matS(.35)));
    const g=world.gl;
    // Optional first-person weapon must NEVER stop the destructible camp render loop.
    // WebGL drawElements(mode, count, type, offset) REQUIRES the byte offset.
    try {
      g.useProgram(rifle.program);g.uniformMatrix4fv(rifle.vp,false,vp);g.uniformMatrix4fv(rifle.model,false,model);
      g.disable(g.CULL_FACE);g.bindVertexArray(rifle.weapon.vao);
      g.drawElements(g.TRIANGLES,rifle.weapon.count,rifle.weapon.type,0);
      if((view.flinch||0)>6){g.bindVertexArray(rifle.flash.vao);g.drawElements(g.TRIANGLES,rifle.flash.count,rifle.flash.type,0);}
    }catch(error){
      console.warn('[Army Shooting] Optional rifle visual failed; continuing camp render',error);
      state.rifle=null;
    }finally{g.bindVertexArray(null);g.enable(g.CULL_FACE);}

  };
  function frame(ms){const dt=clamp((ms-(state.lastTime||ms))/1000,0,.048);state.lastTime=ms;const {view,actors,barrels}=state;
    if(view)window.__armyShootingView=view;
    if(w.modelState==='ready'&&!state.ready){state.ready=true;w.actors=[];}
    if(state.ready&&view&&!document.getElementById('hud')?.hidden){
      w.actors=actors.map(a=>({uid:'shooting-'+a.id,id:a.id,px:a.x,pz:a.z,x:a.x,z:a.z,angle:a.angle,scale:1,
        renderLift:a.lift||0,enemy:a.team==='red',hit:!a.alive,seed:a.phase/6.28,shootingAction:'run'}));
      // The original engine handles the exact building meshes, blast shockwave and fractured debris.
      if(w.radius>=0){const finished=w.advance(dt);if(finished){w.finishBlast();w.radius=-1;}}
      w.camPhase='intro';w.draw();
      if(w.modelState==='render-failed'){state.error=String(w.renderError||'WebGL 渲染中斷');state.ready=false;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }catch(err){state.error=String(err?.message||err);console.error('[ARMY 高塔狙擊 3D]',err);}finally{state.loading=false;}}
boot();
