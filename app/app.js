import { products, personas, failureTypes, defaults, loadConfig, storeConfig, evaluateShopper, money } from './shared.js';

let config=loadConfig();
let plannerReady=false;
let lastRun=null;

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));

function showView(name){
  $$('.view').forEach(view=>view.classList.toggle('active',view.id===`view-${name}`));
  $$('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.view===name));
  $('#breadcrumb').textContent=name.toUpperCase().replace('-',' ');
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderFailures(){
  $('#failureToggles').innerHTML=failureTypes.map(item=>`<label class="toggle-row"><input type="checkbox" data-failure="${item.id}" ${config.failures[item.id]?'checked':''}/><span><strong>${item.name}</strong><small>${item.detail}</small></span><span class="probe-category">${item.category}</span></label>`).join('');
  $('#probeMetric').textContent=String(Object.values(config.failures).filter(Boolean).length).padStart(2,'0');
}

function renderPersonas(){
  $('#shopperGrid').innerHTML=personas.map((persona,index)=>`<article class="shopper-card"><span class="shopper-number">AGENT 0${index+1} / ${persona.id.toUpperCase()}</span><div class="shopper-icon">${persona.icon}</div><h3>${persona.name}</h3><p>${persona.blurb}</p><span class="goal">MISSION: ${persona.goal.toUpperCase()}</span></article>`).join('');
}

function populateFields(){
  $('#offerCopy').value=config.offerCopy;
  $('#heroCopy').value=config.heroCopy;
  $('#variantCopy').value=config.variantCopy;
  $('#baseDiscount').value=config.discount;
  $('#freeShipping').value=config.freeShipping;
  $('#priceShift').value=config.priceShift;
  $('#swarmSize').value=String(config.swarmSize);
}

function saveFields(){
  config.offerCopy=$('#offerCopy').value.trim()||defaults.offerCopy;
  config.heroCopy=$('#heroCopy').value.trim()||defaults.heroCopy;
  config.variantCopy=$('#variantCopy').value.trim()||defaults.variantCopy;
  config.discount=Math.max(0,Math.min(90,Number($('#baseDiscount').value)||0));
  config.freeShipping=Math.max(0,Number($('#freeShipping').value)||0);
  config.priceShift=Math.max(1,Math.min(100,Number($('#priceShift').value)||12));
  config.swarmSize=[5,25,100].includes(Number($('#swarmSize').value))?Number($('#swarmSize').value):5;
  $$('[data-failure]').forEach(input=>{config.failures[input.dataset.failure]=input.checked});
  storeConfig(config);
  $('#probeMetric').textContent=String(Object.values(config.failures).filter(Boolean).length).padStart(2,'0');
  $('#shopperMetric').textContent=String(config.swarmSize).padStart(2,'0');
  $('.promise-box strong').textContent=`“${config.offerCopy}”`;
}

function defaultPlans(){return personas.map(persona=>({personaId:persona.id,productId:persona.defaultProduct,intent:persona.goal,reason:persona.blurb}));}

async function getPlans(){
  if(!plannerReady)return {plans:defaultPlans(),source:'demo planner'};
  try{
    const response=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({personas:personas.map(({id,name,blurb,goal})=>({id,name,blurb,goal})),offer:config.offerCopy})});
    if(!response.ok)throw new Error('Planner request failed');
    const data=await response.json();
    return {plans:personas.map(persona=>data.plans.find(plan=>plan.personaId===persona.id)||defaultPlans().find(plan=>plan.personaId===persona.id)),source:'OpenAI shopper planner'};
  }catch{return {plans:defaultPlans(),source:'demo planner (OpenAI unavailable)'};}
}

function runSummary(rows){return {passed:rows.filter(row=>row.pass).length,total:rows.length,rate:Math.round(rows.filter(row=>row.pass).length/rows.length*100)};}

function renderRun(){
  const {a,b,source,plans}=lastRun;
  const sa=runSummary(a),sb=runSummary(b);
  $('#resultsEmpty').hidden=true;
  $('#resultsContent').hidden=false;
  $('#runMode').textContent=source.toUpperCase();
  $('#passMetric').textContent=`${sb.rate}%`;
  $('#passMetricNote').innerHTML=`challenger promise kept <b>↗</b>`;
  const renderColumn=(label,code,rows,summary)=>`<article class="result-column"><span class="variant-tag ${code==='A'?'control':'challenger'}">${code}</span><h3>${label}</h3><strong class="big">${summary.rate}%</strong><small>${summary.passed} of ${summary.total} shopper runs cleared their promise checks</small><div class="result-list">${personas.map(persona=>{const group=rows.filter(row=>row.personaId===persona.id);const passes=group.filter(row=>row.pass).length;const failed=group.find(row=>!row.pass)?.checks.find(check=>!check.pass);return `<div><span>${persona.name}</span><b class="${passes===group.length?'pass':'fail'}">${passes}/${group.length} ${failed?escapeHtml(failed.detail):'pass'}</b></div>`}).join('')}</div></article>`;
  $('#resultsContent').innerHTML=`<div class="result-banner">${renderColumn('Control A','A',a,sa)}${renderColumn('Challenger B','B',b,sb)}</div><p class="result-explainer">${escapeHtml(source)} selected shopper intents. The local evaluator calculated store outcomes; this is not a Kane CLI browser run. Open the store and run Kane separately for independent evidence.</p>`;
  $('#activityPreview').innerHTML=personas.map(persona=>{const group=b.filter(row=>row.personaId===persona.id);const pass=group.filter(row=>row.pass).length;const plan=plans.find(p=>p.personaId===persona.id);return `<div class="activity-row"><div class="activity-bubble">${persona.initials}</div><div><strong>${persona.name}</strong><small>${escapeHtml(plan.intent)}</small></div><span class="${pass===group.length?'pass':'fail'}">${pass}/${group.length}</span></div>`}).join('');
  $('#localEvidenceStatus').textContent='RUN COMPLETE';
  $('#localEvidence').innerHTML=`<strong>Control A: ${sa.rate}% · Challenger B: ${sb.rate}%</strong><br/>${b.filter(row=>!row.pass).length} shopper journeys found a mismatch. Planner: ${escapeHtml(source)}. This is a local simulation, not a Kane evidence pack.`;
  showView('experiment');
  $('#resultsWrap').scrollIntoView({behavior:'smooth',block:'start'});
}

async function runSwarm(button){
  saveFields();
  $$('.primary-button').forEach(item=>{item.disabled=true;item.dataset.original=item.innerHTML;item.textContent='Shoppers are thinking…'});
  const {plans,source}=await getPlans();
  const selectProduct=persona=>products.find(product=>product.id===plans.find(plan=>plan.personaId===persona.id)?.productId)||products.find(product=>product.id===persona.defaultProduct);
  const cohort=Array.from({length:config.swarmSize},(_,index)=>{const persona=personas[index%personas.length];const base=selectProduct(persona);const product=index<personas.length?base:products[(products.indexOf(base)+Math.floor(index/personas.length))%products.length];return {persona,product};});
  const a=cohort.map(({persona,product})=>evaluateShopper(persona,product,'A',config));
  const b=cohort.map(({persona,product})=>evaluateShopper(persona,product,'B',config));
  lastRun={a,b,plans,source:config.swarmSize>5?`${source} · deterministic cohort expansion`:source,time:new Date().toISOString()};
  localStorage.setItem('swarm-last-run',JSON.stringify(lastRun));
  setTimeout(()=>{$$('.primary-button').forEach(item=>{item.disabled=false;item.innerHTML=item.dataset.original});renderRun()},400);
}

function setPreview(variant){
  $$('.segmented button').forEach(button=>button.classList.toggle('selected',button.dataset.preview===variant));
  $('#storeFrame').src=`/store.html?variant=${variant}`;
  $('#browserUrl').textContent=`monoform.objects / ?variant=${variant}`;
  $('#popStore').href=`/store.html?variant=${variant}`;
}

async function checkPlanner(){
  try{const response=await fetch('/api/status');const data=await response.json();plannerReady=data.openaiReady;$('#connection').classList.toggle('live',plannerReady);$('#connection').innerHTML=`<i></i> ${plannerReady?'OpenAI planner ready':'Demo planner active'}`;}
  catch{$('#connection').innerHTML='<i></i> Demo planner active';}
}

function init(){
  populateFields();renderFailures();renderPersonas();checkPlanner();
  $$('.nav-item').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
  $$('[data-jump]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.jump)));
  ['heroRun','experimentRun','shopperRun'].forEach(id=>$('#'+id).addEventListener('click',runSwarm));
  $$('#view-experiment input,#view-experiment textarea,#view-experiment select').forEach(input=>input.addEventListener('change',saveFields));
  $$('.segmented button').forEach(button=>button.addEventListener('click',()=>setPreview(button.dataset.preview)));
  const savedReport=localStorage.getItem('swarm-kane-report');if(savedReport){$('#kaneReport').value=savedReport;$('#kaneLink').href=savedReport;$('#kaneLink').hidden=false;$('#kaneStatus').textContent='LINK SAVED';}
  $('#saveKane').addEventListener('click',()=>{try{const url=new URL($('#kaneReport').value);if(!['https:','http:'].includes(url.protocol))throw new Error();localStorage.setItem('swarm-kane-report',url.href);$('#kaneLink').href=url.href;$('#kaneLink').hidden=false;$('#kaneStatus').textContent='LINK SAVED';}catch{alert('Enter a valid report URL.')}});
  const savedRun=localStorage.getItem('swarm-last-run');if(savedRun){try{lastRun=JSON.parse(savedRun);renderRun();showView('overview')}catch{}}
}

init();
