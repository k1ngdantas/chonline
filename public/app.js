function formatRelativeDate(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Há ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `Há ${diffD} d`;
}

function badgePriority(priority) {
  const base =
    'px-2 py-1 rounded-full text-[10px]';
  if (priority === 'alta') return `${base} bg-red-500/20 text-red-300`;
  if (priority === 'media') return `${base} bg-yellow-500/20 text-yellow-300`;
  return `${base} bg-green-500/20 text-green-300`;
}

function labelPriority(priority) {
  if (priority === 'alta') return 'Alta';
  if (priority === 'media') return 'Média';
  return 'Baixa';
}

function badgeStatus(status) {
  const base =
    'px-2 py-1 rounded-full text-[10px]';
  if (status === 'em_progresso') return `${base} bg-blue-500/20 text-blue-300`;
  if (status === 'na_fila') return `${base} bg-yellow-500/20 text-yellow-300`;
  if (status === 'pendente') return `${base} bg-indigo-500/20 text-indigo-300`;
  if (status === 'resolvido') return `${base} bg-green-500/20 text-green-300`;
  return `${base} bg-gray-500/20 text-gray-300`;
}

function formatTicketDuration(ticket) {
  if (!ticket.startedAt || !ticket.resolvedAt) return '-';
  const start = new Date(ticket.startedAt).getTime();
  const end = new Date(ticket.resolvedAt).getTime();
  if (!start || !end || end <= start) return '-';
  const diffMs = end - start;
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function labelStatus(status) {
  if (status === 'em_progresso') return 'Em Progresso';
  if (status === 'na_fila') return 'Na fila';
  if (status === 'pendente') return 'Pendente';
  if (status === 'resolvido') return 'Resolvido';
  return 'Aberto';
}

function renderTickets(tickets, technicians) {
  const tbody = document.getElementById('tickets-body');
  tbody.innerHTML = '';
  tickets
    .filter((t) => t.status !== 'resolvido')
    .slice()
    .sort((a, b) => b.id - a.id)
    .forEach((ticket) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-800 hover:bg-gray-800/60';
      const techOptions = (technicians || [])
        .map(
          (t) =>
            `<option value="${t.id}" ${Number(ticket.technicianId) === Number(t.id) ? 'selected' : ''}>${t.name}</option>`
        )
        .join('');
      tr.innerHTML = `
        <td class="py-2 pr-3 text-gray-400">#${ticket.id}</td>
        <td class="py-2 pr-3">${ticket.title}</td>
        <td class="py-2 pr-3">${ticket.user}</td>
        <td class="py-2 pr-3">
          <select data-id="${ticket.id}" class="select-priority bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[11px]">
            <option value="baixa" ${ticket.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
            <option value="media" ${ticket.priority === 'media' ? 'selected' : ''}>Média</option>
            <option value="alta" ${ticket.priority === 'alta' ? 'selected' : ''}>Alta</option>
          </select>
        </td>
        <td class="py-2 pr-3">
          <span class="${badgeStatus(ticket.status)}">${labelStatus(ticket.status)}</span>
        </td>
        <td class="py-2 pr-3">${ticket.agent || '-'}</td>
        <td class="py-2 pr-3 text-gray-300">
          ${formatTicketDuration(ticket)}
        </td>
        <td class="py-2 pr-3 text-gray-400">
          ${ticket.resolutionNote ? ticket.resolutionNote : '-'}
        </td>
        <td class="py-2 pr-3 text-gray-500">${formatRelativeDate(ticket.updatedAt)}</td>
        <td class="py-2 pr-3 space-x-2">
          <select data-id="${ticket.id}" class="assign-tech bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[11px]">
            <option value="">Selecionar técnico</option>
            ${techOptions}
          </select>
          <button data-id="${ticket.id}" class="btn-assign text-blue-400 hover:text-blue-300 text-[11px]">
            Atribuir
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

function formatDurationHours(ms) {
  if (!ms || ms <= 0) return '-';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) {
    const min = Math.round(ms / (1000 * 60));
    return min < 1 ? '< 1 min' : `${min} min`;
  }
  return `${hours.toFixed(1)} hrs`;
}

function updateKpis(tickets) {
  const active = tickets.filter((t) => t.status !== 'resolvido').length;
  const today = tickets.filter((t) => {
    const created = new Date(t.createdAt);
    const now = new Date();
    return (
      created.getDate() === now.getDate() &&
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;
  const resolvedToday = tickets.filter((t) => {
    if (t.status !== 'resolvido') return false;
    const updated = new Date(t.resolvedAt || t.updatedAt);
    const now = new Date();
    return (
      updated.getDate() === now.getDate() &&
      updated.getMonth() === now.getMonth() &&
      updated.getFullYear() === now.getFullYear()
    );
  }).length;

  const resolved = tickets.filter((t) => t.status === 'resolvido');
  const endField = (t) => t.resolvedAt || t.updatedAt;
  const startField = (t) => t.startedAt || t.createdAt;

  let avgResponseMs = 0;
  const withResponse = resolved.filter((t) => {
    const start = new Date(t.createdAt).getTime();
    const end = new Date(endField(t)).getTime();
    return !Number.isNaN(start) && !Number.isNaN(end) && end > start;
  });
  if (withResponse.length > 0) {
    const totalResponseMs = withResponse.reduce((acc, t) => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(endField(t)).getTime();
      return acc + (end - start);
    }, 0);
    avgResponseMs = totalResponseMs / withResponse.length;
  }

  let avgSolutionMs = 0;
  const withSolution = resolved.filter((t) => {
    const start = new Date(startField(t)).getTime();
    const end = new Date(endField(t)).getTime();
    return !Number.isNaN(start) && !Number.isNaN(end) && end > start;
  });
  if (withSolution.length > 0) {
    const totalSolutionMs = withSolution.reduce((acc, t) => {
      const start = new Date(startField(t)).getTime();
      const end = new Date(endField(t)).getTime();
      return acc + (end - start);
    }, 0);
    avgSolutionMs = totalSolutionMs / withSolution.length;
  }

  document.getElementById('kpi-active').textContent = active;
  document.getElementById('kpi-today').textContent = `${today} novos hoje`;
  document.getElementById('kpi-resolved-today').textContent = resolvedToday;
  document.getElementById('kpi-response-time').textContent = formatDurationHours(avgResponseMs);
  document.getElementById('kpi-solution-time').textContent = formatDurationHours(avgSolutionMs);

  renderChartEstadoChamados(tickets);
  renderChamadosPorPrioridadeHoje(tickets);
}

function renderChamadosPorPrioridadeHoje(tickets) {
  const el = document.getElementById('chamados-prioridade-hoje');
  if (!el) return;

  const now = new Date();
  const hoje = tickets.filter((t) => {
    const d = new Date(t.createdAt);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const baixa = hoje.filter((t) => (t.priority || 'baixa') === 'baixa');
  const media = hoje.filter((t) => (t.priority || 'media') === 'media');
  const alta = hoje.filter((t) => (t.priority || 'alta') === 'alta');

  const categorias = [
    { label: 'BAIXA', count: baixa.length, numColor: 'text-green-400', tagBg: 'bg-green-500/30' },
    { label: 'MÉDIA', count: media.length, numColor: 'text-yellow-400', tagBg: 'bg-yellow-500/30' },
    { label: 'ALTA', count: alta.length, numColor: 'text-red-400', tagBg: 'bg-red-500/30' },
  ];

  el.innerHTML = `
    <div class="text-center">
      <p class="text-gray-400 text-sm mb-4">Total hoje: <span class="font-semibold text-gray-200">${hoje.length}</span></p>
      <div class="flex flex-wrap gap-6 justify-center">
        ${categorias
          .map(
            (c) => `
          <div class="flex flex-col items-center min-w-[70px]">
            <span class="${c.numColor} text-4xl font-bold tabular-nums">${c.count}</span>
            <span class="${c.tagBg} text-gray-200 px-3 py-1.5 rounded-lg text-[11px] font-semibold mt-2 uppercase tracking-wide">${c.label}</span>
          </div>
        `
          )
          .join('')}
      </div>
      <p class="mt-4 text-xs text-gray-500">Chamados abertos hoje por prioridade</p>
    </div>
  `;
}

function renderRankingTecnicos(tickets, technicians) {
  const el = document.getElementById('ranking-tecnicos');
  const labelEl = document.getElementById('ranking-mes-label');
  if (!el || !labelEl) return;

  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const resolvedNoMes = tickets.filter((t) => {
    if (t.status !== 'resolvido') return false;
    const d = new Date(t.resolvedAt || t.updatedAt);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const countByTech = {};
  (technicians || []).forEach((tech) => {
    countByTech[tech.id] = { name: tech.name, count: 0 };
  });
  resolvedNoMes.forEach((t) => {
    const id = t.technicianId;
    if (id && countByTech[id]) countByTech[id].count += 1;
  });

  const ranking = Object.entries(countByTech)
    .map(([id, data]) => ({ id: Number(id), ...data }))
    .sort((a, b) => b.count - a.count);

  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long' });
  labelEl.textContent = mesNome.charAt(0).toUpperCase() + mesNome.slice(1) + ' ' + anoAtual;

  if (ranking.length === 0) {
    el.innerHTML = '<p class="text-gray-500 text-xs italic">Nenhum técnico cadastrado</p>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = ranking
    .map(
      (r, i) => `
    <div class="flex items-center justify-between py-1.5 px-2 rounded bg-gray-900/50">
      <span class="text-gray-300 text-xs font-medium">
        ${medals[i] || `<span class="text-gray-500 text-[10px] w-4 inline-block">${i + 1}º</span>`}
        ${r.name}
      </span>
      <span class="text-blue-400 font-semibold text-xs">${r.count}</span>
    </div>
  `
    )
    .join('');
}

const ATRASADO_HORAS = 48;

function renderChartEstadoChamados(tickets) {
  const el = document.getElementById('chart-estado-chamados');
  if (!el) return;

  const pendente = tickets.filter((t) => !t.technicianId);
  const naFila = tickets.filter((t) => t.status === 'na_fila');
  const emProgresso = tickets.filter((t) => t.status === 'em_progresso');
  const resolvidos = tickets.filter((t) => t.status === 'resolvido');
  const atrasados = tickets.filter((t) => {
    if (t.status === 'resolvido') return false;
    const aberto = new Date(t.createdAt).getTime();
    const agora = Date.now();
    return (agora - aberto) > ATRASADO_HORAS * 60 * 60 * 1000;
  });

  const total = tickets.length;
  const categorias = [
    { label: 'PENDENTE', count: pendente.length, numColor: 'text-indigo-400', tagBg: 'bg-indigo-500/30' },
    { label: 'NA FILA', count: naFila.length, numColor: 'text-yellow-400', tagBg: 'bg-yellow-500/30' },
    { label: 'EM PROGRESSO', count: emProgresso.length, numColor: 'text-blue-400', tagBg: 'bg-blue-500/30' },
    { label: 'RESOLVIDOS', count: resolvidos.length, numColor: 'text-green-400', tagBg: 'bg-green-500/30' },
    { label: 'ATRASADOS', count: atrasados.length, numColor: 'text-red-400', tagBg: 'bg-red-500/30' },
  ];

  el.innerHTML = `
    <div class="text-center">
      <p class="text-gray-400 text-sm mb-4">Total de chamados: <span class="font-semibold text-gray-200">${total}</span></p>
      <div class="flex flex-wrap gap-6 justify-center">
        ${categorias
          .map(
            (c) => `
          <div class="flex flex-col items-center min-w-[80px]">
            <span class="${c.numColor} text-4xl font-bold tabular-nums">${c.count}</span>
            <span class="${c.tagBg} text-gray-200 px-3 py-1.5 rounded-lg text-[11px] font-semibold mt-2 uppercase tracking-wide">${c.label}</span>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="flex justify-center gap-6 items-center mt-5 pt-4 border-t border-gray-700 text-xs text-gray-500">
        <span>${total} chamados no total</span>
        <span>Chamados por estado · Atrasado &gt; 48h</span>
      </div>
    </div>
  `;
}

function openModal() {
  document.getElementById('modal-ticket').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-ticket').classList.add('hidden');
  document.getElementById('form-ticket').reset();
}

document.addEventListener('DOMContentLoaded', () => {
  const btnNew = document.getElementById('btn-new-ticket');
  const btnCancel = document.getElementById('btn-cancel');
  const btnClose = document.getElementById('modal-close');
  const form = document.getElementById('form-ticket');
  const techListEl = document.getElementById('tech-list');

  let tickets = [];
  let technicians = [];

  preventBackButton();
  const admin = requireAuth('admin');
  if (!admin) return;

  const welcomeEl = document.getElementById('admin-welcome');
  if (welcomeEl) {
    const u = (admin.username || '').toLowerCase();
    if (u === 'marcusdantas') welcomeEl.textContent = 'Bem vindo Ten Marcus Dantas';
    else if (u === 'lantonio') welcomeEl.textContent = 'Bem vindo Sgt L Antonio';
    else welcomeEl.textContent = 'Bem vindo ' + (admin.name || 'Administrador');
  }

  const btnLogout = document.getElementById('btn-logout-admin');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  async function loadTechnicians() {
    try {
      const res = await fetch('/api/users?role=Tecnico');
      if (!res.ok) throw new Error('Erro ao buscar técnicos');
      technicians = await res.json();

      // Popular select do modal
      const techSelect = document.getElementById('ticket-technician');
      techSelect.innerHTML = '<option value=\"\">Não atribuído</option>';
      technicians.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        techSelect.appendChild(opt);
      });

      // Popular lista lateral
      if (techListEl) {
        techListEl.innerHTML = '';
        technicians.forEach((t) => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>${t.name} <span class="text-gray-500">(${t.username})</span>`;
          techListEl.appendChild(li);
        });
      }

      // Re-render tickets com técnicos carregados
      renderTickets(tickets, technicians);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFromApi() {
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) throw new Error('Erro ao buscar chamados');
      tickets = await res.json();
      renderTickets(tickets, technicians);
      updateKpis(tickets);
      renderRankingTecnicos(tickets, technicians);
    } catch (e) {
      console.error(e);
    }
  }

  loadTechnicians().then(loadFromApi);

  btnNew.addEventListener('click', openModal);
  btnCancel.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ticket-title').value.trim();
    const user = document.getElementById('ticket-user').value.trim();
    const secao = document.getElementById('ticket-secao').value.trim();
    const priority = document.getElementById('ticket-priority').value;
    const status = document.getElementById('ticket-status').value;
    const techSelect = document.getElementById('ticket-technician');
    const technicianId = techSelect.value ? Number(techSelect.value) : null;
    const technician = technicians.find((t) => Number(t.id) === technicianId);
    const agent = technician ? technician.name : '';
    const description = document.getElementById('ticket-description').value.trim();

    if (!title || !user) return;

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          user,
          secao,
          priority,
          status,
          technicianId,
          agent,
          description,
        }),
      });
      if (!res.ok) throw new Error('Erro ao criar chamado');
      const created = await res.json();
      tickets.push(created);
      renderTickets(tickets, technicians);
      updateKpis(tickets);
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar o chamado.');
    }
  });

  document.getElementById('tickets-body').addEventListener('change', async (e) => {
    const selectPriority = e.target.closest('.select-priority');
    if (!selectPriority) return;

    const id = Number(selectPriority.dataset.id);
    const priority = selectPriority.value;
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar prioridade');
      const updated = await res.json();
      const index = tickets.findIndex((t) => t.id === id);
      if (index !== -1) tickets[index] = updated;
      renderTickets(tickets, technicians);
      updateKpis(tickets);
    } catch (err) {
      console.error(err);
      alert('Não foi possível alterar a prioridade.');
    }
  });

  document.getElementById('tickets-body').addEventListener('click', async (e) => {
    const btnAssign = e.target.closest('.btn-assign');
    if (!btnAssign) return;

    const id = Number(btnAssign.dataset.id);
      const row = btnAssign.closest('tr');
      const select = row.querySelector('.assign-tech');
      const technicianId = select && select.value ? Number(select.value) : null;
      const technician = technicians.find((t) => Number(t.id) === technicianId);
      try {
        const res = await fetch(`/api/tickets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            technicianId,
            agent: technician ? technician.name : '',
            status: technicianId ? 'na_fila' : 'aberto',
            startedAt: null,
            resolvedAt: null,
          }),
        });
        if (!res.ok) throw new Error('Erro ao atribuir chamado');
        const updated = await res.json();
        const index = tickets.findIndex((t) => t.id === id);
        if (index !== -1) {
          tickets[index] = updated;
        }
        renderTickets(tickets, technicians);
        updateKpis(tickets);
      } catch (err) {
        console.error(err);
        alert('Não foi possível atribuir o chamado.');
      }
  });

  // Cadastro de técnicos agora é feito em admin-tecnicos.html
});

