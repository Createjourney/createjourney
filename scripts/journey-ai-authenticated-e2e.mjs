#!/usr/bin/env node
/**
 * Opt-in authenticated E2E smoke test for the registered Journey AI pilot.
 * Writes ONLY cj_agent_jobs / cj_agent_job_events in a dedicated isolated test business.
 * Never run against an actual customer business. No service-role key is used.
 *
 * Required: CJ_SUPABASE_URL, CJ_SUPABASE_ANON_KEY, CJ_TEST_ACCESS_TOKEN,
 * CJ_TEST_BUSINESS_ID, CJ_ISOLATED_TEST_BUSINESS=YES.
 */
import assert from "node:assert/strict";

const env=process.env;
function required(name){const v=env[name];if(!v)throw Error("Missing "+name);return v;}
function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);}
const results=[];
const record=(name,details)=>{results.push({name,...details});console.log(JSON.stringify({test:name,...details}));};
async function main(){
  assert.equal(env.CJ_ISOLATED_TEST_BUSINESS,"YES","Refusing to write jobs without explicit isolated test-business acknowledgement");
  const url=required("CJ_SUPABASE_URL").replace(/\/$/,"");
  assert.match(url,/^https:\/\/[a-z0-9-]+\.supabase\.co$/i,"Only an HTTPS Supabase project URL is accepted");
  const anon=required("CJ_SUPABASE_ANON_KEY"),token=required("CJ_TEST_ACCESS_TOKEN"),business=required("CJ_TEST_BUSINESS_ID");
  assert.ok(uuid(business),"CJ_TEST_BUSINESS_ID must be a UUID");
  const headers={authorization:"Bearer "+token,apikey:anon,"content-type":"application/json"};
  async function post(fn,body,timeout=90000){
    const response=await fetch(url+"/functions/v1/"+fn,{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
    const data=await response.json().catch(()=>({}));
    return {http:response.status,data};
  }
  const denied=await post("cj-agent-runtime",{action:"submit",business_id:"00000000-0000-4000-8000-000000000000",agent_no:333,request:"Authorization denial test"});
  assert.equal(denied.http,403,"Cross-business submission must be denied");
  record("cross_business_denial",{http:denied.http});
  for(const agentNo of [333,336]){
    const submitted=await post("cj-agent-runtime",{action:"submit",business_id:business,agent_no:agentNo,
      request:"Analyze synthetic test funnel: 100 taps, 20 booking clicks, 5 bookings. This is fixture data, not verified business metrics.",
      context:{source:"isolated-e2e-smoke",synthetic:true}});
    assert.equal(submitted.http,201,"Agent submit failed: "+JSON.stringify({agentNo,http:submitted.http,error:submitted.data?.error}));
    const jobId=submitted.data?.job?.id;
    assert.ok(uuid(jobId),"Submit must return a real job UUID");
    const executed=await post("cj-agent-runtime",{action:"run",business_id:business,job_id:jobId},120000);
    assert.equal(executed.http,200,"Agent run failed: "+JSON.stringify({agentNo,http:executed.http,error:executed.data?.error}));
    assert.equal(executed.data.status,"SUCCEEDED");
    assert.equal(executed.data.output?.execution_type,"analysis_only");
    assert.equal(executed.data.output?.verification_status,"UNVERIFIED");
    assert.ok(executed.data.output?.text?.trim(),"Analysis must not be empty");
    const status=await post("cj-agent-runtime",{action:"status",business_id:business,job_id:jobId});
    assert.equal(status.http,200);
    assert.equal(status.data.job?.status,"SUCCEEDED");
    assert.ok(status.data.events?.some(e=>e.event_type==="QUEUED"),"Missing queued event");
    assert.ok(status.data.events?.some(e=>e.event_type==="STARTED"),"Missing started event");
    assert.ok(status.data.events?.some(e=>e.event_type==="ANALYSIS_COMPLETED"),"Missing analysis completion evidence");
    assert.ok(!status.data.events?.some(e=>e.event_type==="EXTERNAL_ACTION_COMPLETED"),"Analysis must not claim external execution");
    const duplicate=await post("cj-agent-runtime",{action:"run",business_id:business,job_id:jobId});
    assert.equal(duplicate.http,409,"Repeated run must not re-execute a completed job");
    record("registered_agent",{agent_no:agentNo,job_id:jobId,status:"SUCCEEDED",events:status.data.events.length,duplicate_http:duplicate.http});
  }
  const chat=await post("journey-ai-chat",{
    prompt:"Use registered agents #333 and #336 to inspect the synthetic test funnel. Do not modify boards, journeys, settings, or destinations. Distinguish synthetic inputs from verified data.",
    context:{business_id:business,screen:"isolated-e2e-smoke",boards:[],synthetic:true}
  },180000);
  assert.equal(chat.http,200,"Journey AI chat failed: "+JSON.stringify({http:chat.http,error:chat.data?.error}));
  assert.ok(chat.data.reply?.trim(),"Chat synthesis is missing");
  const receipts=chat.data.registered_agent_jobs;
  assert.ok(Array.isArray(receipts),"Chat must return registered agent receipts");
  for(const agentNo of [333,336]){
    const receipt=receipts.find(r=>r.agent_no===agentNo);
    assert.ok(receipt,"Missing receipt for agent "+agentNo);
    assert.equal(receipt.status,"SUCCEEDED","Chat registered-agent pilot did not succeed");
    assert.ok(uuid(receipt.job_id),"Chat receipt must include persisted job UUID");
    assert.equal(receipt.execution_type,"analysis_only");
    assert.equal(receipt.verification_status,"UNVERIFIED");
    const check=await post("cj-agent-runtime",{action:"status",business_id:business,job_id:receipt.job_id});
    assert.equal(check.http,200,"Chat job not retrievable");
    assert.equal(check.data.job?.status,"SUCCEEDED");
    assert.ok(check.data.events?.some(e=>e.event_type==="ANALYSIS_COMPLETED"),"Chat job missing persisted evidence");
  }
  record("chat_orchestration",{status:"SUCCEEDED",job_ids:receipts.map(r=>r.job_id),verified_analysis_jobs:2});
  console.log(JSON.stringify({result:"PASS",scope:"isolated test business; analysis only",checks:results.length}));
}
main().catch(error=>{console.error(JSON.stringify({result:"FAIL",message:String(error?.message||error),completed_checks:results}));process.exitCode=1;});
