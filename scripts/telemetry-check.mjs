import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createTelemetryStore } from '../telemetry.mjs';
import { parseKaneEvents } from '../app/kane-report.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'k9-telemetry-'));
try {
  const store = createTelemetryStore(path.join(directory, 'events.jsonl'));
  const base = {sessionId:'shop_test_123',source:'simulated',variant:'B',personaId:'Deal Hunter',productId:'headphones',pageUrl:'/store.html?variant=B',element:'#cartFooter',detail:'discount',step:0};
  await store.append([
    {...base,eventType:'claim_view',timestamp:'2026-10-24T15:19:59.999Z'},
    {...base,eventType:'claim_mismatch',timestamp:'2026-10-24T15:20:00.123Z',step:1},
    {...base,eventType:'claim_mismatch',timestamp:'2026-10-24T15:25:00.123Z',step:2}
  ]);
  const report = await store.report({startTime:'2026-10-24T15:20:00.000Z',endTime:'2026-10-24T15:25:00.123Z',source:'simulated',bucketMinutes:5});
  assert.equal(report.totalEvents,2,'range includes precise start/end bounds');
  assert.equal(report.counts.claim_mismatch,2);
  assert.equal(report.buckets.length,2,'events group into chronological five-minute windows');
  assert.equal(report.hotspots[0].count,2);
  assert.equal((await store.session('shop_test_123')).length,3,'session retains complete timeline');
  await store.append([
    {...base,sessionId:'store_test_1',source:'observed_store',eventType:'cart_open',timestamp:'2026-10-24T15:21:00.000Z'},
    {...base,sessionId:'store_test_1',source:'observed_store',eventType:'dead_click',timestamp:'2026-10-24T15:21:00.700Z'},
    {...base,sessionId:'store_test_2',source:'observed_store',eventType:'dead_click',timestamp:'2026-10-24T15:22:00.000Z'}
  ]);
  const observed = await store.report({startTime:'2026-10-24T15:20:00.000Z',endTime:'2026-10-24T15:25:00.123Z',source:'observed_store',bucketMinutes:5});
  assert.equal(observed.counts.dead_click,1,'corroborated cart actions suppress false dead clicks');
  await store.append([
    {...base,sessionId:'store_order_1',source:'observed_store',variant:'A',eventType:'add_to_cart',value:151.2,timestamp:'2026-10-24T15:23:00.000Z'},
    {...base,sessionId:'store_order_1',source:'observed_store',variant:'A',eventType:'order_placed',value:151.2,timestamp:'2026-10-24T15:23:05.000Z'},
    {...base,sessionId:'store_order_2',source:'observed_store',variant:'B',eventType:'add_to_cart',value:189,timestamp:'2026-10-24T15:23:10.000Z'},
    {...base,sessionId:'shop_short_1',eventType:'claim_mismatch',value:37.8,timestamp:'2026-10-24T15:23:20.000Z'},
    {...base,sessionId:'shop_kept_1',variant:'A',eventType:'claim_match',value:'not-a-number',timestamp:'2026-10-24T15:23:30.000Z'}
  ]);
  const { metrics } = await store.report({startTime:'2026-10-24T15:20:00.000Z',endTime:'2026-10-24T15:25:00.123Z',bucketMinutes:5});
  assert.equal(metrics.all.funnel.ordered,1,'orders come from real store sessions');
  assert.equal(metrics.all.cartAbandonmentRate,0.5,'one of two store bags became an order');
  assert.equal(metrics.A.averageOrderValue,151.2);
  assert.equal(metrics.B.conversionRate,0,'challenger store session did not order');
  assert.equal(metrics.all.discountShortfall,37.8,'only mismatches that carry a value add to the missed discount');
  assert.equal(metrics.A.promiseKeptRate,1,'non-numeric values are dropped rather than counted');
  assert.equal(metrics.topProducts[0].productId,'headphones');
  await assert.rejects(store.report({startTime:'2026-10-24T15:25:00.000Z',endTime:'2026-10-24T15:20:00.000Z'}),/Invalid time range/);
  const kane = parseKaneEvents('noise\n'+JSON.stringify({type:'stream_start',surface:'run',ts:'2026-10-24T15:20:00.000Z'})+'\n'+JSON.stringify({step:1,status:'done',remark:'Opened store',ts:'2026-10-24T15:20:01.000Z'})+'\n'+JSON.stringify({step:2,status:'failed',remark:'Discount missing',ts:'2026-10-24T15:20:02.000Z'})+'\n'+JSON.stringify({type:'run_end',status:'failed',summary:'Offer failed',duration:2}));
  assert.equal(kane.status,'failed');
  assert.equal(kane.steps.length,2);
  assert.equal(kane.steps[1].remark,'Discount missing');
  console.log('Telemetry range, bucketing, session, merchant metrics, and Kane event parsing verified.');
} finally { await rm(directory,{recursive:true,force:true}); }
