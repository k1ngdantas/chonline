function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatShortNote(note) {
  if (!note || !note.trim()) return '-';
  const s = String(note).trim();
  return s.length > 60 ? s.slice(0, 60) + '...' : s;
}

function formatDuration(ticket) {
  const start = ticket.startedAt || ticket.createdAt;
  const end = ticket.resolvedAt || ticket.updatedAt;
  if (!start || !end) return '-';
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return '-';
  const diffMs = endMs - startMs;
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

document.addEventListener('DOMContentLoaded', async () => {
  preventBackButton();
  const admin = requireAuth('admin');
  if (!admin) return;

  const btnLogout = document.getElementById('btn-logout-admin');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  const tbody = document.getElementById('resolved-body');
  const countEl = document.getElementById('resolved-count');
  const modal = document.getElementById('modal-detail');
  const modalClose = document.getElementById('modal-close');

  const dId = document.getElementById('d-id');
  const dTime = document.getElementById('d-time');
  const dTitle = document.getElementById('d-title');
  const dUser = document.getElementById('d-user');
  const dTech = document.getElementById('d-tech');
  const dNote = document.getElementById('d-note');

  let resolvedTickets = [];

  function openModal(ticket) {
    dId.textContent = `#${ticket.id}`;
    dTime.textContent = formatDuration(ticket);
    dTitle.textContent = ticket.title || '-';
    dUser.textContent = ticket.user || '-';
    dTech.textContent = ticket.agent || '-';
    dNote.textContent = ticket.resolutionNote || 'Não informado';
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function render() {
    tbody.innerHTML = '';
    resolvedTickets
      .slice()
      .sort((a, b) => new Date(b.resolvedAt || 0).getTime() - new Date(a.resolvedAt || 0).getTime())
      .forEach((t) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-800 hover:bg-gray-800/60';
        tr.innerHTML = `
          <td class="py-2 pr-3 text-gray-400">#${t.id}</td>
          <td class="py-2 pr-3">${t.title || '-'}</td>
          <td class="py-2 pr-3">${t.user || '-'}</td>
          <td class="py-2 pr-3">${t.agent || '-'}</td>
          <td class="py-2 pr-3 text-gray-400">${formatDate(t.createdAt)}</td>
          <td class="py-2 pr-3 text-gray-400">${formatDate(t.resolvedAt || t.updatedAt)}</td>
          <td class="py-2 pr-3 text-gray-300">${formatDuration(t)}</td>
          <td class="py-2 pr-3 text-gray-300 max-w-[200px]" title="${escapeHtml((t.resolutionNote || '').trim())}">${escapeHtml(formatShortNote(t.resolutionNote))}</td>
          <td class="py-2 pr-3">
            <button data-id="${t.id}" class="btn-view text-blue-400 hover:text-blue-300" title="Ver detalhes">
              👁
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    countEl.textContent = `${resolvedTickets.length} resolvidos`;
  }

  async function loadResolved() {
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) throw new Error('Erro ao carregar chamados');
      const all = await res.json();
      resolvedTickets = all.filter((t) => t.status === 'resolvido');
      render();
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar chamados resolvidos.');
    }
  }

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-view');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const ticket = resolvedTickets.find((t) => t.id === id);
    if (!ticket) return;
    openModal(ticket);
  });

  loadResolved();
});

