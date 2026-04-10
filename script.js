// ══════════════════════════════════════════════════════
//  ⬇  PROFESOR: PEGA AQUÍ tu URL de Google Apps Script
// ══════════════════════════════════════════════════════
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxL12M8k_MCwKHXBntv3fuZB7oV848tUCQ1KlPLppfkHcUUdFaF0XwIj3m4oilDwaAGUQ/exec';
// ══════════════════════════════════════════════════════

let total = 0;
const MAX = 60;
// Per-section accumulators (indexed by section prefix)
const secScore = { '1':0, '2':0, '3':0, '4':0, '5':0 };

function upd(n, secId) {
  total += n;
  total = Math.max(0, total);
  if (secId) secScore[secId] = (secScore[secId] || 0) + n;
  const pct = Math.min(100, Math.round(total / MAX * 100));
  document.getElementById('prog').style.width = pct + '%';
  document.getElementById('pts-disp').textContent = total + ' / ' + MAX;
  document.getElementById('total-disp').textContent = total;
  document.getElementById('total-disp2').textContent = total;
  document.querySelectorAll('.gchip').forEach(c => {
    c.classList.toggle('on', total >= +c.dataset.min && total <= +c.dataset.max);
  });
}

// ── Fill blank check ────────────────────────────────
function chkEx(btn, id) {
  const body = btn.closest('.ex-body');
  const inputs = body.querySelectorAll('input[data-a]');
  let ok = 0, tot = inputs.length;
  const sec = id.charAt(0); // '1','2','3','4','5'
  inputs.forEach(inp => {
    const ans = (inp.dataset.a || '').toLowerCase().trim();
    const val = inp.value.toLowerCase().trim();
    const correct = val === ans || ans.split('/').map(s => s.trim()).includes(val);
    inp.classList.toggle('ok', correct && val !== '');
    inp.classList.toggle('no', !correct && val !== '');
    if (correct) ok++;
  });
  const fb = document.getElementById(id + '-fb');
  fb.classList.add('show');
  if (ok === tot && tot > 0) {
    fb.className = 'fb show good';
    fb.textContent = '🎉 Perfect! ' + ok + '/' + tot;
    upd(ok, sec);
  } else {
    fb.className = 'fb show bad';
    fb.textContent = '💪 ' + ok + '/' + tot + ' correct — check the red ones!';
    upd(ok, sec);
  }
  btn.disabled = true;
}

// ── Multiple choice ─────────────────────────────────
function cho(btn, isOk) {
  const g = btn.closest('.mc-opts');
  g.querySelectorAll('.mc-opt').forEach(b => { b.classList.remove('ok', 'no', 'rev'); b.disabled = false; });
  if (isOk) { btn.classList.add('ok'); }
  else { btn.classList.add('no'); g.querySelectorAll('.mc-opt').forEach(b => { if (b !== btn) b.classList.add('rev'); }); }
  g.querySelectorAll('.mc-opt').forEach(b => b.disabled = true);
  const mc = btn.closest('.mc');
  const sec = mc && mc.dataset.sec ? mc.dataset.sec.charAt(0) : '0';
  if (isOk) upd(1, sec);
}

// ── T/F ─────────────────────────────────────────────
function doTF(btn, chosen, correct, rowId) {
  const row = document.getElementById(rowId);
  row.querySelectorAll('.tf-b').forEach(b => { b.classList.remove('sel'); b.disabled = true; });
  btn.classList.add('sel');
  const icon = row.querySelector('.tf-icon');
  if (chosen === correct) { row.classList.add('ok'); icon.textContent = '✅'; upd(1, '2'); }
  else { row.classList.add('no'); icon.textContent = '❌'; }
}

// ── Match game ───────────────────────────────────────
let selL = null, selR = null;
const matchPairs = { mL1: 'mR1', mL2: 'mR2', mL3: 'mR3', mL4: 'mR4', mL5: 'mR5' };
function mc(el, id) {
  if (el.classList.contains('matched')) return;
  const isL = id.startsWith('mL');
  if (isL) { if (selL) selL.classList.remove('selL'); selL = el; el.classList.add('selL'); }
  else { if (selR) selR.classList.remove('selR'); selR = el; el.classList.add('selR'); }
  if (selL && selR) {
    const lId = selL.dataset.id, rId = selR.dataset.id;
    if (matchPairs[lId] === rId) {
      selL.classList.remove('selL'); selL.classList.add('matched');
      selR.classList.remove('selR'); selR.classList.add('matched');
      upd(1, '1'); selL = null; selR = null;
    } else {
      selL.classList.add('wrong'); selR.classList.add('wrong');
      const l = selL, r = selR;
      setTimeout(() => { l.classList.remove('selL', 'wrong'); r.classList.remove('selR', 'wrong'); }, 900);
      selL = null; selR = null;
    }
  }
}

// ── Word reorder ─────────────────────────────────────
function placeWord(chip, qId) {
  if (chip.classList.contains('placed')) return;
  chip.classList.add('placed');
  const ansDiv = document.getElementById(qId + '-ans');
  const placed = document.createElement('span');
  placed.className = 'placed-chip';
  placed.textContent = chip.textContent;
  placed.dataset.src = chip.textContent;
  ansDiv.classList.add('has');
  ansDiv.appendChild(placed);
}
function removeWord(e, qId) {
  const chip = e.target.closest('.placed-chip');
  if (!chip) return;
  const word = chip.dataset.src;
  const ansDiv = document.getElementById(qId + '-ans');
  chip.remove();
  if (!ansDiv.querySelector('.placed-chip')) ansDiv.classList.remove('has');
  const qDiv = document.getElementById(qId);
  qDiv.querySelectorAll('.rchip').forEach(c => {
    if (c.textContent === word && c.classList.contains('placed')) { c.classList.remove('placed'); }
  });
}

// ══════════════════════════════════════════════════════
//  SUBMIT EXAM
// ══════════════════════════════════════════════════════
function collectAnswers() {
  const answers = {};

  function getMCAnswers(selector) {
    const results = [];
    document.querySelectorAll(selector).forEach((mc, i) => {
      const q   = mc.querySelector('.mc-q')?.textContent?.substring(0, 50) || ('Q' + (i + 1));
      const sel = mc.querySelector('.mc-opt.ok, .mc-opt.no');
      const isOk = sel && sel.classList.contains('ok');
      results.push(q + ' → ' + (sel ? sel.textContent + (isOk ? ' ✅' : ' ❌') : '(sin respuesta)'));
    });
    return results.join(' | ');
  }

  // 1A: city labels
  const inp1a = [...document.querySelectorAll('input[data-ex="1a"]')];
  answers['1a_inputs'] = inp1a.map(i => i.value || '_').join(' / ');

  // 1B: match (check matched items)
  const matched = [...document.querySelectorAll('.mi.matched')].map(m => m.textContent.trim());
  answers['1b_match'] = matched.join(' | ') || '(sin completar)';

  // 1C: MC
  answers['1c_mc'] = getMCAnswers('.mc[data-sec="1c"]');

  // 2A: T/F
  const tfRes = [];
  ['tf1', 'tf2', 'tf3', 'tf4', 'tf5', 'tf6'].forEach(id => {
    const row = document.getElementById(id);
    const q   = row?.querySelector('.tf-q')?.textContent?.substring(0, 40) || id;
    const sel = row?.querySelector('.tf-b.sel');
    const res = sel ? sel.textContent : '?';
    const icon = row?.querySelector('.tf-icon')?.textContent || '';
    tfRes.push(q.trim() + ' → ' + res + icon);
  });
  answers['2a_tf'] = tfRes.join(' | ');

  // 2B: fill inputs
  const inp2b = [...document.querySelectorAll('input[data-ex="2b"]')];
  answers['2b_inputs'] = inp2b.map(i => i.value || '_').join(' / ');

  // 2C: MC
  answers['2c_mc'] = getMCAnswers('.mc[data-sec="2c"]');

  // 3A: fill inputs
  const inp3a = [...document.querySelectorAll('input[data-ex="3a"]')];
  answers['3a_inputs'] = inp3a.map(i => i.value || '_').join(' / ');

  // 3B: fill inputs
  const inp3b = [...document.querySelectorAll('input[data-ex="3b"]')];
  answers['3b_inputs'] = inp3b.map(i => i.value || '_').join(' / ');

  // 4A: MC + fill
  const mc4a  = getMCAnswers('.mc[data-sec="4a"]');
  const inp4a = [...document.querySelectorAll('input[data-ex="4a"]')];
  answers['4a_mc'] = mc4a + ' || ' + inp4a.map(i => i.value || '_').join(' / ');

  // 4B: fill
  const inp4b = [...document.querySelectorAll('input[data-ex="4b"]')];
  answers['4b_inputs'] = inp4b.map(i => i.value || '_').join(' / ');

  // 5A: reorder
  const r1 = [...document.querySelectorAll('#rq1-ans .placed-chip')].map(c => c.textContent).join(' ');
  const r2 = [...document.querySelectorAll('#rq2-ans .placed-chip')].map(c => c.textContent).join(' ');
  const r3 = [...document.querySelectorAll('#rq3-ans .placed-chip')].map(c => c.textContent).join(' ');
  answers['5a_reorder'] = `S1: "${r1}" | S2: "${r2}" | S3: "${r3}"`;

  // 5B: free writing
  answers['5b_writing'] = document.getElementById('writing-5b')?.value || '';

  return answers;
}

function submitExam() {
  const name  = document.getElementById('student-name').value.trim();
  const date  = document.getElementById('student-date').value.trim();
  const cls   = document.getElementById('student-class').value.trim();
  const statusEl = document.getElementById('submit-status');
  const btn   = document.getElementById('submit-btn');

  if (!name) {
    alert('⚠️ Por favor escribe tu nombre completo antes de enviar el examen.');
    document.getElementById('student-name').focus();
    return;
  }

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'PEGAR_URL_AQUI') {
    statusEl.className = 'submit-status error';
    statusEl.style.display = 'block';
    statusEl.textContent = '⚙️ El profesor aún no configuró la URL de envío. Avísale.';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';
  statusEl.className = 'submit-status sending';
  statusEl.style.display = 'block';
  statusEl.textContent = '📡 Enviando tu examen, espera un momento...';

  const payload = {
    name,
    date,
    class: cls,
    total,
    sec1: secScore['1'] || 0,
    sec2: secScore['2'] || 0,
    sec3: secScore['3'] || 0,
    sec4: secScore['4'] || 0,
    sec5: secScore['5'] || 0,
    answers: collectAnswers()
  };

  fetch(APPS_SCRIPT_URL, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(() => {
    statusEl.className = 'submit-status sent';
    statusEl.textContent = '🎉 ¡Examen enviado correctamente! Bien hecho, ' + name + ' 👏';
    btn.textContent = '✅ Enviado';
  })
  .catch(err => {
    btn.disabled = false;
    btn.textContent = '✉️ Send my exam';
    statusEl.className = 'submit-status error';
    statusEl.textContent = '❌ Error al enviar. Verifica tu conexión o avisa al profesor.';
    console.error(err);
  });
}