/**
 * PDF S-140 real (colores y columnas como QuestPDF del escritorio).
 * Tamaño de letra fijo: si no entra, salta de línea.
 */
import { buildTimeline } from './s140.js';

const PDF_LIB_SRC = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

const PAGE_W = 612;
const PAGE_H = 792;
const ML = 40;
const MR = 40;
const MT = 34;
const TIME_W = 26;
const ROLE_W = 96;
const NAME_W = 132;
const ROW_H = 13.4;
const LINE_GAP = 10.5;
const BANNER_H = 16;
const NAME_SIZE = 9;
const ROLE_SIZE = 7.6;
const TITLE_SIZE = 9.2;

const COLORS = {
  treasures: [0.341, 0.353, 0.365],
  apply: [0.745, 0.537, 0],
  living: [0.494, 0, 0.141],
  label: [0.42, 0.42, 0.42],
  duration: [0.5, 0.5, 0.5],
  time: [0.478, 0.478, 0.478],
  rule: [0.65, 0.65, 0.65],
  black: [0, 0, 0],
  white: [1, 1, 1],
};

function rgbOf(PDFLib, tuple) {
  return PDFLib.rgb(tuple[0], tuple[1], tuple[2]);
}

function pdfSafe(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0000-\u00FF]/g, '');
}

function minutes(config, key, fallback) {
  const n = Number(config[key]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function loadPdfLib() {
  if (window.PDFLib) return window.PDFLib;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDF_LIB_SRC;
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar el generador de PDF.'));
    document.head.appendChild(script);
  });
  return window.PDFLib;
}

function toneColor(sectionType) {
  if (sectionType === 'ApplyYourself') return COLORS.apply;
  if (sectionType === 'LivingAsChristians') return COLORS.living;
  return COLORS.treasures;
}

function wrapText(font, text, size, maxWidth) {
  const raw = pdfSafe(text);
  if (!raw) return [''];
  if (font.widthOfTextAtSize(raw, size) <= maxWidth) return [raw];

  const lines = [];
  const chunks = raw.split(/(\/|\s+)/).filter((part) => part.length);
  let current = '';

  const pushLine = (line) => {
    const trimmed = line.replace(/^\s+/, '').replace(/\s+$/, '');
    if (trimmed) lines.push(trimmed);
  };

  const breakLong = (word) => {
    let piece = '';
    for (const char of word) {
      const next = piece + char;
      if (piece && font.widthOfTextAtSize(next, size) > maxWidth) {
        pushLine(piece);
        piece = char;
      } else {
        piece = next;
      }
    }
    return piece;
  };

  chunks.forEach((chunk) => {
    const candidate = current + chunk;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      pushLine(current);
      current = chunk.replace(/^\s+/, '');
      if (current && font.widthOfTextAtSize(current, size) > maxWidth) {
        current = breakLong(current);
      }
    } else {
      current = candidate;
    }
  });
  pushLine(current);
  return lines.length ? lines : [''];
}

function tallest(...groups) {
  return Math.max(1, ...groups.map((lines) => Math.max(1, lines.length)));
}

function rowHeight(lines) {
  return Math.max(ROW_H, 4 + lines * LINE_GAP);
}

function layout(hasAux) {
  const width = PAGE_W - ML - MR;
  const names = hasAux ? NAME_W * 2 : NAME_W;
  const title = width - TIME_W - ROLE_W - names;
  return {
    width,
    title,
    xTime: ML,
    xTitle: ML + TIME_W,
    xRole: ML + TIME_W + title,
    xAux: ML + TIME_W + title + ROLE_W,
    xMain: hasAux ? ML + TIME_W + title + ROLE_W + NAME_W : ML + TIME_W + title + ROLE_W,
  };
}

function drawWrapped(page, font, lines, x, y, size, color, alignRight, boxWidth) {
  lines.forEach((line, index) => {
    if (!line) return;
    const width = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: alignRight ? x + boxWidth - width : x,
      y: y - index * LINE_GAP,
      size,
      font,
      color,
    });
  });
}

function drawHeader(page, fonts, PDFLib, config, y) {
  const congregation = pdfSafe(config.Congregacion || '');
  const title = 'Programa para la reunion de entre semana';
  page.drawText(congregation, {
    x: ML,
    y: y - 14,
    size: 17,
    font: fonts.bold,
    color: rgbOf(PDFLib, COLORS.black),
  });
  const titleWidth = fonts.regular.widthOfTextAtSize(title, 14.5);
  page.drawText(title, {
    x: PAGE_W - MR - titleWidth,
    y: y - 13,
    size: 14.5,
    font: fonts.regular,
    color: rgbOf(PDFLib, COLORS.black),
  });
  page.drawLine({
    start: { x: ML, y: y - 20 },
    end: { x: PAGE_W - MR, y: y - 20 },
    thickness: 1.25,
    color: rgbOf(PDFLib, COLORS.rule),
  });
  return y - 28;
}

function drawRow(page, fonts, PDFLib, box, y, time, title, duration, role, aux, main, hasAux, titleColor) {
  const titleBudget = box.title - (duration != null && duration !== '' ? 42 : 2);
  const titleLines = wrapText(fonts.bold, title || '', TITLE_SIZE, titleBudget);
  const roleLines = wrapText(fonts.regular, role || '', ROLE_SIZE, ROLE_W - 4);
  const auxLines = hasAux ? wrapText(fonts.regular, aux || '', NAME_SIZE, NAME_W - 4) : [''];
  const mainLines = wrapText(fonts.regular, main || '', NAME_SIZE, NAME_W - 4);
  const lines = tallest(titleLines, roleLines, auxLines, mainLines);
  const baseline = y - 10;

  if (time) {
    page.drawText(pdfSafe(time), {
      x: box.xTime,
      y: baseline,
      size: 7.5,
      font: fonts.regular,
      color: rgbOf(PDFLib, COLORS.time),
    });
  }

  drawWrapped(
    page,
    fonts.bold,
    titleLines,
    box.xTitle,
    baseline,
    TITLE_SIZE,
    rgbOf(PDFLib, titleColor || COLORS.black),
    false,
    box.title,
  );

  if (duration != null && duration !== '') {
    const unit = duration === 1 ? 'min.' : 'mins.';
    const label = `(${duration} ${unit})`;
    const first = titleLines[0] || '';
    const titleW = fonts.bold.widthOfTextAtSize(first, TITLE_SIZE);
    page.drawText(label, {
      x: box.xTitle + titleW + 3,
      y: baseline,
      size: 7.8,
      font: fonts.regular,
      color: rgbOf(PDFLib, COLORS.duration),
    });
  }

  drawWrapped(page, fonts.regular, roleLines, box.xRole, baseline, ROLE_SIZE, rgbOf(PDFLib, COLORS.label), true, ROLE_W - 4);
  if (hasAux) {
    drawWrapped(page, fonts.regular, auxLines, box.xAux + 3, baseline, NAME_SIZE, rgbOf(PDFLib, COLORS.black), false, NAME_W - 4);
  }
  drawWrapped(page, fonts.regular, mainLines, box.xMain + 3, baseline, NAME_SIZE, rgbOf(PDFLib, COLORS.black), false, NAME_W - 4);

  return y - rowHeight(lines);
}

function drawBanner(page, fonts, PDFLib, box, y, entry, hasAux) {
  const fill = toneColor(entry.sectionType);
  const top = y - 4;
  page.drawRectangle({
    x: box.xTime,
    y: top - BANNER_H,
    width: TIME_W + box.title,
    height: BANNER_H,
    color: rgbOf(PDFLib, fill),
  });
  page.drawText(pdfSafe(entry.title || ''), {
    x: box.xTime + 5,
    y: top - 12,
    size: 9.5,
    font: fonts.bold,
    color: rgbOf(PDFLib, COLORS.white),
  });
  const showRooms = hasAux && (entry.sectionType === 'Treasures' || entry.sectionType === 'ApplyYourself');
  if (showRooms) {
    page.drawText('Sala auxiliar', {
      x: box.xAux + 2,
      y: top - 12,
      size: 7.5,
      font: fonts.bold,
      color: rgbOf(PDFLib, fill),
    });
    page.drawText('Auditorio principal', {
      x: box.xMain + 2,
      y: top - 12,
      size: 7.5,
      font: fonts.bold,
      color: rgbOf(PDFLib, fill),
    });
  }
  return top - BANNER_H - 2;
}

function meetingName(week, people, rol) {
  const slot = (week.slots || []).find(
    (item) => item.rol === rol && (item.partKey === 'meeting' || String(item.huecoClave).startsWith('meeting|')),
  );
  return people.get(String(slot?.personaId || '')) || '';
}

function drawWeek(page, fonts, PDFLib, week, people, config, startY) {
  const hasAux = String(config.SalaAuxiliar || '') === 'Sí';
  const box = layout(hasAux);
  let y = drawHeader(page, fonts, PDFLib, config, startY);
  y = drawRow(
    page,
    fonts,
    PDFLib,
    box,
    y,
    '',
    `${week.dateLabel || ''} | ${week.bibleReading || ''}`,
    null,
    'Presidente:',
    '',
    meetingName(week, people, 'Chairman'),
    hasAux,
    COLORS.treasures,
  );
  if (hasAux) {
    y = drawRow(
      page,
      fonts,
      PDFLib,
      box,
      y,
      '',
      '',
      null,
      'Consejero de la sala auxiliar:',
      '',
      meetingName(week, people, 'AuxiliaryCounselor'),
      hasAux,
    );
  }
  y -= 3;
  buildTimeline(week, people, config).forEach((entry) => {
    if (entry.kind === 'banner') {
      y = drawBanner(page, fonts, PDFLib, box, y, entry, hasAux);
      return;
    }
    y = drawRow(
      page,
      fonts,
      PDFLib,
      box,
      y,
      entry.time,
      entry.title,
      entry.kind === 'part' || entry.kind === 'words' ? entry.duration : null,
      entry.role,
      entry.kind === 'part' ? entry.aux : '',
      entry.main,
      hasAux,
    );
  });
  return y;
}

function fileName(weeks) {
  const first = weeks[0]?.startDate || weeks[0]?.weekKey || '';
  if (weeks.length === 1) return `Programa ${weeks[0].dateLabel || first}.pdf`.replace(/[\\/:*?"<>|]/g, '-');
  return `Programa.pdf`;
}

export async function exportS140Pdf(weeks, people, config) {
  if (!weeks.length) throw new Error('Seleccioná al menos una semana completa.');
  const PDFLib = await loadPdfLib();
  const doc = await PDFLib.PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(PDFLib.StandardFonts.Helvetica),
    bold: await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),
  };
  const gap = minutes(config, 'EspacioReunionesMm', 6) * 2.83465;

  for (let i = 0; i < weeks.length; i += 2) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MT;
    y = drawWeek(page, fonts, PDFLib, weeks[i], people, config, y);
    if (weeks[i + 1]) {
      y -= gap;
      drawWeek(page, fonts, PDFLib, weeks[i + 1], people, config, y);
    }
    page.drawText('S-140-S  11/20', {
      x: ML,
      y: 18,
      size: 8,
      font: fonts.regular,
      color: rgbOf(PDFLib, COLORS.label),
    });
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName(weeks);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
