import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSalesReadiness,SALES_REQUIREMENTS} from './sales-readiness.mjs';

test('empty production state is blocked and has all required gates',()=>{
 const r=assessSalesReadiness();
 assert.equal(r.launch_status,'BLOCKED');
 assert.equal(r.requirements.length,8);
 assert.equal(r.blockers.length,7);
 assert.equal(r.requirements.every(x=>x.operational===false),true);
});
test('planned agents never imply they are operational',()=>{
 const r=assessSalesReadiness({agents:[{agent_no:519,status:'PLANNED'},{agent_no:520,status:'TESTING'}]});
 assert.equal(r.requirements[0].registered,2);
 assert.equal(r.requirements[0].operational,false);
});
test('connection row and claims alone cannot certify launch',()=>{
 const evidence=Object.fromEntries(['approved_campaign','isolated_agent_e2e','platform_permissions_verified','shopify_order_webhook_verified','customer_checkout_verified','budget_enforcement_verified','consent_and_opt_out_verified'].map(k=>[k,true]));
 const r=assessSalesReadiness({connections:[{provider:'meta',status:'connected'}],evidence});
 assert.equal(r.launch_status,'BLOCKED');
 assert.equal(r.readiness_verified,false);
});
test('requirement agent mappings are unique within each requirement',()=>{
 for(const r of SALES_REQUIREMENTS) assert.equal(new Set(r.agents).size,r.agents.length);
});
