import {loadCatalog,validateCatalog,catalogVersion} from './catalog-lib.mjs';

const catalog=await loadCatalog();
const problems=validateCatalog(catalog);
if(problems.length){
 for(const {id,message} of problems)console.error(`${id}: ${message}`);
 console.error(`\n${problems.length} Problem(e) in data/exercises.json.`);
 process.exit(1);
}
console.log(`${catalog.length} Übungen gültig · Katalogversion ${catalogVersion(catalog)}`);
