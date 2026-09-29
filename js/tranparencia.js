import { supabase } from './supabase.js';

// =========================================================
// UTILITÁRIOS
// =========================================================
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

function formatWeekLabel(weekStartISO) {
  const start = new Date(weekStartISO + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `Semana de ${fmt(start)} a ${fmt(end)}`;
}

function metaFor(member) {
  if (['comandante','administrador'].includes(member.role)) return 0;
  if (member.role === 'anjo negro elite') return 2;
  if (member.division === 'core') return 0.5;
  if (member.role === 'anjo negro') return 1;
  return 0;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

// =========================================================
// ESTADO
// =========================================================
const weekStart = getWeekStart();
let members = [];
let recordsByMember = {};   // { id: record }

// =========================================================
// CARREGAR
// =========================================================
async function loadData() {
  // Só membros ativos
  const { data: mems, error: e1 } = await supabase
    .from('members')
    .select('id, name, division, role, strike_count')
    .eq('is_active', true)
    .order('name');

  if (e1) { console.error(e1); return; }
  members = mems || [];

  const { data: recs, error: e2 } = await supabase
    .from('weekly_records')
    .select('member_id, hours_logged, meta_hours, passed')
    .eq('week_start', weekStart);

  if (e2) { console.error(e2); }

  recordsByMember = {};
  for (const r of recs || []) recordsByMember[r.member_id] = r;

  updateStats();
  renderTable();
}

// =========================================================
// RESUMO
// =========================================================
function updateStats() {
  let ok = 0, fail = 0, exempt = 0;
  for (const m of members) {
    if (['comandante','administrador'].includes(m.role)) { exempt++; continue; }
    const rec = recordsByMember[m.id];
    if (rec?.passed) ok++;
    else fail++;
  }
  document.getElementById('stat-total').textContent  = members.length;
  document.getElementById('stat-ok').textContent     = ok;
  document.getElementById('stat-fail').textContent   = fail;
  document.getElementById('stat-exempt').textContent = exempt;
  document.getElementById('week-label').textContent  = formatWeekLabel(weekStart);
}

// =========================================================
// RENDER
// =========================================================
function renderTable() {
  const search    = document.getElementById('search').value.toLowerCase();
  const fStatus   = document.getElementById('filter-status').value;
  const fRole     = document.getElementById('filter-role').value;
  const fDivision = document.getElementById('filter-division').value;

  const tbody = document.querySelector('#tbl-public tbody');
  const frag = document.createDocumentFragment();

  for (const m of members) {
    const isExempt = ['comandante','administrador'].includes(m.role);
    const rec = recordsByMember[m.id];
    const hours = rec ? Number(rec.hours_logged) : 0;
    const meta  = isExempt ? 0 : metaFor(m);

    let status = isExempt ? 'exempt' : (rec?.passed ? 'ok' : 'fail');
    let statusLabel = isExempt ? 'Isento' : (rec?.passed ? 'Cumprida' : 'Incompleta');

    // Filtros
    if (search &&
        !m.name.toLowerCase().includes(search) &&
        !String(m.id).includes(search)) continue;
    if (fStatus && fStatus !== status) continue;
    if (fRole && m.role !== fRole) continue;
    if (fDivision && m.division !== fDivision) continue;

    const strikeCls =
      m.strike_count === 0 ? 'zero' :
      m.strike_count >= 3  ? 'max'  : '';

    const tr = document.createElement('tr');
    tr.dataset.id = m.id;
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${m.division.toUpperCase()}</td>
      <td>${m.role}</td>
      <td>${isExempt ? '—' : hours.toFixed(2) + 'h'}</td>
      <td>${isExempt ? '—' : meta.toFixed(2) + 'h'}</td>
      <td><span class="strike-pill ${strikeCls}">${m.strike_count}</span></td>
      <td><span class="badge ${status}">${statusLabel}</span></td>
    `;
    frag.appendChild(tr);
  }

  tbody.replaceChildren(frag);
}

// =========================================================
// FILTROS (com debounce na busca)
// =========================================================
let searchTimer;
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderTable, 120);
});
['filter-status','filter-role','filter-division'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderTable);
});

// =========================================================
// MODAL DETALHE
// =========================================================
const modalDetail = document.getElementById('modal-detail');

document.querySelector('#tbl-public').addEventListener('click', (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = Number(tr.dataset.id);
  const m = members.find(x => x.id === id);
  if (!m) return;

  const isExempt = ['comandante','administrador'].includes(m.role);
  const rec = recordsByMember[m.id];
  const hours = rec ? Number(rec.hours_logged) : 0;
  const meta  = isExempt ? 0 : metaFor(m);

  document.getElementById('detail-name').textContent = m.name;
  document.getElementById('detail-meta').textContent =
    isExempt
      ? 'Cargo isento de meta semanal.'
      : (rec?.passed
          ? 'Meta semanal cumprida ✔'
          : 'Meta semanal ainda não cumprida.');

  document.getElementById('d-id').textContent       = m.id;
  document.getElementById('d-division').textContent = m.division.toUpperCase();
  document.getElementById('d-role').textContent     = m.role;
  document.getElementById('d-strikes').textContent  = m.strike_count;
  document.getElementById('d-hours').textContent    = isExempt ? '—' : hours.toFixed(2) + 'h';
  document.getElementById('d-meta').textContent     = isExempt ? '—' : meta.toFixed(2) + 'h';

  modalDetail.classList.add('open');
});

document.getElementById('detail-close').addEventListener('click', () =>
  modalDetail.classList.remove('open')
);
modalDetail.addEventListener('click', (e) => {
  if (e.target === modalDetail) modalDetail.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalDetail.classList.remove('open');
});

// =========================================================
// INIT
// =========================================================
loadData();