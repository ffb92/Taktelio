import test from 'node:test';
import assert from 'node:assert/strict';
import {authApi} from '../worker/auth.mjs';
import {readProfile,validateProfile,profileName} from '../worker/profile.mjs';
import {invitationPreviewApi} from '../worker/storage.mjs';
const request=(path,body,cookie='')=>new Request('https://taktelio.app'+path,{method:'POST',headers:{origin:'https://taktelio.app',cookie},body:JSON.stringify(body)});
test('profile validation normalizes names and never accepts authorization fields',()=>{
 const p=validateProfile({firstName:' Benni ',lastName:' Westphal ',displayName:'Benni',team:'U13',qualification:'C-Lizenz',role:'owner'});
 assert.equal(p.firstName,'Benni');assert.equal(p.role,undefined);assert.equal(profileName({user_metadata:{taktelio_profile:p}}),'Benni');
 assert.throws(()=>validateProfile({firstName:'',lastName:'Westphal'}));
 assert.throws(()=>validateProfile({firstName:'a'.repeat(81),lastName:'Westphal'}));
 assert.equal(readProfile({taktelio_profile:{firstName:{bad:true}}}).firstName,'');
});
test('profile saves only allowlisted personal data for the verified current account',async()=>{
 const original=globalThis.fetch;const writes=[];
 try{
 globalThis.fetch=async(url,options)=>{
  if(options.method==='GET')return Response.json({id:'user-a',email:'a@example.com',email_confirmed_at:'2026-01-01'});
  const body=JSON.parse(options.body);writes.push(body);
  return Response.json({id:'user-a',email:'a@example.com',user_metadata:body.data});
 };
 const profile={firstName:'Benni',lastName:'Westphal',displayName:'Benni',team:'U13',qualification:'C-Lizenz',role:'owner'};
 assert.equal((await authApi(request('/api/auth/profile',{profile}))).status,401);assert.equal(writes.length,0);
 const r=await authApi(request('/api/auth/profile',{profile,user_id:'someone-else'},'__Host-trainer-access=access'));
 assert.equal(r.status,200);const data=await r.json();assert.equal(data.user.id,'user-a');assert.equal(data.user.profile.displayName,'Benni');
 assert.deepEqual(Object.keys(writes[0]),['data']);assert.deepEqual(Object.keys(writes[0].data),['taktelio_profile']);assert.equal(writes[0].data.taktelio_profile.role,undefined);
 }finally{globalThis.fetch=original}
});
test('public invitation preview needs a valid token and uses no existing account session',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
 globalThis.fetch=async(url,options)=>{calls++;assert.ok(url.endsWith('/rpc/public_invitation_preview'));assert.equal(options.headers.Authorization,undefined);assert.equal(JSON.parse(options.body).invite_token,'a'.repeat(72));return Response.json({club:'SC 27',inviter:'Benni'})};
 assert.equal((await invitationPreviewApi(request('/api/invitation',{token:'bad'}))).status,400);assert.equal(calls,0);
 const r=await invitationPreviewApi(request('/api/invitation',{token:'a'.repeat(72)},'__Host-trainer-access=unrelated'));
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{invitation:{club:'SC 27',inviter:'Benni'}});assert.equal(r.headers.get('cache-control'),'no-store');
 globalThis.fetch=async()=>Response.json(null);assert.equal((await invitationPreviewApi(request('/api/invitation',{token:'a'.repeat(72)}))).status,404);
 }finally{globalThis.fetch=original}
});
