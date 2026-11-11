import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const BASE="https://app.gocreatejourney.com/";
const cors={"Access-Control-Allow-Origin":BASE.slice(0,-1),"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST,GET,OPTIONS"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...cors}});
const SHOP=/^[a-z0-9][a-z0-9-]{1,62}\.myshopify\.com$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SCOPES=["read_orders","read_products"];
const env=(name:string)=>Deno.env.get(name)||"";
const redirectUri=()=>env("SUPABASE_URL")+"/functions/v1/cj-shopify-connector";
const hex=(arr:Uint8Array)=>Array.from(arr,b=>b.toString(16).padStart(2,"0")).join("");
const fromHex=(s:string)=>new Uint8Array((s.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));
const errorMessage=(e:unknown)=>e instanceof Error?e.message:"Shopify operation failed";
const authClient=()=>createClient(env("SUPABASE_URL"),env("SUPABASE_ANON_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
const adminClient=()=>createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
async function verifyHmac(secret:string,message:string,signature:string,encoding:"hex"|"base64"="hex"){
 if(!secret||!signature)return false;
 let sig:Uint8Array;
 if(encoding==="hex"){
  if(!/^[a-f0-9]{64}$/i.test(signature))return false;
  sig=fromHex(signature);
 }else{
  try{sig=Uint8Array.from(atob(signature),c=>c.charCodeAt(0))}catch{return false}
  if(sig.length!==32)return false;
 }
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 return crypto.subtle.verify("HMAC",key,new Uint8Array(sig).buffer,new TextEncoder().encode(message));
}
async function cryptKey(){
 const secret=env("INTEGRATION_TOKEN_ENCRYPTION_KEY");
 if(secret.length<24)throw new Error("Shopify encryption key missing");
 const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));
 return crypto.subtle.importKey("raw",hash,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
const b64=(arr:Uint8Array)=>btoa(String.fromCharCode(...arr));
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function encrypt(value:unknown){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await cryptKey();
 const data=new TextEncoder().encode(JSON.stringify(value));
 return b64(iv)+"."+b64(new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,data)));
}
async function decrypt(value:string){
 const [i,v]=value.split(".");
 if(!i||!v)throw new Error("Missing encrypted token");
 const key=await cryptKey();
 const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(i)},key,unb64(v));
 return JSON.parse(new TextDecoder().decode(plain));
}
async function scope(req:Request,business:string){
 const bearer=req.headers.get("Authorization")?.match(/^Bearer (\S+)$/)?.[1];
 if(!bearer)return {error:respond({error:"Owner login required"},401)};
 const {data,error}=await authClient().auth.getUser(bearer);
 if(error||!data.user)return {error:respond({error:"Invalid login"},401)};
 if(!UUID.test(business))return {error:respond({error:"Valid business required"},400)};
 const admin=adminClient();
 const {data:member,error:memberError}=await admin.from("business_members").select("role,is_active").eq("user_id",data.user.id).eq("business_id",business).eq("is_active",true).maybeSingle();
 if(memberError)return {error:respond({error:"Membership check unavailable"},503)};
 if(!member||!["owner","manager"].includes(String(member.role).toLowerCase()))return {error:respond({error:"Business owner or manager required"},403)};
 return {admin,user:data.user.id,role:String(member.role).toLowerCase()};
}
async function shopCheck(shop:string,token:string){
 // Health check requires an actual Shopify Admin API response, not an OAuth status label.
 const resp=await fetch("https://"+shop+"/admin/api/2026-10/graphql.json",{
  method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Access-Token":token},
  body:JSON.stringify({query:"query CjShopHealth { shop { id name myshopifyDomain } }"}),
  signal:AbortSignal.timeout(14000)
 });
 const payload=await resp.json().catch(()=>null);
 if(!resp.ok||payload?.errors?.length||!payload?.data?.shop?.id)throw new Error("Shopify Admin API verification unsuccessful");
 const identity=String(payload.data.shop.myshopifyDomain||"").toLowerCase();
 if(identity!==shop)throw new Error("Verified Shopify merchant does not match authorized shop");
 return {shop_id:payload.data.shop.id,shop_name:String(payload.data.shop.name||""),shop_domain:identity};
}
function callbackMessage(url:URL){
 return Array.from(url.searchParams.entries()).filter(([key])=>key!=="hmac"&&key!=="signature")
  .sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>key+"="+value).join("&");
}
async function callback(url:URL){
 const shop=(url.searchParams.get("shop")||"").toLowerCase(),state=url.searchParams.get("state")||"",code=url.searchParams.get("code")||"";
 const hmac=url.searchParams.get("hmac")||"",secret=env("CJ_SHOPIFY_CLIENT_SECRET");
 if(!SHOP.test(shop)||!/^[0-9a-f]{64}$/.test(state)||!code||code.length>4096||!secret)
  return respond({error:"Invalid Shopify callback"},400);
 if(!await verifyHmac(secret,callbackMessage(url),hmac))return respond({error:"Unverified Shopify callback"},401);
 const admin=adminClient();
 const {data:row,error}=await admin.from("connected_accounts").select("id,business_id,oauth_state,metadata")
  .eq("provider","shopify").eq("oauth_state",state).eq("status","connecting").maybeSingle();
 if(error||!row)return respond({error:"Shopify authorization expired or invalid"},401);
 const meta=row.metadata&&typeof row.metadata==="object"?row.metadata:{};
 const stateStart=Date.parse(String(meta.shopify_state_created_at||""));
 if(!Number.isFinite(stateStart)||stateStart>Date.now()||Date.now()-stateStart>10*60*1000||
  String(meta.shopify_pending_domain||"")!==shop)return respond({error:"Expired Shopify authorization"},401);
 // Reserve state before token exchange to disallow concurrent callback replay.
 const reserved=await admin.from("connected_accounts").update({oauth_state:null,status:"connecting"})
  .eq("id",row.id).eq("oauth_state",state).eq("status","connecting").select("id").maybeSingle();
 if(reserved.error||!reserved.data)return respond({error:"Shopify authorization already processed"},409);
 try{
  const exchange=await fetch("https://"+shop+"/admin/oauth/access_token",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({client_id:env("CJ_SHOPIFY_CLIENT_ID"),client_secret:secret,code}),
   signal:AbortSignal.timeout(15000)
  });
  const tokens=await exchange.json().catch(()=>null);
  if(!exchange.ok||!tokens?.access_token)throw new Error("Shopify token exchange was not approved");
  const granted=new Set(String(tokens.scope||"").split(",").map((x:string)=>x.trim()));
  if(SCOPES.some(x=>!granted.has(x)))throw new Error("Shopify did not grant necessary read-only scopes");
  const shopInfo=await shopCheck(shop,String(tokens.access_token));
  const encrypted=await encrypt({access_token:tokens.access_token,scope:tokens.scope,shop});
  const cleanMetadata={encrypted_tokens:encrypted,verified_at:new Date().toISOString(),shopify_shop_id:shopInfo.shop_id};
  const update=await admin.from("connected_accounts").update({
   status:"connected",metadata:cleanMetadata,external_account_id:shop,external_account_name:shopInfo.shop_name,
   scopes:[...granted],capabilities:["shop_read","orders_read","products_read"],last_synced_at:new Date().toISOString(),
   connected_at:new Date().toISOString(),token_expires_at:null,last_error:null,updated_at:new Date().toISOString()
  }).eq("id",row.id).eq("status","connecting").is("oauth_state",null);
  if(update.error)throw update.error;
  return Response.redirect(BASE+"?shopify=connected",302);
 }catch(e){
  await admin.from("connected_accounts").update({status:"error",last_error:"Shopify authorization did not complete",updated_at:new Date().toISOString()}).eq("id",row.id).eq("status","connecting").is("oauth_state",null);
  console.error("Shopify verification error:",errorMessage(e));
  return Response.redirect(BASE+"?shopify=error",302);
 }
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const base=env("SUPABASE_URL");
 if(!base||!env("SUPABASE_SERVICE_ROLE_KEY")||!env("SUPABASE_ANON_KEY"))return respond({error:"Service unavailable"},503);
 if(req.method==="GET")return callback(new URL(req.url));
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 try{
  const body=await req.text();
  if(body.length>6000)return respond({error:"Request too large"},413);
  let json:any;
  try{json=JSON.parse(body)}catch{return respond({error:"Invalid JSON"},400)}
  const business=String(json?.business_id||"");
  const access=await scope(req,business);
  if(access.error)return access.error;
  const admin=access.admin!;
  const action=String(json?.action||"status");
  const {data:account,error:lookupError}=await admin.from("connected_accounts")
   .select("id,provider,status,external_account_id,external_account_name,last_synced_at,metadata,scopes")
   .eq("business_id",business).eq("provider","shopify").maybeSingle();
  if(lookupError)return respond({error:"Shopify account lookup unavailable"},503);
  if(action==="status")return respond({
   provider:"shopify",configured:!!env("CJ_SHOPIFY_CLIENT_ID")&&!!env("CJ_SHOPIFY_CLIENT_SECRET"),
   status:account?.status||"disconnected",shop:account?.external_account_id||null,
   account_name:account?.external_account_name||null,last_verified_at:account?.last_synced_at||null,
   operational_verified:false
  });
  if(action==="start"){
   if(access.role!=="owner")return respond({error:"Owner approval required to connect Shopify"},403);
   const shop=String(json?.shop||"").toLowerCase().trim();
   if(!SHOP.test(shop))return respond({error:"Enter a valid *.myshopify.com domain"},400);
   if(!env("CJ_SHOPIFY_CLIENT_ID")||!env("CJ_SHOPIFY_CLIENT_SECRET")||!env("INTEGRATION_TOKEN_ENCRYPTION_KEY"))
    return respond({error:"Shopify app credentials are not configured for CreateJourney"},503);
   const state=hex(crypto.getRandomValues(new Uint8Array(32)));
   const metadata={shopify_state_created_at:new Date().toISOString(),shopify_pending_domain:shop};
   const update=await admin.from("connected_accounts").upsert({
    business_id:business,provider:"shopify",status:"connecting",connection_type:"oauth",
    connected_by:access.user,oauth_state:state,metadata,external_account_id:shop,
    capabilities:[],scopes:[],updated_at:new Date().toISOString()
   },{onConflict:"business_id,provider"});
   if(update.error)return respond({error:"Unable to initiate Shopify authorization"},500);
   const url=new URL("https://"+shop+"/admin/oauth/authorize");
   url.searchParams.set("client_id",env("CJ_SHOPIFY_CLIENT_ID"));
   url.searchParams.set("scope",SCOPES.join(","));
   url.searchParams.set("redirect_uri",redirectUri());
   url.searchParams.set("state",state);
   return respond({authorization_url:url.toString(),scopes:SCOPES,shop});
  }
  if(action==="verify"){
   if(!account||account.status!=="connected")return respond({error:"Shopify connection required"},409);
   const shop=String(account.external_account_id||"");
   if(!SHOP.test(shop))return respond({error:"Invalid connected shop"},409);
   const encrypted=String((account.metadata as any)?.encrypted_tokens||"");
   if(!encrypted)return respond({error:"Shopify token unavailable"},409);
   const t=await decrypt(encrypted);
   try{
    const info=await shopCheck(shop,String(t.access_token||""));
    const updatedAt=new Date().toISOString();
    await admin.from("connected_accounts").update({last_synced_at:updatedAt,last_error:null,updated_at:updatedAt}).eq("id",account.id);
    return respond({provider:"shopify",status:"connected",operational_verified:true,shop:info.shop_domain,
     account_name:info.shop_name,verified_at:updatedAt,capabilities:["orders_read","products_read"]});
   }catch{
    return respond({provider:"shopify",status:"needs_attention",operational_verified:false,
     error:"Unable to verify Shopify Admin API access"},502);
   }
  }
  return respond({error:"Unsupported action"},400);
 }catch(e){console.error("Shopify connection operation failed:",errorMessage(e));return respond({error:"Shopify connection request failed"},500)}
});
