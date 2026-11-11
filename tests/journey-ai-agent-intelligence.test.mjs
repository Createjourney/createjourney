import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {classifyAgent,normalizeStatus,summarize,publicAgent,integerInRange,
 parseBusinessId,safeSearch,ROSTER_LIMIT} from '../supabase/functions/journey-ai-agent-intelligence/logic.mjs';

const uuid='11111111-1111-4111-8111-111111111111';
const agents=Array.from({length:607},(_,idx)=>({agent_no:idx+1,permanent_id:'Agent '+String(idx+1).padStart(3,'0'),
 agent_name:'Role '+(idx+1),classification:'SPECIALIST',
 supervisor_agent_no:idx>=20?1:null,department_no:idx%75+1,
 status:[2,333,336].includes(idx+1)?'TESTING':'PLANNED'}));

test('realistic 607-agent registry never equates registration with execution',()=>{
 const result=summarize(agents,1);
 assert.equal(result.registered_agents,607);
 assert.equal(result.by_lifecycle_status.PLANNED,604);
 assert.equal(result.by_lifecycle_status.TESTING,3);
 assert.equal(result.business_job_count,1);
 assert.ok(result.interpretation.includes('not proof'));
 assert.equal(publicAgent(agents[332]).readiness,'TESTING_UNVERIFIED');
 assert.equal(publicAgent(agents[331]).readiness,'PLANNED_UNVERIFIED');
});
test('agent #333 testing permit is not external execution proof',()=>{
 const a=agents[332];
 const permission=[{agent_no:333,granted:true,tool_key:'ai.analysis',
  permission_scope:{execution_mode:'analysis_only'}}];
 const failed=[{id:uuid,agent_no:333,status:'FAILED',created_at:'2026-11-01T01:02:41Z'}];
 const first=classifyAgent(a,permission,failed,[{job_id:uuid,event_type:'FAILED'}]);
 assert.equal(first.readiness,'TESTING_UNVERIFIED');
 assert.equal(first.analysis_permission_granted,true);
 assert.equal(first.independently_verified_external_operation,false);
 assert.equal(first.last_business_job_status,'FAILED');
 const succeeded=[{id:uuid,agent_no:333,status:'SUCCEEDED',created_at:'2026-11-02T01:00:00Z'}];
 const missingReceipt=classifyAgent(a,permission,succeeded,[]);
 assert.equal(missingReceipt.readiness,'TESTING_UNVERIFIED');
 const receipt=classifyAgent(a,permission,succeeded,[{job_id:uuid,event_type:'ANALYSIS_COMPLETED'}]);
 assert.equal(receipt.readiness,'ANALYSIS_RUNTIME_OBSERVED');
 assert.equal(receipt.business_execution_evidence,'ANALYSIS_ONLY');
 assert.equal(receipt.independently_verified_external_operation,false);
 assert.equal(receipt.externally_executable,false);
});
test('no grant is not evidence of tool access, even if status is TESTING',()=>{
 const result=classifyAgent(agents[1],[]);
 assert.equal(result.analysis_permission_granted,false);
 assert.equal(result.verified_analysis_jobs,0);
 assert.equal(result.readiness,'TESTING_UNVERIFIED');
});
test('request filters reject unsafe business IDs, invalid query and unbounded scans',()=>{
 assert.equal(parseBusinessId(uuid),uuid);
 assert.throws(()=>parseBusinessId('other-business'),/invalid_business_id/);
 assert.equal(integerInRange('50',1,ROSTER_LIMIT,20),50);
 assert.throws(()=>integerInRange('500',1,ROSTER_LIMIT,20),/invalid_number/);
 assert.throws(()=>integerInRange('-1',0,5000,0),/invalid_number/);
 assert.throws(()=>integerInRange('1.2',0,5000,0),/invalid_number/);
 assert.equal(safeSearch("SmartBoard Conversion"),"SmartBoard Conversion");
 assert.throws(()=>safeSearch("abc%"),/invalid_search/);
 assert.throws(()=>safeSearch("a,"),/invalid_search/);
 assert.equal(normalizeStatus('NONSENSE'),'UNKNOWN');
});
test('registered lifecycle does not infer runtime from source status',()=>{
 const deployed={...agents[2],status:'DEPLOYED'};
 const e=classifyAgent(deployed,[],[],[]);
 assert.equal(e.readiness,'IMPLEMENTED_UNVERIFIED');
 assert.equal(e.independently_verified_external_operation,false);
});

test('Journey AI chat offers authorized read-only workforce context and suppresses catalog-triggered pilot runs',()=>{
 const source=readFileSync('supabase/functions/journey-ai-chat/index.ts','utf8');
 assert.match(source,/const workforcePromise=authorizedWorkforceRead\(url,anon,auth,prompt/);
 assert.match(source,/const workforce=await workforcePromise/);
 assert.match(source,/agent_workforce_status:workforce.status/);
 assert.match(source,/AUTHORI[ZS]ED WORKFORCE INTELLIGENCE/);
 assert.match(source,/body:\s*JSON.stringify\(\{action,business_id:b,/);
 assert.match(source,/\bstatus\|registry\|listed\|permissions/);
 const begin=source.indexOf('function pilotAgentsForRequest(');
 const end=source.indexOf('async function runRegisteredAgentPilot(',begin);
 assert.ok(begin>=0&&end>begin);
 const fragment=source.slice(begin,end)
  .replace('prompt:string):number[]','prompt)')
  .replace('const ids:number[]=[];','const ids=[];');
 const sandbox={};
 vm.runInNewContext(fragment,sandbox);
 const route=(prompt)=>Array.from(sandbox.pilotAgentsForRequest(prompt));
 assert.deepEqual(route('What is the status of agent #333?'),[]);
 assert.deepEqual(route('How many agents are in the registry?'),[]);
 assert.deepEqual(route('Investigate SmartBoard conversion with agents #333 and #336'),[333,336]);
});
