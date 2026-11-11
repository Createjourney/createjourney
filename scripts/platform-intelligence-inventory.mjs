#!/usr/bin/env node
/**
 * CreateJourney platform UI source inventory — static evidence only.
 * No network requests, no app execution, no private data collection.
 * Usage: node scripts/platform-intelligence-inventory.mjs [repository-root]
 *
 * Output is JSON on stdout. Every result is IMPLEMENTED_UNVERIFIED:
 * dynamic DOM, conditional rendering, permissions, navigation and live
 * execution must be independently reconciled by authenticated browser tests.
 */
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {resolve,relative,join,extname} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(process.argv[2]||process.cwd());
const ignored=new Set(['.git','node_modules','.next','dist','build','coverage','.cache']);
const supported=new Set(['.html','.htm','.js','.mjs','.ts','.tsx','.jsx']);
const entries=[];
const warnings=[];
const files=[];

function walk(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    if(entry.isDirectory()){if(!ignored.has(entry.name))walk(join(dir,entry.name));continue}
    if(entry.isFile()&&supported.has(extname(entry.name).toLowerCase()))files.push(join(dir,entry.name));
  }
}
function attributes(source){
  const out={};
  const re=/([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g;
  for(const match of source.matchAll(re)){
    const key=match[1].toLowerCase();
    if(!(key in out))out[key]=match[2]??match[3]??match[4]??'';
  }
  return out;
}
function clean(value,max=160){return String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
function record(file,tag,attrs,label,offset,source){
  const name=relative(root,file).replaceAll('\\','/');
  const line=source.slice(0,offset).split('\n').length;
  const selector=attrs.id?'#'+attrs.id:attrs['data-cjx-home-action']?'[data-cjx-home-action="'+attrs['data-cjx-home-action']+'"]':attrs['data-cjh-nav']?'[data-cjh-nav="'+attrs['data-cjh-nav']+'"]':null;
  const action=attrs.onclick?'inline_handler':attrs.href?'link_navigation':attrs.type==='submit'?'form_submit':tag==='input'?'input':tag==='select'?'selection':tag==='textarea'?'text_entry':'unknown';
  const stableKey=[name,line,tag,attrs.id||'',attrs.name||'',label].join('|');
  entries.push({
    interaction_id:'cj-src-'+createHash('sha256').update(stableKey).digest('hex').slice(0,20),
    source_file:name,source_line:line,tag,
    element_id:attrs.id||null,selector,
    label:clean(attrs['aria-label']||attrs.title||label)||null,
    action_type:action,
    destination:attrs.href&&/^(\/|https?:)/.test(attrs.href)?attrs.href:null,
    handler_hint:attrs.onclick?clean(attrs.onclick,200):null,
    data_action:attrs['data-cjx-home-action']||attrs['data-cjh-nav']||attrs['data-cjs-launch']||null,
    evidence:'SOURCE_MARKUP_ONLY',
    current_status:'IMPLEMENTED_UNVERIFIED'
  });
}
walk(root);
const tagPattern=/<(button|a|input|select|textarea|summary|details)\b([^<>]*?)>/gi;
for(const file of files){
  try{
    if(statSync(file).size>12*1024*1024){warnings.push('Skipped oversize file: '+relative(root,file));continue}
    const source=readFileSync(file,'utf8');
    for(const match of source.matchAll(tagPattern)){
      const tag=match[1].toLowerCase();
      const attrs=attributes(match[2]);
      // Exclude script string fragments that do not resemble controls where possible.
      const body=(tag==='button'||tag==='a'||tag==='summary')?source.slice((match.index||0)+match[0].length).split(/<\/\s*(?:button|a|summary)\s*>/i,1)[0].slice(0,300):'';
      record(file,tag,attrs,body,match.index||0,source);
    }
  }catch(err){warnings.push('Unable to inspect '+relative(root,file)+': '+String(err.message||err))}
}
entries.sort((a,b)=>a.source_file.localeCompare(b.source_file)||a.source_line-b.source_line||a.interaction_id.localeCompare(b.interaction_id));
process.stdout.write(JSON.stringify({
 schema_version:1,
 method:'static_source_markup_scan',
 verification_status:'IMPLEMENTED_UNVERIFIED',
 limitations:[
  'Source markup is not a rendered interface; JavaScript strings may be counted as controls.',
  'Dynamically generated controls may be missing.',
  'Unlabeled, conditionally rendered, or role-gated controls require browser reconciliation.',
  'No authorization, backend, navigation, or mobile interaction has been verified.'
 ],
 scanned_source_files:files.length,
 detected_interactions:entries.length,
 warnings,
 interactions:entries
},null,2)+'\n');
