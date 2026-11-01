/* Journey AI application capability registry — foundation only.
   Actions stay permission-gated; this module does not grant backend access. */
(function(){
"use strict";
if(window.CJJourneyCapabilities)return;
const capabilities=[
["home","Business Command Center","dashboardApp"],
["smartboards","SmartBoard Management","boardLibraryApp"],
["journeys","Journey Editor","journeyLibraryApp"],
["analytics","Business Analytics","aiWorkspaceIntelligencePanel"],
["marketing","Marketing Center","aiWorkspaceMarketingPanel"],
["creative","Creative Studio","aiWorkspaceLibraryPanel"],
["integrations","Connected Accounts","connectedAccountsApp"],
["team","Team & Access","teamManagerApp"],
["business","Business Profile","journeyAiSetupApp"],
["account","Account & Workspace","accountPanel"],
["explore","Explore",null],
["assistant","Journey AI","journeyAiPanel"]
].map(function(v){return Object.freeze({id:v[0],name:v[1],elementId:v[2]})});
let last={page:"home",action:"",timestamp:Date.now()};
document.addEventListener("click",function(e){
const b=e.target.closest&&e.target.closest("button,[role=button]");
if(!b)return;
const name=b.getAttribute("data-cjx-home-action")||b.getAttribute("data-cjh-nav")||b.getAttribute("data-ai-workspace-tab")||b.id||"button";
last={page:name,action:b.id||name,timestamp:Date.now()};
window.dispatchEvent(new CustomEvent("cj:journey-context",{detail:last}));
},true);
window.CJJourneyCapabilities=Object.freeze({
version:"1.0",catalog:Object.freeze(capabilities),
context:function(){return Object.assign({},last)},
lookup:function(id){return capabilities.find(function(x){return x.id===id})||null}
});
})();