import {trainingRecord} from './fixtures/training-plan.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';import {storageApi} from '../worker/storage.mjs';
const req=body=>new Request('https://example.com/api/storage',{method:'POST',headers:{origin:'https://example.com',cookie:'__Host-trainer-access=token','x-workspace-id':'11111111-1111-4111-8111-111111111111'},body:JSON.stringify(body)});
test('storage rejects missing login',async()=>assert.equal((await storageApi(new Request('https://example.com/api/storage'))).status,403));
test('storage denies cross-workspace access',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async url=>Response.json(url.includes('/auth/')?{id:'user-a',email_confirmed_at:'2026-01-01'}:[]);assert.equal((await storageApi(req({action:'save'}))).status,403)}finally{globalThis.fetch=old}});
test('save derives tenant and owner from verified membership',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async(url,options)=>{if(url.includes('/auth/'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});if(url.includes('/memberships'))return Response.json([{role:'owner'}]);const data=JSON.parse(options.body);assert.equal(data.created_by,'user-a');assert.equal(data.workspace_id,'11111111-1111-4111-8111-111111111111');assert.equal(options.headers.Authorization,'Bearer token');return Response.json([{id:'plan',...data}])};assert.equal((await storageApi(req({action:'save',owner_id:'forged',workspace_id:'forged',payload:trainingRecord()}))).status,200)}finally{globalThis.fetch=old}});


test('invalid stored plans never reach the database write',async()=>{
 const original=globalThis.fetch;let writes=0;
 try{
  globalThis.fetch=async(url,options)=>{
   if(url.includes('/auth/'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
   if(url.includes('/memberships'))return Response.json([{role:'owner'}]);
   writes++;return Response.json([{id:'unexpected'}]);
  };
  const invalid=[{criteria:{},plan:{title:'Plan',blocks:[{}]}},null];
  const missingGroups=trainingRecord();delete missingGroups.plan.blocks[0].groups;invalid.push(missingGroups);
  const wrongTotals=trainingRecord();wrongTotals.criteria.minutes=75;invalid.push(wrongTotals);
  for(const payload of invalid)assert.equal((await storageApi(req({action:'save',payload}))).status,400);
  assert.equal(writes,0);
 }finally{globalThis.fetch=original}
});
