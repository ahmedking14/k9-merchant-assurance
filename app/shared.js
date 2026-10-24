export const products = [
  { id:'headphones', name:'Halo Wireless Headphones', category:'PERSONAL AUDIO', price:189, image:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1800&q=88', detail:'Immersive sound. Everyday quiet.' },
  { id:'speaker', name:'Pulse Portable Speaker', category:'HOME AUDIO', price:129, image:'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1800&q=88', detail:'Big sound, small footprint.' },
  { id:'watch', name:'Orbit Smartwatch', category:'WEARABLES', price:219, image:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1800&q=88', detail:'A clearer view of every day.' },
  { id:'camera', name:'Pocket Digital Camera', category:'CAMERAS', price:249, image:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1800&q=88', detail:'The moments you keep.' }
];

export const personas = [
  { id:'deal', name:'The Deal Hunter', icon:'◈', initials:'DH', blurb:'Knows the advertised price and will abandon a cart when the math changes.', goal:'20% first-order offer', defaultProduct:'headphones', checks:['discountBreak','couponEligibility'] },
  { id:'budget', name:'The Budget Guardian', icon:'◎', initials:'BG', blurb:'Has a hard spending cap and notices every price shift between shelf and cart.', goal:'Price stays put', defaultProduct:'speaker', checks:['dynamicPricing','discountBreak'] },
  { id:'gift', name:'The Gift Giver', icon:'✳', initials:'GG', blurb:'Plans around delivery and returns, especially when buying for someone else.', goal:'Shipping and returns', defaultProduct:'watch', checks:['shippingThreshold','returnPolicy'] },
  { id:'research', name:'The Spec Reader', icon:'▧', initials:'SR', blurb:'Reads every product claim, warranty detail, and availability badge.', goal:'Copy and stock truth', defaultProduct:'camera', checks:['copyDrift','stockMismatch'] },
  { id:'first', name:'The First Timer', icon:'✻', initials:'FT', blurb:'Trusts the welcome offer and needs an easy, predictable first purchase.', goal:'Clear final total', defaultProduct:'headphones', checks:['discountBreak','shippingThreshold','couponEligibility'] }
];

export const failureTypes = [
  { id:'discountBreak', name:'Discount disappears in cart', detail:'The first-order offer is visible but not applied.', category:'PROMOTION' },
  { id:'dynamicPricing', name:'Dynamic pricing surprise', detail:'Cart price rises after product selection.', category:'PRICING' },
  { id:'shippingThreshold', name:'Shipping threshold shifts', detail:'Free delivery requires more than advertised.', category:'SHIPPING' },
  { id:'copyDrift', name:'Marketing copy drifts', detail:'Warranty claim changes before checkout.', category:'COPY' },
  { id:'stockMismatch', name:'Stock status contradicts', detail:'An in-stock item becomes unavailable in cart.', category:'INVENTORY' },
  { id:'couponEligibility', name:'Offer excludes products', detail:'A hidden eligibility rule blocks the offer.', category:'PROMOTION' },
  { id:'returnPolicy', name:'Return window shrinks', detail:'The return period changes in checkout.', category:'POLICY' }
];

export const defaults = {
  offerCopy:'Take 20% off your first order.',
  heroCopy:'Better tech, less noise. Your first order starts with 20% off.',
  variantCopy:'Two-year warranty on every object.',
  discount:20,
  freeShipping:100,
  priceShift:12,
  swarmSize:5,
  failures:{ discountBreak:false, dynamicPricing:false, shippingThreshold:false, copyDrift:false, stockMismatch:false, couponEligibility:false, returnPolicy:false }
};

export const money = value => `$${Number(value).toFixed(2)}`;
const configVersion = 2;

export function extractClaims(config,variant='A'){
  const discountPercent=Number(config.offerCopy.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? config.discount);
  const warrantyText=variant==='B'?config.variantCopy:'Two-year warranty';
  const warrantyYears=/\b(?:one|1)[ -]?year\b/i.test(warrantyText)?1:/\b(?:two|2)[ -]?year\b/i.test(warrantyText)?2:2;
  return {discountPercent,freeShippingThreshold:Number(config.freeShipping),warrantyYears,returnDays:30};
}

export function loadConfig(){
  try {
    const saved=JSON.parse(localStorage.getItem('swarm-store-config')||'null');
    if(!saved)return structuredClone(defaults);
    const config={...defaults,...saved,failures:{...defaults.failures,...saved.failures}};
    if(saved.configVersion!==configVersion){
      config.failures.discountBreak=false;
      config.configVersion=configVersion;
      localStorage.setItem('swarm-store-config',JSON.stringify(config));
      localStorage.removeItem('swarm-last-run');
    }
    return config;
  }
  catch { return structuredClone(defaults); }
}

export function storeConfig(config){ localStorage.setItem('swarm-store-config',JSON.stringify({...config,configVersion})); }

export function cartOutcome(product, variant, config){
  const active = variant === 'B' ? config.failures : {};
  const shelfPrice = product.price;
  const cartPrice = active.dynamicPricing ? Math.round(shelfPrice*(1+Number(config.priceShift)/100)*100)/100 : shelfPrice;
  const discountEligible = !active.couponEligibility || product.id === 'headphones';
  const discount = active.discountBreak || !discountEligible ? 0 : Math.round(cartPrice*Number(config.discount))/100;
  const shippingThreshold = Number(config.freeShipping)+(active.shippingThreshold?50:0);
  const shipping = cartPrice-discount >= shippingThreshold ? 0 : 12;
  return { shelfPrice, cartPrice, discount, shipping, total:Math.round((cartPrice-discount+shipping)*100)/100, shippingThreshold, inStock:!active.stockMismatch, warrantyYears:active.copyDrift?1:2, returnDays:active.returnPolicy?14:30, discountEligible };
}

export function evaluateShopper(persona, product, variant, config){
  const outcome=cartOutcome(product,variant,config);
  const active=variant==='B'?config.failures:{};
  const checks=[];
  const claims=extractClaims(config,variant);
  const printedRate=claims.discountPercent;
  const expectedDiscount=Math.round(outcome.cartPrice*printedRate)/100;
  if(persona.checks.includes('discountBreak')) checks.push({name:'Promised discount',pass:Math.abs(outcome.discount-expectedDiscount)<0.01,detail:Math.abs(outcome.discount-expectedDiscount)<0.01?`${printedRate}% applied`:`Claimed ${printedRate}%, received ${money(outcome.discount)} off`});
  if(persona.checks.includes('couponEligibility') && active.couponEligibility) checks.push({name:'Offer eligibility',pass:outcome.discountEligible,detail:outcome.discountEligible?'Product eligible':'Hidden exclusion'});
  if(persona.checks.includes('dynamicPricing')) checks.push({name:'Price consistency',pass:outcome.cartPrice===outcome.shelfPrice,detail:outcome.cartPrice===outcome.shelfPrice?'Shelf price held':`${money(outcome.shelfPrice)} became ${money(outcome.cartPrice)}`});
  if(persona.checks.includes('shippingThreshold')) checks.push({name:'Free shipping',pass:outcome.shippingThreshold===claims.freeShippingThreshold,detail:outcome.shippingThreshold===claims.freeShippingThreshold?'Threshold held':`Threshold moved to ${money(outcome.shippingThreshold)}`});
  if(persona.checks.includes('returnPolicy')) checks.push({name:'Return promise',pass:outcome.returnDays===claims.returnDays,detail:`${outcome.returnDays}-day returns at checkout`});
  if(persona.checks.includes('copyDrift')){
    checks.push({name:'Warranty copy',pass:outcome.warrantyYears===claims.warrantyYears,detail:`Claimed ${claims.warrantyYears} years, checkout shows ${outcome.warrantyYears}`});
  }
  if(persona.checks.includes('stockMismatch')) checks.push({name:'Availability',pass:outcome.inStock,detail:outcome.inStock?'In stock':'Sold out in cart'});
  return {personaId:persona.id, productId:product.id, variant, pass:checks.every(check=>check.pass), checks, outcome};
}
