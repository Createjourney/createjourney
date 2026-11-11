// Registered agent IDs identify planned role specifications, not proven runtime health.
export const MARKETING_SQUAD=Object.freeze([
 {agent_no:520,role:"Audience & offer hypotheses",goal:"Identify realistic target segments, motivations, objections, channel fit. Do not invent market research."},
 {agent_no:521,role:"Campaign strategy & messaging",goal:"Create a differentiated 14-day campaign plan and draft ready-to-review marketing copy with measurable CTAs."},
 {agent_no:523,role:"Execution planning",goal:"Turn strategy into a day-by-day owner-controlled launch checklist, channels, dependencies and metrics."},
 {agent_no:527,role:"Independent campaign QA",goal:"Challenge unsupported scarcity, delivery, manufacturing, conversion, pricing and compliance claims; mark anything requiring confirmation."}
]);
export const MARKETING_SUPERVISORS=Object.freeze([64,65,66,67]);
export function slugBrand(name){
 return String(name||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
}
export function readinessReport(registry, workspace, outputsCount=0){
 const byId=new Map(registry.map(x=>[x.agent_no,x]));
 const agents=MARKETING_SQUAD.map(spec=>{
  const row=byId.get(spec.agent_no);
  return {...spec,registry_status:row?.status||"MISSING",
    separate_marketing_adapter_available:true,
    verified_registered_agent_runtime:false,
    note:"Dedicated draft adapter does not change global registry lifecycle or prove agent operations."};
 });
 const blockers=[
  !workspace?"BRAND_WORKSPACE_NOT_CONFIGURED":null,
  "SHOPIFY_PRODUCT_AND_CHECKOUT_NOT_VERIFIED_IN_CREATEJOURNEY",
  "SOCIAL_PUBLISHING_INTEGRATIONS_NOT_VERIFIED_IN_CREATEJOURNEY",
  "PRODUCTION_AND_FULFILLMENT_CAPACITY_NOT_VERIFIED",
  "APPROVED_CREATIVE_AND_AD_BUDGET_NOT_VERIFIED",
  outputsCount>0?null:"NO_SUCCESSFUL_AUTHENTICATED_CAMPAIGN_DRAFT_RECEIPT"
 ].filter(Boolean);
 return {squad_name:"Marketing Launch Squad V1",brand_name:workspace?.brand_name||null,
  specialist_agents:agents,department_leadership:MARKETING_SUPERVISORS.map(agent_no=>({
    agent_no,registry_status:byId.get(agent_no)?.status||"MISSING",active_workflow:false})),
  draft_runtime_implemented:true,marketing_live_publishing_implemented:false,
  externally_verified_marketing_operations:0,successful_draft_runs:outputsCount,
  ready_for_live_campaign:false,blockers,execution_performed:false};
}
export function buildRoleInput(brand,brief,userRequest,prior){
 return JSON.stringify({brand_name:brand.brand_name,
  website_url:brand.website_url||"NOT_VERIFIED",verified_facts:brief,
  owner_request:userRequest,previous_specialist_findings:prior||[],
  provenance:"OWNER_SUPPLIED_UNVERIFIED_BRIEF",
  unverified_claims_rule:"Do not state production inventory, guaranteed delivery, available checkout, or social integrations as verified unless the owner provided evidence.",
  policy:"No paid ads, social publication, orders, external messaging, or third-party mutations."}).slice(0,14000);
}
export function validRoleReceipts(receipts){
 return receipts.length===MARKETING_SQUAD.length && receipts.every((r,i)=>r.agent_no===MARKETING_SQUAD[i].agent_no &&
  r.status==="ANALYSIS_COMPLETED"&&typeof r.text==="string"&&r.text.trim().length>=50&&r.execution_type==="analysis_only");
}
