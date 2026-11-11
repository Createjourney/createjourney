/**
 * Deterministic responses for factual, read-only workforce questions.
 * Never invent API routes, agent operation evidence, or use an LLM to paraphrase
 * authorization failures. Driven only by authenticated backend response.
 */
export function workforceQuestionKind(prompt){
 const q=String(prompt||"").trim();
 if(!q||q.length>700)return null;
 if(/\b(?:run|execute|invoke|launch|start|perform|change|modify|deploy|activate|build|create|write)\b/i.test(q)&&
    !/\b(?:currently|actually)\s+running\b/i.test(q))return null;
 const agent=/\bagent\s*(?:#|number\s*|no\.?\s*)?(\d{1,4})\b/i.test(q);
 if(agent&&/\b(?:what|who|which|tell|show|describe|explain|status|responsib|capabilit|operational|working|available|does)\b/i.test(q))
  return "agent_detail";
 if(/\b(?:how many|number|count|total|status|operational|running|active|working|ready|registered|registry)\b/i.test(q)&&
    /\b(?:agents?|workforce|agent registry)\b/i.test(q))return "overview";
 return null;
}
export function renderWorkforceAnswer(workforce,kind){
 const status=String(workforce?.status||"UNAVAILABLE");
 if(status==="BUSINESS_SELECTION_REQUIRED")
  return "I found more than one business you are authorized to manage. Select the business you want to inspect, then ask again. No agents were run.";
 if(status!=="READ_ONLY_LIVE")
  return "Live Agent Workforce Intelligence could not be verified for this signed-in business session. I cannot confirm the current agent totals or operational readiness. No agents were run. Please retry within your authenticated CreateJourney account.";
 let payload;
 try{payload=JSON.parse(String(workforce.message||""))}catch{
  return "The live agent registry returned an unreadable response. I cannot verify the result; no agents were run.";
 }
 if(kind==="overview"){
  const n=payload.registered_agents;
  const statuses=payload.by_lifecycle_status;
  if(!Number.isSafeInteger(n)||!statuses||typeof statuses!=="object")
   return "The live registry summary was incomplete; operational agent totals remain unverified. No agents were run.";
  const planned=Number(statuses.PLANNED||0),testing=Number(statuses.TESTING||0);
  if(!Number.isSafeInteger(planned)||!Number.isSafeInteger(testing)||planned+testing>n)
   return "The live registry counts were inconsistent; I cannot verify the total. No agents were run.";
  const other=n-planned-testing;
  const breakdown=other>0?` There are ${other} entries with other lifecycle statuses.`:"";
  const jobs=Number.isSafeInteger(payload.business_job_count)?payload.business_job_count:"not available";
  return `Live CreateJourney agent registry: ${n} registered agents — ${planned} PLANNED and ${testing} TESTING.${breakdown}\n\nVerified operational agents: not established by this registry. PLANNED and TESTING are lifecycle labels, not proof of a healthy running agent. The selected business has ${jobs} recorded agent job(s), which by itself does not establish successful execution or external results.\n\nThese counts were retrieved from the authenticated CreateJourney workforce service. No agent was executed for this question.`;
 }
 if(kind==="agent_detail"){
  if(!Number.isSafeInteger(payload.agent_no)||typeof payload.agent_name!=="string"||!payload.lifecycle_status)
   return "The live agent detail response was incomplete. I cannot verify its status. No agents were run.";
  const name=payload.agent_name;
  const responsibility=typeof payload.responsibility==="string"&&payload.responsibility.trim()
   ?payload.responsibility.trim().slice(0,1400):"No responsibility description was returned.";
  const readiness=typeof payload.readiness==="string"?payload.readiness:"UNVERIFIED";
  const last=payload.last_business_job_status||"No business-scoped job receipt returned";
  const external=payload.independently_verified_external_operation===true?"Provider execution evidence reported":"No verified external operation";
  return `Agent #${payload.agent_no}: ${name}\nLifecycle: ${payload.lifecycle_status}\nReadiness: ${readiness}\nResponsibility: ${responsibility}\nBusiness job evidence: ${last}\nExternal execution: ${external}\n\nThis is a live authenticated registry lookup, not proof the agent is running. No agent was executed for this question.`;
 }
 return "Unsupported workforce question. No agents were run.";
}
