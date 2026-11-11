import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
// Public anonymous-denial probes ONLY. Does not use credentials or test a real board.
// This is a gateway smoke test; it does not prove user-level tenant isolation.
const base='https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1';
const protectedSlugs=['journey-ai-session','journey-ai-actions','journey-ai-chat','journey-board-actions','journey-ai-vision','journey-billing','journey-owner-data','journey-integrations','journey-ai-optimizer','journey-ai-research','journey-ai-optimization-actions','journey-optimization-actions','journey-ai-experiments','journey-ai-execution','journey-growth-performance','cj-agent-runtime','journey-ai-capabilities','cj-sales-command-center'];
const results=[];
for(const slug of protectedSlugs){
 try{
  const r=await fetch(base+'/'+slug,{method:'POST',headers:{'content-type':'application/json'},body:'{"action":"capabilities"}',signal:AbortSignal.timeout(15000)});
  results.push({slug,http_status:r.status,anonymous_rejected:[401,403].includes(r.status),note:'Anonymous-only test; never proves tenant isolation'});
 }catch(e){results.push({slug,http_status:null,anonymous_rejected:false,error:String(e.message||e).slice(0,120)})}
}
const outdir=resolve('artifacts/platform-intelligence');mkdirSync(outdir,{recursive:true});
writeFileSync(join(outdir,'unauthenticated-probes.json'),JSON.stringify({checked_at:new Date().toISOString(),evidence:'UNAUTHENTICATED_ONLY',results},null,2)+'\n');
console.log(JSON.stringify({tested:results.length,denied:results.filter(x=>x.anonymous_rejected).length,unexpected:results.filter(x=>!x.anonymous_rejected).map(x=>({slug:x.slug,status:x.http_status,error:x.error}))}));
