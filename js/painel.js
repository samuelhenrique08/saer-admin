import { supabase } from './supabase.js';
import './auth.js';
import { requireAuth } from './auth.js';

const session = await requireAuth();
if (!session) throw new Error('not logged');

// =========================================================
// TOAST
// =========================================================
function toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => {
        el.classList.add('fade');
        el.addEventListener('animationend', () => el.remove());
    }, 2600);
}

// =========================================================
// UTILITÁRIOS
// =========================================================
function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
}

const PROMPT_REGEX = /\|\s*(\d+)\s*\|.*?—\s*(\d+)\s*h\s*:\s*(\d+)\s*min\s*:\s*(\d+)\s*s/i;

function parsePromptLine(line) {
    const m = line.match(PROMPT_REGEX);
    if (!m) return null;
    const id = Number(m[1]);
    const hours = Number(m[2]) + Number(m[3]) / 60 + Number(m[4]) / 3600;
    return { id, hours };
}

function metaFor(member) {
    if (['comandante', 'administrador'].includes(member.role)) return 0;
    if (member.role === 'anjo negro elite') return 2;
    if (member.division === 'core') return 0.5;
    if (member.role === 'anjo negro') return 1;
    return 0;
}

// =========================================================
// ESTADO / CARREGAR
// =========================================================
let membersCache = [];
let recordsCache = [];
const weekStart = getWeekStart();

async function loadData() {
    const [{ data: members }, { data: records }] = await Promise.all([
        supabase.from('members').select('*').eq('is_active', true).order('name'),
        supabase.from('weekly_records').select('*').eq('week_start', weekStart)
    ]);
    membersCache = members || [];
    recordsCache = records || [];
    renderTable();
}

function getRecord(memberId) {
    return recordsCache.find(r => r.member_id === memberId);
}

// =========================================================
// RENDER
// =========================================================
function renderTable(filter = '') {
    const tbody = document.querySelector('#tbl-members tbody');
    const f = filter.toLowerCase();
    const list = membersCache.filter(m =>
        !f || m.name.toLowerCase().includes(f) || String(m.id).includes(f)
    );

    // Reaproveita DOM: renderiza via DocumentFragment
    const frag = document.createDocumentFragment();

    for (const m of list) {
        const rec = getRecord(m.id);
        const hours = rec ? Number(rec.hours_logged) : 0;
        const meta = rec ? Number(rec.meta_hours) : 0;
        const isExempt = ['comandante', 'administrador'].includes(m.role);

        const status = isExempt
            ? '<span class="exempt">Isento</span>'
            : (rec?.passed
                ? '<span class="ok">✔ Cumprida</span>'
                : '<span class="fail">✘ Incompleta</span>');

        const tr = document.createElement('tr');
        tr.dataset.id = m.id;

        tr.innerHTML = `
      <td>${m.id}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${m.division.toUpperCase()}</td>
      <td>${m.role}</td>
      <td>
        <span class="strike-count">${m.strike_count}</span>
      </td>
      <td>${hours.toFixed(2)}h</td>
      <td>${isExempt ? '—' : meta.toFixed(2) + 'h'}</td>
      <td>${status}</td>
      <td>
        <div class="btn-row">
            <button class="sm" data-action="strike-add" data-id="${m.id}" title="Adicionar strike">+1</button>
            <button class="sm warn" data-action="strike-del" data-id="${m.id}" title="Remover último strike">−1</button>
            <button class="sm ghost" data-action="strike-hist" data-id="${m.id}" title="Ver histórico">Ver</button>
            <button class="sm ghost" data-action="edit" data-id="${m.id}" title="Editar membro">Editar</button>
            <button class="sm danger" data-action="remove" data-id="${m.id}" title="Remover membro">X</button>
        </div>
      </td>
    `;
        frag.appendChild(tr);
    }

    tbody.replaceChildren(frag);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

// =========================================================
// CADASTRAR / REATIVAR MEMBRO
// =========================================================
document.getElementById('form-member').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = Number(document.getElementById('m-id').value);
    const name = document.getElementById('m-name').value.trim();
    const division = document.getElementById('m-division').value;
    const role = document.getElementById('m-role').value;

    if (!id || !name || !division || !role) {
        toast('Preencha todos os campos', 'error');
        return;
    }

    // Verifica se o ID já existe (ativo ou inativo)
    const { data: existing, error: eFind } = await supabase
        .from('members')
        .select('id, is_active, name')
        .eq('id', id)
        .maybeSingle();

    if (eFind) { toast('Erro: ' + eFind.message, 'error'); return; }

    if (existing) {
        if (existing.is_active) {
            toast(`Já existe um membro ativo com o ID ${id} (${existing.name})`, 'error');
            return;
        }

        // Reativa e atualiza dados — preserva histórico de strikes e metas
        const { error } = await supabase
            .from('members')
            .update({
                name,
                division,
                role,
                is_active: true
            })
            .eq('id', id);

        if (error) { toast('Erro: ' + error.message, 'error'); return; }

        toast(`${name} reativado com sucesso`, 'success');
    } else {
        const { error } = await supabase
            .from('members')
            .insert({ id, name, division, role });

        if (error) { toast('Erro: ' + error.message, 'error'); return; }

        toast('Membro cadastrado', 'success');
    }

    e.target.reset();
    await loadData();
});

// =========================================================
// PROCESSAR PROMPT
// =========================================================
const btnProcess = document.getElementById('btn-process');
btnProcess.addEventListener('click', async () => {
    const raw = document.getElementById('prompt-input').value;
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const msg = document.getElementById('process-msg');

    if (!lines.length) { msg.textContent = 'Nada para processar.'; return; }
    btnProcess.disabled = true;
    btnProcess.textContent = 'Processando...';

    try {
        const totals = {};
        let parseErrors = 0;
        for (const line of lines) {
            const parsed = parsePromptLine(line);
            if (!parsed) { parseErrors++; continue; }
            totals[parsed.id] = (totals[parsed.id] || 0) + parsed.hours;
        }

        const exemptRoles = ['comandante', 'administrador'];
        for (const m of membersCache) {
            if (!exemptRoles.includes(m.role) && !(m.id in totals)) totals[m.id] = 0;
        }

        const upserts = [];
        const unknownIds = [];
        for (const [idStr, hours] of Object.entries(totals)) {
            const id = Number(idStr);
            const member = membersCache.find(m => m.id === id);
            if (!member) { unknownIds.push(id); continue; }
            const meta = metaFor(member);
            const isExempt = meta === 0 && exemptRoles.includes(member.role);
            upserts.push({
                member_id: id,
                week_start: weekStart,
                hours_logged: Number(hours.toFixed(4)),
                meta_hours: meta,
                passed: isExempt ? true : hours >= meta,
                updated_at: new Date().toISOString()
            });
        }

        if (upserts.length) {
            const { error } = await supabase
                .from('weekly_records')
                .upsert(upserts, { onConflict: 'member_id,week_start' });
            if (error) throw error;
        }

        msg.textContent =
            `${upserts.length} membros atualizados` +
            (parseErrors ? ` • ${parseErrors} linha(s) inválida(s)` : '') +
            (unknownIds.length ? ` • IDs não cadastrados: ${unknownIds.join(', ')}` : '');
        toast('Prompt processado', 'success');

        document.getElementById('prompt-input').value = '';
        await loadData();
    } catch (err) {
        toast('Erro: ' + err.message, 'error');
    } finally {
        btnProcess.disabled = false;
        btnProcess.textContent = 'Processar e atualizar';
    }
});

// =========================================================
// AÇÕES NA TABELA
// =========================================================
const modalStrike = document.getElementById('modal-strike');
const modalHistory = document.getElementById('modal-history');
let pendingStrikeId = null;
const modalEdit = document.getElementById('modal-edit');
let pendingEditId = null;

function openModal(el) { el.classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

[modalStrike, modalHistory, modalEdit].forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
});

document.querySelector('#tbl-members').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const member = membersCache.find(m => m.id === id);
    if (!member) return;

    // ----- ADICIONAR STRIKE -----
    if (action === 'strike-add') {
        if (member.strike_count >= 3) {
            toast('Limite de 3 strikes já atingido', 'error');
            return;
        }
        pendingStrikeId = id;
        document.getElementById('strike-member-name').textContent =
            `${member.name} (${id}) — atual: ${member.strike_count}`;
        document.getElementById('strike-reason').value = '';
        openModal(modalStrike);
        setTimeout(() => document.getElementById('strike-reason').focus(), 200);
    }

    // ----- REMOVER ÚLTIMO STRIKE -----
    if (action === 'strike-del') {
        if (member.strike_count <= 0) {
            toast('Nenhum strike para remover', 'error');
            return;
        }
        const novo = member.strike_count - 1;

        // Apaga o último strike registrado
        const { data: last } = await supabase
            .from('strikes').select('id')
            .eq('member_id', id)
            .order('created_at', { ascending: false })
            .limit(1).maybeSingle();

        if (last) await supabase.from('strikes').delete().eq('id', last.id);
        await supabase.from('members').update({ strike_count: novo }).eq('id', id);

        toast(`Strike removido de ${member.name}`, 'success');
        await loadData();
    }

    // ----- VER HISTÓRICO -----
    if (action === 'strike-hist') {
        const { data: list, error } = await supabase
            .from('strikes').select('*')
            .eq('member_id', id)
            .order('created_at', { ascending: false });

        if (error) { toast('Erro: ' + error.message, 'error'); return; }

        document.getElementById('history-member-name').textContent = member.name;
        const ul = document.getElementById('history-list');
        ul.replaceChildren();

        if (!list || !list.length) {
            const li = document.createElement('li');
            li.innerHTML = '<span class="empty">Nenhum strike registrado.</span>';
            ul.appendChild(li);
        } else {
            for (const s of list) {
                const li = document.createElement('li');
                const date = new Date(s.created_at).toLocaleString('pt-BR');
                li.innerHTML = `
          <strong>Strike ${s.amount}º</strong> — ${escapeHtml(s.reason || 'sem motivo informado')}
          <span class="date">${date}</span>
        `;
                ul.appendChild(li);
            }
        }
        openModal(modalHistory);
    }

    // ----- EDITAR MEMBRO -----
    if (action === 'edit') {
        pendingEditId = id;
        document.getElementById('edit-member-id').textContent = `ID: ${member.id}`;
        document.getElementById('edit-name').value = member.name;
        document.getElementById('edit-division').value = member.division;
        document.getElementById('edit-role').value = member.role;
        openModal(modalEdit);
    }

    // ----- REMOVER MEMBRO -----
    if (action === 'remove') {
        if (!confirm(`Remover ${member.name}?`)) return;
        const tr = document.querySelector(`#tbl-members tr[data-id="${id}"]`);
        tr?.classList.add('removing');
        await supabase.from('members').update({ is_active: false }).eq('id', id);
        toast('Membro removido', 'success');
        setTimeout(loadData, 200);
    }
});

// ----- CONFIRMAR STRIKE -----
document.getElementById('strike-confirm').addEventListener('click', async () => {
    if (!pendingStrikeId) return;
    const member = membersCache.find(m => m.id === pendingStrikeId);
    const reason = document.getElementById('strike-reason').value.trim();
    const novo = Math.min(3, (member.strike_count || 0) + 1);

    const { error: e1 } = await supabase
        .from('members').update({ strike_count: novo }).eq('id', member.id);
    const { error: e2 } = await supabase
        .from('strikes').insert({ member_id: member.id, amount: novo, reason });

    if (e1 || e2) { toast('Erro: ' + (e1 || e2).message, 'error'); return; }

    closeModal(modalStrike);
    toast(`Strike ${novo}º registrado em ${member.name}`, 'success');
    pendingStrikeId = null;
    await loadData();
});

// ----- CONFIRMAR EDIÇÃO -----
document.getElementById('edit-confirm').addEventListener('click', async () => {
    if (!pendingEditId) return;

    const member = membersCache.find(m => m.id === pendingEditId);
    const name = document.getElementById('edit-name').value.trim();
    const division = document.getElementById('edit-division').value;
    const role = document.getElementById('edit-role').value;

    if (!name || !division || !role) {
        toast('Preencha todos os campos', 'error');
        return;
    }

    // 1) Atualiza os dados do membro
    const { error: eUpdate } = await supabase
        .from('members')
        .update({ name, division, role })
        .eq('id', member.id);

    if (eUpdate) { toast('Erro: ' + eUpdate.message, 'error'); return; }

    // 2) Recalcula a meta da semana atual (cargo/divisão podem ter mudado)
    const rec = getRecord(member.id);
    if (rec) {
        // Simula o novo membro para calcular a nova meta
        const updated = { ...member, name, division, role };
        const newMeta = metaFor(updated);
        const isExempt = ['comandante', 'administrador'].includes(role);

        const { error: eRec } = await supabase
            .from('weekly_records')
            .update({
                meta_hours: newMeta,
                passed: isExempt ? true : Number(rec.hours_logged) >= newMeta,
                updated_at: new Date().toISOString()
            })
            .eq('member_id', member.id)
            .eq('week_start', weekStart);

        if (eRec) { toast('Erro ao recalcular meta: ' + eRec.message, 'error'); return; }
    }

    closeModal(modalEdit);
    toast(`${name} atualizado`, 'success');
    pendingEditId = null;
    await loadData();
});

document.getElementById('edit-cancel').addEventListener('click', () => {
    closeModal(modalEdit);
    pendingEditId = null;
});

document.getElementById('strike-cancel').addEventListener('click', () => {
    closeModal(modalStrike); pendingStrikeId = null;
});
document.getElementById('history-close').addEventListener('click', () => closeModal(modalHistory));

// ESC fecha modais
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal(modalStrike);
        closeModal(modalHistory);
        closeModal(modalEdit);
    }
});

// =========================================================
// BUSCA (debounce para fluidez)
// =========================================================
let searchTimer;
document.getElementById('search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(() => renderTable(value), 120);
});

// =========================================================
// INIT
// =========================================================
await loadData();