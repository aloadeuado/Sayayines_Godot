(()=>{
  const cfg=window.KI_ARENA_FIREBASE;
  if(!cfg)return;
  const docs=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${encodeURIComponent(cfg.databaseId)}/documents`;
  const paths={players:cfg.collectionPath,messages:'environments/dev/kiArenaMessages',events:'environments/dev/kiArenaEvents'};
  const status=document.querySelector('#firebase-status');
  const setStatus=(text,ok=false)=>{if(status){status.textContent=text;status.dataset.ok=ok?'true':'false'}};
  const normalize=s=>String(s||'').trim().toLowerCase();
  const toFields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v===null?{nullValue:null}:typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{doubleValue:v}:{stringValue:String(v)}]));
  const fromFields=o=>Object.fromEntries(Object.entries(o||{}).map(([k,v])=>[k,v.stringValue??v.integerValue??v.doubleValue??v.booleanValue??null]));
  async function request(url,options={}){const response=await fetch(`${url}${url.includes('?')?'&':'?'}key=${encodeURIComponent(cfg.apiKey)}`,options);if(!response.ok){const message=await response.text();throw new Error(`Firestore ${response.status}: ${message.slice(0,180)}`)}return response.status===204?null:response.json()}
  async function get(username){const key=normalize(username);try{const doc=await request(`${docs}/${paths.players}/${encodeURIComponent(key)}`);return{id:key,...fromFields(doc.fields)}}catch(e){if(String(e.message).includes('Firestore 404'))return null;throw e}}
  async function save(username,progress){const key=normalize(username),record={username:String(username).trim(),usernameKey:key,race:Number(progress.race)||0,level:Math.max(1,Math.min(100,Number(progress.level)||1)),xp:Math.max(0,Number(progress.xp)||0),kills:Math.max(0,Number(progress.kills)||0),deaths:Math.max(0,Number(progress.deaths)||0),alive:progress.alive!==false,hp:Math.max(0,Number(progress.hp)||0),schemaVersion:2,updatedAt:new Date().toISOString()};return request(`${docs}/${paths.players}/${encodeURIComponent(key)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:toFields(record)})})}
  async function listPlayers(){let url=`${docs}/${paths.players}?pageSize=1000`,items=[];do{const page=await request(url);for(const doc of page.documents||[])items.push({id:doc.name.split('/').pop(),...fromFields(doc.fields)});url=page.nextPageToken?`${docs}/${paths.players}?pageSize=1000&pageToken=${encodeURIComponent(page.nextPageToken)}`:null}while(url);return items}
  async function addRecord(kind,value){return request(`${docs}/${paths[kind]}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:toFields({...value,createdAt:new Date().toISOString()})})})}
  async function addMessage(username,text){return addRecord('messages',{username:String(username||'Sistema'),text:String(text||'').slice(0,120),command:/^[EKM]$/i.test(String(text||''))?String(text).toUpperCase():''})}
  async function addEvent(type,value={}){return addRecord('events',{type,...value})}
  async function listMessages(){const page=await request(`${docs}/${paths.messages}?pageSize=50&orderBy=createdAt%20desc`);return(page.documents||[]).reverse().map(doc=>({id:doc.name.split('/').pop(),...fromFields(doc.fields)}))}
  async function health(){try{await listPlayers();setStatus('Guardado en Firebase · sayayin-c0dfe',true)}catch(e){setStatus('Firebase sin conexión: '+e.message);console.warn(e)}}
  window.kiArenaCloud={get,save,listPlayers,addMessage,addEvent,listMessages,health,setStatus};
  health();
})();
