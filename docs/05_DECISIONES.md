# Decisiones

## 2026-09-07 — Proyecto oficial PWA

Se crea `planilla-asignaciones` como única línea de la versión web. El escritorio VMC queda intacto.

## 2026-09-07 — Stack

GitHub Pages → PWA → Apps Script → Google Sheets.

## 2026-09-07 — No fusionar con Informes

Misma receta, otra planilla, otro Apps Script, otro padrón (categoría VMC ≠ grupo/contactos).

## 2026-09-07 — Modelo plano en Sheets

Una fila de `Asignaciones` = un hueco. No se clonan seis tablas SQLite. `HuecoClave` determinista (`partKey|Rol|Sala`).

## 2026-09-07 — Parseo en el cliente

El EPUB/JSON se interpreta en el navegador. Sheets solo recibe filas ya recortadas (títulos, minutos, canciones, FunctionalId).

## 2026-09-07 — Importación JSON primero

El sprint 1 acepta el contrato JSON. El EPUB espera sprint 2.

## 2026-09-20 — Parser EPUB en el cliente

Se porta la lógica del escritorio (`EpubParser` + `FunctionalIdResolver`) a `js/epub-parser.js`. JSZip se carga desde CDN. Sheets solo recibe el JSON recortado.

## 2026-09-07 — Impresión por CSS

`window.print` / Guardar PDF del navegador. QuestPDF no se porta en este sprint.

## 2026-09-07 — Elegibilidad

Todas las personas activas en todos los pickers (paridad con el escritorio actual). Filtrar por categoría requiere aprobación.

## 2026-09-07 — Apps Script como API (no Sheets API v4 en el cliente)

Evita OAuth y secretos en Pages. POST `text/plain` por CORS.

## 2026-10-06 — GitHub Pages

Sitio: https://racedogabriel-cell.github.io/planilla-asignaciones/

Repo: `racedogabriel-cell/planilla-asignaciones`, rama `main`, raíz `/`. El conector de Apps Script ya estaba configurado en `js/config.js`; no se recreó la planilla. Informes (`informes-publicadores`) es otra Pages, otro Script.
