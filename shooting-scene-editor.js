/* ARMY3 shooting scene editor v1.00.
 * Uses the ORIGINAL grenade map editor (model loading, edit controls, collision,
 * ground and destructive asset paths), but keeps its state completely separate.
 * The first scene is a soldier-free clone of the deployed grenade-user-scene.json.
 * No changes to grenade-editor source, grenade scene or main game are needed.
 */
const SOURCE = new URL('./grenade-scene-editor.js?v=118', import.meta.url);
const BASE = new URL('./grenade-user-scene.json', import.meta.url);
const STORAGE = 'army-shooting-user-scenes-v1';
const SEED_ID = 'shooting-camp-live';
const status = document.getElementById('shootingStatus');
const loading = document.getElementById('loading');
function alertEditor(message) {
  if (status) { status.textContent = message; status.hidden = false; }
  console.error('[ARMY3 Shooting Editor]', message);
}
function assertReplace(source, oldText, newText, purpose) {
  if (!source.includes(oldText)) throw new Error('原版地圖編輯器已更新，無法安全接入「' + purpose + '」。');
  return source.replace(oldText, newText);
}

// Preserve each field used by the grenade scene's destruction pipeline. Only
// character objects are stripped; buildings, props and their fracturing refs stay.
function cleanSeed(raw) {
  if (raw?.format !== 'army-grenade-scene' || !Array.isArray(raw.items)) throw new Error('手榴彈場景 JSON 格式不正確');
  const items = raw.items.filter(o => o.category !== 'soldier' && o.team !== 'friendly' && o.team !== 'enemy');
  return {
    ...raw,
    format: 'army-shooting-scene',
    sceneId: SEED_ID,
    sceneName: '打靶場景｜可破壞軍營',
    exportedAt: new Date().toISOString(),
    totalObjects: items.length,
    items,
  };
}

function editorSyncFunction() {
  // This code runs inside the original editor module, where store, scene,
  // checkpoint, save, setMoveSelectedMode and ensureAsset already exist.
  return `function syncMainCamp(force=false){
 const data=window.__ARMY_SHOOTING_SEED;
 if(!data)throw Error('找不到打靶場景底圖');
 const id='${SEED_ID}';
 let old=store.scenes.find(s=>s.id===id);
 if(force&&old&&!confirm('還原手榴彈軍營底圖會清除目前「打靶場景」的修改！請先匯出 JSON 備份。確定還原嗎？'))return;
 if(!old||force){
  const refreshed={id,name:data.sceneName,serial:10000,sourceFingerprint:'shooting-base-v1',
   throwOrigin:data.throwOrigin,groundStyle:data.map?.groundStyle||'main-game',
   objects:data.items.map(o=>({...o}))};
  const idx=store.scenes.findIndex(s=>s.id===id);
  if(idx>=0)store.scenes[idx]=refreshed;else store.scenes.unshift(refreshed);
  old=refreshed;
 }
 scene=old;store.active=id;selected=null;history.length=0;future.length=0;
 setMoveSelectedMode(false);pivot={x:0,z:3};distance=145;yaw=.46;pitch=.98;
 save();listScenes();changed();
 const queue=[...new Map(scene.objects.filter(o=>hasModel(BY[o.assetId])).map(o=>{
  const a=BY[o.assetId],q=qualityOf(o);return [o.assetId+':'+q,[a,q]];})).values()];
 void Promise.all(Array.from({length:3},async()=>{while(queue.length){const [a,q]=queue.shift();await ensureAsset(a,q);}}));
 const buildings=scene.objects.filter(o=>o.category==='building').length;
 const props=scene.objects.filter(o=>o.category==='prop').length;
 const soldiers=scene.objects.filter(o=>o.category==='soldier').length;
 msg('打靶軍營已載入：'+buildings+' 棟建築、'+props+' 個環境道具、'+soldiers+' 名士兵；可破壞模型資料完整保留。');
}`;
}

function adaptOriginalEditor(source) {
  source = assertReplace(source, "const STORAGE='army-grenade-user-scenes-v1';", `const STORAGE='${STORAGE}';`, '獨立儲存');
  source = assertReplace(source, "name:'手榴彈場景 1'", "name:'打靶場景 1'", '場景名稱');
  source = assertReplace(source, "format:'army-grenade-scene'", "format:'army-shooting-scene'", '打靶匯出格式');
  source = assertReplace(source, "data.format!=='army-grenade-scene'", "!['army-shooting-scene','army-grenade-scene'].includes(data.format)", '匯入格式相容');
  source = assertReplace(source, "a.download=('手榴彈場景_'+scene.name.replace(/[\\/:*?\"<>|]/g,'_')+'.json');", "a.download='shooting-user-scene.json';", '打靶場景檔名');
  source = source.replaceAll('手榴彈場景', '打靶場景');
  const start = source.indexOf('function syncMainCamp(force=false){');
  const end = source.indexOf('\nasync function boot(){',start);
  if (start<0 || end<0) throw new Error('原版同步函式不相容，已停止以免破壞場景。');
  source = source.slice(0,start) + editorSyncFunction() + source.slice(end);
  // The original module's relative imports must retain their source URL base,
  // because it is evaluated from a temporary Blob module for isolation.
  source = source.replace(/(\bfrom\s+)(['"])(\.\/[^'"]+)\2/g,
    (_all,prefix,quote,path)=>prefix+quote+new URL(path,SOURCE).href+quote);
  return source;
}

async function launch(){
  try {
    const [sceneResponse,editorResponse] = await Promise.all([
      fetch(BASE,{cache:'no-cache'}),fetch(SOURCE,{cache:'no-cache'}),
    ]);
    if(!sceneResponse.ok)throw new Error('找不到原本手榴彈場景：'+sceneResponse.status);
    if(!editorResponse.ok)throw new Error('無法載入原版編輯器：'+editorResponse.status);
    const seed = cleanSeed(await sceneResponse.json());
    window.__ARMY_SHOOTING_SEED = seed;
    // No localStorage copying from grenade editor: the new workbench has an
    // independent namespace and persists after reopening this page.
    const src = adaptOriginalEditor(await editorResponse.text());
    const url = URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
    try { await import(url); }
    finally { URL.revokeObjectURL(url); }
  } catch(error) {
    alertEditor('打靶編輯器載入失敗：'+(error?.message||String(error)));
    if(loading){loading.textContent='載入失敗：'+(error?.message||String(error));loading.hidden=false;}
  }
}
launch();
