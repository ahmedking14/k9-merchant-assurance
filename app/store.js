import { products, loadConfig, cartOutcome, extractClaims, money } from './shared.js';

const config=loadConfig();
const variant=new URLSearchParams(location.search).get('variant')==='B'?'B':'A';
const $=selector=>document.querySelector(selector);
let cartProduct=null;
let ordered=false;
const telemetrySession=sessionStorage.getItem('k9-store-session')||crypto.randomUUID();
sessionStorage.setItem('k9-store-session',telemetrySession);
let telemetryStep=0;
const recentClicks=[];
const recentScrolls=[];
let lastScrollY=window.scrollY;
let lastScrollAlert=0;
let mutationCount=0;
new MutationObserver(()=>mutationCount++).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-hidden','hidden','disabled'],characterData:true});
function targetName(element){
  const target=element.closest('button,a');
  if(!target)return '';
  return target.id ? '#'+target.id : target.dataset.add ? `[data-add="${target.dataset.add}"]` : target.getAttribute('href') || target.tagName.toLowerCase();
}
function emitTelemetry(eventType,element='',detail=''){
  const event={sessionId:telemetrySession,source:'observed_store',variant,personaId:'',productId:cartProduct?.id||'',eventType,element,pageUrl:location.pathname+location.search+location.hash,detail,timestamp:new Date().toISOString(),step:telemetryStep++};
  fetch('/api/telemetry/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:[event]}),keepalive:true}).catch(()=>{});
}
document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');
  if(!target)return;
  const element=targetName(target);
  const now=Date.now();
  emitTelemetry('click',element,target.textContent.trim().slice(0,80));
  recentClicks.push({element,time:now});
  while(recentClicks.length && now-recentClicks[0].time>900)recentClicks.shift();
  if(recentClicks.filter(item=>item.element===element).length===3)emitTelemetry('rage_click',element,'Three clicks on one target within 900 ms');
  if(target.tagName==='BUTTON' && !target.disabled && !event.k9Handled){
    const before=mutationCount, url=location.href, scroll=window.scrollY;
    setTimeout(()=>{if(before===mutationCount && url===location.href && Math.abs(scroll-window.scrollY)<4)emitTelemetry('dead_click',element,'Click caused no detected DOM, URL, or scroll change within 700 ms');},700);
  }
});
document.addEventListener('pointerup',event=>{const target=event.target.closest('button,.shop-button,.newsletter a');if(!target||target.disabled)return;target.classList.remove('settle-pulse');void target.offsetWidth;target.classList.add('settle-pulse');setTimeout(()=>target.classList.remove('settle-pulse'),450)});
window.addEventListener('scroll',()=>{
  const now=Date.now(), delta=Math.abs(window.scrollY-lastScrollY);
  lastScrollY=window.scrollY;
  recentScrolls.push({time:now,delta});
  while(recentScrolls.length && now-recentScrolls[0].time>5000)recentScrolls.shift();
  if(now-lastScrollAlert>10000 && recentScrolls.reduce((sum,item)=>sum+item.delta,0)>1800){
    lastScrollAlert=now;
    emitTelemetry('excessive_scroll','window', 'More than 1800 px travelled in 5 seconds');
  }
},{passive:true});
emitTelemetry('page_view','document','Demo storefront loaded');

const claims=extractClaims(config,variant);
const offerCode=`FIRST${Number(config.discount)}`;
$('#announcement').innerHTML=`${claims.discountPercent}% OFF YOUR FIRST ORDER <span>·</span> AUTOMATICALLY APPLIED IN YOUR BAG <span>·</span> FREE SHIPPING OVER ${money(config.freeShipping)}`;
$('#offerCopy').textContent=config.offerCopy;
$('#heroCopy').textContent=config.heroCopy;
$('#variantBadge').textContent=variant==='B'?'CHALLENGER B':'CONTROL A';
$('#variantBadge').classList.toggle('b',variant==='B');
if(variant==='B')document.querySelector('.value-strip strong').textContent=config.variantCopy;
document.querySelector('.value-strip>div:first-child p').textContent='Check your warranty terms again in the shopping bag.';
document.querySelector('.value-strip>div:last-child strong').textContent=`Free shipping over ${money(config.freeShipping)}`;

$('#productGrid').innerHTML=products.map(product=>`<article class="product"><div class="product-image"><img loading="lazy" src="${product.image}" alt="Photograph representing ${product.name}"/><button type="button" data-add="${product.id}">Add to bag <span>↗</span></button></div><div class="product-info"><span>${product.category} · IN STOCK</span><div><strong>${product.name}</strong><b>${money(product.price)}</b></div><p>${product.detail}</p></div></article>`).join('');

function openCart(){ $('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');$('#scrim').hidden=false; emitTelemetry('cart_open','#cartDrawer','Shopping bag opened'); }
function closeCart(){ $('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');$('#scrim').hidden=true; }

function renderCart(){
  $('#cartCount').textContent=cartProduct?'1':'0';
  $('#cartTitleCount').textContent=cartProduct?'(1)':'(0)';
  if(ordered){$('#cartBody').innerHTML='<div class="checkout-complete"><div>✓</div><strong>Order placed.</strong><p>This is a fictional demo checkout. No payment was collected.</p></div>';$('#cartFooter').innerHTML='';return;}
  if(!cartProduct){$('#cartBody').innerHTML='<div class="cart-empty"><b>Your bag is empty.</b>Good things are worth finding.</div>';$('#cartFooter').innerHTML='';return;}
  const result=cartOutcome(cartProduct,variant,config);
  $('#cartBody').innerHTML=`<div class="cart-product"><img src="${cartProduct.image}" alt="${cartProduct.name}"/><div><strong>${cartProduct.name}</strong><small>MONOFORM / OBJECTS · QTY 1</small><b>${result.cartPrice!==result.shelfPrice?`<span class="crossed">${money(result.shelfPrice)}</span>`:''}${money(result.cartPrice)}</b><button class="remove-button" id="removeItem">Remove</button></div></div><div class="cart-promises"><div><span>Availability</span><b class="${result.inStock?'':'bad'}">${result.inStock?'In stock':'Sold out'}</b></div><div><span>Warranty at checkout</span><b class="${result.warrantyYears===2?'':'bad'}">${result.warrantyYears} year${result.warrantyYears===1?'':'s'}</b></div><div><span>Returns at checkout</span><b class="${result.returnDays===30?'':'bad'}">${result.returnDays} days</b></div><div><span>Free shipping threshold</span><b class="${result.shippingThreshold===Number(config.freeShipping)?'':'bad'}">${money(result.shippingThreshold)}</b></div></div>`;
  $('#cartFooter').innerHTML=`<div class="cart-line"><span>Subtotal</span><b>${money(result.cartPrice)}</b></div><div class="cart-line ${result.discount===0?'bad':'discount'}"><span>${offerCode} discount ${result.discount===0?'(not applied)':'('+config.discount+'% applied)'}</span><b>-${money(result.discount)}</b></div><div class="cart-line"><span>Shipping</span><b>${result.shipping===0?'FREE':money(result.shipping)}</b></div><div class="cart-total"><span>Total</span><span>${money(result.total)}</span></div><button class="checkout-button" id="checkoutButton" ${result.inStock?'':'disabled'}>${result.inStock?'Place demo order →':'Unavailable'}</button><div class="variant-note">Fictional demo order. No payment information required.</div>`;
  $('#removeItem').addEventListener('click',event=>{event.k9Handled=true;cartProduct=null;renderCart()});
  $('#checkoutButton').addEventListener('click',event=>{event.k9Handled=true;ordered=true;emitTelemetry('order_placed','#checkoutButton','Fictional demo order completed');renderCart()});
}

document.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',event=>{event.k9Handled=true;cartProduct=products.find(product=>product.id===button.dataset.add);ordered=false;emitTelemetry('add_to_cart',targetName(button),cartProduct?.name||'');renderCart();openCart()}));
$('#cartButton').addEventListener('click',event=>{event.k9Handled=true;renderCart();openCart()});
$('#closeCart').addEventListener('click',event=>{event.k9Handled=true;closeCart()});
$('#scrim').addEventListener('click',closeCart);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCart()});
renderCart();
