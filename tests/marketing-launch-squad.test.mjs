import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MARKETING_SQUAD,MARKETING_SUPERVISORS,slugBrand,readinessReport,validRoleReceipts,buildRoleInput} from "../supabase/functions/cj-marketing-launch-squad/policy.mjs";
import {isFlourishedMarketingQuestion,renderMarketingReadiness,flourishedMarketingCommand,summarizeMarketingAction,FLOURISHED_PROVISIONAL_BRIEF} from "../supabase/functions/journey-ai-chat/marketing-answer.mjs";
const registry=[...MARKETING_SQUAD.map(x=>({agent_no:x.agent_no,status:"PLANNED"})),...MARKETING_SUPERVISORS.map(agent_no=>({agent_no,status:"PLANNED"}))];
test("launch team uses registered roles, no fake deployments",()=>{
 assert.deepEqual(MARKETING_SQUAD.map(x=>x.agent_no),[520,521,523,527]);
 assert.equal(slugBrand("Flourished Images"),"flourished-images");
 const x=readinessReport(registry,null,0);
 assert.equal(x.specialist_agents.length,4);
 assert.ok(x.specialist_agents.every(v=>v.registry_status==="PLANNED"&&v.verified_registered_agent_runtime===false));
 assert.equal(x.ready_for_live_campaign,false);
 assert.equal(x.marketing_live_publishing_implemented,false);
 assert.equal(x.successful_draft_runs,0);
 assert.ok(x.blockers.includes("BRAND_WORKSPACE_NOT_CONFIGURED"));
});
test("complete receipts must correspond to the correct registered agent IDs",()=>{
 const receipts=MARKETING_SQUAD.map(x=>({agent_no:x.agent_no,status:"ANALYSIS_COMPLETED",
 execution_type:"analysis_only",text:"x".repeat(100)}));
 assert.equal(validRoleReceipts(receipts),true);
 assert.equal(validRoleReceipts(receipts.slice(0,3)),false);
 assert.equal(validRoleReceipts([...receipts.slice(0,3),{...receipts[3],agent_no:999}]),false);
});
test("role instructions flag assumptions and external publication",()=>{
 const text=buildRoleInput({brand_name:"Flourished Images",website_url:""},
  {price_usd:240,shipping_target_days:20},"Plan an internal pre-order launch",[]);
 assert.match(text,/Flourished Images/);assert.match(text,/OWNER_SUPPLIED_UNVERIFIED_BRIEF/);
 assert.match(text,/No paid ads/);assert.match(text,/shipping/);
});
test("Journey AI marketing question is always a read-only readiness lookup",()=>{
 assert.ok(isFlourishedMarketingQuestion("Activate marketing agents for Flourished Images"));
 assert.ok(isFlourishedMarketingQuestion("Build a launch campaign for Flourished Images"));
 assert.equal(isFlourishedMarketingQuestion("Change my CreateJourney billing"),false);
 const data={status:"LIVE_MARKETING_SQUAD_READINESS",specialist_agents:readinessReport(registry,null).specialist_agents,
 blockers:["BRAND_WORKSPACE_NOT_CONFIGURED"],successful_draft_runs:0,workspace_id:null};
 const answer=renderMarketingReadiness(data,"LIVE_MARKETING_SQUAD_READINESS");
 assert.match(answer,/NOT VERIFIED/);assert.match(answer,/no ad spend incurred/i);
 assert.match(answer,/#520/);assert.match(answer,/#527/);
 const chat=readFileSync("supabase/functions/journey-ai-chat/index.ts","utf8");
 assert.ok(chat.indexOf("isFlourishedMarketingQuestion(prompt)")<chat.indexOf("const registeredPromise=runRegisteredAgentPilot"));
 assert.match(chat,/model:"deterministic-external-brand-marketing-squad"/);
 assert.match(chat,/registered_agent_jobs:\[\],execution_performed:false/);
});
test("marketing runtime enforces owner-scope, explicit spend confirmation and prevents customer marketing mutations",()=>{
 const s=readFileSync("supabase/functions/cj-marketing-launch-squad/index.ts","utf8");
 assert.match(s,/auth\.getUser/);
 assert.match(s,/\.eq\("role","owner"\)/);
 assert.match(s,/\.eq\("owner_user_id",ownerId\)/);
 assert.match(s,/body\.confirm_draft_only!==true\|\|body\.confirm_analysis_cost!==true/);
 assert.match(s,/body\.confirm_brand_control!==true/);
 assert.doesNotMatch(s,/marketing\.publish|customer\.outreach|smartboard\.configure|sendScheduledPost/);
});

test("owner explicitly confirms brand setup and draft-only AI costs before commands are accepted",()=>{
 assert.equal(flourishedMarketingCommand("What's the marketing readiness for Flourished Images?"),"readiness");
 assert.equal(flourishedMarketingCommand("Set up Flourished Images marketing workspace"),"readiness");
 assert.equal(flourishedMarketingCommand("I confirm I own Flourished Images. Set up the Flourished Images marketing workspace."),"setup_brand");
 assert.equal(flourishedMarketingCommand("Generate a Flourished Images marketing campaign draft"),"readiness");
 assert.equal(flourishedMarketingCommand("Generate a Flourished Images campaign draft. I approve AI analysis costs. Draft only."),"draft_campaign");
 assert.equal(FLOURISHED_PROVISIONAL_BRIEF.product_listing_verified,false);
 assert.equal(FLOURISHED_PROVISIONAL_BRIEF.shipping_capacity_verified,false);
 assert.match(summarizeMarketingAction({status:"DRAFT_WORKSPACE_CREATED"},"setup_brand"),/Nothing was published/i);
 assert.match(summarizeMarketingAction({status:"DRAFT_SUCCEEDED",run_id:"sample",external_actions_performed:false,
  campaign_draft:{audience:"a",strategy_and_copy:"b",execution_plan:"c",independent_qa:"d"}},"draft_campaign"),/Job receipt: sample/);
});
