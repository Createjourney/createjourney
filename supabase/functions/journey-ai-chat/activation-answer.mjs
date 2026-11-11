export function isActivationReadinessQuestion(prompt){
 const q=String(prompt||"").trim();
 if(!q||q.length>800)return false;
 if(/\b(?:activate|activation|enable|turn on|bring online|ready to (?:run|deploy|activate)|start (?:working|operating)|runtime readiness)\b/i.test(q)
    &&/\b(?:agents?|workforce|607|agent registry)\b/i.test(q))return true;
 if(/\bwhich agents\b/i.test(q)&&/\b(?:working|ready|operational|callable|immediately|need development)\b/i.test(q))return true;
 return false;
}
export function summarizeActivationResponse(plan,status){
 if(status==="BUSINESS_SELECTION_REQUIRED")
  return "Select the business you want to inspect first. No agent was activated or executed.";
 if(status!=="READ_ONLY_LIVE"||!plan||plan.execution_performed!==false)
  return "I could not verify the live activation plan for your authenticated business. I did not activate or execute any agent.";
 const s=plan.summary||{},candidates=plan.pilot_candidates||[];
 if(!Number.isInteger(s.registered)||!Number.isInteger(s.pilot_callable_count)||
    !Array.isArray(candidates)||!Number.isInteger(plan.unmet_requirements_count))
  return "The activation controller returned incomplete or inconsistent readiness evidence. No agent was activated.";
 const names=candidates.map(x=>`#${x.agent_no} (${x.name}): ${x.next_step}`).join("; ");
 return `Live CreateJourney workforce readiness: ${s.registered} registered agents. ${s.pilot_callable_count} are configured for the existing **analysis-only** runtime adapter: ${names||"none"}.\n\n${plan.unmet_requirements_count} agents still require implementation, tools, configuration or approved runtime permissions. **Verified operational agents: 0** according to the controller's available verification evidence. Eligible pilot agents are NOT independently verified operational.\n\nNo agents were activated or executed by this request. Mass activation is blocked until each agent passes implementation, authorization, functional testing, and monitoring gates. The next available action is an explicit synthetic pilot test of an authorized agent, followed by evidence-based rollout.`;
}
