import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateSnapshot} from '../scripts/platform-knowledge-import.mjs';

const commit='0123456789abcdef0123456789abcdef01234567';
test('staging importer verifies artifact checksum and prevents invented verified status',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cj-import-validation-'));
 try{
  const out=join(dir,'snapshot.json');
  const built=spawnSync(process.execPath,['scripts/platform-knowledge-build.mjs',process.cwd(),commit],{
   encoding:'utf8',env:{...process.env,CJ_KNOWLEDGE_OUTPUT:out}});
  assert.equal(built.status,0,built.stderr);
  const manifest=JSON.parse(readFileSync(out,'utf8'));
  const result=validateSnapshot(manifest);
  assert.equal(result.node_count,manifest.nodes.length);
  assert.equal(result.edge_count,manifest.edges.length);
  const changed=structuredClone(manifest);
  changed.nodes[0].capability_status='VERIFIED_OPERATIONAL';
  assert.throws(()=>validateSnapshot(changed),/checksum mismatch/);
  const bad=structuredClone(manifest);
  bad.edges.push({from_node_key:'page:unknown',to_node_key:'page:home',relation_type:'contains'});
  assert.throws(()=>validateSnapshot(bad),/checksum mismatch/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('import CLI refuses all database writes without explicit staging approval',()=>{
 const result=spawnSync(process.execPath,['scripts/platform-knowledge-import.mjs','does-not-exist.json'],{
  encoding:'utf8',env:{...process.env,CJ_PLATFORM_KNOWLEDGE_IMPORT:''}});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/Refusing DB writes/);
});
