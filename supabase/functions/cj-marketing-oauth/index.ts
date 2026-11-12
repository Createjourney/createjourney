import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
/**
 * OAuth onboarding for Gmail send-only and TikTok Login Kit.
 * All POST actions require an authenticated owner/manager, callbacks require
 * unique short-lived one-time state, and nothing sends/publishes automatically.
 * verify_jwt=false is necessary for third-party GET callbacks; never remove
 * the explicit Supabase auth checks on POST actions.
 */
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
type Provider="gmail"|"tiktok";
const configs={
 gmail:{id:"GOOGLE_GMAIL_CLIENT_ID",secret:"GOOGLE_GMAIL_CLIENT_SECRET",
 auth:"https://accounts.google.com/o/oauth2/v2/auth",
 token:"https://oauth2.googleapis.com/token",scopes:"openid email profile https://www.googleapis.com/auth/gmail.send"},
 tiktok:{id:"TIKTOK_CLIENT_KEY",secret:"TIKTOK_CLIENT_SECRET",
 auth:"https://www.tiktok.com/v2/auth/authorize/",
 token:"https://open.tiktokapis.com/v2/oauth/token/",scopes:"user.info.basic"}
} as const;
const supabaseUrl=()=>Deno.env.get("SUPABASE_URL")||"";
const callback=(p:Provider)=>supabaseUrl()+"/functions/v1/cj-marketing-oauth/"+p;
const cfg=(p:Provider)=>({client:Deno.env.get(configs[p].id)||"",secret:Deno.env.get(configs[p].secret)||"",
  encrypt:Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY")||""});
const providerFrom=(v:unknown):Provider|null=>v==="gmail"||v==="tiktok"?v:null;
async function encryptionKey(p:Provider){
 const secret=cfg(p).encrypt;
 if(secret.length<32)throw Error("Encryption configuration missing");
 const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));
 return crypto.subtle.importKey("raw",buf,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encrypt(p:Provider,value:any){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const plain=new TextEncoder().encode(JSON.stringify(value));
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await encryptionKey(p),plain));
 const b64=(v:Uint8Array)=>btoa(String.fromCharCode(...v));
 return b64(iv)+"."+b64(encrypted);
}
async function decrypt(p:Provider,encoded:string){
 const [a,b]=encoded.split(".");
 if(!a||!b)throw Error("Encrypted authorization unavailable");
 const arr=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:arr(a)},await encryptionKey(p),arr(b));
 return JSON.parse(new TextDecoder().decode(plain));
}
const dbClient=()=>{
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!supabaseUrl()||!service)throw Error("Supabase server config missing");
 return createClient(supabaseUrl(),service,{auth:{persistSession:false,autoRefreshToken:false}});
};
async function member(req:Request,db:any,business:string){
 const token=(req.headers.get("Authorization")||"").match(/^Bearer (\S+)$/)?.[1];
 if(!token)return {error:"Authentication required",status:401} as const;
 const client=createClient(supabaseUrl(),Deno.env.get("SUPABASE_ANON_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(token);
 if(error||!data.user)return {error:"Invalid session",status:401} as const;
 const {data:m,error:me}=await db.from("business_members").select("role").eq("business_id",business)
  .eq("user_id",data.user.id).eq("is_active",true).maybeSingle();
 if(me||!m||!["owner","manager"].includes(String(m.role)))return {error:"Business owner/manager required",status:403} as const;
 return {id:data.user.id,role:String(m.role)} as const;
}
async function tokenExchange(p:Provider,code:string){
 const c=cfg(p);
 const form=p==="gmail"?
  new URLSearchParams({client_id:c.client,client_secret:c.secret,code,
    grant_type:"authorization_code",redirect_uri:callback(p)}):
  new URLSearchParams({client_key:c.client,client_secret:c.secret,code,
    grant_type:"authorization_code",redirect_uri:callback(p)});
 const r=await fetch(configs[p].token,{method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form,signal:AbortSignal.timeout(18000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||!data?.access_token)throw Error("Provider did not authorize access");
 return data;
}
async function profile(p:Provider,access:string,tokens:any){
 if(p==="gmail"){
  const r=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",
   {headers:{Authorization:"Bearer "+access},signal:AbortSignal.timeout(12000)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.email)return null;
  return {id:String(j.sub||""),name:String(j.email)};
 }
 const openId=String(tokens.open_id||"");
 if(!openId)return null;
 const r=await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",{
  headers:{Authorization:"Bearer "+access},signal:AbortSignal.timeout(12000)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j?.error?.code!=="ok")return {id:openId,name:"TikTok account"};
 return {id:openId,name:String(j?.data?.user?.display_name||"TikTok account")};
}
async function getCallback(req:Request,p:Provider){
 const c=cfg(p);
 if(!c.client||!c.secret||c.encrypt.length<32)return json({error:"Provider OAuth not configured"},503);
 const query=new URL(req.url).searchParams;
 if(query.get("error"))return json({error:"Provider authorization denied"},403);
 const state=query.get("state")||"",code=query.get("code")||"";
 if(!/^[\w.\-]{50,150}$/.test(state)||!code||code.length>4096)return json({error:"Invalid authorization response"},400);
 const db=dbClient();
 const {data:row,error}=await db.from("connected_accounts").select("id,business_id,oauth_state,status,metadata")
  .eq("provider",p).eq("status","connecting").eq("oauth_state",state).maybeSingle();
 if(error||!row||row.metadata?.provider!==p)return json({error:"Invalid OAuth state"},403);
 const started=Date.parse(String(row.metadata?.started||""));
 if(!Number.isFinite(started)||started>Date.now()+30000||Date.now()-started>600000)
  return json({error:"OAuth request expired"},403);
 const {data:consumed,error:consumeError}=await db.from("connected_accounts")
  .update({oauth_state:null,status:"needs_attention",updated_at:new Date().toISOString()})
  .eq("id",row.id).eq("status","connecting").eq("oauth_state",state).select("id").maybeSingle();
 if(consumeError||!consumed)return json({error:"Authorization callback already processed"},409);
 const tokens=await tokenExchange(p,code);
 const identity=await profile(p,tokens.access_token,tokens);
 if(!identity||!identity.id)return json({error:"Could not verify provider identity"},502);
 const scopes=(p==="gmail"?String(tokens.scope||"").split(/\s+/):String(tokens.scope||query.get("scopes")||"").split(",")).filter(Boolean);
 // Gmail send scope and TikTok identity scope must be actually granted.
 const required=p==="gmail"?"https://www.googleapis.com/auth/gmail.send":"user.info.basic";
 if(!scopes.includes(required))return json({error:"Required provider permission was not granted"},403);
 const expiry=Number(tokens.expires_in)>0?new Date(Date.now()+Number(tokens.expires_in)*1000).toISOString():null;
 const encrypted=await encrypt(p,tokens);
 const {error:save}=await db.from("connected_accounts").update({
  status:"connected",connection_type:"oauth",external_account_id:identity.id,
  external_account_name:identity.name,scopes,capabilities:p==="gmail"?["email_send_approved_only"]:["tiktok_profile_read"],
  metadata:{encrypted_tokens:encrypted,identity_verified_at:new Date().toISOString(),
   publishing_verified:false,outreach_verified:false},token_expires_at:expiry,
  connected_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()
 }).eq("id",row.id).eq("business_id",row.business_id);
 if(save)return json({error:"Could not save authorization securely"},503);
 return new Response(null,{status:303,headers:{Location:"https://app.gocreatejourney.com/?integration="+p+"&result=connected",
  "Cache-Control":"no-store"}});
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  if(req.method==="GET"){
   const path=new URL(req.url).pathname;
   const provider=providerFrom(path.split("/").filter(Boolean).at(-1));
   if(!provider)return json({error:"Unsupported callback provider"},400);
   return await getCallback(req,provider);
  }
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const body=await req.json().catch(()=>({}));
  const business=String(body?.business_id||"");
  const p=providerFrom(body?.provider);
  if(!p||!/^[a-f0-9-]{36}$/i.test(business))return json({error:"Provider and business required"},400);
  const db=dbClient(),user=await member(req,db,business);
  if("error" in user)return json({error:user.error},user.status);
  const action=String(body?.action||"status");
  const c=cfg(p),ready=!!c.client&&!!c.secret&&c.encrypt.length>=32;
  const {data:row,error}=await db.from("connected_accounts")
   .select("id,status,external_account_name,scopes,metadata,token_expires_at")
   .eq("business_id",business).eq("provider",p).maybeSingle();
  if(error)throw error;
  if(action==="status")return json({provider:p,oauth_configured:ready,status:row?.status||"disconnected",
   account_name:row?.external_account_name||null,callback_url:callback(p),
   verified_external_sending:false,verified_external_publishing:false});
  if(action==="begin"){
   if(!ready)return json({error:"Provider OAuth app credentials/encryption are not configured",
    configuration_required:true,callback_url:callback(p)},503);
   if(row?.status==="connected")return json({error:"Disconnect the current account before replacing it"},409);
   const state=crypto.randomUUID()+"."+crypto.randomUUID();
   const values={status:"connecting",oauth_state:state,connected_by:user.id,
    metadata:{provider:p,started:new Date().toISOString()},updated_at:new Date().toISOString()};
   const result=row?await db.from("connected_accounts").update(values).eq("business_id",business).eq("id",row.id):
    await db.from("connected_accounts").insert({...values,business_id:business,provider:p,connection_type:"oauth"});
   if(result.error)throw result.error;
   const auth=new URL(configs[p].auth);
   auth.searchParams.set(p==="gmail"?"client_id":"client_key",c.client);
   auth.searchParams.set("redirect_uri",callback(p));
   auth.searchParams.set("response_type","code");
   auth.searchParams.set("state",state);
   auth.searchParams.set("scope",configs[p].scopes);
   if(p==="gmail"){auth.searchParams.set("access_type","offline");auth.searchParams.set("prompt","consent")}
   return json({provider:p,authorization_url:auth.toString(),external_actions_authorized:false});
  }
  if(action==="disconnect"){
   if(user.role!=="owner")return json({error:"Owner permission required"},403);
   if(row){
    const {error:up}=await db.from("connected_accounts").update({status:"disconnected",oauth_state:null,
     metadata:{},scopes:[],capabilities:[],external_account_id:null,external_account_name:null,
     token_expires_at:null,connected_at:null,last_synced_at:null,updated_at:new Date().toISOString()})
     .eq("business_id",business).eq("id",row.id);
    if(up)throw up;
   }
   return json({disconnected:true,provider:p,provider_side_revoke_verified:false});
  }
  if(action==="verify"){
   if(row?.status!=="connected")return json({error:"Account not connected"},409);
   let tokens=await decrypt(p,String(row.metadata?.encrypted_tokens||""));
   const exp=row.token_expires_at?Date.parse(row.token_expires_at):0;
   if(exp&&exp<Date.now()+300000){
    if(!tokens.refresh_token)return json({error:"Token needs account reauthorization"},409);
    const form=p==="gmail"?
     new URLSearchParams({client_id:c.client,client_secret:c.secret,
      refresh_token:tokens.refresh_token,grant_type:"refresh_token"}):
     new URLSearchParams({client_key:c.client,client_secret:c.secret,
      refresh_token:tokens.refresh_token,grant_type:"refresh_token"});
    const resp=await fetch(configs[p].token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});
    const updated=await resp.json().catch(()=>({}));
    if(!resp.ok||!updated.access_token)return json({error:"Provider token refresh failed"},502);
    tokens={...tokens,...updated,refresh_token:updated.refresh_token||tokens.refresh_token};
   }
   const identity=await profile(p,String(tokens.access_token||""),tokens);
   if(!identity||!identity.id)return json({error:"Provider identity verification failed"},502);
   const encrypted=await encrypt(p,tokens);
   const expires=Number(tokens.expires_in)>0?new Date(Date.now()+Number(tokens.expires_in)*1000).toISOString():row.token_expires_at;
   const {error:up}=await db.from("connected_accounts").update({external_account_id:identity.id,
    external_account_name:identity.name,metadata:{...row.metadata,encrypted_tokens:encrypted,verified_at:new Date().toISOString()},
    token_expires_at:expires,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()})
    .eq("business_id",business).eq("id",row.id);
   if(up)throw up;
   return json({identity_verified:true,provider:p,external_actions_verified:false});
  }
  return json({error:"Unsupported action"},400);
 }catch(e){console.error("cj-marketing-oauth",e instanceof Error?e.message:"unknown");
  return json({error:"Marketing authorization service unavailable"},500)}
});
