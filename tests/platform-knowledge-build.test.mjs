import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const program=resolve('scripts/platform-knowledge-build.mjs');
const commit='0123456789abcdef0123456789abcdef01234567';
function produce(){
 const dir=mkdtempSync(join(tmpdir(),'cj-knowledge-m2-'));
 const out=join(dir,'snapshot.json');
 const run=spawnSync(process.execPath,[program,process.cwd(),commit],{
  encoding:'utf8',maxBuffer:3000000,env:{...process.env,CJ_KNOWLEDGE_OUTPUT:out}});
 return {dir,out,run};
}
test('staging snapshot deterministically captures pages, controls and evidence',()=>{
 const a=produce(),b=produce();
 try{
  assert.equal(a.run.status,0,a.run.stderr);
  assert.equal(b.run.status,0,b.run.stderr);
  const one=readFileSync(a.out,'utf8'),two=readFileSync(b.out,'utf8');
  assert.equal(one,two,'same commit and input must yield identical artifact bytes');
  const obj=JSON.parse(one);
  assert.equal(obj.source_commit,commit);
  assert.equal(obj.state,'STAGED');
  assert.equal(obj.verification_status,'UNVERIFIED');
  assert.match(obj.artifact_sha256,/^[0-9a-f]{64}$/);
  assert.ok(obj.counts.pages>=10);
  assert.ok(obj.counts.source_controls>100);
  assert.equal(obj.counts.nodes,obj.nodes.length);
  assert.equal(obj.counts.edges,obj.edges.length);
  const keys=new Set(obj.nodes.map(n=>n.node_key));
  assert.equal(keys.size,obj.nodes.length);
  for(const n of obj.nodes){
   assert.equal(n.capability_status,'IMPLEMENTED_UNVERIFIED');
   assert.equal(n.verification_status,'UNVERIFIED');
   assert.ok(n.evidence.source_path);
   assert.ok(!('business_id' in n));
  }
  for(const e of obj.edges){
   assert.ok(keys.has(e.from_node_key));
   assert.ok(keys.has(e.to_node_key));
  }
 }finally{rmSync(a.dir,{recursive:true,force:true});rmSync(b.dir,{recursive:true,force:true})}
});
test('refuses to make unstamped source look like verified knowledge',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cj-knowledge-fail-'));
 try{
  const out=join(dir,'never.json');
  const run=spawnSync(process.execPath,[program,process.cwd(),'main'],{
   encoding:'utf8',env:{...process.env,CJ_KNOWLEDGE_OUTPUT:out}});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/pinned 40-character Git SHA/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
