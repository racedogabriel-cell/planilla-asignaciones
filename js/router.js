import { semanasView, bindSemanas } from './semanas.js';
import { personasView, bindPersonas } from './personas.js';
import { importarView, bindImportar } from './importar.js?v=3';
import { imprimirView, bindImprimir } from './imprimir.js';
import { configuracionView, bindConfiguracion } from './configuracion.js';

const moduleStatus = {
  semanas: 'En desarrollo',
  personas: 'En desarrollo',
  importar: 'En desarrollo (EPUB)',
  imprimir: 'Exportar S-140',
  configuracion: 'En desarrollo',
};

const routes = {
  semanas: { title: 'Semanas', view: semanasView, bind: bindSemanas },
  personas: { title: 'Personas', view: personasView, bind: bindPersonas },
  importar: { title: 'Importar', view: importarView, bind: bindImportar },
  imprimir: { title: 'Imprimir / PDF', view: imprimirView, bind: bindImprimir },
  configuracion: { title: 'Configuración', view: configuracionView, bind: bindConfiguracion },
};

export const navItems = [
  { id: 'semanas', label: 'Semanas', icon: '▤' },
  { id: 'personas', label: 'Personas', icon: '♙' },
  { id: 'importar', label: 'Importar', icon: '↑' },
  { id: 'imprimir', label: 'Imprimir', icon: '▣' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙' },
];

export function renderRoute() {
  const id = location.hash.slice(1) || 'semanas';
  const route = routes[id] || routes.semanas;
  document.querySelector('#page-title').textContent = route.title;
  document.querySelector('#page-eyebrow').textContent = moduleStatus[id] || moduleStatus.semanas;
  document.querySelector('#app').innerHTML = route.view();
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.setAttribute('aria-current', link.dataset.route === (routes[id] ? id : 'semanas') ? 'page' : 'false');
  });
  route.bind?.();
  document.querySelector('#app').focus();
}
