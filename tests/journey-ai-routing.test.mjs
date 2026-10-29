import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
test('all inline scripts parse without JavaScript syntax errors',()=>{
  assert.ok(scripts.length>=30,'expected complete CreateJourney page');
  for(let i=0;i<scripts.length;i++){
    const code=scripts[i][2];
    if(code.trim())assert.doesNotThrow(()=>new vm.Script(code,{filename:'index.html:inline-'+i}), 'inline script '+i+' failed');
  }
});

function extract(begin,end){
  const a=html.indexOf(begin),b=html.indexOf(end,a+begin.length);
  assert.ok(a>=0&&b>a,'missing source range '+begin);
  return html.slice(a,b);
}
const router=extract('function isImageOrCreativeExecution(q){','function defaultOptions(){');
const sandbox={
  clean:v=>String(v??'').trim(),
  lower:v=>String(v??'').trim().toLowerCase(),
  window:{CJ_CHAT_ATTACHMENTS:[]}
};
vm.runInNewContext(router,sandbox);
const cases=[
  ['Inspect My Board and explain what Apply would change. Do not make changes.',true],
  ['Explain the pending proposal before applying',true],
  ['What happens if I change my board Journey?',true],
  ['Compare my board Journey with Website Specialist recommendations',true],
  ['Set up My Board',true],
  ['Can you set up My Board?',true],
  ['Review changes before I apply them',true],
  ['Change My Board Journey to Website',false],
  ['Please set My Board Journey to Pay Review Book',false],
  ['Pause My Board',false],
  ['Rename My Board to Front Desk',false],
  ['Update My Board Review destination to https://example.com',false],
  ['Open dashboard',false]
];
test('questions and ambiguous setup never enter legacy mutation parser',()=>{
  for(const [prompt,expected] of cases){
    assert.equal(sandbox.shouldHandle(prompt),expected,prompt);
  }
});

test('pending Apply proposal is represented as read-only, with current and proposed Journey',()=>{
  const fn=extract('function pendingProposalSnapshot(){','function buildContext(){');
  const context={
    aiPendingAction:{type:'journey',boardId:'CJ-000001',actions:['Website']},
    boards:[{id:'CJ-000001',name:'My Board',actions:['Pay','Review','Book'],active:true,destinations:{}}],
    safeArray:v=>Array.isArray(v)?v:[],
    window:{}
  };
  vm.runInNewContext(fn,context);
  const snapshot=context.pendingProposalSnapshot();
  assert.equal(snapshot.state,'pending_local_approval');
  assert.deepEqual(Array.from(snapshot.affected_boards[0].current_journey),['Pay','Review','Book']);
  assert.deepEqual(Array.from(snapshot.affected_boards[0].proposed_journey),['Website']);
  assert.equal(snapshot.affected_boards[0].journey_changes,true);
  assert.match(snapshot.warning,/not been applied/i);
});

test('stale Apply and Cancel buttons are bound to their original action',()=>{
  const body=extract('function addAiMessage(type,text,proposal=null,voiceReply=false){','function numberWordsToDigits(');
  assert.match(body,/const cardAction=proposal\?aiPendingAction:null/);
  assert.match(body,/aiPendingAction!==cardAction/);
  assert.match(body,/aiPendingAction===cardAction/);
  assert.match(html,/No changes applied\. The selected board Journey is already configured that way/);
});
