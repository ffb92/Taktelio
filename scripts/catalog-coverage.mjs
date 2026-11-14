import {loadCatalog,coverage,PHASES,PLAYERS,catalogVersion} from './catalog-lib.mjs';

const catalog=await loadCatalog();
const rows=coverage(catalog);
const pad=(value,width)=>String(value).padEnd(width);

console.log(`Katalog: ${catalog.length} Übungen · Version ${catalogVersion(catalog)}`);
console.log(`Ziel: für jede Altersgruppe und ${PLAYERS[0]}–${PLAYERS[1]} Teilnehmende je Phase eine nutzbare Übung.\n`);
console.log(pad('Altersgruppe',14)+pad('Übungen',9)+PHASES.map(p=>pad(p,11)).join('')+'Status');
for(const row of rows){
 const status=row.missing.length?`${row.missing.length} Lücke(n)`:'vollständig';
 console.log(pad(row.age,14)+pad(row.total,9)+PHASES.map(p=>pad(row.byPhase[p],11)).join('')+status);
}
for(const row of rows){
 if(!row.missing.length)continue;
 console.log(`\n${row.age} – fehlende Phasen:`);
 const grouped={};
 for(const {players,phases} of row.missing){
  const key=phases.join(' + ');
  (grouped[key]??=[]).push(players);
 }
 for(const [phases,players] of Object.entries(grouped)){
  const ranges=[];
  for(let i=0;i<players.length;i++){
   let end=i;
   while(end+1<players.length&&players[end+1]===players[end]+1)end++;
   ranges.push(end===i?String(players[i]):`${players[i]}–${players[end]}`);
   i=end;
  }
  console.log(`  ${phases}: Teilnehmende ${ranges.join(', ')}`);
 }
}
const thin=rows.filter(row=>PHASES.some(p=>row.byPhase[p]>0&&row.byPhase[p]<2));
if(thin.length){
 console.log('\nDünn besetzt (unter 2 Übungen je Phase):');
 for(const row of thin)console.log(`  ${row.age}: ${PHASES.filter(p=>row.byPhase[p]>0&&row.byPhase[p]<2).map(p=>`${p} (${row.byPhase[p]})`).join(', ')}`);
}
const noTopic=rows.filter(row=>Object.keys(row.topics).length===0);
if(noTopic.length)console.log(`\nOhne jede Übung: ${noTopic.map(row=>row.age).join(', ')}`);
