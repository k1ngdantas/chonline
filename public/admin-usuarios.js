document.addEventListener('DOMContentLoaded', async () => {
  preventBackButton();
  const admin = requireAuth('admin');
  if (!admin) return;

  const btnLogout = document.getElementById('btn-logout-admin');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  const tbody = document.getElementById('users-body');
  const countEl = document.getElementById('users-count');

  async function loadUsers() {
    try {
      const res = await fetch('/api/users?role=Usuario');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const users = await res.json();
      tbody.innerHTML = '';
      users
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .forEach((u) => {
          const tr = document.createElement('tr');
          tr.className = 'border-b border-gray-800 hover:bg-gray-800/60';
          tr.innerHTML = `
            <td class="py-2 pr-3 text-gray-400">#${u.id}</td>
            <td class="py-2 pr-3">${u.name || '-'}</td>
            <td class="py-2 pr-3 text-gray-300">${u.username || '-'}</td>
            <td class="py-2 pr-3 text-blue-300">${u.secao || '-'}</td>
          `;
          tbody.appendChild(tr);
        });
      countEl.textContent = `${users.length} usuário${users.length !== 1 ? 's' : ''}`;
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-red-400">Erro ao carregar usuários.</td></tr>';
      countEl.textContent = 'Erro';
    }
  }

  loadUsers();
});
