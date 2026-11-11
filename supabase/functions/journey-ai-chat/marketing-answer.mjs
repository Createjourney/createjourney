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

export function flourishedMarketingCommand(prompt){
 const q=String(prompt||"");
 if(!isFlourishedMarketingQuestion(q))return "not_requested";
 if(/\b(?:set\s*up|create|initialize|register)\b/i.test(q)&&/\bmarketing\s+(?:workspace|squad|team)|brand\s+workspace\b/i.test(q)&&
    /\b(?:i\s+confirm\s+(?:that\s+)?i\s+(?:own|control)|i\s+(?:own|control)\s+and\s+authorize)\b/i.test(q))
  return "setup_brand";
 if(/\b(?:generate|create|run|prepare)\b/i.test(q)&&/\b(?:campaign|launch|marketing)\s+draft\b/i.test(q)&&
    /\bi\s+approve\s+(?:the\s+)?(?:ai\s+)?analysis\s+costs\b/i.test(q)&&/\bdraft\s+only\b/i.test(q))
  return "draft_campaign";
 return "readiness";
}
export function summarizeMarketingAction(result,command){
 if(command==="setup_brand"){
  if(result?.status!=="DRAFT_WORKSPACE_CREATED"&&result?.status!=="ALREADY_CONFIGURED")
   return "I could not verify that your Flourished Images marketing workspace was created. No campaign was generated.";
  return `Flourished Images marketing workspace: ${result.status}. This is an owner-scoped external-brand workspace, not a live Shopify or social connection. No marketing content was published. Next, provide/verify a product brief and approve a draft-only campaign analysis.`;
 }
 if(command==="draft_campaign"){
  if(result?.status!=="DRAFT_SUCCEEDED"||!result?.campaign_draft||result?.external_actions_performed!==false)
   return "The marketing squad draft did not produce verified completion receipts. Do not treat it as complete; check the marketing job record.";
  const x=result.campaign_draft;
  const sections=[["Audience",x.audience],["Strategy and messaging",x.strategy_and_copy],
   ["Execution calendar",x.execution_plan],["Independent quality review",x.independent_qa]];
  return `Flourished Images campaign analysis DRAFT completed. Job receipt: ${result.run_id}. All four draft-only specialists returned analysis receipts. This does not verify external action or Shopify/social connections. Nothing was published or purchased.\n\n`+
   sections.map(([label,v])=>`### ${label}\n${String(v||"No output").slice(0,6500)}`).join("\n\n");
 }
 return "No marketing action requested.";
}
