import test from 'node:test';
import assert from 'node:assert/strict';
import {authApi,verifiedUser} from '../worker/auth.mjs';
const req=(action,body={},cookie='')=>new Request('https://taktelio.app/api/auth/'+action,{method:'POST',headers:{origin:'https://taktelio.app',cookie},body:JSON.stringify(body)});
test('recovery callback only issues a short-lived reset cookie and clears app credentials',async()=>{
 const original=globalThis.fetch;try{
 globalThis.fetch=async url=>Response.json(url.endsWith('/user')?{id:'u',email_confirmed_at:'2026-01-01'}:{access_token:'reset-access',refresh_token:'reset-refresh'});
 const r=await authApi(req('callback',{access_token:'access',refresh_token:'refresh',type:'recovery'}));
 assert.deepEqual(await r.json(),{ok:true,recovery:true});
 const cookies=r.headers.getSetCookie();assert.ok(cookies.some(c=>c.startsWith('__Host-trainer-recovery=reset-access;')&&c.includes('Max-Age=900')&&c.includes('HttpOnly')));
 assert.ok(cookies.filter(c=>!c.startsWith('__Host-trainer-recovery')).every(c=>c.includes('Max-Age=0')));
 assert.equal(await verifiedUser(new Request('https://taktelio.app',{headers:{cookie:'__Host-trainer-recovery=reset-access'}})),null);
 }finally{globalThis.fetch=original}
});
test('reset requires its own cookie, changes password, revokes session and clears cookies',async()=>{
 const original=globalThis.fetch,calls=[];try{
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({})};
 assert.equal((await authApi(req('reset-password',{password:'new-password'},'__Host-trainer-access=normal'))).status,401);assert.equal(calls.length,0);
 const r=await authApi(req('reset-password',{password:'new-password'},'__Host-trainer-recovery=reset'));
 assert.equal(r.status,200);assert.equal(calls[0].options.method,'PUT');assert.equal(calls[0].options.headers.Authorization,'Bearer reset');assert.ok(calls[1].url.endsWith('/logout'));
 assert.equal(r.headers.getSetCookie().length,3);assert.ok(r.headers.getSetCookie().every(c=>c.includes('Max-Age=0')));
 }finally{globalThis.fetch=original}
});
test('failed reset retains reset session for correction and never logs into the app',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({error:'weak_password'},{status:422});const r=await authApi(req('reset-password',{password:'password'},'__Host-trainer-recovery=reset'));assert.equal(r.status,400);assert.equal(r.headers.get('set-cookie'),null)}finally{globalThis.fetch=original}
});
test('registration carries a valid invitation into the confirmation redirect',async()=>{
 const original=globalThis.fetch,token='a'.repeat(72);try{globalThis.fetch=async url=>{assert.equal(new URL(url).searchParams.get('redirect_to'),'https://taktelio.app/?invite='+token);return Response.json({})};assert.equal((await authApi(req('register',{email:'test@example.com',password:'test-password',invite:token}))).status,200)}finally{globalThis.fetch=original}
});
test('startup routes recovery links to reset only, strips tokens and survives reload',async()=>{
 const original=globalThis.fetch;const saved=Object.fromEntries(['location','history','sessionStorage','localStorage'].map(k=>[k,globalThis[k]]));
 try{
 const entries=new Map();globalThis.sessionStorage=globalThis.localStorage={getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 globalThis.location=new URL('https://taktelio.app/#access_token=secret&refresh_token=refresh&type=recovery');
 globalThis.history={replaceState:(_a,_b,url)=>{globalThis.location=new URL(url,'https://taktelio.app')}};
 const calls=[];globalThis.fetch=async(path,options)=>{calls.push(path);assert.equal(location.hash,'');if(path==='/api/auth/callback'){assert.equal(JSON.parse(options.body).type,'recovery');return Response.json({recovery:true})}if(path==='/api/auth/recovery-status')return Response.json({recovery:true});throw Error('App session must not load: '+path)};
 const first=await import('../src/lib/api.js?reset-first');assert.deepEqual(await first.startSession(),{user:null,recovery:true});assert.equal(location.search,'?flow=reset');assert.deepEqual(calls,['/api/auth/callback']);
 const reload=await import('../src/lib/api.js?reset-reload');assert.deepEqual(await reload.startSession(),{user:null,recovery:true});assert.equal(calls.at(-1),'/api/auth/recovery-status');assert.equal(entries.size,0);
 }finally{globalThis.fetch=original;for(const [key,value]of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}}
});

