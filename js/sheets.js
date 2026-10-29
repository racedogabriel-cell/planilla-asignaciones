import { GOOGLE_ASSIGNMENTS_ENDPOINT } from './config.js';
import { NETWORK_TIMEOUT_MS } from './config.js';

export function normalizeWeekKey(value) {
  if (value == null || value === '') return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime()) && /GMT|UTC|Standard Time|T\d{2}:/i.test(text)) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return text;
}

function normalizeWeekRecord(week) {
  if (!week || typeof week !== 'object') return week;
  return {
    ...week,
    weekKey: normalizeWeekKey(week.weekKey),
    startDate: normalizeWeekKey(week.startDate) || week.startDate,
    endDate: normalizeWeekKey(week.endDate) || week.endDate,
  };
}

function normalizeWeeksPayload(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data.semanas)) data.semanas = data.semanas.map(normalizeWeekRecord);
  if (data.semana) data.semana = normalizeWeekRecord(data.semana);
  return data;
}

async function fetchJson(url, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('La operación tardó demasiado. Reintentá.');
    throw new Error('No hay conexión con el endpoint de Apps Script.');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`El endpoint respondió HTTP ${response.status}.`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('La respuesta del endpoint no es un JSON válido.');
  }
  return data;
}

function requireEndpoint() {
  if (!GOOGLE_ASSIGNMENTS_ENDPOINT) {
    throw new Error('El conector de Apps Script no está configurado (js/config.js).');
  }
}

function post(payload) {
  requireEndpoint();
  return fetchJson(GOOGLE_ASSIGNMENTS_ENDPOINT, {
    method: 'POST',
    mode: 'cors',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
}

export function isEndpointConfigured() {
  return Boolean(GOOGLE_ASSIGNMENTS_ENDPOINT);
}

export function ping() {
  requireEndpoint();
  return fetchJson(`${GOOGLE_ASSIGNMENTS_ENDPOINT}?action=ping`);
}

export function getConfig() {
  requireEndpoint();
  return fetchJson(`${GOOGLE_ASSIGNMENTS_ENDPOINT}?action=config`);
}

export function saveConfig(config) {
  return post({ action: 'saveConfig', config });
}

export function getPersonas() {
  requireEndpoint();
  return fetchJson(`${GOOGLE_ASSIGNMENTS_ENDPOINT}?action=personas`);
}

export function createPersona(persona) {
  return post({ action: 'createPersona', ...persona });
}

export function updatePersona(persona) {
  return post({ action: 'updatePersona', ...persona });
}

export function setPersonaActivo(id, activo) {
  return post({ action: 'setPersonaActivo', id, activo });
}

export async function getWorkspace(weekKey) {
  requireEndpoint();
  const key = normalizeWeekKey(weekKey);
  const q = key ? `&semana=${encodeURIComponent(key)}` : '';
  return normalizeWeeksPayload(await fetchJson(`${GOOGLE_ASSIGNMENTS_ENDPOINT}?action=workspace${q}`));
}

export async function getSemanas() {
  requireEndpoint();
  return normalizeWeeksPayload(await fetchJson(`${GOOGLE_ASSIGNMENTS_ENDPOINT}?action=semanas`));
}

export async function getSemana(weekKey) {
  requireEndpoint();
  const key = normalizeWeekKey(weekKey);
  return normalizeWeeksPayload(
    await fetchJson(`${GOOGLE_ASSIGNMENTS_ENDPOINT}?action=semana&semana=${encodeURIComponent(key)}`),
  );
}

export function importPrograma(payload) {
  return post({ action: 'importPrograma', ...payload });
}

export function saveAsignacion(weekKey, huecoClave, personaId) {
  return post({ action: 'saveAsignacion', weekKey: normalizeWeekKey(weekKey), huecoClave, personaId });
}

export function deleteSemana(weekKey) {
  return post({ action: 'deleteSemana', weekKey: normalizeWeekKey(weekKey) });
}
