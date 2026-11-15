import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/lib/local-drafts.js',import.meta.url),'utf8').replaceAll('export ','');
function load(entries,readError=false){
  const data=new Map(entries);
  const context=vm.createContext({localStorage:{getItem:k=>{if(readError)throw Error('Blocked');return data.get(k)??null},setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
  vm.runInContext(source,context);
  return JSON.parse(JSON.stringify(vm.runInContext('loadLocalDrafts()',context)));
}
test('local drafts are read from the current key only',()=>{
  const records=[{plan:{title:'Existing training'}}];
  assert.deepEqual(load([['taktelio-ai-plans',JSON.stringify(records)]]),[records[0]]);
  assert.deepEqual(load([]),[]);
  assert.deepEqual(load([['sc27-ai-plans',JSON.stringify(records)]]),[]);
});
test('malformed or unreadable storage yields an empty list',()=>{
  assert.deepEqual(load([['taktelio-ai-plans','broken']]),[]);
  assert.deepEqual(load([['taktelio-ai-plans','{"plan":{}}']]),[]);
  assert.deepEqual(load([['taktelio-ai-plans','[]']],true),[]);
});
