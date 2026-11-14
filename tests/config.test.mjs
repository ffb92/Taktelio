import test from 'node:test';
import assert from 'node:assert/strict';
import {supabaseConfig} from '../worker/config.mjs';

test('Supabase configuration requires a complete pair and a safe server URL',()=>{
 assert.match(supabaseConfig({}).url,/^https:/);
 assert.deepEqual(supabaseConfig({SUPABASE_URL:'http://127.0.0.1:54321',SUPABASE_PUBLISHABLE_KEY:'test'}),{url:'http://127.0.0.1:54321',key:'test'});
 assert.deepEqual(supabaseConfig({SUPABASE_URL:'https://test.supabase.co/',SUPABASE_PUBLISHABLE_KEY:'test'}),{url:'https://test.supabase.co',key:'test'});
 for(const env of [{SUPABASE_URL:'https://test.supabase.co'},{SUPABASE_PUBLISHABLE_KEY:'test'}])assert.throws(()=>supabaseConfig(env),/gemeinsam/);
 for(const url of ['http://remote.example','https://user:password@test.example','https://test.example/path','https://test.example?key=secret'])assert.throws(()=>supabaseConfig({SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:'test'}));
});
