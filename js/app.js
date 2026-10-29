import { navItems, renderRoute } from './router.js?v=3';

const nav = document.querySelector('#primary-navigation');
nav.innerHTML = navItems
  .map(
    (item) =>
      `<a class="nav-link" data-route="${item.id}" href="#${item.id}"><span class="nav-icon">${item.icon}</span>${item.label}</a>`,
  )
  .join('');

const sidebar = document.querySelector('#app-sidebar');
const menuButton = document.querySelector('#menu-button');
const backdrop = document.querySelector('#sidebar-backdrop');

function setSidebarOpen(open) {
  sidebar.classList.toggle('is-open', open);
  backdrop.classList.toggle('is-visible', open);
  menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeSidebar() {
  setSidebarOpen(false);
}

menuButton.addEventListener('click', () => setSidebarOpen(!sidebar.classList.contains('is-open')));
backdrop.addEventListener('click', closeSidebar);
nav.addEventListener('click', closeSidebar);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSidebar();
});
window.addEventListener('hashchange', renderRoute);
renderRoute();

async function clearBrokenWorker() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  if (!window.caches) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

window.addEventListener('load', () => {
  clearBrokenWorker().catch(() => {});
});
