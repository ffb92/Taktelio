import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord} from '../shared/training-plan.mjs';
import {trainingRecord} from './fixtures/training-plan.mjs';

test('complete legacy records are normalized without changing or losing their content',()=>{
 const record=trainingRecord();delete record.mode;delete record.plan.blocks[0].sourceExerciseId;
 record.createdAt='2026-11-14';
 const normalized=normalizeRecord(record);
 assert.equal(normalized.mode,'hybrid');assert.equal(normalized.plan.blocks[0].sourceExerciseId,'');
 assert.equal(normalized.createdAt,record.createdAt);assert.equal(record.mode,undefined);
 assert.equal(Object.hasOwn(record.plan.blocks[0],'sourceExerciseId'),false);
});

test('malformed records, unsafe diagrams and inconsistent training totals are rejected',()=>{
 const changes=[
  r=>r.criteria={},r=>r.criteria.age='unknown',r=>r.criteria.players=25,
  r=>r.criteria.notes=[],r=>r.mode='other',r=>r.plan.blocks={},r=>r.plan.blocks=[{}],
  r=>r.plan.blocks[0]=null,r=>delete r.plan.blocks[0].groups,
  r=>r.plan.blocks[0].groups=[6],r=>r.plan.blocks[0].minutes=10,
  r=>r.plan.blocks[0].steps='wrong',r=>r.plan.blocks[0].diagram.objects=[{x:101,y:0,label:'',kind:'player',team:0}],
 ];
 for(const change of changes){const record=trainingRecord();change(record);assert.equal(normalizeRecord(record),null)}
 for(const record of [null,[],{},'plan'])assert.equal(normalizeRecord(record),null);
});
