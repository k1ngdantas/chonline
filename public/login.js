function saveCurrentUser(user) {
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

function checkAndRedirectIfLoggedIn() {
  if (redirectIfLoggedIn()) return true;
  return false;
}

window.addEventListener('pageshow', () => {
  if (checkAndRedirectIfLoggedIn()) return;
});

document.addEventListener('DOMContentLoaded', () => {
  if (checkAndRedirectIfLoggedIn()) return;

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('border-blue-500', 'text-blue-400', 'font-semibold');
    tabRegister.classList.remove('border-blue-500', 'text-blue-400', 'font-semibold');
    tabRegister.classList.add('text-gray-400');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('border-blue-500', 'text-blue-400', 'font-semibold');
    tabLogin.classList.remove('border-blue-500', 'text-blue-400', 'font-semibold');
    tabLogin.classList.add('text-gray-400');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!identifier || !password) {
      alert('Preencha usuário/e-mail e senha.');
      return;
    }
    try {
      const base = window.location.origin ? window.location.origin : '';
      const url = base ? `${base}/api/login` : '/api/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identifier,
          email: identifier.includes('@') ? identifier : undefined,
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Credenciais inválidas. Verifique usuário e senha.');
        return;
      }
      saveCurrentUser(data);
      redirectByRole(data);
    } catch (err) {
      console.error(err);
      alert('Erro de conexão. Verifique se o servidor está rodando.');
    }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const secao = document.getElementById('reg-secao').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    if (!name || !username || !password || !secao) return;

    try {
      const base = window.location.origin || '';
      const res = await fetch(`${base}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, role: 'Usuario', secao }),
      });
      const user = await res.json();
      if (!res.ok) {
        alert(user.error || 'Erro ao criar usuário');
        return;
      }
      saveCurrentUser(user);
      redirectByRole(user);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar usuário.');
    }
  });
});

