const defaults={url:'https://iyhyibjmfzjuypgybnno.supabase.co',key:'sb_publishable_aGDtN2MZowyJdpQsS8qjrA_TN7SI_KN'};

export function supabaseConfig(env=process.env){
 const url=env.SUPABASE_URL?.trim(),key=env.SUPABASE_PUBLISHABLE_KEY?.trim();
 if(Boolean(url)!==Boolean(key))throw Error('SUPABASE_URL und SUPABASE_PUBLISHABLE_KEY gemeinsam setzen.');
 if(!url)return defaults;
 const parsed=new URL(url);
 if(parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname!=='/' || (parsed.protocol!=='https:' && !(parsed.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(parsed.hostname))))throw Error('Ungültige Supabase-URL.');
 return {url:parsed.origin,key};
}
