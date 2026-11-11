#!/usr/bin/env node
/**
 * Explicit STAGING-ONLY importer for approved platform knowledge artifacts.
 * Never runs automatically in CI. Requires a connected project service-role
 * credential, an exact project URL and CJ_PLATFORM_KNOWLEDGE_IMPORT=STAGING_ONLY_APPROVED.
 * All records remain STAGED and inaccessible through the production knowledge API.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const projectId='pbiivpehdatvmyaxwixk';
const keyRegex=/^[a-z0-9:_./-]{3,160}$/;
export function validateSnapshot(snapshot){
 if(!snapshot||snapshot.schema_version!==1||snapshot.environment!=='staging'||snapshot.state!=='STAGED')
   throw Error('Only staged V1 platform knowledge snapshots may be imported');
 if(!/^[a-f0-9]{40}$/.test(snapshot.source_commit||''))throw Error('Invalid pinned commit');
 if(!/^[a-f0-9]{64}$/.test(snapshot.artifact_sha256||''))throw Error('Invalid artifact SHA256');
 const {artifact_sha256,...payload}=snapshot;
 const computed=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 if(computed!==artifact_sha256)throw Error('Knowledge artifact checksum mismatch');
 if(!Array.isArray(snapshot.nodes)||!Array.isArray(snapshot.edges)||snapshot.nodes.length>20000||snapshot.edges.length>60000)
  throw Error('Invalid graph size');
 const names=new Set();
 for(const n of snapshot.nodes){
  if(!keyRegex.test(n.node_key||'')||names.has(n.node_key))throw Error('Duplicate or invalid knowledge node key');
  names.add(n.node_key);
  if(n.capability_status!=='IMPLEMENTED_UNVERIFIED'||n.verification_status!=='UNVERIFIED'||n.verified_at!==null)
   throw Error('Static knowledge cannot be marked verified');
  if(!n.evidence?.source_path||typeof n.evidence.source_path!=='string')throw Error('Missing source evidence');
 }
 for(const e of snapshot.edges){
  if(!names.has(e.from_node_key)||!names.has(e.to_node_key))throw Error('Dangling graph relationship');
 }
 if(snapshot.counts?.nodes!==snapshot.nodes.length||snapshot.counts?.edges!==snapshot.edges.length)
  throw Error('Declared graph count mismatch');
 return {node_count:snapshot.nodes.length,edge_count:snapshot.edges.length,sha256:computed};
}

async function importStaging(filename){
 if(process.env.CJ_PLATFORM_KNOWLEDGE_IMPORT!=='STAGING_ONLY_APPROVED')
  throw Error('Refusing DB writes without explicit STAGING_ONLY_APPROVED gate');
 const raw=JSON.parse(readFileSync(filename,'utf8'));
 const report=validateSnapshot(raw);
 const base=process.env.SUPABASE_URL||'';
 const url=new URL(base);
 if(url.protocol!=='https:'||url.hostname!==projectId+'.supabase.co')
  throw Error('Wrong Supabase project hostname; import refused');
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
 if(!secret)throw Error('Service-role key must be supplied securely');
 const headers={'Content-Type':'application/json','apikey':secret,'Authorization':'Bearer '+secret};
 async function request(path,init={}){
  const res=await fetch(base+'/rest/v1/'+path,{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(30000)});
  const body=await res.text();
  if(!res.ok)throw Error('Platform knowledge REST request failed (HTTP '+res.status+')');
  return {body:body?JSON.parse(body):null,headers:res.headers};
 }
 const vQuery='cj_platform_knowledge_versions?environment=eq.staging&source_commit=eq.'+raw.source_commit+
  '&artifact_sha256=eq.'+raw.artifact_sha256+'&select=id,state';
 let found=(await request(vQuery)).body;
 if(found.length>1)throw Error('Ambiguous staging version');
 if(found.length&&found[0].state!=='STAGED')throw Error('Version is no longer staged');
 let id=found[0]?.id;
 if(!id){
  const created=(await request('cj_platform_knowledge_versions?select=id',{
   method:'POST',headers:{Prefer:'return=representation'},
   body:JSON.stringify({environment:'staging',source_commit:raw.source_commit,artifact_sha256:raw.artifact_sha256,
    expected_node_count:report.node_count,expected_edge_count:report.edge_count,state:'STAGED'})
  })).body;
  id=created?.[0]?.id;
 }
 if(!/^[a-f0-9-]{36}$/i.test(id||''))throw Error('Could not create staging version');
 async function batch(table,records,conflict){
  for(let start=0;start<records.length;start+=100){
   await request(table+'?on_conflict='+conflict,{
    method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(records.slice(start,start+100))
   });
  }
 }
 // Restrict stored metadata to documented safe technical identifiers only.
 const safeMetadata=(m)=>Object.fromEntries(
  Object.entries(m||{}).filter(([k,v])=>['catalog_id','element_id','data_action','action_type','operation_name'].includes(k)&&
   (typeof v==='string'||v===null)).map(([k,v])=>[k,v===null?null:v.slice(0,160)]));
 const nodes=raw.nodes.map(n=>({
  version_id:id,node_key:n.node_key,node_kind:n.node_kind,name:String(n.name).slice(0,240),
  description:String(n.description||'').slice(0,1200),source_path:n.source_path,source_line:n.source_line,
  selector:n.selector,navigation_target:n.navigation_target,required_roles:[],
  capability_status:'IMPLEMENTED_UNVERIFIED',verification_status:'UNVERIFIED',
  verified_at:null,evidence:{source_path:n.evidence.source_path,source_line:n.evidence.source_line||null,
   verification:'SOURCE_ONLY'},metadata:safeMetadata(n.metadata)
 }));
 const edges=raw.edges.map(e=>({version_id:id,from_node_key:e.from_node_key,to_node_key:e.to_node_key,
  relation_type:e.relation_type,evidence:{source_path:e.evidence?.source_path||'unknown',verification:'SOURCE_ONLY'}}));
 await batch('cj_platform_knowledge_nodes',nodes,'version_id,node_key');
 await batch('cj_platform_knowledge_edges',edges,'version_id,from_node_key,to_node_key,relation_type');
 // Verify full persisted counts before recording staging ingestion completion.
 async function count(table){
  const res=await fetch(base+'/rest/v1/'+table+'?select=*&version_id=eq.'+id,{
   method:'HEAD',headers:{...headers,Prefer:'count=exact'},signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('Could not verify persisted staging count');
  const content=res.headers.get('content-range')||'';
  const match=content.match(/\/(\d+)$/);
  if(!match)throw Error('Count verification unavailable');
  return Number(match[1]);
 }
 const nodeCount=await count('cj_platform_knowledge_nodes');
 const edgeCount=await count('cj_platform_knowledge_edges');
 if(nodeCount!==nodes.length||edgeCount!==edges.length)throw Error('Staging import incomplete: count mismatch');
 await request('cj_platform_knowledge_versions?id=eq.'+id,{
  method:'PATCH',headers:{Prefer:'return=minimal'},
  body:JSON.stringify({ingested_at:new Date().toISOString()})
 });
 console.log(JSON.stringify({state:'STAGED',version_id:id,nodes:nodeCount,edges:edgeCount,
  promoted:false,production_modified:false}));
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const path=process.argv[2];
 if(!path){console.error('Usage: node platform-knowledge-import.mjs <staged-snapshot.json>');process.exit(2)}
 importStaging(path).catch(e=>{console.error(String(e.message||e));process.exitCode=1});
}
