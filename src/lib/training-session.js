// Laufender Auftrag und letzter Entwurf werden je Nutzer und Verein getrennt im
// Sitzungsspeicher gehalten. So überlebt ein Neuladen der Seite die laufende
// Anfrage, ohne dass ein anderes Konto oder ein anderer Verein den Entwurf sieht.
const KEY_PREFIX='taktelio-training:';
const scopedKey=(userId,workspaceId)=>userId&&workspaceId?KEY_PREFIX+userId+':'+workspaceId:null;

export function loadTrainingSession(userId,workspaceId){
 const key=scopedKey(userId,workspaceId);
 if(!key)return null;
 try{
  const value=JSON.parse(sessionStorage.getItem(key)||'null');
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  return {
   draft:value.draft&&typeof value.draft==='object'&&!Array.isArray(value.draft)?value.draft:null,
   pending:value.pending&&typeof value.pending.id==='string'?{id:value.pending.id,fingerprint:typeof value.pending.fingerprint==='string'?value.pending.fingerprint:''}:null,
  };
 }catch{return null}
}

export function saveTrainingSession(userId,workspaceId,{draft,pending}){
 const key=scopedKey(userId,workspaceId);
 if(!key)return;
 try{
  if(!draft&&!pending){sessionStorage.removeItem(key);return}
  sessionStorage.setItem(key,JSON.stringify({draft:draft||null,pending:pending?{id:pending.id,fingerprint:pending.fingerprint}:null}));
 }catch{}
}
