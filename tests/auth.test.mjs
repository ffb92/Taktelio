import {test} from 'node:test';import assert from 'node:assert/strict';import {authApi,verifiedUser} from '../worker/auth.mjs';
const req=(action,body,origin='https://example.com')=>new Request('https://example.com/api/auth/'+action,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('auth rejects foreign origins without contacting provider',async()=>{assert.equal((await authApi(req('login',{},'https://evil.example'))).status,403)});
test('platform identity and old client tokens cannot replace user session',async()=>assert.equal(await verifiedUser(new Request('https://example.com',{headers:{'oai-authenticated-user-id':'forged','x-sc27-session':'forged'}})),null));
test('login keeps access and refresh credentials in secure HttpOnly cookies',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({access_token:'access',refresh_token:'refresh',expires_in:3600});const r=await authApi(req('login',{email:'a@example.com',password:'abcdefgh'}));assert.equal(r.status,200);const h=r.headers.get('set-cookie');assert.match(h,/HttpOnly/);assert.match(h,/Secure/);assert.match(h,/SameSite=Lax/);assert.deepEqual(await r.json(),{ok:true})}finally{globalThis.fetch=old}});

test('registration and recovery redirect to the application origin without issuing session cookies',async()=>{
 const old=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({})};
  for(const action of ['register','recover']){
   const r=await authApi(req(action,{email:'trainer@example.com',password:'abcdefgh'}));
   assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);
   const call=calls.at(-1);assert.equal(new URL(call.url).searchParams.get('redirect_to'),'https://example.com');
   assert.equal(call.body.email,'trainer@example.com');
  }
 }finally{globalThis.fetch=old}
});

test('callback requires a confirmed account before exchanging refresh credentials',async()=>{
 const old=globalThis.fetch;let confirmed=false;let exchanges=0;
 try{
  globalThis.fetch=async url=>{
   if(url.endsWith('/user'))return Response.json({id:'user-a',email_confirmed_at:confirmed?'2026-01-01':null});
   exchanges++;return Response.json({access_token:'access',refresh_token:'refresh',expires_in:3600});
  };
  assert.equal((await authApi(req('callback',{access_token:'access',refresh_token:'refresh'}))).status,401);
  assert.equal(exchanges,0);confirmed=true;
  const r=await authApi(req('callback',{access_token:'access',refresh_token:'refresh'}));
  assert.equal(r.status,200);assert.equal(exchanges,1);assert.match(r.headers.get('set-cookie'),/HttpOnly/);
 }finally{globalThis.fetch=old}
});

test('password updates require a verified session and logout clears both cookies',async()=>{
 const old=globalThis.fetch;let writes=0;
 try{
  globalThis.fetch=async(url,options)=>{
   if(options.method==='GET')return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
   if(options.method==='PUT'){writes++;assert.deepEqual(JSON.parse(options.body),{password:'new-password'})}
   return Response.json({});
  };
  assert.equal((await authApi(req('password',{password:'new-password'}))).status,400);assert.equal(writes,0);
  const change=req('password',{password:'new-password'});change.headers.set('cookie','__Host-trainer-access=access');
  assert.equal((await authApi(change)).status,200);assert.equal(writes,1);
  const logout=req('logout',{});logout.headers.set('cookie','__Host-trainer-access=access');
  const r=await authApi(logout);assert.equal(r.status,200);
  const cookies=r.headers.getSetCookie();assert.equal(cookies.length,2);assert.ok(cookies.every(c=>c.includes('Max-Age=0')));
 }finally{globalThis.fetch=old}
});
