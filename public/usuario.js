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
  const tbody = document.getElementById('user-tickets-body');
  const totalEl = document.getElementById('user-total');
  const nameEl = document.getElementById('user-name');

  const btnNew = document.getElementById('btn-new-ticket-user');
  const modal = document.getElementById('modal-user-ticket');
  const btnClose = document.getElementById('modal-user-close');
  const btnCancel = document.getElementById('btn-user-cancel');
  const form = document.getElementById('form-user-ticket');
  const btnLogout = document.getElementById('btn-logout-user');
  const tabAbertos = document.getElementById('tab-abertos');
  const tabFinalizados = document.getElementById('tab-finalizados');
  const totalLabel = document.getElementById('user-total-label');

  let tickets = [];
  let currentUser = null;
  let activeTab = 'abertos'; // 'abertos' | 'finalizados'

  preventBackButton();
  currentUser = requireAuth('usuario');
  if (!currentUser) return;
  nameEl.textContent = currentUser.name;

  function render() {
    const list = activeTab === 'abertos'
      ? tickets.filter((t) => t.status !== 'resolvido')
      : tickets.filter((t) => t.status === 'resolvido');

    tbody.innerHTML = '';
    list
      .slice()
      .sort((a, b) => b.id - a.id)
      .forEach((ticket) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-800';
        const isEmProgresso = ticket.status === 'em_progresso';
        tr.innerHTML = `
          <td class="py-2 pr-3 text-gray-400">#${ticket.id}</td>
          <td class="py-2 pr-3">${ticket.title}</td>
          <td class="py-2 pr-3">
            <span class="${badgePriority(ticket.priority)}">${labelPriority(ticket.priority)}</span>
          </td>
          <td class="py-2 pr-3">
            <span class="${badgeStatus(ticket.status)}">${labelStatus(ticket.status)}</span>
          </td>
          <td class="py-2 pr-3">${ticket.agent || '-'}</td>
          <td class="py-2 pr-3 text-gray-500">${formatRelativeDate(ticket.updatedAt)}</td>
          <td class="py-2 pr-3">
            ${isEmProgresso ? `<button data-id="${ticket.id}" class="btn-chat-user px-2 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-[11px]">Chat</button>` : '-'}
          </td>
        `;
        tbody.appendChild(tr);
      });

    totalLabel.textContent = activeTab === 'abertos' ? 'Em aberto: ' : 'Finalizados: ';
    totalEl.textContent = list.length;

    btnNew.style.display = activeTab === 'abertos' ? '' : 'none';
  }

  async function loadTickets() {
    try {
      const res = await fetch(`/api/tickets?requesterId=${currentUser.id}`);
      if (!res.ok) throw new Error('Erro ao carregar chamados');
      tickets = await res.json();
      render();
    } catch (err) {
      console.error(err);
    }
  }

  function openModal() {
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
    form.reset();
  }

  tabAbertos.addEventListener('click', () => {
    activeTab = 'abertos';
    tabAbertos.classList.add('border-blue-500', 'text-blue-400', 'font-semibold');
    tabAbertos.classList.remove('border-transparent', 'text-gray-400');
    tabFinalizados.classList.remove('border-blue-500', 'text-blue-400', 'font-semibold');
    tabFinalizados.classList.add('border-transparent', 'text-gray-400');
    render();
  });

  tabFinalizados.addEventListener('click', () => {
    activeTab = 'finalizados';
    tabFinalizados.classList.add('border-blue-500', 'text-blue-400', 'font-semibold');
    tabFinalizados.classList.remove('border-transparent', 'text-gray-400');
    tabAbertos.classList.remove('border-blue-500', 'text-blue-400', 'font-semibold');
    tabAbertos.classList.add('border-transparent', 'text-gray-400');
    render();
  });

  const modalChatUser = document.getElementById('modal-chat-user');
  const modalChatUserClose = document.getElementById('modal-chat-user-close');
  const chatUserTicketIdEl = document.getElementById('chat-user-ticket-id');
  const chatUserMessagesEl = document.getElementById('chat-user-messages');
  const formChatUser = document.getElementById('form-chat-user');
  const chatUserInput = document.getElementById('chat-user-input');
  let currentChatUserTicketId = null;
  let chatUserPollInterval = null;

  function formatChatTime(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadChatUserMessages(ticketId) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  function renderChatUserMessages(msgs) {
    if (!chatUserMessagesEl) return;
    chatUserMessagesEl.innerHTML = (msgs || []).map((m) => {
      const isUser = (m.senderRole || '').toLowerCase() === 'usuario';
      return `
        <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[80%] rounded-lg px-3 py-2 ${isUser ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}">
            <p class="text-[10px] opacity-80">${m.senderName} · ${formatChatTime(m.createdAt)}</p>
            <p class="text-sm">${escapeHtml(m.text)}</p>
          </div>
        </div>
      `;
    }).join('');
    chatUserMessagesEl.scrollTop = chatUserMessagesEl.scrollHeight;
  }

  async function openChatUserModal(ticketId) {
    currentChatUserTicketId = ticketId;
    chatUserTicketIdEl.textContent = '#' + ticketId;
    chatUserInput.value = '';
    modalChatUser.classList.remove('hidden');
    const msgs = await loadChatUserMessages(ticketId);
    renderChatUserMessages(msgs);
    if (chatUserPollInterval) clearInterval(chatUserPollInterval);
    chatUserPollInterval = setInterval(async () => {
      if (!currentChatUserTicketId) return;
      const msgs = await loadChatUserMessages(currentChatUserTicketId);
      renderChatUserMessages(msgs);
    }, 3000);
  }

  function closeChatUserModal() {
    modalChatUser.classList.add('hidden');
    currentChatUserTicketId = null;
    if (chatUserPollInterval) {
      clearInterval(chatUserPollInterval);
      chatUserPollInterval = null;
    }
  }

  modalChatUserClose?.addEventListener('click', closeChatUserModal);
  modalChatUser?.addEventListener('click', (e) => {
    if (e.target === modalChatUser) closeChatUserModal();
  });

  formChatUser?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentChatUserTicketId || !chatUserInput.value.trim()) return;
    const text = chatUserInput.value.trim();
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${currentChatUserTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: 'Usuario',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao enviar');
      }
      chatUserInput.value = '';
      const msgs = await loadChatUserMessages(currentChatUserTicketId);
      renderChatUserMessages(msgs);
    } catch (err) {
      console.error(err);
      const msg = err.message || 'Não foi possível enviar a mensagem.';
      alert(msg.includes('fetch') || msg.includes('network') ? 'Erro de conexão. Verifique se o servidor está rodando e tente novamente.' : msg);
    }
  });

  tbody.addEventListener('click', (e) => {
    const chatBtn = e.target.closest('.btn-chat-user');
    if (chatBtn) {
      openChatUserModal(Number(chatBtn.dataset.id));
    }
  });

  btnNew.addEventListener('click', openModal);
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('user-ticket-title').value.trim();
    const description = document.getElementById('user-ticket-description').value.trim();
    const priority = document.getElementById('user-ticket-priority').value;
    if (!title) return;
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          status: 'aberto',
          requesterId: currentUser.id,
          user: currentUser ? currentUser.name : 'Usuário',
          secao: currentUser?.secao || '',
        }),
      });
      if (!res.ok) throw new Error('Erro ao criar chamado');
      const created = await res.json();
      tickets.push(created);
      render();
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar o chamado.');
    }
  });

  await loadTickets();
});

