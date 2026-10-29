/**
 * Parser EPUB de la Guía de actividades (Vida y Ministerio).
 * Port del escritorio Vmc.Infrastructure.Epub.EpubParser.
 * No persiste el EPUB ni el XHTML: solo el JSON de programa.
 */
import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

const DURATION_RE = /\((\d+)\s*mins?\.\s*\)/i;
const SONG_RE = /Canci[oó]n\s*(\d+)/i;
const NUMBERED_RE = /^(\d+)\.\s*(.+)$/;
const MONTHS = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

function cleanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value) {
  return cleanText(value)
    .toUpperCase()
    .replace(/[Á]/g, 'A')
    .replace(/[É]/g, 'E')
    .replace(/[Í]/g, 'I')
    .replace(/[Ó]/g, 'O')
    .replace(/[ÚÜ]/g, 'U')
    .replace(/[Ñ]/g, 'N')
    .replace(/[¿?]/g, ' ');
}

export function resolveFunctionalId(sectionType, title, detailText) {
  const titleNorm = normalize(title);
  if (sectionType === 'Treasures') {
    if (titleNorm.includes('BUSQUEMOS PERLAS')) return 'SpiritualGems';
    if (titleNorm.includes('LECTURA DE LA BIBLIA')) return 'BibleReading';
    return 'TreasuresTalk';
  }
  if (sectionType === 'ApplyYourself') {
    if (titleNorm.includes('QUE DIRIA')) return 'WhatDoYouSay';
    if (titleNorm.includes('EXPLIQUE SUS CREENCIAS')) return 'ExplainBeliefs';
    if (titleNorm.includes('DISCURSO')) return 'MinistryTalk';
    if (
      titleNorm.includes('EMPIECE CONVERSACIONES')
      || titleNorm.includes('HAGA REVISITAS')
      || titleNorm.includes('HAGA DISCIPULOS')
    ) {
      return 'MinistryDemo';
    }
    return 'MinistryDemo';
  }
  if (sectionType === 'LivingAsChristians') {
    if (titleNorm.includes('ESTUDIO BIBLICO DE LA CONGREGACION')) return 'CongregationBibleStudy';
    if (titleNorm.includes('NECESIDADES DE LA CONGREGACION')) return 'LocalNeeds';
    return 'LivingTalk';
  }
  return 'Other';
}

function zipFile(zip, path) {
  if (!path) return null;
  const normalized = path.replace(/\\/g, '/').replace(/^\//, '');
  return (
    zip.file(normalized)
    || zip.file(decodeURIComponent(normalized))
    || Object.values(zip.files).find((f) => !f.dir && f.name.replace(/\\/g, '/').toLowerCase() === normalized.toLowerCase())
    || null
  );
}

function fileName(path) {
  const name = String(path || '').replace(/\\/g, '/').split('/').pop() || '';
  return name.split('#')[0];
}

function combineZipPath(directory, relative) {
  const rel = String(relative || '').replace(/\\/g, '/');
  if (!directory) return rel;
  return `${directory.replace(/\/$/, '')}/${rel}`;
}

function dirName(path) {
  const normalized = String(path || '').replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx < 0 ? '' : normalized.slice(0, idx);
}

function isWeekDocument(href) {
  const name = fileName(href);
  if (!name) return false;
  const lower = name.toLowerCase();
  if (lower.includes('-extracted')) return false;
  if (lower.startsWith('pagenav')) return false;
  if (lower === 'cover.xhtml' || lower === 'toc.xhtml') return false;
  return lower.endsWith('.xhtml') || lower.endsWith('.html');
}

function parseXml(text) {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function parseHtml(text) {
  return new DOMParser().parseFromString(text, 'text/html');
}

function xmlAttr(el, name) {
  return el?.getAttribute?.(name) || '';
}

async function readOpfPath(zip) {
  const containerFile = zipFile(zip, 'META-INF/container.xml');
  if (!containerFile) throw new Error('El archivo no es un EPUB válido (falta container.xml).');
  const xml = parseXml(await containerFile.async('string'));
  const rootfile = xml.getElementsByTagName('rootfile')[0];
  const fullPath = xmlAttr(rootfile, 'full-path');
  if (!fullPath) throw new Error('No se pudo resolver el OPF del EPUB.');
  return fullPath.replace(/\\/g, '/');
}

async function readWeekHrefs(zip, opfDir, opfDoc) {
  const items = [...opfDoc.getElementsByTagName('item')];
  const tocItem = items.find((item) => {
    const props = xmlAttr(item, 'properties').toLowerCase();
    const id = xmlAttr(item, 'id').toLowerCase();
    return props.includes('nav') || id === 'toc';
  });
  const tocHref = xmlAttr(tocItem, 'href');
  if (tocHref) {
    const tocFile = zipFile(zip, combineZipPath(opfDir, tocHref)) || zipFile(zip, tocHref);
    if (tocFile) {
      const tocDoc = parseXml(await tocFile.async('string'));
      const hrefs = [...tocDoc.getElementsByTagName('a')]
        .map((a) => (xmlAttr(a, 'href') || '').split('#')[0].replace(/\\/g, '/'))
        .filter(isWeekDocument);
      const unique = [...new Set(hrefs.map((h) => h.toLowerCase()))].map((lower) =>
        hrefs.find((h) => h.toLowerCase() === lower),
      );
      if (unique.length) return unique;
    }
  }

  const manifest = {};
  items.forEach((item) => {
    const id = xmlAttr(item, 'id');
    if (id) manifest[id.toLowerCase()] = xmlAttr(item, 'href').replace(/\\/g, '/');
  });
  return [...opfDoc.getElementsByTagName('itemref')]
    .map((ref) => manifest[xmlAttr(ref, 'idref').toLowerCase()])
    .filter(isWeekDocument)
    .filter((href, i, arr) => arr.findIndex((h) => h.toLowerCase() === href.toLowerCase()) === i);
}

function isSectionHeader(el) {
  const className = el.className || '';
  const html = el.outerHTML || '';
  const hasGem = /dc-icon--gem/i.test(className) || /dc-icon--gem/i.test(html);
  const hasWheat = /dc-icon--wheat/i.test(className) || /dc-icon--wheat/i.test(html);
  const hasSheep = /dc-icon--sheep/i.test(className) || /dc-icon--sheep/i.test(html);
  if (!hasGem && !hasWheat && !hasSheep) {
    if (el.tagName === 'H2') {
      const t = cleanText(el.textContent);
      if (/TESOROS DE LA BIBLIA/i.test(t)) return { type: 'Treasures', title: t };
      if (/SEAMOS MEJORES MAESTROS/i.test(t)) return { type: 'ApplyYourself', title: t };
      if (/NUESTRA VIDA CRISTIANA/i.test(t)) return { type: 'LivingAsChristians', title: t };
    }
    return null;
  }
  const heading = el.querySelector('h2') || el;
  let title = cleanText(heading.textContent);
  if (hasGem) return { type: 'Treasures', title: title || 'TESOROS DE LA BIBLIA' };
  if (hasWheat) return { type: 'ApplyYourself', title: title || 'SEAMOS MEJORES MAESTROS' };
  return { type: 'LivingAsChristians', title: title || 'NUESTRA VIDA CRISTIANA' };
}

function extractDuration(text) {
  const match = DURATION_RE.exec(text || '');
  return match ? Number(match[1]) : null;
}

function monthOf(name) {
  return MONTHS[normalize(name)] || 0;
}

function parseDateRange(dateLabel, year) {
  const monthName = '([A-ZÁÉÍÓÚÑ]+)';
  const yearPart = '(?:\\s+DE\\s+(20\\d{2}))?';
  const sameMonth = new RegExp(`^(\\d+)\\s*[-–—]\\s*(\\d+)\\s+DE\\s+${monthName}${yearPart}`, 'i').exec(dateLabel);
  if (sameMonth) {
    const month = monthOf(sameMonth[3]);
    if (month) {
      const y = sameMonth[4] ? Number(sameMonth[4]) : year;
      return {
        startDate: isoDate(y, month, Number(sameMonth[1])),
        endDate: isoDate(y, month, Number(sameMonth[2])),
      };
    }
  }
  const cross = new RegExp(
    `^(\\d+)\\s+DE\\s+${monthName}${yearPart}\\s+A\\s+(\\d+)\\s+DE\\s+${monthName}${yearPart}`,
    'i',
  ).exec(dateLabel);
  if (cross) {
    const m1 = monthOf(cross[2]);
    const m2 = monthOf(cross[5]);
    if (m1 && m2) {
      const y1 = cross[3] ? Number(cross[3]) : year;
      const y2 = cross[6] ? Number(cross[6]) : m2 < m1 ? y1 + 1 : y1;
      return {
        startDate: isoDate(y1, m1, Number(cross[1])),
        endDate: isoDate(y2, m2, Number(cross[4])),
      };
    }
  }
  return { startDate: '', endDate: '' };
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildPart(titleElement, numbered, partOrder, sectionType) {
  const number = Number(numbered[1]);
  const title = numbered[2].trim();
  const chunks = [];
  let sibling = titleElement.nextElementSibling;
  let guard = 0;
  while (sibling && guard++ < 8) {
    if (sibling.tagName === 'H2' || sibling.tagName === 'H3') break;
    const cls = sibling.className || '';
    if (/dc-icon--(gem|wheat|sheep)/i.test(cls)) break;
    const chunk = cleanText(sibling.textContent);
    if (chunk) chunks.push(chunk);
    sibling = sibling.nextElementSibling;
  }
  const detailText = chunks.join(' ');
  const durationMinutes = extractDuration(detailText) ?? extractDuration(cleanText(titleElement.textContent));
  const functionalId = resolveFunctionalId(sectionType, title, detailText);
  return {
    partKey: `${number}-${functionalId.toLowerCase()}`,
    sectionType,
    number,
    title,
    durationMinutes,
    detailText,
    functionalId,
    sortOrder: partOrder,
  };
}

function parseWeek(html, documentFile, sequence, year) {
  const document = parseHtml(html);
  const h1 = document.querySelector('header h1') || document.querySelector('h1');
  const dateLabel = cleanText(h1?.textContent);
  if (!dateLabel) return null;
  if (/Guía de actividades/i.test(dateLabel) || /Vida y Ministerio/i.test(dateLabel)) return null;

  const h2 = document.querySelector('header h2') || document.querySelector('h2');
  const bibleReading = cleanText(h2?.textContent);
  const dates = parseDateRange(dateLabel, year);
  const week = {
    sequence,
    dateLabel,
    bibleReading,
    ...dates,
    openingSongNumber: null,
    middleSongNumber: null,
    closingSongNumber: null,
    parts: [],
  };

  const body = document.querySelector('div.bodyTxt') || document.body;
  if (!body) return week;

  let currentSection = null;
  let partOrder = 0;
  const seenSongs = [];
  const nodes = body.querySelectorAll("h3, [class*='dc-icon--gem'], [class*='dc-icon--wheat'], [class*='dc-icon--sheep']");

  nodes.forEach((el) => {
    const className = el.className || '';
    const section = isSectionHeader(el);
    if (section) {
      if (el.tagName === 'H3') return;
      currentSection = section;
      return;
    }
    if (el.tagName !== 'H3') return;
    const text = cleanText(el.textContent);
    if (!text) return;

    const songMatch = SONG_RE.exec(text);
    if (
      songMatch
      && (/dc-icon--music/i.test(className)
        || /Palabras de conclusi[oó]n/i.test(text)
        || /^Canci[oó]n/i.test(text))
    ) {
      const songNumber = Number(songMatch[1]);
      if (!seenSongs.includes(songNumber)) seenSongs.push(songNumber);
      if (/Palabras de conclusi[oó]n/i.test(text)) week.closingSongNumber = songNumber;
      else if (!week.openingSongNumber) week.openingSongNumber = songNumber;
      else if (!week.middleSongNumber && week.openingSongNumber !== songNumber) {
        week.middleSongNumber = songNumber;
      }
      return;
    }

    const numbered = NUMBERED_RE.exec(text);
    if (!numbered) return;
    if (!currentSection) currentSection = { type: 'Unknown', title: '(Sin sección)' };
    week.parts.push(buildPart(el, numbered, partOrder++, currentSection.type));
  });

  if (!week.closingSongNumber && seenSongs.length >= 3) week.closingSongNumber = seenSongs.at(-1);
  if (!week.openingSongNumber && seenSongs[0]) week.openingSongNumber = seenSongs[0];
  if (!week.middleSongNumber && seenSongs[1]) week.middleSongNumber = seenSongs[1];
  return week;
}

function yearFromTitle(title, fallbackYear) {
  const match = /\b(20\d{2})\b/.exec(title || '');
  return match ? Number(match[1]) : fallbackYear;
}

function toPublication(model) {
  return {
    version: 1,
    title: model.title,
    language: model.language || 'es',
    weeks: model.weeks.map((week) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week.startDate || '')) {
        throw new Error(`No se pudo leer la fecha de «${week.dateLabel || 'una semana'}».`);
      }
      return {
        weekKey: week.startDate,
        dateLabel: week.dateLabel,
        startDate: week.startDate || '',
        endDate: week.endDate || '',
        bibleReading: week.bibleReading,
        openingSongNumber: week.openingSongNumber,
        middleSongNumber: week.middleSongNumber,
        closingSongNumber: week.closingSongNumber,
        parts: week.parts,
      };
    }),
  };
}

export async function parseEpubFile(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const opfPath = await readOpfPath(zip);
  const opfFile = zipFile(zip, opfPath);
  if (!opfFile) throw new Error('No se encontró el OPF del EPUB.');
  const opfDoc = parseXml(await opfFile.async('string'));
  const title = cleanText(
    opfDoc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0]?.textContent
      || opfDoc.getElementsByTagName('dc:title')[0]?.textContent
      || opfDoc.getElementsByTagName('title')[0]?.textContent,
  );
  const language = cleanText(
    opfDoc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'language')[0]?.textContent
      || opfDoc.getElementsByTagName('dc:language')[0]?.textContent
      || 'es',
  );
  const year = yearFromTitle(title, new Date().getFullYear());
  const opfDir = dirName(opfPath);
  const hrefs = await readWeekHrefs(zip, opfDir, opfDoc);
  if (!hrefs.length) throw new Error('No se encontraron semanas en el EPUB.');

  const weeks = [];
  let sequence = 1;
  for (const href of hrefs) {
    const entry = zipFile(zip, combineZipPath(opfDir, href)) || zipFile(zip, href);
    if (!entry) continue;
    const html = await entry.async('string');
    const week = parseWeek(html, fileName(href), sequence, year);
    if (week) {
      weeks.push(week);
      sequence += 1;
    }
  }
  if (!weeks.length) throw new Error('No se pudo leer ninguna semana del EPUB.');
  return toPublication({ title, language, weeks });
}

export async function fileLooksLikeZip(file) {
  if (!file || file.size < 4) return false;
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function isEpubFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  return (
    name.endsWith('.epub')
    || name.endsWith('.jwpub')
    || type.includes('epub')
    || type === 'application/zip'
    || type === 'application/x-zip-compressed'
  );
}
