#!/usr/bin/env node
/** Production M3 smoke: no writes, no credentials printed, optional authenticated owner E2E. */
import assert from "node:assert/strict";
const origin="https://pbiivpehdatvmyaxwixk.supabase.co";
const endpoint=origin+"/functions/v1/journey-ai-agent-intelligence";
const show=(name,result)=>console.log(JSON.stringify({check:name,...result}));
async function post(path,payload,token,apikey){
 const headers={"Content-Type":"application/json"};
 if(token)headers.Authorization="Bearer "+token;
 if(apikey)headers.apikey=apikey;
 const response=await fetch(origin+"/functions/v1/"+path,{method:"POST",headers,
  body:JSON.stringify(payload),signal:AbortSignal.timeout(path==="journey-ai-chat"?180000:25000)});
 const content=await response.json().catch(()=>({}));
 return {status:response.status,content};
}
const publicReq=await post("journey-ai-agent-intelligence",{action:"overview"});
assert.ok([401,403].includes(publicReq.status),"Anonymous gateway must reject (got "+publicReq.status+")");
show("anonymous_denied",{http:publicReq.status,result:"PASS"});
const invalidReq=await post("journey-ai-agent-intelligence",{action:"overview"},"not-a-real-jwt");
assert.ok([401,403].includes(invalidReq.status),"Invalid JWT must be rejected");
show("invalid_token_denied",{http:invalidReq.status,result:"PASS"});
const chatAnon=await post("journey-ai-chat",{prompt:"How many agents are registered?"});
assert.ok([401,403].includes(chatAnon.status),"Unauthenticated chat must reject");
show("journey_ai_chat_anonymous_denied",{http:chatAnon.status,result:"PASS"});
const chatInvalid=await post("journey-ai-chat",{prompt:"What does Agent #333 do?"},"invalid-test-jwt");
assert.ok([401,403].includes(chatInvalid.status),"Invalid chat token must reject");
show("journey_ai_chat_invalid_token_denied",{http:chatInvalid.status,result:"PASS"});
const key=process.env.CJ_SUPABASE_ANON_KEY||"";
const token=process.env.CJ_TEST_ACCESS_TOKEN||"";
const business=process.env.CJ_TEST_BUSINESS_ID||"";
if(!key||!token){
 show("authenticated_owner_suite",{result:"BLOCKED_MISSING_AUTHENTICATED_TEST_CREDENTIALS",
  note:"Requires an authenticated, authorized owner JWT; cannot verify owner behavior without it."});
 process.exit(0);
}
const scope=business?{business_id:business}:{};
async function call(action,extra={}){
 const r=await post("journey-ai-agent-intelligence",{action,...scope,...extra},token,key);
 assert.equal(r.status,200,"Authenticated "+action+" failed (HTTP "+r.status+", error "+String(r.content?.error||"unknown")+")");
 assert.equal(r.content.execution_performed,false,"Read-only function must not execute agents");
 assert.equal(r.content.external_operations_verified,false,"No unverified external execution");
 return r.content;
}
const overview=await call("overview");
assert.ok(overview.summary?.registered_agents>=600,"Workforce summary unexpectedly incomplete");
assert.ok(overview.summary?.by_lifecycle_status);
show("authenticated_overview",{result:"PASS",registered_agents:overview.summary.registered_agents});
const departments=await call("departments");
assert.ok(departments.entries?.length>=70);
show("authenticated_departments",{result:"PASS",count:departments.entries.length});
const roster=await call("roster",{limit:2});
assert.equal(roster.entries?.length,2);
assert.ok(Number.isInteger(roster.entries[0].agent_no));
show("authenticated_roster",{result:"PASS",rows:roster.entries.length});
const agent=await call("agent_detail",{agent_no:333});
assert.equal(agent.agent?.agent_no,333);
assert.ok(agent.agent?.readiness);
assert.equal(agent.agent?.independently_verified_external_operation,false);
show("authenticated_agent_detail",{result:"PASS",readiness:agent.agent.readiness});
const denied=await post("journey-ai-agent-intelligence",{
 action:"overview",business_id:"00000000-0000-4000-8000-000000000000"},token,key);
assert.equal(denied.status,403,"Cross-business request must be forbidden");
show("cross_business_denied",{result:"PASS",http:denied.status});
if(process.env.CJ_TEST_CHAT==="YES"){
 const chat=await post("journey-ai-chat",{
  prompt:"What is the status of agent #333?",
  context:business?{business_id:business}:{}
 },token,key);
 assert.equal(chat.status,200,"Chat failed HTTP "+chat.status+" with "+String(chat.content?.error||"unknown"));
 assert.equal(chat.content.agent_workforce_status,"READ_ONLY_LIVE",
  "Chat must ground in live authorized workforce evidence");
 assert.ok(chat.content.reply?.trim(),"Missing chat synthesis");
 assert.equal(chat.content.registered_agent_jobs?.length,0,
  "Informational status question must never launch a registered agent job");
 show("authenticated_chat_handoff",{result:"PASS",workforce_status:chat.content.agent_workforce_status,
  launched_registered_jobs:0});
}
show("authenticated_owner_suite",{result:"PASS",verified_authenticated:true,
 no_business_write_attempts:true});
