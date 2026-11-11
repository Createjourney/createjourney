import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const safe=(x:unknown,n=160)=>typeof x==="string"?x.trim().slice(0,n):"";
const keyOk=(x:string)=>/^[a-z0-9:_./-]{3,160}$/.test(x);
const projection="node_key,node_kind,name,description,navigation_target,required_roles,capability_status,verification_status,verified_at";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return respond({error:"method_not_allowed"},405);
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/.test(bearer))return respond({error:"authentication_required"},401);
 try{
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service)return respond({error:"server_unavailable"},503);
  const userClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:bearer}}});
  const {data:auth,error:authError}=await userClient.auth.getUser(bearer.replace(/^Bearer\s+/,""));
  if(authError||!auth.user)return respond({error:"unauthorized"},401);
  const body=await req.json().catch(()=>({}));
  const action=safe(body?.action,40)||"catalog";
  const businessId=safe(body?.business_id,50);
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(businessId))return respond({error:"valid_business_id_required"},400);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  // Resolve membership on the trusted server. Never infer business scope from an AI prompt.
  const {data:membership,error:memberError}=await db.from("business_members").select("role").eq("business_id",businessId)
   .eq("user_id",auth.user.id).eq("is_active",true).maybeSingle();
  if(memberError)return respond({error:"membership_check_failed"},503);
  if(!membership)return respond({error:"forbidden"},403);
  const role=String(membership.role||"").toLowerCase();
  const elevated=["owner","manager"].includes(role);
  const internalKinds=new Set(["agent_capability","backend_operation","permission"]);
  const visible=(node:any)=>!internalKinds.has(node.node_kind)||elevated;
  const statusFor=(node:any)=>({
   ...node,
   available_to_role:!node.required_roles?.length||node.required_roles.some((r:string)=>r.toLowerCase()===role),
   // This endpoint is informative, never an executor or approval authority.
   executable_via_this_endpoint:false
  });
  const {data:version,error:vError}=await db.from("cj_platform_knowledge_versions")
   .select("id,source_commit,verified_at,artifact_sha256").eq("environment","production").eq("state","VERIFIED")
   .order("verified_at",{ascending:false}).limit(1).maybeSingle();
  if(vError)return respond({error:"knowledge_registry_unavailable"},503);
  if(!version)return respond({error:"knowledge_not_verified",capabilities_available:false},503);
  const baseline={knowledge_version:version.id,source_commit:version.source_commit,verified_at:version.verified_at};
  if(action==="catalog"){
   const kind=safe(body?.kind,40);
   const allowed=["page","feature","interaction","workflow","integration","agent_capability","backend_operation","permission"];
   if(kind&&!allowed.includes(kind))return respond({error:"unsupported_kind"},400);
   if(kind&&internalKinds.has(kind)&&!elevated)return respond({error:"forbidden"},403);
   let q=db.from("cj_platform_knowledge_nodes").select(projection).eq("version_id",version.id)
     .order("node_key",{ascending:true}).limit(150);
   if(kind)q=q.eq("node_kind",kind);
   else q=q.in("node_kind",["page","feature"]);
   const {data,error}=await q;
   if(error)return respond({error:"catalog_unavailable"},503);
   return respond({...baseline,entries:(data||[]).filter(visible).map(statusFor)});
  }
  if(action==="lookup"||action==="relationships"){
   const nodeKey=safe(body?.node_key,160);
   if(!keyOk(nodeKey))return respond({error:"invalid_node_key"},400);
   const {data:node,error}=await db.from("cj_platform_knowledge_nodes").select(projection)
     .eq("version_id",version.id).eq("node_key",nodeKey).maybeSingle();
   if(error)return respond({error:"lookup_unavailable"},503);
   if(!node||!visible(node))return respond({error:"not_found"},404);
   if(action==="lookup")return respond({...baseline,node:statusFor(node)});
   if(!elevated)return respond({error:"forbidden"},403);
   const [outbound,inbound]=await Promise.all([
    db.from("cj_platform_knowledge_edges").select("from_node_key,to_node_key,relation_type")
     .eq("version_id",version.id).eq("from_node_key",nodeKey).limit(100),
    db.from("cj_platform_knowledge_edges").select("from_node_key,to_node_key,relation_type")
     .eq("version_id",version.id).eq("to_node_key",nodeKey).limit(100)
   ]);
   if(outbound.error||inbound.error)return respond({error:"relationships_unavailable"},503);
   const combined=[...(outbound.data||[]),...(inbound.data||[])];
   const seen=new Set<string>();
   const edges=combined.filter((e:any)=>{const id=[e.from_node_key,e.to_node_key,e.relation_type].join("|");if(seen.has(id))return false;seen.add(id);return true;}).slice(0,150);
   return respond({...baseline,node:statusFor(node),edges});
  }
  return respond({error:"unsupported_action"},400);
 }catch(_){return respond({error:"request_failed"},500)}
});
