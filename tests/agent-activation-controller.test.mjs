import test from "node:test";
import assert from "node:assert/strict";
import {inspectAgent,summarizeFleet,activationPlan} from "../supabase/functions/cj-agent-activation-controller/policy.mjs";
import {readFileSync} from "node:fs";
const tools=[{tool_key:"ai.analysis",enabled:true},{tool_key:"smartboard.configure",enabled:false}];
const pilots=[2,333,336];
const permissions=pilots.map(agent_no=>({agent_no,tool_key:"ai.analysis",granted:true,permission_scope:{execution_mode:"analysis_only"}}));
function agent(agent_no,status="PLANNED"){return {agent_no,agent_name:"Agent "+agent_no,department_no:1,
 supervisor_agent_no:197,classification:"SPECIALIST",status,specification:{}}}
test("classifies all 607 entries; only 3 pilot callable and zero verified operational",()=>{
 const arr=Array.from({length:607},(_,i)=>inspectAgent(agent(i+1,pilots.includes(i+1)?"TESTING":"PLANNED"),
  permissions.filter(g=>g.agent_no===i+1),tools,[],[]));
 const s=summarizeFleet(arr);
 assert.equal(s.registered,607);
 assert.equal(s.by_lifecycle.PLANNED,604);
 assert.equal(s.by_lifecycle.TESTING,3);
 assert.equal(s.by_readiness.PILOT_READY_FOR_AUTHENTICATED_TEST,3);
 assert.equal(s.by_readiness.REQUIRES_DEVELOPMENT,604);
 assert.deepEqual(s.pilot_callable_agent_numbers,pilots);
 assert.equal(s.verified_operational_count,0);
 const plan=activationPlan(arr);
 assert.equal(plan.pilot_candidates.length,3);
 assert.equal(plan.requires_development.length,604);
 assert.equal(plan.can_mass_activate_now,false);
 assert.equal(plan.execution_performed,false);
});
test("no permission, disabled tool or wrong scope cannot yield callable runtime",()=>{
 const a=agent(333,"TESTING");
 assert.equal(inspectAgent(a,[],tools).authorized_pilot_callable,false);
 assert.equal(inspectAgent(a,[{agent_no:333,tool_key:"ai.analysis",granted:true,permission_scope:{execution_mode:"execute"}}],tools).authorized_pilot_callable,false);
 assert.equal(inspectAgent(a,permissions.filter(x=>x.agent_no===333),[{tool_key:"ai.analysis",enabled:false}]).authorized_pilot_callable,false);
});
test("successful provider output still cannot produce independent verification claims",()=>{
 const a=agent(333,"TESTING");
 const e=inspectAgent(a,permissions.filter(g=>g.agent_no===333),tools,[],[{agent_no:333,status:"SUCCEEDED",
  output:{execution_type:"analysis_only",verification_status:"UNVERIFIED",text:"Synthetic findings"}}]);
 assert.equal(e.readiness,"PILOT_EXECUTED_UNVERIFIED");
 assert.equal(e.verified_operational,false);
 assert.equal(e.successful_business_jobs,1);
});
test("controller authenticates owner, refuses bulk status writes, gates pilot behind explicit synthetic confirmation",()=>{
 const s=readFileSync("supabase/functions/cj-agent-activation-controller/index.ts","utf8");
 assert.match(s,/auth\.getUser/);
 assert.match(s,/business_members/);
 assert.match(s,/\.eq\("user_id",user\.user\.id\)/);
 assert.match(s,/\.eq\("business_id",businessId\)/);
 assert.match(s,/confirm_analysis_only!==true\|\|body\.synthetic_only!==true/);
 assert.match(s,/cj-agent-runtime|function_slug/);
 assert.doesNotMatch(s,/from\("cj_agent_registry"\)\.update/);
 assert.doesNotMatch(s,/service_role.*req\.headers/i);
});
