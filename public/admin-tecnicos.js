document.addEventListener('DOMContentLoaded', () => {
  preventBackButton();
  const admin = requireAuth('admin');
  if (!admin) return;

  const formTech = document.getElementById('form-tech');
  const tbody = document.getElementById('tech-table-body');
  const countEl = document.getElementById('tech-count');

  let technicians = [];

  async function loadTechnicians() {
    try {
      const res = await fetch('/api/users?role=Tecnico');
      if (!res.ok) throw new Error('Erro ao carregar técnicos');
      technicians = await res.json();
      renderTable();
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar técnicos.');
    }
  }

  function renderTable() {
    tbody.innerHTML = '';
    technicians.forEach((t) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-800';
      tr.innerHTML = `
        <td class="py-2 pr-3">${t.name}</td>
        <td class="py-2 pr-3 text-gray-300">${t.username}</td>
      `;
      tbody.appendChild(tr);
    });
    countEl.textContent = `${technicians.length} encontrados`;
  }

  formTech.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('tech-name').value.trim();
    const username = document.getElementById('tech-username').value.trim();
    const password = document.getElementById('tech-password').value.trim() || '1234';
    if (!name || !username) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, role: 'Tecnico' }),
      });
      const user = await res.json();
      if (!res.ok) {
        alert(user.error || 'Erro ao cadastrar técnico');
        return;
      }
      formTech.reset();
      technicians.push(user);
      renderTable();
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar técnico.');
    }
  });

  loadTechnicians();
});

