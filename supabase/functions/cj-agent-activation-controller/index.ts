import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
import {inspectAgent,summarizeFleet,activationPlan,RUNTIME_ADAPTERS} from "./policy.mjs";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const response=(obj:any,status=200)=>new Response(JSON.stringify(obj),{status,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const safe=(s:unknown,n=300)=>String(s??"").slice(0,n);
async function allRows(db:any,table:string,columns:string){
 const result:any[]=[];
 for(let offset=0;offset<2000;offset+=500){
  const {data,error}=await db.from(table).select(columns).range(offset,offset+499);
  if(error)throw error;
  result.push(...(data||[]));if(!data||data.length<500)return result;
 }
 throw new Error("Workforce registry exceeds the approved scan limit");
}
async function postRuntime(url:string,anon:string,auth:string,body:any){
 const r=await fetch(url+"/functions/v1/"+RUNTIME_ADAPTERS.analysis_only_v1.function_slug,{
  method:"POST",headers:{"Content-Type":"application/json","apikey":anon,"Authorization":auth},
  body:JSON.stringify(body),signal:AbortSignal.timeout(85000)
 });
 const data=await r.json().catch(()=>({error:"Runtime did not return JSON"}));
 return {ok:r.ok,status:r.status,data};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return response({error:"Method not allowed"},405);
 const authorization=req.headers.get("Authorization")||"";
 if(!authorization.startsWith("Bearer "))return response({error:"Authentication required"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return response({error:"Server configuration unavailable"},503);
 const userClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
 const {data:user,error:userError}=await userClient.auth.getUser(authorization.slice(7));
 if(userError||!user?.user)return response({error:"Invalid session"},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const body=await req.json().catch(()=>({}));
 const action=safe(body.action||"overview",40);
 if(!["overview","activation_plan","agents","agent_detail","pilot_test"].includes(action))return response({error:"Unsupported action"},400);
 try{
  // Business selection is always authorization-derived; never expose another business's job receipts.
  const {data:members,error:memberError}=await db.from("business_members")
   .select("business_id,role").eq("user_id",user.user.id).eq("is_active",true).in("role",["owner","manager"]).limit(30);
  if(memberError)throw memberError;
  const eligible=(members||[]).filter((m:any)=>UUID.test(m.business_id));
  const explicit=typeof body.business_id==="string"?body.business_id:"";
  let businessId="";
  if(explicit){
   if(!UUID.test(explicit)||!eligible.some((m:any)=>m.business_id===explicit))return response({error:"Business owner/manager access denied"},403);
   businessId=explicit;
  }else if(eligible.length===1)businessId=eligible[0].business_id;
  else if(eligible.length>1)return response({error:"BUSINESS_SELECTION_REQUIRED",businesses_to_choose:eligible.length},409);
  else return response({error:"Business owner/manager membership required"},403);
  // Registry is global metadata. Execution receipts are tenant-scoped.
  const [agents,grants,tools,deps]=await Promise.all([
   allRows(db,"cj_agent_registry","agent_no,agent_name,department_no,supervisor_agent_no,classification,status,specification"),
   allRows(db,"cj_agent_tool_permissions","agent_no,tool_key,granted,permission_scope"),
   allRows(db,"cj_agent_tool_catalog","tool_key,enabled,description,risk_level"),
   allRows(db,"cj_agent_dependencies","agent_no,requires_agent_no,dependency_type")
  ]);
  if(agents.length===0)return response({error:"Agent registry unavailable"},503);
  // Limit historical receipts and never treat them as global proof.
  const {data:jobs,error:jobError}=await db.from("cj_agent_jobs")
   .select("agent_no,status,output,created_at").eq("business_id",businessId)
   .order("created_at",{ascending:false}).limit(1000);
  if(jobError)throw jobError;
  const jobsByAgent=new Map<number,any[]>(),grantsByAgent=new Map<number,any[]>(),depsByAgent=new Map<number,any[]>();
  for(const j of jobs||[])jobsByAgent.set(j.agent_no,[...(jobsByAgent.get(j.agent_no)||[]),j]);
  for(const g of grants)grantsByAgent.set(g.agent_no,[...(grantsByAgent.get(g.agent_no)||[]),g]);
  for(const d of deps)depsByAgent.set(d.agent_no,[...(depsByAgent.get(d.agent_no)||[]),d]);
  const entries=agents.sort((a:any,b:any)=>a.agent_no-b.agent_no)
   .map((a:any)=>inspectAgent(a,grantsByAgent.get(a.agent_no)||[],tools,depsByAgent.get(a.agent_no)||[],jobsByAgent.get(a.agent_no)||[]));
  const summary=summarizeFleet(entries);
  const provenance={source:"LIVE_AUTHENTICATED_REGISTRY_AND_BUSINESS_SCOPED_RECEIPTS",
   runtime_adapters:Object.keys(RUNTIME_ADAPTERS),runtime_implementation:"analysis_only_v1",
   scanned_agents:agents.length,scanned_grants:grants.length,scanned_tools:tools.length,
   scanned_dependency_edges:deps.length,business_job_receipts:(jobs||[]).length,
   receipts_limit:1000,independent_runtime_heartbeat_available:false,
   note:"Pilot callable is not equivalent to tested, operational, monitored, or externally acting."};
  if(action==="overview")return response({status:"READ_ONLY_LIVE",summary,provenance,execution_performed:false});
  if(action==="activation_plan"){
   const plan=activationPlan(entries);
   return response({status:"READ_ONLY_LIVE",summary,provenance,
    ...plan,unmet_requirements_count:plan.requires_development.length});
  }
  const agentNo=Number(body.agent_no);
  if(action==="agent_detail"||action==="pilot_test"){
   const e=entries.find((x:any)=>x.agent_no===agentNo);
   if(!e)return response({error:"Agent not registered"},404);
   if(action==="agent_detail")return response({status:"READ_ONLY_LIVE",agent:e,provenance,execution_performed:false});
   // Single bounded, intentional synthetic test only. Never auto-activate all roles or touch business state.
   if(body.confirm_analysis_only!==true||body.synthetic_only!==true)
    return response({error:"An explicit confirmed synthetic analysis-only pilot test is required; no agent run started"},409);
   if(!e.authorized_pilot_callable)return response({error:"Agent has no authorized callable runtime adapter",agent:e},409);
   const prompt=typeof body.test_prompt==="string"?body.test_prompt.trim():"";
   if(prompt.length<12||prompt.length>1000)return response({error:"Provide a 12–1000 character synthetic test_prompt"},400);
   const metadata={synthetic:true,purpose:"agent_workforce_activation_acceptance_v1",external_action_authorized:false};
   const submit=await postRuntime(url,anon,authorization,{action:"submit",agent_no:agentNo,business_id:businessId,request:prompt,context:metadata});
   if(!submit.ok||!UUID.test(String(submit.data?.job?.id||"")))
    return response({error:"PILOT_SUBMISSION_FAILED",upstream_status:submit.status,detail:safe(submit.data?.error,250),execution_performed:false},502);
   const jobId=submit.data.job.id;
   const run=await postRuntime(url,anon,authorization,{action:"run",job_id:jobId,business_id:businessId});
   const verifiedOutput=run.ok && run.data?.status==="SUCCEEDED" && run.data?.output?.execution_type==="analysis_only"
    && typeof run.data?.output?.text==="string" && run.data.output.text.trim().length>0;
   return response({status:verifiedOutput?"PILOT_ANALYSIS_COMPLETED_UNVERIFIED":"PILOT_FAILED_OR_INCOMPLETE",
    agent_no:agentNo,job_id:jobId,analysis_receipt:verifiedOutput,external_execution_verified:false,
    runtime_status:safe(run.data?.status,60),runtime_error:run.ok?null:safe(run.data?.error,250),
    execution_performed:true,
    note:"Successful synthetic analysis is not sufficient to classify agent as operational. No lifecycle status was changed."},verifiedOutput?200:502);
  }
  const page=Math.min(100000,Math.max(0,Math.trunc(Number(body.offset)||0)));
  const limit=Math.min(100,Math.max(1,Math.trunc(Number(body.limit)||50)));
  const stage=typeof body.readiness==="string"?body.readiness.toUpperCase():"";
  const rows=stage?entries.filter((e:any)=>e.readiness===stage):entries;
  return response({status:"READ_ONLY_LIVE",entries:rows.slice(page,page+limit),total:rows.length,
   offset:page,limit,has_more:page+limit<rows.length,summary,execution_performed:false});
 }catch(e){
  console.error("cj-agent-activation-controller",e instanceof Error?e.message:"Unknown error");
  return response({error:"Workforce activation controller unavailable"},500);
 }
});
