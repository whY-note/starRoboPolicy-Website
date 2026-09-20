const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobile-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  mobileNav.hidden = isOpen;
  document.body.classList.toggle('menu-open', !isOpen);
});

mobileNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    mobileNav.hidden = true;
    document.body.classList.remove('menu-open');
  });
});

const metricButtons = [...document.querySelectorAll('[data-metric]')];
const metricPanels = [...document.querySelectorAll('[data-panel]')];

metricButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const metric = button.dataset.metric;
    metricButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    metricPanels.forEach((panel) => { panel.hidden = panel.dataset.panel !== metric; });
  });
});

const replayClips = window.evaluationReplays?.clips || [];
const replayList = document.querySelector('#replay-list');
const methodLabels = { qwenpi_v3: 'StarVLA', qwenpi_v3_plus_gpt: 'StarVLA + GPT 6', gpt_direct: 'GPT 6 (direct)' };
const taskOrder = window.evaluationReplays?.tasks || [...new Set(replayClips.map((clip) => clip.task))];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function clipFor(task, method) { return replayClips.find((clip) => clip.task === task && clip.method === method); }

function renderTaskRow(task) {
  const taskClips = replayClips.filter((clip) => clip.task === task);
  const title = taskClips[0]?.title || task.replaceAll('_', ' ');
  const firstMethod = taskClips[0]?.method || 'qwenpi_v3';
  const buttons = Object.keys(methodLabels).map((method) => {
    const clip = clipFor(task, method);
    return `<button type="button" class="replay-method ${clip ? '' : 'is-empty'}" data-task="${esc(task)}" data-method="${method}" aria-pressed="${String(method === firstMethod)}" ${clip ? '' : 'disabled'}>${methodLabels[method]}${clip ? '' : '<small>暂无实验</small>'}</button>`;
  }).join('');
  const clip = clipFor(task, firstMethod);
  const source = clip ? `<video controls playsinline preload="metadata" poster="${clip.poster}" src="${clip.video}" aria-label="${esc(title)} ${esc(methodLabels[firstMethod])} evaluation replay"></video>` : '<div class="replay-empty">暂无可播放的评测视频</div>';
  const usage = clip ? clip.usage : { total_tokens: 0 };
  return `<article class="replay-row" data-replay-row="${esc(task)}"><h4>${esc(title)}</h4><div class="replay-methods" role="group" aria-label="${esc(title)} control mode">${buttons}</div><figure class="replay-player">${source}<figcaption><div><strong>${esc(methodLabels[firstMethod])}</strong><span>Case ${esc(clip?.caseId || '—')} · ${clip ? `${clip.duration} s · ${clip.observations} observations` : 'No data'}</span></div>${clip ? `<a href="${clip.video}" download>Download MP4 ↗</a>` : ''}</figcaption></figure><div class="replay-details"><div class="replay-instruction"><span class="replay-label">Task instruction</span><p>${esc(clip?.instruction || 'No task record available.')}</p></div><dl class="replay-metrics"><div><dt>Control steps</dt><dd>${clip?.steps?.toLocaleString('en-US') || '—'}</dd></div><div><dt>Policy decisions</dt><dd>${clip?.decisions?.toLocaleString('en-US') || '—'}</dd></div><div><dt>GPT calls</dt><dd>${clip?.reasonerCalls?.toLocaleString('en-US') || '0'}</dd></div><div><dt>GPT tokens</dt><dd>${usage.total_tokens?.toLocaleString('en-US') || '0'}</dd></div></dl></div><details class="replay-record"><summary>Episode record</summary><p>Selected source: <code>${esc(clip?.source || 'No data')}</code></p><p>Outcome: ${esc(clip?.termination || 'No data')} · Success: ${clip?.success == null ? 'unknown' : clip.success ? 'yes' : 'no'} · Native score: ${clip?.score ?? '—'}</p><p>${clip?.reasonerCalls ? 'GPT 6 reasoning is embedded in the replay annotations.' : 'GPT 6 was not invoked in this episode.'}</p></details></article>`;
}

function updateRow(row, clip, method) {
  const video = row.querySelector('video');
  if (!video || !clip) return;
  video.pause(); video.poster = clip.poster; video.src = clip.video;
  video.setAttribute('aria-label', `${clip.title} ${methodLabels[method]} evaluation replay`); video.load();
  row.querySelector('figcaption strong').textContent = methodLabels[method];
  row.querySelector('figcaption span').textContent = `Case ${clip.caseId} · ${clip.duration} s · ${clip.observations} observations`;
  row.querySelector('figcaption a').href = clip.video;
  row.querySelector('.replay-instruction p').textContent = clip.instruction;
  const values = [clip.steps, clip.decisions, clip.reasonerCalls, clip.usage.total_tokens];
  row.querySelectorAll('.replay-metrics dd').forEach((item, index) => { item.textContent = Number(values[index] || 0).toLocaleString('en-US'); });
  const record = row.querySelector('.replay-record');
  record.querySelector('p').innerHTML = `Selected source: <code>${esc(clip.source)}</code>`;
  record.querySelectorAll('p')[1].textContent = `Outcome: ${clip.termination} · Success: ${clip.success == null ? 'unknown' : clip.success ? 'yes' : 'no'} · Native score: ${clip.score ?? '—'}`;
  record.querySelectorAll('p')[2].textContent = clip.reasonerCalls ? 'GPT 6 reasoning is embedded in the replay annotations.' : 'GPT 6 was not invoked in this episode.';
}

if (replayList) {
  replayList.innerHTML = taskOrder.map(renderTaskRow).join('');
  replayList.querySelectorAll('.replay-method:not([disabled])').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('.replay-row'); const clip = clipFor(button.dataset.task, button.dataset.method);
    row.querySelectorAll('.replay-method').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    updateRow(row, clip, button.dataset.method);
  }));
}
