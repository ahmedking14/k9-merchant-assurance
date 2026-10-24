import assert from 'node:assert/strict';
import { defaults, products, personas, cartOutcome, evaluateShopper, failureTypes } from '../app/shared.js';

const product=products[0];
const deal=personas.find(persona=>persona.id==='deal');
const control=evaluateShopper(deal,product,'A',defaults);
const challenger=evaluateShopper(deal,product,'B',defaults);
assert.equal(control.pass,true,'healthy control keeps the discount');
assert.equal(challenger.pass,true,'repaired challenger keeps the discount');
assert.equal(control.outcome.discount,37.8,'20% of the $189 product applies');
assert.equal(challenger.outcome.discount,37.8,'repaired challenger applies the offer');

for(const failure of failureTypes){
  const config=structuredClone(defaults);
  for(const id of Object.keys(config.failures))config.failures[id]=false;
  config.failures[failure.id]=true;
  const affected=personas.filter(persona=>persona.checks.includes(failure.id));
  assert.ok(affected.length>0,`${failure.id} has an assigned shopper`);
  assert.ok(affected.some(persona=>products.some(item=>!evaluateShopper(persona,item,'B',config).pass)),`${failure.id} can be detected`);
  assert.ok(affected.every(persona=>evaluateShopper(persona,product,'A',config).pass),`${failure.id} leaves control healthy`);
}

const broken=structuredClone(defaults);
broken.failures.discountBreak=true;
assert.equal(evaluateShopper(deal,product,'B',broken).pass,false,'fault injection reproduces the missing offer');
assert.equal(cartOutcome(product,'B',broken).discount,0);
const changedCopy=structuredClone(defaults);
changedCopy.offerCopy='Take 25% off your first order.';
assert.equal(evaluateShopper(deal,product,'A',changedCopy).pass,false,'marketing copy change exposes a stale discount rule');
const changedWarranty=structuredClone(defaults);
changedWarranty.failures.discountBreak=false;
changedWarranty.failures.copyDrift=true;
changedWarranty.variantCopy='One-year warranty on every object.';
const researcher=personas.find(persona=>persona.id==='research');
assert.equal(evaluateShopper(researcher,products[3],'B',changedWarranty).pass,true,'warranty copy and checkout can agree after a copy change');
console.log('Core store contract verified: repaired A/B default, injectable discount failure, all seven probes.');
