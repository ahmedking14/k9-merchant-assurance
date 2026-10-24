import { products, loadConfig, cartOutcome, extractClaims, money } from './shared.js';

const config=loadConfig();
const variant=new URLSearchParams(location.search).get('variant')==='B'?'B':'A';
const $=selector=>document.querySelector(selector);
let cartProduct=null;
let ordered=false;

const claims=extractClaims(config,variant);
const offerCode=`FIRST${Number(config.discount)}`;
$('#announcement').innerHTML=`${claims.discountPercent}% OFF YOUR FIRST ORDER <span>·</span> USE CODE ${offerCode} <span>·</span> FREE SHIPPING OVER ${money(config.freeShipping)}`;
$('#offerCopy').textContent=config.offerCopy;
$('#heroCopy').textContent=config.heroCopy;
$('#variantBadge').textContent=variant==='B'?'CHALLENGER B':'CONTROL A';
$('#variantBadge').classList.toggle('b',variant==='B');
if(variant==='B')document.querySelector('.value-strip strong').textContent=config.variantCopy;
document.querySelector('.value-strip>div:first-child p').textContent='Check your warranty terms again in the shopping bag.';
document.querySelector('.value-strip>div:last-child strong').textContent=`Free shipping over ${money(config.freeShipping)}`;

$('#productGrid').innerHTML=products.map(product=>`<article class="product"><div class="product-image"><img loading="lazy" src="${product.image}" alt="Photograph representing ${product.name}"/><button type="button" data-add="${product.id}">Add to bag <span>↗</span></button></div><div class="product-info"><span>${product.category} · IN STOCK</span><div><strong>${product.name}</strong><b>${money(product.price)}</b></div><p>${product.detail}</p></div></article>`).join('');

function openCart(){ $('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');$('#scrim').hidden=false; }
function closeCart(){ $('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');$('#scrim').hidden=true; }

function renderCart(){
  $('#cartCount').textContent=cartProduct?'1':'0';
  $('#cartTitleCount').textContent=cartProduct?'(1)':'(0)';
  if(ordered){$('#cartBody').innerHTML='<div class="checkout-complete"><div>✓</div><strong>Order placed.</strong><p>This is a fictional demo checkout. No payment was collected.</p></div>';$('#cartFooter').innerHTML='';return;}
  if(!cartProduct){$('#cartBody').innerHTML='<div class="cart-empty"><b>Your bag is empty.</b>Good things are worth finding.</div>';$('#cartFooter').innerHTML='';return;}
  const result=cartOutcome(cartProduct,variant,config);
  $('#cartBody').innerHTML=`<div class="cart-product"><img src="${cartProduct.image}" alt="${cartProduct.name}"/><div><strong>${cartProduct.name}</strong><small>MONOFORM / OBJECTS · QTY 1</small><b>${result.cartPrice!==result.shelfPrice?`<span class="crossed">${money(result.shelfPrice)}</span>`:''}${money(result.cartPrice)}</b><button class="remove-button" id="removeItem">Remove</button></div></div><div class="cart-promises"><div><span>Availability</span><b class="${result.inStock?'':'bad'}">${result.inStock?'In stock':'Sold out'}</b></div><div><span>Warranty at checkout</span><b class="${result.warrantyYears===2?'':'bad'}">${result.warrantyYears} year${result.warrantyYears===1?'':'s'}</b></div><div><span>Returns at checkout</span><b class="${result.returnDays===30?'':'bad'}">${result.returnDays} days</b></div><div><span>Free shipping threshold</span><b class="${result.shippingThreshold===Number(config.freeShipping)?'':'bad'}">${money(result.shippingThreshold)}</b></div></div>`;
  $('#cartFooter').innerHTML=`<div class="cart-line"><span>Subtotal</span><b>${money(result.cartPrice)}</b></div><div class="cart-line ${result.discount===0?'bad':'discount'}"><span>${offerCode} discount ${result.discount===0?'(not applied)':'('+config.discount+'% applied)'}</span><b>-${money(result.discount)}</b></div><div class="cart-line"><span>Shipping</span><b>${result.shipping===0?'FREE':money(result.shipping)}</b></div><div class="cart-total"><span>Total</span><span>${money(result.total)}</span></div><button class="checkout-button" id="checkoutButton" ${result.inStock?'':'disabled'}>${result.inStock?'Place demo order →':'Unavailable'}</button><div class="variant-note">Fictional demo order. No payment information required.</div>`;
  $('#removeItem').addEventListener('click',()=>{cartProduct=null;renderCart()});
  $('#checkoutButton').addEventListener('click',()=>{ordered=true;renderCart()});
}

document.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',()=>{cartProduct=products.find(product=>product.id===button.dataset.add);ordered=false;renderCart();openCart()}));
$('#cartButton').addEventListener('click',()=>{renderCart();openCart()});
$('#closeCart').addEventListener('click',closeCart);
$('#scrim').addEventListener('click',closeCart);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCart()});
renderCart();
