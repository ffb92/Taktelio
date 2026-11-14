import {test} from 'node:test';import assert from 'node:assert/strict';
import {loadCatalog,validateCatalog,coverage,catalogVersion} from '../scripts/catalog-lib.mjs';

test('catalog entries satisfy the shared exercise contract',async()=>{
 const catalog=await loadCatalog();
 assert.deepEqual(validateCatalog(catalog),[]);
});

test('validator rejects incomplete or inconsistent entries',async()=>{
 const [first]=await loadCatalog();
 assert.ok(validateCatalog([{...first,duration:0,phase:'Pause',steps:[]}]).length>=3);
 assert.ok(validateCatalog([first,{...first}]).some(p=>p.message==='id ist doppelt.'));
});

test('every age group has usable exercises and a stable version hash',async()=>{
 const catalog=await loadCatalog();
 for(const row of coverage(catalog))assert.ok(row.total>0,`${row.age} has no exercise`);
 assert.equal(catalogVersion(catalog),catalogVersion(JSON.parse(JSON.stringify(catalog))));
});
