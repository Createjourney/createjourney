import {test,expect} from '@playwright/test';

test('sales center appears in Marketing and reports blocked capability honestly',async({page})=>{
 await page.goto('http://127.0.0.1:8765/tests/fixtures/sales-center.html');
 const launch=page.getByRole('button',{name:'Autonomous Sales — Launch Readiness'});
 await expect(launch).toBeVisible();
 await launch.click();
 await expect(page.getByRole('dialog',{name:'Autonomous Sales Command Center'})).toBeVisible();
 await expect(page.getByText('Sales launch status: BLOCKED')).toBeVisible();
 await expect(page.getByText('Meta', {exact:false})).toBeVisible();
 await expect(page.getByText(/External execution: NOT VERIFIED/)).toBeVisible();
 const events=await page.evaluate(()=>window.__cjRequests);
 expect(events.some(e=>e.action==='overview')).toBeTruthy();
 expect(events.some(e=>['approve','pause'].includes(e.action))).toBeFalsy();
});
test('draft campaign creation cannot authorize external spending',async({page})=>{
 await page.goto('http://127.0.0.1:8765/tests/fixtures/sales-center.html');
 await page.getByRole('button',{name:'Autonomous Sales — Launch Readiness'}).click();
 await page.getByLabel('Campaign name').fill('CI Holiday Frame');
 await page.getByLabel('Product', {exact:true}).fill('Premium Display Frame');
 await page.getByLabel('Product URL (HTTPS)').fill('https://example.com/products/frame');
 await page.getByLabel('Sale price (USD)').fill('299');
 await page.getByLabel('Regular price (USD)').fill('340');
 await page.getByLabel('Initial order target').fill('100');
 await page.getByLabel('Maximum daily advertising (USD)').fill('10');
 await page.getByLabel('Daily prospect research goal').fill('120');
 await page.getByRole('button',{name:'Save draft — no sales actions'}).click();
 await expect.poll(async()=>{
   const requests=await page.evaluate(()=>window.__cjRequests);
   return requests.filter(e=>e.action==='create').length;
 }).toBe(1);
 const created=await page.evaluate(()=>window.__cjRequests.find(e=>e.action==='create'));
 expect(created.campaign.daily_ad_cap_cents).toBe(1000);
 expect(created.campaign.sale_price_cents).toBe(29900);
 expect(created.campaign.daily_research_target).toBe(120);
 expect(created.campaign.delivery_guaranteed).toBeUndefined();
});
