import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../supabase/functions/journey-ai-chat/index.ts',import.meta.url),'utf8');
const begin=source.indexOf('function pilotAgentsForRequest(');
const end=source.indexOf('async function runRegisteredAgentPilot(',begin);
assert.ok(begin>=0&&end>begin,'registered agent router must exist');
const js=source.slice(begin,end)
  .replace('prompt:string):number[]','prompt)')
  .replace('const ids:number[]=[];','const ids=[];');
const sandbox={};
vm.runInNewContext(js,sandbox);
const route=(prompt)=>Array.from(sandbox.pilotAgentsForRequest(prompt));

test('two explicitly requested registered agents are both routed exactly once',()=>{
  assert.deepEqual(route('Investigate My Board using registered agents #333 and #336. Do not change settings.'),[333,336]);
  assert.deepEqual(route('Agent #333, Agent #333, and Agent #336'),[333,336]);
});

test('named specialists route without relying on numeric IDs',()=>{
  assert.deepEqual(route('Use SmartBoard Interaction Optimization Agent and SmartBoard Conversion Intelligence Agent'),[333,336]);
});

test('explicit agent request overrides unrelated heuristic terms',()=>{
  assert.deepEqual(route('Use Agent #333 to verify board conversion evidence'),[333]);
});

test('implicit board conversion investigation selects the two relevant pilot agents',()=>{
  assert.deepEqual(route('Investigate SmartBoard conversion and why zero actions occurred'),[336,333]);
});

test('unrelated chat does not start registered agents',()=>{
  assert.deepEqual(route('Hello, how are you today?'),[]);
});

test('registered pilot remains analysis-only, permission-scoped and concurrency-aware',()=>{
  assert.match(source,/\.eq\("user_id",userId\)\.eq\("is_active",true\)/);
  assert.match(source,/eligible\.find\(\(m:any\)=>m\.business_id===requested\)/);
  assert.match(source,/Promise\.all\(agentNos\.map\(/);
  assert.match(source,/const registeredPromise=runRegisteredAgentPilot\(/);
  assert.match(source,/const registeredRuns=await registeredPromise;/);
  assert.match(source,/execution_type!=="analysis_only"/);
  assert.match(source,/REGISTERED AGENT EXECUTION RECEIPTS/);
  assert.match(source,/registered_agent_jobs:registeredRuns\.map/);
  assert.match(source,/status:"SKIPPED"/);
  assert.doesNotMatch(source,/function pilotAgentForRequest\(/);
});
