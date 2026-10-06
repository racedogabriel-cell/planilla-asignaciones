/**
 * Módulo: Configuración
 * Objetivo: Congregación, horario y sala auxiliar
 * Estado: En desarrollo
 * Sprint: 1
 */
import { getConfig, isEndpointConfigured, saveConfig } from './sheets.js';
import { escapeHtml, errorNotice, setupNotice } from './dom.js';

export function configuracionView() {
  return `<div id="config-root"></div>`;
}

export function bindConfiguracion() {
  const root = document.querySelector('#config-root');
  if (!root) return;

  if (!isEndpointConfigured()) {
    root.innerHTML = setupNotice(
      'Pegá la URL /exec de Apps Script en js/config.js y recargá. Instrucciones: apps-script/README.md',
    );
    return;
  }

  const state = { config: {}, error: '', message: '', busy: false };

  function field(name, label, type = 'text') {
    const value = escapeHtml(state.config[name] ?? '');
    if (name === 'SalaAuxiliar') {
      const on = String(state.config.SalaAuxiliar || '') === 'Sí';
      return `<label>${escapeHtml(label)}
        <select class="field" name="SalaAuxiliar">
          <option value="No" ${on ? '' : 'selected'}>No</option>
          <option value="Sí" ${on ? 'selected' : ''}>Sí</option>
        </select>
      </label>`;
    }
    return `<label>${escapeHtml(label)} <input class="field" name="${name}" type="${type}" value="${value}"></label>`;
  }

  function render() {
    root.innerHTML = `
      ${state.error ? errorNotice(state.error) : ''}
      <form class="card" id="config-form">
        <div class="form-grid">
          ${field('Congregacion', 'Nombre de la congregación')}
          ${field('HoraInicio', 'Hora de inicio')}
          ${field('SalaAuxiliar', 'Sala auxiliar')}
          ${field('MinCancion', 'Minutos de canción')}
          ${field('MinIntro', 'Palabras de introducción (min)')}
          ${field('MinConclusion', 'Palabras de conclusión (min)')}
          ${field('MinCorreccion', 'Tiempo de corrección (min)')}
        </div>
        <div class="toolbar" style="margin-top:16px">
          <button class="button" type="submit">Guardar</button>
        </div>
        <p class="save-message">${escapeHtml(state.message)}</p>
      </form>
    `;
  }

  async function load() {
    try {
      const data = await getConfig();
      if (data.ok === false) throw new Error(data.message || data.error);
      state.config = data.config || {};
      state.error = '';
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  root.addEventListener('submit', async (event) => {
    if (event.target.id !== 'config-form') return;
    event.preventDefault();
    const form = new FormData(event.target);
    const config = {};
    for (const [key, value] of form.entries()) config[key] = value;
    const button = event.target.querySelector('button[type="submit"]');
    const status = event.target.querySelector('.save-message') || document.createElement('p');
    if (!status.classList.contains('save-message')) {
      status.className = 'save-message';
      event.target.appendChild(status);
    }
    if (button) button.disabled = true;
    status.textContent = 'Guardando…';
    status.classList.remove('is-error');
    try {
      const data = await saveConfig(config);
      if (data.ok === false) throw new Error(data.message || data.error);
      state.config = data.config || config;
      status.textContent = 'Configuración guardada.';
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('is-error');
    } finally {
      if (button) button.disabled = false;
    }
  });

  load();
}
