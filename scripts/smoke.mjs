import assert from 'node:assert/strict';
import { defaults, products, personas, cartOutcome, evaluateShopper, failureTypes } from '../app/shared.js';

const product=products[0];
const deal=personas.find(persona=>persona.id==='deal');
const control=evaluateShopper(deal,product,'A',defaults);
const challenger=evaluateShopper(deal,product,'B',defaults);
assert.equal(control.pass,true,'healthy control keeps the discount');
assert.equal(challenger.pass,false,'challenger catches the dropped discount');
assert.equal(control.outcome.discount,37.8,'20% of the $189 product applies');
assert.equal(challenger.outcome.discount,0,'discount bug removes the offer');

for(const failure of failureTypes){
  const config=structuredClone(defaults);
  for(const id of Object.keys(config.failures))config.failures[id]=false;
  config.failures[failure.id]=true;
  const affected=personas.filter(persona=>persona.checks.includes(failure.id));
  assert.ok(affected.length>0,`${failure.id} has an assigned shopper`);
  assert.ok(affected.some(persona=>products.some(item=>!evaluateShopper(persona,item,'B',config).pass)),`${failure.id} can be detected`);
  assert.ok(affected.every(persona=>evaluateShopper(persona,product,'A',config).pass),`${failure.id} leaves control healthy`);
}

const repaired=structuredClone(defaults);
repaired.failures.discountBreak=false;
assert.equal(evaluateShopper(deal,product,'B',repaired).pass,true,'repair makes challenger pass');
assert.equal(cartOutcome(product,'B',repaired).discount,37.8);
console.log('Core store contract verified: control, broken discount, all seven probes, repair.');
