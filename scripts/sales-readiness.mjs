// Pure, side-effect-free launch gating. A registry entry is not execution evidence.
export const SALES_REQUIREMENTS = Object.freeze([
  {key:'strategy',label:'Campaign planning',agents:[519,520,521,523]},
  {key:'prospecting',label:'Prospect research and qualification',agents:[520,509,511]},
  {key:'creative',label:'Creative production and review',agents:[521,524]},
  {key:'engagement',label:'Permitted social engagement',agents:[409,411,412]},
  {key:'follow_up',label:'Customer follow-up',agents:[408,416,417]},
  {key:'ads',label:'Ad budget and optimization',agents:[352,354,525]},
  {key:'commerce',label:'Order conversion and attribution',agents:[345,337,353]},
  {key:'reporting',label:'Sales performance reporting',agents:[524,526]}
]);

const normalize = value => String(value ?? '').trim().toUpperCase();
export function assessSalesReadiness({agents=[],connections=[],evidence={}}={}) {
  const byId=new Map(agents.map(a=>[Number(a.agent_no),a]));
  const mapped=SALES_REQUIREMENTS.map(group=>{
    const registered=group.agents.map(n=>byId.get(n)).filter(Boolean);
    return {key:group.key,label:group.label,agent_numbers:group.agents,
      registered:registered.length,expected:group.agents.length,
      statuses:registered.map(a=>({agent_no:a.agent_no,status:normalize(a.status)})),
      operational:false,reason:'No verified end-to-end execution evidence supplied'};
  });
  // These observations are advisory only; the endpoint never marks an integration operational.
  const connected=connections.map(c=>({provider:String(c.provider??''),status:String(c.status??'')}));
  const checks={
    approved_campaign: evidence.approved_campaign===true,
    isolated_agent_e2e: evidence.isolated_agent_e2e===true,
    platform_permissions_verified: evidence.platform_permissions_verified===true,
    shopify_order_webhook_verified: evidence.shopify_order_webhook_verified===true,
    customer_checkout_verified: evidence.customer_checkout_verified===true,
    budget_enforcement_verified: evidence.budget_enforcement_verified===true,
    consent_and_opt_out_verified: evidence.consent_and_opt_out_verified===true
  };
  const blockers=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  // Never accept arbitrary caller-supplied evidence as verification.
  // Live endpoint supplies no positive evidence until server-side receipts are implemented.
  return {mode:'READ_ONLY',launch_status:'BLOCKED',readiness_verified:false,
    requirements:mapped,connection_observations:connected,checks,blockers,
    note:'Agent registration, configured OAuth, and AI output are not proof of external execution.'};
}
