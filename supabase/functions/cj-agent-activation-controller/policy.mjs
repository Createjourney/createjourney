// Shared agent workforce classification. No database or environment access.
// "Callable" here means configured for the existing analysis-only pilot adapter,
// NOT an operational or externally acting agent.
export const RUNTIME_ADAPTERS=Object.freeze({
 "analysis_only_v1":Object.freeze({
  function_slug:"cj-agent-runtime",tool:"ai.analysis",
  eligible_lifecycles:["TESTING","VERIFIED","DEPLOYED","MONITORING"],
  action_type:"analysis_only",automatic_activation:false
 })
});
export function inspectAgent(agent,permissions=[],tools=[],dependencies=[],jobs=[]){
 const reasons=[],spec=agent.specification&&typeof agent.specification==="object"?agent.specification:{};
 const specComplete=Object.keys(spec).length>0 && spec.details_pending!==true && typeof spec.task_schema==="object";
 if(!specComplete)reasons.push("MISSING_VALIDATED_EXECUTION_SPECIFICATION");
 if(agent.supervisor_agent_no==null)reasons.push("NO_SUPERVISOR_REFERENCE"); // informational for cross-system agents
 if(!Array.isArray(dependencies)||dependencies.length===0)reasons.push("DEPENDENCY_GRAPH_NOT_DOCUMENTED");
 const enabledKeys=new Set(tools.filter(t=>t.enabled===true).map(t=>t.tool_key));
 const active=permissions.filter(p=>p.agent_no===agent.agent_no&&p.granted===true&&enabledKeys.has(p.tool_key));
 const analysis=active.some(p=>p.tool_key==="ai.analysis"&&p.permission_scope?.execution_mode==="analysis_only");
 const pilot=RUNTIME_ADAPTERS.analysis_only_v1.eligible_lifecycles.includes(agent.status)&&analysis;
 if(!pilot)reasons.push("NO_AUTHORIZED_CALLABLE_RUNTIME_ADAPTER");
 const successful=jobs.filter(j=>j.agent_no===agent.agent_no && j.status==="SUCCEEDED" && j.output?.execution_type==="analysis_only"
  && typeof j.output?.text==="string"&&j.output.text.trim().length>0);
 const verifiedSuccess=successful.some(j=>j.output?.verification_status==="VERIFIED");
 if(!successful.length)reasons.push("NO_SUCCESSFUL_BUSINESS_JOB_RECEIPT");
 // Never equate a provider response or a registry status with externally verified operation.
 if(!verifiedSuccess)reasons.push("NO_INDEPENDENT_VERIFICATION_RECEIPT");
 let readiness="REQUIRES_DEVELOPMENT";
 if(pilot)readiness=successful.length?"PILOT_EXECUTED_UNVERIFIED":"PILOT_READY_FOR_AUTHENTICATED_TEST";
 const last=jobs.filter(j=>j.agent_no===agent.agent_no).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
 return {agent_no:agent.agent_no,agent_name:agent.agent_name,department_no:agent.department_no,
  lifecycle_status:agent.status,supervisor_agent_no:agent.supervisor_agent_no,
  runtime_adapter:pilot?"analysis_only_v1":null,readiness,
  authorized_pilot_callable:pilot,verified_operational:false,
  agent_specification_validated:specComplete,granted_tool_keys:active.map(p=>p.tool_key),
  last_business_job_status:last?.status||null,
  successful_business_jobs:successful.length,
  reasons:reasons.filter(x=>x!=="NO_SUPERVISOR_REFERENCE"||agent.classification!=="CROSS_SYSTEM")};
}
export function summarizeFleet(entries){
 const byReadiness={},byLifecycle={},byDepartment={};
 for(const a of entries){
  byReadiness[a.readiness]=(byReadiness[a.readiness]||0)+1;
  byLifecycle[a.lifecycle_status]=(byLifecycle[a.lifecycle_status]||0)+1;
  const d=String(a.department_no??"UNASSIGNED");
  byDepartment[d]=(byDepartment[d]||0)+1;
 }
 const pilot=entries.filter(a=>a.authorized_pilot_callable).map(a=>a.agent_no);
 return {registered:entries.length,by_lifecycle:byLifecycle,by_readiness:byReadiness,
  pilot_callable_agent_numbers:pilot, pilot_callable_count:pilot.length,
  verified_operational_count:0,
  verified_operational_count_note:"No independent execution and monitoring receipt is established by this controller v1.",
  departments:byDepartment,execution_performed:false};
}
export function activationPlan(entries){
 const pilot=entries.filter(a=>a.authorized_pilot_callable).map(a=>({agent_no:a.agent_no,name:a.agent_name,
  next_step:a.successful_business_jobs>0?"VERIFY_OUTPUT_AND_MONITORING":"RUN_ISOLATED_AUTHENTICATED_ANALYSIS_TEST",
  last_business_job_status:a.last_business_job_status}));
 const development=entries.filter(a=>!a.authorized_pilot_callable).map(a=>({agent_no:a.agent_no,
  department_no:a.department_no,blocking_reasons:a.reasons.filter(r=>r!=="NO_SUCCESSFUL_BUSINESS_JOB_RECEIPT"&&r!=="NO_INDEPENDENT_VERIFICATION_RECEIPT")}));
 return {mode:"READ_ONLY_ACTIVATION_PLAN",pilot_candidates:pilot,requires_development:development,
  can_mass_activate_now:false,execution_performed:false,policy:"No agent lifecycle or tool grant may be changed on the basis of a plan. Require real verified readiness and separate approved job execution."};
}
