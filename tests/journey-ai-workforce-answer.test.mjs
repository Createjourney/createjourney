import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {workforceQuestionKind,renderWorkforceAnswer} from "../supabase/functions/journey-ai-chat/workforce-answer.mjs";

test("read-only agent questions route deterministically; mutations and plans do not",()=>{
 const positive=["How many agents do we have and how many are operational?",
  "How many of our 607 registered agents are currently working?",
  "What is the status of Agent #333?","Tell me about Agent 333",
  "Which agents are currently operational?"];
 for(const q of positive)assert.ok(workforceQuestionKind(q),"Failed to recognize: "+q);
 assert.equal(workforceQuestionKind("What is the status of Agent #333?"),"agent_detail");
 assert.equal(workforceQuestionKind("How many registered agents are there?"),"overview");
 for(const q of ["Run agent #333 on this task","Activate Agent #333",
  "Build a plan to deploy our agents","Create a new agent","Analyze how agents could increase revenue"]){
  assert.equal(workforceQuestionKind(q),null,"Should preserve orchestration flow: "+q);
 }
});
test("live overview reports registry counts without hallucinated endpoints or runtime proof",()=>{
 const live={status:"READ_ONLY_LIVE",message:JSON.stringify({registered_agents:607,
  by_lifecycle_status:{PLANNED:604,TESTING:3},business_job_count:1})};
 const msg=renderWorkforceAnswer(live,"overview");
 assert.match(msg,/607 registered agents/);
 assert.match(msg,/604 PLANNED and 3 TESTING/);
 assert.match(msg,/Verified operational agents: not established/);
 assert.match(msg,/authenticated CreateJourney workforce service/);
 assert.doesNotMatch(msg,/GET \/api\/workspaces|Agents panel|Engineering to run/i);
 assert.doesNotMatch(msg,/607 operational|3 operational/i);
});
test("verified agent details are role scoped and no execution is implied",()=>{
 const m=renderWorkforceAnswer({status:"READ_ONLY_LIVE",message:JSON.stringify({
  agent_no:333,agent_name:"SmartBoard Interaction Optimization",lifecycle_status:"TESTING",
  readiness:"TESTING_UNVERIFIED",responsibility:"Analyze synthetic SmartBoard interactions.",
  last_business_job_status:"FAILED",independently_verified_external_operation:false,
  tool_permissions:[{tool_key:"ai.analysis",granted:true,execution_mode:"analysis_only"}]})},"agent_detail");
 assert.match(m,/Agent #333/);assert.match(m,/TESTING_UNVERIFIED/);
 assert.match(m,/FAILED/);assert.match(m,/No verified external operation/);
 assert.match(m,/No agent was executed/);
});
test("permission failure or invalid data never produces a registry claim",()=>{
 for(const x of [{status:"UNAVAILABLE",message:"607"},{status:"NOT_REQUESTED",message:""},
 {status:"READ_ONLY_LIVE",message:"not json"},{status:"READ_ONLY_LIVE",message:"{}"}]){
  const msg=renderWorkforceAnswer(x,"overview");
  assert.doesNotMatch(msg,/607 registered agents/);
  assert.doesNotMatch(msg,/GET \/api/);
 }
 assert.match(renderWorkforceAnswer({status:"BUSINESS_SELECTION_REQUIRED"},"overview"),/Select the business/);
});
test("live Journey AI chat gates informational questions before agent pilot and specialist calls",()=>{
 const s=readFileSync("supabase/functions/journey-ai-chat/index.ts","utf8");
 const gate=s.indexOf("const workforceKind=attachments.length?null:workforceQuestionKind(prompt)");
 const pilot=s.indexOf("const registeredPromise=runRegisteredAgentPilot(");
 const specialists=s.indexOf("const specialistRuns=await Promise.all(");
 assert.ok(gate>0&&gate<pilot&&gate<specialists);
 assert.match(s,/model:"deterministic-live-workforce"/);
 assert.match(s,/registered_agent_jobs:\[\],execution_performed:false/);
});

test("agent without grants must not be portrayed as authorized to execute",()=>{
 const msg=renderWorkforceAnswer({status:"READ_ONLY_LIVE",message:JSON.stringify({
  agent_no:604,agent_name:"Unactivated Registry Agent",lifecycle_status:"PLANNED",
  tool_permissions:[],independently_verified_external_operation:false
 })},"agent_detail");
 assert.match(msg,/No verified tool permissions reported/);
 assert.match(msg,/No verified external operation/);
});
