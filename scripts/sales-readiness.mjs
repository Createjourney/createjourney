// Side-effect-free launch readiness evaluation; never a substitute for server authorization.
import {createHmac,timingSafeEqual} from 'node:crypto';
export const SALES_REQUIREMENTS=Object.freeze([
 {key:'strategy',label:'Campaign planning',agents:[519,520,521,523]},
 {key:'prospecting',label:'Prospect research and qualification',agents:[520,509,511]},
 {key:'creative',label:'Creative production and review',agents:[521,524]},
 {key:'engagement',label:'Permitted social engagement',agents:[409,411,412]},
 {key:'follow_up',label:'Customer follow-up',agents:[408,416,417]},
 {key:'ads',label:'Ad budget and optimization',agents:[352,354,525]},
 {key:'commerce',label:'Order conversion and attribution',agents:[345,337,353]},
 {key:'reporting',label:'Sales performance reporting',agents:[524,526]}
]);
export const REQUIRED_GATES=Object.freeze([
 'approved_campaign','isolated_agent_e2e','platform_permissions_verified',
 'shopify_order_webhook_verified','customer_checkout_verified',
 'budget_enforcement_verified','consent_and_opt_out_verified'
]);
const normalize=x=>String(x??'').trim().toUpperCase();
const safeArray=x=>Array.isArray(x)?x:[];
const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
/**
 * HMAC receipts are issued ONLY by a future authenticated server that independently
 * verifies provider outcomes. Never expose signingKey or accept caller-issued receipts.
 * Each receipt is bound to business, campaign and gate, with maximum 24-hour validity.
 */
export function verifyReceipt(r,{signingKey,businessId,campaignId,now=Date.now()}={}){
 if(!r||!signingKey||!validId(businessId)||!validId(campaignId))return false;
 if(!REQUIRED_GATES.includes(r.gate)||r.status!=='PASS')return false;
 if(r.business_id!==businessId||r.campaign_id!==campaignId)return false;
 if(!Number.isSafeInteger(r.verified_at)||!Number.isSafeInteger(r.expires_at))return false;
 if(r.verified_at>now||r.expires_at<=now||r.expires_at<=r.verified_at||r.expires_at-r.verified_at>86400000)return false;
 if(typeof r.signature!=='string'||!/^[0-9a-f]{64}$/.test(r.signature))return false;
 const message=JSON.stringify(['cj-sales-v1',r.gate,r.business_id,r.campaign_id,r.verified_at,r.expires_at,r.status]);
 const expected=createHmac('sha256',signingKey).update(message).digest();
 return timingSafeEqual(expected,Buffer.from(r.signature,'hex'));
}
/**
 * Read-only snapshot. A valid READY_FOR_AUTHORIZED_FINAL_REVIEW result is NOT
 * permission to launch campaigns. Enforce roles, scope and approvals separately.
 */
export function assessSalesReadiness({agents=[],connections=[],receipts=[],businessId,campaignId,signingKey,now=Date.now()}={}){
 const byId=new Map(safeArray(agents).filter(a=>a&&Number.isInteger(Number(a.agent_no))).map(a=>[Number(a.agent_no),a]));
 const requirements=SALES_REQUIREMENTS.map(group=>{
  const registered=group.agents.map(n=>byId.get(n)).filter(Boolean);
  const statuses=registered.map(a=>({agent_no:Number(a.agent_no),status:normalize(a.status)}));
  const verified=registered.length===group.agents.length&&statuses.every(a=>['VERIFIED','DEPLOYED','MONITORING'].includes(a.status));
  return {key:group.key,label:group.label,agent_numbers:group.agents,registered:registered.length,
   expected:group.agents.length,statuses,verified_registry:verified,operational:false,
   reason:verified?'Registry status only; external execution needs separate evidence':'Registry status not verified'};
 });
 const connection_observations=safeArray(connections).filter(Boolean).map(c=>({provider:String(c.provider??''),status:String(c.status??'')}));
 const checks=Object.fromEntries(REQUIRED_GATES.map(gate=>[gate,safeArray(receipts).some(r=>r?.gate===gate&&verifyReceipt(r,{signingKey,businessId,campaignId,now}))]));
 const blockers=REQUIRED_GATES.filter(gate=>!checks[gate]);
 if(!requirements.every(r=>r.verified_registry))blockers.push('registry_agents_verified');
 const ready=blockers.length===0;
 return {mode:'READ_ONLY',launch_status:ready?'READY_FOR_AUTHORIZED_FINAL_REVIEW':'BLOCKED',
  readiness_verified:ready,requirements,connection_observations,checks,blockers,
  note:'Signed evidence is necessary, not sufficient, for authorization. No provider action occurs.'};
}
