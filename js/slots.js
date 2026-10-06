/**
 * Generación de huecos — paridad con AssignmentSlotGenerator del escritorio.
 * Módulo: Semanas / Importar
 */

export const MEETING_ROLES = [
  { rol: 'Chairman', etiqueta: 'Presidente', sala: 'Main' },
  { rol: 'AuxiliaryCounselor', etiqueta: 'Consejero auxiliar', sala: 'Main', requiresAux: true },
  { rol: 'OpeningPrayer', etiqueta: 'Oración inicial', sala: 'Main' },
  { rol: 'ClosingPrayer', etiqueta: 'Oración final', sala: 'Main' },
];

function normalize(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .toUpperCase()
    .replace(/[Á]/g, 'A')
    .replace(/[É]/g, 'E')
    .replace(/[Í]/g, 'I')
    .replace(/[Ó]/g, 'O')
    .replace(/[ÚÜ]/g, 'U')
    .replace(/[Ñ]/g, 'N')
    .replace(/[¿?]/g, ' ');
}

export function hasDemonstrationFormat(title, detailText) {
  return normalize(`${title} ${detailText}`).includes('ESCENIFICACION');
}

function hueco(weekKey, partKey, rol, sala, etiqueta, sortOrder) {
  const keyPart = partKey || 'meeting';
  return {
    weekKey,
    partKey: partKey || '',
    rol,
    sala,
    etiqueta,
    sortOrder,
    huecoClave: `${keyPart}|${rol}|${sala}`,
  };
}

function addStudentRooms(slots, weekKey, partKey, hasAux, order) {
  slots.push(hueco(weekKey, partKey, 'Student', 'Main', 'Estudiante', order.value++));
  if (hasAux) slots.push(hueco(weekKey, partKey, 'Student', 'Auxiliary', 'Estudiante', order.value++));
}

function addStudentAssistantRooms(slots, weekKey, partKey, hasAux, order) {
  slots.push(hueco(weekKey, partKey, 'Student', 'Main', 'Estudiante', order.value++));
  slots.push(hueco(weekKey, partKey, 'Assistant', 'Main', 'Ayudante', order.value++));
  if (hasAux) {
    slots.push(hueco(weekKey, partKey, 'Student', 'Auxiliary', 'Estudiante', order.value++));
    slots.push(hueco(weekKey, partKey, 'Assistant', 'Auxiliary', 'Ayudante', order.value++));
  }
}

function slotsForPart(weekKey, part, hasAux, order) {
  const slots = [];
  const partKey = part.partKey;
  switch (part.functionalId) {
    case 'TreasuresTalk':
      slots.push(hueco(weekKey, partKey, 'Speaker', 'Main', 'Orador', order.value++));
      break;
    case 'SpiritualGems':
      slots.push(hueco(weekKey, partKey, 'SpiritualGemsConductor', 'Main', 'Conductor', order.value++));
      break;
    case 'BibleReading':
    case 'MinistryTalk':
      addStudentRooms(slots, weekKey, partKey, hasAux, order);
      break;
    case 'MinistryDemo':
      addStudentAssistantRooms(slots, weekKey, partKey, hasAux, order);
      break;
    case 'WhatDoYouSay':
      slots.push(hueco(weekKey, partKey, 'Speaker', 'Main', 'Orador', order.value++));
      break;
    case 'ExplainBeliefs':
      if (hasDemonstrationFormat(part.title, part.detailText)) {
        addStudentAssistantRooms(slots, weekKey, partKey, hasAux, order);
      } else {
        addStudentRooms(slots, weekKey, partKey, hasAux, order);
      }
      break;
    case 'LivingTalk':
    case 'LocalNeeds':
      slots.push(hueco(weekKey, partKey, 'Speaker', 'Main', 'Orador', order.value++));
      break;
    case 'CongregationBibleStudy':
      slots.push(hueco(weekKey, partKey, 'CbsConductor', 'Main', 'Conductor', order.value++));
      slots.push(hueco(weekKey, partKey, 'CbsReader', 'Main', 'Lector', order.value++));
      break;
    default:
      slots.push(hueco(weekKey, partKey, 'Speaker', 'Main', 'Asignado', order.value++));
  }
  return slots;
}

export function generateSlotsForWeek(week, hasAuxiliaryRoom) {
  const order = { value: 0 };
  const slots = [];
  MEETING_ROLES.forEach((role) => {
    if (role.requiresAux && !hasAuxiliaryRoom) return;
    slots.push(hueco(week.weekKey, 'meeting', role.rol, role.sala, role.etiqueta, order.value++));
  });
  const parts = [...(week.parts || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.number ?? 0) - (b.number ?? 0),
  );
  parts.forEach((part) => {
    slots.push(...slotsForPart(week.weekKey, part, hasAuxiliaryRoom, order));
  });
  return slots;
}

export function generateSlotsForPublication(publication, hasAuxiliaryRoom) {
  return (publication.weeks || []).flatMap((week) => generateSlotsForWeek(week, hasAuxiliaryRoom));
}

export function sectionClass(sectionType) {
  if (sectionType === 'Treasures') return 'is-treasures';
  if (sectionType === 'ApplyYourself') return 'is-apply';
  if (sectionType === 'LivingAsChristians') return 'is-living';
  return '';
}

export function sectionLabel(sectionType) {
  if (sectionType === 'Treasures') return 'TESOROS DE LA BIBLIA';
  if (sectionType === 'ApplyYourself') return 'SEAMOS MEJORES MAESTROS';
  if (sectionType === 'LivingAsChristians') return 'NUESTRA VIDA CRISTIANA';
  return sectionType || '';
}
