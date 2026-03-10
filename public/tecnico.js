const API_BASE = window.location.origin || '';

function badgePriority(priority) {
  const base = 'px-2 py-1 rounded-full text-[10px]';
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
  const base = 'px-2 py-1 rounded-full text-[10px]';
  if (status === 'em_progresso') return `${base} bg-blue-500/20 text-blue-300`;
  if (status === 'na_fila') return `${base} bg-yellow-500/20 text-yellow-300`;
  if (status === 'pendente') return `${base} bg-indigo-500/20 text-indigo-300`;
  if (status === 'resolvido') return `${base} bg-green-500/20 text-green-300`;
  return `${base} bg-gray-500/20 text-gray-300`;
}

function labelStatus(status) {
  if (status === 'em_progresso') return 'Em Progresso';
  if (status === 'na_fila') return 'Na fila';
  if (status === 'pendente') return 'Pendente';
  if (status === 'resolvido') return 'Resolvido';
  return 'Aberto';
}

function formatRelativeDate(date) {
  if (!date) return '-';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Há ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `Há ${diffD} d`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('tech-tickets-body');
  const openEl = document.getElementById('tech-open');
  const nameEl = document.getElementById('tech-name');
  const loadingEl = document.getElementById('tech-loading');
  const emptyStateEl = document.getElementById('tech-empty-state');
  const ticketsContainerEl = document.getElementById('tech-tickets-container');
  const btnRefresh = document.getElementById('btn-refresh-tech');
  const btnLogout = document.getElementById('btn-logout-tech');
  const modalResolve = document.getElementById('modal-resolve');
  const modalResolveClose = document.getElementById('modal-resolve-close');
  const formResolve = document.getElementById('form-resolve');
  const resolveNoteInput = document.getElementById('resolve-note');
  const btnResolveCancel = document.getElementById('btn-resolve-cancel');

  let tickets = [];
  let currentTech = null;
  let currentResolveId = null;
  let timerInterval = null;

  preventBackButton();
  currentTech = requireAuth('tecnico');
  if (!currentTech) return;

  nameEl.textContent = currentTech.name || 'Técnico';

  function setLoading(loading) {
    if (loadingEl) loadingEl.classList.toggle('hidden', !loading);
  }

  function showEmptyState(show) {
    if (emptyStateEl) emptyStateEl.classList.toggle('hidden', !show);
    if (ticketsContainerEl) ticketsContainerEl.classList.toggle('hidden', show);
  }

  function render() {
    if (!tbody) return;
    tbody.innerHTML = '';
    const activeTickets = tickets.filter((t) => t.status !== 'resolvido');
    const hasInProgress = activeTickets.some((t) => t.status === 'em_progresso');

    showEmptyState(activeTickets.length === 0);

    activeTickets
      .slice()
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .forEach((ticket) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-800 hover:bg-gray-800/50';
        const isInProgress = ticket.status === 'em_progresso';
        const canStartThis = ticket.status === 'na_fila' && !hasInProgress;
        const startDisabledAttr = canStartThis
          ? 'class="btn-tech-start px-3 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-xs cursor-pointer"'
          : 'disabled class="opacity-40 cursor-not-allowed px-3 py-2 rounded-full bg-blue-500/30 text-xs"';
        const resolveDisabledAttr = isInProgress
          ? 'class="btn-tech-resolve px-3 py-2 rounded-full bg-green-600 hover:bg-green-500 text-xs cursor-pointer"'
          : 'disabled class="opacity-40 cursor-not-allowed px-3 py-2 rounded-full bg-green-500/30 text-xs"';

        tr.innerHTML = `
          <td class="py-2 pr-3 text-gray-400">#${ticket.id}</td>
          <td class="py-2 pr-3 font-medium">${escapeHtml(ticket.title || 'Sem título')}</td>
          <td class="py-2 pr-3">${escapeHtml(ticket.user || '-')}</td>
          <td class="py-2 pr-3 text-blue-300" title="Local do atendimento">${escapeHtml(ticket.secao || '-')}</td>
          <td class="py-2 pr-3"><span class="${badgePriority(ticket.priority)}">${labelPriority(ticket.priority)}</span></td>
          <td class="py-2 pr-3"><span class="${badgeStatus(ticket.status)}">${labelStatus(ticket.status)}</span></td>
          <td class="py-2 pr-3 text-gray-300">
            <span class="ticket-timer" data-id="${ticket.id}">${ticket.startedAt ? formatRelativeDate(ticket.startedAt) : '-'}</span>
          </td>
          <td class="py-2 pr-3 text-gray-500">${formatRelativeDate(ticket.updatedAt)}</td>
          <td class="py-2 pr-3 space-x-2">
            ${isInProgress ? `<button data-id="${ticket.id}" class="btn-chat px-3 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs">Chat</button>` : ''}
            <button data-id="${ticket.id}" ${startDisabledAttr}>Iniciar</button>
            <button data-id="${ticket.id}" ${resolveDisabledAttr}>Resolver</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

    if (openEl) openEl.textContent = activeTickets.length;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      activeTickets.forEach((ticket) => {
        if (!ticket.startedAt || ticket.status !== 'em_progresso') return;
        const started = new Date(ticket.startedAt).getTime();
        const diffMs = Date.now() - started;
        const totalMin = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMin / 60);
        const minutes = totalMin % 60;
        const text = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
        const span = tbody.querySelector(`.ticket-timer[data-id="${ticket.id}"]`);
        if (span) span.textContent = text;
      });
    }, 1000);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  async function loadTickets() {
    const techId = currentTech && (currentTech.id != null && currentTech.id !== '') ? Number(currentTech.id) : null;
    if (techId == null || isNaN(techId)) {
      tickets = [];
      render();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets?technicianId=${techId}`);
      const data = await res.json().catch(() => []);
      tickets = Array.isArray(data) ? data : [];
      if (!res.ok) {
        console.error('Erro ao carregar chamados:', data?.error || res.status);
      }
    } catch (err) {
      console.error(err);
      tickets = [];
    } finally {
      setLoading(false);
      render();
    }
  }

  if (btnRefresh) btnRefresh.addEventListener('click', () => loadTickets());
  if (btnLogout) btnLogout.addEventListener('click', logout);

  const modalChat = document.getElementById('modal-chat');
  const modalChatClose = document.getElementById('modal-chat-close');
  const chatTicketIdEl = document.getElementById('chat-ticket-id');
  const chatMessagesEl = document.getElementById('chat-messages');
  const formChat = document.getElementById('form-chat');
  const chatInput = document.getElementById('chat-input');
  let currentChatTicketId = null;
  let chatPollInterval = null;

  function formatChatTime(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  async function loadChatMessages(ticketId) {
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/messages`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  function renderChatMessages(msgs) {
    if (!chatMessagesEl) return;
    chatMessagesEl.innerHTML = (msgs || []).map((m) => {
      const isTech = (m.senderRole || '').toLowerCase() === 'tecnico';
      return `
        <div class="flex ${isTech ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[80%] rounded-lg px-3 py-2 ${isTech ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}">
            <p class="text-[10px] opacity-80">${escapeHtml(m.senderName)} · ${formatChatTime(m.createdAt)}</p>
            <p class="text-sm">${escapeHtml(m.text)}</p>
          </div>
        </div>
      `;
    }).join('');
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  async function openChatModal(ticketId) {
    currentChatTicketId = ticketId;
    if (chatTicketIdEl) chatTicketIdEl.textContent = '#' + ticketId;
    if (chatInput) chatInput.value = '';
    modalChat?.classList.remove('hidden');
    const msgs = await loadChatMessages(ticketId);
    renderChatMessages(msgs);
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(async () => {
      if (!currentChatTicketId) return;
      const msgs = await loadChatMessages(currentChatTicketId);
      renderChatMessages(msgs);
    }, 3000);
  }

  function closeChatModal() {
    modalChat?.classList.add('hidden');
    currentChatTicketId = null;
    if (chatPollInterval) {
      clearInterval(chatPollInterval);
      chatPollInterval = null;
    }
  }

  modalChatClose?.addEventListener('click', closeChatModal);
  modalChat?.addEventListener('click', (e) => { if (e.target === modalChat) closeChatModal(); });

  formChat?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentChatTicketId || !chatInput?.value?.trim()) return;
    const text = chatInput.value.trim();
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${currentChatTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          senderId: currentTech.id,
          senderName: currentTech.name,
          senderRole: 'Tecnico',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao enviar');
      }
      chatInput.value = '';
      const msgs = await loadChatMessages(currentChatTicketId);
      renderChatMessages(msgs);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Não foi possível enviar a mensagem.');
    }
  });

  tbody?.addEventListener('click', async (e) => {
    const chatBtn = e.target.closest('.btn-chat');
    if (chatBtn) {
      openChatModal(Number(chatBtn.dataset.id));
      return;
    }
    const startBtn = e.target.closest('.btn-tech-start');
    const resolveBtn = e.target.closest('.btn-tech-resolve');
    if (!startBtn && !resolveBtn) return;
    const id = Number((startBtn || resolveBtn).dataset.id);

    if (startBtn && !startBtn.disabled) {
      try {
        const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'em_progresso' }),
        });
        if (!res.ok) throw new Error('Erro ao atualizar chamado');
        const updated = await res.json();
        const index = tickets.findIndex((t) => Number(t.id) === id);
        if (index !== -1) tickets[index] = updated;
        render();
      } catch (err) {
        console.error(err);
        alert('Não foi possível iniciar o chamado. Verifique se você já possui outro em progresso.');
      }
      return;
    }

    if (resolveBtn && !resolveBtn.disabled) {
      currentResolveId = id;
      if (resolveNoteInput) resolveNoteInput.value = '';
      modalResolve?.classList.remove('hidden');
    }
  });

  function closeResolveModal() {
    modalResolve?.classList.add('hidden');
    currentResolveId = null;
    if (resolveNoteInput) resolveNoteInput.value = '';
  }

  modalResolveClose?.addEventListener('click', closeResolveModal);
  btnResolveCancel?.addEventListener('click', closeResolveModal);

  formResolve?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentResolveId) return;
    const note = resolveNoteInput?.value?.trim();
    if (!note) {
      alert('Por favor, descreva a resolução do chamado.');
      return;
    }
    const submitBtn = formResolve.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';
    }
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${currentResolveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolvido', resolutionNote: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao resolver chamado');
      const index = tickets.findIndex((t) => Number(t.id) === currentResolveId);
      if (index !== -1) tickets[index] = data;
      closeResolveModal();
      render();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Não foi possível resolver o chamado.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });

  await loadTickets();
  setInterval(loadTickets, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadTickets();
  });
});
