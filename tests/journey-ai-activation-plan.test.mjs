import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isActivationReadinessQuestion,summarizeActivationResponse} from "../supabase/functions/journey-ai-chat/activation-answer.mjs";
test("owner activation inquiries route to evidence-based plan",()=>{
 for(const q of ["Activate all 607 agents","Which agents can be brought online immediately?",
  "How do we activate our agents?","Which agents are ready to run?"])
  assert.ok(isActivationReadinessQuestion(q),"missed "+q);
 assert.equal(isActivationReadinessQuestion("Show booking revenue"),false);
});
test("activation plan names three pilot candidates and blocks falsely operational labeling",()=>{
 const p={summary:{registered:607,pilot_callable_count:3},
 pilot_candidates:[{agent_no:2,name:"Evidence",next_step:"RUN_ISOLATED_AUTHENTICATED_ANALYSIS_TEST"},
 {agent_no:333,name:"SmartBoard",next_step:"RUN_ISOLATED_AUTHENTICATED_ANALYSIS_TEST"},
 {agent_no:336,name:"Conversion",next_step:"RUN_ISOLATED_AUTHENTICATED_ANALYSIS_TEST"}],
 unmet_requirements_count:604,execution_performed:false};
 const m=summarizeActivationResponse(p,"READ_ONLY_LIVE");
 assert.match(m,/607 registered/);assert.match(m,/604 agents still require/);
 assert.match(m,/#2/);assert.match(m,/#333/);assert.match(m,/#336/);
 assert.match(m,/No agents were activated or executed/);
 assert.match(m,/Verified operational agents: 0/);
 assert.doesNotMatch(m,/607.*operational/);
});
test("activation plan fails closed and refuses leaked credentials",()=>{
 assert.match(summarizeActivationResponse({execution_performed:true},"READ_ONLY_LIVE"),/could not verify/);
 assert.match(summarizeActivationResponse(null,"UNAVAILABLE"),/did not activate/);
 assert.match(summarizeActivationResponse({},"BUSINESS_SELECTION_REQUIRED"),/Select the business/);
 const s=readFileSync("supabase/functions/journey-ai-chat/index.ts","utf8");
 const gate=s.indexOf("isActivationReadinessQuestion(prompt)");
 const runtime=s.indexOf("const registeredPromise=runRegisteredAgentPilot(");
 assert.ok(gate>0 && gate<runtime);
 assert.match(s,/model:"deterministic-agent-activation-plan"/);
});
