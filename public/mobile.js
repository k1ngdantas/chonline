document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('mobile-sidebar');
  const overlay = document.getElementById('mobile-overlay');
  const btnMenu = document.getElementById('btn-mobile-menu');
  if (!sidebar || !btnMenu) return;
  function openMenu() {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }
  btnMenu?.addEventListener('click', openMenu);
  overlay?.addEventListener('click', closeMenu);
  sidebar?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', closeMenu);
  });
});
