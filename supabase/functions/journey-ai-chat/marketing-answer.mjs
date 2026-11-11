export function isFlourishedMarketingQuestion(prompt){
 const q=String(prompt||"");
 return /\bflourished\s+images\b/i.test(q)&&
  /\b(?:marketing|campaign|launch|promot|advertis|social|agents?|pre.order|preorder)\b/i.test(q);
}
export function renderMarketingReadiness(data,status){
 if(status==="BUSINESS_OWNER_AUTH_REQUIRED")
  return "Only a signed-in CreateJourney business owner can manage an external-brand marketing squad.";
 if(status!=="LIVE_MARKETING_SQUAD_READINESS"||!data||!Array.isArray(data.specialist_agents))
  return "I cannot verify the live marketing squad configuration for your signed-in session. No agents were executed.";
 const roles=data.specialist_agents.map(x=>`#${x.agent_no} ${x.role} (registry: ${x.registry_status})`).join("; ");
 const blockers=Array.isArray(data.blockers)?data.blockers.join(", "):"UNKNOWN";
 const workspace=data.workspace_id?"Created but launch prerequisites remain":"Not configured in CreateJourney";
 return `Flourished Images marketing squad V1 — live readiness:\n\nPlanned specialist roles: ${roles}.\n\nOwner brand workspace: ${workspace}. Successful owner-authenticated AI draft runs: ${data.successful_draft_runs??0}. External social advertising/publishing: NOT connected or verified within this service. Global registered agent operational status: NOT VERIFIED.\n\nLaunch blockers: ${blockers}.\n\nThe draft-only runtime is implemented, but this check does not prove those agents executed successfully or that the store is ready to sell. No agent was executed, no ad spend incurred, and nothing was published.\n\nNext: configure your owner-controlled Flourished Images brand workspace with the product brief, verify checkout/inventory/shipping, then approve a bounded internal marketing draft test.`;
}
