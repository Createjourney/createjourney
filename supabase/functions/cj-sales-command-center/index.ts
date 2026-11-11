import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const GATES=["approved_campaign","isolated_agent_e2e","platform_permissions_verified","shopify_order_webhook_verified","customer_checkout_verified","budget_enforcement_verified","consent_and_opt_out_verified"];
const groups=[
 {key:"strategy",agents:[519,520,521,523]},{key:"prospecting",agents:[520,509,511]},
 {key:"creative",agents:[521,524]},{key:"engagement",agents:[409,411,412]},
 {key:"follow_up",agents:[408,416,417]},{key:"ads",agents:[352,354,525]},
 {key:"commerce",agents:[345,337,353]},{key:"reporting",agents:[524,526]}
];
const allIds=[...new Set(groups.flatMap(g=>g.agents))];
const nullableText=(x:unknown,n:number)=>typeof x==="string"?x.trim().slice(0,n):"";
const int=(x:unknown,min:number,max:number):number|null=>typeof x==="number"&&Number.isInteger(x)&&x>=min&&x<=max?x:null;
const errMsg=(e:unknown)=>e instanceof Error?e.message:"Backend request failed";
function validate(raw:Record<string,unknown>,existing:Record<string,unknown>={}){
 const value=(k:string)=>raw[k]===undefined?existing[k]:raw[k];
 const name=nullableText(value("name"),120),product_name=nullableText(value("product_name"),160);
 const product_url=nullableText(value("product_url"),500);
 let parsed:URL;
 try {parsed=new URL(product_url)}catch {throw new Error("Valid product HTTPS URL required")}
 if(parsed.protocol!=="https:"||!parsed.hostname||parsed.username||parsed.password)throw new Error("Public HTTPS product URL required");
 const currency=nullableText(value("currency")??"USD",3).toUpperCase();
 const sale_price_cents=int(value("sale_price_cents"),1,100000000);
 const regular_price_cents=int(value("regular_price_cents"),1,100000000);
 const order_target=int(value("order_target"),1,100000);
 const daily_ad_cap_cents=int(value("daily_ad_cap_cents")??1000,0,100000000);
 const daily_research_target=int(value("daily_research_target")??120,0,100000);
 const shipping_policy=nullableText(value("shipping_policy")??"buyer_pays",24);
 const fulfillment_note=nullableText(value("fulfillment_note")??"Carefully assembled and packaged for you",300);
 if(name.length<3||product_name.length<2)throw new Error("Campaign and product names required");
 if(!/^[A-Z]{3}$/.test(currency)||sale_price_cents===null||regular_price_cents===null||regular_price_cents<sale_price_cents||
  order_target===null||daily_ad_cap_cents===null||daily_research_target===null)throw new Error("Campaign prices, targets or budget are invalid");
 if(!["buyer_pays","seller_pays","calculated"].includes(shipping_policy))throw new Error("Unsupported shipping policy");
 if(raw.delivery_guaranteed===true)throw new Error("Holiday delivery cannot be guaranteed without verified fulfillment evidence");
 return {name,product_name,product_url:parsed.toString(),currency,sale_price_cents,regular_price_cents,
  order_target,daily_ad_cap_cents,daily_research_target,shipping_policy,fulfillment_note,delivery_guaranteed:false};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 try {
  const token=(req.headers.get("Authorization")||"").match(/^Bearer (\S+)$/)?.[1];
  if(!token)return reply({error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!secret)return reply({error:"Service configuration unavailable"},503);
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authErr}=await auth.auth.getUser(token);
  if(authErr||!identity.user)return reply({error:"Invalid login"},401);
  const userId=identity.user.id;
  const raw=await req.text();if(raw.length>16000)return reply({error:"Request too large"},413);
  let body:Record<string,unknown>;
  try {body=JSON.parse(raw)}catch{return reply({error:"Invalid JSON"},400)}
  if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid body"},400);
  const businessId=String(body.business_id||"");
  if(!UUID.test(businessId))return reply({error:"business_id is required"},400);
  const {data:member,error:memberErr}=await admin.from("business_members").select("role,is_active").eq("business_id",businessId)
   .eq("user_id",userId).eq("is_active",true).maybeSingle();
  if(memberErr)return reply({error:"Membership unavailable"},503);
  const role=String(member?.role||"").toLowerCase();
  if(!["owner","manager"].includes(role))return reply({error:"Owner or manager access required"},403);
  const action=String(body.action||"overview");
  async function getCampaign(){
   if(!UUID.test(String(body.campaign_id||"")))return null;
   const {data,error}=await admin.from("cj_sales_campaigns").select("*").eq("business_id",businessId).eq("id",body.campaign_id).maybeSingle();
   if(error)throw error;return data;
  }
  async function event(campaignId:string,type:string,detail:Record<string,unknown>){
   const {error}=await admin.from("cj_sales_campaign_events").insert({business_id:businessId,campaign_id:campaignId,actor_user_id:userId,event_type:type,detail});
   if(error)throw error;
  }
  if(action==="create"){
   if(!body.campaign||typeof body.campaign!=="object"||Array.isArray(body.campaign))return reply({error:"Campaign details required"},400);
   const fields=validate(body.campaign as Record<string,unknown>);
   const {data,error}=await admin.from("cj_sales_campaigns").insert({...fields,business_id:businessId,created_by:userId,status:"draft"}).select().single();
   if(error)throw error;
   await event(data.id,"CREATED",{mode:"draft_only"});
   return reply({campaign:data,launch_authorized:false},201);
  }
  if(["update","pause","approve"].includes(action)){
   const existing=await getCampaign();if(!existing)return reply({error:"Campaign not found"},404);
   if(action==="update"){
    if(existing.status==="approved")return reply({error:"Pause before editing an approved campaign"},409);
    if(!body.campaign||typeof body.campaign!=="object"||Array.isArray(body.campaign))return reply({error:"Campaign details required"},400);
    const fields=validate(body.campaign as Record<string,unknown>,existing);
    const {data,error}=await admin.from("cj_sales_campaigns").update({...fields,updated_at:new Date().toISOString()})
      .eq("id",existing.id).eq("business_id",businessId).neq("status","approved").select().maybeSingle();
    if(error)throw error;if(!data)return reply({error:"Campaign changed concurrently"},409);
    await event(existing.id,"UPDATED",{mode:"configuration_only"});
    return reply({campaign:data,launch_authorized:false});
   }
   if(action==="approve"){
    if(role!=="owner")return reply({error:"Owner approval required"},403);
    if(existing.status!=="draft"&&existing.status!=="paused")return reply({error:"Campaign is already approved"},409);
    const {data,error}=await admin.from("cj_sales_campaigns").update({status:"approved",approved_by:userId,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()})
     .eq("business_id",businessId).eq("id",existing.id).eq("status",existing.status).select().maybeSingle();
    if(error)throw error;if(!data)return reply({error:"Campaign changed concurrently"},409);
    await event(existing.id,"APPROVED_FOR_PLANNING",{launch_authorized:false,no_external_actions:true});
    return reply({campaign:data,launch_authorized:false,note:"Approval authorizes planning only, not publishing, spend or outreach."});
   }
   const {data,error}=await admin.from("cj_sales_campaigns").update({status:"paused",updated_at:new Date().toISOString()})
    .eq("id",existing.id).eq("business_id",businessId).eq("status",existing.status).select().maybeSingle();
   if(error)throw error;if(!data)return reply({error:"Campaign changed concurrently"},409);
   await event(existing.id,"PAUSED",{external_actions_stopped:false,reason:"No external action runner configured"});
   return reply({campaign:data,launch_authorized:false});
  }
  if(action!=="overview")return reply({error:"Unsupported action"},400);
  const [campaignsQ,agentsQ,connectionsQ,jobsQ]=await Promise.all([
   admin.from("cj_sales_campaigns").select("id,name,product_name,product_url,currency,sale_price_cents,regular_price_cents,order_target,daily_ad_cap_cents,daily_research_target,shipping_policy,fulfillment_note,status,approved_at,created_at,updated_at").eq("business_id",businessId).order("created_at",{ascending:false}).limit(30),
   admin.from("cj_agent_registry").select("agent_no,agent_name,status").in("agent_no",allIds),
   admin.from("connected_accounts").select("provider,status,capabilities,token_expires_at,last_synced_at").eq("business_id",businessId),
   admin.from("cj_agent_jobs").select("id,agent_no,status,output,finished_at,created_at").eq("business_id",businessId).order("created_at",{ascending:false}).limit(25)
  ]);
  if(campaignsQ.error||agentsQ.error||connectionsQ.error||jobsQ.error)throw new Error("Readiness data query unavailable");
  const agents=agentsQ.data||[],mapped=new Map(agents.map(a=>[a.agent_no,a]));
  const agent_capabilities=groups.map(g=>({
   key:g.key,agents:g.agents.map(id=>({agent_no:id,name:mapped.get(id)?.agent_name||"Unknown",status:mapped.get(id)?.status||"NOT_REGISTERED"})),
   external_execution_verified:false
  }));
  const integrations=(connectionsQ.data||[]).map(c=>({
   provider:c.provider,connection_status:c.status,declared_capabilities:c.capabilities||{},
   token_expired:!!c.token_expires_at&&new Date(c.token_expires_at).getTime()<=Date.now(),
   last_synced_at:c.last_synced_at,operational_verified:false
  }));
  const execution_results=(jobsQ.data||[]).map(j=>({
   job_id:j.id,agent_no:j.agent_no,status:j.status,created_at:j.created_at,finished_at:j.finished_at,
   execution_type:j.output?.execution_type||"unknown",provider_action_verified:false
  }));
  const selectedId=UUID.test(String(body.campaign_id||""))?String(body.campaign_id):campaignsQ.data?.[0]?.id;
  const selected=campaignsQ.data?.find(c=>c.id===selectedId)||null;
  const blockers=[...GATES];
  if(!selected)blockers.push("campaign_not_configured");
  const agentCount=agents.filter(a=>["VERIFIED","DEPLOYED","MONITORING"].includes(a.status)).length;
  return reply({
   mode:"READ_ONLY",business_id:businessId,campaigns:campaignsQ.data||[],selected_campaign_id:selected?.id||null,
   agent_capabilities,integrations,execution_results,
   readiness:{status:"BLOCKED",launch_authorized:false,verified_gates:[],blockers,
    agent_registry_count:agents.length,agent_verified_registry_count:agentCount,
    provider_operations_verified:0,
    note:"No independent external-execution receipts or provider checks yet. Approved campaign means planning only."}
  });
 }catch(e){console.error("cj-sales-command-center",errMsg(e));return reply({error:"Sales Command Center request failed"},500)}
});
