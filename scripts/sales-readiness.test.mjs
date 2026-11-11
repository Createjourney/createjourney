import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {assessSalesReadiness,SALES_REQUIREMENTS,REQUIRED_GATES,verifyReceipt} from './sales-readiness.mjs';
const signingKey='local-tests-only-not-production',businessId='test-business',campaignId='test-campaign',now=1800000000000;
const agents=[...new Set(SALES_REQUIREMENTS.flatMap(x=>x.agents))].map(agent_no=>({agent_no,status:'VERIFIED'}));
function receipt(gate,overrides={}){
 const r={gate,business_id:businessId,campaign_id:campaignId,verified_at:now-1000,expires_at:now+60000,status:'PASS',...overrides};
 const message=JSON.stringify(['cj-sales-v1',r.gate,r.business_id,r.campaign_id,r.verified_at,r.expires_at,r.status]);
 return {...r,signature:createHmac('sha256',signingKey).update(message).digest('hex')};
}
const input=()=>({agents,receipts:REQUIRED_GATES.map(receiptGate=>receipt(receiptGate)),businessId,campaignId,signingKey,now});
test('empty state is blocked',()=>{
 const r=assessSalesReadiness();
 assert.equal(r.launch_status,'BLOCKED');assert.equal(r.requirements.length,8);assert.equal(r.blockers.length,8);
});
test('planned agent cannot pass registry readiness',()=>{
 const a=input();a.agents=[...agents.filter(x=>x.agent_no!==519),{agent_no:519,status:'PLANNED'}];
 const r=assessSalesReadiness(a);assert.equal(r.readiness_verified,false);assert.ok(r.blockers.includes('registry_agents_verified'));
});
test('connected label is not execution evidence',()=>{
 const r=assessSalesReadiness({agents,connections:[{provider:'meta',status:'connected'}],businessId,campaignId,signingKey,now});
 assert.equal(r.launch_status,'BLOCKED');assert.ok(r.blockers.includes('platform_permissions_verified'));
});
test('missing signing key always refuses readiness',()=>{
 assert.equal(assessSalesReadiness({...input(),signingKey:undefined}).readiness_verified,false);
});
test('forged signed data is rejected',()=>{
 const a=input();a.receipts=a.receipts.map(r=>({...r,signature:'0'.repeat(64)}));
 assert.equal(assessSalesReadiness(a).readiness_verified,false);
});
test('receipts are tenant and campaign bound',()=>{
 const r=receipt('approved_campaign');
 assert.equal(verifyReceipt(r,{signingKey,businessId:'another-business',campaignId,now}),false);
 assert.equal(verifyReceipt(r,{signingKey,businessId,campaignId:'another-campaign',now}),false);
});
test('expired, future and overlong receipts fail',()=>{
 const args={signingKey,businessId,campaignId,now};
 assert.equal(verifyReceipt(receipt('approved_campaign',{expires_at:now}),args),false);
 assert.equal(verifyReceipt(receipt('approved_campaign',{verified_at:now+1}),args),false);
 assert.equal(verifyReceipt(receipt('approved_campaign',{expires_at:now+86400001}),args),false);
});
test('a correctly signed receipt validates',()=>{
 const args={signingKey,businessId,campaignId,now};
 assert.equal(verifyReceipt(receipt('approved_campaign'),args),true);
 assert.equal(verifyReceipt({...receipt('approved_campaign'),signature:''},args),false);
});
test('all verified gates means final review, not authorization to launch',()=>{
 const r=assessSalesReadiness(input());assert.equal(r.launch_status,'READY_FOR_AUTHORIZED_FINAL_REVIEW');
 assert.equal(r.readiness_verified,true);assert.equal(r.blockers.length,0);
 assert.ok(r.requirements.every(x=>x.operational===false));
});
test('one missing gate blocks readiness',()=>{
 const a=input();a.receipts.pop();assert.equal(assessSalesReadiness(a).launch_status,'BLOCKED');
});
test('agent requirements contain no duplicate IDs within each group',()=>{
 for(const group of SALES_REQUIREMENTS)assert.equal(group.agents.length,new Set(group.agents).size);
});
test('null inputs fail closed without throwing',()=>{
 const r=assessSalesReadiness({agents:[null],connections:[null],receipts:[null]});
 assert.equal(r.launch_status,'BLOCKED');
});
