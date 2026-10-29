import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const respond=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clip=(v:unknown,n=4000)=>String(v??"").slice(0,n);
async function generate(key:string,name:string,responsibility:string,request:string,context:unknown){
 const model=Deno.env.get("OPENAI_TEXT_MODEL")||"gpt-5-mini";
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,max_output_tokens:750,instructions:"You are the CreateJourney specialist named "+name+". Responsibility: "+responsibility+". Produce a concise internal analysis only from supplied evidence. Never claim external access, tool calls, published content, verified actions, financial results, or completed business outcomes without evidence. Include sections Findings, Evidence and limitations, Recommended next actions. This is analysis-only; do not perform external actions.",input:JSON.stringify({request,context}).slice(0,12000)})});
 const data=await r.json();if(!r.ok)throw new Error(clip(data?.error?.message||"AI provider error",350));
 let answer=typeof data.output_text==="string"?data.output_text:"";
 for(const x of data.output||[])for(const c of x.content||[])if(c.type==="output_text")answer+=c.text||"";
 if(!answer.trim())throw new Error("AI provider returned no text");
 return {text:answer.trim().slice(0,18000),model,execution_type:"analysis_only",verification_status:"UNVERIFIED"};
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 try{
 const auth=req.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer "))return respond({error:"Authentication required"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),key=Deno.env.get("OPENAI_API_KEY");
 if(!url||!anon||!service)return respond({error:"Server configuration missing"},503);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:auth}}});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:u,error:ue}=await client.auth.getUser(auth.slice(7));
 if(ue||!u.user)return respond({error:"Invalid session"},401);
 const body=await req.json().catch(()=>({}));
 const action=clip(body.action,32);
 const agentNo=Number(body.agent_no);
 if(action==="capabilities"){
 const {data,error}=await db.from("cj_agent_registry").select("agent_no,agent_name,classification,status,department_no").in("status",["TESTING","VERIFIED","DEPLOYED","MONITORING"]).limit(100);
 if(error)throw error;
 return respond({phase:"runtime_v1",execution_mode:"analysis_only",agents:data||[]});
 }
 const business=clip(body.business_id,64);
 if(!/^[a-f0-9-]{36}$/i.test(business))return respond({error:"Valid business_id required"},400);
 const {data:member,error:me}=await db.from("business_members").select("role").eq("business_id",business).eq("user_id",u.user.id).eq("is_active",true).maybeSingle();
 if(me)throw me;
 if(!member||!["owner","manager"].includes(String(member.role).toLowerCase()))return respond({error:"Owner or manager authorization required"},403);
 if(action==="submit"){
 if(!Number.isInteger(agentNo)||agentNo<1)return respond({error:"Valid agent_no required"},400);
 const request=clip(body.request,4000).trim();if(!request)return respond({error:"Request required"},400);
 const {data:agent,error:ae}=await db.from("cj_agent_registry").select("agent_no,agent_name,responsibility,status").eq("agent_no",agentNo).single();if(ae)throw ae;
 if(!["TESTING","VERIFIED","DEPLOYED","MONITORING"].includes(agent.status))return respond({error:"Agent not enabled for runtime testing",agent_status:agent.status},409);
 const {data:permitted,error:pe}=await db.rpc("cj_agent_authorized",{p_agent_no:agentNo,p_tool_key:"ai.analysis",p_approved:false});if(pe)throw pe;if(permitted!==true)return respond({error:"Agent is not authorized for AI analysis"},403);
 const rawContext=body.context&&typeof body.context==="object"?body.context:{};
 const serializedContext=JSON.stringify(rawContext);
 const safeContext=serializedContext.length<=8000?JSON.parse(serializedContext):{truncated:true,excerpt:serializedContext.slice(0,7500)};
 const input={request,context:safeContext};
 const {data:job,error:je}=await db.from("cj_agent_jobs").insert({agent_no:agentNo,business_id:business,requested_by:u.user.id,input,status:"QUEUED",risk_level:"LOW",approval_required:false}).select("id,agent_no,status,created_at").single();if(je)throw je;
 await db.from("cj_agent_job_events").insert({job_id:job.id,event_type:"QUEUED",actor:"agent-runtime",evidence:{mode:"analysis_only"}});
 return respond({job},201);
 }
 if(action==="status"||action==="run"){
 const jobId=clip(body.job_id,64);
 if(!/^[a-f0-9-]{36}$/i.test(jobId))return respond({error:"Valid job_id required"},400);
 const {data:job,error:je}=await db.from("cj_agent_jobs").select("*").eq("id",jobId).eq("business_id",business).single();if(je||!job)return respond({error:"Job not found"},404);
 if(action==="status"){
 const {data:events}=await db.from("cj_agent_job_events").select("event_type,occurred_at,evidence").eq("job_id",jobId).order("occurred_at",{ascending:true});
 return respond({job,events:events||[]});
 }
 if(job.status!=="QUEUED")return respond({error:"Job not runnable",status:job.status},409);
 const {data:permitted,error:pe}=await db.rpc("cj_agent_authorized",{p_agent_no:job.agent_no,p_tool_key:"ai.analysis",p_approved:false});if(pe)throw pe;if(permitted!==true)return respond({error:"Agent execution permission denied"},403);
 if(!key)return respond({error:"AI provider not configured"},503);
 const {data:claimed,error:ce}=await db.rpc("cj_claim_agent_job",{p_job_id:jobId});if(ce)throw ce;
 if(!claimed||claimed.length!==1)return respond({error:"Job already claimed or agent not enabled"},409);
 await db.from("cj_agent_job_events").insert({job_id:jobId,event_type:"STARTED",actor:"agent-runtime",evidence:{mode:"analysis_only"}});
 try{
 const {data:agent,error:ae}=await db.from("cj_agent_registry").select("agent_name,responsibility").eq("agent_no",job.agent_no).single();if(ae)throw ae;
 const result=await generate(key,agent.agent_name,agent.responsibility,job.input.request,job.input.context);
 const {error:fe}=await db.from("cj_agent_jobs").update({status:"SUCCEEDED",output:result,finished_at:new Date().toISOString()}).eq("id",jobId).eq("status","RUNNING");if(fe)throw fe;
 await db.from("cj_agent_job_events").insert({job_id:jobId,event_type:"ANALYSIS_COMPLETED",actor:"agent-runtime",evidence:{model:result.model,verification_status:result.verification_status}});
 return respond({job_id:jobId,status:"SUCCEEDED",output:result});
 }catch(e){
 const message=clip(e instanceof Error?e.message:String(e),500);
 await db.from("cj_agent_jobs").update({status:"FAILED",error_detail:message,finished_at:new Date().toISOString()}).eq("id",jobId).eq("status","RUNNING");
 await db.from("cj_agent_job_events").insert({job_id:jobId,event_type:"FAILED",actor:"agent-runtime",evidence:{error:message}});
 return respond({job_id:jobId,status:"FAILED",error:message},500);
 }
 }
 return respond({error:"Unknown action"},400);
 }catch(e){console.error("cj-agent-runtime",e);return respond({error:"Runtime request failed"},500);}
});