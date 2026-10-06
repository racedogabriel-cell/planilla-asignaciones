# Planilla Asignaciones (PWA)

PWA para asignar la reunión Vida y Ministerio. Replica el escritorio **Administrador VMC** con el stack Pages + Apps Script + Sheets.

**Sitio publicado:** https://racedogabriel-cell.github.io/planilla-asignaciones/

El conector de Google (Apps Script → Sheets) **ya está configurado** en `js/config.js`. No hace falta crear otra planilla ni otro Script para usar la app.

El ejecutable Windows no se modifica. Informes de publicadores es solo referencia de estructura.

## Arquitectura

```text
GitHub Pages → PWA → Google Apps Script → Google Sheets
```

Documentación: `docs/`. Sprint actual: `docs/06_SPRINT_ACTUAL.md`.

## Módulos

| Módulo | Estado (sprint 1) |
|---|---|
| Semanas | En desarrollo |
| Personas | En desarrollo |
| Importar (JSON) | En desarrollo |
| Imprimir | En desarrollo (vista básica) |
| Configuración | En desarrollo |

**Importar:** EPUB de la Guía de actividades, o el JSON de ejemplo.

## Ejecutar en local

Serví la carpeta con un servidor HTTP. El service worker no funciona abriendo `index.html` como archivo.

Ejemplo:

```bash
npx --yes serve .
```

Abrí la URL que imprima (por lo general `http://localhost:3000`).

## Conector

La URL `/exec` de Apps Script está en `js/config.js`. El `SPREADSHEET_ID` está en `apps-script/Code.gs`. El primer `?action=ping` crea las pestañas si faltan.

Detalle de instalación (solo si hay que rehacer el conector): `apps-script/README.md`.

## Importar

1. En **Importar**, elegí el EPUB mensual de la Guía (jw.org → publicaciones → EPUB).
2. Si no tenés el EPUB, usá `docs/examples/programa.ejemplo.json` (no es una publicación oficial).
