/** Pure, side-effect-free workforce status evaluation. No model calls. */
export const ROSTER_LIMIT=60;
export const MAX_PAGE=100;
export const PRIVILEGED_ROLES=new Set(["owner","manager"]);

export function integerInRange(value,min,max,fallback){
 if(value===undefined||value===null||value==="")return fallback;
 if(typeof value!=="number"&&typeof value!=="string")throw new Error("invalid_number");
 const s=String(value);
 if(!/^\d+$/.test(s))throw new Error("invalid_number");
 const n=Number(s);
 if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error("invalid_number");
 return n;
}
export function parseBusinessId(value){
 const s=typeof value==="string"?value:"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))throw new Error("invalid_business_id");
 return s.toLowerCase();
}
export function safeSearch(value){
 if(value===undefined||value===null)return "";
 if(typeof value!=="string"||value.length>70||!/^[\p{L}\p{N} .&/'-]*$/u.test(value))throw new Error("invalid_search");
 return value.trim();
}
export function rosterStatusFilter(value){
 if(value===undefined||value===null||value==="")return "";
 if(typeof value!=="string")throw Error("invalid_status_filter");
 const status=value.trim().toUpperCase();
 if(!["PLANNED","TESTING","VERIFIED","DEPLOYED","MONITORING","DISABLED","SUSPENDED","FAILED","RETIRED"].includes(status))
  throw Error("invalid_status_filter");
 return status;
}
export function normalizeStatus(status){
 const s=typeof status==="string"?status.trim().toUpperCase():"UNKNOWN";
 return ["PLANNED","TESTING","VERIFIED","DEPLOYED","MONITORING","DISABLED","SUSPENDED","FAILED","RETIRED"].includes(s)?s:"UNKNOWN";
}
export function classifyAgent(agent,perms=[],jobs=[],events=[]){
 const status=normalizeStatus(agent?.status);
 const analysisPermission=perms.some(p=>p.agent_no===agent.agent_no&&p.granted===true&&
   p.tool_key==="ai.analysis"&&p.permission_scope?.execution_mode==="analysis_only");
 const successfulAnalysisJobs=jobs.filter(j=>j.agent_no===agent.agent_no&&j.status==="SUCCEEDED"&&
   events.some(e=>e.job_id===j.id&&e.event_type==="ANALYSIS_COMPLETED"));
 const latest=jobs.filter(j=>j.agent_no===agent.agent_no).sort((a,b)=>
  String(b.created_at||"").localeCompare(String(a.created_at||"")))[0]||null;
 const runtimeEvidence=successfulAnalysisJobs.length>0;
 const readiness=status==="PLANNED"?"PLANNED_UNVERIFIED":
  ["DISABLED","SUSPENDED","FAILED","RETIRED"].includes(status)?"NOT_AVAILABLE":
  runtimeEvidence?"ANALYSIS_RUNTIME_OBSERVED":
  status==="TESTING"?"TESTING_UNVERIFIED":"IMPLEMENTED_UNVERIFIED";
 return {
  agent_no:agent.agent_no,permanent_id:agent.permanent_id,agent_name:agent.agent_name,
  department_no:agent.department_no??null,classification:agent.classification,
  supervisor_agent_no:agent.supervisor_agent_no??null,lifecycle_status:status,
  readiness,analysis_permission_granted:analysisPermission,
  analysis_only:analysisPermission,verified_analysis_jobs:successfulAnalysisJobs.length,
  last_business_job_status:latest?.status||null,last_business_job_at:latest?.created_at||null,
  business_execution_evidence:runtimeEvidence?"ANALYSIS_ONLY":"NONE",
  independently_verified_external_operation:false,
  externally_executable:false
 };
}
export function summarize(agents,jobCount=0){
 const by_status={};let supervisors=0,missingDepartment=0;
 for(const a of agents){
  const s=normalizeStatus(a.status);by_status[s]=(by_status[s]||0)+1;
  if(a.supervisor_agent_no!==null&&a.supervisor_agent_no!==undefined)supervisors++;
  if(a.department_no===null||a.department_no===undefined)missingDepartment++;
 }
 return {registered_agents:agents.length,by_lifecycle_status:by_status,
  with_supervisor_link:supervisors,unassigned_department:missingDepartment,
  business_job_count:jobCount,
  interpretation:"Agent registry entries are plans/configuration, not proof of running agents.",
  execution_proof:"External actions require independently verified provider receipts."};
}
export function publicAgent(a){
 return {agent_no:a.agent_no,permanent_id:a.permanent_id,agent_name:a.agent_name,
  department_no:a.department_no,classification:a.classification,
  lifecycle_status:normalizeStatus(a.status),
  readiness:normalizeStatus(a.status)==="PLANNED"?"PLANNED_UNVERIFIED":normalizeStatus(a.status)==="TESTING"?"TESTING_UNVERIFIED":"IMPLEMENTED_UNVERIFIED",
  verified_external_execution:false};
}
