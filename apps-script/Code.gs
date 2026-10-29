/**
 * Conector Apps Script — Planilla Asignaciones PWA
 * Instalación: docs en apps-script/README.md
 *
 * GET:  ping | config | personas | semanas | semana&semana=YYYY-MM-DD
 * POST: saveConfig | createPersona | updatePersona | setPersonaActivo
 *       importPrograma | saveAsignacion | deleteSemana
 */
const SPREADSHEET_ID = '124vmj5TaX1fuFT2SsvsA8o_i0qPHaivL5OkqR3_qHlg';

const SHEET_CONFIG = 'Config';
const SHEET_PERSONAS = 'Personas';
const SHEET_PROGRAMA = 'Programa';
const SHEET_ASIGNACIONES = 'Asignaciones';

const PERSONAS_HEADERS = ['ID', 'Nombre', 'Categoria', 'Activo', 'IsSystem', 'SystemKey'];
const CONFIG_HEADERS = ['Clave', 'Valor'];
const PROGRAMA_HEADERS = [
  'SemanaClave',
  'FechaEtiqueta',
  'FechaInicio',
  'FechaFin',
  'LecturaBiblia',
  'CancionApertura',
  'CancionIntermedia',
  'CancionCierre',
  'PublicacionTitulo',
  'PartKey',
  'SectionType',
  'Numero',
  'Titulo',
  'Minutos',
  'Detalle',
  'FunctionalId',
  'SortOrder',
];
const ASIGNACIONES_HEADERS = [
  'SemanaClave',
  'HuecoClave',
  'PartKey',
  'Rol',
  'Sala',
  'Etiqueta',
  'SortOrder',
  'PersonaID',
];

const CONFIG_DEFAULTS = {
  Congregacion: '',
  HoraInicio: '19:00',
  SalaAuxiliar: 'No',
  MinCancion: '5',
  MinIntro: '1',
  MinConclusion: '3',
  MinCorreccion: '1',
  EspacioReunionesMm: '6',
  Version: '1',
};

const CATEGORIAS = ['Elder', 'MinisterialServant', 'Publisher'];
const UNCONFIRMED_KEY = 'Unconfirmed';
const UNCONFIRMED_NAME = 'Sin confirmar';

function doGet(event) {
  const action = (event && event.parameter && event.parameter.action) || 'ping';
  try {
    if (action === 'ping') {
      return json_({ ok: true, service: 'planilla-asignaciones', generatedAt: new Date().toISOString() });
    }
    ensureSchemaOnce_();
    if (action === 'workspace') return json_(workspace_(event.parameter && event.parameter.semana));
    if (action === 'config') return json_(readConfig_());
    if (action === 'personas') return json_(listPersonas_());
    if (action === 'semanas') return json_(listSemanas_());
    if (action === 'semana') return json_(getSemana_(event.parameter && event.parameter.semana));
    return json_({
      ok: false,
      error: 'Acción no válida.',
      message: 'Usá ping | workspace | config | personas | semanas | semana',
    });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error), message: String(error.message || error) });
  }
}

function doPost(event) {
  try {
    const body = parseBody_(event);
    const action = String(body.action || '').trim();
    if (action === 'saveAsignacion') {
      return json_(saveAsignacion_(body));
    }
    ensureSchemaOnce_();
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) {
      return json_({ ok: false, error: 'No se pudo obtener el bloqueo.', message: 'Reintentá en unos segundos.' });
    }
    try {
      if (action === 'saveConfig') return json_(saveConfig_(body));
      if (action === 'createPersona') return json_(createPersona_(body));
      if (action === 'updatePersona') return json_(updatePersona_(body));
      if (action === 'setPersonaActivo') return json_(setPersonaActivo_(body));
      if (action === 'importPrograma') return json_(importPrograma_(body));
      if (action === 'deleteSemana') return json_(deleteSemana_(body));
      return json_({ ok: false, error: 'Acción no válida.', message: 'action desconocida.' });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error), message: String(error.message || error) });
  }
}

function parseBody_(event) {
  const raw = event && event.postData && event.postData.contents;
  if (!raw) throw new Error('Cuerpo POST vacío.');
  return JSON.parse(raw);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

var SS_CACHE_ = null;

function spreadsheet_() {
  if (SS_CACHE_) return SS_CACHE_;
  const id = String(SPREADSHEET_ID || '').trim();
  if (!id) {
    throw new Error('Completá SPREADSHEET_ID en Code.gs con el ID de la planilla.');
  }
  SS_CACHE_ = SpreadsheetApp.openById(id);
  return SS_CACHE_;
}

function ensureSchemaOnce_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SCHEMA_READY') === '1') return;
  const ss = spreadsheet_();
  ensureSheet_(ss, SHEET_CONFIG, CONFIG_HEADERS);
  ensureSheet_(ss, SHEET_PERSONAS, PERSONAS_HEADERS);
  ensureSheet_(ss, SHEET_PROGRAMA, PROGRAMA_HEADERS);
  ensureSheet_(ss, SHEET_ASIGNACIONES, ASIGNACIONES_HEADERS);
  seedConfig_(ss);
  seedUnconfirmed_(ss);
  props.setProperty('SCHEMA_READY', '1');
}

function workspace_(weekKeyRaw) {
  const list = listSemanas_();
  const personas = listPersonas_();
  const wanted = isoDate_(weekKeyRaw);
  const weekKey = wanted || (list.semanas[0] && list.semanas[0].weekKey) || '';
  let semana = null;
  let message = '';
  if (weekKey) {
    try {
      semana = getSemana_(weekKey).semana;
    } catch (error) {
      message = String(error.message || error);
    }
  }
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    semanas: list.semanas,
    personas: personas.personas,
    semana,
    message,
  };
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const mismatch = headers.some((h, i) => String(existing[i] || '').trim() !== h);
  if (mismatch) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function seedConfig_(ss) {
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  const map = configMap_(sheet);
  const rows = [];
  Object.keys(CONFIG_DEFAULTS).forEach((key) => {
    if (!(key in map)) rows.push([key, CONFIG_DEFAULTS[key]]);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 2).setValues(rows);
}

function seedUnconfirmed_(ss) {
  const sheet = ss.getSheetByName(SHEET_PERSONAS);
  const values = dataRows_(sheet, PERSONAS_HEADERS.length);
  const exists = values.some((row) => String(row[5] || '').trim() === UNCONFIRMED_KEY);
  if (exists) return;
  const id = nextPersonaId_(values);
  sheet.appendRow([id, UNCONFIRMED_NAME, 'Publisher', 'Sí', 'Sí', UNCONFIRMED_KEY]);
}

function tz_() {
  try {
    return spreadsheet_().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  } catch (error) {
    return Session.getScriptTimeZone();
  }
}

function isoDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, tz_(), 'yyyy-MM-dd');
  }
  const text = String(value == null ? '' : value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (text && !isNaN(parsed.getTime()) && /GMT|Standard Time|UTC/i.test(text)) {
    return Utilities.formatDate(parsed, tz_(), 'yyyy-MM-dd');
  }
  return text;
}

function sameWeek_(a, b) {
  const left = isoDate_(a);
  const right = isoDate_(b);
  return left && right && left === right;
}

function displayConfigValue_(key, value) {
  if (value instanceof Date) {
    if (key === 'HoraInicio') {
      const hh = String(value.getHours()).padStart(2, '0');
      const mm = String(value.getMinutes()).padStart(2, '0');
      return hh + ':' + mm;
    }
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = String(value ?? '');
  if (key === 'HoraInicio' && /GMT|Standard Time|1899/.test(text)) {
    const match = text.match(/\b(\d{1,2}):(\d{2}):\d{2}\b/);
    if (match) return String(match[1]).padStart(2, '0') + ':' + match[2];
  }
  return text;
}

function configMap_(sheet) {
  const values = dataRows_(sheet, 2);
  const map = {};
  values.forEach((row) => {
    const key = String(row[0] || '').trim();
    if (key) map[key] = displayConfigValue_(key, row[1]);
  });
  return map;
}

function readConfig_() {
  const sheet = spreadsheet_().getSheetByName(SHEET_CONFIG);
  const map = configMap_(sheet);
  Object.keys(CONFIG_DEFAULTS).forEach((key) => {
    if (!(key in map)) map[key] = CONFIG_DEFAULTS[key];
  });
  return { ok: true, generatedAt: new Date().toISOString(), config: map };
}

function saveConfig_(body) {
  const config = body.config || {};
  const sheet = spreadsheet_().getSheetByName(SHEET_CONFIG);
  const allowed = Object.keys(CONFIG_DEFAULTS);
  allowed.forEach((key) => {
    if (!(key in config)) return;
    let value = String(config[key] ?? '').trim();
    if (key === 'SalaAuxiliar') value = isYes_(value) ? 'Sí' : 'No';
    if (key === 'HoraInicio') value = displayConfigValue_('HoraInicio', value);
    upsertConfig_(sheet, key, value);
  });
  return readConfig_();
}

function upsertConfig_(sheet, key, value) {
  const values = dataRows_(sheet, 2);
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === key) {
      const cell = sheet.getRange(i + 2, 2);
      cell.setNumberFormat('@');
      cell.setValue(value);
      return;
    }
  }
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 2).setNumberFormat('@').setValues([[key, value]]);
}

function listPersonas_() {
  const sheet = spreadsheet_().getSheetByName(SHEET_PERSONAS);
  const values = dataRows_(sheet, PERSONAS_HEADERS.length);
  const personas = values.map(rowToPersona_).filter(Boolean);
  return { ok: true, generatedAt: new Date().toISOString(), personas };
}

function rowToPersona_(row) {
  const id = String(row[0] || '').trim();
  const nombre = String(row[1] || '').trim();
  if (!id || !nombre) return null;
  return {
    id,
    nombre,
    categoria: normalizeCategoria_(row[2]),
    activo: isYes_(row[3]),
    isSystem: isYes_(row[4]),
    systemKey: String(row[5] || '').trim() || null,
  };
}

function createPersona_(body) {
  const nombre = String(body.nombre || '').trim();
  if (!nombre) throw new Error('El nombre es obligatorio.');
  const categoria = normalizeCategoria_(body.categoria);
  const sheet = spreadsheet_().getSheetByName(SHEET_PERSONAS);
  const values = dataRows_(sheet, PERSONAS_HEADERS.length);
  const dup = values.some(
    (row) =>
      String(row[1] || '').trim().toLowerCase() === nombre.toLowerCase() && !isYes_(row[4]),
  );
  if (dup) throw new Error('Ya existe una persona con ese nombre.');
  const id = nextPersonaId_(values);
  sheet.appendRow([id, nombre, categoria, 'Sí', 'No', '']);
  return { ok: true, persona: rowToPersona_([id, nombre, categoria, 'Sí', 'No', '']) };
}

function updatePersona_(body) {
  const id = String(body.id || '').trim();
  if (!id) throw new Error('Falta id.');
  const sheet = spreadsheet_().getSheetByName(SHEET_PERSONAS);
  const found = findPersonaRow_(sheet, id);
  if (!found) throw new Error('Persona no encontrada.');
  if (isYes_(found.row[4])) throw new Error('Las personas de sistema no se pueden editar.');
  const nombre = String(body.nombre || '').trim();
  if (!nombre) throw new Error('El nombre es obligatorio.');
  const categoria = normalizeCategoria_(body.categoria);
  sheet.getRange(found.index, 2, 1, 2).setValues([[nombre, categoria]]);
  return { ok: true, persona: rowToPersona_([id, nombre, categoria, found.row[3], 'No', '']) };
}

function setPersonaActivo_(body) {
  const id = String(body.id || '').trim();
  if (!id) throw new Error('Falta id.');
  const sheet = spreadsheet_().getSheetByName(SHEET_PERSONAS);
  const found = findPersonaRow_(sheet, id);
  if (!found) throw new Error('Persona no encontrada.');
  if (isYes_(found.row[4])) throw new Error('Las personas de sistema no se desactivan.');
  const activo = body.activo === true || isYes_(body.activo) ? 'Sí' : 'No';
  sheet.getRange(found.index, 4).setValue(activo);
  return { ok: true, persona: rowToPersona_([found.row[0], found.row[1], found.row[2], activo, found.row[4], found.row[5]]) };
}

function findPersonaRow_(sheet, id) {
  const values = dataRows_(sheet, PERSONAS_HEADERS.length);
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === id) return { index: i + 2, row: values[i] };
  }
  return null;
}

function nextPersonaId_(values) {
  let max = 0;
  values.forEach((row) => {
    const n = Number(row[0]);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

function listSemanas_() {
  const programa = dataRows_(spreadsheet_().getSheetByName(SHEET_PROGRAMA), PROGRAMA_HEADERS.length);
  const asignaciones = dataRows_(spreadsheet_().getSheetByName(SHEET_ASIGNACIONES), ASIGNACIONES_HEADERS.length);
  const byWeek = {};
  function ensureWeek_(key, seed) {
    if (!byWeek[key]) {
      byWeek[key] = {
        weekKey: key,
        dateLabel: seed.dateLabel || key,
        startDate: seed.startDate || '',
        endDate: seed.endDate || '',
        bibleReading: seed.bibleReading || '',
        title: seed.title || '',
        partCount: 0,
        slotCount: 0,
        filledCount: 0,
      };
    }
  }
  programa.forEach((row) => {
    const key = isoDate_(row[0]);
    if (!key) return;
    ensureWeek_(key, {
      dateLabel: String(row[1] || ''),
      startDate: isoDate_(row[2]),
      endDate: isoDate_(row[3]),
      bibleReading: String(row[4] || ''),
      title: String(row[8] || ''),
    });
    byWeek[key].partCount += 1;
  });
  asignaciones.forEach((row) => {
    const key = isoDate_(row[0]);
    if (!key) return;
    ensureWeek_(key, {});
    byWeek[key].slotCount += 1;
    if (String(row[7] || '').trim()) byWeek[key].filledCount += 1;
  });
  const semanas = Object.keys(byWeek)
    .sort()
    .map((k) => byWeek[k]);
  return { ok: true, generatedAt: new Date().toISOString(), semanas };
}

function getSemana_(weekKeyRaw) {
  const weekKey = isoDate_(weekKeyRaw);
  if (!weekKey) throw new Error('Indicá una semana.');
  const programaRows = dataRows_(spreadsheet_().getSheetByName(SHEET_PROGRAMA), PROGRAMA_HEADERS.length).filter(
    (row) => sameWeek_(row[0], weekKey),
  );
  if (!programaRows.length) throw new Error('Semana no encontrada.');
  const first = programaRows[0];
  const parts = programaRows
    .map((row) => ({
      partKey: String(row[9] || ''),
      sectionType: String(row[10] || ''),
      number: row[11] === '' || row[11] == null ? null : Number(row[11]),
      title: String(row[12] || ''),
      durationMinutes: row[13] === '' || row[13] == null ? null : Number(row[13]),
      detailText: String(row[14] || ''),
      functionalId: String(row[15] || 'Other'),
      sortOrder: Number(row[16] || 0),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const slots = dataRows_(spreadsheet_().getSheetByName(SHEET_ASIGNACIONES), ASIGNACIONES_HEADERS.length)
    .filter((row) => sameWeek_(row[0], weekKey))
    .map((row) => ({
      huecoClave: String(row[1] || ''),
      partKey: String(row[2] || ''),
      rol: String(row[3] || ''),
      sala: String(row[4] || ''),
      etiqueta: String(row[5] || ''),
      sortOrder: Number(row[6] || 0),
      personaId: String(row[7] || '').trim() || null,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    semana: {
      weekKey,
      dateLabel: String(first[1] || ''),
      startDate: isoDate_(first[2]),
      endDate: isoDate_(first[3]),
      bibleReading: String(first[4] || ''),
      openingSongNumber: first[5] === '' || first[5] == null ? null : Number(first[5]),
      middleSongNumber: first[6] === '' || first[6] == null ? null : Number(first[6]),
      closingSongNumber: first[7] === '' || first[7] == null ? null : Number(first[7]),
      title: String(first[8] || ''),
      parts,
      slots,
    },
  };
}

function importPrograma_(body) {
  const publication = body.publication;
  const slots = Array.isArray(body.slots) ? body.slots : [];
  if (!publication || !Array.isArray(publication.weeks) || !publication.weeks.length) {
    throw new Error('Falta publication.weeks.');
  }
  if (Number(publication.version) !== 1) throw new Error('version debe ser 1.');
  const ss = spreadsheet_();
  const progSheet = ss.getSheetByName(SHEET_PROGRAMA);
  const asgSheet = ss.getSheetByName(SHEET_ASIGNACIONES);
  const weekKeys = publication.weeks.map((w) => isoDate_(w.weekKey));
  weekKeys.forEach((key) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('weekKey inválido: ' + key);
  });
  deleteWeeks_(progSheet, PROGRAMA_HEADERS.length, 0, weekKeys);
  deleteWeeks_(asgSheet, ASIGNACIONES_HEADERS.length, 0, weekKeys);

  const progRows = [];
  publication.weeks.forEach((week) => {
    const weekKey = isoDate_(week.weekKey);
    const parts = Array.isArray(week.parts) ? week.parts : [];
    parts.forEach((part, idx) => {
      progRows.push([
        weekKey,
        String(week.dateLabel || ''),
        String(week.startDate || ''),
        String(week.endDate || ''),
        String(week.bibleReading || ''),
        week.openingSongNumber == null ? '' : week.openingSongNumber,
        week.middleSongNumber == null ? '' : week.middleSongNumber,
        week.closingSongNumber == null ? '' : week.closingSongNumber,
        String(publication.title || ''),
        String(part.partKey || ''),
        String(part.sectionType || 'Unknown'),
        part.number == null ? '' : part.number,
        String(part.title || ''),
        part.durationMinutes == null ? '' : part.durationMinutes,
        String(part.detailText || ''),
        String(part.functionalId || 'Other'),
        part.sortOrder == null ? idx : part.sortOrder,
      ]);
    });
  });
  const asgRows = slots.map((slot) => [
    isoDate_(slot.weekKey),
    String(slot.huecoClave || ''),
    String(slot.partKey || ''),
    String(slot.rol || ''),
    String(slot.sala || 'Main'),
    String(slot.etiqueta || ''),
    slot.sortOrder == null ? 0 : slot.sortOrder,
    '',
  ]);
  if (progRows.length) {
    const start = progSheet.getLastRow() + 1;
    const range = progSheet.getRange(start, 1, progRows.length, PROGRAMA_HEADERS.length);
    range.setNumberFormat('@');
    range.setValues(progRows);
  }
  if (asgRows.length) {
    const start = asgSheet.getLastRow() + 1;
    const range = asgSheet.getRange(start, 1, asgRows.length, ASIGNACIONES_HEADERS.length);
    range.setNumberFormat('@');
    range.setValues(asgRows);
  }
  return { ok: true, importedWeeks: weekKeys.length, parts: progRows.length, slots: asgRows.length };
}

function deleteSemana_(body) {
  const weekKey = isoDate_(body.weekKey);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) throw new Error('Indicá una semana válida.');
  const ss = spreadsheet_();
  const progSheet = ss.getSheetByName(SHEET_PROGRAMA);
  const asgSheet = ss.getSheetByName(SHEET_ASIGNACIONES);
  if (!progSheet || !asgSheet) throw new Error('Faltan las hojas del programa.');
  const exists = dataRows_(progSheet, PROGRAMA_HEADERS.length).some((row) => sameWeek_(row[0], weekKey));
  if (!exists) throw new Error('No se encontró esa semana.');
  deleteWeeks_(progSheet, PROGRAMA_HEADERS.length, 0, [weekKey]);
  deleteWeeks_(asgSheet, ASIGNACIONES_HEADERS.length, 0, [weekKey]);
  return { ok: true, weekKey };
}

function deleteWeeks_(sheet, width, keyCol, weekKeys) {
  const values = dataRows_(sheet, width);
  if (!values.length) return;
  const keep = values.filter((row) => weekKeys.every((key) => !sameWeek_(row[keyCol], key)));
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, width).clearContent();
  if (keep.length) sheet.getRange(2, 1, keep.length, width).setValues(keep);
}

function saveAsignacion_(body) {
  const weekKey = isoDate_(body.weekKey);
  const huecoClave = String(body.huecoClave || '').trim();
  if (!weekKey || !huecoClave) throw new Error('Faltan weekKey o huecoClave.');
  const personaId = body.personaId == null || body.personaId === '' ? '' : String(body.personaId).trim();
  const sheet = spreadsheet_().getSheetByName(SHEET_ASIGNACIONES);
  if (!sheet) throw new Error('Falta la hoja Asignaciones.');
  const last = sheet.getLastRow();
  if (last < 2) throw new Error('Hueco no encontrado.');
  const keys = sheet.getRange(2, 1, last - 1, 2).getValues();
  for (let i = 0; i < keys.length; i++) {
    if (sameWeek_(keys[i][0], weekKey) && String(keys[i][1] || '').trim() === huecoClave) {
      sheet.getRange(i + 2, 8).setValue(personaId);
      return { ok: true, weekKey, huecoClave, personaId: personaId || null };
    }
  }
  throw new Error('Hueco no encontrado.');
}

function dataRows_(sheet, width) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, width).getValues();
}

function isYes_(value) {
  const t = String(value ?? '')
    .trim()
    .toLowerCase();
  return t === 'sí' || t === 'si' || t === 'true' || t === '1' || t === 'yes';
}

function normalizeCategoria_(value) {
  const t = String(value || '').trim();
  if (CATEGORIAS.indexOf(t) >= 0) return t;
  const n = t.toLowerCase();
  if (n === 'anciano' || n === 'elder') return 'Elder';
  if (n.indexOf('siervo') >= 0 || n === 'ministerialservant') return 'MinisterialServant';
  return 'Publisher';
}
