import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
import {classifyAgent,integerInRange,parseBusinessId,publicAgent,ROSTER_LIMIT,safeSearch,rosterStatusFilter,summarize,PRIVILEGED_ROLES} from "./logic.mjs";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
 "Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const fail=(error:string,status=503)=>respond({error,execution_performed:false},status);
const AGENT_FIELDS="agent_no,permanent_id,agent_name,department_no,classification,responsibility,supervisor_agent_no,status,version";
const JOB_FIELDS="id,agent_no,status,created_at,started_at,finished_at,risk_level,approval_required";
const edgeFields="agent_no,requires_agent_no,dependency_type";
const forbiddenKeys=new Set(["input","output","error_detail","approved_by","permission_scope"]);
function noSecretRows(rows:unknown[]){return rows.map(r=>Object.fromEntries(Object.entries(r||{}).filter(([k])=>!forbiddenKeys.has(k))))}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return fail("method_not_allowed",405);
 const authz=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(authz))return fail("authentication_required",401);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"";
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!publicKey||!serviceKey)return fail("service_configuration_missing");
  const userClient=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=authz.replace(/^Bearer\s+/i,"");
  const auth=await userClient.auth.getUser(token);
  if(auth.error||!auth.data?.user?.id)return fail("unauthorized",401);
  const input=await req.json().catch(()=>null);
  if(!input||typeof input!=="object"||Array.isArray(input))return fail("invalid_request",400);
  let businessId:string;
  try{businessId=parseBusinessId(input.business_id)}catch{return fail("valid_business_id_required",400)}
  const action=typeof input.action==="string"?input.action:"overview";
  if(!["overview","roster","agent_detail","departments","tool_capabilities","business_evidence"].includes(action))
   return fail("unsupported_action",400);
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const member=await db.from("business_members").select("role").eq("business_id",businessId)
   .eq("user_id",auth.data.user.id).eq("is_active",true).maybeSingle();
  if(member.error)return fail("membership_lookup_failed");
  if(!member.data||!PRIVILEGED_ROLES.has(String(member.data.role||"").toLowerCase()))return fail("forbidden",403);
  const base={business_id:businessId,execution_performed:false,external_operations_verified:false,
   registry_evidence_type:"LIVE_DATABASE_READ",status_semantics:"Registry lifecycle is not runtime execution."};

  if(action==="overview"||action==="departments"||action==="tool_capabilities"){
   const reads=await Promise.all([
    db.from("cj_agent_registry").select(AGENT_FIELDS,{count:"exact"}).order("agent_no",{ascending:true}).limit(1000),
    db.from("cj_agent_departments").select("department_no,department_name,phase").order("department_no").limit(150),
    db.from("cj_agent_jobs").select("id",{count:"exact",head:true}).eq("business_id",businessId),
    db.from("cj_agent_dependencies").select("agent_no",{count:"exact",head:true})
   ]);
   if(reads.some(r=>r.error))return fail("workforce_inventory_unavailable");
   const agents=reads[0].data||[],departments=reads[1].data||[];
   if(reads[0].count!==agents.length)return fail("registry_exceeds_supported_limit");
   const stats=summarize(agents,reads[2].count||0);
   const shared={...base,summary:stats,departments_registered:departments.length,
    dependencies_recorded:reads[3].count||0,dependencies_status:(reads[3].count||0)>0?"RECORDED":"MISSING",
    fleet_execution_verification:"UNVERIFIED"};
   if(action==="overview")return respond(shared);
   if(action==="departments"){
    const counts=new Map<number,{total:number,by_status:Record<string,number>}>();
    for(const a of agents){
     if(a.department_no===null)continue;
     const n=Number(a.department_no),v=counts.get(n)||{total:0,by_status:{}};
     v.total++;const status=String(a.status||"UNKNOWN").toUpperCase();
     v.by_status[status]=(v.by_status[status]||0)+1;counts.set(n,v);
    }
    return respond({...shared,entries:departments.map(d=>({...d,...(counts.get(Number(d.department_no))||{total:0,by_status:{}})}))});
   }
   const grants=await db.from("cj_agent_tool_permissions").select("agent_no,tool_key,granted,approval_required")
    .eq("granted",true).order("agent_no").limit(1000);
   const toolCatalog=await db.from("cj_agent_tool_catalog").select("tool_key,enabled,risk_level,default_approval_required").limit(300);
   if(grants.error||toolCatalog.error)return fail("tool_catalog_unavailable");
   const tools=(grants.data||[]).map(g=>({agent_no:g.agent_no,tool_key:g.tool_key,granted:g.granted,
    approval_required:g.approval_required,operational_verification:"NOT_VERIFIED",
    execution_mode:g.tool_key==="ai.analysis"?"ANALYSIS_ONLY":"UNVERIFIED"}));
   return respond({...shared,tool_catalog_status:toolCatalog.data?.length?"PRESENT_UNVERIFIED":"MISSING",
    tool_definitions:(toolCatalog.data||[]),granted_permissions:tools,
    warning:"Permission grants do not prove a callable or successful specialist."});
  }
  if(action==="roster"){
   let offset:number,limit:number,search:string,statusFilter:string,department:number|null=null;
   try{offset=integerInRange(input.offset,0,5000,0);limit=integerInRange(input.limit,1,ROSTER_LIMIT,ROSTER_LIMIT);
    search=safeSearch(input.search);statusFilter=rosterStatusFilter(input.status);
    if(input.department_no!==undefined&&input.department_no!==null)
     department=integerInRange(input.department_no,1,500,1);
   }catch{return fail("invalid_pagination_or_search",400)}
   let q=db.from("cj_agent_registry").select(AGENT_FIELDS,{count:"exact"})
    .order("agent_no",{ascending:true}).range(offset,offset+limit-1);
   if(search)q=q.ilike("agent_name","%"+search+"%");
   if(statusFilter)q=q.eq("status",statusFilter);
   if(department!==null)q=q.eq("department_no",department);
   const {data,error,count}=await q;
   if(error)return fail("roster_unavailable");
   return respond({...base,entries:(data||[]).map(publicAgent),total:count??null,limit,offset,
    next_offset:offset+(data||[]).length<(count??0)?offset+(data||[]).length:null,
    applied_filters:{search,status:statusFilter,department_no:department}});
  }
  if(action==="agent_detail"){
   if(input.agent_no===undefined||input.agent_no===null)return fail("agent_number_required",400);
   let agentNo:number;
   try{agentNo=integerInRange(input.agent_no,1,100000,-1)}catch{return fail("invalid_agent_number",400)}
   const agent=await db.from("cj_agent_registry").select(AGENT_FIELDS).eq("agent_no",agentNo).maybeSingle();
   if(agent.error)return fail("agent_lookup_failed");
   if(!agent.data)return fail("agent_not_found",404);
   const reads=await Promise.all([
    db.from("cj_agent_dependencies").select(edgeFields).eq("agent_no",agentNo).limit(250),
    db.from("cj_agent_dependencies").select(edgeFields).eq("requires_agent_no",agentNo).limit(250),
    db.from("cj_agent_tool_permissions").select("agent_no,tool_key,granted,approval_required,permission_scope")
     .eq("agent_no",agentNo).limit(50),
    db.from("cj_agent_jobs").select(JOB_FIELDS).eq("business_id",businessId).eq("agent_no",agentNo)
     .order("created_at",{ascending:false}).limit(20),
    db.from("cj_agent_status_history").select("prior_status,new_status,changed_at")
     .eq("agent_no",agentNo).order("changed_at",{ascending:false}).limit(15)
   ]);
   if(reads.some(x=>x.error))return fail("agent_evidence_unavailable");
   const dependencies=reads[0].data||[],dependents=reads[1].data||[];
   const perms=reads[2].data||[],jobs=reads[3].data||[];
   let events:any[]=[];
   if(jobs.length){
    const results=await db.from("cj_agent_job_events").select("job_id,event_type,occurred_at")
     .in("job_id",jobs.map(j=>j.id)).order("occurred_at",{ascending:false}).limit(120);
    if(results.error)return fail("agent_events_unavailable");
    events=results.data||[];
   }
   const uniqueDep=[...new Set(dependencies.map(d=>d.requires_agent_no))];
   let requiredStatuses:any[]=[];
   if(uniqueDep.length){
    const res=await db.from("cj_agent_registry").select("agent_no,agent_name,status").in("agent_no",uniqueDep).limit(250);
    if(res.error)return fail("dependency_lookup_failed");
    requiredStatuses=res.data||[];
   }
   let supervisor=null;
   if(agent.data.supervisor_agent_no!==null){
    const res=await db.from("cj_agent_registry").select("agent_no,agent_name,status").eq("agent_no",agent.data.supervisor_agent_no).maybeSingle();
    if(res.error)return fail("supervisor_lookup_failed");
    supervisor=res.data||null;
   }
   const evald=classifyAgent(agent.data,perms,jobs,events);
   return respond({...base,agent:{...evald,responsibility:agent.data.responsibility,version:agent.data.version},
    dependency_status:dependencies.length?"RECORDED":"NOT_RECORDED",
    prerequisites:dependencies.map(d=>({...d,required_agent:requiredStatuses.find(a=>a.agent_no===d.requires_agent_no)||null})),
    dependents,supervisor_agent_no:agent.data.supervisor_agent_no,supervisor,
    tool_permissions:perms.map(p=>({agent_no:p.agent_no,tool_key:p.tool_key,granted:p.granted,
     approval_required:p.approval_required,execution_mode:p.permission_scope?.execution_mode||"UNKNOWN",
     invocation_verified:false})),
    recent_jobs:noSecretRows(jobs),recent_job_events:events,
    status_transitions:reads[4].data||[],
    warning:"Analysis-only job success does not verify external provider actions or finished customer outcomes."});
  }
  // Owner-scoped business execution evidence. Read-only; do not return prompts or model outputs.
  let limit:number;
  try{limit=integerInRange(input.limit,1,100,30)}catch{return fail("invalid_limit",400)}
  const result=await db.from("cj_agent_jobs").select(JOB_FIELDS).eq("business_id",businessId)
    .order("created_at",{ascending:false}).limit(limit);
  if(result.error)return fail("execution_evidence_unavailable");
  return respond({...base,recent_jobs:noSecretRows(result.data||[]),
   evidence_status:"JOBS_ONLY_UNLESS_PROVIDER_RECEIPTS_ARE_VERIFIED",
   warning:"A SUCCEEDED job is not proof that a third-party business operation completed."});
 }catch(_){return fail("request_failed",500)}
});
