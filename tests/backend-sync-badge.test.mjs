import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

test("SmartBoard backend badge renders untrusted cloud messages as literal text",()=>{
 const s=readFileSync("index.html","utf8");
 const first=s.indexOf("function cj27SetBackendBadge(");
 const last=s.indexOf("async function cjSyncNormalizedBackendV27(",first);
 assert.ok(first>=0&&last>first,"Backend badge function missing");
 const fragment=s.slice(first,last);
 assert.ok(!fragment.includes("n.innerHTML"),"Dynamic content must not use innerHTML");
 assert.ok(!fragment.includes("esc("),"Undefined escape helper must not be used");
 let created=null;
 const host={appendChild(el){created=el}};
 const newElement=tag=>({tag,className:"",textContent:"",children:[],
  replaceChildren(...children){this.children=children}});
 const document={
  getElementById(id){if(id==="cj26Command")return host;if(id==="cj27CloudNote")return created;return null},
  querySelector(){return null},
  createElement:newElement
 };
 const sandbox={document};
 vm.runInNewContext(fragment,sandbox);
 const dangerous='<img src=x onerror=alert(1)> & "unsafe"';
 sandbox.cj27SetBackendBadge(false,dangerous);
 assert.equal(created.children.length,2);
 assert.equal(created.children[0].className,"cj27-cloud-dot bad");
 assert.equal(created.children[1].textContent,dangerous);
 sandbox.cj27SetBackendBadge(true,"Connected");
 assert.equal(created.children[0].className,"cj27-cloud-dot good");
 assert.equal(created.children[1].textContent,"Connected");
});
