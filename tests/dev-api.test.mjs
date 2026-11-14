import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {devApi} from '../scripts/dev-api.mjs';

test('local HTTP adapter serves the real API, preserves auth cookies and rejects foreign origins',async()=>{
 const original=globalThis.fetch;let externalCalls=0;
 const middleware=devApi({});
 const server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end('not-api')}));
 try{
  globalThis.fetch=async()=>{externalCalls++;return Response.json({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600})};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const send=(path,body,requestOrigin=origin)=>new Promise((resolve,reject)=>{
   const req=request(origin+path,{method:body===undefined?'GET':'POST',headers:{origin:requestOrigin,'Content-Type':'application/json'}},res=>{
    let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
   });
   req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
  const me=await send('/api/auth/me');assert.equal(me.status,401);assert.deepEqual(JSON.parse(me.text),{user:null});
  const credentials={email:'test@example.invalid',password:'test-password'};
  const rejected=await send('/api/auth/login',credentials,'https://other.example');assert.equal(rejected.status,403);assert.equal(externalCalls,0);
  const login=await send('/api/auth/login',credentials);assert.equal(login.status,200);assert.equal(externalCalls,1);
  assert.equal(login.headers['set-cookie'].length,3);
  assert.ok(login.headers['set-cookie'].some(cookie=>cookie.startsWith('__Host-trainer-access=')&&cookie.includes('HttpOnly')&&cookie.includes('Secure')));
  assert.equal(login.headers['cache-control'],'no-store');
  assert.equal((await send('/other')).text,'not-api');
  const oversized=await send('/api/auth/login',{value:'x'.repeat(111000)});assert.equal(oversized.status,413);assert.equal(externalCalls,1);
 }finally{globalThis.fetch=original;await new Promise(resolve=>server.close(resolve))}
});
