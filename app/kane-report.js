const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const shortTime = value => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'}) : '—';

export function parseKaneEvents(text) {
  const records = String(text).split(/\r?\n/).filter(Boolean).slice(0, 10000).flatMap(line => {
    try { const data = JSON.parse(line); return data && typeof data === 'object' ? [data] : []; }
    catch { return []; }
  });
  const start = records.find(item => item.type === 'stream_start');
  const terminal = [...records].reverse().find(item => ['run_end','test_md_done','testrun_done','remote_done'].includes(item.type));
  const steps = records.filter(item => !item.type && Number.isInteger(item.step) && ['done','failed'].includes(item.status)).map(item => ({step:item.step,status:item.status,remark:String(item.remark || ''),ts:item.ts,childId:item.child_id || ''}));
  const notices = records.filter(item => ['warning','error'].includes(item.type)).map(item => ({type:item.type,message:String(item.message || ''),ts:item.ts}));
  const status = terminal?.overall_status || terminal?.status || (notices.some(item => item.type === 'error') ? 'error' : 'incomplete');
  return { start, terminal, steps, notices, status, totalRecords:records.length };
}
function safeLink(value) {
  try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
export function initKaneReport() {
  const input = $('#kaneLogFile');
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { $('#kaneStructured').textContent = 'Choose an event log smaller than 2 MB.'; return; }
    const parsed = parseKaneEvents(await file.text());
    if (!parsed.totalRecords) { $('#kaneStructured').textContent = 'No Kane events found in this file.'; return; }
    const end = parsed.terminal;
    const successful = ['passed','success','completed'].includes(parsed.status);
    const failed = ['failed','error','stopped'].includes(parsed.status);
    const tone = successful ? 'pass' : failed ? 'fail' : '';
    const completed = parsed.steps.filter(item => item.status === 'done').length;
    const reportUrl = safeLink(end?.test_url || end?.share_url);
    const summary = end?.one_liner || end?.summary || end?.reason || 'No terminal summary in this event log.';
    $('#kaneStructured').innerHTML = `<div class="kane-run-head"><div><span class="eyebrow">IMPORTED KANE RUN · ${escapeHtml(parsed.start?.surface || 'CLI')}</span><h4 class="${tone}">${escapeHtml(parsed.status)}</h4><p>${escapeHtml(summary)}</p></div><span>${parsed.steps.length} steps · ${completed} completed${Number.isFinite(end?.duration) ? ' · '+Math.round(end.duration)+'s' : ''}</span></div>${reportUrl ? `<a class="kane-report-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(reportUrl)}">Open Kane run report ↗</a>` : ''}${parsed.notices.length ? `<div class="kane-notices">${parsed.notices.map(item => `<p class="${item.type === 'error' ? 'fail' : ''}">${escapeHtml(item.message)}</p>`).join('')}</div>` : ''}<div class="kane-step-list">${parsed.steps.map(item => `<div class="kane-step ${item.status === 'failed' ? 'failed' : ''}"><b>${String(item.step).padStart(2,'0')}</b><span><strong>${escapeHtml(item.status === 'failed' ? 'Needs attention' : 'Completed')}</strong><small>${escapeHtml(item.remark)}</small></span><time>${escapeHtml(shortTime(item.ts))}</time></div>`).join('') || '<p>No completed steps in this event log.</p>'}</div><p class="kane-import-note">This view summarizes the local CLI event log. The sealed evidence pack is the source for screenshots and detailed proof.</p>`;
  });
}
