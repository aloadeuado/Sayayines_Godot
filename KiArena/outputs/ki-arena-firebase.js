(()=>{
  const cfg=window.KI_ARENA_FIREBASE;
  if(!cfg)return;
  const base=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${encodeURIComponent(cfg.databaseId)}/documents`;
  const collection=`${base}/${cfg.collectionPath}`;
  const status=document.querySelector('#firebase-status');
  const setStatus=(text,ok=false)=>{if(status){status.textContent=text;status.dataset.ok=ok?'true':'false'}};
  const toFields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v===null?{nullValue:null}:typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(Math.floor(v))}:{stringValue:String(v)}]));
  const fromFields=o=>Object.fromEntries(Object.entries(o||{}).map(([k,v])=>[k,v.stringValue??v.integerValue??v.doubleValue??v.booleanValue??null]));
  async function request(url,options={}){const response=await fetch(`${url}${url.includes('?')?'&':'?'}key=${encodeURIComponent(cfg.apiKey)}`,options);if(!response.ok){const message=await response.text();throw new Error(`Firestore ${response.status}: ${message.slice(0,180)}`)}return response.status===204?null:response.json()}
  function usernameKey(s){return String(s||'').trim().toLowerCase()}
  function playerDoc(user,progress={}){const username=user.username||user.name||'';const key=usernameKey(username);return {name:key,fields:toFields({username,usernameKey:key,race:progress.race??user.race??0,level:Math.max(1,Math.min(100,Number(progress.level)||1)),xp:Math.max(0,Number(progress.xp)||0),kills:Math.max(0,Number(progress.kills)||0),deaths:Math.max(0,Number(progress.deaths)||0),schemaVersion:1,updatedAt:new Date().toISOString()})}}
  async function save(username,progress){const user={username};const doc=playerDoc(user,progress);return request(`${collection}/${encodeURIComponent(doc.name)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:doc.fields})})}
  async function list(){let url=collection,docs=[];do{const page=await request(url);for(const item of page.documents||[])docs.push({id:item.name.split('/').pop(),...fromFields(item.fields)});url=page.nextPageToken?`${collection}?pageToken=${encodeURIComponent(page.nextPageToken)}`:null}while(url);return docs}
  async function migrate(payload){const users=payload.users||{},fighters=payload.fighters||{},existing=new Map((await list()).map(p=>[p.id,p]));const keys=new Set([...Object.keys(users),...Object.keys(fighters).map(id=>id.replace(/^user:/,''))]);let count=0;for(const key of keys){const normalized=usernameKey(key);const user=users[normalized]||users[key]||{username:key};const progress=fighters[user.id||`user:${normalized}`]||fighters[key]||{},cloud=existing.get(normalized);let merged=progress;if(cloud){const localLevel=Number(progress.level)||1,cloudLevel=Number(cloud.level)||1;merged={...progress,level:Math.max(localLevel,cloudLevel),kills:Math.max(Number(progress.kills)||0,Number(cloud.kills)||0),deaths:Math.max(Number(progress.deaths)||0,Number(cloud.deaths)||0),xp:localLevel>cloudLevel?Number(progress.xp)||0:cloudLevel>localLevel?Number(cloud.xp)||0:Math.max(Number(progress.xp)||0,Number(cloud.xp)||0)}}await save(user.username||key,merged);count++}return count}
  async function health(){try{await list();setStatus('Firebase conectado · sayayin-c0dfe',true)}catch(e){setStatus('Firebase sin conexión: '+e.message);console.warn(e)}}
  window.kiArenaCloud={save,list,migrate,health,setStatus};
  health();
})();
