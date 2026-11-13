let refreshFlight;
export async function apiFetch(path,{workspaceId,body,method,signal}={}){
  const send=()=>fetch(path,{method:method||(body===undefined?'GET':'POST'),credentials:'same-origin',signal,headers:{'Content-Type':'application/json',...(workspaceId?{'x-workspace-id':workspaceId}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  let response=await send();
  if(response.status===401&&!path.startsWith('/api/auth/')){
    if(!refreshFlight)refreshFlight=fetch('/api/auth/refresh',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'}).finally(()=>{refreshFlight=null});
    if((await refreshFlight).ok)response=await send();
    if(response.status===401)window.dispatchEvent(new Event('taktelio:session-expired'));
  }
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||'Anfrage fehlgeschlagen.');error.status=response.status;error.code=data.code;throw error}
  return data;
}
export const storage={
 get(key,session=false){try{return (session?sessionStorage:localStorage).getItem(key)}catch{return null}},
 set(key,value,session=false){try{(session?sessionStorage:localStorage).setItem(key,value)}catch{}},
 remove(key,session=false){try{(session?sessionStorage:localStorage).removeItem(key)}catch{}}
};
let startup;
export function startSession(){
  if(!startup)startup=(async()=>{
    const query=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
    const invite=query.get('invite');
    if(invite&&/^[a-f0-9-]{72}$/.test(invite))storage.set('trainer-club-invite',invite,true);
    query.delete('invite');
    const recovery=hash.get('type')==='recovery';
    // Strip tokens before any network operation; never persist them in browser storage.
    if(hash.has('access_token')||invite)history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+(hash.has('access_token')?'':location.hash));
    storage.remove('sc27-cloud-session',true);
    try{
      if(hash.has('access_token'))await apiFetch('/api/auth/callback',{body:{access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')}});
      else try{await apiFetch('/api/auth/refresh',{body:{}})}catch(error){if(error.status!==401)throw error}
      const {user}=await apiFetch('/api/auth/me');return {user,recovery};
    }catch(error){return {user:null,recovery:false,error:error.status===401?'':error.message}}
  })();
  return startup;
}
