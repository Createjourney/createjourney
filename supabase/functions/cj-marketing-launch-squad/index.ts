import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
import {MARKETING_SQUAD,MARKETING_SUPERVISORS,slugBrand,readinessReport,buildRoleInput,validRoleReceipts} from "./policy.mjs";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip=(x:unknown,n:number)=>String(x??"").slice(0,n);
function extractText(v:any){
 const top=typeof v?.output_text==="string"?v.output_text.trim():"";
 if(top)return top;
 const texts=[];
 for(const o of v?.output||[])for(const c of o?.content||[])
  if(c?.type==="output_text"&&typeof c?.text==="string")texts.push(c.text);
 return texts.join("\n").trim();
}
async function specialist(key:string,model:string,role:any,input:{brand:any,brief:any,prompt:string},prior:any[]){
 const instructions=`You are internal CreateJourney marketing specialist #${role.agent_no}, ${role.role}.
Assigned task: ${role.goal}
This is a draft-only, analysis-only function. Do not claim to have browsed the internet, accessed Shopify, obtained live inventory, seen social analytics, sent messages, posted content, or performed any external action. The owner-provided brief may be incomplete or unverified. Avoid invented testimonials, published-review claims, urgency not supported by inventory, and guaranteed shipping claims unless verified. All outputs are DRAFT FOR OWNER APPROVAL. Be practical, evidence-aware, and concise. Include assumptions and blockers.`;
 const contents=buildRoleInput(input.brand,input.brief,input.prompt,prior);
 for(let tries=0;tries<2;tries++){
  const resp=await fetch("https://api.openai.com/v1/responses",{method:"POST",
   headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({model,instructions,input:contents,max_output_tokens:tries?3200:1800}),
   signal:AbortSignal.timeout(55000)});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw Error("AI provider request failed for agent "+role.agent_no);
  const text=extractText(data);
  if(data.status!=="incomplete"&&text.length>=50)return {agent_no:role.agent_no,role:role.role,status:"ANALYSIS_COMPLETED",execution_type:"analysis_only",text:text.slice(0,16000),
   model,verified_external_execution:false};
 }
 throw Error("AI provider produced no complete specialist analysis for agent "+role.agent_no);
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const authorization=req.headers.get("Authorization")||"";
 if(!authorization.startsWith("Bearer "))return json({error:"Authentication required"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return json({error:"Server configuration unavailable"},503);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
 const {data:user,error:userError}=await client.auth.getUser(authorization.slice(7));
 if(userError||!user?.user)return json({error:"Invalid session"},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const ownerId=user.user.id;
 const {data:membership,error:membershipError}=await db.from("business_members").select("business_id").eq("user_id",ownerId).eq("is_active",true).eq("role","owner").limit(1);
 if(membershipError||!membership?.length)return json({error:"An authorized CreateJourney owner account is required"},403);
 const body=await req.json().catch(()=>({}));
 const action=clip(body.action||"readiness",40);
 if(!["readiness","setup_brand","draft_campaign","run_status"].includes(action))return json({error:"Unknown marketing squad action"},400);
 try{
  const registryIds=[...MARKETING_SQUAD.map(x=>x.agent_no),...MARKETING_SUPERVISORS];
  const {data:registry,error:registryError}=await db.from("cj_agent_registry").select("agent_no,agent_name,status,classification").in("agent_no",registryIds);
  if(registryError||!registry||registry.length!==registryIds.length)return json({error:"Marketing agent registry incomplete"},503);
  const requestedBrand=clip(body.brand_name||"Flourished Images",100).trim();
  const brandKey=slugBrand(requestedBrand);
  if(!brandKey||brandKey.length<2)return json({error:"Valid brand name required"},400);
  const {data:existing,error:brandError}=await db.from("cj_marketing_brand_workspaces").select("*")
    .eq("owner_user_id",ownerId).eq("brand_key",brandKey).maybeSingle();
  if(brandError)throw brandError;
  if(action==="setup_brand"){
   if(body.confirm_brand_control!==true)return json({error:"Explicit brand-control confirmation required"},409);
   if(existing)return json({workspace_id:existing.id,brand_name:existing.brand_name,status:"ALREADY_CONFIGURED",execution_performed:false});
   const brief=body.product_brief&&typeof body.product_brief==="object"&&!Array.isArray(body.product_brief)?body.product_brief:{};
   if(JSON.stringify(brief).length>6000)return json({error:"Brand brief too long"},400);
   const website=typeof body.website_url==="string"&&/^https:\/\//.test(body.website_url)?clip(body.website_url,250):null;
   const {data:workspace,error:insertError}=await db.from("cj_marketing_brand_workspaces")
    .insert({owner_user_id:ownerId,brand_name:requestedBrand,brand_key:brandKey,website_url:website,
     product_brief:brief}).select("id,brand_name,status").single();
   if(insertError)throw insertError;
   return json({workspace_id:workspace.id,brand_name:workspace.brand_name,status:"DRAFT_WORKSPACE_CREATED",
    note:"This is an external brand workspace, not a CreateJourney business or a Shopify connection.",execution_performed:false},201);
  }
  if(action==="readiness"){
   let successful=0;
   if(existing){
    const {count,error}=await db.from("cj_marketing_squad_runs").select("id",{head:true,count:"exact"})
     .eq("owner_user_id",ownerId).eq("workspace_id",existing.id).eq("status","SUCCEEDED");
    if(error)throw error;successful=count||0;
   }
   const report=readinessReport(registry,existing,successful);
   return json({status:"LIVE_MARKETING_SQUAD_READINESS",workspace_id:existing?.id||null,
    ...report,auth_scope:"OWNER_USER_BRAND",external_connections_verified:false});
  }
  if(!existing)return json({error:"BRAND_WORKSPACE_NOT_CONFIGURED",required_action:"setup_brand"},409);
  if(action==="run_status"){
   const runId=clip(body.run_id,64);
   if(!UUID.test(runId))return json({error:"Valid run_id required"},400);
   const {data:run,error}=await db.from("cj_marketing_squad_runs").select("id,status,role_receipts,output,error_detail,model,created_at,finished_at")
    .eq("id",runId).eq("owner_user_id",ownerId).eq("workspace_id",existing.id).maybeSingle();
   if(error)throw error;if(!run)return json({error:"Run not found"},404);
   return json({run,execution_performed:false});
  }
  // Intentional human-initiated planning only. No autonomous background jobs or publishing.
  if(body.confirm_draft_only!==true||body.confirm_analysis_cost!==true)
   return json({error:"Explicit owner approval for a paid draft-only AI analysis is required"},409);
  const prompt=clip(body.request,2000).trim();
  if(prompt.length<12)return json({error:"At least 12 characters of campaign instructions required"},400);
  const key=Deno.env.get("OPENAI_API_KEY");
  if(!key)return json({error:"AI provider is not configured"},503);
  const {data:recent,error:recentError}=await db.from("cj_marketing_squad_runs").select("id,created_at")
   .eq("owner_user_id",ownerId).eq("workspace_id",existing.id)
   .gte("created_at",new Date(Date.now()-10*60*1000).toISOString())
   .order("created_at",{ascending:false}).limit(1);
  if(recentError)throw recentError;
  if(recent?.length)return json({error:"A marketing draft was started recently; wait before initiating another to limit cost",recent_run_id:recent[0].id},429);
  const {data:run,error:insertError}=await db.from("cj_marketing_squad_runs")
   .insert({owner_user_id:ownerId,workspace_id:existing.id,request:prompt,status:"RUNNING",started_at:new Date().toISOString()})
   .select("id").single();
  if(insertError)return json({error:"A campaign draft could not be started; a run may already be active"},409);
  const receipts:any[]=[];const model=Deno.env.get("OPENAI_TEXT_MODEL")||"gpt-5-mini";
  try{
   const input={brand:existing,brief:existing.product_brief,prompt};
   // Parallel initial research/strategy, followed by execution and independent QA.
   const initial=await Promise.all(MARKETING_SQUAD.slice(0,2).map(role=>specialist(key,model,role,input,[])));
   receipts.push(...initial);
   const execution=await specialist(key,model,MARKETING_SQUAD[2],input,receipts);
   receipts.push(execution);
   const qa=await specialist(key,model,MARKETING_SQUAD[3],input,receipts);
   receipts.push(qa);
   if(!validRoleReceipts(receipts))throw Error("Marketing specialists returned incomplete receipts");
   const output={brand_name:existing.brand_name,kind:"OWNER_REVIEW_DRAFT",
    audience:receipts[0].text,strategy_and_copy:receipts[1].text,
    execution_plan:receipts[2].text,independent_qa:receipts[3].text,
    verified_live_integrations:false,published:false,ad_spend_usd:0,order_results_verified:false};
   const {error:finishError}=await db.from("cj_marketing_squad_runs")
    .update({status:"SUCCEEDED",role_receipts:receipts,output,model,finished_at:new Date().toISOString()})
    .eq("id",run.id).eq("owner_user_id",ownerId).eq("status","RUNNING");
   if(finishError)throw finishError;
   return json({status:"DRAFT_SUCCEEDED",run_id:run.id,agent_receipts:receipts.map(({agent_no,role,status,execution_type,verified_external_execution})=>({agent_no,role,status,execution_type,verified_external_execution})),
    campaign_draft:output,external_actions_performed:false,registry_statuses_changed:false,
    note:"Draft analysis only. No platform content, advertisements, messages, customer orders or external integrations were changed."});
  }catch(e){
   const err=clip(e instanceof Error?e.message:"Unknown marketing run error",350);
   await db.from("cj_marketing_squad_runs").update({status:"FAILED",role_receipts:receipts,error_detail:err,finished_at:new Date().toISOString()})
     .eq("id",run.id).eq("owner_user_id",ownerId);
   return json({error:"MARKETING_DRAFT_FAILED",run_id:run.id,completed_roles:receipts.length,execution_performed:receipts.length>0,
    external_actions_performed:false},502);
  }
 }catch(e){
  console.error("cj-marketing-launch-squad",e instanceof Error?e.message:"unknown error");
  return json({error:"Marketing squad is temporarily unavailable"},500);
 }
});
