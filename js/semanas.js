/**
 * Módulo: Semanas
 * Objetivo: Editor de asignaciones por hueco
 * Estado: En desarrollo
 * Sprint: 1
 */
import { getWorkspace, isEndpointConfigured, saveAsignacion } from './sheets.js';
import { sectionClass, sectionLabel } from './slots.js';
import { escapeHtml, errorNotice, setupNotice } from './dom.js';

export function semanasView() {
  return `<div id="semanas-root"></div>`;
}

export function bindSemanas() {
  const root = document.querySelector('#semanas-root');
  if (!root) return;

  if (!isEndpointConfigured()) {
    root.innerHTML = setupNotice('Configurá js/config.js para listar semanas.');
    return;
  }

  const state = {
    weeks: [],
    people: [],
    selected: null,
    semana: null,
    error: '',
    message: '',
    busy: false,
  };

  function fold(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function personName(id) {
    if (!id) return '';
    return state.people.find((p) => String(p.id) === String(id))?.nombre || '';
  }

  function peopleForSlot(huecoClave) {
    const slot = state.semana?.slots.find((s) => s.huecoClave === huecoClave);
    return state.people.filter((p) => p.activo || String(p.id) === String(slot?.personaId || ''));
  }

  function matchesPerson(person, query) {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const name = fold(person.nombre);
    return words.every((word) => name.includes(word));
  }

  function picker(slot, kind) {
    if (!slot) return '';
    const name = personName(slot.personaId);
    const pending = slot.personaId ? '' : ' is-pending';
    const rowClass = kind === 'meeting' ? 'assignment-row is-meeting' : 'assignment-row';
    return `<div class="${rowClass}${pending}">
      <span class="label">${escapeHtml(slot.etiqueta)}</span>
      <div class="person-combo">
        <input
          class="field person-combo-input"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          aria-autocomplete="list"
          aria-expanded="false"
          placeholder="Escribí un nombre"
          data-slot="${escapeHtml(slot.huecoClave)}"
          data-id="${escapeHtml(slot.personaId || '')}"
          value="${escapeHtml(name)}"
        >
        <ul class="person-combo-list" hidden role="listbox"></ul>
      </div>
    </div>`;
  }

  function meetingSlot(rol) {
    return (state.semana?.slots || []).find(
      (slot) => slot.rol === rol && (slot.partKey === 'meeting' || String(slot.huecoClave).startsWith('meeting|')),
    );
  }

  function songLabel(number) {
    return number != null && number !== '' ? `Canción ${number}` : 'Canción';
  }

  function partMeta(part) {
    const text = String(part.detailText || '')
      .replace(/\(\s*\d+\s*mins?\.?\s*\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text || text.length > 140) return '';
    return `<div class="part-detail">${escapeHtml(text)}</div>`;
  }

  function partSlotsHtml(slots) {
    const rooms = [...new Set(slots.map((slot) => slot.sala || 'Main'))];
    const showRooms = rooms.includes('Main') && rooms.includes('Auxiliary');
    return rooms
      .sort((a, b) => (a === b ? 0 : a === 'Main' ? -1 : 1))
      .map((room) => {
        const group = slots.filter((slot) => (slot.sala || 'Main') === room);
        const heading = showRooms
          ? `<div class="room-label">${room === 'Auxiliary' ? 'Sala auxiliar' : 'Auditorio principal'}</div>`
          : '';
        return `${heading}<div class="part-slots">${group.map((slot) => picker(slot, 'part')).join('')}</div>`;
      })
      .join('');
  }

  function comboOptions(combo) {
    return [...combo.querySelectorAll('.person-combo-option[data-id]')];
  }

  function setActiveOption(combo, index) {
    const options = comboOptions(combo);
    if (!options.length) {
      combo.dataset.activeIndex = '-1';
      return;
    }
    const next = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, i) => option.classList.toggle('is-active', i === next));
    options[next].scrollIntoView({ block: 'nearest' });
    combo.dataset.activeIndex = String(next);
    if (combo.dataset.listFocus === '1') options[next].focus();
  }

  function fillComboList(combo, query) {
    const input = combo.querySelector('.person-combo-input');
    const list = combo.querySelector('.person-combo-list');
    const matches = peopleForSlot(input.dataset.slot).filter((p) => matchesPerson(p, query));
    const rows = [];
    if (!fold(query)) {
      rows.push('<li class="person-combo-option" role="option" tabindex="-1" data-id="">— Sin asignar</li>');
    }
    matches.forEach((person) => {
      rows.push(
        `<li class="person-combo-option" role="option" tabindex="-1" data-id="${escapeHtml(person.id)}">${escapeHtml(person.nombre)}</li>`,
      );
    });
    if (!matches.length && fold(query)) {
      rows.push('<li class="person-combo-empty">Sin coincidencias</li>');
    }
    list.innerHTML = rows.join('');
    const options = comboOptions(combo);
    const currentId = String(input.dataset.id || '');
    let active = 0;
    if (!fold(query)) {
      const assigned = options.findIndex((el) => el.dataset.id && el.dataset.id === currentId);
      active = assigned >= 0 ? assigned : options.findIndex((el) => el.dataset.id);
      if (active < 0) active = 0;
    }
    setActiveOption(combo, active);
  }

  function openCombo(combo, query) {
    const input = combo.querySelector('.person-combo-input');
    const list = combo.querySelector('.person-combo-list');
    fillComboList(combo, query);
    combo.classList.add('is-open');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function restoreInput(input) {
    if (!input) return;
    input.value = personName(input.dataset.id);
  }

  function closeCombo(combo, restore) {
    if (!combo) return;
    const input = combo.querySelector('.person-combo-input');
    const list = combo.querySelector('.person-combo-list');
    combo.classList.remove('is-open', 'is-list-focus');
    combo.dataset.listFocus = '';
    if (list) {
      list.hidden = true;
      list.innerHTML = '';
    }
    if (input) input.setAttribute('aria-expanded', 'false');
    if (restore) restoreInput(input);
  }

  function closeOtherCombos(except) {
    root.querySelectorAll('.person-combo.is-open').forEach((combo) => {
      if (combo !== except) closeCombo(combo, true);
    });
  }

  function editor() {
    if (!state.semana) {
      return `<div class="card empty-state">Elegí una semana o importá un JSON en Importar.</div>`;
    }
    const s = state.semana;
    const rest = s.slots.filter((x) => !(x.partKey === 'meeting' || String(x.huecoClave).startsWith('meeting|')));
    const byPart = new Map();
    [...s.parts]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.number ?? 0) - (b.number ?? 0))
      .forEach((part) => byPart.set(part.partKey, { part, slots: [] }));
    rest.forEach((slot) => {
      if (!byPart.has(slot.partKey)) {
        byPart.set(slot.partKey, { part: { title: slot.partKey, sectionType: '', sortOrder: 999 }, slots: [] });
      }
      byPart.get(slot.partKey).slots.push(slot);
    });

    let lastSection = '';
    const partsHtml = [...byPart.values()]
      .map(({ part, slots }) => {
        let prefix = '';
        if (part.sectionType && part.sectionType !== lastSection) {
          if (part.sectionType === 'LivingAsChristians') {
            prefix += `<p class="program-cue">${escapeHtml(songLabel(s.middleSongNumber))}</p>`;
          }
          lastSection = part.sectionType;
          prefix += `<div class="section-banner ${sectionClass(part.sectionType)}">${escapeHtml(sectionLabel(part.sectionType))}</div>`;
        }
        const mins = part.durationMinutes != null ? ` (${part.durationMinutes} min)` : '';
        return `${prefix}<div class="part-block">
          <div class="part-head">
            <h3>${part.number ? `${part.number}. ` : ''}${escapeHtml(part.title || '')}${escapeHtml(mins)}</h3>
          </div>
          ${partMeta(part)}
          ${partSlotsHtml(slots)}
        </div>`;
      })
      .join('');

    const filled = s.slots.filter((x) => x.personaId).length;
    return `<div class="card week-program">
      <div class="toolbar">
        <span></span>
        <span class="badge ${filled >= s.slots.length ? 'badge-ok' : 'badge-warn'}" data-progress>${filled} / ${s.slots.length}</span>
      </div>
      <div class="week-heading">
        <p class="eyebrow">Programa para la reunión</p>
        <h2>${escapeHtml(s.dateLabel)}</h2>
        <p>${escapeHtml(s.bibleReading || '')}</p>
      </div>
      <div class="section-banner is-treasures">REUNIÓN</div>
      ${picker(meetingSlot('Chairman'), 'meeting')}
      ${picker(meetingSlot('AuxiliaryCounselor'), 'meeting')}
      <p class="program-cue">${escapeHtml(songLabel(s.openingSongNumber))}  ·  Oración inicial</p>
      ${picker(meetingSlot('OpeningPrayer'), 'meeting')}
      ${partsHtml}
      <p class="program-cue is-closing">${escapeHtml(`Palabras de conclusión  ·  ${songLabel(s.closingSongNumber)}  ·  Oración final`)}</p>
      ${picker(meetingSlot('ClosingPrayer'), 'meeting')}
      <p class="save-message" data-save-status></p>
    </div>`;
  }

  function render() {
    const list = state.weeks
      .map((w) => {
        const current = state.selected === w.weekKey ? 'true' : 'false';
        const stats = `${w.filledCount || 0} / ${w.slotCount || 0}`;
        return `<button class="week-item" type="button" data-week="${escapeHtml(w.weekKey)}" aria-current="${current}">
          <strong>${escapeHtml(w.dateLabel || w.weekKey)}</strong>
          <span>${escapeHtml(w.bibleReading || '')} · ${escapeHtml(stats)}</span>
        </button>`;
      })
      .join('');

    root.innerHTML = `
      ${state.error ? errorNotice(state.error) : ''}
      <div class="semanas-layout">
        <div class="week-list">${list || '<p class="empty-state">Sin semanas. Usá Importar.</p>'}</div>
        <div class="week-editor-pane">${editor()}</div>
      </div>
    `;
  }

  function setStatus(text, isError) {
    const el = root.querySelector('[data-save-status]');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', Boolean(isError));
  }

  function refreshProgress() {
    if (!state.semana) return;
    const filled = state.semana.slots.filter((x) => x.personaId).length;
    const total = state.semana.slots.length;
    const badge = root.querySelector('[data-progress]');
    if (badge) {
      badge.textContent = `${filled} / ${total}`;
      badge.classList.toggle('badge-ok', filled >= total && total > 0);
      badge.classList.toggle('badge-warn', !(filled >= total && total > 0));
    }
    const week = state.weeks.find((w) => w.weekKey === state.selected);
    if (week) week.filledCount = filled;
    const item = root.querySelector(`[data-week="${CSS.escape(state.selected || '')}"] span`);
    if (item && week) {
      item.textContent = `${week.bibleReading || ''} · ${filled} / ${week.slotCount || total}`;
    }
    root.querySelectorAll('.assignment-row').forEach((row) => {
      const input = row.querySelector('.person-combo-input');
      row.classList.toggle('is-pending', !input?.dataset.id);
    });
  }

  async function assignSlot(huecoClave, personaId, input) {
    if (!state.selected || !state.semana) return;
    const slot = state.semana.slots.find((s) => s.huecoClave === huecoClave);
    const previous = slot?.personaId || null;
    const next = personaId || null;
    if (input) {
      input.dataset.id = next || '';
      input.value = personName(next);
    }
    closeCombo(input?.closest('.person-combo'), false);
    if (String(previous || '') === String(next || '')) return;
    if (slot) slot.personaId = next;
    refreshProgress();
    setStatus('Guardando…');
    try {
      const data = await saveAsignacion(state.selected, huecoClave, next);
      if (data.ok === false) throw new Error(data.message || data.error);
      setStatus('Guardado.');
    } catch (error) {
      if (slot) slot.personaId = previous;
      if (input) {
        input.dataset.id = previous || '';
        input.value = personName(previous);
      }
      refreshProgress();
      setStatus(error.message, true);
    }
  }

  function confirmCombo(combo) {
    const input = combo.querySelector('.person-combo-input');
    const active = combo.querySelector('.person-combo-option.is-active[data-id]');
    if (active) {
      assignSlot(input.dataset.slot, active.dataset.id, input);
      return true;
    }
    const query = input.value;
    const matches = peopleForSlot(input.dataset.slot).filter((p) => matchesPerson(p, query));
    if (!fold(query)) {
      assignSlot(input.dataset.slot, '', input);
      return true;
    }
    if (matches.length === 1) {
      assignSlot(input.dataset.slot, matches[0].id, input);
      return true;
    }
    const exact = matches.find((p) => fold(p.nombre) === fold(query));
    if (exact) {
      assignSlot(input.dataset.slot, exact.id, input);
      return true;
    }
    restoreInput(input);
    closeCombo(combo, false);
    setStatus('Elegí un nombre de la lista y presioná Enter.', true);
    return false;
  }

  function fieldContext(el) {
    const part = el.closest('.part-block');
    const row = el.closest('.assignment-row');
    let start = part || row;
    if (!start) return el;
    let prev = start.previousElementSibling;
    while (
      prev &&
      (prev.classList.contains('section-banner') || prev.classList.contains('program-cue'))
    ) {
      start = prev;
      prev = prev.previousElementSibling;
    }
    return start;
  }

  function keepFieldInView(el) {
    const context = fieldContext(el);
    const pane = root.querySelector('.week-editor-pane');
    if (pane) {
      const gap = 10;
      pane.scrollTop += context.getBoundingClientRect().top - pane.getBoundingClientRect().top - gap;
      return;
    }
    const topbar = document.querySelector('.topbar');
    const gap = (topbar ? topbar.getBoundingClientRect().bottom : 72) + 10;
    window.scrollBy({ top: context.getBoundingClientRect().top - gap, left: 0 });
  }

  function focusNeighborInput(input, backward) {
    const inputs = [...root.querySelectorAll('.person-combo-input')];
    const index = inputs.indexOf(input);
    const target = backward ? inputs[index - 1] : inputs[index + 1];
    if (!target) {
      input.blur();
      return;
    }
    window.requestAnimationFrame(() => {
      target.focus();
      target.select();
    });
  }

  function confirmAndAdvance(combo, backward) {
    const input = combo.querySelector('.person-combo-input');
    if (!confirmCombo(combo)) return;
    focusNeighborInput(input, backward);
  }

  function enterComboList(combo) {
    const input = combo.querySelector('.person-combo-input');
    if (!combo.classList.contains('is-open')) openCombo(combo, queryForOpen(input));
    const options = comboOptions(combo);
    if (!options.length) return false;
    combo.dataset.listFocus = '1';
    combo.classList.add('is-list-focus');
    const current = Number(combo.dataset.activeIndex || 0);
    setActiveOption(combo, current);
    return true;
  }

  async function loadWeek(weekKey) {
    state.busy = true;
    try {
      const data = await getWorkspace(weekKey);
      if (data.ok === false) throw new Error(data.message || data.error);
      if (data.semanas) state.weeks = data.semanas;
      if (data.personas) state.people = data.personas;
      state.selected = data.semana?.weekKey || weekKey;
      state.semana = data.semana || null;
      state.error = data.semana ? '' : data.message || 'No se pudo abrir esa semana.';
    } catch (error) {
      state.error = error.message;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function load() {
    try {
      const data = await getWorkspace(state.selected);
      if (data.ok === false) throw new Error(data.message || data.error);
      state.weeks = data.semanas || [];
      state.people = data.personas || [];
      state.semana = data.semana || null;
      state.selected = data.semana?.weekKey || state.weeks[0]?.weekKey || null;
      state.error = data.semana ? '' : data.message || '';
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }

  root.addEventListener('focusin', (event) => {
    const input = event.target.closest('.person-combo-input');
    if (!input) return;
    const combo = input.closest('.person-combo');
    closeOtherCombos(combo);
    keepFieldInView(input);
    input.select();
    openCombo(combo, '');
  });

  root.addEventListener('input', (event) => {
    const input = event.target.closest('.person-combo-input');
    if (!input) return;
    openCombo(input.closest('.person-combo'), input.value);
  });

  root.addEventListener('keydown', (event) => {
    const combo = event.target.closest('.person-combo');
    if (!combo) return;
    const input = combo.querySelector('.person-combo-input');
    const inList = combo.dataset.listFocus === '1' || Boolean(event.target.closest('.person-combo-option'));
    const current = Number(combo.dataset.activeIndex || 0);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!combo.classList.contains('is-open')) openCombo(combo, queryForOpen(input));
      else setActiveOption(combo, current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!combo.classList.contains('is-open')) openCombo(combo, queryForOpen(input));
      else setActiveOption(combo, current - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!combo.classList.contains('is-open')) openCombo(combo, queryForOpen(input));
      confirmAndAdvance(combo, false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeCombo(combo, true);
      input.blur();
    } else if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (inList) {
          event.preventDefault();
          combo.dataset.listFocus = '';
          combo.classList.remove('is-list-focus');
          input.focus();
          input.select();
        }
        return;
      }
      event.preventDefault();
      if (!inList) {
        if (!enterComboList(combo)) confirmAndAdvance(combo, false);
        return;
      }
      confirmAndAdvance(combo, false);
    }
  });

  root.addEventListener('mousedown', (event) => {
    if (event.target.closest('.person-combo-option[data-id]')) event.preventDefault();
  });

  function queryForOpen(input) {
    return input.value === personName(input.dataset.id) ? '' : input.value;
  }

  root.addEventListener('click', (event) => {
    const weekBtn = event.target.closest('[data-week]');
    if (weekBtn) {
      loadWeek(weekBtn.dataset.week);
      return;
    }
    const option = event.target.closest('.person-combo-option[data-id]');
    if (option) {
      const combo = option.closest('.person-combo');
      const input = combo.querySelector('.person-combo-input');
      assignSlot(input.dataset.slot, option.dataset.id, input);
      return;
    }
    const input = event.target.closest('.person-combo-input');
    if (input) {
      const combo = input.closest('.person-combo');
      closeOtherCombos(combo);
      if (!combo.classList.contains('is-open')) openCombo(combo, queryForOpen(input));
    }
  });

  root.addEventListener('focusout', (event) => {
    const combo = event.target.closest('.person-combo');
    if (!combo) return;
    const next = event.relatedTarget;
    if (next && combo.contains(next)) return;
    window.setTimeout(() => {
      if (!combo.contains(document.activeElement)) closeCombo(combo, true);
    }, 0);
  });

  load();
}
