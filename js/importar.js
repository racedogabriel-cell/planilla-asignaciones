/**
 * Módulo: Importar
 * Objetivo: Cargar programa desde EPUB o JSON
 * Estado: En desarrollo
 * Sprint: 2
 */
import { getConfig, importPrograma, isEndpointConfigured } from './sheets.js';
import { generateSlotsForPublication } from './slots.js';
import { escapeHtml, errorNotice, setupNotice } from './dom.js';
import { fileLooksLikeZip, isEpubFile, parseEpubFile } from './epub-parser.js?v=3';

export function importarView() {
  return `<div id="import-root"></div>`;
}

export function bindImportar() {
  const root = document.querySelector('#import-root');
  if (!root) return;

  if (!isEndpointConfigured()) {
    root.innerHTML = setupNotice('Configurá el endpoint en js/config.js antes de importar.');
    return;
  }

  const state = { error: '', message: '', busy: false, preview: null, file: null };

  function render() {
    const weeks = state.preview?.weeks || [];
    const preview = state.preview
      ? `<div class="notice" style="margin-top:12px">
          <strong>${escapeHtml(state.preview.title || 'Programa')}</strong><br />
          ${weeks.length} semana(s), ${state.preview.parts} partes, ${state.preview.slots} huecos.
          <ul>${weeks.map((w) => `<li>${escapeHtml(w.dateLabel || w.weekKey)} — ${escapeHtml(w.bibleReading || '')}</li>`).join('')}</ul>
        </div>`
      : '';
    root.innerHTML = `
      <div class="notice">Importar v3 — EPUB o JSON. Elegí la Guía de actividades. No se sube el archivo a Sheets: solo el programa recortado.</div>
      <form class="card" id="import-form" style="margin-top:14px">
        <label>Archivo EPUB o JSON
          <input class="field" id="import-file" type="file" accept=".epub,.jwpub,application/epub+zip,application/json,.json">
        </label>
        ${state.file ? `<p class="muted">Seleccionado: ${escapeHtml(state.file.name)}</p>` : ''}
        ${preview}
        <div class="toolbar" style="margin-top:14px">
          <button class="button" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Importando…' : 'Importar a Sheets'}</button>
        </div>
        ${state.error ? errorNotice(state.error) : ''}
        ${state.message ? `<p class="save-message">${escapeHtml(state.message)}</p>` : ''}
      </form>
    `;
  }

  async function publicationFromFile(file) {
    const zip = await fileLooksLikeZip(file);
    if (zip || isEpubFile(file)) {
      return parseEpubFile(file);
    }
    const text = await file.text();
    let publication;
    try {
      publication = JSON.parse(text);
    } catch {
      throw new Error('Ese archivo no es un JSON de programa ni un EPUB válido.');
    }
    if (Number(publication.version) !== 1) throw new Error('version debe ser 1.');
    if (!Array.isArray(publication.weeks) || !publication.weeks.length) {
      throw new Error('El JSON no tiene weeks.');
    }
    return publication;
  }

  root.addEventListener('change', (event) => {
    const input = event.target.closest('#import-file');
    if (!input) return;
    state.file = input.files?.[0] || null;
    state.error = '';
    state.message = '';
    state.preview = null;
    render();
    const again = root.querySelector('#import-file');
    if (again && state.file) {
      const transfer = new DataTransfer();
      transfer.items.add(state.file);
      again.files = transfer.files;
    }
  });

  root.addEventListener('submit', async (event) => {
    if (event.target.id !== 'import-form') return;
    event.preventDefault();
    const file = state.file || document.querySelector('#import-file')?.files?.[0];
    if (!file) {
      state.error = 'Elegí un archivo EPUB o JSON.';
      render();
      return;
    }
    state.file = file;
    state.busy = true;
    state.error = '';
    state.message = '';
    const button = event.target.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Importando…';
    }
    try {
      const publication = await publicationFromFile(file);
      const cfg = await getConfig();
      if (cfg.ok === false) throw new Error(cfg.message || cfg.error);
      const hasAux = String(cfg.config?.SalaAuxiliar || '') === 'Sí';
      const slots = generateSlotsForPublication(publication, hasAux);
      const parts = publication.weeks.reduce((n, w) => n + (w.parts?.length || 0), 0);
      state.preview = { title: publication.title, weeks: publication.weeks, parts, slots: slots.length };
      const data = await importPrograma({ publication, slots });
      if (data.ok === false) throw new Error(data.message || data.error);
      state.message = `Importadas ${data.importedWeeks} semana(s), ${data.parts} partes, ${data.slots} huecos.`;
    } catch (error) {
      state.error = error.message || 'No se pudo importar.';
    } finally {
      state.busy = false;
      render();
    }
  });

  render();
}
