import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
/**
 * Shopify standalone-store OAuth adapter.
 * Unlike embedded Shopify apps, CreateJourney needs the authorization-code flow.
 * This adapter never places orders, publishes marketing, or sends outreach.
 * Deploy with verify_jwt=false ONLY because Shopify must invoke the signed GET callback.
 * All POST actions authenticate a real user token and active business owner/manager.
 */
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const send=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const shopReg=/^[a-z0-9][a-z0-9-]{0,62}\.myshopify\.com$/;
const scopes="read_products,read_orders";
const apiVersion="2026-10";
const u=()=>Deno.env.get("SUPABASE_URL")||"";
const redirect=()=>u()+"/functions/v1/cj-shopify-integration";
function config(){
 return {client_id:Deno.env.get("SHOPIFY_CLIENT_ID")||"",client_secret:Deno.env.get("SHOPIFY_CLIENT_SECRET")||"",
 token_key:Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY")||""};
}
async function aesKey(){
 const secret=config().token_key;
 if(secret.length<32)throw Error("Encryption is not configured");
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));
 return crypto.subtle.importKey("raw",bytes,{name:"AES-GCM"},false,["encrypt"]);
}
async function encrypt(token:string){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await aesKey();
 const bytes=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(token)));
 const enc=(arr:Uint8Array)=>btoa(String.fromCharCode(...arr));
 return enc(iv)+"."+enc(bytes);
}
async function verifyShopifyHmac(q:URLSearchParams,secret:string){
 const signature=q.get("hmac")||"";
 if(!/^[0-9a-f]{64}$/i.test(signature)||!secret)return false;
 const entries=[...q.entries()].filter(([k])=>k!=="hmac"&&k!=="signature").sort(([a],[b])=>a.localeCompare(b));
 const msg=entries.map(([k,v])=>k+"="+v).join("&");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 const sig=new Uint8Array((signature.match(/../g)||[]).map(x=>parseInt(x,16)));
 return crypto.subtle.verify("HMAC",key,sig,new TextEncoder().encode(msg));
}
function admin(){
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!u()||!service)throw Error("Supabase server configuration missing");
 return createClient(u(),service,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function authorize(req:Request,db:any,business:string){
 const token=(req.headers.get("Authorization")||"").match(/^Bearer (\S+)$/)?.[1];
 if(!token)return {error:"Authentication required",status:401} as const;
 const auth=createClient(u(),Deno.env.get("SUPABASE_ANON_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await auth.auth.getUser(token);
 if(error||!data.user)return {error:"Invalid session",status:401} as const;
 const {data:membership,error:me}=await db.from("business_members").select("role,is_active")
  .eq("business_id",business).eq("user_id",data.user.id).eq("is_active",true).maybeSingle();
 if(me||!membership||!["owner","manager"].includes(String(membership.role)))return {error:"Business access denied",status:403} as const;
 return {user_id:data.user.id,role:String(membership.role)} as const;
}
async function handleCallback(req:Request){
 const cfg=config();
 if(!cfg.client_id||!cfg.client_secret||!cfg.token_key)return send({error:"Shopify app not configured"},503);
 const q=new URL(req.url).searchParams;
 const shop=q.get("shop")||"",state=q.get("state")||"",code=q.get("code")||"";
 if(!shopReg.test(shop)||!state||state.length>150||!code||code.length>2000)return send({error:"Invalid Shopify callback"},400);
 if(!await verifyShopifyHmac(q,cfg.client_secret))return send({error:"Invalid Shopify signature"},403);
 const ts=Number(q.get("timestamp")||"0");
 if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>600)return send({error:"Expired Shopify callback"},403);
 const db=admin();
 const {data:row,error}=await db.from("connected_accounts").select("id,business_id,status,oauth_state,metadata")
  .eq("provider","shopify").eq("oauth_state",state).eq("status","connecting").maybeSingle();
 if(error||!row||row.metadata?.shop!==shop)return send({error:"Invalid or expired connection state"},403);
 const started=Date.parse(String(row.metadata?.oauth_started_at||""));
 if(!Number.isFinite(started)||Date.now()-started>10*60*1000||started>Date.now()+30000)
  return send({error:"Connection request expired"},403);
 // Consume state before token exchange to avoid callback replay.
 const {data:consumed,error:consumeErr}=await db.from("connected_accounts")
  .update({oauth_state:null,status:"needs_attention",updated_at:new Date().toISOString()})
  .eq("id",row.id).eq("status","connecting").eq("oauth_state",state).select("id").maybeSingle();
 if(consumeErr||!consumed)return send({error:"Callback already processed"},409);
 const r=await fetch("https://"+shop+"/admin/oauth/access_token",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({client_id:cfg.client_id,client_secret:cfg.client_secret,code}),
  signal:AbortSignal.timeout(15000)});
 const x=await r.json().catch(()=>({}));
 if(!r.ok||typeof x.access_token!=="string"||!x.access_token)return send({error:"Shopify authorization failed"},502);
 const encoded=await encrypt(x.access_token);
 const requested=String(x.scope||"").split(",").filter(Boolean);
 const {error:saveError}=await db.from("connected_accounts").update({
  status:"connected",external_account_id:shop,external_account_name:shop,
  scopes:requested,capabilities:["products_read","orders_read"],
  metadata:{shop,encrypted_tokens:encoded,oauth_completed_at:new Date().toISOString(),
   fulfillment_verified:false,order_webhook_verified:false,scope_verified:true},
  connected_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()
 }).eq("id",row.id).eq("business_id",row.business_id);
 if(saveError)return send({error:"Shopify account persistence failed"},503);
 // No auth tokens or codes in the browser redirect.
 return new Response(null,{status:303,headers:{"Location":"https://app.gocreatejourney.com/?integration=shopify&result=connected",
  "Cache-Control":"no-store"}});
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  if(req.method==="GET")return handleCallback(req);
  if(req.method!=="POST")return send({error:"Method not allowed"},405);
  const body=await req.json().catch(()=>({}));
  const business=typeof body.business_id==="string"?body.business_id:"";
  if(!/^[a-f0-9-]{36}$/i.test(business))return send({error:"Select a valid business"},400);
  const db=admin();
  const identity=await authorize(req,db,business);
  if("error" in identity)return send({error:identity.error},identity.status);
  const action=String(body.action||"status");
  const cfg=config();
  const enabled=!!cfg.client_id&&!!cfg.client_secret&&cfg.token_key.length>=32;
  const {data:row,error}=await db.from("connected_accounts").select("id,status,external_account_name,external_account_id,scopes,metadata,connected_at")
    .eq("business_id",business).eq("provider","shopify").maybeSingle();
  if(error)throw error;
  if(action==="status")return send({provider:"shopify",oauth_configured:enabled,
   connected:row?.status==="connected",status:row?.status||"disconnected",
   store:row?.external_account_name||null,scope_verified:!!row?.metadata?.scope_verified,
   order_webhook_verified:!!row?.metadata?.order_webhook_verified,
   external_execution_verified:false,callback_url:redirect()});
  if(action==="begin"){
   if(!enabled)return send({error:"Shopify OAuth credentials/encryption key are not configured",
    configuration_required:true,callback_url:redirect()},503);
   if(row?.status==="connected")return send({error:"Disconnect the existing store before changing it"},409);
   const shop=String(body.shop||"").toLowerCase().trim();
   if(!shopReg.test(shop))return send({error:"Enter your store's exact .myshopify.com domain"},400);
   const state=crypto.randomUUID()+"."+crypto.randomUUID();
   const meta={shop,oauth_started_at:new Date().toISOString()};
   const values={status:"connecting",oauth_state:state,metadata:meta,connected_by:identity.user_id,updated_at:new Date().toISOString()};
   const q=row?await db.from("connected_accounts").update(values).eq("id",row.id).eq("business_id",business):
     await db.from("connected_accounts").insert({...values,business_id:business,provider:"shopify",connection_type:"oauth"});
   if(q.error)throw q.error;
   const auth=new URL("https://"+shop+"/admin/oauth/authorize");
   auth.searchParams.set("client_id",cfg.client_id);
   auth.searchParams.set("scope",scopes);
   auth.searchParams.set("redirect_uri",redirect());
   auth.searchParams.set("state",state);
   return send({provider:"shopify",authorization_url:auth.toString(),scope:scopes,external_actions_authorized:false});
  }
  if(action==="disconnect"){
   if(identity.role!=="owner")return send({error:"Owner permission required"},403);
   if(row){const {error:delError}=await db.from("connected_accounts").update({
    status:"disconnected",oauth_state:null,metadata:{},scopes:[],capabilities:[],
    external_account_id:null,external_account_name:null,connected_at:null,last_synced_at:null,
    token_expires_at:null,updated_at:new Date().toISOString()
   }).eq("business_id",business).eq("id",row.id);if(delError)throw delError}
   return send({disconnected:true,provider:"shopify",provider_side_revoke_verified:false});
  }
  return send({error:"Unsupported action"},400);
 }catch(e){console.error("cj-shopify-integration",e instanceof Error?e.message:"unknown");
  return send({error:"Shopify connection service unavailable"},500)}
});
