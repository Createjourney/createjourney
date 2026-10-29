import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.CJJourneyPartner?.shouldHandle==='function',{timeout:20000});
});

test('inspection request is sent to authenticated Journey AI without Apply card',async({page})=>{
  const result=await page.evaluate(()=>{
    window.__routingCaptured=null;
    window.CJJourneyPartnerAsk=(prompt)=>{window.__routingCaptured=prompt;return true};
    const before=document.querySelectorAll('#aiThread .ai-proposal').length;
    window.handleAiPrompt('Inspect My Board and explain what clicking Apply would change. Do not make changes.');
    return {captured:window.__routingCaptured, before,after:document.querySelectorAll('#aiThread .ai-proposal').length};
  });
  expect(result.captured).toContain('Inspect My Board');
  expect(result.after).toBe(result.before);
});

test('stale Apply card cannot execute a newer pending action',async({page})=>{
  const result=await page.evaluate(()=>{
    const first={type:'journey',boardId:'smoke-test',actions:['Website']};
    const second={type:'journey',boardId:'smoke-test',actions:['Pay','Review','Book']};
    aiPendingAction=first;
    addAiMessage('ai','Smoke test proposed action',{title:'Smoke test proposal',detail:'No action should execute'});
    const apply=[...document.querySelectorAll('#aiThread .ai-proposal .ai-apply')].at(-1);
    aiPendingAction=second;
    apply.click();
    const unchanged=aiPendingAction===second;
    const disabled=apply.disabled;
    aiPendingAction=null;
    return {unchanged,disabled};
  });
  expect(result.unchanged).toBe(true);
  expect(result.disabled).toBe(true);
});

test('pending proposal context accurately compares current and proposed Journeys',async({page})=>{
  const result=await page.evaluate(()=>{
    const testBoard={id:'CJ-TEST-ROUTING',name:'Routing Test Board',actions:['Pay','Review','Book'],active:true,destinations:{}};
    boards.push(testBoard);
    aiPendingAction={type:'journey',boardId:testBoard.id,actions:['Website']};
    const context=window.CJJourneyPartner.context();
    aiPendingAction=null;
    boards.splice(boards.indexOf(testBoard),1);
    return context.pending_proposal;
  });
  expect(result.state).toBe('pending_local_approval');
  expect(result.affected_boards[0].current_journey).toEqual(['Pay','Review','Book']);
  expect(result.affected_boards[0].proposed_journey).toEqual(['Website']);
  expect(result.affected_boards[0].journey_changes).toBe(true);
});

test('current Apply delegates to the cloud approval bridge exactly once',async({page})=>{
  const result=await page.evaluate(()=>{
    const original=window.applyAiPending;
    let calls=0;
    window.applyAiPending=()=>{calls++;aiPendingAction=null;return Promise.resolve()};
    aiPendingAction={type:'journey',boardId:'smoke-test',actions:['Website']};
    window.addAiMessage('ai','Current proposal smoke test',{title:'Current proposal',detail:'Test backend delegation'});
    const button=[...document.querySelectorAll('#aiThread .ai-proposal .ai-apply')].at(-1);
    button.click();
    const disabled=button.disabled;
    window.applyAiPending=original;
    return {calls,disabled};
  });
  expect(result.calls).toBe(1);
  expect(result.disabled).toBe(true);
});

test('stale Cancel does not discard a newer proposal',async({page})=>{
  const result=await page.evaluate(()=>{
    const first={type:'journey',boardId:'smoke-test',actions:['Website']};
    const second={type:'status',boardId:'smoke-test',active:true};
    aiPendingAction=first;
    window.addAiMessage('ai','Stale cancel smoke test',{title:'Old proposal',detail:'Must not cancel new proposal'});
    const cancel=[...document.querySelectorAll('#aiThread .ai-proposal .ai-cancel')].at(-1);
    aiPendingAction=second;
    cancel.click();
    const preserved=aiPendingAction===second;
    aiPendingAction=null;
    return {preserved,disabled:cancel.disabled};
  });
  expect(result.preserved).toBe(true);
  expect(result.disabled).toBe(true);
});
