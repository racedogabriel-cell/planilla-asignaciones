/**
 * Módulo: Imprimir
 * Objetivo: Progreso por semana y exportación S-140 (PDF)
 */
import { getConfig, getPersonas, getSemana, getSemanas, isEndpointConfigured } from './sheets.js';
import { escapeHtml, errorNotice, setupNotice } from './dom.js';
import { renderS140Sheet, weekProgress } from './s140.js';
import { exportS140Pdf } from './s140-pdf.js';

export function imprimirView() {
  return `<div id="print-root"></div>`;
}

export function bindImprimir() {
  const root = document.querySelector('#print-root');
  if (!root) return;

  if (!isEndpointConfigured()) {
    root.innerHTML = setupNotice('Configurá el endpoint para imprimir.');
    return;
  }

  const state = {
    weeks: [],
    selected: new Set(),
    people: new Map(),
    config: {},
    loaded: [],
    error: '',
    message: '',
    busy: false,
  };

  function render() {
    const checks = state.weeks
      .map((w) => {
        const progress = weekProgress(w);
        const on = state.selected.has(w.weekKey) ? 'checked' : '';
        const disabled = progress.complete ? '' : 'disabled';
        return `<label class="print-week-pick ${progress.complete ? 'is-complete' : 'is-incomplete'}">
          <input type="checkbox" data-week="${escapeHtml(w.weekKey)}" ${on} ${disabled}>
          <span class="print-week-copy">
            <strong>${escapeHtml(w.dateLabel || w.weekKey)}</strong>
            <span class="eyebrow">${escapeHtml(w.bibleReading || '')}</span>
          </span>
          <span class="badge ${progress.complete ? 'badge-ok' : 'badge-warn'}">${escapeHtml(progress.statusText)}</span>
        </label>`;
      })
      .join('');

    const canExport = state.loaded.length > 0;
    const sheet = canExport
      ? renderS140Sheet(state.loaded, state.people, state.config)
      : '<p class="empty-state">Seleccioná semanas completas para armar el PDF.</p>';

    root.innerHTML = `
      ${state.error ? errorNotice(state.error) : ''}
      <div class="card no-print print-picker">
        <p class="eyebrow">Seleccioná las semanas completas a incluir en el PDF.</p>
        <div class="print-week-list">${checks || '<p class="empty-state">Sin semanas. Usá Importar.</p>'}</div>
        <div class="toolbar">
          <button class="button" type="button" data-print ${canExport ? '' : 'disabled'}>Exportar PDF</button>
          <span class="label">${state.message || (canExport ? `${state.loaded.length} semana${state.loaded.length === 1 ? '' : 's'} lista${state.loaded.length === 1 ? '' : 's'}` : 'Solo se exportan semanas con todos los huecos asignados.')}</span>
        </div>
      </div>
      <div class="print-sheet s140-sheet">${sheet}</div>
    `;
  }

  async function refreshSheets() {
    const keys = state.weeks.map((w) => w.weekKey).filter((key) => state.selected.has(key));
    state.busy = true;
    try {
      const loaded = [];
      for (const key of keys) {
        const data = await getSemana(key);
        if (data.ok === false) throw new Error(data.message || data.error);
        loaded.push(data.semana);
      }
      state.loaded = loaded;
      state.error = '';
    } catch (error) {
      state.error = error.message;
    } finally {
      state.busy = false;
      render();
    }
  }

  root.addEventListener('change', (event) => {
    const box = event.target.closest('[data-week]');
    if (!box || box.disabled) return;
    if (box.checked) state.selected.add(box.dataset.week);
    else state.selected.delete(box.dataset.week);
    refreshSheets();
  });

  root.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-print]') || state.loaded.length === 0 || state.busy) return;
    state.busy = true;
    state.message = 'Generando PDF…';
    render();
    try {
      await exportS140Pdf(state.loaded, state.people, state.config);
      state.message = 'PDF descargado.';
      state.error = '';
    } catch (error) {
      state.error = error.message;
      state.message = '';
    } finally {
      state.busy = false;
      render();
    }
  });

  (async () => {
    try {
      const [weeks, people, config] = await Promise.all([getSemanas(), getPersonas(), getConfig()]);
      if (weeks.ok === false) throw new Error(weeks.message || weeks.error);
      if (people.ok === false) throw new Error(people.message || people.error);
      if (config.ok === false) throw new Error(config.message || config.error);
      state.weeks = weeks.semanas || [];
      (people.personas || []).forEach((p) => state.people.set(String(p.id), p.nombre));
      state.config = config.config || {};
      const firstComplete = state.weeks.find((w) => weekProgress(w).complete);
      if (firstComplete) state.selected.add(firstComplete.weekKey);
      await refreshSheets();
    } catch (error) {
      state.error = error.message;
      render();
    }
  })();
}
