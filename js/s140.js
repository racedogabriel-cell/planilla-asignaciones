/**
 * Hoja S-140 — paridad con MeetingDocumentBuilder + QuestPdf del escritorio.
 */
import { sectionLabel } from './slots.js';
import { escapeHtml } from './dom.js';

const COUNSEL_IDS = new Set(['BibleReading', 'MinistryDemo', 'MinistryTalk', 'ExplainBeliefs']);

export function weekProgress(week) {
  const total = Number(week.slotCount || week.slots?.length || 0);
  const filled = Number(
    week.filledCount ?? (week.slots || []).filter((slot) => slot.personaId).length,
  );
  const complete = total > 0 && filled >= total;
  return {
    filled,
    total,
    complete,
    statusText: complete ? '✓ Completa' : `Faltan ${Math.max(0, total - filled)} de ${total}`,
  };
}

function minutes(config, key, fallback) {
  const n = Number(config[key]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseClock(value) {
  const text = String(value || '19:00');
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 19 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatClock(total) {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function nameOf(people, id) {
  if (!id) return '';
  return people.get(String(id)) || '';
}

function meetingSlot(week, rol) {
  return (week.slots || []).find(
    (slot) => slot.rol === rol && (slot.partKey === 'meeting' || String(slot.huecoClave).startsWith('meeting|')),
  );
}

function durationLabel(mins) {
  if (mins == null) return '';
  return `\u00A0(${mins}\u00A0${mins === 1 ? 'min.' : 'mins.'})`;
}

function roleLabel(assignments) {
  if (!assignments.length) return '';
  const hasStudent = assignments.some((a) => a.etiqueta.startsWith('Estudiante'));
  const hasAssistant = assignments.some((a) => a.etiqueta.startsWith('Ayudante'));
  const hasConductor = assignments.some((a) => a.etiqueta.includes('Conductor'));
  const hasReader = assignments.some((a) => a.etiqueta.includes('Lector'));
  if (hasStudent && hasAssistant) return 'Estudiante/Ayudante:';
  if (hasConductor && hasReader) return 'Conductor/Lector:';
  if (hasStudent) return 'Estudiante:';
  if (assignments.length === 1) return `${assignments[0].etiqueta}:`;
  return '';
}

function namesForRoom(assignments, room) {
  const rank = (a) => {
    if (a.etiqueta.startsWith('Estudiante')) return 0;
    if (a.etiqueta.startsWith('Ayudante')) return 1;
    if (a.etiqueta.includes('Conductor')) return 2;
    if (a.etiqueta.includes('Lector')) return 3;
    return 4;
  };
  return assignments
    .filter((a) => (a.sala || 'Main') === room)
    .sort((a, b) => rank(a) - rank(b))
    .map((a) => a.nombre)
    .filter(Boolean)
    .join('/');
}

function songTitle(number) {
  return number != null && number !== '' ? `Canción ${number}` : 'Canción';
}

export function buildTimeline(week, people, config) {
  const songMin = minutes(config, 'MinCancion', 5);
  const introMin = minutes(config, 'MinIntro', 1);
  const closeMin = minutes(config, 'MinConclusion', 3);
  const counselMin = minutes(config, 'MinCorreccion', 1);
  let clock = parseClock(config.HoraInicio);
  const entries = [];

  const push = (entry) => {
    entries.push(entry);
    clock += entry.advance || 0;
  };

  push({
    kind: 'song',
    time: formatClock(clock),
    title: songTitle(week.openingSongNumber),
    role: 'Oración:',
    main: nameOf(people, meetingSlot(week, 'OpeningPrayer')?.personaId),
    advance: songMin,
  });
  push({
    kind: 'words',
    time: formatClock(clock),
    title: 'Palabras de introducción',
    duration: introMin,
    advance: introMin,
  });

  const parts = [...(week.parts || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.number ?? 0) - (b.number ?? 0),
  );
  let lastSection = '';
  let middleSong = false;

  parts.forEach((part) => {
    if (part.sectionType && part.sectionType !== lastSection) {
      entries.push({
        kind: 'banner',
        sectionType: part.sectionType,
        title: sectionLabel(part.sectionType),
      });
      lastSection = part.sectionType;
    }
    if (part.sectionType === 'LivingAsChristians' && !middleSong) {
      push({
        kind: 'song',
        time: formatClock(clock),
        title: songTitle(week.middleSongNumber),
        role: '',
        main: '',
        advance: songMin,
        sectionType: 'LivingAsChristians',
      });
      middleSong = true;
    }

    const assignments = (week.slots || [])
      .filter((slot) => slot.partKey === part.partKey)
      .map((slot) => ({
        etiqueta: slot.etiqueta,
        sala: slot.sala,
        nombre: nameOf(people, slot.personaId),
      }));
    const counsel = COUNSEL_IDS.has(part.functionalId) ? counselMin : 0;
    const title = part.number ? `${part.number}. ${part.title}` : part.title;
    push({
      kind: 'part',
      time: formatClock(clock),
      title,
      duration: part.durationMinutes,
      sectionType: part.sectionType,
      role: roleLabel(assignments),
      aux: namesForRoom(assignments, 'Auxiliary'),
      main: namesForRoom(assignments, 'Main'),
      advance: (part.durationMinutes || 0) + counsel,
    });
  });

  push({
    kind: 'words',
    time: formatClock(clock),
    title: 'Palabras de conclusión',
    duration: closeMin,
    sectionType: 'LivingAsChristians',
    advance: closeMin,
  });
  push({
    kind: 'song',
    time: formatClock(clock),
    title: songTitle(week.closingSongNumber),
    role: 'Oración:',
    main: nameOf(people, meetingSlot(week, 'ClosingPrayer')?.personaId),
    advance: songMin,
  });

  return entries;
}

const BANNER_IMG = {
  Treasures: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIj4oFAAIaAQ/+Ux55AAAAAElFTkSuQmCC',
  ApplyYourself: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPY18kAAANQAUhksPIkAAAAAElFTkSuQmCC',
  LivingAsChristians: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOoY1ABAAGiAKNFKWxiAAAAAElFTkSuQmCC',
};

function nameCell(text) {
  const value = String(text || '').replace(/\//g, '/\u200b');
  return `<td class="s140-name">${escapeHtml(value)}</td>`;
}

function peopleCells(role, aux, main, hasAux) {
  const label = role || '';
  if (!hasAux) {
    return `<td class="s140-role">${escapeHtml(label)}</td>${nameCell(main || '')}`;
  }
  return `<td class="s140-role">${escapeHtml(label)}</td>${nameCell(aux || '')}${nameCell(main || '')}`;
}

function bannerColor(sectionType) {
  if (sectionType === 'ApplyYourself') return '#BE8900';
  if (sectionType === 'LivingAsChristians') return '#7E0024';
  return '#575A5D';
}

function bannerCell(title, fill, sectionType, colspan) {
  const src = BANNER_IMG[sectionType] || BANNER_IMG.Treasures;
  return `<td class="s140-banner" colspan="${colspan}" bgcolor="${fill}">
      <div class="s140-banner-bar" style="background-color:${fill}">
        <img src="${src}" alt="">
        <span>${escapeHtml(title)}</span>
      </div>
    </td>`;
}

function renderRow(entry, hasAux) {
  if (entry.kind === 'banner') {
    const fill = bannerColor(entry.sectionType);
    const showRooms = hasAux && (entry.sectionType === 'Treasures' || entry.sectionType === 'ApplyYourself');
    const rooms = showRooms
      ? `<td class="s140-role"></td>
         <td class="s140-room" style="color:${fill}">Sala auxiliar</td>
         <td class="s140-room" style="color:${fill}">Auditorio principal</td>`
      : `<td colspan="${hasAux ? 3 : 2}"></td>`;
    return `<tr class="s140-banner-row">
      ${bannerCell(entry.title, fill, entry.sectionType, 2)}
      ${rooms}
    </tr>`;
  }

  const duration = entry.kind === 'part' || entry.kind === 'words' ? durationLabel(entry.duration) : '';
  const aux = entry.kind === 'part' ? entry.aux || '' : '';
  return `<tr class="s140-row">
    <td class="s140-time">${escapeHtml(entry.time || '')}</td>
    <td class="s140-title">${escapeHtml(entry.title || '')}${duration ? `<small>${escapeHtml(duration)}</small>` : ''}</td>
    ${peopleCells(entry.role || '', aux, entry.main || '', hasAux)}
  </tr>`;
}

export function renderS140Sheet(weeks, people, config) {
  const hasAux = String(config.SalaAuxiliar || '') === 'Sí';
  const congregation = config.Congregacion || '';
  const gap = minutes(config, 'EspacioReunionesMm', 6);
  const pages = [];
  for (let i = 0; i < weeks.length; i += 2) pages.push(weeks.slice(i, i + 2));

  return pages
    .map((pair) => {
      const blocks = pair
        .map((week, index) => {
          const chairman = nameOf(people, meetingSlot(week, 'Chairman')?.personaId);
          const auxCounselor = hasAux ? nameOf(people, meetingSlot(week, 'AuxiliaryCounselor')?.personaId) : '';
          const timeline = buildTimeline(week, people, config)
            .map((entry) => renderRow(entry, hasAux))
            .join('');
          const pad = index === 1 ? ` style="margin-top:${gap}mm"` : '';
          return `<article class="s140-week"${pad}>
            <header class="s140-head">
              <strong>${escapeHtml(congregation)}</strong>
              <span>Programa para la reunión de entre semana</span>
            </header>
            <table class="s140-grid" cellspacing="0" cellpadding="0">
              <colgroup>
                <col class="s140-col-time">
                <col class="s140-col-title">
                <col class="s140-col-role">
                ${hasAux ? '<col class="s140-col-name"><col class="s140-col-name">' : '<col class="s140-col-name">'}
              </colgroup>
              <tr class="s140-row s140-date">
                <td class="s140-time"></td>
                <td class="s140-title"><b>${escapeHtml(week.dateLabel || '')} | ${escapeHtml(week.bibleReading || '')}</b></td>
                <td class="s140-role">Presidente:</td>
                ${hasAux ? nameCell('') : ''}
                ${nameCell(chairman)}
              </tr>
              ${
                hasAux
                  ? `<tr class="s140-row">
                      <td class="s140-time"></td>
                      <td class="s140-title"></td>
                      <td class="s140-role">Consejero de la sala auxiliar:</td>
                      ${nameCell('')}
                      ${nameCell(auxCounselor)}
                    </tr>`
                  : ''
              }
              ${timeline}
            </table>
          </article>`;
        })
        .join('');
      return `<section class="s140-page${hasAux ? ' is-aux' : ''}">${blocks}<p class="s140-foot">S-140-S  11/20</p></section>`;
    })
    .join('');
}
