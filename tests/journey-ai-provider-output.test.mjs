import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../supabase/functions/cj-agent-runtime/index.ts',import.meta.url),'utf8');
const begin=source.indexOf('function extractResponseText(');
const end=source.indexOf('async function generate(',begin);
assert.ok(begin>=0&&end>begin,'pure provider text extractor must exist');
const js=source.slice(begin,end).replace('data:any):string','data)').replace('const parts:string[]=[];','const parts=[];');
const sandbox={};
vm.runInNewContext(js,sandbox);
const extract=sandbox.extractResponseText;

test('top-level output_text takes priority without duplicating content',()=>{
 assert.equal(extract({output_text:'One answer',output:[{content:[{type:'output_text',text:'One answer'}]}]}),'One answer');
});
test('nested output text is supported and unrelated content is ignored',()=>{
 assert.equal(extract({output:[{content:[{type:'reasoning',text:'internal'},{type:'output_text',text:'Findings'}]},{content:[{type:'output_text',text:'Evidence'}]}]}),'Findings\nEvidence');
});
test('empty or reasoning-only provider output never becomes successful analysis',()=>{
 assert.equal(extract({status:'incomplete',output:[{type:'reasoning'}]}),'');
 assert.equal(extract({output:[]}), '');
});
test('provider completion is fail-closed and retries with bounded larger token budget',()=>{
 assert.match(source,/attempt<2/);
 assert.match(source,/attempt===0\?2200:4200/);
 assert.match(source,/const incomplete=data\?\.status==="incomplete"/);
 assert.match(source,/if\(!incomplete&&answer\)return/);
 assert.match(source,/if\(attempt===0&&\(incomplete\|\|!answer\)\)continue/);
 assert.match(source,/throw new Error\("AI provider returned no complete analysis after retry/);
 assert.match(source,/execution_type:"analysis_only",verification_status:"UNVERIFIED"/);
 assert.doesNotMatch(source,/EXTERNAL_ACTION_COMPLETED/);
});
