import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const scanner=resolve('scripts/platform-intelligence-inventory.mjs');
function withFixture(run){
  const dir=mkdtempSync(join(tmpdir(),'cj-platform-inventory-'));
  try{return run(dir)}finally{rmSync(dir,{recursive:true,force:true})}
}
test('source controls produce stable unverified records without invoking app',()=>{
  withFixture(root=>{
    writeFileSync(join(root,'index.html'),`<html><button id="save" aria-label="Save Journey" onclick="publish()">Publish</button><a href="/marketing">Marketing</a><input id="booking" type="url" aria-label="Booking URL"></html>`);
    const a=spawnSync(process.execPath,[scanner,root],{encoding:'utf8'});
    const b=spawnSync(process.execPath,[scanner,root],{encoding:'utf8'});
    assert.equal(a.status,0,a.stderr);
    assert.equal(a.stdout,b.stdout,'Inventory must be deterministic');
    const result=JSON.parse(a.stdout);
    assert.equal(result.method,'static_source_markup_scan');
    assert.equal(result.verification_status,'IMPLEMENTED_UNVERIFIED');
    assert.equal(result.detected_interactions,3);
    const save=result.interactions.find(x=>x.element_id==='save');
    assert.equal(save.label,'Save Journey');
    assert.equal(save.action_type,'inline_handler');
    assert.equal(save.current_status,'IMPLEMENTED_UNVERIFIED');
    assert.equal(result.interactions.find(x=>x.label==='Marketing').destination,'/marketing');
  });
});
test('ignores node_modules and never prints input values or secrets',()=>{
  withFixture(root=>{
    mkdirSync(join(root,'node_modules'));
    writeFileSync(join(root,'node_modules','bad.html'),'<button>Do not scan</button>');
    writeFileSync(join(root,'index.html'),'<input type="password" value="secret-not-for-output" aria-label="Password">');
    const run=spawnSync(process.execPath,[scanner,root],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const out=JSON.parse(run.stdout);
    assert.equal(out.scanned_source_files,1);
    assert.equal(out.detected_interactions,1);
    assert.ok(!run.stdout.includes('secret-not-for-output'));
  });
});
