import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const GATES=["approved_campaign","isolated_agent_e2e","platform_permissions_verified","shopify_order_webhook_verified","customer_checkout_verified","budget_enforcement_verified","consent_and_opt_out_verified"];
const groups=[
 {key:"strategy",agents:[519,520,521,523]},{key:"prospecting",agents:[520,509,511]},
 {key:"creative",agents:[184,185,186]},{key:"engagement",agents:[409,411,412]},
 {key:"follow_up",agents:[408,416,417]},{key:"ads",agents:[352,354,525]},
 {key:"commerce",agents:[345,337,353]},{key:"reporting",agents:[524,526]}
];
const allIds=[...new Set(groups.flatMap(g=>g.agents))];
async function verifiedReceipt(e:Record<string,unknown>,businessId:string,campaignId:string,secret:string,now:number):Promise<boolean>{
 if(!secret||!GATES.includes(String(e.gate_key))||e.outcome!=="PASS"||e.source!=="server_verified")return false;
 const verifiedAt=typeof e.verified_at==="string"?Date.parse(e.verified_at):NaN;
 const expiresAt=typeof e.expires_at==="string"?Date.parse(e.expires_at):NaN;
 if(!Number.isSafeInteger(verifiedAt)||!Number.isSafeInteger(expiresAt)||
   verifiedAt>now||expiresAt<=now||expiresAt<=verifiedAt||expiresAt-verifiedAt>86400000)return false;
 if(typeof e.provider_reference!=="string"||!e.provider_reference||typeof e.signature!=="string"||
   !/^[0-9a-f]{64}$/.test(e.signature))return false;
 const message=JSON.stringify(["cj-sales-v1",e.gate_key,businessId,campaignId,verifiedAt,expiresAt,"PASS"]);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 const sig=new Uint8Array((e.signature.match(/../g)||[]).map(v=>parseInt(v,16)));
 return crypto.subtle.verify("HMAC",key,sig,new TextEncoder().encode(message));
}

const nullableText=(x:unknown,n:number)=>typeof x==="string"?x.trim().slice(0,n):"";
const int=(x:unknown,min:number,max:number):number|null=>typeof x==="number"&&Number.isInteger(x)&&x>=min&&x<=max?x:null;
const errMsg=(e:unknown)=>e instanceof Error?e.message:"Backend request failed";
class InputError extends Error {}
function validate(raw:Record<string,unknown>,existing:Record<string,unknown>={}){
 const value=(k:string)=>raw[k]===undefined?existing[k]:raw[k];
 const name=nullableText(value("name"),120),product_name=nullableText(value("product_name"),160);
 const product_url=nullableText(value("product_url"),500);
 let parsed:URL;
 try {parsed=new URL(product_url)}catch {throw new InputError("Valid product HTTPS URL required")}
 if(parsed.protocol!=="https:"||!parsed.hostname||parsed.username||parsed.password)throw new InputError("Public HTTPS product URL required");
 const currency=nullableText(value("currency")??"USD",3).toUpperCase();
 const sale_price_cents=int(value("sale_price_cents"),1,100000000);
 const regular_price_cents=int(value("regular_price_cents"),1,100000000);
 const order_target=int(value("order_target"),1,100000);
 const daily_ad_cap_cents=int(value("daily_ad_cap_cents")??1000,0,100000000);
 const daily_research_target=int(value("daily_research_target")??120,0,100000);
 const shipping_policy=nullableText(value("shipping_policy")??"buyer_pays",24);
 const fulfillment_note=nullableText(value("fulfillment_note")??"Carefully assembled and packaged for you",300);
 if(name.length<3||product_name.length<2)throw new InputError("Campaign and product names required");
 if(!/^[A-Z]{3}$/.test(currency)||sale_price_cents===null||regular_price_cents===null||regular_price_cents<sale_price_cents||
  order_target===null||daily_ad_cap_cents===null||daily_research_target===null)throw new InputError("Campaign prices, targets or budget are invalid");
 if(!["buyer_pays","seller_pays","calculated"].includes(shipping_policy))throw new InputError("Unsupported shipping policy");
 if(raw.delivery_guaranteed===true)throw new InputError("Holiday delivery cannot be guaranteed without verified fulfillment evidence");
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
  const action=String(body.action||"overview");
  if(action==="list_businesses"){
   const {data:memberships,error:membershipsError}=await admin.from("business_members")
    .select("business_id,role,is_active").eq("user_id",userId).eq("is_active",true);
   if(membershipsError)return reply({error:"Membership unavailable"},503);
   const eligible=(memberships||[]).filter(m=>["owner","manager"].includes(String(m.role).toLowerCase()));
   const roles=new Map(eligible.map(m=>[String(m.business_id),String(m.role)]));
   const ids=[...roles.keys()];
   if(!ids.length)return reply({businesses:[]});
   const {data:businesses,error:businessesError}=await admin.from("businesses").select("id,name")
    .in("id",ids).order("name");
   if(businessesError)return reply({error:"Business choices unavailable"},503);
   return reply({businesses:(businesses||[]).filter(b=>roles.has(b.id))
    .map(b=>({id:b.id,name:b.name,role:roles.get(b.id)}))});
  }
  let businessId=String(body.business_id||"");
  // Resolve only when the authorized caller has exactly one manageable business.
  // Never silently select among multiple organizations.
  if(!businessId){
   const {data:memberships,error:membershipsError}=await admin.from("business_members")
    .select("business_id,role,is_active").eq("user_id",userId).eq("is_active",true);
   if(membershipsError)return reply({error:"Membership unavailable"},503);
   const eligible=(memberships||[]).filter(m=>["owner","manager"].includes(String(m.role).toLowerCase()));
   const ids=[...new Set(eligible.map(m=>String(m.business_id)))];
   if(ids.length!==1)return reply({error:ids.length?"Select an authorized business":"No authorized business"},ids.length?409:403);
   businessId=ids[0];
  }
  if(!UUID.test(businessId))return reply({error:"Valid business_id is required"},400);
  const {data:member,error:memberErr}=await admin.from("business_members").select("role,is_active").eq("business_id",businessId)
   .eq("user_id",userId).eq("is_active",true).maybeSingle();
  if(memberErr)return reply({error:"Membership unavailable"},503);
  const role=String(member?.role||"").toLowerCase();
  if(!["owner","manager"].includes(role))return reply({error:"Owner or manager access required"},403);
  async function getCampaign(){
   if(!UUID.test(String(body.campaign_id||"")))return null;
   const {data,error}=await admin.from("cj_sales_campaigns").select("*").eq("business_id",businessId).eq("id",body.campaign_id).maybeSingle();
   if(error)throw error;return data;
  }
  async function event(campaignId:string,type:string,detail:Record<string,unknown>){
   const {error}=await admin.from("cj_sales_campaign_events").insert({business_id:businessId,campaign_id:campaignId,actor_user_id:userId,event_type:type,detail});
   if(error)throw error;
  }
  if(action==="pause_all"){
   if(role!=="owner")return reply({error:"Owner permission required"},403);
   const {data:changed,error:changeError}=await admin.from("cj_sales_campaigns")
    .update({status:"paused",updated_at:new Date().toISOString()})
    .eq("business_id",businessId).neq("status","paused").select("id");
   if(changeError)throw changeError;
   for(const campaign of changed||[])
    await event(campaign.id,"PAUSED_BY_OWNER_GLOBAL_CONTROL",{
     scope:"createjourney_campaigns_only",external_provider_actions_stopped:false
    });
   return reply({paused_campaigns:(changed||[]).length,
    external_provider_actions_stopped:false,
    note:"CreateJourney planning campaigns paused. External provider-side ads/messages must be stopped separately."});
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
  // Evidence table is service-role write only. Client-supplied claims are ignored.
  // An evidence issuer has NOT been implemented yet; no gate is inferred from labels or AI output.
  let evidenceRows:Record<string,unknown>[]=[];
  if(selected){
   const {data,error}=await admin.from("cj_sales_verification_evidence")
    .select("gate_key,outcome,source,verified_at,expires_at,provider_reference,signature")
    .eq("business_id",businessId).eq("campaign_id",selected.id).order("verified_at",{ascending:false}).limit(100);
   if(error)throw error;evidenceRows=data||[];
  }
  const current=Date.now();
  const verificationKey=Deno.env.get("CJ_SALES_VERIFICATION_SECRET")||"";
  const gateResults=await Promise.all(GATES.map(async gate=>{
   const proofs=evidenceRows.filter(e=>e.gate_key===gate);
   for(const receipt of proofs)if(await verifiedReceipt(receipt,businessId,selected!.id,verificationKey,current))return gate;
   return null;
  }));
  const verified_gates=gateResults.filter((g):g is string=>typeof g==="string");
  const blockers=GATES.filter(gate=>!verified_gates.includes(gate));
  if(!selected)blockers.push("campaign_not_configured");
  const agentCount=agents.filter(a=>["VERIFIED","DEPLOYED","MONITORING"].includes(a.status)).length;
  const registryVerified=agent_capabilities.every(group=>group.agents.every(a=>["VERIFIED","DEPLOYED","MONITORING"].includes(a.status)));
  if(!registryVerified)blockers.push("registry_agents_verified");
  // Readiness never starts a campaign. Owner action authorization remains a separate gate.
  const status=blockers.length===0?"READY_FOR_AUTHORIZED_FINAL_REVIEW":"BLOCKED";
  return reply({
   mode:"READ_ONLY",business_id:businessId,campaigns:campaignsQ.data||[],selected_campaign_id:selected?.id||null,
   agent_capabilities,integrations,execution_results,
   readiness:{status,launch_authorized:false,verified_gates,blockers,
    agent_registry_count:agents.length,agent_verified_registry_count:agentCount,
    provider_operations_verified:0,
    note:"Only trusted, unexpired server receipts count. There is no evidence issuer or external execution runner yet; planning approval never authorizes external actions."}
  });
 }catch(e){if(e instanceof InputError)return reply({error:e.message},400);console.error("cj-sales-command-center",errMsg(e));return reply({error:"Sales Command Center request failed"},500)}
});
