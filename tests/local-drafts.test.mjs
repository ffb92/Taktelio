import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/lib/local-drafts.js',import.meta.url),'utf8').replaceAll('export ','');
function load(entries,failWrite=false){
  const data=new Map(entries);
  const context=vm.createContext({localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(failWrite)throw Error('Quota');data.set(k,v)},removeItem:k=>data.delete(k)}});
  vm.runInContext(source,context);
  return {data,records:JSON.parse(JSON.stringify(vm.runInContext('loadLocalDrafts()',context)))};
}
test('legacy drafts migrate without loss and current drafts take precedence',()=>{
  const raw=JSON.stringify([{plan:{title:'Existing training'}}]);
  const result=load([['sc27-ai-plans',raw]]);
  assert.equal(result.records[0].plan.title,'Existing training');
  assert.equal(result.data.get('taktelio-ai-plans'),raw);
  assert.equal(result.data.has('sc27-ai-plans'),false);
  assert.deepEqual(load([['taktelio-ai-plans','[]'],['sc27-ai-plans',raw]]).records,[]);
});
test('failed writes and malformed legacy data preserve the original',()=>{
  const raw='[{"plan":{"title":"Keep me"}}]';
  const result=load([['sc27-ai-plans',raw]],true);
  assert.equal(result.records[0].plan.title,'Keep me');
  assert.equal(result.data.get('sc27-ai-plans'),raw);
  const corrupt=load([['sc27-ai-plans','broken']]);
  assert.deepEqual(corrupt.records,[]);
  assert.equal(corrupt.data.get('sc27-ai-plans'),'broken');
});
