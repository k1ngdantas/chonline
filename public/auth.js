/**
 * Módulo de autenticação e segurança - Aero Chamados
 * - Verificação de login em todas as páginas protegidas
 * - Bloqueio do botão voltar (navegação apenas via links)
 * - Redirecionamento seguro sem adicionar ao histórico
 */
const STORAGE_USER_KEY = 'chonline_current_user';

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user || !user.id || !user.role) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Redireciona para login SEM adicionar ao histórico (replace).
 * Assim o botão voltar não retorna à página anterior.
 */
function redirectToLogin() {
  window.location.replace('/login.html');
}

/**
 * Redireciona para a página correta conforme o role do usuário.
 * Usa replace para não deixar login no histórico.
 */
function redirectByRole(user) {
  if (!user || !user.role) {
    redirectToLogin();
    return;
  }
  const role = (user.role || '').toLowerCase();
  if (role === 'admin') {
    window.location.replace('/index.html');
  } else if (role === 'tecnico') {
    window.location.replace('/tecnico.html');
  } else {
    window.location.replace('/usuario.html');
  }
}

/**
 * Exige autenticação. Se não logado, redireciona para login.
 * @param {string} requiredRole - 'admin' | 'tecnico' | 'usuario'
 * @returns {object|null} usuário logado ou null (e redireciona)
 */
function requireAuth(requiredRole) {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin();
    return null;
  }
  const role = (user.role || '').toLowerCase();
  const roleMap = { admin: 'admin', tecnico: 'tecnico', usuario: 'usuario' };
  const expected = roleMap[requiredRole];
  if (role !== expected) {
    redirectByRole(user);
    return null;
  }
  return user;
}

/**
 * Na página de login: se já estiver logado, redireciona para a área correta.
 */
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    redirectByRole(user);
    return true;
  }
  return false;
}

/**
 * Bloqueia o botão voltar - mantém o usuário na página atual.
 * Logout só acontece ao clicar em "Sair".
 */
function preventBackButton() {
  const currentUrl = location.href;
  history.pushState({ preventBack: true }, '', currentUrl);
  window.addEventListener('popstate', () => {
    location.replace(currentUrl);
  });
}

/**
 * Logout seguro - limpa dados e redireciona para login sem histórico.
 */
function logout() {
  localStorage.removeItem(STORAGE_USER_KEY);
  window.location.replace('/login.html');
}
