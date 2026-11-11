#!/usr/bin/env node
/**
 * Build STAGED, NON-OPERATIONAL platform knowledge from checked-in source.
 * It never calls Supabase or writes to a live business.
 * node scripts/platform-knowledge-build.mjs [root] [40-character commit SHA]
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=resolve(process.argv[2]||process.cwd());
const commit=String(process.argv[3]||process.env.GITHUB_SHA||'');
if(!/^[0-9a-f]{40}$/.test(commit))throw Error('A pinned 40-character Git SHA is required');
const scanner=resolve(root,'scripts/platform-intelligence-inventory.mjs');
if(!existsSync(scanner))throw Error('Source inventory scanner is missing');
const scan=spawnSync(process.execPath,[scanner,root],{encoding:'utf8',maxBuffer:30*1024*1024});
if(scan.status!==0)throw Error('Source inventory failed: '+scan.stderr.slice(0,800));
const inventory=JSON.parse(scan.stdout);
if(inventory.verification_status!=='IMPLEMENTED_UNVERIFIED')throw Error('Unexpected evidence status');
const capabilitySource=readFileSync(join(root,'assets/cj-journey-capabilities-v1.js'),'utf8');
const catalogBlock=capabilitySource.match(/const capabilities\s*=\s*\[([\s\S]*?)\]\.map\(/);
if(!catalogBlock)throw Error('Unable to locate capability catalog');
const nodes=new Map();
const edges=new Map();
const validId=s=>/^[a-z0-9:_./-]{3,160}$/.test(s);
const addNode=n=>{
 if(!validId(n.node_key))throw Error('Invalid node key '+n.node_key);
 if(nodes.has(n.node_key))return;
 nodes.set(n.node_key,n);
};
const edge=(from,to,type,evidence)=>{
 if(!nodes.has(from)||!nodes.has(to))throw Error('Missing edge endpoint');
 const e={from_node_key:from,to_node_key:to,relation_type:type,evidence};
 edges.set([from,to,type].join('|'),e);
};
const fromSource=(path,line=null)=>({source_path:path,source_line:line,verification:'SOURCE_ONLY'});
const pageIds=[];
for(const m of catalogBlock[1].matchAll(/\[\s*"([a-z0-9_-]+)"\s*,\s*"([^"]+)"\s*,\s*(?:"([^"]+)"|null)\s*\]/g)){
 const id=m[1],name=m[2],elementId=m[3]||null;
 const key='page:'+id;
 pageIds.push(id);
 addNode({node_key:key,node_kind:'page',name,description:'Application capability catalog entry',source_path:'assets/cj-journey-capabilities-v1.js',
  source_line:null,selector:elementId?'#'+elementId:null,navigation_target:null,required_roles:[],
  capability_status:'IMPLEMENTED_UNVERIFIED',verification_status:'UNVERIFIED',verified_at:null,
  evidence:fromSource('assets/cj-journey-capabilities-v1.js'),metadata:{catalog_id:id,element_id:elementId}});
}
if(pageIds.length<10)throw Error('Insufficient catalog entries; source format may have changed');
const matched=new Map();
const normalizedAction={
 boards:'smartboards',smartboards:'smartboards',journey:'journeys',journeys:'journeys',
 marketing:'marketing',analytics:'analytics',images:'creative',creative:'creative',
 accounts:'integrations',integrations:'integrations',team:'team',business:'business',account:'account'
};
for(const item of inventory.interactions){
 const key='interaction:'+item.interaction_id;
 addNode({node_key:key,node_kind:'interaction',name:item.label||item.data_action||item.element_id||item.tag,
  description:'Source-discovered candidate control; runtime visibility and action have not been tested',
  source_path:item.source_file,source_line:item.source_line,selector:item.selector,
  navigation_target:item.destination,required_roles:[],capability_status:'IMPLEMENTED_UNVERIFIED',
  verification_status:'UNVERIFIED',verified_at:null,
  evidence:fromSource(item.source_file,item.source_line),
  metadata:{element_id:item.element_id,data_action:item.data_action,action_type:item.action_type,handler_hint:item.handler_hint}});
 const mapped=normalizedAction[item.data_action]||item.data_action;
 if(mapped&&nodes.has('page:'+mapped)){
  matched.set(mapped,(matched.get(mapped)||0)+1);
  edge('page:'+mapped,key,'contains',fromSource(item.source_file,item.source_line));
 }
}
const backendSources=['assets/cj-journey-capabilities-v1.js','assets/cj-board-activation-wizard.js',
 'supabase/functions/journey-ai-chat/index.ts','supabase/functions/cj-agent-runtime/index.ts',
 'supabase/functions/cj-sales-command-center/index.ts'];
for(const path of backendSources){
 const full=join(root,path);if(!existsSync(full))continue;
 const content=readFileSync(full,'utf8');
 for(const m of content.matchAll(/\.rpc\(\s*["'` ](cj_[a-z0-9_]+)["'` ]/g)){
  const op=m[1],key='backend_operation:'+op;
  addNode({node_key:key,node_kind:'backend_operation',name:op,description:'RPC referenced in source; authorization and execution unverified',
   source_path:path,source_line:content.slice(0,m.index).split('\n').length,
   selector:null,navigation_target:null,required_roles:[],capability_status:'IMPLEMENTED_UNVERIFIED',
   verification_status:'UNVERIFIED',verified_at:null,evidence:fromSource(path),metadata:{operation_name:op}});
 }
}
const sortedNodes=[...nodes.values()].sort((a,b)=>a.node_key.localeCompare(b.node_key));
const sortedEdges=[...edges.values()].sort((a,b)=>[a.from_node_key,a.to_node_key,a.relation_type].join('|').localeCompare([b.from_node_key,b.to_node_key,b.relation_type].join('|')));
const payload={schema_version:1,environment:'staging',source_commit:commit,state:'STAGED',
 source_type:'static_source_inventory_only',verification_status:'UNVERIFIED',
 limitations:['No authenticated DOM inspection','No behavior, authorization or deployment verification','No production capability promotion'],
 counts:{pages:pageIds.length,source_controls:inventory.interactions.length,nodes:sortedNodes.length,edges:sortedEdges.length},
 nodes:sortedNodes,edges:sortedEdges};
const canonical=JSON.stringify(payload);
const artifact_sha256=createHash('sha256').update(canonical).digest('hex');
const result={...payload,artifact_sha256};
const out=resolve(process.env.CJ_KNOWLEDGE_OUTPUT||join(root,'artifacts/platform-intelligence/knowledge-staged.json'));
mkdirSync(resolve(out,'..'),{recursive:true});
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({artifact:out,artifact_sha256,...payload.counts,status:'STAGED'}));
