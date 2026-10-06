/**
 * Módulo: Personas
 * Objetivo: ABM del padrón de asignaciones
 * Estado: En desarrollo
 * Sprint: 1
 */
import {
  createPersona,
  getPersonas,
  isEndpointConfigured,
  setPersonaActivo,
  updatePersona,
} from './sheets.js';
import { categoryLabel, escapeHtml, errorNotice, setupNotice } from './dom.js';

function emptyDraft() {
  return { id: '', nombre: '', categoria: 'Publisher', activo: true };
}

export function personasView() {
  return `<div id="personas-root"></div>`;
}

export function bindPersonas() {
  const root = document.querySelector('#personas-root');
  if (!root) return;

  const state = {
    people: [],
    search: '',
    filter: 'todos',
    mode: null,
    draft: emptyDraft(),
    message: '',
    error: '',
    busy: false,
  };

  async function load() {
    if (!isEndpointConfigured()) {
      root.innerHTML = setupNotice('Configurá js/config.js con la URL de Apps Script.');
      return;
    }
    state.busy = true;
    render();
    try {
      const data = await getPersonas();
      if (data.ok === false) throw new Error(data.message || data.error);
      state.people = data.personas || [];
      state.error = '';
    } catch (error) {
      state.error = error.message;
    } finally {
      state.busy = false;
      render();
    }
  }

  function filtered() {
    const q = state.search.trim().toLowerCase();
    return state.people.filter((p) => {
      if (p.isSystem) return state.filter === 'todos' || state.filter === 'sistema';
      if (state.filter === 'activos' && !p.activo) return false;
      if (state.filter === 'inactivos' && p.activo) return false;
      if (state.filter === 'sistema') return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q);
    });
  }

  function render() {
    if (!isEndpointConfigured()) return;
    const rows = filtered()
      .map((p) => {
        const status = p.isSystem
          ? '<span class="badge">Sistema</span>'
          : `<span class="badge ${p.activo ? 'badge-ok' : ''}">${p.activo ? 'Activo' : 'Inactivo'}</span>`;
        const actions = p.isSystem
          ? ''
          : `<button class="button button-secondary" data-edit="${escapeHtml(p.id)}" type="button">Editar</button>
             <button class="button button-secondary" data-toggle="${escapeHtml(p.id)}" type="button">${p.activo ? 'Desactivar' : 'Activar'}</button>`;
        return `<tr>
          <td>${escapeHtml(p.id)}</td>
          <td>${escapeHtml(p.nombre)}</td>
          <td>${escapeHtml(categoryLabel(p.categoria))}</td>
          <td>${status}</td>
          <td>${actions}</td>
        </tr>`;
      })
      .join('');

    const form =
      state.mode === 'create' || state.mode === 'edit'
        ? `<form class="card" id="persona-form">
            <h2 style="margin:0 0 12px;font-size:1rem">${state.mode === 'edit' ? 'Editar persona' : 'Nueva persona'}</h2>
            <div class="form-grid">
              <label>Nombre <input class="field" name="nombre" value="${escapeHtml(state.draft.nombre)}" required></label>
              <label>Categoría
                <select class="field" name="categoria">
                  <option value="Elder" ${state.draft.categoria === 'Elder' ? 'selected' : ''}>Anciano</option>
                  <option value="MinisterialServant" ${state.draft.categoria === 'MinisterialServant' ? 'selected' : ''}>Siervo ministerial</option>
                  <option value="Publisher" ${state.draft.categoria === 'Publisher' ? 'selected' : ''}>Publicador</option>
                </select>
              </label>
            </div>
            <div class="toolbar" style="margin-top:14px">
              <button class="button" type="submit" ${state.busy ? 'disabled' : ''}>Guardar</button>
              <button class="button button-secondary" data-cancel type="button">Cancelar</button>
            </div>
          </form>`
        : '';

    root.innerHTML = `
      ${state.error ? errorNotice(state.error) : ''}
      <div class="toolbar">
        <input class="search" id="persona-search" placeholder="Buscar por nombre" value="${escapeHtml(state.search)}">
        <select class="field" id="persona-filter" style="max-width:180px">
          <option value="todos" ${state.filter === 'todos' ? 'selected' : ''}>Todos</option>
          <option value="activos" ${state.filter === 'activos' ? 'selected' : ''}>Activos</option>
          <option value="inactivos" ${state.filter === 'inactivos' ? 'selected' : ''}>Inactivos</option>
        </select>
        <button class="button" data-new type="button">Nueva persona</button>
      </div>
      ${form}
      ${state.message ? `<p class="save-message">${escapeHtml(state.message)}</p>` : ''}
      <div class="card" style="padding:0;overflow:auto">
        <table class="data-table">
          <thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="empty-state">No hay personas.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  }

  root.addEventListener('input', (event) => {
    if (event.target.id === 'persona-search') {
      state.search = event.target.value;
      render();
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.id === 'persona-filter') {
      state.filter = event.target.value;
      render();
    }
  });

  root.addEventListener('click', async (event) => {
    const newBtn = event.target.closest('[data-new]');
    const cancel = event.target.closest('[data-cancel]');
    const edit = event.target.closest('[data-edit]');
    const toggle = event.target.closest('[data-toggle]');
    if (newBtn) {
      state.mode = 'create';
      state.draft = emptyDraft();
      render();
    }
    if (cancel) {
      state.mode = null;
      render();
    }
    if (edit) {
      const person = state.people.find((p) => String(p.id) === edit.dataset.edit);
      if (!person) return;
      state.mode = 'edit';
      state.draft = { ...person };
      render();
    }
    if (toggle) {
      const person = state.people.find((p) => String(p.id) === toggle.dataset.toggle);
      if (!person || person.isSystem) return;
      try {
        const data = await setPersonaActivo(person.id, !person.activo);
        if (data.ok === false) throw new Error(data.message || data.error);
        state.message = person.activo ? 'Persona desactivada.' : 'Persona activada.';
        await load();
      } catch (error) {
        state.error = error.message;
        render();
      }
    }
  });

  root.addEventListener('submit', async (event) => {
    if (event.target.id !== 'persona-form') return;
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = {
      id: state.draft.id,
      nombre: String(form.get('nombre') || '').trim(),
      categoria: form.get('categoria'),
    };
    try {
      const data =
        state.mode === 'edit' ? await updatePersona(payload) : await createPersona(payload);
      if (data.ok === false) throw new Error(data.message || data.error);
      state.mode = null;
      state.message = 'Guardado.';
      await load();
    } catch (error) {
      state.error = error.message;
      render();
    }
  });

  load();
}
